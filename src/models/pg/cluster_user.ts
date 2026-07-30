require("dotenv").config()
const db = require("./db")

const table = "cluster_users"

const insert_cluster_user = async (data: any) => {
    try {
        let result = await db(table).insert(data)
        return result
    } catch (error) {
        throw error
    }
}

export {
    insert_cluster_user
}