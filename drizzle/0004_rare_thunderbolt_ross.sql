CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_name" varchar(255) NOT NULL,
	"patient_email" varchar(255) NOT NULL,
	"phone_number" varchar(50),
	"contact_method" varchar(10) NOT NULL,
	"tratment_type" varchar(100) NOT NULL,
	"preferred_date" date NOT NULL,
	"preferred_time" varchar(50),
	"additional_description" text,
	"supporting_document" varchar(500),
	"created_at" timestamp DEFAULT now()
);
