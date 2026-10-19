import { and, eq, isNull } from "drizzle-orm";
import { db } from "../config/db";
import { appointments, Appointment } from "../db/schema/appointment";
import { settings } from "../db/schema/settings";
import { appointmentStatuses } from "../db/schema/appointmentStatus";
import { parseClinicDateTime, getClinicTimeZone } from "../utils/dateTime";

/**
 * Appointment Lifecycle Constants
 */
export const NO_SHOW_GRACE_PERIOD_MINUTES = 15;
export const EARLY_START_BUFFER_MINUTES = 15;
export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;

/**
 * Canonical lifecycle status keys (stored in lowercase in the database)
 */
export const APPOINTMENT_STATUSES = {
  REQUESTED: "requested",
  PENDING: "pending", // Compatible alias for requested
  UNDER_REVIEW: "under_review",
  PROPOSED: "proposed",
  APPROVED: "approved",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
  RESCHEDULE_REQUESTED: "reschedule_requested",
  CANCELLED: "cancelled",
} as const;

export type AppointmentStatusValue =
  (typeof APPOINTMENT_STATUSES)[keyof typeof APPOINTMENT_STATUSES];

export const FINALIZED_STATUSES: readonly string[] = [
  APPOINTMENT_STATUSES.COMPLETED,
  APPOINTMENT_STATUSES.NO_SHOW,
  APPOINTMENT_STATUSES.CANCELLED,
  "rejected",
];

export interface StartConsultationResult {
  success: boolean;
  statusCode: number;
  message: string;
  data?: Appointment;
}

export interface CompleteConsultationResult {
  success: boolean;
  statusCode: number;
  message: string;
  data?: Appointment;
}

export interface LifecycleScanResult {
  noShowCount: number;
  completedCount: number;
  errors: string[];
}

/**
 * Seed canonical statuses into appointment_statuses table without creating duplicates.
 */
export const seedDefaultAppointmentStatuses = async (): Promise<void> => {
  try {
    const existing = await db.select().from(appointmentStatuses);
    const existingNames = new Set(
      existing.map((s) => s.name.toLowerCase().trim()),
    );

    const canonicalDefaults = [
      "Requested",
      "Under Review",
      "Proposed",
      "Approved",
      "In Progress",
      "Completed",
      "No Show",
      "Reschedule Requested",
      "Cancelled",
    ];

    for (const name of canonicalDefaults) {
      if (!existingNames.has(name.toLowerCase())) {
        await db.insert(appointmentStatuses).values({
          name,
          isActive: true,
        });
        console.log(`[Lifecycle] Seeded missing status: "${name}"`);
      }
    }
  } catch (err) {
    console.error("[Lifecycle] Error seeding default appointment statuses:", err);
  }
};

/**
 * Retrieves the current configured appointment duration from PostgreSQL settings.
 */
export const getConfiguredAppointmentDuration = async (): Promise<number> => {
  try {
    const [row] = await db
      .select({ duration: settings.appointmentDuration })
      .from(settings)
      .limit(1);

    if (row && typeof row.duration === "number" && row.duration > 0) {
      return row.duration;
    }
  } catch (err) {
    console.warn(
      "[Lifecycle] Could not query appointment_duration from settings, falling back to 30 mins:",
      err,
    );
  }
  return DEFAULT_APPOINTMENT_DURATION_MINUTES;
};

/**
 * Verifies if an appointment is eligible to start a consultation.
 */
export const validateStartConsultationWindow = (
  apt: Appointment,
  now = new Date(),
): { valid: boolean; statusCode: number; message: string; scheduledInstant?: Date } => {
  const normalizedStatus = (apt.status || "").toLowerCase().trim();

  // 1. Must be in approved status
  if (normalizedStatus !== APPOINTMENT_STATUSES.APPROVED) {
    if (normalizedStatus === APPOINTMENT_STATUSES.IN_PROGRESS) {
      return {
        valid: false,
        statusCode: 409,
        message: "Consultation is already in progress.",
      };
    }
    if (normalizedStatus === APPOINTMENT_STATUSES.COMPLETED) {
      return {
        valid: false,
        statusCode: 400,
        message: "Cannot start a consultation that is already completed.",
      };
    }
    if (normalizedStatus === APPOINTMENT_STATUSES.NO_SHOW) {
      return {
        valid: false,
        statusCode: 409,
        message:
          "Appointment was marked as No Show. The consultation window has expired.",
      };
    }
    if (normalizedStatus === APPOINTMENT_STATUSES.CANCELLED) {
      return {
        valid: false,
        statusCode: 400,
        message: "Cannot start a consultation for a cancelled appointment.",
      };
    }
    return {
      valid: false,
      statusCode: 400,
      message: `Appointment must be approved before starting consultation (current status: ${apt.status}).`,
    };
  }

  // 2. Read scheduled date and time
  const scheduledDate = apt.confirmedDate || apt.preferredDate;
  const scheduledTime = apt.confirmedTime || apt.preferredTime;

  if (!scheduledDate) {
    return {
      valid: false,
      statusCode: 400,
      message: "Appointment does not have a valid scheduled date.",
    };
  }

  const scheduledInstant = parseClinicDateTime(scheduledDate, scheduledTime);
  if (!scheduledInstant) {
    // If date format could not be parsed, allow doctor to start but log a warning
    console.warn(
      `[Lifecycle] Could not parse scheduled instant for appointment #${apt.id} (${scheduledDate} ${scheduledTime}). Permitting consultation start.`,
    );
    return {
      valid: true,
      statusCode: 200,
      message: "Valid start window.",
    };
  }

  const scheduledMs = scheduledInstant.getTime();
  const nowMs = now.getTime();

  const earliestAllowedMs = scheduledMs - EARLY_START_BUFFER_MINUTES * 60 * 1000;
  const noShowDeadlineMs = scheduledMs + NO_SHOW_GRACE_PERIOD_MINUTES * 60 * 1000;

  // Too early
  if (nowMs < earliestAllowedMs) {
    const minutesUntilStart = Math.ceil((scheduledMs - nowMs) / (60 * 1000));
    return {
      valid: false,
      statusCode: 400,
      message: `Consultation cannot be started yet. Permitted window opens 15 minutes before scheduled start time (starts in ~${minutesUntilStart} minutes).`,
      scheduledInstant,
    };
  }

  // Too late (past No Show deadline)
  if (nowMs > noShowDeadlineMs) {
    const minutesPastDeadline = Math.floor((nowMs - noShowDeadlineMs) / (60 * 1000));
    return {
      valid: false,
      statusCode: 409,
      message: `The 15-minute start window for this appointment has expired (${minutesPastDeadline} minutes past grace period). Please contact clinic administration.`,
      scheduledInstant,
    };
  }

  return {
    valid: true,
    statusCode: 200,
    message: "Valid start window.",
    scheduledInstant,
  };
};

/**
 * Handles starting a consultation for an appointment.
 */
export const startConsultation = async (
  appointmentId: number,
): Promise<StartConsultationResult> => {
  if (isNaN(appointmentId) || appointmentId <= 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid appointment ID.",
    };
  }

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment) {
    return {
      success: false,
      statusCode: 404,
      message: "Appointment not found.",
    };
  }

  const validation = validateStartConsultationWindow(appointment);
  if (!validation.valid) {
    return {
      success: false,
      statusCode: validation.statusCode,
      message: validation.message,
    };
  }

  const now = new Date();

  // Conditional update prevents race conditions if another worker or doctor modified status concurrently
  const [updated] = await db
    .update(appointments)
    .set({
      status: APPOINTMENT_STATUSES.IN_PROGRESS,
      consultationStartedAt: now,
      consultationCompletedAt: null, // Clear any stale completed timestamp
    })
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.status, APPOINTMENT_STATUSES.APPROVED),
      ),
    )
    .returning();

  if (!updated) {
    return {
      success: false,
      statusCode: 409,
      message:
        "Unable to start consultation. The appointment status was changed concurrently.",
    };
  }

  console.log(
    `[Lifecycle] Consultation started for appointment #${updated.id} at ${now.toISOString()} (Clinic TZ: ${getClinicTimeZone()}).`,
  );

  return {
    success: true,
    statusCode: 200,
    message: "Consultation started successfully.",
    data: updated,
  };
};

/**
 * Handles marking an in-progress consultation as completed immediately.
 */
export const completeConsultation = async (
  appointmentId: number,
  consultationNotes?: any,
): Promise<CompleteConsultationResult> => {
  if (isNaN(appointmentId) || appointmentId <= 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid appointment ID.",
    };
  }

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment) {
    return {
      success: false,
      statusCode: 404,
      message: "Appointment not found.",
    };
  }

  const normalizedStatus = (appointment.status || "").toLowerCase().trim();
  if (normalizedStatus !== APPOINTMENT_STATUSES.IN_PROGRESS) {
    if (normalizedStatus === APPOINTMENT_STATUSES.COMPLETED) {
      return {
        success: false,
        statusCode: 400,
        message: "Appointment is already completed.",
      };
    }
    return {
      success: false,
      statusCode: 400,
      message: `Only appointments currently in progress can be completed (current status: ${appointment.status}).`,
    };
  }

  const now = new Date();
  const updatePayload: Record<string, any> = {
    status: APPOINTMENT_STATUSES.COMPLETED,
    consultationCompletedAt: now,
  };

  if (consultationNotes !== undefined) {
    updatePayload.consultationNotes = consultationNotes;
  }

  const [updated] = await db
    .update(appointments)
    .set(updatePayload)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.status, APPOINTMENT_STATUSES.IN_PROGRESS),
      ),
    )
    .returning();

  if (!updated) {
    return {
      success: false,
      statusCode: 409,
      message:
        "Unable to complete consultation. The appointment status was modified concurrently.",
    };
  }

  console.log(
    `[Lifecycle] Consultation completed manually for appointment #${updated.id} at ${now.toISOString()}.`,
  );

  return {
    success: true,
    statusCode: 200,
    message: "Consultation marked as completed successfully.",
    data: updated,
  };
};

/**
 * Automated lifecycle check:
 * 1. Overdue approved appointments past 15m grace period -> no_show
 * 2. In-progress appointments whose duration has elapsed -> completed
 */
export const processLifecycleTransitions = async (): Promise<LifecycleScanResult> => {
  const result: LifecycleScanResult = {
    noShowCount: 0,
    completedCount: 0,
    errors: [],
  };

  const now = new Date();
  const nowMs = now.getTime();

  // -------------------------------------------------------------------
  // A. Automatic No Show Transition
  // -------------------------------------------------------------------
  try {
    const approvedList = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, APPOINTMENT_STATUSES.APPROVED));

    for (const apt of approvedList) {
      try {
        const scheduledDate = apt.confirmedDate || apt.preferredDate;
        const scheduledTime = apt.confirmedTime || apt.preferredTime;

        if (!scheduledDate) continue;

        const scheduledInstant = parseClinicDateTime(
          scheduledDate,
          scheduledTime,
        );

        if (!scheduledInstant) {
          // Skip unparseable dates safely without crashing
          continue;
        }

        const deadlineMs =
          scheduledInstant.getTime() +
          NO_SHOW_GRACE_PERIOD_MINUTES * 60 * 1000;

        // If current time is past the 15-minute grace period
        if (nowMs >= deadlineMs) {
          // Conditional update ensures:
          // 1. Still in 'approved' status (not cancelled, completed, etc.)
          // 2. Consultation has not been started (consultationStartedAt is null)
          const [updated] = await db
            .update(appointments)
            .set({
              status: APPOINTMENT_STATUSES.NO_SHOW,
            })
            .where(
              and(
                eq(appointments.id, apt.id),
                eq(appointments.status, APPOINTMENT_STATUSES.APPROVED),
                isNull(appointments.consultationStartedAt),
              ),
            )
            .returning();

          if (updated) {
            result.noShowCount++;
            console.log(
              `[Lifecycle Scheduler] Appointment #${apt.id} automatically marked as NO_SHOW (scheduled: ${scheduledDate} ${scheduledTime || ""}, 15m grace period exceeded).`,
            );
          }
        }
      } catch (aptErr: any) {
        const errMessage = `Error evaluating no-show for #${apt.id}: ${aptErr.message || aptErr}`;
        console.error(`[Lifecycle Scheduler] ${errMessage}`);
        result.errors.push(errMessage);
      }
    }
  } catch (scanErr: any) {
    const msg = `Failed to scan approved appointments: ${scanErr.message || scanErr}`;
    console.error(`[Lifecycle Scheduler] ${msg}`);
    result.errors.push(msg);
  }

  // -------------------------------------------------------------------
  // B. Automatic Completed Transition
  // -------------------------------------------------------------------
  try {
    const durationMinutes = await getConfiguredAppointmentDuration();
    const durationMs = durationMinutes * 60 * 1000;

    const inProgressList = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, APPOINTMENT_STATUSES.IN_PROGRESS));

    for (const apt of inProgressList) {
      try {
        if (!apt.consultationStartedAt) {
          console.warn(
            `[Lifecycle Scheduler] Appointment #${apt.id} has status in_progress but no consultationStartedAt timestamp. Skipping.`,
          );
          continue;
        }

        const startedInstant = new Date(apt.consultationStartedAt);
        if (isNaN(startedInstant.getTime())) {
          console.warn(
            `[Lifecycle Scheduler] Appointment #${apt.id} has invalid consultationStartedAt timestamp. Skipping.`,
          );
          continue;
        }

        const completionDeadlineMs = startedInstant.getTime() + durationMs;

        // If configured duration has elapsed since consultation was started
        if (nowMs >= completionDeadlineMs) {
          const [updated] = await db
            .update(appointments)
            .set({
              status: APPOINTMENT_STATUSES.COMPLETED,
              consultationCompletedAt: now,
            })
            .where(
              and(
                eq(appointments.id, apt.id),
                eq(appointments.status, APPOINTMENT_STATUSES.IN_PROGRESS),
              ),
            )
            .returning();

          if (updated) {
            result.completedCount++;
            console.log(
              `[Lifecycle Scheduler] Appointment #${apt.id} automatically marked as COMPLETED (${durationMinutes}m consultation duration elapsed).`,
            );
          }
        }
      } catch (aptErr: any) {
        const errMessage = `Error evaluating completion for #${apt.id}: ${aptErr.message || aptErr}`;
        console.error(`[Lifecycle Scheduler] ${errMessage}`);
        result.errors.push(errMessage);
      }
    }
  } catch (scanErr: any) {
    const msg = `Failed to scan in-progress appointments: ${scanErr.message || scanErr}`;
    console.error(`[Lifecycle Scheduler] ${msg}`);
    result.errors.push(msg);
  }

  return result;
};
