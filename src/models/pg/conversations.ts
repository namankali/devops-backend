const db = require("./db")
const table = "conversations"


interface InsertConversation {
    user_id: number,
    title: string,
    branch: string
}

const insert_conversation = async (data: InsertConversation) => {
    try {
        const query = db(table).insert({
            user_id: data.user_id,
            title: data.title,
            branch: data.branch

        }).returning(["id"])

        return query
    } catch (error) {
        throw error
    }
}

export {
    insert_conversation
}