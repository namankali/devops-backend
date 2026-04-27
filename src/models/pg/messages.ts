import { GetMessagesAdmin, InsertMessage } from "../../utils/interfaces"

const db = require("./db")
const table = "messages"

const insert_message = async (data: InsertMessage[]) => {
    try {
        const query = db(table).insert(data).returning(["id"])

        return await query
    } catch (error) {
        throw error
    }
}

const update_message = async (id: number, data: any) => {
    try {
        const query = db(table).update(data).where("id", id)

        return await query
    } catch (error) {
        throw error
    }
}

const get_messages = async (id: number, offset: number = 0, limit: number = 20): Promise<GetMessagesAdmin[]> => {
    try {
        const query = db.raw(`
                SELECT
                    cs.id as conversation_id,
                    cs.title,
                    COALESCE( 
                        json_agg(ms.*) FILTER (where ms.id is not null)
                    ,'[]') as messages
                FROM conversations cs
                LEFT JOIN LATERAL (
                    SELECT
                        *
                    FROM messages ms
                    where conversation_id = cs.id
                    order by ms.created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                    ) ms on TRUE
                where cs.user_id = 1
                GROUP by cs.id, cs.title
            `)

        const result = await query

        return result.rows
    } catch (error) {
        throw error
    }
}


export {
    insert_message,
    update_message,
    get_messages
}