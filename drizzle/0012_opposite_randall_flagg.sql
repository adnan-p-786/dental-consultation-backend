CREATE TABLE "appointment_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "consultation_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"clinic_name" varchar(200) NOT NULL,
	"support_email" varchar(255),
	"appointment_duration" integer DEFAULT 30 NOT NULL,
	"buffer_time" integer DEFAULT 10 NOT NULL,
	"min_notice_hours" integer DEFAULT 2 NOT NULL,
	"max_booking_days" integer DEFAULT 30 NOT NULL,
	"video_provider" varchar(50) DEFAULT 'google_meet' NOT NULL,
	"enable_email_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"report_type" varchar(100) DEFAULT 'appointments_summary' NOT NULL,
	"description" text,
	"filters" jsonb,
	"metrics" jsonb NOT NULL,
	"generated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) DEFAULT '',
	"age" integer NOT NULL,
	"gender" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "patient_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_of_week" varchar(20) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"break_start" time,
	"break_end" time,
	"is_working" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"minutes_before" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "contact" CASCADE;--> statement-breakpoint
ALTER TABLE "consultations" DROP CONSTRAINT "consultations_appointment_id_appointments_id_fk";
--> statement-breakpoint
ALTER TABLE "consultations" ALTER COLUMN "patient_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "assigned_doctor_id" varchar(100);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "assigned_doctor_name" varchar(255);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "meeting_link" varchar(500);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "meeting_platform" varchar(50);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "confirmed_date" date;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "confirmed_time" varchar(50);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "consultation_notes" jsonb;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profile" ADD CONSTRAINT "patient_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;