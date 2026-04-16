import { GITHUB_BASE_URL, GITHUB_ENCRYPTION_KEY, GITHUB_TOKEN, GITHUB_TOKEN_ORG } from "../helper/configHelper";
import { decryptGithubToken, encryptGithubToken } from "../helper/secret_functions";
import { get_github_access_token, get_github_account_details, insert_account, update_github_access_token } from "../models/pg/github";
import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";
import axios from "axios"
import { GithubRepo, GithubUser } from "../utils/interfaces";
import { webhookQueue } from "../models/redis/queue";
import { get_repo, insert_repo } from "../models/pg/repositories";
import { get_webhook_by_repo_id } from "../models/pg/webhooks";
import { branch_build_info_query, build_duration_by_date, build_info_query, pipeline_stats } from "../models/pg/github_events";

interface GithubOrg {
    id: number,
    login: string,
    repos_url: string
}

interface GithubOrgRepos {
    id: number,
    name: string,
    owner: Record<string, string>
}

interface Count_pipeline {
    total_builds: string,
    failed_builds: string
}

interface BuildInfo {
    id: string,
    run_id: string,
    status: "success" | "failure" | "cancelled" | "running"
}

interface BuildDurationInfo {
    date: string,
    duration: number
}

interface MainBranchBuildInfo {
    id: number,
    run_number: string,
    duration: string,
    pipeline: string,
    state: string,
    status: string
}

export class ActionController {
    constructor() { }

    async add_github_account(data: any): Promise<ApiResponse<void>> {
        try {
            const { githubAccessToken } = data.body
            const userId: number = Number(data.req.user_id)

            const encrypted = encryptGithubToken(
                githubAccessToken,
                GITHUB_ENCRYPTION_KEY
            )

            //  Get GitHub user
            const userRes = await axios.get<GithubUser>(
                `${GITHUB_BASE_URL}/user`,
                {
                    headers: {
                        Authorization: `Bearer ${githubAccessToken}`,
                        Accept: "application/vnd.github+json",
                    },
                }
            )

            const githubUser = userRes.data
            console.log("githubUser -> ", githubUser)

            // Insert account
            const [account] = await insert_account({
                user_id: userId,
                access_token: encrypted.content,
                iv: encrypted.iv,
                tag: encrypted.tag,
                github_user_id: githubUser.id,
                github_user_name: githubUser.login,
            })

            // Fetch orgs
            const orgRes = await axios.get<GithubOrg[]>(
                `${GITHUB_BASE_URL}/user/orgs`,
                {
                    headers: {
                        Authorization: `Bearer ${githubAccessToken}`,
                        Accept: "application/vnd.github+json",
                    },
                }
            )

            const orgs = orgRes.data

            // creation of repo hook
            await webhookQueue.add("create-webhook-org", {
                access_token: githubAccessToken,
                github_account_id: account.id,
                owner: orgs[0].login,
            })

            const allSources = [
                // { type: "user", login: githubUser.login },
                ...orgs.map((o) => ({ type: "org", login: o.login })),
            ]

            for (const source of allSources) {
                let page = 1
                let hasMore = true

                while (hasMore) {
                    const url =
                        source.type === "user"
                            ? `${GITHUB_BASE_URL}/user/repos?per_page=100&page=${page}&affiliation=owner`
                            : `${GITHUB_BASE_URL}/orgs/${source.login}/repos?per_page=100&page=${page}`

                    const repoRes = await axios.get<GithubRepo[]>(url, {
                        headers: {
                            Authorization: `Bearer ${githubAccessToken}`,
                            Accept: "application/vnd.github+json",
                        },
                    })

                    const repos = repoRes.data
                    console.log("repos data ->>>>. ", repos)

                    if (!repos.length) {
                        hasMore = false
                        break
                    }

                    for (const repo of repos) {
                        // UPSERT repo (avoid duplicates)
                        const existing = await get_repo(repo.id)

                        let savedRepo = existing

                        if (!existing) {
                            const [inserted] = await insert_repo({
                                github_account_id: account.id,
                                github_repo_id: repo.id,
                                name: repo.name,
                                full_name: repo.full_name,
                                owner_login: repo.owner.login,
                                default_branch: repo.default_branch,
                                private: repo.private,
                                archived: repo.archived,
                                language: repo.language,
                                github_created_at: repo.created_at,
                                github_updated_at: repo.updated_at,
                                pushed_at: repo.pushed_at,
                            })

                            savedRepo = inserted
                        }

                        // enqueue webhook ONLY if not already exists
                        console.log("checking webhooks ^^^^^^^^^^^^^^^^^^^^^^^^^")
                        const existingHook = await get_webhook_by_repo_id(savedRepo.id)
                    
                        if (!existingHook) {
                            console.log("enter non - existing hook")
                            await webhookQueue.add(
                                "create-webhook",
                                {
                                    repoId: savedRepo.id,
                                    owner: repo.owner.login,
                                    repo: repo.name,
                                    accessToken: githubAccessToken,
                                },
                                {
                                    attempts: 3,
                                    backoff: 5000,
                                }
                            )
                        }
                        console.log("after existing hook")
                    }

                    page++
                }
            }

            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "GitHub connected & repos synced")

        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }

    async update_github_token(data: any): Promise<ApiResponse<void>> {
        try {
            const where_data = {
                user_id: +data.req.user_id
            }
            const encrypt_github_token = encryptGithubToken(data.body.githubAccessToken, GITHUB_ENCRYPTION_KEY)

            const update_data = {
                access_token: encrypt_github_token.content
            }

            await update_github_access_token(where_data, update_data)

            return new ResponseBuilder<void>().setSignature("AI-DEVOPS").success(undefined, "done")
        } catch (error: any) {
            console.log(error)
            throw throwError(error.emssage || "something went wrong")
        }
    }

    async get_github_token(data: any): Promise<ApiResponse<Record<string, string>>> {
        try {
            console.log("incoming data", data)
            const where_data = {
                user_id: +data.req.user_id,
                github_user_id: data.params.github_user_id
            }

            const db_result = await get_github_access_token(where_data)

            return new ResponseBuilder<Record<string, string>>().setSignature("AI-DEVOPS").success(db_result[0], "done")
        } catch (error: any) {
            console.log(error)
            throw throwError(error.emssage || "something went wrong")
        }
    }

    async add_repository(data: any): Promise<ApiResponse<void>> {
        try {
            const github_owner_details = await get_github_account_details({
                user_id: data.req.user_id
            })

            console.log("check++++ ", github_owner_details)
            const decrypted_token = decryptGithubToken
            // const res = await axios.get(`${GITHUB_BASE_URL}`)

            return new ResponseBuilder<void>().setSignature("AI-DEVOPS").success(undefined, "done")
        } catch (error: any) {
            console.log(error)
            throw throwError(error.emssage || "something went wrong")
        }
    }

    async github_alerts(data: any): Promise<ApiResponse<void>> {
        try {
            console.log("data from controller", data)
            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "done")
        } catch (error: any) {
            console.log(error)
            throw throwError(error.emssage || "something went wrong")
        }
    }

    async get_github_runs(data: any): Promise<ApiResponse<void>> {
        try {
            const res = await axios.get(
                `${GITHUB_BASE_URL}/namanmahna2/farm-users-msrv/actions/runs`,
                {
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`,
                        Accept: "application/vnd.github+json"
                    }
                }
            )


            return new ResponseBuilder<void>()
                .setSignature("AI_DEVOPS")
                .success(undefined, "data fetched")

        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong")
        }
    }

    async get_pipeline_info(data: any): Promise<ApiResponse<Count_pipeline>> {
        try {
            const db_result = await pipeline_stats()

            const response_data = {
                ...db_result
            }

            return new ResponseBuilder<Count_pipeline>()
                .setSignature("AI-DEVOPS")
                .success(response_data, "ok")

        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong")
        }
    }

    async build_info(data: any): Promise<ApiResponse<BuildInfo[]>> {
        try {
            const db_result = await build_info_query()

            return new ResponseBuilder<BuildInfo[]>()
                .setSignature("AI-DEVOPS")
                .success(db_result, "ok")
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong")
        }
    }

    async main_branch_build_info(data: any): Promise<ApiResponse<MainBranchBuildInfo[]>> {
        try {
            const db_result = await branch_build_info_query()

            return new ResponseBuilder<MainBranchBuildInfo[]>()
                .setSignature("AI-DEVOPS")
                .success(db_result, "ok")
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong")
        }
    }
    async build_duration_info(data: any): Promise<ApiResponse<BuildDurationInfo[]>> {
        try {
            const db_result = await build_duration_by_date()

            return new ResponseBuilder<BuildDurationInfo[]>()
                .setSignature("AI-DEVOPS")
                .success(db_result, "ok")
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong")
        }
    }



}