import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),

  clinicName: varchar("clinic_name", {
    length: 200,
  }).notNull(),

  supportEmail: varchar("support_email", {
    length: 255,
  }),

  clinicPhone: varchar("clinic_phone", {
    length: 50,
  }),

  appointmentDuration: integer(
    "appointment_duration"
  )
    .notNull()
    .default(30),

  bufferTime: integer("buffer_time")
    .notNull()
    .default(10),

  minNoticeHours: integer(
    "min_notice_hours"
  )
    .notNull()
    .default(2),

  maxBookingDays: integer(
    "max_booking_days"
  )
    .notNull()
    .default(30),

  videoProvider: varchar("video_provider", {
    length: 50,
  })
    .notNull()
    .default("google_meet"),

  manualMeetingLink: varchar("manual_meeting_link", {
    length: 500,
  }),

  enableEmailNotifications: boolean(
    "enable_email_notifications"
  )
    .notNull()
    .default(true),

  workingHours: jsonb("working_hours_config"),

  doctorAvailability: jsonb("doctor_availability"),

  emailTemplates: jsonb("email_templates_config"),

  appointmentStatuses: jsonb("appointment_statuses_config"),

  consultationTypes: jsonb("consultation_types_config"),

  generalAppointmentSettings: jsonb("general_appointment_settings"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});
