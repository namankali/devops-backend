export async function up(knex) {
    await knex.schema.createTable("repo_webhooks", (table) => {
        table.increments("id").primary()

        table.integer("repository_id")
            .references("id")
            .inTable("repositories")
            .onDelete("CASCADE")

        table.bigInteger("github_hook_id").notNullable()

        table.string("webhook_url").notNullable()

        table.boolean("is_active").defaultTo(true)

        table.timestamps(true, true)

        table.unique(["repository_id", "github_hook_id"])
    })
}

export async function down(knex) {
    await knex.schema.dropTableIfExists("repo_webhooks")
}