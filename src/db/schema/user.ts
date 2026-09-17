
import { pgTable, serial, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "patient",
  "doctor",
  "admin",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  firstName: varchar("first_name", { length: 255 }).notNull(),

  lastName: varchar("last_name", { length: 255 }).notNull(),

  email: varchar("email", { length: 255 }).notNull().unique(),

  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),

  role: userRole("role").notNull().default("patient"),

  password: varchar("password", { length: 255 }).notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;