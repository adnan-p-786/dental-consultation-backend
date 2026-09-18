import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { UserRole } from "../utils/auth";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied",
      });
      return;
    }

    next();
  };
};