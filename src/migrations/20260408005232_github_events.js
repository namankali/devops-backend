export async function up(knex) {
  await knex.schema.createTable("github_events", (table) => {
    table.increments("id").primary()

    table.integer("repository_id")
      .references("id")
      .inTable("repositories")
      .onDelete("CASCADE")

    table.string("event_type").notNullable()

    table.jsonb("payload").notNullable()

    table.timestamp("received_at").defaultTo(knex.fn.now())

    table.index(["repository_id"])
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("github_events")
}