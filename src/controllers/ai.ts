import { data_for_ai_workflow } from "../models/pg/github_events"
import { get_all_repos, get_repo_by_name } from "../models/pg/repositories"
import { GETAIWorflowRepos, GetAIWorkflow, GetAIWorkflowOutput } from "../utils/interfaces"
import { ResponseBuilder } from "../utils/responseBuilder"
import { ApiResponse } from "../utils/types"
import { throwError } from "./common"

export class AIController {
    constructor() { }

    async fetch_workflow_logs(data: any): Promise<ApiResponse<GetAIWorkflowOutput[] | GETAIWorflowRepos[] | string[]>> {
        try {
            console.log("incoming data", data)
            if (data.query.repos) {
                const repos_data = await get_all_repos(+data.req.user_id)

                return new ResponseBuilder<GETAIWorflowRepos[]>()
                    .setSignature("AI-DEVOPS")
                    .success(repos_data, "Data for LLM")
            } else if (Object.prototype.hasOwnProperty.call(data.query, "repo_name") && data.query.repo_name.length > 0) {
                console.log("------------- single repo call --------------")
                const repo_details = await get_repo_by_name(data.query?.repo_name || "")

                console.log("repo_details", repo_details)
                return new ResponseBuilder<string[]>()
                    .setSignature("AI-DEVOPS")
                    .success(repo_details, "Data for LLM")
            }
            else {
                const db_result = await data_for_ai_workflow({
                    branch_name: data.branch ?? "main"
                } as GetAIWorkflow)

                return new ResponseBuilder<GetAIWorkflowOutput[]>()
                    .setSignature("AI-DEVOPS")
                    .success(db_result, "Data for LLM")
            }

        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }

    async fetch_logs_by_repo_id(data: any): Promise<ApiResponse<void>> {
        try {
            const where_data = {
                user_id: data.req.user_id,
                repo_id: data.repo_id,
                ...(data.hasOwnProperty("failed") && { failed: true })
            }
            // const db_result = await 

            return new ResponseBuilder<void
            >()
                .setSignature("AI-DEVOPS")
                .success(undefined, "Data for LLM")
        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }
}