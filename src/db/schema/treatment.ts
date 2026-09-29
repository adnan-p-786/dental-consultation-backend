import { pgTable, serial, varchar, timestamp, text, boolean } from "drizzle-orm/pg-core";

export const treatments = pgTable("treatments", {
  id: serial("id").primaryKey(),

  name: varchar("name", {
    length: 200,
  })
    .notNull()
    .unique(),

  description: text("description"),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Treatment = typeof treatments.$inferSelect;
export type NewTreatment = typeof treatments.$inferInsert;
