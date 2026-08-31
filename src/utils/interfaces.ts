import { Request } from "express"
interface CustomRequest extends Request {
    cookies: {
        "refresh-token": string
    },
    "data"?: {
        [key: string]: any
    },
    "file"?: any
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

interface UserProfile {
    id: number | undefined,
    full_name: string | undefined
    username: string | undefined
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
    branch: string,
    status?: string,
    created_at?: string,
    updated_at?: string
}

interface InsertAIRuns {
    conversation_id: number,
    user_id: number,
    assistant_message_id: number,
    status: string,
    input: string,
    model?: string,
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

interface GetMessagesAdmin {
    conversation_id: number,
    title: string,
    messages: string,
}

interface DashboardReposDetails {
    name: string,
    type: string,
    owner: string,
    branch: string,
    build: string,
    prs: number,
    deploy: string,
    security: string,
    activity: string,
}

interface GetInfoKubernetesAPI {
    value: number,
    sub_value: number,
    title: string
}

interface GetInfoKubernetesPods {
    name: string,
    namespace: string,
    status: string,
    node: string,
    age: string,
    restarts: number
    // ip: string
}
interface GetInfoNamespaces {
    name: string,
    status: string,
}

interface GetInfoKubernetesDeployments {
    name: string | undefined
    namespace: string | undefined
    replicas: number | undefined
    availableReplicas: number | undefined
    created: Date | undefined
}

interface GetInfoReplicaSets {
    name: string | undefined,
    namespace: string | undefined,
    replicas: number | undefined,
    available_replicas: number | undefined,
    ready_replicas: number | undefined,
    created: Date | undefined,
}

interface GetInfoDaemonSets {
    name: string | undefined,
    namespace: string | undefined,
    current_number_scheduled: number | undefined,
    number_available: number | undefined,
    created: Date | undefined,
}
interface GetInfoServices {
    name: string | undefined,
    namespace: string | undefined,
    created: Date | undefined,
}

interface GetInfoIngress {
    name: string | undefined,
    namespace: string | undefined,
    created: Date | undefined,
    ingress_class_name: string | undefined,
    hostname: string | undefined
}
interface GetInfoConfigMaps {
    name: string | undefined,
    namespace: string | undefined,
    created: Date | undefined,
}

interface BaseResourceDetails {
    cpu_usage: number | undefined,
    memory_usage: number | undefined,
    yaml: string | undefined
}

interface PodDetails extends BaseResourceDetails {
    name: string,
    namespace: string,
    node: string,
    status: string,
    ip: string,
    created: string,
    age: string,
    container_names: string[]
}

interface DeploymentDetails extends BaseResourceDetails {
    name: string,
    created: string,
    available_condition: string,
    progressing_condition: string,
    ready_replicas: number,
    updated_replicas: number,
}

interface ReplicaSetsDetails extends BaseResourceDetails {
    name: string | undefined,
    namespace: string | undefined,
    generation: number | undefined,
    api_version: string | undefined,
    resource_version: string | undefined,

}
interface DaemonSetsDetails extends BaseResourceDetails {
    name: string | undefined,
    api_version: string | undefined,
    resource_version: string | undefined,
    revision_history_limit: number | undefined,
    uuid: string | undefined,
    observed_generation: string | undefined,
    updated_number_scheduled: string | undefined,
}
interface ServiceDetails extends BaseResourceDetails {
    name: string | undefined,
    api_version: string | undefined,
    resource_version: string | undefined,
    revision_history_limit: number | undefined,
    uuid: string | undefined,
    cluster_ip: string | undefined,
    internal_traffic_policy: string | undefined,
}
interface IngressDetails extends BaseResourceDetails {
    name: string | undefined,
    api_version: string | undefined,
    resource_version: string | undefined,
    revision_history_limit: number | undefined,
    uuid: string | undefined,
    generation: number | undefined
}
interface SecretDetails extends BaseResourceDetails {
    name: string | undefined,
    api_version: string | undefined,
    resource_version: string | undefined,
    revision_history_limit: number | undefined,
    uid: string | undefined
}
interface namespaceDetails extends BaseResourceDetails {
    name: string | undefined,
    api_version: string | undefined,
    resource_version: string | undefined,
    revision_history_limit: number | undefined,
    uid: string | undefined,
    created: Date | undefined,
}

interface EventDetails {
    id: number | undefined,
    type: string | undefined,
    reason: string | undefined,
    message: string | undefined,
    last_timestamp: Date | undefined
}

interface DefaultClusterData {
    id: number | undefined,
    display_name: string | undefined,
    provider: string | undefined,
    environment: string | undefined,
    name: string | undefined
}

interface RegisteredRepos {
    github_repo_id: string,
    repo_name: string,
    repo_fullname: string,
    default_branch: string,
    is_private: boolean
}

interface AIResponse {
    success: boolean,
    response: string,
    latency_ms: number,
    ai_run_id: number,
    total_tokens: number,
    model: string,
    prompt_tokens: number,
    completion_tokens: number,
    provider: string,
    error?: string
}

interface AIHealthResult {
    score: number;

    provider: {
        name: string;
        score: number;
        available: boolean;
        details: any;
    };

    model: {
        name: string;
        score: number;
        available: boolean;
        details: any;
    };

    inference: {
        score: number;
        success_rate: number | null;
        total_runs: number;
        successful_runs: number;
        failed_runs: number;
    };

    latency: {
        score: number;
        average_ms: number | null;
        p95_ms: number | null;
        sample_size: number;
    };

    tools: {
        score: number;
        success_rate: number | null;
        total_calls: number;
        successful_calls: number;
        failed_calls: number;
    };
}


export {
    EventDetails,
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
    GetMessagesAdmin,
    DashboardReposDetails,
    GetInfoKubernetesPods,
    GetInfoKubernetesAPI,
    PodDetails,
    DeploymentDetails,
    GetInfoKubernetesDeployments,
    GetInfoReplicaSets,
    ReplicaSetsDetails,
    GetInfoDaemonSets,
    DaemonSetsDetails,
    GetInfoServices,
    ServiceDetails,
    GetInfoIngress,
    IngressDetails,
    GetInfoConfigMaps,
    SecretDetails,
    GetInfoNamespaces,
    namespaceDetails,
    DefaultClusterData,
    UserProfile,
    RegisteredRepos,
    AIResponse,
    AIHealthResult
}