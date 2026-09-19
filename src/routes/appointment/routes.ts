import { Router, Request, Response, NextFunction } from "express";

import { db } from "../../config/db";
import { appointments } from "../../db/schema/appointmentBooking/appointment";
import { upload } from "../../middleware/upload";

const router = Router();

router.post("/create-appointment",

  upload.single("supportingDocument"),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        patientName,
        patientEmail,
        phoneNumber,
        contactMethod,
        tratmentType,
        preferredDate,
        preferredTime,
        additionalDescription,
      } = req.body;

      // -----------------------------
      // Validation
      // -----------------------------

      if (!patientName) {
        return res.status(400).json({
          success: false,
          message: "Patient name is required",
        });
      }

      if (!patientEmail) {
        return res.status(400).json({
          success: false,
          message: "Patient email is required",
        });
      }

      if (!contactMethod) {
        return res.status(400).json({
          success: false,
          message: "Contact method is required",
        });
      }

      if (!tratmentType) {
        return res.status(400).json({
          success: false,
          message: "Treatment type is required",
        });
      }

      if (!preferredDate) {
        return res.status(400).json({
          success: false,
          message: "Preferred date is required",
        });
      }

      // -----------------------------
      // File path
      // -----------------------------

      let supportingDocument: string | undefined;

      if (req.file) {
        supportingDocument = `/uploads/appointments/${req.file.filename}`;
      }

      // -----------------------------
      // Insert into PostgreSQL
      // -----------------------------

      const [appointment] = await db
        .insert(appointments)
        .values({
          patientName,
          patientEmail,
          phoneNumber: phoneNumber || null,
          contactMethod,
          tratmentType,
          preferredDate,
          preferredTime: preferredTime || null,
          additionalDescription: additionalDescription || null,
          supportingDocument: supportingDocument || null,
        })
        .returning();

      // -----------------------------
      // Response
      // -----------------------------

      return res.status(201).json({
        success: true,
        message: "Appointment created successfully",

        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/get-appointments",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allAppointments = await db.select().from(appointments);

      res.json({
        success: true,
        data: allAppointments,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
