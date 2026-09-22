import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import db from "../db";
import { doctor } from "../db/schema/doctor/doctor";

// GET all doctors
export const getAllDoctors = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const allDoctors = await db.select().from(doctor);

    res.json({
      success: true,
      data: allDoctors,
    });
  } catch (error) {
    next(error);
  }
};

// POST create new doctor with multer photo upload support
export const addDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      doctorName,
      doctorEmail,
      phoneNumber,
      specialization,
      workingHours,
      status,
      doctorPhoto,
    } = req.body;

    // Support camelCase, snake_case, and alias variations
    const finalName = (
      doctorName ||
      req.body.doctor_name ||
      req.body.name ||
      ""
    ).trim();
    const finalEmail = (
      doctorEmail ||
      req.body.doctor_email ||
      req.body.email ||
      ""
    )
      .trim()
      .toLowerCase();
    const finalPhone = (
      phoneNumber ||
      req.body.phone_number ||
      req.body.phone ||
      ""
    ).trim();
    const finalSpecialization = (specialization || "").trim();
    const finalWorkingHours = (
      workingHours ||
      req.body.working_hours ||
      ""
    ).trim();
    const finalStatus = (status || "available").trim();

    // Check if photo was uploaded as a file via multer, otherwise fallback to provided string or empty
    let finalPhoto = "";
    if (req.file) {
      finalPhoto = `/uploads/doctors/${req.file.filename}`;
    } else if (doctorPhoto || req.body.doctor_photo || req.body.avatar) {
      finalPhoto = (
        doctorPhoto ||
        req.body.doctor_photo ||
        req.body.avatar
      ).trim();
    } else {
      finalPhoto = "";
    }

    // Validation
    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: "Doctor name is required",
      });
    }

    if (!finalEmail) {
      return res.status(400).json({
        success: false,
        message: "Doctor email is required",
      });
    }

    if (!finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!finalSpecialization) {
      return res.status(400).json({
        success: false,
        message: "Specialization is required",
      });
    }

    if (!finalWorkingHours) {
      return res.status(400).json({
        success: false,
        message: "Working hours are required",
      });
    }

    const [newDoctor] = await db
      .insert(doctor)
      .values({
        doctorName: finalName,
        doctorEmail: finalEmail,
        phoneNumber: finalPhone,
        specialization: finalSpecialization,
        workingHours: finalWorkingHours,
        status: finalStatus,
        doctorPhoto: finalPhoto,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      data: newDoctor,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE doctor
export const deleteDoctor = async (
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
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    await db.delete(doctor).where(eq(doctor.id, id));

    return res.json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// PUT update doctor details
export const updateDoctor = async (
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
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const {
      doctorName,
      doctorEmail,
      phoneNumber,
      specialization,
      workingHours,
      status,
      doctorPhoto,
    } = req.body;

    const updateData: Partial<typeof doctor.$inferInsert> = {};

    if (doctorName || req.body.name || req.body.doctor_name) {
      updateData.doctorName = (
        doctorName ||
        req.body.name ||
        req.body.doctor_name
      ).trim();
    }
    if (doctorEmail || req.body.email || req.body.doctor_email) {
      updateData.doctorEmail = (
        doctorEmail ||
        req.body.email ||
        req.body.doctor_email
      )
        .trim()
        .toLowerCase();
    }
    if (phoneNumber || req.body.phone || req.body.phone_number) {
      updateData.phoneNumber = (
        phoneNumber ||
        req.body.phone ||
        req.body.phone_number
      ).trim();
    }
    if (specialization) {
      updateData.specialization = specialization.trim();
    }
    if (workingHours || req.body.working_hours) {
      updateData.workingHours = (workingHours || req.body.working_hours).trim();
    }
    if (status) {
      updateData.status = status.trim();
    }
    if (req.file) {
      updateData.doctorPhoto = `/uploads/doctors/${req.file.filename}`;
    } else if (doctorPhoto !== undefined && doctorPhoto !== null) {
      updateData.doctorPhoto = String(doctorPhoto).trim();
    }

    const [updatedDoctor] = await db
      .update(doctor)
      .set(updateData)
      .where(eq(doctor.id, id))
      .returning();

    if (!updatedDoctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.json({
      success: true,
      message: "Doctor updated successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH update status
export const updateDoctorStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(rawId, 10);
    const { status } = req.body;

    if (isNaN(id) || !status) {
      return res.status(400).json({
        success: false,
        message: "Invalid parameters",
      });
    }

    const [updatedDoctor] = await db
      .update(doctor)
      .set({ status })
      .where(eq(doctor.id, id))
      .returning();

    return res.json({
      success: true,
      message: "Doctor status updated successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    next(error);
  }
};
