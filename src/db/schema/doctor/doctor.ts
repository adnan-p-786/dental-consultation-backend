import { pgTable, serial, varchar, timestamp, text, date } from "drizzle-orm/pg-core";

export const doctor = pgTable("doctor", {
  id: serial("id").primaryKey(),
  doctorName: varchar("doctor_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  specialization: varchar("specialization", { length: 255 }).notNull(),
  doctorEmail: varchar("doctor_email", { length: 255 }).notNull(),
  doctorPhoto: varchar("doctor_photo", { length: 500 }).notNull(),
  workingHours:varchar("working_hours", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Doctor = typeof doctor.$inferSelect;
export type NewDoctor = typeof doctor.$inferInsert;
