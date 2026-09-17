import { Router, Request, Response, NextFunction } from "express";
import { db } from "../config/db";
import { users } from "../db/schema/user";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Reusable user select columns (excludes password)
const userSafeFields = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phoneNumber: users.phoneNumber,
  role: users.role,
  createdAt: users.createdAt,
};

// GET current authenticated user profile
router.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const [user] = await db
      .select(userSafeFields)
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// GET all users (excludes passwords)
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const allUsers = await db.select(userSafeFields).from(users);
    res.json({
      success: true,
      data: allUsers,
    });
  } catch (error) {
    next(error);
  }
});

// GET user by ID (excludes password)
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Invalid user ID" });
      return;
    }

    const [user] = await db.select(userSafeFields).from(users).where(eq(users.id, id));
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Register handler (used for both POST / and POST /register)
const handleRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, role } = req.body;

    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      res.status(400).json({
        success: false,
        error: "First name, last name, email, phone number and password are required",
      });
      return;
    }

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(password);

    // Validate role against enum values
    const validRoles = ["patient", "doctor", "admin"] as const;
    const assignedRole = validRoles.includes(role) ? role : "patient";

    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        phoneNumber,
        password: hashedPassword,
        role: assignedRole,
      })
      .returning(userSafeFields);

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      data: newUser,
    });
  } catch (error: any) {
    if (error.code === "23505") {
      res.status(409).json({
        success: false,
        error: "Email already exists",
      });
      return;
    }
    next(error);
  }
};

// POST register user (accessible at both / and /register)
router.post("/", handleRegister);
router.post("/register", handleRegister);

// POST login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
      return;
    }

    // Find user by email (include password for verification)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
      return;
    }

    // Verify password against stored hash
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Exclude password from response
    const { password: _pwd, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Login successful",
      token,
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
