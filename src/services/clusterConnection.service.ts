import * as k8s from "@kubernetes/client-node"
import { fetch_credential_by_cluster_id } from "../models/pg/clusters"

export class ClusterConnectionService {

    async connect(cluster_id: number): Promise<k8s.KubeConfig> {
        const cluster = await fetch_credential_by_cluster_id(cluster_id)

        if (!cluster.length) {
            throw new Error(`Cluster ${cluster_id} not found`)
        }

        const kubeconfig = cluster[0]?.kubeconfig

        if (!kubeconfig) {
            throw new Error(`Kubeconfig not found for cluster ${cluster_id}`)
        }

        const kc = new k8s.KubeConfig()

        kc.loadFromString(kubeconfig)

        kc.setCurrentContext("ai-devops-backend-context")

        return kc
    }
}