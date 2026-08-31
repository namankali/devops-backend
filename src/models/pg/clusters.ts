require("dotenv").config()
const db = require("./db")

const table = "clusters"


const insert_cluster_data = async (data: any) => {
    let data_for_insertion = {
        user_id: data.user_id,
        name: data.name,
        display_name: data.display_name,
        provider: data.provider,
        environment: data.environment,
        kubernetes_version: data?.kubernetes_version || "",
        status: data.status,
        api_server: data.api_server,
        is_default: true
    }
    const update = await db(table).update({
        "is_default": false
    }).where({
        "user_id": data.user_id
    })
    const result = await db(table).insert(data_for_insertion).returning(["id"])
    return result
}

const fetch_credential = async (user_id: number) => {
    try {
        let query = db.raw(`
                SELECT
                  cc.kubeconfig,
                  c.id as cluster_id
                from clusters as c
                left join cluster_credentials as cc on cc.cluster_id = c.id 
                where c.user_id = ${user_id}
            `)

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const fetch_credential_by_cluster_id = async (cluster_id: number) => {
    try {
        let query = db.raw(`
                SELECT
                  cc.kubeconfig,
                  c.id as cluster_id,
                  cc.authentication_type,
                  c.api_server,
                  c.display_name
                from clusters as c
                left join cluster_credentials as cc on cc.cluster_id = c.id 
                where c.id = ${cluster_id}
            `)

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const cluster_id_by_user_id = async (user_id: number, provider?: string, display_name?: string, env?: string) => {
    try {
        console.log("display_name", display_name)
        let query = db.select([
            `${table}.id as cluster_id`,
            `${table}.display_name`,
            `${table}.provider`,

        ]).from(table).where('user_id', user_id)

        if (provider) {
            query = query.andWhere("provider", provider)
        }
        if (display_name) {
            query = query.andWhere("display_name", display_name)
        }
        if (env) {
            query = query.andWhere("environment", env.toUpperCase())
        }
        if (!provider && !display_name && !env) {
            query = query.andWhere("is_default", true)
        }

        return await query
    } catch (error) {
        throw error
    }
}

const fetch_provider_environment = async (user_id: number): Promise<any> => {
    try {
        const query = db.raw(`
                SELECT
                  id,
                  provider as providers,
                  environment as environments,
                  display_name
                FROM clusters
                where user_id = ?
                GROUP by ("id")
            `,
            [user_id]
        )

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const fetch_environments = async (user_id: number): Promise<any> => {
    try {
        let query = db.raw(`
                with cte as(
                    select provider from ${table}
                    where user_id = ${user_id}
                    and is_default = 'true'
                )
                    select 
                        id,
                        JSON_AGG(DISTINCT environment) as environments
                    from ${table}
                    where user_id = ${user_id}
                    and provider = (select provider from cte)
                    group by id
            `)
        // let query = db.select([
        //     `${table}.id`,
        //     db.raw(`JSON_AGG(DISTINCT environment) as environments`)
        // ]).from(table).where('user_id', user_id).andWhere("is_default", true).groupBy(["id", "provider"])

        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const default_cluster_data = async (user_id: number) => {
    try {
        const query = db.select([
            `${table}.id`,
            `${table}.display_name`,
            `${table}.provider`,
            `${table}.environment`,
            `${table}.name`,
        ]).from(table).where("is_default", true).andWhere('user_id', user_id)

        return await query
    } catch (error) {
        throw error
    }
}

const cluster_id_by_other_details = async (user_id: number, provider: string, environment: string) => {
    try {
        const query = db.select([
            `${table}.id as cluster_id`
        ]).from(table).where({
            user_id,
            provider,
            environment
        })

        return await query
    } catch (error) {
        throw error
    }
}
const fetch_registered_clusters = async (user_id: number) => {
    try {
        const query = db.select([
            `${table}.id`,
            `${table}.display_name`,
        ])
            .from(table)
            .where(`${table}.user_id`, user_id)

        return await query
    } catch (error) {
        throw error
    }
}

export {
    fetch_credential,
    insert_cluster_data,
    cluster_id_by_user_id,
    fetch_credential_by_cluster_id,
    fetch_provider_environment,
    fetch_environments,
    default_cluster_data,
    cluster_id_by_other_details,
    fetch_registered_clusters
}