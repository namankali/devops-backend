export async function up(knex) {
  await knex.schema.createTable("github_accounts", (table) => {
    table.increments("id").primary()

    table.integer("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")

    table.bigInteger("github_user_id").notNullable().unique()
    table.string("github_user_name").notNullable()

    table.text("access_token")

    table.string("iv", 64).notNullable()
    table.string("tag", 64).notNullable()

    table.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("github_accounts")
}