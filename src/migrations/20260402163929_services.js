export async function up(knex) {
  await knex.schema.createTable("services", (table) => {
    table.increments("id").primary();

    table.string("name").notNullable()
    table.string("type") // docker | kubernetes
    table.string("environment") // dev | staging | prod

    table.integer("team_id").references("id").inTable("teams").onDelete("SET NULL")

    table.timestamp("created_at").defaultTo(knex.fn.now())
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("services")
}