import { Router } from "express";
import healthRoutes from "./health.routes";
import usersRoutes from "./users.routes";
import treatmentsRoutes from "./treatments.routes";

const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/auth", usersRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/settings", treatmentsRoutes);

export default apiRouter;
