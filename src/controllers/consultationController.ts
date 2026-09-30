import { Response, NextFunction } from "express";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { db } from "../config/db";
import { consultations } from "../db/schema/consultation";
import { appointments } from "../db/schema/appointment";
import { doctor } from "../db/schema/doctor";
import { users } from "../db/schema/user";
import { AuthenticatedRequest } from "../middleware/auth";

// --------------------------------------------------
// POST /api/consultations
// Doctor / Admin: Create or update consultation record for an appointment
// --------------------------------------------------
export const createConsultation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      appointmentId,
      patientId: providedPatientId,
      doctorId: providedDoctorId,
      chiefComplaint,
      consultationFindings,
      diagnosis,
      recommendedTreatment,
      additionalInstructions,
      followUpRequired,
      followUpDate,
      internalNotes,
      isCompleted,
    } = req.body || {};

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
        error: "appointmentId is required",
      });
    }

    const parsedAppointmentId = parseInt(String(appointmentId), 10);
    if (isNaN(parsedAppointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Valid numeric Appointment ID is required",
        error: "Invalid appointmentId",
      });
    }

    // 1. Check if appointment exists
    const [appt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, parsedAppointmentId))
      .limit(1);

    if (!appt) {
      return res.status(404).json({
        success: false,
        message: `Appointment #${parsedAppointmentId} not found`,
        error: "Appointment not found",
      });
    }

    // 2. Resolve doctorId
    let resolvedDoctorId: number | null = null;
    if (req.user?.role === "doctor" && req.user.id) {
      resolvedDoctorId = req.user.id;
    } else if (providedDoctorId) {
      resolvedDoctorId = parseInt(String(providedDoctorId), 10);
    }

    if (!resolvedDoctorId || isNaN(resolvedDoctorId)) {
      // Find first doctor in system as default
      const [firstDoc] = await db.select({ id: doctor.id }).from(doctor).limit(1);
      resolvedDoctorId = firstDoc?.id || 1;
    }

    // 3. Resolve patientId (optional - null allowed if guest/unregistered)
    let resolvedPatientId: number | null = providedPatientId
      ? parseInt(String(providedPatientId), 10)
      : null;

    if (resolvedPatientId && !isNaN(resolvedPatientId)) {
      const [patientUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, resolvedPatientId))
        .limit(1);

      if (!patientUser) {
        resolvedPatientId = null;
      }
    }

    // Auto-match patient from appointment email if patientId is not provided
    if (!resolvedPatientId && appt.patientEmail) {
      const [patientUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, appt.patientEmail.trim().toLowerCase()))
        .limit(1);

      if (patientUser) {
        resolvedPatientId = patientUser.id;
      }
    }

    // 4. Determine completion status & timestamp
    const markCompleted = Boolean(isCompleted);
    const completedAt = markCompleted ? new Date() : null;

    // 5. Check if a consultation already exists for this appointment -> perform UPDATE (upsert)
    const [existingConsultation] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.appointmentId, parsedAppointmentId))
      .limit(1);

    if (existingConsultation) {
      const updateData: Partial<typeof consultations.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (chiefComplaint !== undefined) {
        updateData.chiefComplaint = chiefComplaint ? String(chiefComplaint).trim() : null;
      }
      if (consultationFindings !== undefined) {
        updateData.consultationFindings = consultationFindings ? String(consultationFindings).trim() : null;
      }
      if (diagnosis !== undefined) {
        updateData.diagnosis = diagnosis ? String(diagnosis).trim() : null;
      }
      if (recommendedTreatment !== undefined) {
        updateData.recommendedTreatment = recommendedTreatment ? String(recommendedTreatment).trim() : null;
      }
      if (additionalInstructions !== undefined) {
        updateData.additionalInstructions = additionalInstructions ? String(additionalInstructions).trim() : null;
      }
      if (followUpRequired !== undefined) {
        updateData.followUpRequired = Boolean(followUpRequired);
      }
      if (followUpDate !== undefined) {
        updateData.followUpDate = followUpDate || null;
      }
      if (internalNotes !== undefined) {
        updateData.internalNotes = internalNotes ? String(internalNotes).trim() : null;
      }
      if (resolvedPatientId && !existingConsultation.patientId) {
        updateData.patientId = resolvedPatientId;
      }

      if (isCompleted !== undefined) {
        updateData.isCompleted = markCompleted;
        if (markCompleted && !existingConsultation.isCompleted) {
          updateData.completedAt = new Date();
          await db
            .update(appointments)
            .set({ status: "completed" })
            .where(eq(appointments.id, parsedAppointmentId));
        } else if (!markCompleted) {
          updateData.completedAt = null;
        }
      }

      const [updatedRecord] = await db
        .update(consultations)
        .set(updateData)
        .where(eq(consultations.id, existingConsultation.id))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Consultation updated successfully",
        data: updatedRecord,
      });
    }

    // 6. Insert new consultation record
    const [newConsultation] = await db
      .insert(consultations)
      .values({
        appointmentId: parsedAppointmentId,
        doctorId: resolvedDoctorId,
        patientId: resolvedPatientId,
        chiefComplaint: chiefComplaint ? String(chiefComplaint).trim() : null,
        consultationFindings: consultationFindings
          ? String(consultationFindings).trim()
          : null,
        diagnosis: diagnosis ? String(diagnosis).trim() : null,
        recommendedTreatment: recommendedTreatment
          ? String(recommendedTreatment).trim()
          : null,
        additionalInstructions: additionalInstructions
          ? String(additionalInstructions).trim()
          : null,
        followUpRequired: Boolean(followUpRequired),
        followUpDate: followUpDate || null,
        internalNotes: internalNotes ? String(internalNotes).trim() : null,
        isCompleted: markCompleted,
        completedAt,
        updatedAt: new Date(),
      })
      .returning();

    // 7. Update appointment status to 'completed' when consultation is finalized
    if (markCompleted && appt.status !== "completed") {
      await db
        .update(appointments)
        .set({ status: "completed" })
        .where(eq(appointments.id, parsedAppointmentId));
    }

    return res.status(201).json({
      success: true,
      message: "Consultation recorded successfully",
      data: newConsultation,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET /api/consultations/:id
// Get consultation by ID with full details
// --------------------------------------------------
export const getConsultationById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const consultationId = parseInt(rawId, 10);

    if (isNaN(consultationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consultation ID",
        error: "Invalid ID",
      });
    }

    const rows = await db
      .select({
        id: consultations.id,
        appointmentId: consultations.appointmentId,
        doctorId: consultations.doctorId,
        patientId: consultations.patientId,
        chiefComplaint: consultations.chiefComplaint,
        consultationFindings: consultations.consultationFindings,
        diagnosis: consultations.diagnosis,
        recommendedTreatment: consultations.recommendedTreatment,
        additionalInstructions: consultations.additionalInstructions,
        followUpRequired: consultations.followUpRequired,
        followUpDate: consultations.followUpDate,
        internalNotes: consultations.internalNotes,
        isCompleted: consultations.isCompleted,
        completedAt: consultations.completedAt,
        createdAt: consultations.createdAt,
        updatedAt: consultations.updatedAt,
        appointment: {
          id: appointments.id,
          patientName: appointments.patientName,
          patientEmail: appointments.patientEmail,
          phoneNumber: appointments.phoneNumber,
          contactMethod: appointments.contactMethod,
          tratmentType: appointments.tratmentType,
          preferredDate: appointments.preferredDate,
          preferredTime: appointments.preferredTime,
          status: appointments.status,
          additionalDescription: appointments.additionalDescription,
        },
        doctor: {
          id: doctor.id,
          name: doctor.doctorName,
          email: doctor.doctorEmail,
          specialization: doctor.specialization,
          phoneNumber: doctor.phoneNumber,
          avatar: doctor.doctorPhoto,
        },
        patient: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(consultations)
      .leftJoin(appointments, eq(consultations.appointmentId, appointments.id))
      .leftJoin(doctor, eq(consultations.doctorId, doctor.id))
      .leftJoin(users, eq(consultations.patientId, users.id))
      .where(eq(consultations.id, consultationId))
      .limit(1);

    const record = rows[0];

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Consultation #${consultationId} not found`,
        error: "Consultation not found",
      });
    }

    // Patient access check: if user is patient, verify it is their consultation
    if (req.user?.role === "patient") {
      const isOwner =
        (record.patient && record.patient.id === req.user.id) ||
        (record.appointment &&
          record.appointment.patientEmail?.toLowerCase() ===
            req.user.email?.toLowerCase());

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own consultation records.",
          error: "Forbidden",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// PUT /api/consultations/:id
// Update an existing consultation
// --------------------------------------------------
export const updateConsultation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const consultationId = parseInt(rawId, 10);

    if (isNaN(consultationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consultation ID",
        error: "Invalid ID",
      });
    }

    const [existing] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Consultation #${consultationId} not found`,
        error: "Consultation not found",
      });
    }

    const {
      chiefComplaint,
      consultationFindings,
      diagnosis,
      recommendedTreatment,
      additionalInstructions,
      followUpRequired,
      followUpDate,
      internalNotes,
      isCompleted,
    } = req.body || {};

    const updatePayload: Partial<typeof consultations.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (chiefComplaint !== undefined) {
      updatePayload.chiefComplaint = chiefComplaint ? String(chiefComplaint).trim() : null;
    }
    if (consultationFindings !== undefined) {
      updatePayload.consultationFindings = consultationFindings ? String(consultationFindings).trim() : null;
    }
    if (diagnosis !== undefined) {
      updatePayload.diagnosis = diagnosis ? String(diagnosis).trim() : null;
    }
    if (recommendedTreatment !== undefined) {
      updatePayload.recommendedTreatment = recommendedTreatment ? String(recommendedTreatment).trim() : null;
    }
    if (additionalInstructions !== undefined) {
      updatePayload.additionalInstructions = additionalInstructions ? String(additionalInstructions).trim() : null;
    }
    if (followUpRequired !== undefined) {
      updatePayload.followUpRequired = Boolean(followUpRequired);
    }
    if (followUpDate !== undefined) {
      updatePayload.followUpDate = followUpDate || null;
    }
    if (internalNotes !== undefined) {
      updatePayload.internalNotes = internalNotes ? String(internalNotes).trim() : null;
    }

    if (isCompleted !== undefined) {
      const markCompleted = Boolean(isCompleted);
      updatePayload.isCompleted = markCompleted;

      if (markCompleted && !existing.isCompleted) {
        updatePayload.completedAt = new Date();
        await db
          .update(appointments)
          .set({ status: "completed" })
          .where(eq(appointments.id, existing.appointmentId));
      } else if (!markCompleted) {
        updatePayload.completedAt = null;
      }
    }

    const [updatedRecord] = await db
      .update(consultations)
      .set(updatePayload)
      .where(eq(consultations.id, consultationId))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Consultation updated successfully",
      data: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET /api/doctors/me/consultations
// List consultations belonging to doctor
// --------------------------------------------------
export const getDoctorMyConsultations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        message: "Doctor authentication required",
        error: "Unauthorized",
      });
    }

    const {
      isCompleted,
      appointmentId,
      search,
      page = "1",
      limit = "50",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (req.user?.role === "doctor") {
      conditions.push(eq(consultations.doctorId, doctorId));
    }

    if (isCompleted !== undefined) {
      conditions.push(eq(consultations.isCompleted, isCompleted === "true"));
    }

    if (appointmentId) {
      const parsedApptId = parseInt(String(appointmentId), 10);
      if (!isNaN(parsedApptId)) {
        conditions.push(eq(consultations.appointmentId, parsedApptId));
      }
    }

    if (search && typeof search === "string" && search.trim()) {
      const pattern = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(consultations.diagnosis, pattern),
          ilike(consultations.chiefComplaint, pattern),
          ilike(consultations.consultationFindings, pattern),
          ilike(appointments.patientName, pattern),
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
        )!,
      );
    }

    const rows = await db
      .select({
        id: consultations.id,
        appointmentId: consultations.appointmentId,
        doctorId: consultations.doctorId,
        patientId: consultations.patientId,
        chiefComplaint: consultations.chiefComplaint,
        consultationFindings: consultations.consultationFindings,
        diagnosis: consultations.diagnosis,
        recommendedTreatment: consultations.recommendedTreatment,
        additionalInstructions: consultations.additionalInstructions,
        followUpRequired: consultations.followUpRequired,
        followUpDate: consultations.followUpDate,
        internalNotes: consultations.internalNotes,
        isCompleted: consultations.isCompleted,
        completedAt: consultations.completedAt,
        createdAt: consultations.createdAt,
        updatedAt: consultations.updatedAt,
        appointment: {
          id: appointments.id,
          patientName: appointments.patientName,
          patientEmail: appointments.patientEmail,
          phoneNumber: appointments.phoneNumber,
          tratmentType: appointments.tratmentType,
          preferredDate: appointments.preferredDate,
          preferredTime: appointments.preferredTime,
          status: appointments.status,
        },
        patient: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(consultations)
      .leftJoin(appointments, eq(consultations.appointmentId, appointments.id))
      .leftJoin(users, eq(consultations.patientId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(consultations.createdAt))
      .limit(limitNum)
      .offset(offset);

    return res.status(200).json({
      success: true,
      count: rows.length,
      page: pageNum,
      limit: limitNum,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET /api/consultations/appointment/:appointmentId
// Get consultation by appointment ID (accessible by doctor, admin, or patient owner)
// --------------------------------------------------
export const getConsultationByAppointmentId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawId = Array.isArray(req.params.appointmentId)
      ? req.params.appointmentId[0]
      : req.params.appointmentId;
    const appointmentId = parseInt(rawId, 10);

    if (isNaN(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
        error: "Invalid appointmentId",
      });
    }

    const rows = await db
      .select({
        id: consultations.id,
        appointmentId: consultations.appointmentId,
        doctorId: consultations.doctorId,
        patientId: consultations.patientId,
        chiefComplaint: consultations.chiefComplaint,
        consultationFindings: consultations.consultationFindings,
        diagnosis: consultations.diagnosis,
        recommendedTreatment: consultations.recommendedTreatment,
        additionalInstructions: consultations.additionalInstructions,
        followUpRequired: consultations.followUpRequired,
        followUpDate: consultations.followUpDate,
        internalNotes: consultations.internalNotes,
        isCompleted: consultations.isCompleted,
        completedAt: consultations.completedAt,
        createdAt: consultations.createdAt,
        updatedAt: consultations.updatedAt,
        appointment: {
          id: appointments.id,
          patientName: appointments.patientName,
          patientEmail: appointments.patientEmail,
          phoneNumber: appointments.phoneNumber,
          tratmentType: appointments.tratmentType,
          preferredDate: appointments.preferredDate,
          preferredTime: appointments.preferredTime,
          status: appointments.status,
        },
        doctor: {
          id: doctor.id,
          name: doctor.doctorName,
          email: doctor.doctorEmail,
          specialization: doctor.specialization,
        },
        patient: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(consultations)
      .leftJoin(appointments, eq(consultations.appointmentId, appointments.id))
      .leftJoin(doctor, eq(consultations.doctorId, doctor.id))
      .leftJoin(users, eq(consultations.patientId, users.id))
      .where(eq(consultations.appointmentId, appointmentId))
      .limit(1);

    const record = rows[0];

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `No consultation found for appointment #${appointmentId}`,
        error: "Not found",
      });
    }

    // Patient access check: if user is patient, verify it is their consultation
    if (req.user?.role === "patient") {
      const isOwner =
        (record.patient && record.patient.id === req.user.id) ||
        (record.appointment &&
          record.appointment.patientEmail?.toLowerCase() ===
            req.user.email?.toLowerCase());

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own consultation record.",
          error: "Forbidden",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};
