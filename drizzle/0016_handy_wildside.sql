CREATE TABLE "reminder_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"reminder_type" varchar(50) NOT NULL,
	"channel" varchar(20) DEFAULT 'email' NOT NULL,
	"recipient_email" varchar(255),
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"error" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_statuses" ADD COLUMN "key" varchar(50);--> statement-breakpoint
ALTER TABLE "appointment_statuses" ADD COLUMN "color" varchar(50) DEFAULT 'teal' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment_statuses" ADD COLUMN "description" varchar(500);--> statement-breakpoint
ALTER TABLE "appointment_statuses" ADD COLUMN "patient_can_cancel" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment_statuses" ADD COLUMN "auto_expire_hours" integer;--> statement-breakpoint
ALTER TABLE "consultation_types" ADD COLUMN "type_key" varchar(50);--> statement-breakpoint
ALTER TABLE "consultation_types" ADD COLUMN "default_duration" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "consultation_types" ADD COLUMN "requires_meeting_link" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "consultation_types" ADD COLUMN "badge_text" varchar(50) DEFAULT 'Tele-Health';--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "event_key" varchar(50);--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "custom_footer_note" text;--> statement-breakpoint
ALTER TABLE "reminder_settings" ADD COLUMN "reminder_type" varchar(50);--> statement-breakpoint
ALTER TABLE "reminder_settings" ADD COLUMN "channel" varchar(20) DEFAULT 'email' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_logs_apt_type_idx" ON "reminder_logs" USING btree ("appointment_id","reminder_type");--> statement-breakpoint
ALTER TABLE "appointment_statuses" ADD CONSTRAINT "appointment_statuses_key_unique" UNIQUE("key");--> statement-breakpoint
ALTER TABLE "consultation_types" ADD CONSTRAINT "consultation_types_type_key_unique" UNIQUE("type_key");--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_event_key_unique" UNIQUE("event_key");--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_day_of_week_unique" UNIQUE("day_of_week");--> statement-breakpoint
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_reminder_type_unique" UNIQUE("reminder_type");