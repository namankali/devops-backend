import { Request } from "express"
interface CustomRequest extends Request {
    cookies: {
        "refresh-token": string
    },
    "data"?: {
        [key: string]: any
    },
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

interface GithubTokenEncryptedData {
    iv: string,
    content: string,
    tag: string
}

interface GithubUser {
    id: number
    login: string
}

interface GithubOrg {
    id: number
    login: string
}

interface GithubRepo {
    id: number
    name: string
    full_name: string
    private: boolean
    archived: boolean
    language: string | null
    default_branch: string
    created_at: string
    updated_at: string
    pushed_at: string
    owner: {
        login: string
    }
}

interface JobData {
    repoId: number,
    owner: string,
    repo: string,
    accessToken: string
}

export {
    CustomRequest,
    AccessTokenData,
    UserSignup,
    Signin,
    Logout,
    LoginResponseType,
    RefreshToken,
    GithubTokenEncryptedData,
    GithubUser,
    GithubOrg,
    GithubRepo,
    JobData
}