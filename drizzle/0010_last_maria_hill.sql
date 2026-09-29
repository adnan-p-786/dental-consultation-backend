CREATE TABLE "treatments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "treatments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "doctor" ALTER COLUMN "doctor_password" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE varchar(255);