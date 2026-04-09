const db = require("./db")
const table = "repo_webhooks"

interface InsertWebhook {
    repoId: number,
    hook_id: number,
    webhook_url: string
}

const insert_webhook = async (data: InsertWebhook) => {
    try {
        const query = db(table).insert({
            repository_id: data.repoId,
            github_hook_id: data.hook_id,
            webhook_url: data.webhook_url
        }).onConflict([
            "repository_id",
            "github_hook_id"
        ]).ignore()

        return await query
    } catch (error) {
        throw error
    }
}

const get_webhook_by_repo_id = async (repo_id: number) => {
    try {
        const query = await db.select(["id"]).from(table).where("repository_id", repo_id).first()
        return await query
    } catch (error) {
        throw error
    }
}

export {
    insert_webhook,
    get_webhook_by_repo_id
}