import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";
import { GITHUB_BASE_URL, GITHUB_ENCRYPTION_KEY } from "../helper/configHelper";
import { detailed_repos_data_dashboard, get_all_repos, get_repo_details_dashboard } from "../models/pg/repositories";
import axios from "axios";
import { get_github_account_details } from "../models/pg/github";
import { decryptGithubToken } from "../helper/secret_functions";
import { AIHealthResult, DashboardReposDetails, GithubTokenEncryptedData } from "../utils/interfaces";
import { KubernetesServices } from "../services/kubernetes.service";
import { cluster_id_by_user_id } from "../models/pg/clusters";
import { ClusterConnectionService } from "../services/clusterConnection.service";
import { inference_stats_query, latency_stats_query, tool_stats_query } from "../models/pg/ai_runs";

type RepoDetails = {
    github_repo_id: string;
    repo_name: string;
    repo_fullname: string;
    default_branch: string;
    is_private: boolean;
};

interface DashboarCardsInfo {
    repo_count: number,
    failed_workflow_run_count: number,
    open_prs_count: number,
    deployments: number,
    ai_health_score: number
}

export class RepositoriesController {
    constructor() { }

    private readonly WINDOW_HOURS = 24;

    private readonly WEIGHTS = {
        provider: 0.20,
        model: 0.15,
        inference: 0.30,
        latency: 0.25,
        tools: 0.10
    };


    async get_dashboard_cards_info(data: any): Promise<ApiResponse<DashboarCardsInfo>> {
        try {
            const clusterConnectService = new ClusterConnectionService()
            const get_pr_details = await this.get_openPR(data.req.user_id)
            const db_result = await get_repo_details_dashboard()

            const cluster_info = await cluster_id_by_user_id(data.req.user_id)
            const kc = await clusterConnectService.connect(cluster_info[0]?.cluster_id)
            const kubernetesServices = new KubernetesServices(kc)
            const deployments_result = await kubernetesServices.getDeployments("all")

            const open_pr_count = get_pr_details.reduce((acc: number, curr: any) => acc + (curr.open_pr_count || 0), 0)

            const provider = process.env.LLM_PROVIDER || "ollama";
            const model = process.env.LLM_MODEL || process.env.OLLAMA_MODEL || "";


            const aiHealth = await this.ai_calculator(
                provider,
                model,
                kubernetesServices
            );

            const final_data = {
                ...db_result[0],
                open_prs: open_pr_count,
                deployments: deployments_result.length || 0,
                ai_health_score: aiHealth.score,
                ai_health: aiHealth
            } as DashboarCardsInfo


            return new ResponseBuilder<DashboarCardsInfo>().setSignature("AI-DEVOPS").success(final_data, "done")
        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }

    async get_all_repos_data_dashboard(data: any): Promise<ApiResponse<DashboardReposDetails[]>> {
        try {
            const db_result = await detailed_repos_data_dashboard()

            const get_pr_details = await this.get_openPR(data.req.user_id)

            const final_data = db_result.map((repo: any) => {
                const repo_id = +repo.github_repo_id
                let prs = get_pr_details.find((__repo: any) => {
                    if (+__repo.github_repo_id === repo_id) {
                        return __repo
                    }
                })
                prs = prs.open_pr_count

                return {
                    ...repo,
                    prs
                }

            }) as DashboardReposDetails[]

            return new ResponseBuilder<DashboardReposDetails[]>().setSignature("AI-DEVOPS").success(final_data, "done")
        } catch (error: any) {
            console.error("GitHub error:", error?.response?.data || error)

            throw throwError(
                error?.response?.data?.message ||
                error.message ||
                "GitHub integration failed"
            )
        }
    }


    async get_openPR(user_id: number): Promise<any> {
        try {
            if (!user_id) {
                throw new Error("User id requred to fetch open PRs")
            }

            const github_owner_details = await get_github_account_details({
                user_id
            })

            const token_related_data = {
                content: github_owner_details.access_token,
                iv: github_owner_details.iv,
                tag: github_owner_details.tag
            }

            const token = decryptGithubToken(
                token_related_data as GithubTokenEncryptedData,
                GITHUB_ENCRYPTION_KEY
            )

            const db_repos = await get_all_repos(user_id)

            const result = await Promise.all(
                db_repos.map(async (repo: RepoDetails) => {
                    try {
                        const prRes = await axios.get(
                            `${GITHUB_BASE_URL}/repos/${repo.repo_fullname}/pulls`,
                            {
                                params: {
                                    state: "open"
                                },
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    Accept: "application/vnd.github+json",
                                }
                            }
                        )
                        // console.log("PRRES-------- ", prRes)
                        return {
                            ...repo,
                            open_pr_count: prRes.data.length,
                            open_prs: prRes.data.map((pr: any) => ({
                                id: pr.id,
                                number: pr.number,
                                title: pr.title,
                                state: pr.state,
                                url: pr.html_url,
                                created_at: pr.created_at,
                                updated_at: pr.updated_at,
                                user: pr.user?.login,
                                base_branch: pr.base?.ref,
                                head_branch: pr.head?.ref,
                            })),
                        }
                    } catch (error: any) {
                        return {
                            ...repo,
                            open_pr_count: 0,
                            open_prs: [],
                            error: error.response?.data?.message || error.message,
                        };
                    }
                })
            )

            return result
        } catch (error) {
            throw error
        }
    }

    async ai_calculator(
        provider?: string,
        model?: string,
        kubernetesServices?: KubernetesServices
    ): Promise<AIHealthResult> {
        provider = provider || process.env.LLM_PROVIDER || "ollama"
        model = model || process.env.OLLAMA_MODEL || ""

        provider = provider.toLowerCase()

        const providerResult = await this.calculateProviderAvailability(provider, kubernetesServices)
        // console.log("provider result", providerResult)


        const modelResult = await this.calculateModelAvailability(
            provider,
            model
        );

        const inferenceStats = await this.getInferenceStats()
        const inferenceScore = this.calculateSuccessScore(inferenceStats.successRate);

        const latencyStats = await this.getLatencyStats();
        const latencyScore = this.calculateLatencyScore(latencyStats.p95);

        const toolStats = await this.getToolStats();
        const toolScore = this.calculateSuccessScore(toolStats.successRate, true);


        // Final score

        let final_score = 0

        if (providerResult.score === 0 || modelResult.score === 0) {
            final_score = 0
        } else {
            final_score = this.calculateOverallScore({
                provider: providerResult.score,
                model: modelResult.score,
                inference: inferenceScore,
                latency: latencyScore,
                tools: toolScore
            })
        }

        return {
            score: final_score,
            provider: {
                name: provider,
                score: providerResult.score,
                available: providerResult.available,
                details: providerResult.details
            },

            model: {
                name: model,
                score: modelResult.score,
                available: modelResult.available,
                details: modelResult.details
            },

            inference: {
                score: inferenceScore,
                success_rate: inferenceStats.successRate,
                total_runs: inferenceStats.total_runs,
                successful_runs: inferenceStats.successful_runs,
                failed_runs: inferenceStats.failed_runs
            },

            latency: {
                score: latencyScore,
                average_ms: latencyStats.average,
                p95_ms: latencyStats.p95,
                sample_size: latencyStats.sampleSize
            },

            tools: {
                score: toolScore,
                success_rate: toolStats.successRate,
                total_calls: toolStats.totalCalls,
                successful_calls: toolStats.successfulCalls,
                failed_calls: toolStats.failedCalls
            }
        }
    }

    private async calculateProviderAvailability(
        provider: string,
        kubernetesServices?: KubernetesServices
    ) {
        if (provider === "ollama") {
            if (!KubernetesServices) {
                return {
                    score: 0,
                    available: false,
                    details: {
                        reason:
                            "Kubernetes service unavailable"
                    }
                }
            }

            try {
                const namespace = process.env.OLLAMA_NAMESPACE || "devops"

                const pods = await kubernetesServices?.getPods(namespace)

                const podName = process.env.OLLAMA_POD_NAME || "ollama-server"

                const ollama_pod = pods?.find((pod: any) => pod.name?.includes(podName))

                if (!ollama_pod) {
                    return {
                        score: 0,
                        available: false,
                        details: {
                            pod_exists: false,
                            running: false,
                            api_available: false
                        }
                    };
                }

                const running = ollama_pod.status === "Running"

                if (!running) {
                    return {
                        score: 0,
                        available: false,
                        details: {
                            pod_exists: true,
                            running: false,
                            api_available: false,
                            pod_status:
                                ollama_pod.status
                        }
                    };
                }

                const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

                if (!ollamaBaseUrl) {

                    return {
                        score: 100,
                        available: true,
                        details: {
                            pod_exists: true,
                            running: true,
                            api_check: "skipped",
                            reason:
                                "OLLAMA_BASE_URL not configured"
                        }
                    };
                }

                try {

                    await axios.get(
                        `${ollamaBaseUrl}/api/tags`,
                        {
                            timeout: 10000
                        }
                    );


                    return {
                        score: 100,
                        available: true,
                        details: {
                            pod_exists: true,
                            running: true,
                            api_available: true
                        }
                    };

                } catch (error: any) {
                    console.log("12")
                    return {
                        score: 0,
                        available: false,
                        details: {
                            pod_exists: true,
                            running: true,
                            api_available: false,
                            reason:
                                error?.message ||
                                "Ollama API unavailable"
                        }
                    };
                }

            } catch (error: any) {
                return {
                    score: 0,
                    available: false,
                    details: {
                        reason:
                            error?.message ||
                            "Unable to check Ollama provider"
                    }
                };
            }
        }

        if (provider === "openai") {
            try {
                const apiKey = process.env.OPENAI_API_KEY;

                if (!apiKey) {

                    return {
                        score: 0,
                        available: false,
                        details: {
                            reason:
                                "OPENAI_API_KEY is missing"
                        }
                    };
                }

                const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com";

                await axios.get(
                    `${baseUrl}/v1/models`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${apiKey}`
                        },
                        timeout: 5000
                    }
                );


                return {
                    score: 100,
                    available: true,
                    details: {
                        api_check: true
                    }
                };

            } catch (error: any) {
                return {
                    score: 0,
                    available: false,
                    details: {
                        api_check: false,
                        reason:
                            error?.response?.status ||
                            error?.message ||
                            "OpenAI unavailable"
                    }
                };
            }
        }

        return {
            score: 0,
            available: false,
            details: {
                reason:
                    `Unsupported provider: ${provider}`
            }
        };
    }

    private async calculateModelAvailability(provider: string, model: string) {
        if (!model) {

            return {
                score: 0,
                available: false,
                details: {
                    reason:
                        "Model name is not configured"
                }
            };
        }

        if (provider === "ollama") {
            const ollamaBaseUrl = process.env.OLLAMA_HOST;

            if (!ollamaBaseUrl) {

                return {
                    score: 0,
                    available: false,
                    details: {
                        reason:
                            "OLLAMA_HOST not configured"
                    }
                };
            }

            try {
                const response = await axios.get(
                    `${ollamaBaseUrl}/api/tags`,
                    {
                        timeout: 10000
                    }
                )

                const models = response.data?.models || [];
                const found = models.some((item: any) => item.name === model || item.model === model
                );

                return {
                    score: found ? 100 : 0,
                    available: found,
                    details: {
                        requested_model: model,
                        available_models: models.map((item: any) =>
                            item.name ||
                            item.model
                        )
                    }
                };
            } catch (error: any) {
                return {
                    score: 0,
                    available: false,
                    details: {
                        reason: error?.message || "Unable to retrieve Ollama models"
                    }
                };
            }
        }

        if (provider === "openai") {

            try {
                const apiKey = process.env.OPENAI_API_KEY;


                if (!apiKey) {
                    return {
                        score: 0,
                        available: false,
                        details: {
                            reason:
                                "OPENAI_API_KEY missing"
                        }
                    };
                }

                const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com";

                const response =
                    await axios.get(
                        `${baseUrl}/v1/models`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${apiKey}`
                            },
                            timeout: 5000
                        }
                    );


                const models = response.data?.data || [];


                const found = models.some(
                    (item: any) => item.id === model
                );


                return {
                    score: found ? 100 : 0,
                    available: found,
                    details: {
                        requested_model: model
                    }
                };

            } catch (error: any) {
                return {
                    score: 0,
                    available: false,
                    details: {
                        reason: error?.message || "Unable to retrieve OpenAI models"
                    }
                };
            }
        }


        return {
            score: 0,
            available: false,
            details: {
                reason: `Unsupported provider: ${provider}`
            }
        };
    }

    private async getInferenceStats() {
        const db_result = await inference_stats_query(this.WINDOW_HOURS)

        const total_runs = db_result[0].total_runs
        const successful_runs = db_result[0].successful_runs
        const failed_runs = db_result[0].failed_runs

        const successRate = total_runs === 0
            ? null
            : (successful_runs / total_runs) * 100;


        return {
            total_runs,
            successful_runs,
            failed_runs,
            successRate
        };

    }

    private async getLatencyStats() {
        const result = await latency_stats_query(this.WINDOW_HOURS)

        return {

            average: result[0]?.average !== null && result[0]?.average !== undefined
                ? Number(result[0].average)
                : null,

            p95: result[0]?.p95 !== null && result[0]?.p95 !== undefined
                ? result[0].p95.toFixed(3)
                : null,

            sampleSize: Number(result[0]?.sample_size || 0)
        };
    }

    private async getToolStats() {
        const result = await tool_stats_query(this.WINDOW_HOURS)
        
        const totalCalls = Number(result[0]?.total_calls || 0);
        const successfulCalls = Number(result[0]?.successful_calls || 0);
        const failedCalls = Number(result[0]?.failed_calls || 0);

        const successRate = totalCalls === 0
            ? null
            : (successfulCalls / totalCalls) * 100;


        return {
            totalCalls,
            successfulCalls,
            failedCalls,
            successRate
        };
    }

    private calculateSuccessScore(
        successRate: number | null,
        isToolMetric = false
    ): number {

        if (successRate === null) {
            if (isToolMetric) {
                return 100;
            }

            /*
             * No AI runs yet.
             * Neutral rather than falsely claiming 100%.
             */

            return 50;
        }


        if (successRate >= 99) {
            return 100;
        }

        if (successRate >= 98) {
            return 95;
        }

        if (successRate >= 95) {
            return 85;
        }

        if (successRate >= 90) {
            return 65;
        }

        if (successRate >= 80) {
            return 40;
        }

        if (successRate >= 70) {
            return 20;
        }


        return 0;
    }


    private calculateLatencyScore(
        p95Latency: number | null
    ): number {

        if (p95Latency === null) {
            return 50;
        }

        const isDevelopment = process.env.NODE_ENV === "development";

        // Development thresholds
        if (isDevelopment) {

            if (p95Latency <= 10000) {
                return 100;
            }

            if (p95Latency <= 15000) {
                return 90;
            }

            if (p95Latency <= 20000) {
                return 75;
            }

            if (p95Latency <= 30000) {
                return 50;
            }

            if (p95Latency <= 45000) {
                return 25;
            }

            return 0;
        }

        // Production thresholds

        if (p95Latency <= 2000) {
            return 100;
        }

        if (p95Latency <= 4000) {
            return 90;
        }

        if (p95Latency <= 6000) {
            return 75;
        }

        if (p95Latency <= 10000) {
            return 50;
        }

        if (p95Latency <= 15000) {
            return 25;
        }

        return 0;
    }

    private calculateOverallScore(
        scores: {
            provider: number,
            model: number,
            inference: number,
            latency: number,
            tools: number
        }
    ) {
        const score = (scores.provider * this.WEIGHTS.provider) + (scores.model * this.WEIGHTS.model) + (scores.inference * this.WEIGHTS.inference) + (scores.latency * this.WEIGHTS.latency) + (scores.tools * this.WEIGHTS.tools)

        return Math.round(score)
    }
}