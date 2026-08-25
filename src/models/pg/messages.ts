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

const get_messages = async (id: number, offset: number = 0, limit: number = 20, branch: string): Promise<GetMessagesAdmin[]> => {
    try {
        const query = db.raw(`
                SELECT
                    cs.id as conversation_id,
                    cs.title,
                    COALESCE(json_agg(ms.*) FILTER (where ms.id is not null),'[]') as messages
                FROM conversations cs
                LEFT JOIN LATERAL (
                    SELECT
                        *
                    FROM messages ms
                    where conversation_id = cs.id
                    and branch = '${branch}'
                    order by ms.id DESC
                    LIMIT ${limit} OFFSET ${offset}
                    ) ms on TRUE
                where cs.user_id = ${id}
                and cs.branch = '${branch}'
                GROUP by cs.id, cs.title
            `)

        const result = await query

        return result.rows
    } catch (error) {
        throw error
    }
}

const get_messages_for_LLM = async (user_id: string, branch: string) => {
    if (!branch) throw Error("Branch is required")

    try {
        let query = db.raw(`
                    SELECT
                      c.id as conversation_id,
                      c.title as conversation_title,
                      m.id as message_id,
                      m.role as role,
                      m.content,
                      m.branch as branch,
                      m.status as message_status
                    from conversations as c
                    left join messages as m on m.conversation_id = c.id and m.branch = '${branch}'
                    where c.user_id = ${user_id}
                    and c.branch = '${branch}'
                    and m.status != 'streaming'
                    order by m.updated_at desc, m.id desc
                    limit 16
                `)

        query = await query
        return query.rows
    } catch (error) {
        throw error
    }
}


export {
    insert_message,
    update_message,
    get_messages,
    get_messages_for_LLM
}