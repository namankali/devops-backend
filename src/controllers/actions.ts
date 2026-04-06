import { GITHUB_BASE_URL, GITHUB_TOKEN } from "../helper/configHelper";
import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";
import axios from "axios"

export class ActionController {
    constructor() { }

    async get_github_runs(data: any): Promise<ApiResponse<void>> {
        try {
            const res = await axios.get(
                `${GITHUB_BASE_URL}/farm-users-msrv/actions/runs`,
                {
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`,
                        Accept: "application/vnd.github+json"
                    }
                }
            )

            console.log(res, "res------")

            return new ResponseBuilder<void>()
                .setSignature("AI_DEVOPS")
                .success(undefined, "data fetched")

        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong")
        }
    }
}