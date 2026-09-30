import { Router } from "express";

import {
  getSettings,
  updateSettings,
  getReminderSettings,
  updateReminderSettings,
  getMeetingSettings,
  updateMeetingSettings,
} from "../controllers/settingsController";

import {authenticate} from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();

// --------------------------------------------------
// General settings
// --------------------------------------------------

router.get(
  "/",
  authenticate,
  requireRole("admin", "superadmin"),
  getSettings
);

router.put(
  "/",
  authenticate,
  requireRole("admin", "superadmin"),
  updateSettings
);

// --------------------------------------------------
// Reminder settings
// --------------------------------------------------

router.get(
  "/reminders",
  authenticate,
  requireRole("admin", "superadmin"),
  getReminderSettings
);

router.put(
  "/reminders",
  authenticate,
  requireRole("admin", "superadmin"),
  updateReminderSettings
);

// --------------------------------------------------
// Meeting settings
// --------------------------------------------------

router.get(
  "/meeting",
  authenticate,
  requireRole("admin", "superadmin"),
  getMeetingSettings
);

router.put(
  "/meeting",
  authenticate,
  requireRole("admin", "superadmin"),
  updateMeetingSettings
);

export default router;