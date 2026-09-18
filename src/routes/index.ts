import { Router } from "express";
import usersRoutes from "./user/routes";
import appointmentRoutes from "./appointment/routes";

const apiRouter = Router();

apiRouter.use("/auth", usersRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/appointment", appointmentRoutes);

export default apiRouter;
