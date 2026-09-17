import express, { Express, Request, Response } from "express";
import cors from "cors";
import apiRouter from "./routes/index";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";

const app: Express = express();

// CORS configuration - allow requests from React frontend
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Base route
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Dental Consultation Backend API is running",
    healthCheck: "/api/health",
    frontend: process.env.CLIENT_URL || "http://localhost:5173",
  });
});

// API Routes
app.use("/api", apiRouter);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling
app.use(errorHandler);

export default app;
