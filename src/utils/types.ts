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



export { ApiResponse }