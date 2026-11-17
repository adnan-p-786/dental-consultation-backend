ALTER TABLE "reminder_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "reminder_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "appointment_statuses" DROP CONSTRAINT "appointment_statuses_key_unique";--> statement-breakpoint
ALTER TABLE "consultation_types" DROP CONSTRAINT "consultation_types_type_key_unique";--> statement-breakpoint
ALTER TABLE "email_templates" DROP CONSTRAINT "email_templates_event_key_unique";--> statement-breakpoint
ALTER TABLE "working_hours" DROP CONSTRAINT "working_hours_day_of_week_unique";--> statement-breakpoint
ALTER TABLE "reminder_settings" DROP CONSTRAINT "reminder_settings_reminder_type_unique";--> statement-breakpoint
ALTER TABLE "appointment_statuses" DROP COLUMN "key";--> statement-breakpoint
ALTER TABLE "appointment_statuses" DROP COLUMN "color";--> statement-breakpoint
ALTER TABLE "appointment_statuses" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "appointment_statuses" DROP COLUMN "patient_can_cancel";--> statement-breakpoint
ALTER TABLE "appointment_statuses" DROP COLUMN "auto_expire_hours";--> statement-breakpoint
ALTER TABLE "consultation_types" DROP COLUMN "type_key";--> statement-breakpoint
ALTER TABLE "consultation_types" DROP COLUMN "default_duration";--> statement-breakpoint
ALTER TABLE "consultation_types" DROP COLUMN "requires_meeting_link";--> statement-breakpoint
ALTER TABLE "consultation_types" DROP COLUMN "badge_text";--> statement-breakpoint
ALTER TABLE "email_templates" DROP COLUMN "event_key";--> statement-breakpoint
ALTER TABLE "email_templates" DROP COLUMN "custom_footer_note";--> statement-breakpoint
ALTER TABLE "reminder_settings" DROP COLUMN "reminder_type";--> statement-breakpoint
ALTER TABLE "reminder_settings" DROP COLUMN "channel";