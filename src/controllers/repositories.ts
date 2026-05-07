import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";
import { GITHUB_BASE_URL, GITHUB_ENCRYPTION_KEY } from "../helper/configHelper";
import { detailed_repos_data_dashboard, get_all_repos, get_repo_details_dashboard } from "../models/pg/repositories";
import axios from "axios";
import { get_github_account_details } from "../models/pg/github";
import { decryptGithubToken } from "../helper/secret_functions";
import { DashboardReposDetails, GithubTokenEncryptedData } from "../utils/interfaces";

type RepoDetails = {
    github_repo_id: string;
    repo_name: string;
    repo_fullname: string;
    default_branch: string;
    is_private: boolean;
};

interface DashboarCardsInfo {
    repo_count: number,
    failed_workflow_run_count: number,
    open_prs_count: number
}

export class RepositoriesController {
    constructor() { }

    async get_dashboard_cards_info(data: any): Promise<ApiResponse<DashboarCardsInfo>> {
        try {
            const get_pr_details = await this.get_openPR(data.req.user_id)
            const db_result = await get_repo_details_dashboard()

            const open_pr_count = get_pr_details.reduce((acc: number, curr: any) => acc + (curr.open_pr_count || 0), 0)

            const final_data = {
                ...db_result[0],
                open_prs: open_pr_count
            } as DashboarCardsInfo


            return new ResponseBuilder<DashboarCardsInfo>().setSignature("AI-DEVOPS").success(final_data, "done")
        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }

    async get_all_repos_data_dashboard(data: any): Promise<ApiResponse<DashboardReposDetails[]>> {
        try {
            const db_result = await detailed_repos_data_dashboard()

            const get_pr_details = await this.get_openPR(data.req.user_id)

            const final_data = db_result.map((repo: any) => {
                const repo_id = +repo.github_repo_id
                let prs = get_pr_details.find((__repo: any) => {
                    if (+__repo.github_repo_id === repo_id) {
                        return __repo
                    }
                })
                prs = prs.open_pr_count

                return {
                    ...repo,
                    prs
                }

            }) as DashboardReposDetails[]

            return new ResponseBuilder<DashboardReposDetails[]>().setSignature("AI-DEVOPS").success(final_data, "done")
        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }


    async get_openPR(user_id: number): Promise<any> {
        try {
            if (!user_id) {
                throw new Error("User id requred to fetch open PRs")
            }

            const github_owner_details = await get_github_account_details({
                user_id
            })

            const token_related_data = {
                content: github_owner_details.access_token,
                iv: github_owner_details.iv,
                tag: github_owner_details.tag
            }

            const token = decryptGithubToken(
                token_related_data as GithubTokenEncryptedData,
                GITHUB_ENCRYPTION_KEY
            )

            const db_repos = await get_all_repos(user_id)

            const result = await Promise.all(
                db_repos.map(async (repo: RepoDetails) => {
                    try {
                        const prRes = await axios.get(
                            `${GITHUB_BASE_URL}/repos/${repo.repo_fullname}/pulls`,
                            {
                                params: {
                                    state: "open"
                                },
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    Accept: "application/vnd.github+json",
                                }
                            }
                        )
                        // console.log("PRRES-------- ", prRes)
                        return {
                            ...repo,
                            open_pr_count: prRes.data.length,
                            open_prs: prRes.data.map((pr: any) => ({
                                id: pr.id,
                                number: pr.number,
                                title: pr.title,
                                state: pr.state,
                                url: pr.html_url,
                                created_at: pr.created_at,
                                updated_at: pr.updated_at,
                                user: pr.user?.login,
                                base_branch: pr.base?.ref,
                                head_branch: pr.head?.ref,
                            })),
                        }
                    } catch (error: any) {
                        return {
                            ...repo,
                            open_pr_count: 0,
                            open_prs: [],
                            error: error.response?.data?.message || error.message,
                        };
                    }
                })
            )

            return result
        } catch (error) {
            throw error
        }
    }
}