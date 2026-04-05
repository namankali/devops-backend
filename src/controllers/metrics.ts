import si from "systeminformation"
import Docker from "dockerode"
import { ResponseBuilder } from "../utils/responseBuilder"

export class MetricsController {
    constructor() { }

    async getMetrics(data: any) {
        try {
            const docker = new Docker()
            let metricsData = []
            if (data.hasOwnProperty("docker") && data.docker) {
                const containers = await docker.listContainers({ all: true })

                const stats = await Promise.all(
                    containers.map(async (container) => {
                        const statsStream = await docker.getContainer(container.Id).stats({
                            stream: false
                        })

                        return {
                            name: container.Names[0],
                            cpu: statsStream.cpu_stats.cpu_usage.total_usage,
                            memory: statsStream.memory_stats.usage,
                            container_status: container.Status,
                            container_state: container.State
                        }
                    })
                )
                metricsData = stats
            } else {
                metricsData.push({
                    cpu: await si.cpu(),
                    memory: await si.mem(),
                    disk: await si.fsSize()
                })
            }
            const response = new ResponseBuilder<typeof metricsData>()
                .setSignature("AI-DEVOPS")
                .success(metricsData, "Metrics Fetched Successfully", 200)
            return response
        } catch (error: any) {
            const errorResponse = new ResponseBuilder()
                .setSignature("AI-DEVOPS")
                .error(error.message || "Failed to fetch metrics", error.status || 500)
            const err: any = new Error(errorResponse.message)
            err.status = errorResponse.status
            err.payload = errorResponse

            throw err
        }
    }
}