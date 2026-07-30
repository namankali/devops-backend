import * as k8s from "@kubernetes/client-node"
import moment from "moment";
import { EventDetails, GetInfoConfigMaps, GetInfoDaemonSets, GetInfoIngress, GetInfoKubernetesDeployments, GetInfoKubernetesPods, GetInfoNamespaces, GetInfoReplicaSets, GetInfoServices } from "../utils/interfaces";
interface PodMetricsContainer {
    name: string;
    usage: {
        cpu: string;
        memory: string;
    };
}

interface PodMetricsResponse {
    kind: string;
    metadata: Record<string, any>;
    apiVersion: string;
    timestamp: string;
    window: string;
    containers: PodMetricsContainer[];
}

export class KubernetesServices {
    private kc: k8s.KubeConfig;
    private coreApi: k8s.CoreV1Api
    private networkingApi: k8s.NetworkingV1Api
    private appsApi: k8s.AppsV1Api
    private customObjectsApi: k8s.CustomObjectsApi

    constructor(kc: k8s.KubeConfig) {
        // this.kc = new k8s.KubeConfig()
        // this.kc.loadFromDefault();
        this.kc = kc

        this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api)
        this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api)
        this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api)
        this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi)
    }

    async getNamespaces() {
        try {
            const resposne = await this.coreApi.listNamespace()

            return resposne.body.items.map((ns) => {
                return {
                    name: ns.metadata?.name,
                    status: ns.status?.phase
                } as GetInfoNamespaces
            })
        } catch (error) {
            throw this.getKubernetesError(error)
        }
    }

    async getPods(namespace = "all"): Promise<GetInfoKubernetesPods[]> {
        const response = namespace === "all"
            ? await this.coreApi.listPodForAllNamespaces()
            : await this.coreApi.listNamespacedPod(namespace)

        return response.body.items.map((pod) => {
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

            return response.body.items.map((deployment) => {
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

        const response = await this.appsApi.listNamespacedDeployment(namespace)

        return response.body.items.map((deployment) => {
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
            : await this.appsApi.listNamespacedReplicaSet(namespace)

        return response.body.items.map((obj) => {
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
            : await this.appsApi.listNamespacedDaemonSet(namespace)

        return response.body.items.map((obj) => {
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
            : await this.coreApi.listNamespacedService(namespace)

        return response.body.items.map((obj) => {
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
            : await this.networkingApi.listNamespacedIngress(namespace)

        return response.body.items.map((obj) => {
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
            : await this.coreApi.listNamespacedConfigMap(namespace)

        return response.body.items.map((obj) => {
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
            : await this.coreApi.listNamespacedSecret(namespace)

        return response.body.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                created: obj.metadata?.creationTimestamp,
            }

        })
    }
    async getPV(): Promise<GetInfoConfigMaps[]> {
        const response = await this.coreApi.listPersistentVolume()

        return response.body.items.map((obj) => {
            return {
                name: obj.metadata?.name,
                namespace: obj.metadata?.namespace,
                created: obj.metadata?.creationTimestamp,
            }

        })
    }

    async getNodes() {
        const response = await this.coreApi.listNode()

        return response.body.items.map((node) => {
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
            let total_cpu_limit: number = 0 // m is unit
            let total_memory_limit: number = 0 // Mi is unit
            let current_cpu_usuage: number = 0 // n in unit
            let current_memory_usuage: number = 0 // Ki in unit
            let container_names = []
            let response = await this.coreApi.readNamespacedPod(podName, namespace);

            const otherDetails =
                await this.customObjectsApi.getNamespacedCustomObject(
                    "metrics.k8s.io",
                    "v1beta1",
                    namespace,
                    "pods",
                    podName
                );
            const metrics = otherDetails.body as PodMetricsResponse;
            for (let obj of metrics.containers) {
                container_names.push(obj.name)

                let cpu_usage = obj.usage.cpu
                cpu_usage = cpu_usage.split("n")[0]
                current_cpu_usuage += +(cpu_usage ?? 0)

                let memory_usage = obj.usage.memory
                memory_usage = memory_usage.split("Ki")[0]
                current_memory_usuage += +(memory_usage ?? 0)
            }

            response.body.spec?.containers.forEach((container) => {
                let spilt_value = container.resources?.limits?.cpu?.split("m")
                total_cpu_limit += +(spilt_value?.[0] ?? 0)

                spilt_value = container.resources?.limits?.memory?.split("Mi")
                total_memory_limit += +(spilt_value?.[0] ?? 0)
            })

            return {
                ...response,
                cpu_usage: (this.percentage_conversion(this.convert_nanocores_to_millicores(current_cpu_usuage), total_cpu_limit)).toFixed(2),
                memory_usage: (this.percentage_conversion(this.convertion_ki_mi(current_memory_usuage), total_memory_limit)).toFixed(2),
                container_names
            }
        } catch (error: any) {
            throw error;
        }
    }

    async getDepoymentDetils(deploymentName: string, namespace: string) {
        try {
            return await this.appsApi.readNamespacedDeployment(deploymentName, namespace)
        } catch (error) {
            throw error
        }
    }

    async getReplicaSetDetails(replicaSetName: string, namespace: string) {
        try {
            return await this.appsApi.readNamespacedReplicaSet(replicaSetName, namespace)
        } catch (error) {
            throw error
        }
    }

    async getDaemonSetDetails(replicaSetName: string, namespace: string) {
        try {
            return await this.appsApi.readNamespacedDaemonSet(replicaSetName, namespace)
        } catch (error) {
            throw error
        }
    }
    async getServicesDetails(serviceName: string, namespace: string) {
        try {
            return await this.coreApi.readNamespacedService(serviceName, namespace)
        } catch (error) {
            throw error
        }
    }
    async getIngressDetails(ingressName: string, namespace: string) {
        try {
            return await this.networkingApi.readNamespacedIngress(ingressName, namespace)
        } catch (error) {
            throw error
        }
    }
    async getConfigMapsDetails(configMapName: string, namespace: string) {
        try {
            return await this.coreApi.readNamespacedConfigMap(configMapName, namespace)
        } catch (error) {
            throw error
        }
    }
    async getSecretsDetails(secretName: string, namespace: string) {
        try {
            return await this.coreApi.readNamespacedSecret(secretName, namespace)
        } catch (error) {
            throw error
        }
    }
    async getNamespaceDetails(name: string) {
        try {
            return await this.coreApi.readNamespace(name)
        } catch (error) {
            throw error
        }
    }

    async cpu_and_memory_usuage(name: string, resource_type: string, namespace: string) {
        if (resource_type === "pods") {
            return await this.customObjectsApi.getNamespacedCustomObject(
                "metrics.k8s.io",
                "v1beta1",
                namespace,
                "pods",
                name
            )

        } else if (resource_type === "nodes") {
            return await this.customObjectsApi.getClusterCustomObject(
                "metrics.k8s.io",
                "v1beta1",
                "nodes",
                name
            )
        }
    }

    async getEvents(namespace: string = "default") {
        const apiResponse = namespace === "all"
            ? await this.coreApi.listEventForAllNamespaces()
            : await this.coreApi.listNamespacedEvent(namespace)

        return apiResponse?.body?.items?.map((event) => {
            return {
                id: event.metadata.uid,
                type: event.type,
                reason: event.reason,
                message: event.message,
                last_timestamp: event.lastTimestamp
            } as EventDetails
        })
    }

    async getPodsUsage(namespace: string = "default") {
        const response = namespace === "all"
            ? await this.customObjectsApi.listClusterCustomObject(
                "metrics.k8s.io",
                "v1beta1",
                "pods"
            )
            : await this.customObjectsApi.listNamespacedCustomObject(
                "metrics.k8s.io",
                "v1beta1",
                namespace,
                "pods"
            );

        const data = response.body as {
            items: PodMetricsResponse[];
        };

        return data.items.map((pod) => {
            let cpuUsageNano = 0;
            let memoryUsageKi = 0;

            pod.containers.forEach((container) => {
                cpuUsageNano += Number(container.usage.cpu.replace("n", ""));
                memoryUsageKi += Number(container.usage.memory.replace("Ki", ""));
            });

            return {
                name: pod.metadata?.name,
                namespace: pod.metadata?.namespace,
                cpu_usage_millicores: this.convert_nanocores_to_millicores(cpuUsageNano),
                memory_usage_mib: this.convertion_ki_mi(memoryUsageKi),
                time: moment(pod.timestamp).format("HH:mm")
            };
        });
    }

    private getKubernetesError(error: any): Error {
        switch (error.code) {
            case "ECONNREFUSED":
                return new Error("Kubernetes API server is not reachable.")
            case "ENOTFOUND":
                return new Error("Kubernetes API server hostname could not be resolved.");

            case "ETIMEDOUT":
                return new Error("Connection to Kubernetes cluster timed out.");

            case 401:
                return new Error("Invalid Kubernetes credentials.");

            case 403:
                return new Error("Permission denied. Check RBAC permissions.");

            case 404:
                return new Error("Requested Kubernetes resource was not found.");
            default:
                return new Error(error.message || "Unknown Kubernetes error.");
        }
    }

    private percentage_conversion(
        usage: number,
        limit: number,
        precision = 2
    ): number {
        if (!limit) return 0;

        return Number(((usage / limit) * 100).toFixed(precision));
    }

    private convert_nanocores_to_millicores(value: number): number {
        return value / 1000000
    }

    private convertion_ki_mi(value: number) {
        return value / 1024
    }
}