import { Router } from "express";
import {
  cancelAppointment,
  createAppointment,
  getAllAppointment,
  getPatientAppointments,
  updateAppointment,
  deleteAppointment,
  sendAppointmentReminder,
  triggerAutomatedReminders,
  getReminderSettings,
  updateReminderSettings,
  startAppointmentConsultation,
  completeAppointmentConsultation,
} from "../controllers/appointmentController";
import { upload } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();

router.get("/reminder-settings", getReminderSettings);
router.post("/reminder-settings", updateReminderSettings);
router.patch("/reminder-settings", updateReminderSettings);

router.get("/get-all-appointment", getAllAppointment);
router.get(["/get-appointments", "/patient-appointments"], getPatientAppointments);
router.get("/", getAllAppointment);
router.post(
  "/create-appointment",
  upload.single("supportingDocument"),
  createAppointment,
);
router.patch("/update-appointment/:id", updateAppointment);
router.put("/update-appointment/:id", updateAppointment);
router.patch("/cancel-appointment/:id", cancelAppointment);
router.put("/cancel-appointment/:id", cancelAppointment);
router.post(
  ["/:id/start-consultation", "/start-consultation/:id"],
  authenticate,
  requireRole("admin", "doctor"),
  startAppointmentConsultation,
);
router.post(
  ["/:id/complete-consultation", "/complete-consultation/:id"],
  authenticate,
  requireRole("admin", "doctor"),
  completeAppointmentConsultation,
);
router.post("/send-reminder/:id", sendAppointmentReminder);
router.post("/trigger-reminders", triggerAutomatedReminders);
router.delete(["/delete-appointment/:id", "/:id"], deleteAppointment);

export default router;
