import { Router } from "express";
import {
  createAdminUser,
  createFirstAdmin,
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
router.post("/register", registerUser);
router.post("/login", loginUser);

// User profile & doctors
router.get("/doctors", getDoctors);
router.get("/user", authenticate, getUser);
router.get("/me", authenticate, getUser);

// Admin-only management routes
router.post("/create", authenticate, requireRole("admin"), createAdminUser);
router.post(
  "/admin/create",
  authenticate,
  requireRole("admin"),
  createAdminUser,
);
router.get("/get-users", authenticate, requireRole("admin"), getAllUsers);
router.get("/:id", authenticate, requireRole("admin"), getUserById);

export default router;
