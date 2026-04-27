const db = require("./db")
const table = "ai_runs"

const insert_ai_run_query = async (data: any) => {
    try {
        console.log("ai runs data fro insertion", data)
        const query = db(table).insert(data).returning(["id"])

        return await query
    } catch (error) {
        throw error
    }
}

const update_ai_run = async (id: number, data: any) => {
    try {
        const query = db(table).update(data).where("id", id)

        return await query
    } catch (error) {
        throw error
    }
}

export {
    insert_ai_run_query,
    update_ai_run
}