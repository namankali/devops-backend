import * as k8s from "@kubernetes/client-node"
import moment from "moment";
import { GetInfoConfigMaps, GetInfoDaemonSets, GetInfoIngress, GetInfoKubernetesDeployments, GetInfoKubernetesPods, GetInfoNamespaces, GetInfoReplicaSets, GetInfoServices } from "../utils/interfaces";


export class KubernetesServices {
    private kc: k8s.KubeConfig;
    private coreApi: k8s.CoreV1Api
    private networkingApi: k8s.NetworkingV1Api
    private appsApi: k8s.AppsV1Api
    private customObjectsApi: k8s.CustomObjectsApi

    constructor() {
        this.kc = new k8s.KubeConfig()
        this.kc.loadFromDefault();

        this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api)
        this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api)
        this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api)
        this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi)
    }

    async getNamespaces() {
        const resposne = await this.coreApi.listNamespace()

        return resposne.items.map((ns) => {
            console.log("ns", ns)
            return {
                name: ns.metadata?.name,
                status: ns.status?.phase
            } as GetInfoNamespaces
        })
    }

    async getPods(namespace = "default"): Promise<GetInfoKubernetesPods[]> {
        const resposne = await this.coreApi.listNamespacedPod({ namespace })

        return resposne.items.map((pod) => {
            const startTime = "2026-07-15T10:30:00Z";

            const duration = moment.duration(moment().diff(moment(startTime)));

            const days = duration.days();
            const hours = duration.hours();
            const minutes = duration.minutes();

            return {
                name: pod.metadata?.name,
                namespace: pod.metadata?.namespace,
                status: pod.status?.phase,
                node: pod.spec?.nodeName,
                // ip: pod.status?.podIP,
                age: `${days}d ${hours}h ${minutes}m`,
                restarts: pod.status!.containerStatuses![0]!.restartCount
            } as GetInfoKubernetesPods
        })
    }

    async getDeployments(namespace = "default"): Promise<GetInfoKubernetesDeployments[]> {

        if (namespace == "all") {
            const response = await this.appsApi.listDeploymentForAllNamespaces()

            return response.items.map((deployment) => {
                const minReplicaAvailableCond = deployment.status?.conditions?.find((cond) => cond.type === "Available")
                return {
                    name: deployment.metadata?.name,
                    namespace: deployment.metadata?.namespace,
                    status: minReplicaAvailableCond?.status === "True" ? "Running" : "Failed",
                    replicas: deployment.spec?.replicas,
                    availableReplicas: deployment.status?.availableReplicas,
                    created: deployment.metadata?.creationTimestamp
                }
            })
        }

        const response = await this.appsApi.listNamespacedDeployment({ namespace })

        return response.items.map((deployment) => {
            const minReplicaAvailableCond = deployment.status?.conditions?.find((cond) => cond.type === "Available")
            return {
                name: deployment.metadata?.name,
                namespace: deployment.metadata?.namespace,
                status: minReplicaAvailableCond?.status === "True" ? "Running" : "Failed",
                replicas: deployment.spec?.replicas,
                availableReplicas: deployment.status?.availableReplicas,
                created: deployment.metadata?.creationTimestamp
            }
        });
    }

    async getReplicaSets(namespace = "default"): Promise<GetInfoReplicaSets[]> {

        const response = namespace === "all"
            ? await this.appsApi.listReplicaSetForAllNamespaces()
            : await this.appsApi.listNamespacedReplicaSet({
                namespace,
            })

        return response.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                replicas: obj.status?.replicas,
                available_replicas: obj.status?.availableReplicas,
                ready_replicas: obj.status?.readyReplicas,
                created: obj.metadata?.creationTimestamp,
            }

        })

    }

    async getDaemonSets(namespace: string = "default"): Promise<GetInfoDaemonSets[]> {
        const response = namespace === "all"
            ? await this.appsApi.listDaemonSetForAllNamespaces()
            : await this.appsApi.listNamespacedDaemonSet({
                namespace,
            })

        return response.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                current_number_scheduled: obj.status?.currentNumberScheduled,
                number_available: obj.status?.numberAvailable,
                created: obj.metadata?.creationTimestamp,
            }

        })
    }

    async getServices(namespace: string = "default"): Promise<GetInfoServices[]> {
        const response = namespace === "all"
            ? await this.coreApi.listServiceForAllNamespaces()
            : await this.coreApi.listNamespacedService({
                namespace,
            })

        return response.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                created: obj.metadata?.creationTimestamp,
                // cluster
            }

        })
    }
    async getIngress(namespace: string = "default"): Promise<GetInfoIngress[]> {
        const response = namespace === "all"
            ? await this.networkingApi.listIngressForAllNamespaces()
            : await this.networkingApi.listNamespacedIngress({
                namespace,
            })

        return response.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                created: obj.metadata?.creationTimestamp,
                ingress_class_name: obj.spec?.ingressClassName,
                hostname: obj.status?.loadBalancer?.ingress?.[0]?.hostname ?? obj.status?.loadBalancer?.ingress?.[0]?.ip
            }

        })
    }
    async getConfigMaps(namespace: string = "default"): Promise<GetInfoConfigMaps[]> {
        const response = namespace === "all"
            ? await this.coreApi.listConfigMapForAllNamespaces()
            : await this.coreApi.listNamespacedConfigMap({
                namespace,
            })

        return response.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                created: obj.metadata?.creationTimestamp,
            }

        })
    }
    async getSecrets(namespace: string = "default"): Promise<GetInfoConfigMaps[]> {
        const response = namespace === "all"
            ? await this.coreApi.listSecretForAllNamespaces()
            : await this.coreApi.listNamespacedSecret({
                namespace,
            })

        return response.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                created: obj.metadata?.creationTimestamp,
            }

        })
    }
    async getPV(): Promise<GetInfoConfigMaps[]> {
        const response = await this.coreApi.listPersistentVolume()

        return response.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                created: obj.metadata?.creationTimestamp,
            }

        })
    }

    async getNodes() {
        const response = await this.coreApi.listNode()

        return response.items.map((node) => {
            const readyCondition = node.status?.conditions?.find((cond) => cond.type === "Ready")

            return {
                status: readyCondition?.status === "True" ? "Ready" : "NotReady",
                name: node.metadata?.name,
                architecture: node.status?.nodeInfo?.architecture
            }
        })
    }

    async getPodDetails(podName: string, namespace: string) {
        try {
            const response = await this.coreApi.readNamespacedPod({
                name: podName,
                namespace,
            });

            return response
        } catch (error: any) {
            throw error;
        }
    }

    async getDepoymentDetils(deploymentName: string, namespace: string) {
        try {
            return await this.appsApi.readNamespacedDeployment({
                name: deploymentName,
                namespace
            })
        } catch (error) {
            throw error
        }
    }

    async getReplicaSetDetails(replicaSetName: string, namespace: string) {
        try {
            return await this.appsApi.readNamespacedReplicaSet({
                name: replicaSetName,
                namespace
            })
        } catch (error) {
            throw error
        }
    }

    async getDaemonSetDetails(replicaSetName: string, namespace: string) {
        try {
            return await this.appsApi.readNamespacedDaemonSet({
                name: replicaSetName,
                namespace
            })
        } catch (error) {
            throw error
        }
    }
    async getServicesDetails(serviceName: string, namespace: string) {
        try {
            return await this.coreApi.readNamespacedService({
                name: serviceName,
                namespace
            })
        } catch (error) {
            throw error
        }
    }
    async getIngressDetails(ingressName: string, namespace: string) {
        try {
            return await this.networkingApi.readNamespacedIngress({
                name: ingressName,
                namespace
            })
        } catch (error) {
            throw error
        }
    }
    async getConfigMapsDetails(configMapName: string, namespace: string) {
        try {
            return await this.coreApi.readNamespacedConfigMap({
                name: configMapName,
                namespace
            })
        } catch (error) {
            throw error
        }
    }
    async getSecretsDetails(secretName: string, namespace: string) {
        try {
            return await this.coreApi.readNamespacedSecret({
                name: secretName,
                namespace
            })
        } catch (error) {
            throw error
        }
    }
    async getNamespaceDetails(name: string) {
        try {
            return await this.coreApi.readNamespace({
                name,
            })
        } catch (error) {
            throw error
        }
    }

    // private getKubernetesError(error: any): string {
    //     if (error.code === "ECONNREFUSED") {
    //         return "Kubernetes API server is not reachable.";
    //     } else {

    //     }
    // }
}