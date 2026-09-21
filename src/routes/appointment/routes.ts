import { Router } from "express";
import {
  cancelAppointment,
  createAppointment,
  getAllAppointment,
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
  ["/cancel-appointment/:id", "/update-appointment/:id"],
  cancelAppointment
);
router.put(
  ["/cancel-appointment/:id", "/update-appointment/:id"],
  cancelAppointment
);

export default router;
