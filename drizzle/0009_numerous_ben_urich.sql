ALTER TYPE "public"."user_role" ADD VALUE 'superadmin' BEFORE 'admin';--> statement-breakpoint
ALTER TABLE "doctor" ADD COLUMN "doctor_password" varchar(255) NOT NULL;