import IORedis from "ioredis"
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from "../../helper/configHelper"

export const redis = new IORedis({
    host: REDIS_HOST || "127.0.0.1",
    port: Number(REDIS_PORT) || 6300,
    password: REDIS_PASSWORD,
    // username:
    // maxRetriesPerRequest: null
})