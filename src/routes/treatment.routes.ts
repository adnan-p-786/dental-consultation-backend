import { Router } from "express";
import {
  getAllTreatments,
  getActiveTreatments,
  getTreatmentById,
  addTreatment,
  updateTreatment,
  toggleTreatmentStatus,
  deleteTreatment,
} from "../controllers/treatmentController";

const router = Router();

// GET all treatments (optional ?active=true)
router.get(["/get-treatments", "/"], getAllTreatments);

// GET active treatments only
router.get(["/active", "/get-active"], getActiveTreatments);

// GET treatment by ID
router.get(["/get-treatment/:id", "/:id"], getTreatmentById);

// POST create new treatment
router.post(["/add-treatment", "/create-treatment", "/"], addTreatment);

// PUT update treatment
router.put(["/update-treatment/:id", "/:id"], updateTreatment);

// PATCH toggle active status
router.patch(
  ["/toggle-status/:id", "/update-status/:id", "/:id/status"],
  toggleTreatmentStatus,
);

// DELETE treatment
router.delete(["/delete-treatment/:id", "/:id"], deleteTreatment);

export default router;
