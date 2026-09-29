import { Router } from "express";
import usersRoutes from "./user/routes";
import appointmentRoutes from "./appointment/routes";
import doctorRoutes from "./doctor/routes";
import contactRoutes from "./contact/routes";
import treatmentRoutes from "./treatment/routes";

const apiRouter = Router();

apiRouter.use("/auth", usersRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/appointment", appointmentRoutes);
apiRouter.use("/doctor", doctorRoutes);
apiRouter.use("/contact", contactRoutes);
apiRouter.use("/treatment", treatmentRoutes);
apiRouter.use("/treatments", treatmentRoutes);

export default apiRouter;
