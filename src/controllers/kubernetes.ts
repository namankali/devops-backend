import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";
import yaml from "js-yaml"

// services
import { KubernetesServices } from "../services/kubernetes.service";
import { DaemonSetsDetails, DeploymentDetails, GetInfoDaemonSets, GetInfoKubernetesAPI, GetInfoKubernetesDeployments, GetInfoKubernetesPods, GetInfoNamespaces, GetInfoReplicaSets, GetInfoServices, IngressDetails, namespaceDetails, PodDetails, ReplicaSetsDetails, SecretDetails, ServiceDetails } from "../utils/interfaces";
import moment from "moment";

const kubernetesServices = new KubernetesServices()

type NamespaceResponse = {
    name: string | undefined,
    status: string | undefined
}
interface ResourceDetails {
    columns: string[],
    rows: GetInfoKubernetesPods[] | GetInfoKubernetesDeployments[] | GetInfoReplicaSets[] | GetInfoDaemonSets[] | GetInfoServices[] | GetInfoNamespaces[]
}

export class Kubernetes {
    constructor() { }

    async getInfo(data: any): Promise<ApiResponse<GetInfoKubernetesAPI[]>> {
        try {
            let final_result = [] as GetInfoKubernetesAPI[]

            if (data.hasOwnProperty("pods") && data.pods === 'true') {
                const result = await kubernetesServices.getPods()
                const sorted_result = this.subValueSort(result, "status", "Running", data.namespace)
                const value = this.valueSort(result, data.namespace)

                final_result.push({
                    title: "pods",
                    value: value,
                    sub_value: sorted_result
                })

            }

            if (data.hasOwnProperty("deployments") && data.deployments === "true") {
                const result = await kubernetesServices.getDeployments(data.namespace)
                const value = this.valueSort(result, data.namespace)
                // const sub_value = this.subValueSort(result, "")

                final_result.push({
                    title: "deployments",
                    value: value,
                    sub_value: 0
                })
            }

            if (data.hasOwnProperty("nodes") && data.nodes === "true") {
                const result = await kubernetesServices.getNodes()
                const { value, sub_value } = this.nodeData(result)

                final_result.push({
                    title: "nodes",
                    value,
                    sub_value
                })
            }

            if (data.hasOwnProperty("services") && data.services === "true") {
                const result = await kubernetesServices.getServices(data.namespace)

                final_result.push({
                    title: "services",
                    value: 0,
                    sub_value: 0
                })
            }

            if (data.hasOwnProperty("clusters") && data.clusters === "true") {
                // const result = await kubernetesServices.getServices(data.namespace)

                final_result.push({
                    title: "services",
                    value: 0,
                    sub_value: 0
                })
            }

            return new ResponseBuilder<GetInfoKubernetesAPI[]>()
                .setSignature("AI-DEVOPS")
                .success(final_result, "Signed up successfully", 200);
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async getNamespaces(data: any): Promise<ApiResponse<NamespaceResponse[]>> {
        try {
            const response = await kubernetesServices.getNamespaces()

            return new ResponseBuilder<NamespaceResponse[]>()
                .setSignature("AI-DEVOPS")
                .success(response, "Signed up successfully", 200);

        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async getResourcesDetails(data: any): Promise<ApiResponse<ResourceDetails>> {
        try {
            let final_data: ResourceDetails = {
                columns: [],
                rows: []
            }
            if (data.hasOwnProperty("type") && data.type === "pods") {
                const serviceResponse = await kubernetesServices.getPods()
                let columns = this.fetchColumns(serviceResponse)
                final_data["columns"] = columns
                final_data["rows"] = serviceResponse

            } else if (data.hasOwnProperty("type") && data.type === "deployments") {
                const serviceResponse = await kubernetesServices.getDeployments(data?.namespace)

                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse
            } else if (data.hasOwnProperty("type") && data.type === "replicaSets") {
                const serviceResponse = await kubernetesServices.getReplicaSets(data?.namespace)

                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse
            } else if (data.hasOwnProperty("type") && data.type === "daemonSets") {
                const serviceResponse = await kubernetesServices.getDaemonSets(data?.namespace)
                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse

            } else if (data.hasOwnProperty("type") && data.type === "services") {
                const serviceResponse = await kubernetesServices.getServices(data?.namespace)
                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse

            } else if (data.hasOwnProperty("type") && data.type === "ingress") {
                const serviceResponse = await kubernetesServices.getIngress(data?.namespace)
                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse

            } else if (data.hasOwnProperty("type") && data.type === "configMaps") {
                const serviceResponse = await kubernetesServices.getConfigMaps(data?.namespace)
                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse

            } else if (data.hasOwnProperty("type") && data.type === "configMaps") {
                const serviceResponse = await kubernetesServices.getConfigMaps(data?.namespace)
                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse

            } else if (data.hasOwnProperty("type") && data.type === "secrets") {
                const serviceResponse = await kubernetesServices.getSecrets(data?.namespace)
                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse

            } else if (data.hasOwnProperty("type") && data.type === "persistentVolumes") {
                const serviceResponse = await kubernetesServices.getPV()
                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse

            } else if (data.hasOwnProperty("type") && data.type === "namespaces") {
                console.log()
                const serviceResponse = await kubernetesServices.getNamespaces()
                let columns = this.fetchColumns(serviceResponse)

                final_data["columns"] = columns
                final_data["rows"] = serviceResponse
            }

            return new ResponseBuilder<ResourceDetails>()
                .setSignature("AI-DEVOPS")
                .success(final_data, "Signed up successfully", 200)
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async getResourceSpecificDetails(data: any): Promise<ApiResponse<PodDetails | DeploymentDetails | ReplicaSetsDetails | DaemonSetsDetails | ServiceDetails | IngressDetails | SecretDetails>> {
        try {
            let sortedData = {} as PodDetails | DeploymentDetails | ReplicaSetsDetails | DaemonSetsDetails | ServiceDetails | IngressDetails | SecretDetails
            if (data.hasOwnProperty("type") && data.type === "pods") {

                const response = await kubernetesServices.getPodDetails(data.name, data.namespace)
                sortedData = this.sortPodDetails(response)
            } else if (data.hasOwnProperty("type") && data.type === "deployments") {
                const response = await kubernetesServices.getDepoymentDetils(data.name, data.namespace)

                sortedData = this.sortDeploymentDetails(response)
            } else if (data.hasOwnProperty("type") && data.type === "replicaSets") {
                const response = await kubernetesServices.getReplicaSetDetails(data.name, data.namespace)
                sortedData = this.sortReplicaSetDetails(response)
            }
            else if (data.hasOwnProperty("type") && data.type === "daemonSets") {
                const response = await kubernetesServices.getDaemonSetDetails(data.name, data.namespace)
                sortedData = this.sortDaemonSetDetails(response)
            } else if (data.hasOwnProperty("type") && data.type === "services") {
                const response = await kubernetesServices.getServicesDetails(data.name, data.namespace)

                sortedData = this.sortServicesDetails(response)
            } else if (data.hasOwnProperty("type") && data.type === "ingress") {
                const response = await kubernetesServices.getIngressDetails(data.name, data.namespace)

                sortedData = this.sortIngressDetails(response)
            } else if (data.hasOwnProperty("type") && data.type === "configMaps") {
                console.log("hey")
                const response = await kubernetesServices.getConfigMapsDetails(data.name, data.namespace)

                sortedData = this.sortConfigMapDetails(response)
            } else if (data.hasOwnProperty("type") && data.type === "secrets") {
                const response = await kubernetesServices.getSecretsDetails(data.name, data.namespace)

                sortedData = this.sortSecretsDetails(response)
            } else if (data.hasOwnProperty("type") && data.type === "namespaces") {
                const response = await kubernetesServices.getNamespaceDetails(data.name)

                sortedData = this.sortNamespaceDetails(response)
            }

            return new ResponseBuilder<PodDetails | DeploymentDetails | ReplicaSetsDetails | DaemonSetsDetails | ServiceDetails | IngressDetails | SecretDetails>()
                .setSignature("AI-DEVOPS")
                .success(sortedData, "Signed up successfully", 200)
        } catch (error: any) {
            console.error(error);

            switch (error.code) {
                case 404:
                    throw throwError(
                        `Pod '${data.name}' not found in namespace '${data.namespace}'.`,
                        404
                    );

                case 403:
                    throw throwError("Permission denied.", 403);

                case 401:
                    throw throwError("Unauthorized.", 401);

                default:
                    throw throwError(error.message);
            }
        }
    }

    private sortPodDetails(data: any) {
        let structuredData = {
            name: "",
            namespace: "",
            node: "",
            status: "",
            ip: "",
            created: "",
            age: "",
            cpu_usage: "",
            memory_usage: "",
            yaml: ""
        } as PodDetails


        const podReadyCondition = data.status.conditions.find((obj: any) => obj.type === "Ready")

        const startTime = data.status.startTime
        const duration = moment.duration(moment().diff(moment(startTime)))
        const days = duration.days()
        const hours = duration.hours()
        const minutes = duration.minutes()

        structuredData["name"] = data.metadata?.name
        structuredData["namespace"] = data.metadata?.namespace
        structuredData["node"] = data.spec?.nodeName
        structuredData["status"] = podReadyCondition.status === "True" ? "Running" : "Not Running"
        structuredData["ip"] = data.status.hostIP
        structuredData["created"] = data.metadata.creationTimestamp
        structuredData["age"] = `${days}d ${hours}h ${minutes}m`

        return structuredData
    }

    private sortDaemonSetDetails(data: Record<string, any>) {
        let structuredData = {
            name: data.metadata?.name,
            api_version: data.apiVersion,
            resource_version: data.metadata?.resourceVersion,
            uuid: data.metadata?.uuid,
            observed_generation: data.status?.observedGeneration,
            updated_number_scheduled: data.status?.updatedNumberScheduled
        } as DaemonSetsDetails

        return structuredData
    }
    private sortServicesDetails(data: Record<string, any>) {
        let structuredData = {
            name: data.metadata?.name,
            api_version: data.apiVersion,
            resource_version: data.metadata?.resourceVersion,
            uuid: data.metadata?.uuid,
            cluster_ip: data.spec.clusterIP,
            internal_traffic_policy: data.spec?.internalTrafficPolicy,
            yaml: yaml.dump(JSON.parse(JSON.stringify(data))) || ""
        } as ServiceDetails

        return structuredData
    }

    private sortIngressDetails(data: Record<string, any>) {
        let structuredData = {
            name: data.metadata?.name,
            api_version: data.apiVersion,
            resource_version: data.metadata?.resourceVersion,
            uuid: data.metadata?.uuid,
            generation: data.metadata.generation,
            yaml: yaml.dump(JSON.parse(JSON.stringify(data))) || ""
        } as IngressDetails

        return structuredData
    }
    private sortConfigMapDetails(data: Record<string, any>) {
        let structuredData = {
            name: data.metadata?.name,
            api_version: data.apiVersion,
            resource_version: data.metadata?.resourceVersion,
            uuid: data.metadata?.uuid,
            yaml: yaml.dump(JSON.parse(JSON.stringify(data))) || ""
        } as IngressDetails

        return structuredData
    }
    private sortSecretsDetails(data: Record<string, any>) {
        let structuredData = {
            name: data.metadata?.name,
            api_version: data.apiVersion,
            resource_version: data.metadata?.resourceVersion,
            uid: data.metadata?.uid,
            yaml: ""
        } as SecretDetails

        return structuredData
    }
    private sortNamespaceDetails(data: Record<string, any>) {
        let structuredData = {
            name: data.metadata?.name,
            api_version: data.apiVersion,
            resource_version: data.metadata?.resourceVersion,
            uid: data.metadata?.uid,
            created: data.metadata?.creationTimestamp,
            yaml: yaml.dump(JSON.parse(JSON.stringify(data))) || ""
        } as namespaceDetails

        return structuredData
    }

    private sortReplicaSetDetails(data: Record<string, any>) {
        let structuredData = {
            name: data.metadata?.name,
            namespace: data.metadata?.namespace,
            generation: data.metadata.generation,
            api_version: data.apiVersion,
            resource_version: data.metadata?.resourceVersion,
            yaml: ""
        } as ReplicaSetsDetails

        return structuredData
    }

    private sortDeploymentDetails(data: Record<string, any>) {
        const available_condition = data.status?.conditions.find((cond: any) => cond.type === "Available")
        const progressing_condition = data.status?.conditions.find((cond: any) => cond.type === "Progressing")


        let structuredData = {
            name: data?.metadata?.name || "",
            created: data?.metadata?.creationTimestamp || "",
            available_condition: available_condition.status || "",
            progressing_condition: progressing_condition.status || "",
            ready_replicas: data.status.readyReplicas || 0,
            updated_replicas: data.status.updatedReplicas || 0,
            yaml: yaml.dump(JSON.parse(JSON.stringify(data))) || ""
        } as DeploymentDetails

        return structuredData
    }

    private fetchColumns(data: any) {
        return data.length > 0
            ? Object.keys(data[0])
            : []
    }

    private nodeData(data: any) {
        let value = data.length
        let sub_value = 0

        sub_value = data.reduce((count: number, obj: any) => {
            return obj.status === "Ready" ? count + 1 : count
        }, 0)

        return { value, sub_value }
    }

    private valueSort(data: any, namespace: string) {
        if (namespace === "all") {
            return data.length
        } else {
            return data.reduce((count: number, item: any) => {
                return item['namespace'] === namespace ? count + 1 : count
            }, 0)
        }
    }

    private subValueSort(data: any, identifier: string = "", value: string = "", namespace: string): number {
        const result = data.reduce((count: number, item: any) => {
            if (namespace === 'all') {
                return item[identifier] === value ? count + 1 : count
            }

            return item[identifier] === value && item.namespace === namespace ? count + 1 : count
        }, 0)

        return result
    }
}