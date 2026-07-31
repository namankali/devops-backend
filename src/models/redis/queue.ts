import Bull, { Job } from "bull"
import axios from "axios"
import { InsertRepo, JobData } from "../../utils/interfaces"
import { insert_org_webhook, insert_webhook } from "../pg/webhooks"
import { get_repo, insert_repo, update_repo_github_accounts_id } from "../pg/repositories"
import { insert_github_event } from "../pg/github_events"
import { get_github_account_details, get_user_account_details, update_github_access_token } from "../pg/github"
import { decryptGithubToken } from "../../helper/secret_functions"
import { GITHUB_ENCRYPTION_KEY } from "../../helper/configHelper"

interface JobDataOrgWebhookCreation {
    github_account_id: number,
    owner: string,
    access_token: string,
}

const webhookQueue = new Bull("webhook-queue", {
    redis: {
        // host: "redis-19514.c11.us-east-1-2.ec2.cloud.redislabs.com",
        // port: 19514,
        // username: "naman",
        // password: "Naman@1234",
        // username: process.env.REDIS_USER,
        host: "127.0.0.1",
        port: 3456,
        password: "demopasscheck@123",
    },
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
    },
    settings: {
        lockDuration: 30000,
        stalledInterval: 30000,
        maxStalledCount: 1,
        guardInterval: 5000,
        retryProcessDelay: 5000
    }
})

webhookQueue.process("create-webhook", async (job: Job<JobData>, done) => {
    const { Octokit } = await import("@octokit/rest");
    const { repoId, owner, repo, accessToken } = job.data
    const octokit = new Octokit({
        auth: accessToken
    })
    try {
        console.log("Webhook queue worker started");

        const res = await octokit.request(
            "POST /repos/{owner}/{repo}/hooks",
            {
                owner,
                repo,
                config: {
                    url: "https://cuprous-caitlyn-pulsatile.ngrok-free.dev/api/webhook/wb",
                    content_type: "json",
                    secret: process.env.GITHUB_WEBHOOK_SECRET
                },
                events: ["push", "pull_request", "workflow_run", "workflow_job", "issues", "issue_comment", "member", "repository"]
            }
        )
        // console.log("webhook_url api call bull .process ->> ", res)
        await insert_webhook({
            repoId: repoId,
            hook_id: res.data.id,
            webhook_url: res.data.config.url!
        })
        done(null, true)
    } catch (error: any) {
        if (error.status === 422 && error.response?.data?.errors?.[0]?.message?.includes("Hook already exists")) {
            console.log("Webhook already exists, skipping...");

            const hooks = await octokit.request(
                "GET /repos/{owner}/{repo}/hooks",
                { owner, repo }
            )

            const existing = hooks.data.find((h: any) => h.config?.url === "https://cuprous-caitlyn-pulsatile.ngrok-free.dev/api/webhook/wb")

            if (existing) {
                await insert_webhook({
                    repoId,
                    hook_id: existing.id,
                    webhook_url: existing.config.url!,
                });
            }

            done(null, true)
        }
        console.error("Error while queue processing: ", error)
        done(error)
    }
})

webhookQueue.process("process-webhook", async (job: Job<any>, done) => {
    try {
        console.log("process-Webhook job started.......")
        const { deliveryId, event, payload, githubRepoId, sourceType } = job.data;

        const repo = await get_repo(+githubRepoId);
        if (!repo) {
            const github_account_details: Record<string, number>[] = await get_user_account_details(payload.sender.id)

            // insert in repositories
            const repo_insert = await insert_repo({
                github_repo_id: githubRepoId,
                github_account_id: github_account_details[0].id,
                name: payload.repository.name,
                full_name: payload.repository.full_name,
                owner_login: payload.repository.owner.login,
                default_branch: payload.repository.default_branch,
                private: payload.repository.private,
                archived: payload.repository.archived,
                language: payload.repository.language,
                github_created_at: payload.repository.created_at,
                github_updated_at: payload.repository.updated_at,
                pushed_at: payload.repository.pushed_at,
                is_active: payload.action === "deleted" ? false : true
            } as InsertRepo)

            const add_org_event = await insert_github_event({
                repo_id: repo_insert[0].id,
                event,
                payload,
                delivery_id: deliveryId,
                source_type: sourceType
            })
        }

        if (payload.action === "deleted") {
            const update_repo = await update_repo_github_accounts_id({
                github_repo_id: githubRepoId,
                id: repo.github_account_id
            }, false)

        }

        await insert_github_event({
            delivery_id: deliveryId,
            repo_id: repo.id,
            event,
            payload,
            source_type: sourceType
        });

        if (
            event === "workflow_run" &&
            payload.action === "completed" &&
            payload.workflow_run?.conclusion === "failure"
        ) {
            await webhookQueue.add("process-failed-build", {
                repoDbId: repo.id,
                githubRepoId,
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                runId: payload.workflow_run.id,
                runNumber: payload.workflow_run.run_number,
                workflowName: payload.workflow_run.name,
                branch: payload.workflow_run.head_branch,
                commitSha: payload.workflow_run.head_sha,
                htmlUrl: payload.workflow_run.html_url,
                githubAccountId: repo.github_account_id,
            });
        }

        done(null, true);

    } catch (error: any) {
        console.error("Error processing webhook event:", error);
        done(error);
    }
});

webhookQueue.process("create-webhook-org", async (job: Job<JobDataOrgWebhookCreation>, done) => {
    try {
        const { Octokit } = await import("@octokit/rest");

        const { access_token, owner, github_account_id } = job.data

        const octokit = new Octokit({
            auth: access_token
        })

        const res = await octokit.request(
            "POST /orgs/{owner}/hooks",
            {
                owner,
                name: "web",
                config: {
                    url: "https://cuprous-caitlyn-pulsatile.ngrok-free.dev/api/webhook/org",
                    content_type: "json",
                    secret: process.env.GITHUB_WEBHOOK_SECRET
                },
                events: ["repository", "member"]
            }
        )

        await insert_org_webhook({
            github_account_id,
            org_login: owner,
            webhook_url: "https://cuprous-caitlyn-pulsatile.ngrok-free.dev/api/webhook/org",
            github_hook_id: res.data.id
        })

        done(null, "true")

    } catch (error: any) {
        console.error("Error processing webhook event:", error);
        done(error);
    }
})

webhookQueue.process("process-failed-build", async (job, done) => {
    try {
        console.log(" queue 'process-failed-build' has started ->>> ", job.data)
        const { Octokit } = await import("@octokit/rest");

        const {
            owner,
            repo,
            runId,
            repoDbId,
            githubAccountId,
            workflowName,
            branch,
            commitSha,
            htmlUrl,
        } = job.data;

        const account = await get_github_account_details({ id: githubAccountId });

        const token = decryptGithubToken({
            content: account.access_token,
            iv: account.iv,
            tag: account.tag,
        }, GITHUB_ENCRYPTION_KEY);

        const octokit = new Octokit({ auth: token });

        const jobsRes = await octokit.request(
            "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
            {
                owner,
                repo,
                run_id: runId,
            }
        );
        
        const failedJobs = jobsRes.data.jobs.filter(
            (j) => j.conclusion === "failure"
        );

        for (const failedJob of failedJobs) {
            const logsRes = await octokit.request(
                "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
                {
                    owner,
                    repo,
                    job_id: failedJob.id,
                }
            );

            const logs = String(logsRes.data);

            console.log("logs", logs)

            await axios.post(`${process.env.PYTHON_MSRV}/rag/ingest-build-failure`, {
                repo_id: repoDbId,
                repo_name: `${owner}/${repo}`,
                run_id: runId,
                job_id: failedJob.id,
                job_name: failedJob.name,
                workflow_name: workflowName,
                branch,
                commit_sha: commitSha,
                html_url: htmlUrl,
                logs:logs,
            });
        }

        done(null, true);
    } catch (error) {
        done(error as Error);
    }
});

export {
    webhookQueue
}