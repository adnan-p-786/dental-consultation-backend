import { Router } from "express";
import {
  createAdminUser,
  createFirstAdmin,
  createSuperAdmin,
  getAllUsers,
  getDoctors,
  getUser,
  getUserById,
  loginUser,
  registerUser,
  getPatientProfile,
  updatePatientProfile,
  getAllPatients,
  deletePatient,
} from "../controllers/userConrtoller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();

// Public auth & registration
router.post("/create-first-admin", createFirstAdmin);
router.post("/create-superadmin", createSuperAdmin);
router.post("/register", registerUser);
router.post("/login", loginUser);

// User profile & doctors
router.get("/doctors", getDoctors);
router.get("/user", authenticate, getUser);
router.get("/me", authenticate, getUser);

// Patient profile endpoints
router.get("/patient-profile", authenticate, getPatientProfile);
router.put("/patient-profile", authenticate, updatePatientProfile);
router.patch("/patient-profile", authenticate, updatePatientProfile);

// Patient management routes (admin & superadmin)
router.get(
  "/patients",
  authenticate,
  requireRole("superadmin", "admin"),
  getAllPatients,
);
router.delete(
  "/patients/:id",
  authenticate,
  requireRole("superadmin", "admin"),
  deletePatient,
);

// Superadmin-only management routes
router.post(
  "/create",
  authenticate,
  requireRole("superadmin"),
  createAdminUser,
);
router.post(
  "/admin/create",
  authenticate,
  requireRole("superadmin"),
  createAdminUser,
);
router.get(
  "/get-users",
  authenticate,
  requireRole("superadmin", "admin"),
  getAllUsers,
);
router.get(
  "/:id",
  authenticate,
  requireRole("superadmin", "admin"),
  getUserById,
);

export default router;
