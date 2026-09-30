import { Router } from "express";
import {
  getAnalyticsReport,
  exportReport,
  saveReportSnapshot,
  getAllSavedReports,
  getSavedReportById,
  deleteSavedReport,
} from "../controllers/reportController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();

// As per PDF Section 12: Super Admin / Admin access
router.get(
  "/analytics",
  authenticate,
  requireRole("admin", "superadmin"),
  getAnalyticsReport
);

router.get(
  "/summary",
  authenticate,
  requireRole("admin", "superadmin"),
  getAnalyticsReport
);

router.get(
  "/export",
  authenticate,
  requireRole("admin", "superadmin"),
  exportReport
);

router.post(
  ["/generate", "/save", "/"],
  authenticate,
  requireRole("admin", "superadmin"),
  saveReportSnapshot
);

router.get(
  "/",
  authenticate,
  requireRole("admin", "superadmin"),
  getAllSavedReports
);

router.get(
  "/:id",
  authenticate,
  requireRole("admin", "superadmin"),
  getSavedReportById
);

router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "superadmin"),
  deleteSavedReport
);

export default router;
