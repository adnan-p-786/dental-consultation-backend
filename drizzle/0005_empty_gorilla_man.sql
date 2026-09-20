CREATE TABLE "doctor" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_name" varchar(255) NOT NULL,
	"status" varchar(255) NOT NULL,
	"specialization" varchar(255) NOT NULL,
	"doctor_email" varchar(255) NOT NULL,
	"doctor_photo" varchar(500) NOT NULL,
	"working_hours" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
