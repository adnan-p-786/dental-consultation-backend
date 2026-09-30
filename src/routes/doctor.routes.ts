import { Router } from "express";
import {
  addDoctor,
  deleteDoctor,
  getAllDoctors,
  updateDoctor,
  updateDoctorStatus,
  loginDoctor,
} from "../controllers/doctorController";
import { uploadDoctorPhoto } from "../middleware/doctorUpload";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { getDoctorMyConsultations } from "../controllers/consultationController";

const router = Router();

router.get("/me/consultations", authenticate, requireRole("doctor"), getDoctorMyConsultations);
router.get(["/get-doctors", "/"], getAllDoctors);
router.post(["/add-doctor", "/"], uploadDoctorPhoto, addDoctor);
router.post("/login", loginDoctor);
router.delete(["/delete-doctor/:id", "/:id"], deleteDoctor);
router.put(["/update-doctor/:id", "/:id"], uploadDoctorPhoto, updateDoctor);
router.patch(["/update-status/:id", "/:id/status"], updateDoctorStatus);

export default router;
