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

interface InsertRepo {
    github_account_id: number,
    github_repo_id: number,
    name: string,
    full_name: string,
    owner_login: string,
    default_branch: string,
    private: boolean,
    archived: boolean,
    language: string | null,
    github_created_at: string,
    github_updated_at: string,
    pushed_at: string,
}


// Models
interface InsertMessage {
    conversation_id: number,
    role: string,
    content: string,
    status?: string,
    created_at: string,
    updated_at: string
}

interface InsertAIRuns {
    conversation_id: number,
    user_id: number,
    assistant_message_id: number,
    status: string,
    model: string,
    started_at: string
}

interface GetAIWorkflow {
    branch_name: string
}


// MODELS OUTPUTS
// 1. gtuhub events -> 'function_name' ->> 'data_for_ai_workflow'
interface GetAIWorkflowOutput {
    id: number;
    run_id: number;
    job_name: string;
    steps: unknown;
    head_branch: string;
    conclusion: string | null;
    completed_at: Date | null;
    started_at: Date;
    repo_name: string,
    repo_description: string,
    commits_url: string,
    compare_urls: string,
    parent_type: string,
    db_id: number
}

interface GETAIWorflowRepos {
    id: number,
    repo_name: string,
    repo_fullname: string,
    default_branch: string,
    is_private: boolean
}

interface GetMessagesAdmin{
    conversation_id: number,
    title: string,
    messages: string,
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
    JobData,
    InsertRepo,
    InsertMessage,
    InsertAIRuns,
    GetAIWorkflow,
    GetAIWorkflowOutput,
    GETAIWorflowRepos,
    GetMessagesAdmin
}