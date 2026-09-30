import {
  pgTable,
  serial,
  varchar,
  timestamp,
  jsonb,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  reportType: varchar("report_type", { length: 100 })
    .notNull()
    .default("appointments_summary"),
  description: text("description"),
  filters: jsonb("filters"),
  metrics: jsonb("metrics").notNull(),
  generatedBy: integer("generated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
