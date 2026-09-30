import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { doctor } from "./doctor";
import { users } from "./user";
import { appointments } from "./appointment";

export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),

  appointmentId: integer("appointment_id").notNull().unique().references(() => appointments.id),

  doctorId: integer("doctor_id").notNull().references(() => doctor.id),

  patientId: integer("patient_id").references(() => users.id),

  chiefComplaint: text("chief_complaint"),

  consultationFindings: text("consultation_findings"),

  diagnosis: text("diagnosis"),

  recommendedTreatment: text("recommended_treatment"),

  additionalInstructions: text("additional_instructions"),

  followUpRequired: boolean("follow_up_required").default(false),

  followUpDate: date("follow_up_date"),

  internalNotes: text("internal_notes"),

  isCompleted: boolean("is_completed").default(false),

  completedAt: timestamp("completed_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Consultation = typeof consultations.$inferSelect;
export type NewConsultation = typeof consultations.$inferInsert;
