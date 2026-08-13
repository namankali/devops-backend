import moment from "moment"
import { data_for_ai_workflow, get_repo_build_status } from "../models/pg/github_events"
import { get_all_repos, get_repo_build_details_by_date, get_repo_by_name } from "../models/pg/repositories"
import { GETAIWorflowRepos, GetAIWorkflow, GetAIWorkflowOutput } from "../utils/interfaces"
import { ResponseBuilder } from "../utils/responseBuilder"
import { ApiResponse } from "../utils/types"
import { throwError } from "./common"

export class AIController {
    constructor() { }

    async fetch_workflow_logs(data: any): Promise<ApiResponse<GetAIWorkflowOutput[] | GETAIWorflowRepos[] | string[]>> {
        try {
            console.log("incoming data", data)
            if (data.query.repos.toLowerCase() === "true") {
                const repos_data = await get_all_repos(+data.req.user_id)

                return new ResponseBuilder<GETAIWorflowRepos[]>()
                    .setSignature("AI-DEVOPS")
                    .success(repos_data, "Data for LLM")
            } else if (data.query.hasOwnProperty("repo_name") && data.query.repo_name.length > 0 && !data.query.hasOwnProperty("start_date")) {

                const repo_details = await get_repo_build_status(
                    data.query?.repo_name,
                    data.query.branch_name || "",
                    !!data.query.count,
                    data.query.build
                )

                return new ResponseBuilder<string[]>()
                    .setSignature("AI-DEVOPS")
                    .success(repo_details, "Data for LLM")
            } else if (data.query.hasOwnProperty("start_date") && data.query.hasOwnProperty("end_date") && data.query.hasOwnProperty("repo_name") && data.query.repo_name.length > 0) {
                const repo_details = await get_repo_build_details_by_date({
                    repo_name: data.query.repo_name,
                    branch_name: data.query.branch_name || "development",
                    start_date: moment(data.query.start_date).format("YYYY-MM-DD"),
                    end_date: moment(data.query.end_date).format("YYYY-MM-DD"),

                })

                return new ResponseBuilder<string[]>()
                    .setSignature("AI-DEVOPS")
                    .success(repo_details, "Data for LLM")
            }
            else {
                console.log("else is executing")
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