import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { UserRole } from "../utils/auth";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    const userRole = (req.user.role || "").toLowerCase() as UserRole;
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase() as UserRole);

    const hasPermission =
      normalizedAllowed.includes(userRole) ||
      (userRole === "superadmin" && normalizedAllowed.includes("admin"));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: "Access denied",
      });
      return;
    }

    next();
  };
};