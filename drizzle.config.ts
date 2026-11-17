import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Drizzle kit requires direct (non-pooler) connection on Neon
const dbUrl = (process.env.DATABASE_URL || "").replace("-pooler", "");

export default defineConfig({
  schema: "./src/db/schema/**/*.ts",
  out: "./drizzle",
  dialect: "postgresql",

  dbCredentials: {
    url: dbUrl,
  },
});