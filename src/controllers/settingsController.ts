import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";

import { db } from "../config/db";

import { settings } from "../db/schema/settings";
import { treatments } from "../db/schema/treatment";
import { appointmentStatuses } from "../db/schema/appointmentStatus";
import { consultationTypes } from "../db/schema/consultationType";
import { workingHours } from "../db/schema/workingHour";
import { reminderSettings } from "../db/schema/reminderSetting";
import { emailTemplates } from "../db/schema/emailTemplate";
import { saveReminderConfig, getReminderConfig } from "../services/reminderScheduler";

/* =====================================================
   HELPER: FULL SETTINGS BUILDER
===================================================== */

const getStatusColor = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("pending") || lower.includes("request")) return "amber";
  if (lower.includes("review")) return "teal";
  if (lower.includes("propos")) return "blue";
  if (lower.includes("approv") || lower.includes("confirm")) return "emerald";
  if (lower.includes("complete")) return "indigo";
  if (lower.includes("cancel")) return "rose";
  if (lower.includes("reject")) return "red";
  return "teal";
};

const DEFAULT_DOCTOR_AVAILABILITY = {
  defaultStatus: "available",
  maxParallelPerSlot: 1,
  assignmentMode: "round_robin",
  autoBusyDuringCall: true,
  allowEmergencyOverride: true,
};

const DEFAULT_GENERAL_APPOINTMENT_SETTINGS = {
  minNoticeHours: 2,
  maxAdvanceDays: 30,
  allowSameDayBooking: true,
  cancellationCutoffHours: 2,
  maxActivePerPatient: 3,
  allowDocumentUpload: true,
  requireDocumentUpload: false,
  autoConfirmExistingPatients: false,
  bufferTimeMinutes: 10,
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildFullSettings = async () => {
  let [settingRow] = await db.select().from(settings).limit(1);
  if (!settingRow) {
    const [created] = await db
      .insert(settings)
      .values({
        clinicName: "32 Stories Dental",
        supportEmail: "32storiesdental@gmail.com",
        appointmentDuration: 30,
        bufferTime: 10,
        minNoticeHours: 2,
        maxBookingDays: 30,
        videoProvider: "google_meet",
        enableEmailNotifications: true,
      })
      .returning();
    settingRow = created;
  }

  const [dbWorkingHours, dbStatuses, dbConsultationTypes, dbEmailTemplates] = await Promise.all([
    db.select().from(workingHours),
    db.select().from(appointmentStatuses),
    db.select().from(consultationTypes),
    db.select().from(emailTemplates),
  ]);

  const reminderConfig = getReminderConfig();

  const formattedWorkingHours = dbWorkingHours.map((wh) => ({
    id: wh.id,
    day: wh.dayOfWeek,
    isOpen: wh.isWorking,
    openTime: (wh.startTime || "08:00").slice(0, 5),
    closeTime: (wh.endTime || "19:00").slice(0, 5),
    hasBreak: Boolean(wh.breakStart && wh.breakEnd),
    breakStart: wh.breakStart ? wh.breakStart.slice(0, 5) : "13:00",
    breakEnd: wh.breakEnd ? wh.breakEnd.slice(0, 5) : "14:00",
  }));

  const formattedStatuses = dbStatuses.map((st) => ({
    id: st.id,
    key: st.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    label: st.name,
    color: getStatusColor(st.name),
    description: `Status: ${st.name}`,
    patientCanCancel: !["completed", "cancelled", "rejected"].includes(st.name.toLowerCase()),
    isActive: st.isActive,
  }));

  const formattedConsultationTypes = dbConsultationTypes.map((ct) => ({
    id: String(ct.id),
    name: ct.name,
    description: ct.description || "",
    defaultDuration: 30,
    isActive: ct.isActive,
    requiresMeetingLink: ct.name.toLowerCase().includes("video") || ct.name.toLowerCase().includes("online"),
    badgeText: ct.name.toLowerCase().includes("video") ? "Tele-Health" : "In-Clinic",
  }));

  const formattedEmailTemplates = dbEmailTemplates.map((et) => ({
    id: String(et.id),
    name: et.name,
    subject: et.subject,
    bodySummary: et.body,
    enabled: et.isActive,
  }));

  const storedGeneralSettings = asRecord(settingRow.generalAppointmentSettings);
  const storedDoctorAvailability = asRecord(settingRow.doctorAvailability);

  return {
    id: settingRow.id,
    clinicName: settingRow.clinicName,
    supportEmail: settingRow.supportEmail || "",
    clinicPhone: settingRow.clinicPhone || "+1 (555) 234-CARE",
    defaultDuration: settingRow.appointmentDuration,
    bufferTimeMinutes: settingRow.bufferTime,
    meetingProvider: settingRow.videoProvider || "google_meet",
    manualMeetingLink: settingRow.manualMeetingLink || "",
    instantAckEnabled: reminderConfig.instantAckEnabled ?? true,
    reminder24hEnabled: reminderConfig.reminder24hEnabled ?? true,
    reminder24hHours: reminderConfig.reminder24hHours ?? 24,
    reminder1hEnabled: reminderConfig.reminder1hEnabled ?? true,
    reminder1hMinutes: reminderConfig.reminder1hMinutes ?? 60,
    emailEnabled: settingRow.enableEmailNotifications ?? true,
    smsEnabled: reminderConfig.smsEnabled ?? false,
    workingHours: Array.isArray(settingRow.workingHours)
      ? settingRow.workingHours
      : formattedWorkingHours.length > 0
        ? formattedWorkingHours
        : undefined,
    doctorAvailability: {
      ...DEFAULT_DOCTOR_AVAILABILITY,
      ...storedDoctorAvailability,
    },
    emailTemplates: Array.isArray(settingRow.emailTemplates)
      ? settingRow.emailTemplates
      : formattedEmailTemplates.length > 0
        ? formattedEmailTemplates
        : undefined,
    appointmentStatuses: Array.isArray(settingRow.appointmentStatuses)
      ? settingRow.appointmentStatuses
      : formattedStatuses.length > 0
        ? formattedStatuses
        : undefined,
    consultationTypes: Array.isArray(settingRow.consultationTypes)
      ? settingRow.consultationTypes
      : formattedConsultationTypes.length > 0
        ? formattedConsultationTypes
        : undefined,
    generalAppointmentSettings: {
      ...DEFAULT_GENERAL_APPOINTMENT_SETTINGS,
      ...storedGeneralSettings,
      minNoticeHours: settingRow.minNoticeHours,
      maxAdvanceDays: settingRow.maxBookingDays,
      bufferTimeMinutes: settingRow.bufferTime,
    },
    updatedAt: settingRow.updatedAt,
  };
};

/* =====================================================
   GENERAL SETTINGS
===================================================== */

export const getSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const fullSettings = await buildFullSettings();
    return res.json({
      success: true,
      data: fullSettings,
    });
  } catch (error) {
    next(error);
  }
};


export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body;

    const existing = await db
      .select()
      .from(settings)
      .limit(1);

    // 1. Update settings table
    const settingsPayload: Partial<typeof settings.$inferInsert> = {};
    if (body.clinicName !== undefined) settingsPayload.clinicName = String(body.clinicName).trim();
    if (body.supportEmail !== undefined) settingsPayload.supportEmail = body.supportEmail ? String(body.supportEmail).trim() : null;
    if (body.clinicPhone !== undefined) settingsPayload.clinicPhone = body.clinicPhone ? String(body.clinicPhone).trim() : null;
    if (body.defaultDuration !== undefined) settingsPayload.appointmentDuration = Number(body.defaultDuration);
    else if (body.appointmentDuration !== undefined) settingsPayload.appointmentDuration = Number(body.appointmentDuration);

    if (body.bufferTimeMinutes !== undefined) settingsPayload.bufferTime = Number(body.bufferTimeMinutes);
    else if (body.bufferTime !== undefined) settingsPayload.bufferTime = Number(body.bufferTime);

    if (body.generalAppointmentSettings?.minNoticeHours !== undefined) {
      settingsPayload.minNoticeHours = Number(body.generalAppointmentSettings.minNoticeHours);
    } else if (body.minNoticeHours !== undefined) {
      settingsPayload.minNoticeHours = Number(body.minNoticeHours);
    }

    if (body.generalAppointmentSettings?.maxAdvanceDays !== undefined) {
      settingsPayload.maxBookingDays = Number(body.generalAppointmentSettings.maxAdvanceDays);
    } else if (body.maxBookingDays !== undefined) {
      settingsPayload.maxBookingDays = Number(body.maxBookingDays);
    }

    if (body.meetingProvider !== undefined) settingsPayload.videoProvider = String(body.meetingProvider);
    else if (body.videoProvider !== undefined) settingsPayload.videoProvider = String(body.videoProvider);

    if (body.manualMeetingLink !== undefined) {
      settingsPayload.manualMeetingLink = body.manualMeetingLink
        ? String(body.manualMeetingLink).trim()
        : null;
    }

    if (body.workingHours !== undefined) settingsPayload.workingHours = body.workingHours;
    if (body.doctorAvailability !== undefined) settingsPayload.doctorAvailability = body.doctorAvailability;
    if (body.emailTemplates !== undefined) settingsPayload.emailTemplates = body.emailTemplates;
    if (body.appointmentStatuses !== undefined) settingsPayload.appointmentStatuses = body.appointmentStatuses;
    if (body.consultationTypes !== undefined) settingsPayload.consultationTypes = body.consultationTypes;
    if (body.generalAppointmentSettings !== undefined) {
      settingsPayload.generalAppointmentSettings = body.generalAppointmentSettings;
    }

    if (body.emailEnabled !== undefined) settingsPayload.enableEmailNotifications = Boolean(body.emailEnabled);
    else if (body.enableEmailNotifications !== undefined) settingsPayload.enableEmailNotifications = Boolean(body.enableEmailNotifications);

    settingsPayload.updatedAt = new Date();

    if (!existing.length) {
      await db.insert(settings).values({
        clinicName: "32 Stories Dental",
        ...settingsPayload,
      } as typeof settings.$inferInsert);
    } else {
      await db
        .update(settings)
        .set(settingsPayload)
        .where(eq(settings.id, existing[0].id));
    }

    // 2. Update reminder scheduler config
    saveReminderConfig({
      instantAckEnabled: body.instantAckEnabled,
      reminder24hEnabled: body.reminder24hEnabled,
      reminder24hHours: body.reminder24hHours,
      reminder1hEnabled: body.reminder1hEnabled,
      reminder1hMinutes: body.reminder1hMinutes,
      emailEnabled: body.emailEnabled,
      smsEnabled: body.smsEnabled,
    });

    // 3. Update working_hours if provided
    if (Array.isArray(body.workingHours)) {
      for (const item of body.workingHours) {
        const day = item.day || item.dayOfWeek;
        if (!day) continue;
        const [existingWh] = await db
          .select()
          .from(workingHours)
          .where(eq(workingHours.dayOfWeek, day));

        const isWorking = item.isOpen !== undefined ? Boolean(item.isOpen) : (item.isWorking !== undefined ? Boolean(item.isWorking) : true);
        const startTime = (item.openTime || item.startTime || "08:00").slice(0, 8);
        const endTime = (item.closeTime || item.endTime || "19:00").slice(0, 8);
        const hasBreak = item.hasBreak !== undefined ? Boolean(item.hasBreak) : true;
        const breakStart = hasBreak && (item.breakStart || item.breakStart === "") ? item.breakStart.slice(0, 8) : null;
        const breakEnd = hasBreak && (item.breakEnd || item.breakEnd === "") ? item.breakEnd.slice(0, 8) : null;

        if (existingWh) {
          await db
            .update(workingHours)
            .set({
              startTime,
              endTime,
              breakStart,
              breakEnd,
              isWorking,
              updatedAt: new Date(),
            })
            .where(eq(workingHours.id, existingWh.id));
        } else {
          await db.insert(workingHours).values({
            dayOfWeek: day,
            startTime,
            endTime,
            breakStart,
            breakEnd,
            isWorking,
          });
        }
      }
    }

    // 4. Update appointment statuses if provided
    if (Array.isArray(body.appointmentStatuses)) {
      for (const st of body.appointmentStatuses) {
        if (st.id) {
          await db
            .update(appointmentStatuses)
            .set({
              isActive: st.isActive ?? true,
              updatedAt: new Date(),
            })
            .where(eq(appointmentStatuses.id, Number(st.id)));
        }
      }
    }

    // 5. Update consultation types if provided
    if (Array.isArray(body.consultationTypes)) {
      for (const ct of body.consultationTypes) {
        if (ct.id && !isNaN(Number(ct.id))) {
          await db
            .update(consultationTypes)
            .set({
              description: ct.description ?? null,
              isActive: ct.isActive ?? true,
              updatedAt: new Date(),
            })
            .where(eq(consultationTypes.id, Number(ct.id)));
        }
      }
    }

    // 6. Update email templates if provided
    if (Array.isArray(body.emailTemplates)) {
      for (const tmpl of body.emailTemplates) {
        if (tmpl.id && !isNaN(Number(tmpl.id))) {
          await db
            .update(emailTemplates)
            .set({
              subject: tmpl.subject,
              body: tmpl.bodySummary || tmpl.body,
              isActive: tmpl.enabled !== undefined ? Boolean(tmpl.enabled) : true,
              updatedAt: new Date(),
            })
            .where(eq(emailTemplates.id, Number(tmpl.id)));
        }
      }
    }

    const fullSettings = await buildFullSettings();

    return res.json({
      success: true,
      message: "Settings updated successfully",
      data: fullSettings,
    });
  } catch (error) {
    next(error);
  }
};


/* =====================================================
   TREATMENTS
===================================================== */

export const getTreatments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db
      .select()
      .from(treatments);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const createTreatment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Treatment name is required",
      });
    }

    const [result] = await db
      .insert(treatments)
      .values({
        name,
        description,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Treatment created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const updateTreatment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const [result] = await db
      .update(treatments)
      .set(req.body)
      .where(eq(treatments.id, id))
      .returning();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Treatment not found",
      });
    }

    res.json({
      success: true,
      message: "Treatment updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const deleteTreatment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const [result] = await db
      .update(treatments)
      .set({
        isActive: false,
      })
      .where(eq(treatments.id, id))
      .returning();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Treatment not found",
      });
    }

    res.json({
      success: true,
      message: "Treatment disabled successfully",
    });
  } catch (error) {
    next(error);
  }
};


/* =====================================================
   APPOINTMENT STATUSES
===================================================== */

export const getStatuses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db
      .select()
      .from(appointmentStatuses);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const createStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Status name is required",
      });
    }

    const [result] = await db
      .insert(appointmentStatuses)
      .values({ name })
      .returning();

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const [result] = await db
      .update(appointmentStatuses)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(appointmentStatuses.id, id))
      .returning();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Status not found",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const deleteStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    await db
      .update(appointmentStatuses)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(appointmentStatuses.id, id));

    res.json({
      success: true,
      message: "Status disabled successfully",
    });
  } catch (error) {
    next(error);
  }
};


/* =====================================================
   CONSULTATION TYPES
===================================================== */

export const getConsultationTypes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db
      .select()
      .from(consultationTypes);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const createConsultationType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description } = req.body;

    const [result] = await db
      .insert(consultationTypes)
      .values({
        name,
        description,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const updateConsultationType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const [result] = await db
      .update(consultationTypes)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(consultationTypes.id, id))
      .returning();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const deleteConsultationType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    await db
      .update(consultationTypes)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(consultationTypes.id, id));

    res.json({
      success: true,
      message: "Consultation type disabled",
    });
  } catch (error) {
    next(error);
  }
};


/* =====================================================
   WORKING HOURS
===================================================== */

export const getWorkingHours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db
      .select()
      .from(workingHours);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const updateWorkingHours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = req.body;

    for (const item of data) {
      if (item.id) {
        await db
          .update(workingHours)
          .set({
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            breakStart: item.breakStart,
            breakEnd: item.breakEnd,
            isWorking: item.isWorking,
            updatedAt: new Date(),
          })
          .where(eq(workingHours.id, item.id));
      } else {
        await db
          .insert(workingHours)
          .values(item);
      }
    }

    const result = await db
      .select()
      .from(workingHours);

    res.json({
      success: true,
      message: "Working hours updated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


/* =====================================================
   REMINDERS
===================================================== */

export const getReminders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db
      .select()
      .from(reminderSettings);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const createReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [result] = await db
      .insert(reminderSettings)
      .values(req.body)
      .returning();

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const updateReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const [result] = await db
      .update(reminderSettings)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(reminderSettings.id, id))
      .returning();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const deleteReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    await db
      .delete(reminderSettings)
      .where(eq(reminderSettings.id, id));

    res.json({
      success: true,
      message: "Reminder deleted",
    });
  } catch (error) {
    next(error);
  }
};


/* =====================================================
   EMAIL TEMPLATES
===================================================== */

export const getEmailTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await db
      .select()
      .from(emailTemplates);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const updateEmailTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const [result] = await db
      .update(emailTemplates)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Email template not found",
      });
    }

    res.json({
      success: true,
      message: "Email template updated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
