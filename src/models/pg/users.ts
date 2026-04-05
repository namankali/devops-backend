import { UserSignup } from "../../utils/interfaces"

require("dotenv").config()
const db = require("./db")

const table = "users"

interface UserAuth {
    password_hash: string,
    email: string,
    id: number,
    role: string,
    username: string

}

const fetch_single_user_by_email = async (email: string, signin: boolean = false): Promise<boolean | UserAuth> => {
    try {
        let select_column: Array<string>

        if (signin) {
            select_column = [
                `${table}.password_hash`,
                `${table}.email`,
                `${table}.id`,
                `${table}.role`,
                `${table}.username`,
            ]
        } else {
            select_column = [
                `${table}.email`
            ]
        }

        let query = db(table).select(select_column)
        query = query.where("is_active", true).andWhere(`${table}.email`, email)

        const result = await query.first()

        if (signin) {
            return result
        }
        return !!result
    } catch (error) {
        throw error
    }
}

const insert_user = async (data: UserSignup) => {
    try {
        const query = db(table)
            .insert(data)
            .returning("*")
        const result = await query
        if (result.length === 0) throw new Error("Insert failed")
        return result[0]
    } catch (error) {
        throw error
    }
}

export {
    fetch_single_user_by_email,
    insert_user
}