import { Request, Response, NextFunction } from "express";
import { eq, desc, asc } from "drizzle-orm";
import db from "../db";
import { treatments } from "../db/schema/treatment";

// DELETE treatment
export const deleteTreatment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid treatment ID",
      });
    }

    const [deleted] = await db
      .delete(treatments)
      .where(eq(treatments.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Treatment not found",
      });
    }

    return res.json({
      success: true,
      message: "Treatment deleted successfully",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};


// GET all treatments (optional ?active=true filter)
export const getAllTreatments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { active } = req.query;

    let query = db.select().from(treatments);

    if (active === "true") {
      const activeTreatments = await db
        .select()
        .from(treatments)
        .where(eq(treatments.isActive, true))
        .orderBy(asc(treatments.name));

      return res.json({
        success: true,
        data: activeTreatments,
      });
    }

    const allTreatments = await query.orderBy(asc(treatments.id));

    return res.json({
      success: true,
      data: allTreatments,
    });
  } catch (error) {
    next(error);
  }
};

// GET active treatments only (for appointment booking dropdowns)
export const getActiveTreatments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const activeTreatments = await db
      .select()
      .from(treatments)
      .where(eq(treatments.isActive, true))
      .orderBy(asc(treatments.name));

    return res.json({
      success: true,
      data: activeTreatments,
    });
  } catch (error) {
    next(error);
  }
};

// GET treatment by ID
export const getTreatmentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid treatment ID",
      });
    }

    const [foundTreatment] = await db
      .select()
      .from(treatments)
      .where(eq(treatments.id, id));

    if (!foundTreatment) {
      return res.status(404).json({
        success: false,
        message: "Treatment not found",
      });
    }

    return res.json({
      success: true,
      data: foundTreatment,
    });
  } catch (error) {
    next(error);
  }
};

// POST add new treatment
export const addTreatment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, description, isActive } = req.body;

    const trimmedName = (name || "").trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Treatment name is required",
      });
    }

    if (trimmedName.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Treatment name must be 200 characters or fewer",
      });
    }

    // Check if a treatment with this name already exists
    const [existing] = await db
      .select()
      .from(treatments)
      .where(eq(treatments.name, trimmedName));

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Treatment "${trimmedName}" already exists`,
      });
    }

    const [newTreatment] = await db
      .insert(treatments)
      .values({
        name: trimmedName,
        description: description ? String(description).trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Treatment added successfully",
      data: newTreatment,
    });
  } catch (error: any) {
    // Unique violation PostgreSQL error code
    if (error?.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Treatment with this name already exists",
      });
    }
    next(error);
  }
};

// Alias createTreatment to addTreatment
export const createTreatment = addTreatment;

// PUT update treatment
export const updateTreatment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid treatment ID",
      });
    }

    const { name, description, isActive } = req.body;

    // Check if treatment exists
    const [existing] = await db
      .select()
      .from(treatments)
      .where(eq(treatments.id, id));

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Treatment not found",
      });
    }

    const updateData: Partial<typeof treatments.$inferInsert> = {};

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Treatment name cannot be empty",
        });
      }
      if (trimmedName.length > 200) {
        return res.status(400).json({
          success: false,
          message: "Treatment name must be 200 characters or fewer",
        });
      }

      // Check name uniqueness if changed
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const [duplicate] = await db
          .select()
          .from(treatments)
          .where(eq(treatments.name, trimmedName));

        if (duplicate && duplicate.id !== id) {
          return res.status(409).json({
            success: false,
            message: `Treatment "${trimmedName}" already exists`,
          });
        }
      }

      updateData.name = trimmedName;
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const [updatedTreatment] = await db
      .update(treatments)
      .set(updateData)
      .where(eq(treatments.id, id))
      .returning();

    return res.json({
      success: true,
      message: "Treatment updated successfully",
      data: updatedTreatment,
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Treatment with this name already exists",
      });
    }
    next(error);
  }
};

// PATCH toggle treatment active status
export const toggleTreatmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid treatment ID",
      });
    }

    const [existing] = await db
      .select()
      .from(treatments)
      .where(eq(treatments.id, id));

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Treatment not found",
      });
    }

    const [updated] = await db
      .update(treatments)
      .set({ isActive: !existing.isActive })
      .where(eq(treatments.id, id))
      .returning();

    return res.json({
      success: true,
      message: `Treatment marked as ${updated.isActive ? "active" : "inactive"}`,
      data: updated,
    });
  } catch (error) {
    next(error);
}
};

