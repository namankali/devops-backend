import { Request } from "express"
interface CustomRequest extends Request {
    cookies: {
        "refresh-token": string
    },
    "data"?: {
        [key: string]: any
    }
}

interface AccessTokenData {
    user_id: number,
    email: string,
    role: string,
    username: string
    session_id: number
}

interface UserSignup {
    email: string,
    username?: string,
    full_name: string,
    password_hash: string,
    role?: string
}

interface Signin {
    email: string,
    password: string,
    "user-agent": string,
    "ip": string
}

interface LoginResponseType {
    session_id: number,
    refresh_token: string,
    "x-access-token": string,
    user_id: number,
    username: string,
    role: string
}

interface Logout {
    req: {
        "refresh-token": string
    },
    token: string
}

interface RefreshToken {
    email: string,
    user_id: number,
    role: string,
    username: string,
    date: string
}

export {
    CustomRequest,
    AccessTokenData,
    UserSignup,
    Signin,
    Logout,
    LoginResponseType,
    RefreshToken
}