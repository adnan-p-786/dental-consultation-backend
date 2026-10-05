import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./user";

/**
 * Patient Profile schema linked to users.id
 * Contains detailed demographic and contact information for patients
 */
export const patientProfile = pgTable("patient_profile", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).default(""),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 50 }).notNull(),
  address: text("address").notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Aliases for convenience across controllers/services
export const patientProfiles = patientProfile;
export const patients = patientProfile;

export type PatientProfile = typeof patientProfile.$inferSelect;
export type NewPatientProfile = typeof patientProfile.$inferInsert;
export type Patient = PatientProfile;
