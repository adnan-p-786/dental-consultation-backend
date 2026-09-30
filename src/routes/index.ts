import { Router } from "express";
import usersRoutes from "./user.routes";
import appointmentRoutes from "./appointment.routes";
import doctorRoutes from "./doctor.routes";
import treatmentRoutes from "./treatment.routes";
import consultationRoutes from "./consultation.routes";
import settingsRoutes from "./settings.routes";
import reportRoutes from "./report.routes";

const apiRouter = Router();

apiRouter.use("/auth", usersRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/appointment", appointmentRoutes);
apiRouter.use("/appointments", appointmentRoutes);
apiRouter.use("/doctor", doctorRoutes);
apiRouter.use("/doctors", doctorRoutes);
apiRouter.use("/treatment", treatmentRoutes);
apiRouter.use("/treatments", treatmentRoutes);
apiRouter.use("/consultation", consultationRoutes);
apiRouter.use("/consultations", consultationRoutes);
apiRouter.use("/settings", settingsRoutes);
apiRouter.use("/reports", reportRoutes);
apiRouter.use("/report", reportRoutes);

export default apiRouter;
