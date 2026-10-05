import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";

import { db } from "../config/db";
import { settings } from "../db/schema/settings";
import { AuthenticatedRequest } from "../middleware/auth";
import { saveReminderConfig } from "../services/reminderScheduler";

// --------------------------------------------------
// Default settings
// --------------------------------------------------

const DEFAULT_SETTINGS = {
  clinicName: "Dental Clinic",
  supportEmail: "",
  clinicPhone: "",
  defaultDuration: 30,

  instantAckEnabled: true,

  reminder24hEnabled: true,
  reminder24hHours: 24,

  reminder1hEnabled: true,
  reminder1hMinutes: 60,

  emailEnabled: true,
  smsEnabled: false,

  meetingProvider: "manual",
  manualMeetingLink: "",
};

// --------------------------------------------------
// Get / create singleton settings row
// --------------------------------------------------

const getOrCreateSettings = async (userId?: number) => {
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(settings)
    .values({
      id: 1,

      clinicName: DEFAULT_SETTINGS.clinicName,
      supportEmail: DEFAULT_SETTINGS.supportEmail,
      clinicPhone: DEFAULT_SETTINGS.clinicPhone,
      defaultDuration: DEFAULT_SETTINGS.defaultDuration,

      instantAckEnabled: DEFAULT_SETTINGS.instantAckEnabled,

      reminder24hEnabled: DEFAULT_SETTINGS.reminder24hEnabled,
      reminder24hHours: DEFAULT_SETTINGS.reminder24hHours,

      reminder1hEnabled: DEFAULT_SETTINGS.reminder1hEnabled,
      reminder1hMinutes: DEFAULT_SETTINGS.reminder1hMinutes,

      emailEnabled: DEFAULT_SETTINGS.emailEnabled,
      smsEnabled: DEFAULT_SETTINGS.smsEnabled,

      meetingProvider: DEFAULT_SETTINGS.meetingProvider,
      manualMeetingLink: DEFAULT_SETTINGS.manualMeetingLink,

      updatedBy: userId ?? null,
    })
    .returning();

  return inserted[0];
};

// ==================================================
// GET SETTINGS
// ==================================================

export const getSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id ? Number(req.user.id) : undefined;

    const setting = await getOrCreateSettings(userId);

    return res.status(200).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================
// UPDATE SETTINGS
// ==================================================

export const updateSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id ? Number(req.user.id) : undefined;

    const {
      clinicName,
      supportEmail,
      clinicPhone,
      defaultDuration,

      instantAckEnabled,

      reminder24hEnabled,
      reminder24hHours,

      reminder1hEnabled,
      reminder1hMinutes,

      emailEnabled,
      smsEnabled,

      meetingProvider,
      manualMeetingLink,

      workingHours,
      appointmentStatuses,
      consultationTypes,
      emailTemplates,
    } = req.body;

    // ------------------------------------------------
    // Validation
    // ------------------------------------------------

    if (
      defaultDuration !== undefined &&
      ![30, 45, 60].includes(Number(defaultDuration))
    ) {
      return res.status(400).json({
        success: false,
        message: "Default duration must be 30, 45, or 60 minutes",
      });
    }

    if (
      reminder24hHours !== undefined &&
      ![48, 24, 12].includes(Number(reminder24hHours))
    ) {
      return res.status(400).json({
        success: false,
        message: "24-hour reminder must be 48, 24, or 12 hours",
      });
    }

    if (
      reminder1hMinutes !== undefined &&
      ![120, 60, 30].includes(Number(reminder1hMinutes))
    ) {
      return res.status(400).json({
        success: false,
        message: "1-hour reminder must be 120, 60, or 30 minutes",
      });
    }

    const current = await getOrCreateSettings(userId);

    // ------------------------------------------------
    // Update object
    // ------------------------------------------------

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (clinicName !== undefined) {
      updateData.clinicName = String(clinicName).trim();
    }

    if (supportEmail !== undefined) {
      updateData.supportEmail = String(supportEmail).trim();
    }

    if (clinicPhone !== undefined) {
      updateData.clinicPhone = String(clinicPhone).trim();
    }

    if (defaultDuration !== undefined) {
      updateData.defaultDuration = Number(defaultDuration);
    }

    if (instantAckEnabled !== undefined) {
      updateData.instantAckEnabled = Boolean(instantAckEnabled);
    }

    if (reminder24hEnabled !== undefined) {
      updateData.reminder24hEnabled = Boolean(reminder24hEnabled);
    }

    if (reminder24hHours !== undefined) {
      updateData.reminder24hHours = Number(reminder24hHours);
    }

    if (reminder1hEnabled !== undefined) {
      updateData.reminder1hEnabled = Boolean(reminder1hEnabled);
    }

    if (reminder1hMinutes !== undefined) {
      updateData.reminder1hMinutes = Number(reminder1hMinutes);
    }

    if (emailEnabled !== undefined) {
      updateData.emailEnabled = Boolean(emailEnabled);
    }

    if (smsEnabled !== undefined) {
      updateData.smsEnabled = Boolean(smsEnabled);
    }

    if (meetingProvider !== undefined) {
      updateData.meetingProvider = String(meetingProvider);
    }

    if (manualMeetingLink !== undefined) {
      updateData.manualMeetingLink =
        String(manualMeetingLink).trim() || null;
    }

    if (workingHours !== undefined) {
      updateData.workingHours = workingHours;
    }

    if (appointmentStatuses !== undefined) {
      updateData.appointmentStatuses = appointmentStatuses;
    }

    if (consultationTypes !== undefined) {
      updateData.consultationTypes = consultationTypes;
    }

    if (emailTemplates !== undefined) {
      updateData.emailTemplates = emailTemplates;
    }

    if (userId) {
      updateData.updatedBy = userId;
    }

    // ------------------------------------------------
    // Update database
    // ------------------------------------------------

    const updated = await db
      .update(settings)
      .set(updateData)
      .where(eq(settings.id, current.id))
      .returning();

    if (updated[0]) {
      saveReminderConfig({
        instantAckEnabled: updated[0].instantAckEnabled,
        reminder24hEnabled: updated[0].reminder24hEnabled,
        reminder24hHours: updated[0].reminder24hHours,
        reminder1hEnabled: updated[0].reminder1hEnabled,
        reminder1hMinutes: updated[0].reminder1hMinutes,
        emailEnabled: updated[0].emailEnabled,
        smsEnabled: updated[0].smsEnabled,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================
// GET REMINDER SETTINGS
// ==================================================

export const getReminderSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id ? Number(req.user.id) : undefined;

    const setting = await getOrCreateSettings(userId);

    return res.status(200).json({
      success: true,

      data: {
        instantAckEnabled: setting.instantAckEnabled,

        reminder24hEnabled: setting.reminder24hEnabled,
        reminder24hHours: setting.reminder24hHours,

        reminder1hEnabled: setting.reminder1hEnabled,
        reminder1hMinutes: setting.reminder1hMinutes,

        emailEnabled: setting.emailEnabled,
        smsEnabled: setting.smsEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================
// UPDATE REMINDER SETTINGS
// ==================================================

export const updateReminderSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id ? Number(req.user.id) : undefined;

    const {
      instantAckEnabled,
      reminder24hEnabled,
      reminder24hHours,
      reminder1hEnabled,
      reminder1hMinutes,
      emailEnabled,
      smsEnabled,
    } = req.body;

    // ------------------------------------------------
    // Validation
    // ------------------------------------------------

    if (
      reminder24hHours !== undefined &&
      ![48, 24, 12].includes(Number(reminder24hHours))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid 24-hour reminder value",
      });
    }

    if (
      reminder1hMinutes !== undefined &&
      ![120, 60, 30].includes(Number(reminder1hMinutes))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid 1-hour reminder value",
      });
    }

    const current = await getOrCreateSettings(userId);

    const updated = await db
      .update(settings)
      .set({
        ...(instantAckEnabled !== undefined && {
          instantAckEnabled: Boolean(instantAckEnabled),
        }),

        ...(reminder24hEnabled !== undefined && {
          reminder24hEnabled: Boolean(reminder24hEnabled),
        }),

        ...(reminder24hHours !== undefined && {
          reminder24hHours: Number(reminder24hHours),
        }),

        ...(reminder1hEnabled !== undefined && {
          reminder1hEnabled: Boolean(reminder1hEnabled),
        }),

        ...(reminder1hMinutes !== undefined && {
          reminder1hMinutes: Number(reminder1hMinutes),
        }),

        ...(emailEnabled !== undefined && {
          emailEnabled: Boolean(emailEnabled),
        }),

        ...(smsEnabled !== undefined && {
          smsEnabled: Boolean(smsEnabled),
        }),

        ...(userId && {
          updatedBy: userId,
        }),

        updatedAt: new Date(),
      })
      .where(eq(settings.id, current.id))
      .returning();

    const result = updated[0];

    if (result) {
      saveReminderConfig({
        instantAckEnabled: result.instantAckEnabled,
        reminder24hEnabled: result.reminder24hEnabled,
        reminder24hHours: result.reminder24hHours,
        reminder1hEnabled: result.reminder1hEnabled,
        reminder1hMinutes: result.reminder1hMinutes,
        emailEnabled: result.emailEnabled,
        smsEnabled: result.smsEnabled,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reminder settings updated successfully",

      data: {
        instantAckEnabled: result.instantAckEnabled,

        reminder24hEnabled: result.reminder24hEnabled,
        reminder24hHours: result.reminder24hHours,

        reminder1hEnabled: result.reminder1hEnabled,
        reminder1hMinutes: result.reminder1hMinutes,

        emailEnabled: result.emailEnabled,
        smsEnabled: result.smsEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================
// GET MEETING SETTINGS
// ==================================================

export const getMeetingSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id ? Number(req.user.id) : undefined;

    const setting = await getOrCreateSettings(userId);

    return res.status(200).json({
      success: true,
      data: {
        meetingProvider: setting.meetingProvider,
        manualMeetingLink: setting.manualMeetingLink,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================
// UPDATE MEETING SETTINGS
// ==================================================

export const updateMeetingSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id ? Number(req.user.id) : undefined;

    const {
      meetingProvider,
      manualMeetingLink,
    } = req.body;

    const allowedProviders = [
      "manual",
      "google_meet",
      "zoom",
      "microsoft_teams",
    ];

    if (
      meetingProvider !== undefined &&
      !allowedProviders.includes(String(meetingProvider))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting provider",
      });
    }

    const current = await getOrCreateSettings(userId);

    const updated = await db
      .update(settings)
      .set({
        ...(meetingProvider !== undefined && {
          meetingProvider: String(meetingProvider),
        }),

        ...(manualMeetingLink !== undefined && {
          manualMeetingLink:
            String(manualMeetingLink).trim() || null,
        }),

        ...(userId && {
          updatedBy: userId,
        }),

        updatedAt: new Date(),
      })
      .where(eq(settings.id, current.id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Meeting settings updated successfully",
      data: {
        meetingProvider: updated[0].meetingProvider,
        manualMeetingLink: updated[0].manualMeetingLink,
      },
    });
  } catch (error) {
    next(error);
  }
};