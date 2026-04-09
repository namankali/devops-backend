const db = require("./db")
const table = "github_events"


interface InsertEvent {
    repo_id: number,
    event: string,
    payload: string,
    delivery_id: string
}

const insert_github_event = async (data: InsertEvent) => {
    try {
        const query = db(table).insert({
            repository_id: data.repo_id,
            event_type: data.event,
            payload: data.payload,
            delivery_id: data.delivery_id
        })

        return await query
    } catch (error) {
        throw error
    }
}

const check_delivery = async (delivery_id: string) => {
    try {
        const query = db.select(["*"]).from(table).where("delivery_id", delivery_id).first()

        return await query
    } catch (error) {
        throw error
    }
}

export {
    insert_github_event,
    check_delivery
}