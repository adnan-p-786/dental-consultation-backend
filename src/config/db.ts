import { Pool, QueryResult, QueryResultRow } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import * as schema from "../db/schema";

dotenv.config();

// PostgreSQL connection pool configuration
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "dentalClinic",
        password: process.env.DB_PASSWORD || "superuser",
        port: Number(process.env.DB_PORT) || 5432,
      },
);

// Verify initial connection
pool
  .connect()
  .then((client) => {
    console.log("Connected to PostgreSQL database successfully");
    console.log("DB port:", process.env.PORT);
    client.release();
  })
  .catch((err) => console.error("PostgreSQL connection error:", err.message));

// Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Helper for executing typed queries
export const query = <T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export default pool;
