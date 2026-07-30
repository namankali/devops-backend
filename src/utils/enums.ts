enum ClusterProvider {
    LOCAL = "LOCAL",
    AWS_EKS = "AWS_EKS",
    AZURE_AKS = "AZURE_AKS",
    GCP_GKE = "GCP_GKE",
}

enum ClusterStatus {
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED",
    DISCONNECTED = "DISCONNECTED",
    ERROR = "ERROR",
}

enum AuthenticationType {
    KUBECONFIG = "KUBECONFIG",
    AWS_IAM = "AWS_IAM",
    SERVICE_ACCOUNT = "SERVICE_ACCOUNT",
    OIDC = "OIDC",
}

enum EnvironmentStatus {
    DEVELOPMENT = "DEVELOPMENT",
    STAGING = "STAGING",
    PRODUCTION = "PRODUCTION"
}


export {
    AuthenticationType,
    ClusterProvider,
    ClusterStatus,
    EnvironmentStatus
}