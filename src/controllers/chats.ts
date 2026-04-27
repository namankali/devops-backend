import moment from "moment";
import { insert_ai_run_query, update_ai_run } from "../models/pg/ai_runs";
import { insert_conversation } from "../models/pg/conversations";
import { get_messages, insert_message, update_message } from "../models/pg/messages";
import { GetMessagesAdmin, InsertAIRuns, InsertMessage } from "../utils/interfaces";
import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";
import axios from "axios";

export class Chats {
    constructor() { }

    // initialise Chat
    async chat(data: any): Promise<ApiResponse<Record<string, string>>> {
        try {
            console.log("contorler data", data)

            const insert_con_result = await insert_conversation({
                user_id: data.req.user_id,
                title: data.body?.message.slice(0, 30) || "N/A"
            })

            const conversation_id: number = insert_con_result[0].id

            if (!conversation_id) {
                return throwError("error while creating conversation")
            }

            // user message and assistant placeholder message
            const messages = [
                {
                    content: data.body.message,
                    role: "user",
                    conversation_id: conversation_id,
                    created_at: moment().format(),
                    updated_at: moment().format()
                },
                {
                    content: "",
                    role: "assistant",
                    conversation_id: conversation_id,
                    status: "streaming",
                    created_at: moment().format(),
                    updated_at: moment().format()
                }
            ] as InsertMessage[]
            const insert_user_messaages = await insert_message(messages)

            const user_message_id = insert_user_messaages[0].id
            const assistant_message_id = insert_user_messaages[1].id

            const insert_ai_run = await insert_ai_run_query({
                assistant_message_id,
                user_id: data.req.user_id,
                conversation_id,
                status: "running",
                model: "qwen2.5:7b",
                started_at: moment().format()
            } as InsertAIRuns)

            const ai_run_id = insert_ai_run[0]?.id
            let aiResponseText = "";

            try {
                const py_msrv_result = await axios({
                    method: "post",
                    url: `${process.env.PYTHON_MSRV}/ch/chat`,
                    data: {
                        message: data.body.message
                    }
                })

                aiResponseText = py_msrv_result.data?.response || "";
            } catch (error) {
                await update_ai_run(ai_run_id, {
                    status: "failed",
                    completed_at: moment().toISOString(),
                });

                await update_message(assistant_message_id, {
                    content: "AI service failed. Please try again.",
                    status: "completed",
                });

                throw throwError("error while inserting ai_runs", 500)
            }

            await update_message(assistant_message_id, {
                content: aiResponseText,
                status: "completed",
                updated_at: moment().format()
            });

            await update_ai_run(ai_run_id, {
                status: "completed",
                completed_at: moment().toISOString(),
            });

            return new ResponseBuilder<Record<string, string>>()
                .setSignature("AI-DEVOPS")
                .success(
                    { message: aiResponseText },
                    "Chat processed successfully"
                );
        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }

    async stream(data: any): Promise<ApiResponse<GetMessagesAdmin[]>> {
        try {
            const db_result = await get_messages(
                data.req.user_id,
                data.query?.offset ? data.query.offset : 0,
                data.query?.page ? data.query.page : 20
            ) as GetMessagesAdmin[]

            return new ResponseBuilder<GetMessagesAdmin[]>()
                .setSignature("AI-DEVOPS")
                .success(
                    db_result,
                    "messages"
                );
        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }

    async update_conversation(data: any): Promise<ApiResponse<Record<string, string>>> {
        try {
            console.log("controller data ", data)
            const msgs_row = [
                {
                    content: data.body.message,
                    role: "user",
                    conversation_id: data.body.conversation_id,
                    created_at: moment().format(),
                    updated_at: moment().format()
                },
                {
                    content: "",
                    role: "assistant",
                    conversation_id: data.body.conversation_id,
                    status: "streaming",
                    created_at: moment().format(),
                    updated_at: moment().format()
                }
            ]

            const insert_user_messaages = await insert_message(msgs_row)

            const user_message_id = insert_user_messaages[0].id
            const assistant_message_id = insert_user_messaages[1].id

            const insert_ai_run = await insert_ai_run_query({
                assistant_message_id,
                user_id: data.req.user_id,
                conversation_id: data.body.conversation_id,
                status: "running",
                model: "qwen2.5:7b",
                started_at: moment().format()
            } as InsertAIRuns)

            const ai_run_id = insert_ai_run[0]?.id
            let aiResponseText = "";

            try {
                const py_msrv_result = await axios({
                    method: "post",
                    url: `${process.env.PYTHON_MSRV}/ch/chat`,
                    data: {
                        message: data.body.message
                    },
                    headers: {
                        "x-access-token": data.req.token
                    }
                })

                aiResponseText = py_msrv_result.data?.response || "";
            } catch (error) {
                await update_ai_run(ai_run_id, {
                    status: "failed",
                    completed_at: moment().toISOString(),
                });

                await update_message(assistant_message_id, {
                    content: "AI service failed. Please try again.",
                    status: "completed",
                });

                throw throwError("error while inserting ai_runs", 500)
            }

            await update_message(assistant_message_id, {
                content: aiResponseText,
                status: "completed",
                updated_at: moment().format()
            });

            await update_ai_run(ai_run_id, {
                status: "completed",
                completed_at: moment().toISOString(),
            });

            return new ResponseBuilder<Record<string, string>>()
                .setSignature("AI-DEVOPS")
                .success(
                    { message: aiResponseText },
                    "messages"
                );
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