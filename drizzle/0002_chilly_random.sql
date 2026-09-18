ALTER TABLE "appointments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctors" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "appointments" CASCADE;--> statement-breakpoint
DROP TABLE "doctors" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" SET DATA TYPE varchar(10);