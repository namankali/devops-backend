const table = "sessions"

require("dotenv").config()
const db = require("./db")

interface SessionData {
    session_token: string,
    user_id: number,
    role: string,
    device_type: string,
    browser_family: string,
}

const insert_session = async (data: SessionData): Promise<{ id: number }> => {
    try {
        const insert_query = await db(table).insert(data).returning("id")

        if (insert_query.length === 0) {
            throw new Error("Insert failed: No rows affected");
        }

        return insert_query[0]
    } catch (error) {
        throw error
    }
}

const update_session = async (session_token: string): Promise<{ id: number }> => {
    try {
        const query = db(table)
            .update({
                "logout_time": db.raw(`NOW()`),
                "session_duration_sec": db.raw(`EXTRACT(EPOCH from (NOW() - login_time))`)
            })
            .where("session_token", session_token)
            .returning("id")
        const result = await query
        return result[0]
    } catch (error) {
        throw error
    }
}

const get_session_by_id = async (id: number) => {
    try {
        const query = db.select([`${table}.id`]).from(table).where("id", id)
        const result = await query
        return result
    } catch (error) {
        throw error
    }
}

export {
    insert_session,
    update_session,
    get_session_by_id
}