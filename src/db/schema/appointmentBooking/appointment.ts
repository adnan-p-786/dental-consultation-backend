import { pgTable, serial, varchar, timestamp, text, date } from "drizzle-orm/pg-core";

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientEmail: varchar("patient_email", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  contactMethod: varchar("contact_method", { length: 10 }).notNull(),
  tratmentType: varchar("tratment_type", { length: 100 }).notNull(),
  preferredDate: date("preferred_date").notNull(),
  preferredTime: varchar("preferred_time", { length: 50 }),
  additionalDescription: text("additional_description"),
  supportingDocument:varchar("supporting_document", { length: 500 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
