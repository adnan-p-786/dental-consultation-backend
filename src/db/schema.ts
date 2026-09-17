import { pgTable, serial, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core"

// Doctors table
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  bio: text("bio"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments & Consultation Requests table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientEmail: varchar("patient_email", { length: 255 }).notNull(),
  patientPhone: varchar("patient_phone", { length: 50 }),
  treatmentCode: varchar("treatment_code", { length: 100 }).notNull(),
  consultationType: varchar("consultation_type", { length: 50 }).default("online"), // 'online' | 'in_clinic'
  preferredDate: varchar("preferred_date", { length: 50 }),
  preferredTime: varchar("preferred_time", { length: 50 }),
  status: varchar("status", { length: 50 }).default("pending"), // 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});


export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

export * from "./schema/user";
