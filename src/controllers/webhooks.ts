import { verifyGithubSignature } from "../helper/secret_functions"
import { ApiResponse } from "../utils/types"
import { throwError } from "./common"
import { ResponseBuilder } from "../utils/responseBuilder"
import { get_repo } from "../models/pg/repositories"
import { check_delivery, insert_github_event } from "../models/pg/github_events"
import { webhookQueue } from "../models/redis/queue"

export class WebhookController {
    constructor() { }

    async webhook(data: any): Promise<ApiResponse<void>> {
        try {
            const signature = data.headers["x-hub-signature-256"] as string
            const deliveryId = data.headers["x-github-delivery"];
            const sourceType =
                data.headers["x-github-hook-installation-target-type"] === "organization"
                    ? "org"
                    : "repo"

            if (!signature) {
                throw throwError("Missing Signature", 400)
            }

            if (!deliveryId) {
                throw throwError("Missing delivery ID", 400)
            }

            const isValid = verifyGithubSignature(
                data.body,
                signature,
                process.env.GITHUB_WEBHOOK_SECRET!
            )

            if (!isValid) {
                throw throwError("Invalid signature", 401)
            }

            // idempotency check
            const alreadyPresent = await check_delivery(deliveryId, sourceType)

            if (alreadyPresent) {
                console.log("Duplicate webhook skipped: ", deliveryId)

                return new ResponseBuilder<void>()
                    .setSignature("AI-DEVOPS")
                    .success(undefined, "Duplicate event skipped", 200)
            }

            const payload = JSON.parse(data.body.toString())
            const event = data.headers["x-github-event"] as string

            const githubRepoId = payload.repository?.id

            if (!githubRepoId) {
                return new ResponseBuilder<void>()
                    .setSignature("AI-DEVOPS")
                    .success(undefined, "No repo in payload", 200)
            }

            await webhookQueue.add(
                "process-webhook",
                {
                    deliveryId,
                    event,
                    payload,
                    githubRepoId,
                    sourceType
                },
                {
                    jobId: deliveryId, // prevents duplicate jobs
                    attempts: 3,
                    backoff: 5000,
                }
            )
            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "Webhook accepted", 200)

        } catch (error: any) {
            console.error("Webhook error:", error)

            throw throwError(
                error.message || "Webhook processing failed",
                error.status || 500
            )
        }
    }

    async org_webhook(data: any): Promise<ApiResponse<void>> {
        try {
            const signature = data.headers["x-hub-signature-256"] as string
            const deliveryId = data.headers["x-github-delivery"];
            const sourceType =
                data.headers["x-github-hook-installation-target-type"] === "organization"
                    ? "org"
                    : "repo"

            if (!signature) {
                throw throwError("Missing Signature", 400)
            }

            if (!deliveryId) {
                throw throwError("Missing delivery ID", 400)
            }

            const isValid = verifyGithubSignature(
                data.body,
                signature,
                process.env.GITHUB_WEBHOOK_SECRET!
            )

            if (!isValid) {
                throw throwError("Invalid signature", 401)
            }

            const alreadyPresent = await check_delivery(deliveryId, sourceType)

            if (alreadyPresent) {
                console.log("Duplicate webhook skipped: ", deliveryId)

                return new ResponseBuilder<void>()
                    .setSignature("AI-DEVOPS")
                    .success(undefined, "Duplicate event skipped", 200)
            }

            const payload = JSON.parse(data.body.toString())
            const event = data.headers["x-github-event"] as string

            const githubRepoId = payload.repository?.id

            if (!githubRepoId) {
                return new ResponseBuilder<void>()
                    .setSignature("AI-DEVOPS")
                    .success(undefined, "No repo in payload", 200)
            }

            await webhookQueue.add(
                "process-webhook",
                {
                    deliveryId,
                    event,
                    payload,
                    githubRepoId,
                    sourceType
                },
                {
                    jobId: deliveryId, // prevents duplicate jobs
                    attempts: 3,
                    backoff: 5000,
                }
            )
            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "Webhook accepted", 200)

        } catch (error: any) {
            console.error("Webhook error:", error)

            throw throwError(
                error.message || "Webhook processing failed",
                error.status || 500
            )
        }
    }
}