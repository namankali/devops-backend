export async function up(knex) {
  await knex.schema.createTable("teams", (table) => {
    table.increments("id").primary();

    table.string("name").notNullable()

    table.integer("owner_id").references("id").inTable("users").onDelete("CASCADE")

    table.timestamp("created_at").defaultTo(knex.fn.now())
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("teams")
}