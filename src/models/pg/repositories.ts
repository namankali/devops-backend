import moment from "moment"
import { InsertRepo } from "../../utils/interfaces"

const db = require("./db")
const table = "repositories"



const get_repo = async (github_repo_id: number) => {
    try {
        const query = db.select("*").from(table).where("github_repo_id", github_repo_id).first()
        return await query
    } catch (error) {
        throw error
    }
}

const get_repo_by_name = async (repo_name: string) => {
    try {
        console.log("repo_name", repo_name)
        const query = db.raw(`
              SELECT
                id,
                name,
                github_repo_id,
                full_name,
                default_branch,
                private as is_private,
                ge.run_id,
                ge.registered_under,
                case
                  when ge.repo_language is null then LANGUAGE
                  else ge.repo_language
                end as repo_language
                from repositories
                LEFT JOIN LATERAL(
                SELECT DISTINCT  on (payload -> 'workflow_run' ->> 'id')
                    (payload -> 'workflow_job' ->> 'status'):: bigint as run_id,
                    (payload -> 'repository' -> 'owner' ->> 'type') as registered_under,
                    (payload -> 'repository' ->> 'language') as repo_language
            from github_events
            where event_type = 'workflow_job'
            and payload -> 'repository' ->> 'name' = '${repo_name}'
            ORDER BY (payload -> 'workflow_job' ->> 'run_id'), (payload -> 'workflow_job' ->> 'updated_at') DESC 
            LIMIT 1
              ) as ge on TRUE
            where name = '${repo_name}'
            `)
        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const get_repo_build_status = async (repo_name: string, branch_name: string = "development") => {
    try {
        console.log("repo_name", repo_name, "branch_name", branch_name)
        const query = db.raw(`
                SELECT
                  id,
                  (payload->'workflow_run'->>'id')::bigint AS run_id,
                  payload->'workflow_run'->>'status' AS status,
                  payload->'workflow'->>'name' AS workflow_name,
                  payload->'workflow_run'->>'conclusion' AS conclusion,
                  payload->'workflow_run'->>'head_sha' AS commit_sha,
                  payload->'workflow_run'->>'head_branch' AS branch,
                  payload->'workflow_run'->>'created_at' AS created_at
                FROM github_events
                WHERE event_type = 'workflow_run'
                  AND payload->'repository'->>'name' = '${repo_name}'
                  and payload -> 'workflow_run' ->> 'head_branch' = '${branch_name}'
                ORDER BY
                  (payload->'workflow_run'->>'updated_at')::timestamptz DESC
                LIMIT 1;
            `)

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const get_repo_build_details_by_date = async (data: any) => {
    try {
        let query;
        const start_date = moment(data.start_date)
        const end_date = moment(data.end_date)
        const date_diff = end_date.diff(start_date, "days")

        let sub_str = ""

        if (Array.isArray(data.repo_name)) {
            sub_str += `and (payload -> 'repository' ->> 'name') in (${data.repo_name.map((repo: string) => `'${repo}'`)})`
        } else {
            sub_str += `and (payload -> 'repository' ->> 'name') = '${data.repo_name}'`
        }

        if (date_diff === 0) {
            query = db.raw(`
                    SELECT DISTINCT on (payload -> 'workflow_run' ->> 'id')
                      (payload -> 'workflow_run' ->> 'id') as run_id,
                        (payload -> 'workflow_run' ->> 'run_number')::int AS run_number,
                        payload -> 'workflow_run' ->> 'status' AS status,
                        payload -> 'workflow_run' ->> 'conclusion' AS conclusion,
                        payload -> 'workflow_run' ->> 'run_attempt' AS run_attempt,
                        payload -> 'workflow_run' ->> 'name' AS workflow_run_name,
                        payload -> 'repository' ->> 'name' AS repo_name,
                        payload -> 'workflow_run' ->> 'head_branch' AS branch,
                        payload -> 'workflow_run' ->> 'head_sha' AS commit_sha,
                        payload -> 'workflow_run' ->> 'display_title' AS display_title,
                        payload -> 'workflow_run' ->> 'html_url' AS html_url,
                        payload -> 'workflow_run' ->> 'created_at' AS created_at,
                        payload -> 'workflow_run' ->> 'updated_at' AS updated_at
                    from github_events as ge
                    where ge.event_type = 'workflow_run'
                    and (payload -> 'workflow_run' ->> 'conclusion') = 'failure'
                    and (payload -> 'workflow_run' ->> 'head_branch') = '${data.branch_name}'
                    ${sub_str}
                    and (payload -> 'workflow_run' ->> 'updated_at'):: DATE = '${data.start_date}'
                    order by (payload -> 'workflow_run' ->> 'id') desc, received_at DESC
                `)

            const result = await query
            return result.rows
        } else {
            console.log("Coming soon")
        }

    } catch (error) {
        throw error
    }
}

const get_all_repos = async (user_id: number) => {
    try {
        let query = db.raw(`
                SELECT
                    github_repo_id,
                    name as repo_name,
                    full_name as repo_fullname,
                    default_branch,
                    private :: boolean as is_private
                from repositories
                where github_account_id = (
                SELECT
                    ID
                from github_accounts
                where user_id = ${user_id})
            `)

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const insert_repo = async (data: InsertRepo) => {
    try {
        const query = db(table).insert({
            github_repo_id: data.github_repo_id,
            github_account_id: data.github_account_id,
            name: data.name,
            full_name: data.full_name,
            owner_login: data.owner_login,
            default_branch: data.default_branch,
            private: data.private,
            archived: data.archived,
            language: data.language,
            github_created_at: data.github_created_at,
            github_updated_at: data.github_updated_at,
            pushed_at: data.pushed_at
        }).returning("*")

        return await query
    } catch (error) {
        throw error
    }
}
interface UpdateWhereDataRepositories {
    id: number,
    github_repo_id: number
}

const update_repo_github_accounts_id = async (where_data: UpdateWhereDataRepositories, is_active: boolean = true) => {
    try {
        const query = db.raw(`
            update repositories
                set 
                is_active = ${is_active}
            where github_account_id = (
                select id from github_accounts where id = ${where_data.id}
                )
            and github_repo_id = ${where_data.github_repo_id}
            `)

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const get_repo_details_dashboard = async () => {
    try {
        const query = db.raw(`
                SELECT
                    COUNT(DISTINCT r.id) AS repo_count,
                    COUNT(ms.workflow_run_id) AS failed_workflow_run_count
                FROM repositories r
                LEFT JOIN LATERAL (
                    SELECT DISTINCT ON (ge.payload -> 'workflow_run' ->> 'id')
                        ge.payload -> 'workflow_run' ->> 'id' AS workflow_run_id
                    FROM github_events ge
                    WHERE ge.repository_id = r.id
                    AND ge.event_type = 'workflow_run'
                    AND ge.payload -> 'workflow_run' ->> 'conclusion' = 'failure'
                    ORDER BY
                        ge.payload -> 'workflow_run' ->> 'id',
                        ge.payload -> 'workflow_run' ->> 'updated_at' DESC
                ) ms ON TRUE;
            `)
        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const detailed_repos_data_dashboard = async () => {
    try {
        const query = db.raw(`
                SELECT
                    name,
                    github_repo_id,
                    CASE
                        WHEN owner_login = 'namankali' THEN 'org'
                        ELSE 'personal'
                    END as type,
                    owner_login as owner,
                    default_branch as branch,
                    COALESCE(ms.latest_build_conclusion, 'N/A') as build,
                    COALESCE(cc.deploy_status, 'N/A') as deploy,
                    COALESCE(nm.activity, 'N/A') AS activity
                from repositories as rs
                    
                LEFT JOIN LATERAL(
                    SELECT DISTINCT ON (repository_id)
                    repository_id,
                    payload->'repository'->>'full_name' AS repo_name,
                    payload->'workflow_run'->>'conclusion' AS latest_build_conclusion,
                    payload->'workflow_run'->>'status' AS status,
                    payload->'workflow_run'->>'html_url' AS build_url,
                    received_at
                    FROM github_events
                    WHERE event_type = 'workflow_run'
                    AND payload->'workflow_run'->>'status' = 'completed'
                    AND payload->'workflow_run'->>'conclusion' IN ('success', 'failure')
                    and repository_id = rs.id
                    ORDER BY repository_id, received_at DESC
                        
                    ) as ms on true
                    
                LEFT JOIN LATERAL(
                    SELECT DISTINCT ON (repository_id)
                        repository_id,
                        payload->'repository'->>'full_name' AS repo_name,
                        payload->'workflow_job'->>'name' AS job_name,
                        payload->'workflow_job'->>'status' AS job_status,
                        payload->'workflow_job'->>'conclusion' AS deploy_status,
                        received_at
                    FROM github_events
                    WHERE event_type = 'workflow_job'
                    AND LOWER(payload->'workflow_job'->>'name') LIKE '%deploy%'
                    and repository_id = rs.id
                    ORDER BY repository_id, received_at DESC
                    ) as cc on TRUE

                LEFT JOIN LATERAL (
                    SELECT
                        ge.received_at AS latest_workflow_received_at,
                        ge.payload->'workflow_run'->>'updated_at' AS completion_time,
                        CASE
                        WHEN NOW() - (ge.payload->'workflow_run'->>'updated_at')::timestamptz < INTERVAL '1 hour'
                            THEN CONCAT(EXTRACT(MINUTE FROM NOW() - (ge.payload->'workflow_run'->>'updated_at')::timestamptz)::INT, 'm ago')
                        WHEN NOW() - (ge.payload->'workflow_run'->>'updated_at')::timestamptz < INTERVAL '1 day'
                            THEN CONCAT(EXTRACT(HOUR FROM NOW() - (ge.payload->'workflow_run'->>'updated_at')::timestamptz)::INT, 'h ago')
                        ELSE CONCAT(EXTRACT(DAY FROM NOW() - (ge.payload->'workflow_run'->>'updated_at')::timestamptz)::INT, 'd ago')
                        END AS activity
                    FROM github_events ge
                    WHERE ge.repository_id = rs.id
                        AND ge.event_type = 'workflow_run'
                        AND ge.payload->'workflow_run'->>'status' = 'completed'
                    ORDER BY (ge.payload->'workflow_run'->>'updated_at')::timestamptz DESC
                    LIMIT 1
                ) AS nm ON TRUE

                order by rs.id 
            `)


        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}


export {
    get_repo,
    get_repo_by_name,
    get_all_repos,
    insert_repo,
    update_repo_github_accounts_id,
    get_repo_details_dashboard,
    detailed_repos_data_dashboard,
    get_repo_build_status,
    get_repo_build_details_by_date
}