import { GetAIWorkflow, GetAIWorkflowOutput } from "../../utils/interfaces"

const db = require("./db")
const table = "github_events"


interface InsertEvent {
    repo_id: number,
    event: string,
    payload: string,
    delivery_id: string,
    source_type: string
}

const insert_github_event = async (data: InsertEvent) => {
    try {
        const query = db(table).insert({
            repository_id: data.repo_id,
            event_type: data.event,
            payload: data.payload,
            delivery_id: data.delivery_id,
            source_type: data.source_type
        })

        return await query
    } catch (error) {
        throw error
    }
}

const check_delivery = async (delivery_id: string, source: string) => {
    try {
        const query = db.select(["*"]).from(table).where({
            "delivery_id": delivery_id,
            "source_type": source
        }).first()

        return await query
    } catch (error) {
        throw error
    }
}

const pipeline_stats = async () => {
    try {
        let query = db.raw(`
                with cte as (
                    select DISTINCT on (payload -> 'workflow_run' ->> 'id')
                        (payload -> 'workflow_run' ->> 'id'):: BIGINT as run_id
                    from github_events
                    where event_type = 'workflow_run'
                    order by (payload -> 'workflow_run' ->> 'id'), (payload -> 'workflow_run' ->> 'created_at') DESC
                )
                select count(*) as total_builds from cte
            `)

        let query_2 = db.raw(`
                    with cte as (
                        select DISTINCT on (payload -> 'workflow_run' ->> 'id')
                            (payload -> 'workflow_run' ->> 'id')::BIGINT as run_id
                        from github_events
                        where event_type = 'workflow_run'
                        and (payload -> 'workflow_run' ->> 'conclusion') != 'success'
                    )
                    SELECT count(*) as failed_builds from cte
                `)

        const result = await query
        const result_2 = await query_2

        return {
            total_builds: result.rows[0].total_builds,
            failed_builds: result_2.rows[0].failed_builds,
        }
    } catch (error) {
        throw error
    }
}

const build_info_query = async () => {
    try {
        const query = db.raw(`
            SELECT DISTINCT on (payload -> 'workflow_run' ->> 'id')
                (payload -> 'workflow_run' ->> 'id'):: bigint as id,
                (payload -> 'workflow_run' ->> 'run_number'):: int as run_id,
                (payload -> 'repository' ->> 'name') as repo_name,
                (payload -> 'workflow_run' ->> 'updated_at') as created_at,
                CASE 
                    WHEN (payload -> 'workflow_run' ->> 'status') = 'queued' THEN 'running'
                    WHEN (payload -> 'workflow_run' ->> 'status') = 'in_progress' THEN 'running'
                    WHEN (payload -> 'workflow_run' ->> 'status') = 'completed' AND (payload -> 'workflow_run' ->> 'conclusion') = 'failure' THEN 'failed'
                    WHEN (payload -> 'workflow_run' ->> 'status') = 'completed' AND (payload -> 'workflow_run' ->> 'conclusion') = 'success' THEN 'success'
                    WHEN (payload -> 'workflow_run' ->> 'status') = 'completed' AND (payload -> 'workflow_run' ->> 'conclusion') = 'cancelled' THEN 'cancelled'
                    ELSE 'default'
                END as status
            FROM github_events
            where event_type = 'workflow_run'
            order by (payload -> 'workflow_run' ->> 'id'), (payload -> 'workflow_run' ->> 'updated_at') DESC 
        `)
        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const branch_build_info_query = async () => {
    try {
        const query = db.raw(`
                SELECT DISTINCT on (payload -> 'workflow_run' ->> 'id')
                    (payload -> 'workflow_run' ->> 'id'):: bigint as id,
                    (payload -> 'workflow_run' ->> 'run_number') as run_number,
                    EXTRACT(EPOCH from (
                        (payload -> 'workflow_run' ->> 'updated_at'):: TIMESTAMP - (payload -> 'workflow_run' ->> 'run_started_at'):: TIMESTAMP
                    )) as duration,
                    (payload -> 'workflow' ->> 'name') as pipeline,
                    CASE 
                        When (payload -> 'workflow_run' ->> 'conclusion') = 'failure' THEN 'failed'
                        WHEN (payload -> 'workflow_run' ->> 'conclusion') = 'success' THEN 'success'
                        WHEN (payload -> 'workflow_run' ->> 'conclusion') = 'cancelled' THEN 'cancelled'
                        else 'default'
                    END as state,
                    (payload -> 'workflow_run' ->> 'status') as status
                from github_events
                where event_type = 'workflow_run' and (payload -> 'workflow_run' ->> 'head_branch') = 'main'
                order by (payload -> 'workflow_run' ->> 'id'), (payload -> 'workflow_run' ->> 'updated_at') desc
            `)
        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const build_duration_by_date = async () => {
    try {
        const query = db.raw(`
                select DISTINCT on (payload -> 'workflow_run' ->> 'id')
                    to_char((payload -> 'workflow_run' ->> 'run_started_at')::TIMESTAMP, 'Mon DD') as date,
                    EXTRACT(EPOCH from ((payload -> 'workflow_run' ->> 'updated_at')::TIMESTAMP - (payload -> 'workflow_run' ->> 'run_started_at'):: TIMESTAMP)) as duration
                from github_events
                where event_type = 'workflow_run' and (payload -> 'workflow_run' ->> 'head_branch') = 'main'
                order by (payload -> 'workflow_run' ->> 'id'), (payload -> 'workflow_run' ->> 'updated_at') desc
            `)

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const data_for_ai_workflow = async (data: GetAIWorkflow): Promise<GetAIWorkflowOutput[]> => {
    try {
        const query = db.raw(`
                with cte as (
                    SELECT DISTINCT on (payload -> 'workflow_job' ->> 'id')
                        (payload -> 'workflow_job' ->> 'id'):: BIGINT as id,
                        (payload -> 'workflow_job' ->> 'run_id'):: BIGINT as run_id,
                        (payload -> 'workflow_job' ->> 'name') as job_name,
                        (payload -> 'workflow_job' ->> 'steps') as steps,
                        (payload -> 'workflow_job' ->> 'head_branch') as head_branch,
                        (payload -> 'workflow_job' ->> 'conclusion') as conclusion,
                        (payload -> 'workflow_job' ->> 'completed_at'):: TIMESTAMP as completed_at,
                        (payload -> 'workflow_job' ->> 'started_at'):: TIMESTAMP as started_at,
                        (payload -> 'repository' ->> 'name') as repo_name,
                        (payload -> 'repository' ->> 'description') as repo_description,
                        (payload -> 'repository' ->> 'commits_url') as commits_url,
                        (payload -> 'repository' ->> 'compare_url') as compare_url,
                        (payload -> 'repository' -> 'owner' ->> 'type') as parent_type,
                        id:: INTEGER as db_id
                    FROM github_events as ge
                    WHERE ge.event_type = 'workflow_job'
                    AND (ge.payload -> 'workflow_job' ->> 'head_branch') = '${data.branch_name}' 
                    order by
                        (payload -> 'workflow_job' ->> 'id'),
                        CASE
                        WHEN (payload -> 'workflow_job' ->> 'status') = 'completed' THEN 0
                        ELSE 1
                        END
                    )
                SELECT
                    *
                FROM cte
                    ORDER by cte.db_id DESC;
            `)

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const get_logs_for_ai = async (data: any) => {
    try {
        const failed = data.hasOwnProperty("failed") ? true : false
        const query = db.raw(`
                
        `)
    } catch (error) {
        throw error
    }
}





export {
    insert_github_event,
    check_delivery,
    pipeline_stats,
    build_info_query,
    branch_build_info_query,
    build_duration_by_date,
    data_for_ai_workflow,
    get_logs_for_ai
}