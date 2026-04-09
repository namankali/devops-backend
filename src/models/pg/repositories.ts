const db = require("./db")
const table = "repositories"

interface InsertRepo {
    github_account_id: number,
    github_repo_id: number,
    name: string,
    full_name: string,
    owner_login: string,
    default_branch: string,
    private: boolean,
    archived: boolean,
    language: string | null,
    github_created_at: string,
    github_updated_at: string,
    pushed_at: string,
}

const get_repo = async (github_repo_id: number) => {
    try {
        const query = db.select("*").from(table).where("github_repo_id", github_repo_id).first()
        return await query
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

export {
    get_repo,
    insert_repo
}