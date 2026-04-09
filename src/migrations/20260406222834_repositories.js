export async function up(knex) {
    await knex.schema.createTable("repositories", (table) => {
        table.increments("id").primary()

        table.integer("github_account_id")
            .references("id")
            .inTable("github_accounts")
            .onDelete("CASCADE")
            .notNullable()

        table.bigInteger("github_repo_id").notNullable().unique()

        table.string("name").notNullable()
        table.string("full_name").notNullable()

        table.string("owner_login").notNullable()

        table.string("default_branch")

        table.boolean("private")
        table.boolean("archived").defaultTo(false)

        table.string("language")

        table.timestamp("github_created_at")
        table.timestamp("github_updated_at")
        table.timestamp("pushed_at")

        table.boolean("is_active").defaultTo(true)

        table.timestamps(true, true)

        table.index(["github_account_id"])
    })
}

export async function down(knex) {
    await knex.schema.dropTableIfExists("repositories")
}