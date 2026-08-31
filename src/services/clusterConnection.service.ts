import * as k8s from "@kubernetes/client-node"
import { fetch_credential_by_cluster_id } from "../models/pg/clusters"

export class ClusterConnectionService {

    async connect(cluster_id: number): Promise<k8s.KubeConfig> {
        const cluster = await fetch_credential_by_cluster_id(cluster_id)

        if (!cluster.length) {
            throw new Error(`Cluster ${cluster_id} not found`)
        }

        const credentials = cluster[0]

        const kc = new k8s.KubeConfig()

        switch (credentials.authentication_type) {

            case "SERVICE_ACCOUNT":
                console.log(
                    `Connecting to cluster ${cluster_id} using ServiceAccount`
                )

                kc.loadFromCluster()

                break

            case "KUBECONFIG": {
                if (!credentials.kubeconfig) {
                    throw new Error(
                        `Kubeconfig not found for cluster ${cluster_id}`
                    )
                }

                const isRunningInsideKubernetes = !!process.env.KUBERNETES_SERVICE_HOST

                const runtimeClusterId = process.env.AI_DEVOPS_RUNTIME_CLUSTER_ID

                const isRuntimeCluster = runtimeClusterId && Number(runtimeClusterId) === cluster_id


                console.log("runtimeClusterId", runtimeClusterId)

                if (isRuntimeCluster) {

                    console.log(
                        `Cluster ${cluster_id} is the current runtime cluster`
                    )

                    kc.loadFromCluster()

                } else {

                    console.log(
                        `Cluster ${cluster_id} is an external cluster`
                    )

                    if (!credentials.kubeconfig) {
                        throw new Error(
                            `Kubeconfig not found for external cluster ${cluster_id}`
                        )
                    }

                    kc.loadFromString(credentials.kubeconfig)
                }

                break
            }

            case "AWS_IAM":
                // AWS IAM authentication
                break

            case "OIDC":
                // OIDC authentication
                break

            default:
                throw new Error(
                    `Unsupported authentication type: ${credentials.authentication_type}`
                )
        }

        return kc
    }
}