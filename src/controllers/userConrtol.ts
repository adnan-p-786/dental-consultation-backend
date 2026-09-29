import { Router, Request, Response, NextFunction } from "express";

import { db } from "../config/db";
import { users } from "../db/schema/user";
import { doctor } from "../db/schema/doctor";

import { eq } from "drizzle-orm";

import {
  hashPassword,
  comparePassword,
  generateToken,
  UserRole,
} from "../utils/auth";

import { authenticate, AuthenticatedRequest } from "../middleware/auth";

import { requireRole } from "../middleware/role";
import { error } from "console";

const router = Router();

// --------------------------------------------------
// SAFE USER FIELDS
// Password is never returned
// --------------------------------------------------

const userSafeFields = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phoneNumber: users.phoneNumber,
  role: users.role,
  createdAt: users.createdAt,
};

export const createFirstAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

    const [existingAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (existingAdmin) {
      res.status(403).json({
        success: false,
        error: "Admin already exists",
      });
      return;
    }

    // -----------------------------
    // CREATE FIRST SUPERADMIN
    // -----------------------------

    const hashedPassword = await hashPassword(password);

    const [admin] = await db
      .insert(users)
      .values({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phoneNumber,
        password: hashedPassword,
        role: "admin",
      })
      .returning(userSafeFields);

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      token,
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

export const createSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

    const [existingAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "superadmin"))
      .limit(1);

    if (existingAdmin) {
      res.status(403).json({
        success: false,
        error: "A superadmin already exists",
      });
      return;
    }

    // -----------------------------
    // CREATE FIRST SUPERADMIN
    // -----------------------------

    const hashedPassword = await hashPassword(password);

    const [superadmin] = await db
      .insert(users)
      .values({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phoneNumber,
        password: hashedPassword,
        role: "superadmin",
      })
      .returning(userSafeFields);

    const token = generateToken({
      id: superadmin.id,
      email: superadmin.email,
      role: superadmin.role,
    });

    res.status(201).json({
      success: true,
      message: "Superadmin created successfully",
      token,
      data: superadmin,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET CURRENT USER
// GET /api/users/me
// Any logged-in user
// --------------------------------------------------

export const getUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    const [user] = await db
      .select(userSafeFields)
      .from(users)
      .where(eq(users.id, req.user.id));

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
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET ALL USERS
// GET /api/users
// ADMIN ONLY
// --------------------------------------------------

export const getAllUsers = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const allUsers = await db.select(userSafeFields).from(users);

    res.json({
      success: true,
      data: allUsers,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET ALL DOCTORS
// GET /api/users/doctors
// Public / Clinic staff route
// --------------------------------------------------

export const getDoctors = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctorUsers = await db
      .select(userSafeFields)
      .from(users)
      .where(eq(users.role, "doctor"));

    res.json({
      success: true,
      data: doctorUsers,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET USER BY ID
// GET /api/users/:id
// ADMIN ONLY
// --------------------------------------------------

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

    const [user] = await db
      .select(userSafeFields)
      .from(users)
      .where(eq(users.id, id));

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
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// PUBLIC REGISTER
// POST /api/users/register
//
// IMPORTANT:
// Public registration can ONLY create patients.
// --------------------------------------------------

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;

    // Required fields
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      res.status(400).json({
        success: false,
        error:
          "First name, last name, email, phone number and password are required",
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
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: "Email already exists",
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Public registration = patient
    const [newUser] = await db
      .insert(users)
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
    const token = generateToken({
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
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// ADMIN CREATE USER
// POST /api/users/admin/create
//
// ADMIN ONLY
// Can create doctor/admin/patient
// --------------------------------------------------

export const createAdminUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, role } =
      req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !password ||
      !role
    ) {
      res.status(400).json({
        success: false,
        error: "All fields are required",
      });
      return;
    }

    const validRoles: UserRole[] = ["patient", "doctor", "admin", "superadmin"];

    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: "Invalid role",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: "Email already exists",
      });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
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
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// LOGIN
// POST /api/users/login
// --------------------------------------------------

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check doctor table if role is doctor
    if (role && role.toLowerCase() === "doctor") {
      const [doc] = await db
        .select()
        .from(doctor)
        .where(eq(doctor.doctorEmail, normalizedEmail));

      if (doc) {
        let isPasswordValid = false;
        if (doc.doctorPassword) {
          try {
            isPasswordValid = await comparePassword(
              password,
              doc.doctorPassword,
            );
          } catch {
            // Not a bcrypt hash
          }
          if (!isPasswordValid) {
            isPasswordValid = password === doc.doctorPassword;
          }
        }

        if (!isPasswordValid) {
          res.status(401).json({
            success: false,
            error: "Invalid email or password",
          });
          return;
        }

        const token = generateToken({
          id: doc.id,
          email: doc.doctorEmail,
          role: "doctor",
        });

        const cleanName = doc.doctorName.replace(/^Dr\.\s*/i, "").trim();
        const nameParts = cleanName.split(" ");
        const firstName = nameParts[0] || doc.doctorName;
        const lastName = nameParts.slice(1).join(" ") || "";

        res.json({
          success: true,
          message: "Login successful",
          token,
          data: {
            id: doc.id,
            name: doc.doctorName,
            firstName,
            lastName,
            email: doc.doctorEmail,
            phoneNumber: doc.phoneNumber,
            role: "doctor",
            specialization: doc.specialization,
            workingHours: doc.workingHours,
            status: doc.status,
            avatar: doc.doctorPhoto,
            createdAt: doc.createdAt,
          },
        });
        return;
      }
    }

    // Find user in users table
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
      return;
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
      return;
    }

    // Check role mismatch
    if (role) {
      const requestedRole = role.toLowerCase();
      const userRole = user.role.toLowerCase();
      const isAdminTypeMatch =
        (requestedRole === "admin" || requestedRole === "superadmin") &&
        (userRole === "admin" || userRole === "superadmin");

      if (userRole !== requestedRole && !isAdminTypeMatch) {
        const capitalizedRole =
          user.role.charAt(0).toUpperCase() + user.role.slice(1);
        res.status(403).json({
          success: false,
          error: `Role mismatch: This account has the role "${capitalizedRole}", not "${role}".`,
        });
        return;
      }
    }

    // Generate token
    const token = generateToken({
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
  } catch (error) {
    next(error);
  }
};
