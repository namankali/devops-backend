export async function up(knex) {
  await knex.schema.createTable("resources", (table) => {
    table.increments("id").primary();

    table.string("name").notNullable()
    table.string("type") // container | pod | node

    table.integer("service_id").references("id").inTable("services").onDelete("CASCADE")

    table.jsonb("metadata")

    table.timestamp("created_at").defaultTo(knex.fn.now())
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("resources")
}