import { Request, Response, NextFunction } from "express";
import { and, eq } from "drizzle-orm";

import { db } from "../config/db";
import { appointments } from "../db/schema/appointment";
import { parseAppointmentDateTime } from "../services/reminderScheduler";

const NO_SHOW_GRACE_MINUTES = 15;
const EARLY_START_WINDOW_MINUTES = 15;

/**
 * Call when the doctor actually begins the consultation.
 * Since your current meeting links are entered manually, external Meet/Zoom/Teams
 * attendance is not automatically observable by this backend.
 */
export const startAppointmentConsultation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status.toLowerCase() === "in_progress") {
      return res.json({
        success: true,
        message: "Consultation is already in progress",
        data: appointment,
      });
    }

    if (appointment.status.toLowerCase() !== "approved") {
      return res.status(409).json({
        success: false,
        message: "Only approved appointments can be started",
      });
    }

    const scheduledDate =
      appointment.confirmedDate || appointment.preferredDate;
    const scheduledTime =
      appointment.confirmedTime || appointment.preferredTime;

    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "The appointment has no confirmed date/time",
      });
    }

    const scheduledAt = parseAppointmentDateTime(
      scheduledDate,
      scheduledTime,
    );

    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "The appointment date/time is invalid",
      });
    }

    const now = Date.now();
    const earliestStart =
      scheduledAt.getTime() -
      EARLY_START_WINDOW_MINUTES * 60 * 1000;
    const noShowDeadline =
      scheduledAt.getTime() +
      NO_SHOW_GRACE_MINUTES * 60 * 1000;

    if (now < earliestStart) {
      return res.status(409).json({
        success: false,
        message:
          `You can start the consultation up to ${EARLY_START_WINDOW_MINUTES} minutes before its scheduled time.`,
      });
    }

    if (now > noShowDeadline) {
      const [marked] = await db
        .update(appointments)
        .set({ status: "no_show" })
        .where(
          and(
            eq(appointments.id, id),
            eq(appointments.status, appointment.status),
          ),
        )
        .returning();

      return res.status(409).json({
        success: false,
        message:
          "The No Show grace period has passed. The appointment was marked No Show if it was still approved.",
        data: marked || undefined,
      });
    }

    const [updated] = await db
      .update(appointments)
      .set({
        status: "in_progress",
        consultationStartedAt: new Date(),
        consultationCompletedAt: null,
      })
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.status, appointment.status),
        ),
      )
      .returning();

    if (!updated) {
      return res.status(409).json({
        success: false,
        message:
          "The appointment changed while the consultation was being started. Refresh and try again.",
      });
    }

    return res.json({
      success: true,
      message:
        "Consultation started. The backend will automatically mark it Completed after the configured duration.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Use this when the doctor finishes early. If they do not call this endpoint,
 * the lifecycle scheduler will mark it Completed after the configured duration.
 */
export const completeAppointmentConsultation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const [updated] = await db
      .update(appointments)
      .set({
        status: "completed",
        consultationCompletedAt: new Date(),
      })
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.status, "in_progress"),
        ),
      )
      .returning();

    if (!updated) {
      const [existing] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Only an appointment currently in progress can be completed through this endpoint.",
        data: existing,
      });
    }

    return res.json({
      success: true,
      message: "Consultation marked Completed",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
