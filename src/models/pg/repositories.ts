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
        const query = db.raw(`
                SELECT
                    id,
                    name,
                    github_repo_id,
                    full_name,
                    default_branch,
                    private as is_private
                from repositories
                where name = ${repo_name}
            `)
        const result = await query
        return result.rows
    } catch (error) {
        throw error
    }
}

const get_all_repos = async (user_id: number) => {
    try {
        let query = db.raw(`
                SELECT
                    id,
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


export {
    get_repo,
    get_repo_by_name,
    get_all_repos,
    insert_repo,
    update_repo_github_accounts_id
}