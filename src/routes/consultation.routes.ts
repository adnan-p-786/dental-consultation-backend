import { Router } from "express";
import {
  createConsultation,
  getConsultationById,
  updateConsultation,
  getDoctorMyConsultations,
  getConsultationByAppointmentId,
} from "../controllers/consultationController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();

// Require authentication for all consultation routes
router.use(authenticate);

// Doctor's consultation list
router.get("/me", requireRole("doctor", "admin", "superadmin"), getDoctorMyConsultations);

// Consultation detail lookup (accessible by doctor, admin, or patient owner)
router.get("/appointment/:appointmentId", getConsultationByAppointmentId);
router.get("/:id", getConsultationById);

// Doctor & Admin consultation CRUD
router.post("/", requireRole("doctor", "admin", "superadmin"), createConsultation);
router.put("/:id", requireRole("doctor", "admin", "superadmin"), updateConsultation);

export default router;
