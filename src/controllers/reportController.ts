import { Response, NextFunction } from "express";
import { eq, desc, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { db } from "../config/db";
import { appointments } from "../db/schema/appointment";
import { consultations } from "../db/schema/consultation";
import { doctor } from "../db/schema/doctor";
import { reports } from "../db/schema/report";
import { users } from "../db/schema/user";
import { AuthenticatedRequest } from "../middleware/auth";

// ----------------------------------------------------
// Helper: Format month key into human-readable label
// ----------------------------------------------------
const formatMonthLabel = (monthKey: string): string => {
  const parts = monthKey.split("-");
  if (parts.length < 2) return monthKey;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

// ----------------------------------------------------
// Helper: Filter appointments based on query parameters
// (PDF Section 11: Search & Filters)
// ----------------------------------------------------
const filterAppointmentRows = (
  rows: any[],
  query: {
    search?: string;
    patientName?: string;
    email?: string;
    phone?: string;
    appointmentId?: string;
    doctor?: string;
    treatment?: string;
    status?: string;
    consultationType?: string;
    startDate?: string;
    endDate?: string;
    month?: string;
  }
) => {
  return rows.filter((apt) => {
    // 1. Universal Search (Patient name, email, phone, appointment ID)
    if (query.search) {
      const q = query.search.trim().toLowerCase();
      const matchesSearch =
        String(apt.id).includes(q) ||
        (apt.patientName || "").toLowerCase().includes(q) ||
        (apt.patientEmail || "").toLowerCase().includes(q) ||
        (apt.phoneNumber || "").toLowerCase().includes(q) ||
        (apt.assignedDoctorName || "").toLowerCase().includes(q) ||
        (apt.tratmentType || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;
    }

    // 2. Specific field filters
    if (
      query.patientName &&
      !(apt.patientName || "")
        .toLowerCase()
        .includes(query.patientName.trim().toLowerCase())
    ) {
      return false;
    }

    if (
      query.email &&
      !(apt.patientEmail || "")
        .toLowerCase()
        .includes(query.email.trim().toLowerCase())
    ) {
      return false;
    }

    if (
      query.phone &&
      !(apt.phoneNumber || "")
        .toLowerCase()
        .includes(query.phone.trim().toLowerCase())
    ) {
      return false;
    }

    if (
      query.appointmentId &&
      String(apt.id) !== String(query.appointmentId).trim()
    ) {
      return false;
    }

    if (query.doctor && query.doctor !== "all") {
      const docFilter = query.doctor.trim().toLowerCase();
      const docName = (apt.assignedDoctorName || "").toLowerCase();
      const docId = String(apt.assignedDoctorId || "").toLowerCase();
      if (!docName.includes(docFilter) && docId !== docFilter) {
        return false;
      }
    }

    if (query.treatment && query.treatment !== "all") {
      const treatFilter = query.treatment.trim().toLowerCase();
      if (!(apt.tratmentType || "").toLowerCase().includes(treatFilter)) {
        return false;
      }
    }

    if (query.status && query.status !== "all") {
      const statusFilter = query.status.trim().toLowerCase();
      if ((apt.status || "").toLowerCase() !== statusFilter) {
        return false;
      }
    }

    // 3. Date filtering
    const aptDateStr = apt.confirmedDate || apt.preferredDate || "";
    if (query.startDate) {
      if (!aptDateStr || aptDateStr < query.startDate) return false;
    }
    if (query.endDate) {
      if (!aptDateStr || aptDateStr > query.endDate) return false;
    }
    if (query.month) {
      if (!aptDateStr || !aptDateStr.startsWith(query.month)) return false;
    }

    return true;
  });
};

// ----------------------------------------------------
// Helper: Compute full metrics object
// (PDF Section 11: Reports & Analytics)
// ----------------------------------------------------
const computeAnalyticsMetrics = (filteredRows: any[]) => {
  const totalAppointments = filteredRows.length;

  let completedConsultations = 0;
  let approvedAppointments = 0;
  let pendingAppointments = 0;
  let cancelledAppointments = 0;
  let noShowAppointments = 0;
  let onlineConsultations = 0;

  const treatmentCounts: Record<string, number> = {};
  const doctorCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const monthStatsMap: Record<
    string,
    { total: number; completed: number; cancelled: number }
  > = {};

  filteredRows.forEach((apt) => {
    const rawStatus = (apt.status || "pending").toLowerCase();
    statusCounts[rawStatus] = (statusCounts[rawStatus] || 0) + 1;

    // Check completed
    if (rawStatus === "completed" || apt.consultationCompleted) {
      completedConsultations++;
    } else if (rawStatus === "approved") {
      approvedAppointments++;
    } else if (rawStatus === "cancelled") {
      cancelledAppointments++;
    } else if (rawStatus === "no_show" || rawStatus === "no-show") {
      noShowAppointments++;
    } else {
      pendingAppointments++;
    }

    // Online consultations (all consultations in system are online consultations)
    onlineConsultations++;

    // Treatments breakdown
    const treatmentName = apt.tratmentType || "General Consultation";
    treatmentCounts[treatmentName] =
      (treatmentCounts[treatmentName] || 0) + 1;

    // Doctor breakdown
    const docName = apt.assignedDoctorName
      ? apt.assignedDoctorName.replace(/^Dr\.\s*/i, "Dr. ")
      : "Unassigned";
    doctorCounts[docName] = (doctorCounts[docName] || 0) + 1;

    // Monthly breakdown
    const dateStr = apt.confirmedDate || apt.preferredDate || "";
    let monthKey = "Unknown";
    if (dateStr && dateStr.length >= 7) {
      monthKey = dateStr.slice(0, 7); // e.g. "2026-09"
    } else if (apt.createdAt) {
      try {
        monthKey = new Date(apt.createdAt).toISOString().slice(0, 7);
      } catch {
        monthKey = "Unknown";
      }
    }

    if (!monthStatsMap[monthKey]) {
      monthStatsMap[monthKey] = { total: 0, completed: 0, cancelled: 0 };
    }
    monthStatsMap[monthKey].total++;
    if (rawStatus === "completed") {
      monthStatsMap[monthKey].completed++;
    } else if (rawStatus === "cancelled") {
      monthStatsMap[monthKey].cancelled++;
    }
  });

  const completionRate =
    totalAppointments > 0
      ? Math.round(
          ((completedConsultations + approvedAppointments) /
            totalAppointments) *
            100,
        )
      : 0;

  const cancelRate =
    totalAppointments > 0
      ? Math.round((cancelledAppointments / totalAppointments) * 100)
      : 0;

  // Format appointmentsByTreatment
  const appointmentsByTreatment = Object.entries(treatmentCounts)
    .map(([treatment, count]) => ({
      treatment,
      count,
      percentage:
        totalAppointments > 0
          ? Math.round((count / totalAppointments) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Format appointmentsByDoctor
  const appointmentsByDoctor = Object.entries(doctorCounts)
    .map(([doctorName, count]) => ({
      doctorName,
      count,
      percentage:
        totalAppointments > 0
          ? Math.round((count / totalAppointments) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Format appointmentsByMonth
  const appointmentsByMonth = Object.entries(monthStatsMap)
    .filter(([key]) => key !== "Unknown")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: formatMonthLabel(month),
      total: data.total,
      completed: data.completed,
      cancelled: data.cancelled,
    }));

  // Format appointmentStatusStatistics
  const appointmentStatusStatistics = Object.entries(statusCounts)
    .map(([status, count]) => ({
      status,
      count,
      percentage:
        totalAppointments > 0
          ? Math.round((count / totalAppointments) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAppointments,
    completedConsultations,
    approvedAppointments,
    pendingAppointments,
    cancelledAppointments,
    noShowAppointments,
    onlineConsultations,
    completionRate,
    cancelRate,
    appointmentsByTreatment,
    appointmentsByDoctor,
    appointmentsByMonth,
    appointmentStatusStatistics,
  };
};

// ====================================================
// 1. GET ANALYTICS & FILTERED REPORT
// GET /api/reports/analytics
// (PDF Section 11: Search, Filtering & Reports)
// ====================================================
export const getAnalyticsReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawAppointments = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.id));

    // Optional join with consultations to mark completed consultations accurately
    const allConsultations = await db.select().from(consultations);
    const consultationByAptId = new Map<number, boolean>();
    allConsultations.forEach((c) => {
      consultationByAptId.set(c.appointmentId, Boolean(c.isCompleted));
    });

    const enriched = rawAppointments.map((apt) => ({
      ...apt,
      consultationCompleted: consultationByAptId.get(apt.id) || false,
    }));

    // Apply filtering as per Section 11
    const filtered = filterAppointmentRows(enriched, req.query as any);
    const metrics = computeAnalyticsMetrics(filtered);

    return res.status(200).json({
      success: true,
      data: {
        metrics,
        filters: req.query,
        filteredCount: filtered.length,
        appointments: filtered,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================================================
// 2. EXPORT REPORT AS CSV
// GET /api/reports/export
// ====================================================
export const exportReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawAppointments = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.id));

    const filtered = filterAppointmentRows(rawAppointments, req.query as any);

    const headers = [
      "Appointment ID",
      "Patient Name",
      "Email Address",
      "Phone Number",
      "Contact Method",
      "Treatment",
      "Preferred Date",
      "Preferred Time",
      "Confirmed Date",
      "Confirmed Time",
      "Assigned Doctor",
      "Status",
      "Meeting Link",
      "Created At",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [
      headers.join(","),
      ...filtered.map((apt) =>
        [
          apt.id,
          escapeCsv(apt.patientName),
          escapeCsv(apt.patientEmail),
          escapeCsv(apt.phoneNumber || ""),
          escapeCsv(apt.contactMethod || ""),
          escapeCsv(apt.tratmentType || ""),
          escapeCsv(apt.preferredDate || ""),
          escapeCsv(apt.preferredTime || ""),
          escapeCsv(apt.confirmedDate || ""),
          escapeCsv(apt.confirmedTime || ""),
          escapeCsv(apt.assignedDoctorName || "Unassigned"),
          escapeCsv(apt.status || "pending"),
          escapeCsv(apt.meetingLink || ""),
          escapeCsv(apt.createdAt ? new Date(apt.createdAt).toISOString() : ""),
        ].join(","),
      ),
    ];

    const csvData = csvLines.join("\n");
    const filename = `dental_report_${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

// ====================================================
// 3. GENERATE & SAVE REPORT SNAPSHOT
// POST /api/reports/generate | POST /api/reports/save
// ====================================================
export const saveReportSnapshot = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id ? Number(req.user.id) : undefined;
    const {
      title,
      description,
      reportType = "appointments_summary",
      filters = {},
      customMetrics,
    } = req.body || {};

    let metricsToSave = customMetrics;

    if (!metricsToSave) {
      const rawAppointments = await db
        .select()
        .from(appointments)
        .orderBy(desc(appointments.id));

      const filtered = filterAppointmentRows(rawAppointments, filters);
      metricsToSave = computeAnalyticsMetrics(filtered);
    }

    const reportTitle =
      title?.trim() ||
      `Consultation Report (${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })})`;

    let validUserId: number | null = null;
    if (userId) {
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (existingUser) validUserId = existingUser.id;
    }

    const [savedReport] = await db
      .insert(reports)
      .values({
        title: reportTitle,
        reportType,
        description: description?.trim() || null,
        filters,
        metrics: metricsToSave,
        generatedBy: validUserId,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Report snapshot saved successfully",
      data: savedReport,
    });
  } catch (error) {
    next(error);
  }
};

// ====================================================
// 4. GET ALL SAVED REPORTS
// GET /api/reports
// ====================================================
export const getAllSavedReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rows = await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt));

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

// ====================================================
// 5. GET SAVED REPORT BY ID
// GET /api/reports/:id
// ====================================================
export const getSavedReportById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id));

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ====================================================
// 6. DELETE SAVED REPORT
// DELETE /api/reports/:id
// ====================================================
export const deleteSavedReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const [deleted] = await db
      .delete(reports)
      .where(eq(reports.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report snapshot deleted successfully",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};
