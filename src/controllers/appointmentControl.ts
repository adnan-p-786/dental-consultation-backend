import { Request, Response, NextFunction } from "express";

import { db } from "../config/db";
import { appointments } from "../db/schema/appointment";
import {
  sendAppointmentAcknowledgment,
  sendProposedScheduleNotification,
  sendAppointmentApprovedNotification,
  sendAppointmentCancelledNotification,
  sendAppointmentReminderNotification,
} from "../services/emailService";
import { eq, desc, ilike, or } from "drizzle-orm";
import {
  getReminderConfig,
  saveReminderConfig,
} from "../services/reminderScheduler";

export const createAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction,
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
          },
        );

        emailSent = true;

        console.log(
          `Acknowledgment email successfully accepted by Gmail for ${appointment.patientEmail}. MessageId: ${mailInfo?.messageId}`,
        );
      } catch (emailError) {
        // Appointment is already created.
        // Don't fail the request if only email fails.
        console.error(
          "Appointment created, but email sending failed:",
          emailError,
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

export const getAllAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const email =
      typeof req.query.email === "string" && req.query.email.trim()
        ? req.query.email.trim().toLowerCase()
        : null;

    const phone =
      typeof req.query.phone === "string" && req.query.phone.trim()
        ? req.query.phone.trim()
        : null;

    const name =
      typeof req.query.name === "string" && req.query.name.trim()
        ? req.query.name.trim()
        : null;

    const conditions = [];

    if (email) {
      conditions.push(ilike(appointments.patientEmail, email));
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length >= 7) {
        const lastDigits = cleanPhone.slice(-10);
        conditions.push(ilike(appointments.phoneNumber, `%${lastDigits}%`));
      } else {
        conditions.push(ilike(appointments.phoneNumber, `%${phone}%`));
      }
    }

    if (name && name.length >= 3) {
      conditions.push(ilike(appointments.patientName, `%${name}%`));
    }

    let allAppointments;
    if (conditions.length > 0) {
      allAppointments = await db
        .select()
        .from(appointments)
        .where(or(...conditions))
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

export const cancelAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const numId = Number(id);

    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const { note, reason } = req.body || {};
    const cancelReason =
      note || reason || "Appointment cancelled by clinic administration.";

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

    let emailSent = false;
    if (updated.patientEmail) {
      try {
        await sendAppointmentCancelledNotification(
          updated.patientEmail,
          updated.patientName,
          {
            id: updated.id,
            preferredDate: updated.preferredDate,
            preferredTime: updated.preferredTime,
            tratmentType: updated.tratmentType,
            contactMethod: updated.contactMethod,
            note: cancelReason,
          },
        );
        emailSent = true;
        console.log(
          `Cancellation notification email sent to ${updated.patientEmail} for appointment #${updated.id}`,
        );
      } catch (emailErr) {
        console.error(
          "Failed to send cancellation notification email:",
          emailErr,
        );
      }
    }

    return res.json({
      success: true,
      message: "Appointment cancelled successfully",
      emailSent,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const numId = Number(id);

    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const {
      status,
      patientName,
      patientEmail,
      phoneNumber,
      contactMethod,
      tratmentType,
      preferredDate,
      preferredTime,
      additionalDescription,
      note,
      assignedDoctorName,
      meetingLink,
    } = req.body || {};

    const updateFields: Record<string, any> = {};

    if (status !== undefined)
      updateFields.status = String(status).toLowerCase();
    if (patientName !== undefined) updateFields.patientName = patientName;
    if (patientEmail !== undefined) updateFields.patientEmail = patientEmail;
    if (phoneNumber !== undefined) updateFields.phoneNumber = phoneNumber;
    if (contactMethod !== undefined) updateFields.contactMethod = contactMethod;
    if (tratmentType !== undefined) updateFields.tratmentType = tratmentType;
    if (preferredDate !== undefined) updateFields.preferredDate = preferredDate;
    if (preferredTime !== undefined) updateFields.preferredTime = preferredTime;
    if (additionalDescription !== undefined)
      updateFields.additionalDescription = additionalDescription;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    const [updated] = await db
      .update(appointments)
      .set(updateFields)
      .where(eq(appointments.id, numId))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    let emailSent = false;
    if (updated.patientEmail) {
      const normalizedStatus = updated.status?.toLowerCase();
      if (normalizedStatus === "proposed") {
        try {
          await sendProposedScheduleNotification(
            updated.patientEmail,
            updated.patientName,
            {
              id: updated.id,
              preferredDate: updated.preferredDate,
              preferredTime: updated.preferredTime,
              tratmentType: updated.tratmentType,
              contactMethod: updated.contactMethod,
              note: note || undefined,
              assignedDoctorName: assignedDoctorName || undefined,
              meetingLink: meetingLink || undefined,
            },
          );
          emailSent = true;
          console.log(
            `Proposed schedule notification email sent to ${updated.patientEmail} for appointment #${updated.id}`,
          );
        } catch (emailErr) {
          console.error(
            "Failed to send proposed schedule notification email:",
            emailErr,
          );
        }
      } else if (normalizedStatus === "approved") {
        try {
          await sendAppointmentApprovedNotification(
            updated.patientEmail,
            updated.patientName,
            {
              id: updated.id,
              preferredDate: updated.preferredDate,
              preferredTime: updated.preferredTime,
              tratmentType: updated.tratmentType,
              contactMethod: updated.contactMethod,
              note: note || undefined,
              assignedDoctorName: assignedDoctorName || undefined,
              meetingLink: meetingLink || undefined,
            },
          );
          emailSent = true;
          console.log(
            `Approved notification email sent to ${updated.patientEmail} for appointment #${updated.id}`,
          );
        } catch (emailErr) {
          console.error(
            "Failed to send approved notification email:",
            emailErr,
          );
        }
      } else if (normalizedStatus === "cancelled") {
        try {
          await sendAppointmentCancelledNotification(
            updated.patientEmail,
            updated.patientName,
            {
              id: updated.id,
              preferredDate: updated.preferredDate,
              preferredTime: updated.preferredTime,
              tratmentType: updated.tratmentType,
              contactMethod: updated.contactMethod,
              note: note || "Appointment cancelled by clinic administration.",
              assignedDoctorName: assignedDoctorName || undefined,
            },
          );
          emailSent = true;
          console.log(
            `Cancellation notification email sent to ${updated.patientEmail} for appointment #${updated.id}`,
          );
        } catch (emailErr) {
          console.error(
            "Failed to send cancellation notification email:",
            emailErr,
          );
        }
      }
    }

    return res.json({
      success: true,
      message: "Appointment updated successfully",
      emailSent,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const sendAppointmentReminder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const numId = Number(id);

    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const {
      reminderType = "24_hour",
      customHours,
      assignedDoctorName,
      meetingLink,
    } = req.body || {};

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, numId));

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (!appointment.patientEmail) {
      return res.status(400).json({
        success: false,
        message: "Patient has no email registered",
      });
    }

    const mailInfo = await sendAppointmentReminderNotification(
      appointment.patientEmail,
      appointment.patientName,
      {
        id: appointment.id,
        preferredDate: appointment.preferredDate,
        preferredTime: appointment.preferredTime,
        tratmentType: appointment.tratmentType,
        contactMethod: appointment.contactMethod,
        assignedDoctorName: assignedDoctorName || undefined,
        meetingLink: meetingLink || undefined,
        reminderType: reminderType as any,
        customHours: customHours ? Number(customHours) : undefined,
      },
    );

    return res.json({
      success: true,
      message: `Reminder (${reminderType}) sent successfully to ${appointment.patientEmail}`,
      messageId: mailInfo.messageId,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerAutomatedReminders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reminderType = "24_hour", customHours } = req.body || {};

    const allApproved = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, "approved"));

    let sentCount = 0;
    const errors: string[] = [];

    for (const apt of allApproved) {
      if (!apt.patientEmail) continue;
      try {
        await sendAppointmentReminderNotification(
          apt.patientEmail,
          apt.patientName,
          {
            id: apt.id,
            preferredDate: apt.preferredDate,
            preferredTime: apt.preferredTime,
            tratmentType: apt.tratmentType,
            contactMethod: apt.contactMethod,
            reminderType: reminderType as any,
            customHours: customHours ? Number(customHours) : undefined,
          },
        );
        sentCount++;
      } catch (err: any) {
        errors.push(`Error for #${apt.id}: ${err.message || err}`);
      }
    }

    return res.json({
      success: true,
      message: `Triggered ${reminderType} reminders. Sent: ${sentCount}.`,
      sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const numId = Number(id);

    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const [deleted] = await db
      .delete(appointments)
      .where(eq(appointments.id, numId))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    return res.json({
      success: true,
      message: "Appointment deleted successfully",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

export const getReminderSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const config = getReminderConfig();
    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReminderSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const updated = saveReminderConfig(req.body || {});
    return res.json({
      success: true,
      message: "Reminder settings updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
