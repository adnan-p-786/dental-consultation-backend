import { Router } from "express";
import usersRoutes from "./user/routes";
import appointmentRoutes from "./appointment/routes";
import doctorRoutes from "./doctor/routes";
import contactRoutes from "./contact/routes";

const apiRouter = Router();

apiRouter.use("/auth", usersRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/appointment", appointmentRoutes);
apiRouter.use("/doctor", doctorRoutes);
apiRouter.use("/contact", contactRoutes);

export default apiRouter;
