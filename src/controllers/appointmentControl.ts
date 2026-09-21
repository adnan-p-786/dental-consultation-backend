import { Request, Response, NextFunction } from "express";

import { db } from "../config/db";
import { appointments } from "../db/schema/appointmentBooking/appointment";
import { sendAppointmentAcknowledgment } from "../services/emailService";
import { eq, desc, ilike } from "drizzle-orm";


export const createAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
      const {
        patientName,
        patientEmail,
        phoneNumber,
        contactMethod,
        tratmentType,
        preferredDate,
        preferredTime,
        status,
        additionalDescription,
        sendAcknowledgmentEmail,
      } = req.body || {};

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
          status:
            typeof status === "string" && status.trim()
              ? status.trim()
              : "pending",
        })
        .returning();

      // -----------------------------
      // Optional acknowledgment email
      // -----------------------------

      let emailSent = false;

      const shouldSendEmail =
        sendAcknowledgmentEmail !== "false" &&
        sendAcknowledgmentEmail !== false &&
        Boolean(appointment.patientEmail);

      if (shouldSendEmail) {
        try {
          const mailInfo = await sendAppointmentAcknowledgment(
            appointment.patientEmail,
            appointment.patientName,
            {
              id: appointment.id,
              preferredDate: appointment.preferredDate,
              preferredTime: appointment.preferredTime,
              tratmentType: appointment.tratmentType,
              contactMethod: appointment.contactMethod,
            }
          );

          emailSent = true;

          console.log(
            `Acknowledgment email successfully accepted by Gmail for ${appointment.patientEmail}. MessageId: ${mailInfo?.messageId}`
          );
        } catch (emailError) {
          // Appointment is already created.
          // Don't fail the request if only email fails.
          console.error(
            "Appointment created, but email sending failed:",
            emailError
          );
        }
      }

      // -----------------------------
      // Response
      // -----------------------------

      return res.status(201).json({
        success: true,
        message: "Appointment created successfully",
        emailSent,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  };

export const getAllAppointment = async (req: Request, res: Response, next: NextFunction) =>{
    try {
      const email =
        typeof req.query.email === "string"
          ? req.query.email.trim().toLowerCase()
          : null;

      let allAppointments;
      if (email) {
        allAppointments = await db
          .select()
          .from(appointments)
          .where(ilike(appointments.patientEmail, email))
          .orderBy(desc(appointments.id));
      } else {
        allAppointments = await db
          .select()
          .from(appointments)
          .orderBy(desc(appointments.id));
      }

      res.json({
        success: true,
        data: allAppointments,
      });
    } catch (error) {
      next(error);
    }
  };

export const cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const numId = Number(id);

      if (isNaN(numId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid appointment ID",
        });
      }

      const [updated] = await db
        .update(appointments)
        .set({ status: "cancelled" })
        .where(eq(appointments.id, numId))
        .returning();

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      return res.json({
        success: true,
        message: "Appointment cancelled successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };