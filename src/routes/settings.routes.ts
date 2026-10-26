import { Router } from "express";

import {
  getSettings,
  updateSettings,
  getTreatments,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  getStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  getConsultationTypes,
  createConsultationType,
  updateConsultationType,
  deleteConsultationType,
  getWorkingHours,
  updateWorkingHours,
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getEmailTemplates,
  updateEmailTemplate,
} from "../controllers/settingsController";

import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();

/*
|--------------------------------------------------------------------------
| General Settings
|--------------------------------------------------------------------------
*/

router.get("/", authenticate, requireRole("superadmin"), getSettings);

router.put("/", authenticate, requireRole("superadmin"), updateSettings);

/*
|--------------------------------------------------------------------------
| Treatments
|--------------------------------------------------------------------------
*/

router.get("/treatments", authenticate, requireRole("superadmin"), getTreatments);

router.post("/treatments", authenticate, requireRole("superadmin"), createTreatment);

router.put(
  "/treatments/:id",
  authenticate,
  requireRole("superadmin"),
  updateTreatment,
);

router.delete(
  "/treatments/:id",
  authenticate,
  requireRole("superadmin"),
  deleteTreatment,
);

/*
|--------------------------------------------------------------------------
| Appointment Statuses
|--------------------------------------------------------------------------
*/

router.get("/statuses", authenticate, requireRole("superadmin"), getStatuses);

router.post("/statuses", authenticate, requireRole("superadmin"), createStatus);

router.put("/statuses/:id", authenticate, requireRole("superadmin"), updateStatus);

router.delete(
  "/statuses/:id",
  authenticate,
  requireRole("superadmin"),
  deleteStatus,
);

/*
|--------------------------------------------------------------------------
| Consultation Types
|--------------------------------------------------------------------------
*/

router.get(
  "/consultation-types",
  authenticate,
  requireRole("superadmin"),
  getConsultationTypes,
);

router.post(
  "/consultation-types",
  authenticate,
  requireRole("superadmin"),
  createConsultationType,
);

router.put(
  "/consultation-types/:id",
  authenticate,
  requireRole("superadmin"),
  updateConsultationType,
);

router.delete(
  "/consultation-types/:id",
  authenticate,
  requireRole("superadmin"),
  deleteConsultationType,
);

/*
|--------------------------------------------------------------------------
| Working Hours
|--------------------------------------------------------------------------
*/

router.get(
  "/working-hours",
  authenticate,
  requireRole("superadmin"),
  getWorkingHours,
);

router.put(
  "/working-hours",
  authenticate,
  requireRole("superadmin"),
  updateWorkingHours,
);

/*
|--------------------------------------------------------------------------
| Reminders
|--------------------------------------------------------------------------
*/

router.get("/reminders", authenticate, requireRole("superadmin"), getReminders);

router.post("/reminders", authenticate, requireRole("superadmin"), createReminder);

router.put(
  "/reminders/:id",
  authenticate,
  requireRole("superadmin"),
  updateReminder,
);

router.delete(
  "/reminders/:id",
  authenticate,
  requireRole("superadmin"),
  deleteReminder,
);

/*
|--------------------------------------------------------------------------
| Email Templates
|--------------------------------------------------------------------------
*/

router.get(
  "/email-templates",
  authenticate,
  requireRole("superadmin"),
  getEmailTemplates,
);

router.put(
  "/email-templates/:id",
  authenticate,
  requireRole("superadmin"),
  updateEmailTemplate,
);

export default router;
