import { Router, Request, Response } from "express";
import { pool } from "../config/db";

const router = Router();

// GET /api/health - Health check endpoint
router.get("/", async (_req: Request, res: Response) => {
  let dbStatus = "disconnected";
  try {
    const result = await pool.query("SELECT NOW()");
    if (result.rows.length > 0) {
      dbStatus = "connected";
    }
  } catch {
    dbStatus = "error";
  }

  res.status(dbStatus === "connected" ? 200 : 503).json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    server: "dental-consultation-backend",
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
