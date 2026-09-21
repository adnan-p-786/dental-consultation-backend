import { pgTable, serial, varchar, timestamp, text, date } from "drizzle-orm/pg-core";

export const contact = pgTable("contact", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Contact = typeof contact.$inferSelect;  
export type NewContact = typeof contact.$inferInsert;