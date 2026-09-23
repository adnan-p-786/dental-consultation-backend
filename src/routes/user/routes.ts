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
} from "../../controllers/adminConrtol";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/role";

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

// Superadmin-only management routes
router.post("/create", authenticate, requireRole("superadmin"), createAdminUser);
router.post(
  "/admin/create",
  authenticate,
  requireRole("superadmin"),
  createAdminUser,
);
router.get("/get-users", authenticate, requireRole("superadmin", "admin"), getAllUsers);
router.get("/:id", authenticate, requireRole("superadmin", "admin"), getUserById);

export default router;
