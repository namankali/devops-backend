const db = require("./db")
const table = "github_accounts"

interface AccountData {
    user_id: number,
    github_user_id: number,
    access_token: string,
    iv: string,
    tag: string,
    github_user_name: string
}

interface GetAccessToken {
    user_id: number,
    github_user_id: string
}

const insert_account = async (data: AccountData): Promise<[{ [key: string]: number }]> => {
    try {
        const query = db(table).insert(data).returning("id")
        return await query
    } catch (error: any) {
        if (error.code === "23505") {
            throw new Error("GitHub account already linked");
        }
        throw error
    }
}

const update_github_access_token = async (where_data: Record<string, number>, update_data: Record<string, string>) => {
    try {
        const query = db(table).where(where_data).update(update_data)
        return await query
    } catch (error) {
        throw error
    }
}

const get_github_access_token = async (where_data: GetAccessToken) => {
    try {
        let query = db.select([
            `${table}.access_token`
        ]).from(table)

        query = query.where(where_data)

        return await query
    } catch (error) {
        throw error
    }
}

const get_github_account_details = async (where_data: Record<string, number>) => {
    try {
        let query = db.select([
            `${table}.access_token`,
            `${table}.github_user_id`
        ]).from(table)

        query = query.where("user_id", where_data.user_id)
        return await query.first()
    } catch (error) {
        throw error
    }
}

export {
    insert_account,
    update_github_access_token,
    get_github_access_token,
    get_github_account_details
}