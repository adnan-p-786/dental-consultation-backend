import { Router, Request, Response, NextFunction } from "express";

import { db } from "../config/db";
import { users } from "../db/schema/user";
import { doctor } from "../db/schema/doctor";
import { patientProfile } from "../db/schema/patient";
import { consultations } from "../db/schema/consultation";

import { eq, desc } from "drizzle-orm";

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

    let profile: any = null;
    if (user.role === "patient") {
      const [p] = await db
        .select()
        .from(patientProfile)
        .where(eq(patientProfile.userId, user.id));
      profile = p || null;
    }

    res.json({
      success: true,
      data: {
        ...user,
        ...(profile
          ? {
              age: profile.age,
              gender: profile.gender,
              address: profile.address,
              profile,
            }
          : {}),
      },
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
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      age,
      gender,
      address,
    } = req.body;

    // Required fields (all compulsory)
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !password ||
      age === undefined ||
      age === null ||
      age === "" ||
      !gender ||
      !address
    ) {
      res.status(400).json({
        success: false,
        error:
          "First name, last name, email, phone number, password, age, gender, and residential address are compulsory",
      });
      return;
    }

    const numAge = Number(age);
    if (isNaN(numAge) || numAge <= 0 || numAge > 120) {
      res.status(400).json({
        success: false,
        error: "Please provide a valid age between 1 and 120",
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

    // Automatically initialize linked patientProfile record
    let createdProfile: any = null;
    try {
      const [cp] = await db
        .insert(patientProfile)
        .values({
          userId: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          password: hashedPassword,
          age: numAge,
          gender: String(gender).trim(),
          address: String(address).trim(),
        })
        .returning();
      createdProfile = cp;
    } catch (profileErr) {
      console.error("Failed to initialize patientProfile row:", profileErr);
    }

    // Generate token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    const safeProfile = createdProfile
      ? (({ password: _, ...p }) => p)(createdProfile)
      : undefined;

    res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      token,
      data: {
        ...newUser,
        age: createdProfile?.age ?? (req.body.age ? Number(req.body.age) : null),
        gender: createdProfile?.gender ?? req.body.gender ?? null,
        address: createdProfile?.address ?? req.body.address ?? null,
        profile: safeProfile,
      },
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

// --------------------------------------------------
// GET PATIENT PROFILE
// GET /api/users/patient-profile
// --------------------------------------------------
export const getPatientProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    let [profile] = await db
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, req.user.id));

    // If profile does not exist yet for this user, auto-create one from users table
    if (!profile) {
      const [u] = await db.select().from(users).where(eq(users.id, req.user.id));
      if (u) {
        const [created] = await db
          .insert(patientProfile)
          .values({
            userId: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            phoneNumber: u.phoneNumber,
            password: u.password,
            age: 0,
            gender: "unspecified",
            address: "",
          })
          .returning();
        profile = created;
      }
    }

    if (!profile) {
      res.status(404).json({ success: false, error: "Profile not found" });
      return;
    }

    // Do not return password
    const { password: _p, ...profileSafe } = profile;

    res.json({
      success: true,
      data: profileSafe,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// UPDATE PATIENT PROFILE
// PUT/PATCH /api/users/patient-profile
// --------------------------------------------------
export const updatePatientProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const { firstName, lastName, phoneNumber, age, gender, address } = req.body;

    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (firstName !== undefined) updateFields.firstName = String(firstName).trim();
    if (lastName !== undefined) updateFields.lastName = String(lastName).trim();
    if (phoneNumber !== undefined) updateFields.phoneNumber = String(phoneNumber).trim();
    if (age !== undefined) updateFields.age = age === "" || age === null ? null : Number(age);
    if (gender !== undefined) updateFields.gender = String(gender).trim();
    if (address !== undefined) updateFields.address = String(address).trim();

    // Check if profile exists
    const [existing] = await db
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, req.user.id));

    let result;
    if (existing) {
      const [updated] = await db
        .update(patientProfile)
        .set(updateFields)
        .where(eq(patientProfile.userId, req.user.id))
        .returning();
      result = updated;
    } else {
      const [u] = await db.select().from(users).where(eq(users.id, req.user.id));
      const [created] = await db
        .insert(patientProfile)
        .values({
          userId: req.user.id,
          firstName: firstName || u?.firstName || "",
          lastName: lastName || u?.lastName || "",
          email: u?.email || "",
          phoneNumber: phoneNumber || u?.phoneNumber || "",
          age: age ? Number(age) : 0,
          gender: gender || "unspecified",
          address: address || "",
        })
        .returning();
      result = created;
    }

    // Also sync firstName, lastName, phoneNumber to the users table
    const userUpdates: Record<string, any> = {};
    if (firstName !== undefined) userUpdates.firstName = String(firstName).trim();
    if (lastName !== undefined) userUpdates.lastName = String(lastName).trim();
    if (phoneNumber !== undefined) userUpdates.phoneNumber = String(phoneNumber).trim();

    if (Object.keys(userUpdates).length > 0) {
      await db.update(users).set(userUpdates).where(eq(users.id, req.user.id));
    }

    const { password: _p, ...resultSafe } = result;

    res.json({
      success: true,
      message: "Patient profile updated successfully",
      data: resultSafe,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET ALL PATIENTS (ADMIN & SUPERADMIN)
// GET /api/users/patients
// --------------------------------------------------
export const getAllPatients = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const patientList = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        createdAt: users.createdAt,
        age: patientProfile.age,
        gender: patientProfile.gender,
        address: patientProfile.address,
      })
      .from(users)
      .leftJoin(patientProfile, eq(users.id, patientProfile.userId))
      .where(eq(users.role, "patient"))
      .orderBy(desc(users.createdAt));

    res.json({
      success: true,
      data: patientList,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// DELETE PATIENT (ADMIN & SUPERADMIN)
// DELETE /api/users/patients/:id
// --------------------------------------------------
export const deletePatient = async (
  req: AuthenticatedRequest,
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
        error: "Invalid patient ID",
      });
      return;
    }

    // Verify user exists and is a patient
    const [patientUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id));

    if (!patientUser) {
      res.status(404).json({
        success: false,
        error: "Patient not found",
      });
      return;
    }

    if (patientUser.role !== "patient") {
      res.status(403).json({
        success: false,
        error: "Only patient accounts can be deleted via this endpoint",
      });
      return;
    }

    // Decouple patient from consultations so historical consultations remain intact
    await db
      .update(consultations)
      .set({ patientId: null })
      .where(eq(consultations.patientId, id));

    // Delete patient profile explicitly
    await db.delete(patientProfile).where(eq(patientProfile.userId, id));

    // Delete user from users table
    await db.delete(users).where(eq(users.id, id));

    res.json({
      success: true,
      message: "Patient record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

