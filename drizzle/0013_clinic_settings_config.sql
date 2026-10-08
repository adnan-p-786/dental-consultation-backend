ALTER TABLE "settings" ADD COLUMN "clinic_phone" varchar(50);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "manual_meeting_link" varchar(500);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "working_hours_config" jsonb;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "doctor_availability" jsonb;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "email_templates_config" jsonb;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "appointment_statuses_config" jsonb;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "consultation_types_config" jsonb;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "general_appointment_settings" jsonb;
