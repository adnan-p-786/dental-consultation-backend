"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../../config/db");
const user_1 = require("../../db/schema/user/user");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../../utils/auth");
const auth_2 = require("../../middleware/auth");
const role_1 = require("../../middleware/role");
const router = (0, express_1.Router)();
// --------------------------------------------------
// SAFE USER FIELDS
// Password is never returned
// --------------------------------------------------
const userSafeFields = {
    id: user_1.users.id,
    firstName: user_1.users.firstName,
    lastName: user_1.users.lastName,
    email: user_1.users.email,
    phoneNumber: user_1.users.phoneNumber,
    role: user_1.users.role,
    createdAt: user_1.users.createdAt,
};
router.post("/create-first-admin", async (req, res, next) => {
    try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;
        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!firstName || !lastName || !email || !phoneNumber || !password) {
            res.status(400).json({
                success: false,
                error: "All fields are required",
            });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({
                success: false,
                error: "Password must be at least 8 characters",
            });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            res.status(400).json({
                success: false,
                error: "Invalid email address",
            });
            return;
        }
        // -----------------------------
        // CHECK IF ADMIN ALREADY EXISTS
        // -----------------------------
        const [existingAdmin] = await db_1.db
            .select({ id: user_1.users.id })
            .from(user_1.users)
            .where((0, drizzle_orm_1.eq)(user_1.users.role, "admin"))
            .limit(1);
        if (existingAdmin) {
            res.status(403).json({
                success: false,
                error: "An admin already exists",
            });
            return;
        }
        // -----------------------------
        // CREATE FIRST ADMIN
        // -----------------------------
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        const [admin] = await db_1.db
            .insert(user_1.users)
            .values({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phoneNumber,
            password: hashedPassword,
            role: "admin",
        })
            .returning(userSafeFields);
        const token = (0, auth_1.generateToken)({
            id: admin.id,
            email: admin.email,
            role: admin.role,
        });
        res.status(201).json({
            success: true,
            message: "First admin created successfully",
            token,
            data: admin,
        });
    }
    catch (error) {
        next(error);
    }
});
// --------------------------------------------------
// GET CURRENT USER
// GET /api/users/me
// Any logged-in user
// --------------------------------------------------
router.get("/me", auth_2.authenticate, async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
            return;
        }
        const [user] = await db_1.db
            .select(userSafeFields)
            .from(user_1.users)
            .where((0, drizzle_orm_1.eq)(user_1.users.id, req.user.id));
        if (!user) {
            res.status(404).json({
                success: false,
                error: "User not found",
            });
            return;
        }
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
});
// --------------------------------------------------
// GET ALL USERS
// GET /api/users
// ADMIN ONLY
// --------------------------------------------------
router.get("/get-users", auth_2.authenticate, (0, role_1.requireRole)("admin"), async (_req, res, next) => {
    try {
        const allUsers = await db_1.db.select(userSafeFields).from(user_1.users);
        res.json({
            success: true,
            data: allUsers,
        });
    }
    catch (error) {
        next(error);
    }
});
// --------------------------------------------------
// GET ALL DOCTORS
// GET /api/users/doctors
// Public / Clinic staff route
// --------------------------------------------------
router.get("/doctors", async (_req, res, next) => {
    try {
        const doctorUsers = await db_1.db
            .select(userSafeFields)
            .from(user_1.users)
            .where((0, drizzle_orm_1.eq)(user_1.users.role, "doctor"));
        res.json({
            success: true,
            data: doctorUsers,
        });
    }
    catch (error) {
        next(error);
    }
});
// --------------------------------------------------
// GET USER BY ID
// GET /api/users/:id
// ADMIN ONLY
// --------------------------------------------------
router.get("/:id", auth_2.authenticate, (0, role_1.requireRole)("admin"), async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const id = parseInt(rawId, 10);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: "Invalid user ID",
            });
            return;
        }
        const [user] = await db_1.db
            .select(userSafeFields)
            .from(user_1.users)
            .where((0, drizzle_orm_1.eq)(user_1.users.id, id));
        if (!user) {
            res.status(404).json({
                success: false,
                error: "User not found",
            });
            return;
        }
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
});
// --------------------------------------------------
// PUBLIC REGISTER
// POST /api/users/register
//
// IMPORTANT:
// Public registration can ONLY create patients.
// --------------------------------------------------
router.post("/register", async (req, res, next) => {
    try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;
        // Required fields
        if (!firstName || !lastName || !email || !phoneNumber || !password) {
            res.status(400).json({
                success: false,
                error: "First name, last name, email, phone number and password are required",
            });
            return;
        }
        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            res.status(400).json({
                success: false,
                error: "Invalid email address",
            });
            return;
        }
        // Validate phone
        if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
            res.status(400).json({
                success: false,
                error: "Invalid phone number",
            });
            return;
        }
        // Password validation
        if (password.length < 8) {
            res.status(400).json({
                success: false,
                error: "Password must contain at least 8 characters",
            });
            return;
        }
        // Check existing email
        const [existingUser] = await db_1.db
            .select({ id: user_1.users.id })
            .from(user_1.users)
            .where((0, drizzle_orm_1.eq)(user_1.users.email, normalizedEmail));
        if (existingUser) {
            res.status(409).json({
                success: false,
                error: "Email already exists",
            });
            return;
        }
        // Hash password
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        // Public registration = patient
        const [newUser] = await db_1.db
            .insert(user_1.users)
            .values({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phoneNumber,
            password: hashedPassword,
            role: "patient",
        })
            .returning(userSafeFields);
        // Generate token
        const token = (0, auth_1.generateToken)({
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
        });
        res.status(201).json({
            success: true,
            message: "Patient registered successfully",
            token,
            data: newUser,
        });
    }
    catch (error) {
        next(error);
    }
});
// --------------------------------------------------
// ADMIN CREATE USER
// POST /api/users/admin/create
//
// ADMIN ONLY
// Can create doctor/admin/patient
// --------------------------------------------------
router.post("/admin/create", auth_2.authenticate, (0, role_1.requireRole)("admin"), async (req, res, next) => {
    try {
        const { firstName, lastName, email, phoneNumber, password, role } = req.body;
        if (!firstName ||
            !lastName ||
            !email ||
            !phoneNumber ||
            !password ||
            !role) {
            res.status(400).json({
                success: false,
                error: "All fields are required",
            });
            return;
        }
        const validRoles = ["patient", "doctor", "admin"];
        if (!validRoles.includes(role)) {
            res.status(400).json({
                success: false,
                error: "Invalid role",
            });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const [existingUser] = await db_1.db
            .select({ id: user_1.users.id })
            .from(user_1.users)
            .where((0, drizzle_orm_1.eq)(user_1.users.email, normalizedEmail));
        if (existingUser) {
            res.status(409).json({
                success: false,
                error: "Email already exists",
            });
            return;
        }
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        const [newUser] = await db_1.db
            .insert(user_1.users)
            .values({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phoneNumber,
            password: hashedPassword,
            role,
        })
            .returning(userSafeFields);
        res.status(201).json({
            success: true,
            message: `${role} created successfully`,
            data: newUser,
        });
    }
    catch (error) {
        next(error);
    }
});
// --------------------------------------------------
// LOGIN
// POST /api/users/login
// --------------------------------------------------
router.post("/login", async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            res.status(400).json({
                success: false,
                error: "Email, password, and role are required",
            });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        // Find user
        const [user] = await db_1.db
            .select()
            .from(user_1.users)
            .where((0, drizzle_orm_1.eq)(user_1.users.email, normalizedEmail));
        if (!user) {
            res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
            return;
        }
        // Compare password
        const isPasswordValid = await (0, auth_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
            return;
        }
        // Check role mismatch
        if (role && user.role.toLowerCase() !== role.toLowerCase()) {
            const capitalizedRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            res.status(403).json({
                success: false,
                error: `This account is registered as a ${capitalizedRole}. Please select the ${capitalizedRole} tab to log in.`,
            });
            return;
        }
        // Generate token
        const token = (0, auth_1.generateToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        // Remove password
        const { password: _password, ...userWithoutPassword } = user;
        res.json({
            success: true,
            message: "Login successful",
            token,
            data: userWithoutPassword,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
