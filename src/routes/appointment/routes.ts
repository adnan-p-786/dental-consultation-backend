import { Router } from "express";
import {
  cancelAppointment,
  createAppointment,
  getAllAppointment,
  updateAppointment,
  deleteAppointment,
} from "../../controllers/appointmentControl";
import { upload } from "../../middleware/upload";

const router = Router();

router.get(
  ["/get-all-appointment", "/get-appointments", "/patient-appointments", "/"],
  getAllAppointment
);
router.post(
  "/create-appointment",
  upload.single("supportingDocument"),
  createAppointment
);
router.patch(
  "/update-appointment/:id",
  updateAppointment
);
router.put(
  "/update-appointment/:id",
  updateAppointment
);
router.patch(
  "/cancel-appointment/:id",
  cancelAppointment
);
router.put(
  "/cancel-appointment/:id",
  cancelAppointment
);
router.delete(
  ["/delete-appointment/:id", "/:id"],
  deleteAppointment
);

export default router;
