import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", {
      length: 150,
    }).notNull().unique(),

    subject: varchar("subject", {
      length: 300,
    }).notNull(),

    body: text("body").notNull(),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  }
);
