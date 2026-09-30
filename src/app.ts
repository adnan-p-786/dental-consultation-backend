import express from "express";
import cors from "cors";
import path from "path";

import usersRouter from "./routes/user.routes";
import appointmentRoutes from "./routes/appointment.routes";
import doctorRoutes from "./routes/doctor.routes";
import treatmentRoutes from "./routes/treatment.routes";
import consultationRoutes from "./routes/consultation.routes";
import settingsRoutes from "./routes/settings.routes";
import reportRoutes from "./routes/report.routes";

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Dental Appointment API is running",
  });
});

// Routes
app.use("/api/users", usersRouter);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/treatment", treatmentRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/consultation", consultationRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/report", reportRoutes);

// Error handler
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);

    res.status(err.status || err.statusCode || 500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  },
);

export default app;
