/**
 * Clinic timezone and appointment date-time handling utilities.
 * Ensures consistent Asia/Kolkata (or configured CLINIC_TIMEZONE) calculations
 * without relying blindly on machine local timezone or introducing external libraries.
 */

export const getClinicTimeZone = (): string => {
  return process.env.CLINIC_TIMEZONE?.trim() || "Asia/Kolkata";
};

/**
 * Extracts a normalized YYYY-MM-DD date string from various input forms
 * (string or Date), ensuring no UTC date shifting occurs.
 */
export const extractDateString = (
  dateVal: string | Date | null | undefined,
  timeZone = getClinicTimeZone(),
): string | null => {
  if (!dateVal) return null;

  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;
    if (trimmed.includes("T")) {
      const datePart = trimmed.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    }
    const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, "0");
      const d = match[3].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      // en-CA produces YYYY-MM-DD
      return formatter.format(dateVal);
    } catch {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, "0");
      const d = String(dateVal.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  return null;
};

export interface ParsedTime {
  hours: number;
  minutes: number;
}

/**
 * Parses time strings in 12-hour (AM/PM), 24-hour, or preset formats.
 */
export const parseTimeString = (timeStr?: string | null): ParsedTime => {
  let hours = 10;
  let minutes = 0;

  if (!timeStr || typeof timeStr !== "string") {
    return { hours, minutes };
  }

  const raw = timeStr.trim().toLowerCase();

  if (raw === "morning") {
    return { hours: 9, minutes: 0 };
  }
  if (raw === "afternoon") {
    return { hours: 14, minutes: 0 };
  }
  if (raw === "evening") {
    return { hours: 17, minutes: 0 };
  }

  // Matches "10:30 AM", "2:15 pm", "14:00", "09:45"
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(?:\s*([ap]m))?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;

    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      hours = h;
      minutes = m;
    }
  }

  return { hours, minutes };
};

/**
 * Converts a scheduled date and time into an absolute UTC Date instant
 * representing that exact calendar moment in the clinic's timezone.
 */
export const parseClinicDateTime = (
  dateVal: string | Date | null | undefined,
  timeStr?: string | null,
  timeZone = getClinicTimeZone(),
): Date | null => {
  const dateStr = extractDateString(dateVal, timeZone);
  if (!dateStr) return null;

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const { hours, minutes } = parseTimeString(timeStr);

  try {
    // 1. Initial naive timestamp as if UTC
    const naiveUtc = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

    // 2. Discover the target timezone offset at that instant
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date(naiveUtc));
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    const localAsUtc = Date.UTC(
      parseInt(partMap.year, 10),
      parseInt(partMap.month, 10) - 1,
      parseInt(partMap.day, 10),
      parseInt(partMap.hour, 10) % 24,
      parseInt(partMap.minute, 10),
      parseInt(partMap.second, 10),
    );

    const offsetMs = localAsUtc - naiveUtc;
    const targetUtcTimestamp = naiveUtc - offsetMs;

    return new Date(targetUtcTimestamp);
  } catch (err) {
    console.error("Failed to parse clinic date/time:", err);
    return null;
  }
};
