import { ResponseBuilder } from "../utils/responseBuilder"

const throwError = (message: string, status: number = 500): never => {
    const builder = new ResponseBuilder()
        .setSignature("AI-DEVOPS")

    const response = builder.error(message, status)

    const err: any = new Error(response.message)
    err.status = response.status
    err.payload = response

    throw err
}

export {
    throwError
}