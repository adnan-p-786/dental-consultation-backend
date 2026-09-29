import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { appointments } from "../db/schema/appointmentBooking/appointment";
import { sendAppointmentReminderNotification } from "./emailService";

export interface ReminderSchedulerConfig {
  enabled: boolean;
  instantAckEnabled: boolean;
  reminder24hEnabled: boolean;
  reminder24hHours: number; // e.g. 24, 48, 12
  reminder1hEnabled: boolean;
  reminder1hMinutes: number; // e.g. 60, 120, 30
  emailEnabled: boolean;
  smsEnabled: boolean;
  checkIntervalSeconds: number;
}

const DATA_DIR = path.resolve(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "reminder_config.json");
const LOGS_FILE = path.join(DATA_DIR, "reminder_logs.json");

const defaultConfig: ReminderSchedulerConfig = {
  enabled: true,
  instantAckEnabled: true,
  reminder24hEnabled: true,
  reminder24hHours: 24,
  reminder1hEnabled: true,
  reminder1hMinutes: 60,
  emailEnabled: true,
  smsEnabled: false,
  checkIntervalSeconds: 60,
};

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

export const getReminderConfig = (): ReminderSchedulerConfig => {
  try {
    ensureDataDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...defaultConfig, ...JSON.parse(content) };
    }
  } catch (err) {
    console.error("Failed to read reminder config, using defaults:", err);
  }
  return defaultConfig;
};

export const saveReminderConfig = (
  updates: Partial<ReminderSchedulerConfig>,
): ReminderSchedulerConfig => {
  try {
    ensureDataDir();
    const current = getReminderConfig();
    const merged = { ...current, ...updates };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  } catch (err) {
    console.error("Failed to save reminder config:", err);
    return getReminderConfig();
  }
};

const getReminderLogs = (): Record<string, string> => {
  try {
    ensureDataDir();
    if (fs.existsSync(LOGS_FILE)) {
      const content = fs.readFileSync(LOGS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read reminder logs:", err);
  }
  return {};
};

const saveReminderLogs = (logs: Record<string, string>) => {
  try {
    ensureDataDir();
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save reminder logs:", err);
  }
};

/**
 * Parses appointment date and time strings into a concrete Date object.
 */
export const parseAppointmentDateTime = (
  dateVal: string | Date,
  timeStr?: string | null,
): Date => {
  let datePart = "";
  if (dateVal instanceof Date) {
    datePart = dateVal.toISOString().split("T")[0];
  } else if (typeof dateVal === "string") {
    datePart = dateVal.includes("T") ? dateVal.split("T")[0] : dateVal.trim();
  }

  let hours = 10;
  let minutes = 0;

  if (timeStr) {
    const raw = timeStr.trim().toLowerCase();
    if (raw === "morning") {
      hours = 9;
      minutes = 0;
    } else if (raw === "afternoon") {
      hours = 14;
      minutes = 0;
    } else if (raw === "evening") {
      hours = 17;
      minutes = 0;
    } else {
      // Matches "10:30 AM", "2:15 pm", "14:00"
      const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const meridiem = match[3]?.toLowerCase();

        if (meridiem === "pm" && h < 12) h += 12;
        if (meridiem === "am" && h === 12) h = 0;

        hours = h;
        minutes = m;
      }
    }
  }

  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  return new Date(year, month, day, hours, minutes, 0, 0);
};

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Scans all approved appointments and automatically sends 24h and 1h reminders.
 */
export const checkAndSendAutomaticReminders = async (): Promise<{
  checkedCount: number;
  remindersSent: number;
}> => {
  const config = getReminderConfig();
  if (!config.enabled) {
    return { checkedCount: 0, remindersSent: 0 };
  }

  try {
    const approvedApts = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, "approved"));

    const logs = getReminderLogs();
    const now = Date.now();
    let remindersSent = 0;

    const advanceHours = config.reminder24hHours || 24;
    const urgentHours = (config.reminder1hMinutes || 60) / 60;

    for (const apt of approvedApts) {
      if (!apt.patientEmail || !apt.preferredDate) continue;

      const consultationDate = parseAppointmentDateTime(
        apt.preferredDate,
        apt.preferredTime,
      );
      const consultationTime = consultationDate.getTime();
      const msUntil = consultationTime - now;
      const hoursUntil = msUntil / (1000 * 60 * 60);

      // Skip past consultations
      if (hoursUntil <= 0) continue;

      // 1. Advance Reminder (e.g. 24 Hours Prior)
      // Trigger if within configured advance window (e.g. <= 24 hours and > urgent window)
      const advanceKey = `${apt.id}_adv_${advanceHours}h`;
      if (
        config.reminder24hEnabled &&
        hoursUntil <= advanceHours &&
        hoursUntil > urgentHours &&
        !logs[advanceKey]
      ) {
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
              reminderType: "24_hour",
              customHours: advanceHours,
            },
          );
          logs[advanceKey] = new Date().toISOString();
          saveReminderLogs(logs);
          remindersSent++;
          console.log(
            `[Auto-Reminder Scheduler] Automatically dispatched ${advanceHours}h reminder to ${apt.patientEmail} for appointment #${apt.id}`,
          );
        } catch (mailErr) {
          console.error(
            `[Auto-Reminder Scheduler] Failed to send advance reminder for #${apt.id}:`,
            mailErr,
          );
        }
      }

      // 2. Urgent Reminder (e.g. 1 Hour Prior)
      // Trigger if within configured urgent window (e.g. <= 1 hour and > 0)
      const urgentKey = `${apt.id}_urg_${Math.round(urgentHours * 60)}m`;
      if (
        config.reminder1hEnabled &&
        hoursUntil <= urgentHours &&
        hoursUntil > 0 &&
        !logs[urgentKey]
      ) {
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
              reminderType: "1_hour",
            },
          );
          logs[urgentKey] = new Date().toISOString();
          saveReminderLogs(logs);
          remindersSent++;
          console.log(
            `[Auto-Reminder Scheduler] Automatically dispatched urgent 1h reminder to ${apt.patientEmail} for appointment #${apt.id}`,
          );
        } catch (mailErr) {
          console.error(
            `[Auto-Reminder Scheduler] Failed to send urgent reminder for #${apt.id}:`,
            mailErr,
          );
        }
      }
    }

    return { checkedCount: approvedApts.length, remindersSent };
  } catch (err) {
    console.error("[Auto-Reminder Scheduler] Error running reminder scan:", err);
    return { checkedCount: 0, remindersSent: 0 };
  }
};

/**
 * Starts the automatic background reminder scheduler.
 */
export const startAutomaticReminderScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  const config = getReminderConfig();
  const intervalMs = (config.checkIntervalSeconds || 60) * 1000;

  console.log(
    `[Auto-Reminder Scheduler] Started background daemon. Checking every ${config.checkIntervalSeconds || 60}s for automated 24h & 1h consultation reminders.`,
  );

  // Initial scan 5 seconds after server boot
  setTimeout(() => {
    checkAndSendAutomaticReminders().catch((err) =>
      console.error("[Auto-Reminder Scheduler] Initial run error:", err),
    );
  }, 5000);

  // Periodic recurring scan
  schedulerInterval = setInterval(() => {
    checkAndSendAutomaticReminders().catch((err) =>
      console.error("[Auto-Reminder Scheduler] Periodic run error:", err),
    );
  }, intervalMs);
};

export const stopAutomaticReminderScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Auto-Reminder Scheduler] Stopped background daemon.");
  }
};
