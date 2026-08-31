import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";
import yaml from "js-yaml"
import moment from "moment";

// services
import { KubernetesServices } from "../services/kubernetes.service";
import { DaemonSetsDetails, DefaultClusterData, DeploymentDetails, EventDetails, GetInfoDaemonSets, GetInfoKubernetesAPI, GetInfoKubernetesDeployments, GetInfoKubernetesPods, GetInfoNamespaces, GetInfoReplicaSets, GetInfoServices, IngressDetails, namespaceDetails, PodDetails, ReplicaSetsDetails, SecretDetails, ServiceDetails } from "../utils/interfaces";

// Models
import { cluster_id_by_other_details, cluster_id_by_user_id, default_cluster_data, fetch_credential, fetch_credential_by_cluster_id, fetch_environments, fetch_provider_environment, fetch_registered_clusters, insert_cluster_data } from "../models/pg/clusters"

// helpers
import { GeneralHelper } from "../helper/general_heplers";
import { AuthenticationType, ClusterStatus, EnvironmentStatus } from "../utils/enums";
import { insert_cluster_credentials } from "../models/pg/cluster_credentials";
import { insert_cluster_user } from "../models/pg/cluster_user";
import { ClusterConnectionService } from "../services/clusterConnection.service";

type NamespaceResponse = {
    name: string | undefined,
    status: string | undefined
}
interface ResourceDetails {
    columns: string[],
    rows: GetInfoKubernetesPods[] | GetInfoKubernetesDeployments[] | GetInfoReplicaSets[] | GetInfoDaemonSets[] | GetInfoServices[] | GetInfoNamespaces[]
}

interface ProviderEnvironmentProps {
    provider?: string,
    environment?: string,
    id: number
}

export class Kubernetes {
    private clusterConnectionService = new ClusterConnectionService()

    constructor() { }

    async cluster_registeration(data: any): Promise<ApiResponse<void>> {
        try {
            const kubeConfig = GeneralHelper.parseYamlFile(data.file)

            const current_context = kubeConfig["current-context"]
            const context = kubeConfig.contexts.find((obj: any) => obj.name === current_context)
            const cluster = kubeConfig.clusters.find((obj: any) => obj.name === context.context.cluster)
            const user = kubeConfig.users.find((obj: any) => obj.name === context.context.user)


            const cluster_data = {
                user_id: data.req.user_id,
                name: cluster.name,
                display_name: data.body.display_name,
                provider: data.body.provider === "Local Kubernetes" ? "LOCAL" : data.body.provider === "AWS EC2 K3S" ? "AWS_EC2_K3S" : data.body.provider as AuthenticationType,
                environment: data.body.environment.toUpperCase() as EnvironmentStatus,
                api_server: cluster.cluster.server,
                status: "CONNECTED" as ClusterStatus
            }

            const save_cluster = await insert_cluster_data(cluster_data)

            const credentials = {
                cluster_id: save_cluster[0].id,
                authentication_type: data.body.authentication_method,
                kubeconfig: data.file.buffer.toString(),
                bearer_token: user.user?.token || null,
                client_certificate: user.user?.["client-certificate-data"] ?? null,
                client_key: user.user?.["client-key-data"] || null,
                certificate_authority: cluster.cluster?.["certificate-authority-data"] ?? null
            }

            const save_cluster_credentials = await insert_cluster_credentials(credentials)

            const user_cluster_data = {
                cluster_id: save_cluster[0].id,
                user_id: data.req.user_id,
                role: data.req.role,
            }

            await insert_cluster_user(user_cluster_data)

            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "Signed up successfully", 200);
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async default_cluster_info(data: any): Promise<ApiResponse<DefaultClusterData[]>> {
        try {
            const fetchDefaultData = await default_cluster_data(data.req.user_id)
            return new ResponseBuilder<DefaultClusterData[]>()
                .setSignature("AI-DEVOPS")
                .success(fetchDefaultData, "Signed up successfully", 200);
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async get_cluster_info(data: any): Promise<ApiResponse<void>> {
        try {
            const cluster_response = await fetch_credential(data.req.user_id)

            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(cluster_response, "Signed up successfully", 200);
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async getInfo(data: any): Promise<ApiResponse<{
        data: GetInfoKubernetesAPI[],
        cluster_name: string
    }>> {
        try {
            let final_result = [] as GetInfoKubernetesAPI[]
            let cluster_info
            if (data.hasOwnProperty("provider") && data.provider && data.hasOwnProperty("environment") && data.environment) {
                cluster_info = await cluster_id_by_other_details(data.req.user_id, data.provider, data.environment)
            } else {
                cluster_info = await cluster_id_by_user_id(data.req.user_id)
            }

            const kc = await this.clusterConnectionService.connect(cluster_info[0]?.cluster_id)
            const kubernetesServices = new KubernetesServices(kc)


            if (data.hasOwnProperty("pods") && data.pods === 'true') {
                const result = await kubernetesServices.getPods(data.namespace)
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

                final_result.push({
                    title: "deployments",
                    value: value,
                    sub_value: value
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
                const { value, sub_value } = this.servicesData(result)
                
                final_result.push({
                    title: "services",
                    value: value,
                    sub_value: sub_value
                })
            }

            if (data.hasOwnProperty("clusters") && data.clusters === "true") {
                const result = await kubernetesServices.getNodes()
                const { value, sub_value } = this.nodeData(result)

                final_result.push({
                    title: "clusters",
                    value: value,
                    sub_value: sub_value
                })
            }

            return new ResponseBuilder<{
                data: GetInfoKubernetesAPI[],
                cluster_name: string
            }>()
                .setSignature("AI-DEVOPS")
                .success({
                    "cluster_name": cluster_info[0].display_name,
                    "data": final_result
                }, "Signed up successfully", 200);
        } catch (error) {
            console.log("error", error)
            throw throwError("Something went wrong");
        }
    }

    async getNamespaces(data: any): Promise<ApiResponse<NamespaceResponse[]>> {
        try {
            let cluster_info
            if (data.hasOwnProperty("provider") && data.provider && data.hasOwnProperty("environment") && data.environment) {
                cluster_info = await cluster_id_by_other_details(data.req.user_id, data.provider, data.environment)
            } else {
                cluster_info = await cluster_id_by_user_id(data.req.user_id)
            }

            if (!cluster_info.length) {
                throw new Error("No Kubernetes cluster found");
            }

            const kc = await this.clusterConnectionService.connect(
                cluster_info[0]?.cluster_id
            )
            const kubernetesServices = new KubernetesServices(kc)

            const response = await kubernetesServices.getNamespaces()

            return new ResponseBuilder<NamespaceResponse[]>()
                .setSignature("AI-DEVOPS")
                .success(response, "Signed up successfully", 200);

        } catch (error: any) {
            console.log(error.message)
            throw throwError(error.message ?? "Something went wrong");
        }
    }

    async getResourcesDetails(data: any): Promise<ApiResponse<ResourceDetails>> {
        try {
            let final_data: ResourceDetails = {
                columns: [],
                rows: []
            }

            let cluster_data;
            if (data.hasOwnProperty("namespace") && data.hasOwnProperty("provider") && data.hasOwnProperty("environment")) {
                cluster_data = await cluster_id_by_other_details(data.req.user_id, data.provider, data.environment)
            } else {
                cluster_data = await cluster_id_by_user_id(data.req.user_id, data.provider = "")

            }

            const kc = await this.clusterConnectionService.connect(
                cluster_data[0]?.cluster_id,

            )
            const kubernetesServices = new KubernetesServices(kc)

            if (data.hasOwnProperty("type") && data.type === "pods") {
                const serviceResponse = await kubernetesServices.getPods(data?.namespace)
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
            let cluster_info
            console.log("env provider", data)
            if (data.hasOwnProperty("provider") && data.provider && data.hasOwnProperty("environment") && data.environment) {
                cluster_info = await cluster_id_by_other_details(data.req.user_id, data.provider, data.environment)
            } else {
                cluster_info = await cluster_id_by_user_id(data.req.user_id)
            }
            const kc = await this.clusterConnectionService.connect(
                cluster_info[0]?.cluster_id
            )
            const kubernetesServices = new KubernetesServices(kc)

            let sortedData = {} as PodDetails | DeploymentDetails | ReplicaSetsDetails | DaemonSetsDetails | ServiceDetails | IngressDetails | SecretDetails
            if (data.hasOwnProperty("type") && data.type === "pods") {

                const response = await kubernetesServices.getPodDetails(data.name, data.namespace)

                sortedData = this.sortPodDetails(response.body)
                sortedData["cpu_usage"] = +response.cpu_usage
                sortedData["memory_usage"] = +response.memory_usage
                sortedData["container_names"] = response.container_names
            } else if (data.hasOwnProperty("type") && data.type === "deployments") {
                const response = await kubernetesServices.getDepoymentDetils(data.name, data.namespace)

                sortedData = this.sortDeploymentDetails(response.body)
            } else if (data.hasOwnProperty("type") && data.type === "replicaSets") {
                const response = await kubernetesServices.getReplicaSetDetails(data.name, data.namespace)
                console.log("response", response)
                sortedData = this.sortReplicaSetDetails(response.body)
            }
            else if (data.hasOwnProperty("type") && data.type === "daemonSets") {
                const response = await kubernetesServices.getDaemonSetDetails(data.name, data.namespace)
                sortedData = this.sortDaemonSetDetails(response.body)
            } else if (data.hasOwnProperty("type") && data.type === "services") {
                const response = await kubernetesServices.getServicesDetails(data.name, data.namespace)

                sortedData = this.sortServicesDetails(response.body)
            } else if (data.hasOwnProperty("type") && data.type === "ingress") {
                const response = await kubernetesServices.getIngressDetails(data.name, data.namespace)

                sortedData = this.sortIngressDetails(response.body)
            } else if (data.hasOwnProperty("type") && data.type === "configMaps") {
                const response = await kubernetesServices.getConfigMapsDetails(data.name, data.namespace)

                sortedData = this.sortConfigMapDetails(response.body)
            } else if (data.hasOwnProperty("type") && data.type === "secrets") {
                const response = await kubernetesServices.getSecretsDetails(data.name, data.namespace)

                sortedData = this.sortSecretsDetails(response.body)
            } else if (data.hasOwnProperty("type") && data.type === "namespaces") {
                const response = await kubernetesServices.getNamespaceDetails(data.name)

                sortedData = this.sortNamespaceDetails(response.body)
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

    async getEvents(data: any): Promise<ApiResponse<EventDetails[]>> {
        try {
            console.log("get incoming controller data", data)
            let cluster_data = []
            if (data.query.provider && data.query.env) {
                cluster_data = await cluster_id_by_other_details(
                    data.req.user_id,
                    data.query.provider,
                    data.query.env
                )
            } else {
                cluster_data = await cluster_id_by_user_id(data.req.user_id)
            }
            const kc = await this.clusterConnectionService.connect(
                cluster_data[0]?.cluster_id
            )
            const kubernetesServices = new KubernetesServices(kc)

            const response = await kubernetesServices.getEvents(data.namespace)

            return new ResponseBuilder<EventDetails[]>()
                .setSignature("AI-DEVOPS")
                .success(response, "Signed up successfully", 200)
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
    async getPodsUsage(data: any): Promise<ApiResponse<any>> {
        try {
            const cluster_data = await cluster_id_by_user_id(data.req.user_id)
            const kc = await this.clusterConnectionService.connect(
                cluster_data[0]?.cluster_id
            )
            const kubernetesServices = new KubernetesServices(kc)

            const response = await kubernetesServices.getPodsUsage(data.namespace)

            return new ResponseBuilder<any>()
                .setSignature("AI-DEVOPS")
                .success(response, "Signed up successfully", 200)
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

    async getProviderAndEnvironment(data: any): Promise<ApiResponse<ProviderEnvironmentProps[]>> {
        try {
            const apiResponse = await fetch_provider_environment(data.req.user_id)

            return new ResponseBuilder<ProviderEnvironmentProps[]>()
                .setSignature("AI-DEVOPS")
                .success(apiResponse, "Signed up successfully", 200);
        } catch (error: any) {
            console.log(error.message)
            throw throwError(error.message ?? "Something went wrong");
        }
    }
    async getEnvironments(data: any): Promise<ApiResponse<ProviderEnvironmentProps[]>> {
        try {
            const apiResponse = await fetch_environments(data.req.user_id)

            return new ResponseBuilder<ProviderEnvironmentProps[]>()
                .setSignature("AI-DEVOPS")
                .success(apiResponse, "Signed up successfully", 200);
        } catch (error: any) {
            console.log(error.message)
            throw throwError(error.message ?? "Something went wrong");
        }
    }

    async dashboard_overview(data: any) {
        try {
            let final_data = {
                "clusterName": '',
                "clusterId": "",
                clusterStatus: "",
                "registeredClusters": [],

                nodeReadiness: {
                    percentage: 0,
                    ready: 0,
                    total: 0,
                    label: "0 / 0 ready",
                },

                workloadStability: {
                    percentage: 0,
                    running: 0,
                    unhealthy: 0,
                    restarts: 0,
                    label: "No failed workloads",
                },

                deployments: {
                    total: 0,
                    label: "Operational",
                },

                attention: {
                    count: 0,
                    label: "No critical issues",
                },

                signals: [
                    {
                        name: "Nodes",
                        status: "Healthy",
                        value: "0 / 0 Ready",
                    },
                    {
                        name: "Workloads",
                        status: "Stable",
                        value: "0 Running",
                    },
                    {
                        name: "Cluster Availability",
                        status: "Healthy",
                        value: "",
                    },
                ],
            }
            let cluster_id

            if (data.query.hasOwnProperty("clusterName")) {
                const db_result = await cluster_id_by_user_id(data.req.user_id, undefined, data.query.clusterName)
                cluster_id = db_result[0].cluster_id
                final_data.clusterName = db_result[0].display_name
            } else if (data.cluster_id) {
                cluster_id = data.cluster_id
                const db_result = await fetch_credential_by_cluster_id(cluster_id)
                final_data.clusterName = db_result[0].display_name
            } else {
                const db_result = await cluster_id_by_user_id(data.req.user_id)
                cluster_id = db_result[0].cluster_id
                final_data.clusterName = db_result[0].display_name
            }

            const clusters_data = await fetch_registered_clusters(data.req.user_id)
            final_data.registeredClusters = clusters_data
            final_data.clusterId = cluster_id

            const kc = await this.clusterConnectionService.connect(
                cluster_id
            )

            const kubernetesServices = new KubernetesServices(kc)

            const nodesData = await kubernetesServices.getNodes()
            const readyNodes = nodesData.filter((obj) => {
                if (obj.status === "Ready") return obj.status
            }).length
            final_data.clusterStatus = nodesData.length > 0 && nodesData.length === readyNodes ? "Healthy" : "Degraded"
            final_data.nodeReadiness = {
                percentage: nodesData.length === 0 ? 0 : Math.round((readyNodes / nodesData.length) * 100),
                ready: readyNodes,
                total: nodesData.length,
                label: `${readyNodes} / ${nodesData.length} ready`
            }

            const podsData = await kubernetesServices.getPods("all")
            const running_pods = podsData.filter(pod => pod.status === "Running")
            const unhealthyPods = podsData.filter(pod => pod.status !== "Running")
            const total_restarts = podsData.reduce((total, pod) => total + (pod.restarts), 0)
            const workload_percentage = podsData.length === 0 ? 0 : Math.round((running_pods.length / podsData.length) * 100)
            final_data.workloadStability = {
                percentage: workload_percentage,
                running: running_pods.length,
                unhealthy: unhealthyPods.length,
                restarts: total_restarts,
                label: unhealthyPods.length === 0 ? "No failed workloads" : `${unhealthyPods.length} unhealthy workloads`
            }

            const deploymentsData = await kubernetesServices.getDeployments("all")
            final_data.deployments = {
                total: deploymentsData.length,
                label: "Operational"
            }

            const events_data = await kubernetesServices.getEvents("all")
            const warning_events = events_data.filter((event) => event.type === "Warning")
            const attention_count = warning_events.length
            const attention_label = attention_count === 0 ? "No critical issues" : attention_count === 1 ? `${attention_count} issue requires attention` : `${attention_count} issues require attention`
            final_data.attention = {
                count: attention_count,
                label: attention_label
            }

            final_data.signals = [
                {
                    name: "nodes",
                    status: "Healthy",
                    value: `${readyNodes} / ${nodesData.length} ready`
                },
                {
                    name: "Workloads",
                    status: "Stable",
                    value: `${running_pods.length} Running`,
                },
                {
                    name: "Cluster Availability",
                    status: "Healthy",
                    value: nodesData.length === 0 ? "0%" : `${Math.round((readyNodes / nodesData.length) * 100)}%`,
                }
            ]

            return new ResponseBuilder<any>()
                .setSignature("AI-DEVOPS")
                .success(final_data, "Signed up successfully", 200);

        } catch (error: any) {
            console.log(error.message)
            throw throwError(error.message ?? "Something went wrong");
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
        structuredData["yaml"] = yaml.dump(JSON.parse(JSON.stringify(data)))

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
            yaml: yaml.dump(JSON.parse(JSON.stringify(data))) || ""
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
    private servicesData(data: any) {
        let value = data.length
        let sub_value = 0

        sub_value = data.reduce((count: number, obj: any) => {
            return obj.active ? count + 1 : count
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