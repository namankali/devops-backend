import { ApiResponse } from "./types"

export class ResponseBuilder<T = unknown> {
    private response: Partial<ApiResponse<T>> = {}

    setSignature(signature: string): this {
        this.response.signature = signature
        return this
    }

    success(data: T, message: string = "success", status: number = 200): ApiResponse<T> {
        return {
            signature: this.response.signature || "",
            status,
            message,
            data,
            success: true
        }
    }

    error(message: string = "Internal Server Error", status: number = 500): ApiResponse<T> {
        return {
            signature: this.response.signature || "",
            status,
            message,
            data: null,
            success: false,
        }
    }

}