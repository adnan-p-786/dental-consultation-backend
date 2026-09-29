import "dotenv/config";
import app from "./app";
import { pool } from "./config/db";
import {
  startAutomaticReminderScheduler,
  stopAutomaticReminderScheduler,
} from "./services/reminderScheduler";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Launch automatic background reminder daemon
  startAutomaticReminderScheduler();
});

const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  stopAutomaticReminderScheduler();
  server.close(async () => {
    try {
      await pool.end();
      console.log("PostgreSQL connection pool closed.");
    } catch (err) {
      console.error("Error closing PostgreSQL pool:", err);
    }
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

