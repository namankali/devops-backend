export async function up(knex) {
  await knex.schema.createTable("team_members", (table) => {
    table.increments("id").primary();

    table.integer("team_id").references("id").inTable("teams").onDelete("CASCADE")
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE")

    table.string("role").defaultTo("member")

    table.unique(["team_id", "user_id"])
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("team_members")
}