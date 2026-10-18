import Bull, { Job } from "bull"
import axios from "axios"
import { InsertRepo, JobData } from "../../utils/interfaces"
import { insert_org_webhook, insert_webhook } from "../pg/webhooks"
import { get_repo, insert_repo, update_repo_github_accounts_id } from "../pg/repositories"
import { insert_github_event } from "../pg/github_events"
import { get_github_account_details, get_user_account_details, update_github_access_token } from "../pg/github"
import { decryptGithubToken } from "../../helper/secret_functions"
import { GITHUB_ENCRYPTION_KEY, PYTHON_MSRV, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, WEBHOOK_HOST } from "../../helper/configHelper"

interface JobDataOrgWebhookCreation {
    github_account_id: number,
    owner: string,
    access_token: string,
}

const webhookQueue = new Bull("webhook-queue", {
    redis: {
        host: REDIS_HOST,
        port: Number(REDIS_PORT),
        password: REDIS_PASSWORD,
    },
    defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false
    },
    settings: {
        lockDuration: 30000,
        stalledInterval: 30000,
        maxStalledCount: 1,
        guardInterval: 5000,
        retryProcessDelay: 5000
    }
})

webhookQueue.on("global:active", (jobId) => {
    console.log("[GLOBAL JOB ACTIVE]", {
        jobId,
        pid: process.pid,
    });
});

webhookQueue.on("global:completed", (jobId) => {
    console.log("[GLOBAL JOB COMPLETED]", {
        jobId,
        pid: process.pid,
    });
});

webhookQueue.on("global:failed", (jobId, error) => {
    console.error("[GLOBAL JOB FAILED]", {
        jobId,
        error,
        pid: process.pid,
    });
});

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

            const existing = hooks.data.find(
                (h: any) => h.config?.url === `${WEBHOOK_HOST}/api/webhook/wb`
            );

            if (existing) {
                // Ensure the existing webhook receives workflow-run events.
                const updated = await octokit.request(
                    "PATCH /repos/{owner}/{repo}/hooks/{hook_id}",
                    {
                        owner,
                        repo,
                        hook_id: existing.id,
                        add_events: ["workflow_run"],
                        active: true,
                    }
                );

                console.log("[WEBHOOK SUBSCRIPTIONS UPDATED]", {
                    repo,
                    hookId: existing.id,
                    events: updated.data.events,
                });

                await insert_webhook({
                    repoId,
                    hook_id: existing.id,
                    webhook_url: existing.config.url!,
                });
            }

            return done(null, true)
        }
        console.error("Error while queue processing: ", error)
        done(error)
    }
})

webhookQueue.process("process-webhook", async (job: Job<any>, done) => {
    try {
        const { deliveryId, event, payload, githubRepoId, sourceType } = job.data;

        let repo = await get_repo(+githubRepoId);

        if (!repo) {
            const github_account_details =
                await get_user_account_details(payload.sender.id);

            await insert_repo({
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
                is_active: payload.action === "deleted" ? false : true,
            } as InsertRepo);

            // Fetch the newly inserted repository.
            repo = await get_repo(+githubRepoId);

            if (!repo) {
                throw new Error(
                    `Repository ${githubRepoId} was inserted but could not be retrieved`
                );
            }
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
            payload.action === "completed"
        ) {
            console.log("[IF ENTERED] Adding process-failed-build");
            await webhookQueue.add("process-failed-build",
                {
                    repoDbId: repo.id,
                    githubRepoId,
                    runAttempt: payload.workflow_run.run_attempt,
                    owner: payload.repository.owner.login,
                    repo: payload.repository.name,
                    runId: payload.workflow_run.id,
                    runNumber: payload.workflow_run.run_number,
                    workflowName: payload.workflow_run.name,
                    branch: payload.workflow_run.head_branch,
                    commitSha: payload.workflow_run.head_sha,
                    htmlUrl: payload.workflow_run.html_url,
                    githubAccountId: repo.github_account_id,
                    created_at: payload.workflow_run.created_at,
                    updated_at: payload.workflow_run.updated_at,
                    conclusion: payload.workflow_run.conclusion,
                },
                {
                    attempts: 3,
                    backoff: {
                        type: "fixed",
                        delay: 5000,
                    },
                    removeOnComplete: false,
                    removeOnFail: false,
                });
        }

        done(null, true)

    } catch (error: any) {
        console.error("Error processing webhook event:", error);
        done(error)
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


webhookQueue.process("process-failed-build", async (job: Job<any>, done) => {
    try {

        const { Octokit } = await import("@octokit/rest");

        const {
            owner,
            repo,
            runId,
            repoDbId,
            runNumber,
            runAttempt,
            githubAccountId,
            workflowName,
            branch,
            commitSha,
            htmlUrl,
            created_at,
            updated_at,
            conclusion,
        } = job.data;

        // Get and decrypt the GitHub access token.
        const account = await get_github_account_details({
            id: githubAccountId,
        });

        const token = decryptGithubToken(
            {
                content: account.access_token,
                iv: account.iv,
                tag: account.tag,
            },
            GITHUB_ENCRYPTION_KEY
        );

        const octokit = new Octokit({ auth: token });

        // Fetch all jobs belonging to this workflow run.
        const workflowJobs = await octokit.paginate(
            "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
            {
                owner,
                repo,
                run_id: runId,
                per_page: 100,
            }
        );

        // Keep the conclusions your current implementation supports.
        const relevantJobs = workflowJobs.filter(
            (workflowJob) =>
                workflowJob.conclusion === "failure" ||
                workflowJob.conclusion === "success" ||
                workflowJob.conclusion === "skipped"
        );

        // Collect every relevant job's logs into one string.
        const logSections: string[] = [];
        let job_details: Record<string, any> = {}

        for (const workflowJob of relevantJobs) {
            let jobLogs = "";
            job_details[workflowJob.id] = {
                name: workflowJob.name,
                conclusion: workflowJob.conclusion
            }
            if (workflowJob.conclusion === "skipped") {
                jobLogs = "[No logs available: job was skipped.]";
            } else {
                try {
                    const logsResponse = await octokit.request(
                        "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
                        {
                            owner,
                            repo,
                            job_id: workflowJob.id,
                        }
                    );

                    jobLogs = String(logsResponse.data ?? "");
                } catch (error: any) {
                    console.warn("[JOB LOGS UNAVAILABLE]", {
                        jobId: workflowJob.id,
                        jobName: workflowJob.name,
                        conclusion: workflowJob.conclusion,
                        status: error.status,
                        message: error.message,
                    });

                    // Preserve the job's metadata even if its logs
                    // could not be downloaded.
                    jobLogs = `[Logs unavailable: ${error.status ?? "unknown status"
                        } - ${error.message ?? "Unknown error"}]`;
                }
            }

            logSections.push(
                [
                    `===== JOB: ${workflowJob.name} =====`,
                    `Job ID: ${workflowJob.id}`,
                    `Conclusion: ${workflowJob.conclusion}`,
                    "",
                    jobLogs,
                ].join("\n")
            );
        }

        const combinedLogs =
            logSections.join("\n\n") ||
            "[No success, failure, or skipped jobs were returned by GitHub.]";

        console.log("[COMBINED WORKFLOW LOGS]", {
            runId,
            jobCount: relevantJobs.length,
            logsLength: combinedLogs.length,
        });
        console.log("job details", job_details)
        // Send ONE request to Python for the entire workflow run.
        try {
            const response = await axios.post(
                `${PYTHON_MSRV}/rag/ingest-build-failure`,
                {
                    repo_id: repoDbId,
                    repo_name: `${owner}/${repo}`,
                    run_id: runId,
                    run_number: runNumber,
                    run_attempt: runAttempt,
                    workflow_name: workflowName,
                    branch,
                    commit_sha: commitSha,
                    html_url: htmlUrl,
                    created_at,
                    updated_at,
                    conclusion,
                    logs: combinedLogs,
                    job_details
                }
            );
        } catch (error: any) {
            console.error("[PYTHON INGEST REJECTED]", {
                status: error.response?.status,
                details: JSON.stringify(error.response?.data, null, 2),
                runId,
                conclusion,
            });

            throw error;
        }

        done(null, true);
    } catch (error: any) {
        console.error("[PROCESS-FAILED-BUILD ERROR]", {
            pid: process.pid,
            jobId: job.id,
            runId: job.data.runId,
            message: error.message,
            error,
        });

        done(error instanceof Error ? error : new Error(String(error)));
    }
});



// for jobs related to a CI/CD pipeline
// webhookQueue.process("process-failed-build", async (job, done) => {
//     try {
//         console.log("[PROCESS-FAILED-BUILD ENTERED]", {
//             pid: process.pid,
//             jobId: job.id,
//             runId: job.data.runId,
//             repo: job.data.repo,
//         });
//         const { Octokit } = await import("@octokit/rest");

//         const {
//             owner,
//             repo,
//             runId,
//             repoDbId,
//             runNumber,
//             runAttempt,
//             githubAccountId,
//             workflowName,
//             branch,
//             commitSha,
//             htmlUrl,
//             created_at,
//             updated_at
//         } = job.data;

//         const account = await get_github_account_details({ id: githubAccountId });

//         const token = decryptGithubToken({
//             content: account.access_token,
//             iv: account.iv,
//             tag: account.tag,
//         }, GITHUB_ENCRYPTION_KEY);

//         const octokit = new Octokit({ auth: token });

//         const jobsRes = await octokit.paginate(
//             "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
//             {
//                 owner,
//                 repo,
//                 run_id: runId,
//                 per_page: 100,
//             }
//         );



//         const relevantJobs = jobsRes.filter(
//             (j) =>
//                 j.conclusion === "failure" ||
//                 j.conclusion === "success" ||
//                 j.conclusion === "skipped"
//         );

//         console.log("[RELEVANT JOBS]", {
//             runId,
//             count: relevantJobs.length,
//             jobs: relevantJobs.map((j) => ({
//                 id: j.id,
//                 name: j.name,
//                 conclusion: j.conclusion,
//             })),
//         });

//         for (const failedJob of relevantJobs) {
//             let logs = "";

//             if (failedJob.conclusion !== "skipped") {
//                 try {
//                     const logsRes = await octokit.request(
//                         "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
//                         {
//                             owner,
//                             repo,
//                             job_id: failedJob.id,
//                         }
//                     );

//                     logs = String(logsRes.data);
//                 } catch (error: any) {
//                     console.warn("[JOB LOGS UNAVAILABLE]", {
//                         jobId: failedJob.id,
//                         conclusion: failedJob.conclusion,
//                         status: error.status,
//                         message: error.message,
//                     });
//                 }
//             }

//             console.log("[SENDING JOB TO PYTHON]", {
//                 jobId: failedJob.id,
//                 conclusion: failedJob.conclusion,
//                 logsLength: logs.length,
//             });

//             await axios.post(`${PYTHON_MSRV}/rag/ingest-build-failure`, {
//                 repo_id: repoDbId,
//                 repo_name: `${owner}/${repo}`,
//                 run_id: runId,
//                 run_number: runNumber,
//                 run_attempt: runAttempt,
//                 job_id: failedJob.id,
//                 job_name: failedJob.name,
//                 workflow_name: workflowName,
//                 branch,
//                 commit_sha: commitSha,
//                 html_url: htmlUrl,
//                 logs: logs,
//                 created_at,
//                 updated_at,
//                 conclusion: failedJob.conclusion
//             });
//         }

//         done(null, true);
//     } catch (error) {
//         console.error("[PROCESS-FAILED-BUILD ERROR]", {
//             pid: process.pid,
//             jobId: job.id,
//             error,
//         });
//         done(error as Error);
//     }
// });

export {
    webhookQueue
}