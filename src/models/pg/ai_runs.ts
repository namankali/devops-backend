const db = require("./db")
const table = "ai_runs"

const insert_ai_run_query = async (data: any) => {
    try {
        const query = db(table).insert(data).returning(["id"])

        return await query
    } catch (error) {
        throw error
    }
}

const update_ai_run = async (id: number, data: any) => {
    try {
        const query = db(table).update(data).where("id", id)

        return await query
    } catch (error) {
        throw error
    }
}

const inference_stats_query = async (window_hours: number) => {
    try {
        const query = db.raw(`
                select
                    COUNT(*) as total_runs,
                    COUNT(*) FILTER(WHERE "status" = 'completed') as successful_runs,
                    COUNT(*) FILTER(where "status" = 'failed') as failed_runs
                from ai_runs
                where "started_at" >= NOW() - INTERVAL '${window_hours} hours'
                            `)

        let result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}
const tool_stats_query = async (window_hours: number) => {
    try {
        const query = db.raw(`
                SELECT 
                    COUNT(*) as total_calls,
                    COUNT(*) FILTER(WHERE status = 'completed'):: INT as successful_calls,
                    COUNT(*) FILTER(WHERE status = 'failed'):: INT as failed_calls
                FROM ai_runs
                where "started_at" >= NOW() - INTERVAL '${window_hours} hours'
                            `)

        let result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const latency_stats_query = async (window_hours: number) => {
    try {
        const query = db.raw(`
            select 
                AVG(latency_ms):: float as average,
                PERCENTILE_CONT(0.95)
                    within group(order by latency_ms) as p95,
                COUNT(*) as sample_size
            from ai_runs
            where started_at >= NOW() - INTERVAL '${window_hours} hours'
            and status =  'completed'
            and latency_ms is not NULL
            `)

        let result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

export {
    insert_ai_run_query,
    update_ai_run,
    inference_stats_query,
    latency_stats_query,
    tool_stats_query
}