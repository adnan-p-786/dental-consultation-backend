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

router.get(
  "/",
  authenticate,
  requireRole("admin"),
  getSettings
);

router.put(
  "/",
  authenticate,
  requireRole("admin"),
  updateSettings
);


/*
|--------------------------------------------------------------------------
| Treatments
|--------------------------------------------------------------------------
*/

router.get(
  "/treatments",
  authenticate,
  requireRole("admin"),
  getTreatments
);

router.post(
  "/treatments",
  authenticate,
  requireRole("admin"),
  createTreatment
);

router.put(
  "/treatments/:id",
  authenticate,
  requireRole("admin"),
  updateTreatment
);

router.delete(
  "/treatments/:id",
  authenticate,
  requireRole("admin"),
  deleteTreatment
);


/*
|--------------------------------------------------------------------------
| Appointment Statuses
|--------------------------------------------------------------------------
*/

router.get(
  "/statuses",
  authenticate,
  requireRole("admin"),
  getStatuses
);

router.post(
  "/statuses",
  authenticate,
  requireRole("admin"),
  createStatus
);

router.put(
  "/statuses/:id",
  authenticate,
  requireRole("admin"),
  updateStatus
);

router.delete(
  "/statuses/:id",
  authenticate,
  requireRole("admin"),
  deleteStatus
);


/*
|--------------------------------------------------------------------------
| Consultation Types
|--------------------------------------------------------------------------
*/

router.get(
  "/consultation-types",
  authenticate,
  requireRole("admin"),
  getConsultationTypes
);

router.post(
  "/consultation-types",
  authenticate,
  requireRole("admin"),
  createConsultationType
);

router.put(
  "/consultation-types/:id",
  authenticate,
  requireRole("admin"),
  updateConsultationType
);

router.delete(
  "/consultation-types/:id",
  authenticate,
  requireRole("admin"),
  deleteConsultationType
);


/*
|--------------------------------------------------------------------------
| Working Hours
|--------------------------------------------------------------------------
*/

router.get(
  "/working-hours",
  authenticate,
  requireRole("admin"),
  getWorkingHours
);

router.put(
  "/working-hours",
  authenticate,
  requireRole("admin"),
  updateWorkingHours
);


/*
|--------------------------------------------------------------------------
| Reminders
|--------------------------------------------------------------------------
*/

router.get(
  "/reminders",
  authenticate,
  requireRole("admin"),
  getReminders
);

router.post(
  "/reminders",
  authenticate,
  requireRole("admin"),
  createReminder
);

router.put(
  "/reminders/:id",
  authenticate,
  requireRole("admin"),
  updateReminder
);

router.delete(
  "/reminders/:id",
  authenticate,
  requireRole("admin"),
  deleteReminder
);


/*
|--------------------------------------------------------------------------
| Email Templates
|--------------------------------------------------------------------------
*/

router.get(
  "/email-templates",
  authenticate,
  requireRole("admin"),
  getEmailTemplates
);

router.put(
  "/email-templates/:id",
  authenticate,
  requireRole("admin"),
  updateEmailTemplate
);

export default router;