import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

import { users } from "./user";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),

  // --------------------------------------------------
  // Clinic
  // --------------------------------------------------

  clinicName: varchar("clinic_name", {
    length: 255,
  })
    .notNull()
    .default("Dental Clinic"),

  supportEmail: varchar("support_email", {
    length: 255,
  }),

  clinicPhone: varchar("clinic_phone", {
    length: 50,
  }),

  defaultDuration: integer("default_duration")
    .notNull()
    .default(30),

  // --------------------------------------------------
  // Appointment acknowledgement
  // --------------------------------------------------

  instantAckEnabled: boolean("instant_ack_enabled")
    .notNull()
    .default(true),

  // --------------------------------------------------
  // 24 hour reminder
  // --------------------------------------------------

  reminder24hEnabled: boolean("reminder_24h_enabled")
    .notNull()
    .default(true),

  reminder24hHours: integer("reminder_24h_hours")
    .notNull()
    .default(24),

  // --------------------------------------------------
  // 1 hour reminder
  // --------------------------------------------------

  reminder1hEnabled: boolean("reminder_1h_enabled")
    .notNull()
    .default(true),

  reminder1hMinutes: integer("reminder_1h_minutes")
    .notNull()
    .default(60),

  // --------------------------------------------------
  // Notification channels
  // --------------------------------------------------

  emailEnabled: boolean("email_enabled")
    .notNull()
    .default(true),

  smsEnabled: boolean("sms_enabled")
    .notNull()
    .default(false),

  // --------------------------------------------------
  // Meeting configuration
  // --------------------------------------------------

  meetingProvider: varchar("meeting_provider", {
    length: 50,
  })
    .notNull()
    .default("manual"),

  manualMeetingLink: text("manual_meeting_link"),

  // --------------------------------------------------
  // Future configurable settings
  // --------------------------------------------------

  workingHours: jsonb("working_hours"),

  appointmentStatuses: jsonb("appointment_statuses"),

  consultationTypes: jsonb("consultation_types"),

  emailTemplates: jsonb("email_templates"),

  // --------------------------------------------------
  // Audit
  // --------------------------------------------------

  updatedBy: integer("updated_by").references(() => users.id),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});