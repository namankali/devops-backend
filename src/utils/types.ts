import { CustomRequest } from "./interfaces"

type ApiResponse<T = unknown> = {
    signature: string,
    status: number,
    message: string,
    data: T | undefined,
    success: true
} | {
    signature: string,
    status: number,
    message: string,
    data: null,
    success: false
}

type ActionRequest = {
    req: CustomRequest["data"],
    body: Record<string, unknown>,
    headers: Record<string, unknown>,
    params?: Record<string, string | string[]>,
    query?: Record<string, unknown>
}



export { ApiResponse, ActionRequest }