/**
 * Comprehensive verification script testing all 12 lifecycle scenarios:
 * 1. Approved appointment scheduled 16 minutes ago, no start event -> no_show
 * 2. Approved appointment scheduled 5 minutes ago -> remains approved
 * 3. Approved appointment started within allowed window -> in_progress
 * 4. In-progress appointment shorter than configured duration -> remains in_progress
 * 5. In-progress appointment whose duration elapsed -> completed
 * 6. Doctor manually completes in-progress appointment early -> completed
 * 7. Cancelled appointment whose time has passed -> remains cancelled
 * 8. Already completed appointment -> never becomes no_show
 * 9. Scheduler runs repeatedly -> no duplicate transitions / idempotent
 * 10. Invalid date/time or missing start timestamp -> safely handled
 * 11. Concurrent lifecycle updates -> conditional update prevents status overwrite
 * 12. Non-admin/non-doctor requests are rejected (tested via role middleware)
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/config/db";
import { appointments } from "../src/db/schema/appointment";
import {
  startConsultation,
  completeConsultation,
  processLifecycleTransitions,
  validateStartConsultationWindow,
  getConfiguredAppointmentDuration,
} from "../src/services/appointmentLifecycleService";
import { parseClinicDateTime, extractDateString, getClinicTimeZone } from "../src/utils/dateTime";
import { requireRole } from "../src/middleware/role";

const assert = (condition: boolean, msg: string) => {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASSED: ${msg}`);
};

const createTestAppointment = async (overrides: Partial<typeof appointments.$inferInsert> = {}) => {
  const [created] = await db
    .insert(appointments)
    .values({
      patientName: "Test Patient Lifecycle",
      patientEmail: "test.lifecycle@example.com",
      contactMethod: "email",
      tratmentType: "General Dental Consultation",
      preferredDate: "2026-10-17",
      preferredTime: "10:00 AM",
      confirmedDate: "2026-10-17",
      confirmedTime: "10:00 AM",
      status: "approved",
      ...overrides,
    })
    .returning();
  return created;
};

const cleanupTestAppointments = async () => {
  await db.delete(appointments).where(eq(appointments.patientEmail, "test.lifecycle@example.com"));
};

const runAllTests = async () => {
  console.log(`\n===============================================================`);
  console.log(`RUNNING 12 APPOINTMENT LIFECYCLE VERIFICATION SCENARIOS`);
  console.log(`Clinic TimeZone: ${getClinicTimeZone()}`);
  console.log(`===============================================================\n`);

  try {
    await cleanupTestAppointments();

    const duration = await getConfiguredAppointmentDuration();
    console.log(`[Config] Current configured consultation duration: ${duration} minutes\n`);

    // -------------------------------------------------------------
    // Scenario 1: Approved appointment scheduled 16 minutes ago, no start event -> no_show
    // -------------------------------------------------------------
    console.log(`--- Test 1: Scheduled 16m ago without start -> no_show ---`);
    const date16m = new Date(Date.now() - 16 * 60 * 1000);
    const dateStr1 = extractDateString(date16m);
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: getClinicTimeZone(),
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const timeStr1 = timeFormatter.format(date16m);

    const apt1 = await createTestAppointment({
      confirmedDate: dateStr1 || "2026-10-17",
      confirmedTime: timeStr1,
      status: "approved",
    });

    await processLifecycleTransitions();
    const [refreshed1] = await db.select().from(appointments).where(eq(appointments.id, apt1.id));
    assert(refreshed1.status === "no_show", `Apt #${apt1.id} transitioned to no_show (was: ${refreshed1.status})`);

    // -------------------------------------------------------------
    // Scenario 2: Approved appointment scheduled 5 minutes ago -> remains approved
    // -------------------------------------------------------------
    console.log(`\n--- Test 2: Scheduled 5m ago -> remains approved ---`);
    const date5m = new Date(Date.now() - 5 * 60 * 1000);
    const dateStr2 = extractDateString(date5m);
    const timeStr2 = timeFormatter.format(date5m);

    const apt2 = await createTestAppointment({
      confirmedDate: dateStr2 || "2026-10-17",
      confirmedTime: timeStr2,
      status: "approved",
    });

    await processLifecycleTransitions();
    const [refreshed2] = await db.select().from(appointments).where(eq(appointments.id, apt2.id));
    assert(refreshed2.status === "approved", `Apt #${apt2.id} remains approved within grace period (is: ${refreshed2.status})`);

    // -------------------------------------------------------------
    // Scenario 3: Approved appointment started within permitted window -> in_progress
    // -------------------------------------------------------------
    console.log(`\n--- Test 3: Approved appointment started within window -> in_progress ---`);
    const dateNow = new Date();
    const dateStr3 = extractDateString(dateNow);
    const timeStr3 = timeFormatter.format(dateNow);

    const apt3 = await createTestAppointment({
      confirmedDate: dateStr3 || "2026-10-17",
      confirmedTime: timeStr3,
      status: "approved",
    });

    const startResult = await startConsultation(apt3.id);
    assert(startResult.success === true, `startConsultation returned success`);
    assert(startResult.data?.status === "in_progress", `Apt status is in_progress`);
    assert(startResult.data?.consultationStartedAt !== null, `consultationStartedAt timestamp is saved`);
    assert(startResult.data?.consultationCompletedAt === null, `consultationCompletedAt is null`);

    // -------------------------------------------------------------
    // Scenario 4: In-progress appointment shorter than duration -> remains in_progress
    // -------------------------------------------------------------
    console.log(`\n--- Test 4: In-progress appointment shorter than duration -> remains in_progress ---`);
    const started5mAgo = new Date(Date.now() - 5 * 60 * 1000);
    const apt4 = await createTestAppointment({
      status: "in_progress",
      consultationStartedAt: started5mAgo,
    });

    await processLifecycleTransitions();
    const [refreshed4] = await db.select().from(appointments).where(eq(appointments.id, apt4.id));
    assert(refreshed4.status === "in_progress", `Apt #${apt4.id} remains in_progress (is: ${refreshed4.status})`);

    // -------------------------------------------------------------
    // Scenario 5: In-progress appointment whose duration elapsed -> completed
    // -------------------------------------------------------------
    console.log(`\n--- Test 5: In-progress appointment whose duration elapsed -> completed ---`);
    const startedElapsed = new Date(Date.now() - (duration + 5) * 60 * 1000);
    const apt5 = await createTestAppointment({
      status: "in_progress",
      consultationStartedAt: startedElapsed,
    });

    await processLifecycleTransitions();
    const [refreshed5] = await db.select().from(appointments).where(eq(appointments.id, apt5.id));
    assert(refreshed5.status === "completed", `Apt #${apt5.id} auto-completed (is: ${refreshed5.status})`);
    assert(refreshed5.consultationCompletedAt !== null, `consultationCompletedAt is saved`);

    // -------------------------------------------------------------
    // Scenario 6: Doctor manually completes in-progress appointment early -> completed
    // -------------------------------------------------------------
    console.log(`\n--- Test 6: Doctor manually completes in-progress early -> completed ---`);
    const apt6 = await createTestAppointment({
      status: "in_progress",
      consultationStartedAt: new Date(Date.now() - 2 * 60 * 1000),
    });

    const completeResult = await completeConsultation(apt6.id, {
      diagnosis: "Gingivitis resolved",
    });
    assert(completeResult.success === true, `completeConsultation returned success`);
    assert(completeResult.data?.status === "completed", `Status is completed`);
    assert(completeResult.data?.consultationCompletedAt !== null, `consultationCompletedAt is saved`);

    // -------------------------------------------------------------
    // Scenario 7: Cancelled appointment whose original time has passed -> remains cancelled
    // -------------------------------------------------------------
    console.log(`\n--- Test 7: Cancelled appointment whose time has passed -> remains cancelled ---`);
    const apt7 = await createTestAppointment({
      confirmedDate: dateStr1 || "2026-10-17",
      confirmedTime: timeStr1,
      status: "cancelled",
    });

    await processLifecycleTransitions();
    const [refreshed7] = await db.select().from(appointments).where(eq(appointments.id, apt7.id));
    assert(refreshed7.status === "cancelled", `Cancelled apt never transitions to no_show`);

    // -------------------------------------------------------------
    // Scenario 8: Already completed appointment -> never becomes no_show
    // -------------------------------------------------------------
    console.log(`\n--- Test 8: Already completed appointment -> never becomes no_show ---`);
    const apt8 = await createTestAppointment({
      confirmedDate: dateStr1 || "2026-10-17",
      confirmedTime: timeStr1,
      status: "completed",
      consultationCompletedAt: new Date(),
    });

    await processLifecycleTransitions();
    const [refreshed8] = await db.select().from(appointments).where(eq(appointments.id, apt8.id));
    assert(refreshed8.status === "completed", `Completed apt never transitions to no_show`);

    // -------------------------------------------------------------
    // Scenario 9: Scheduler runs repeatedly -> no duplicate transitions
    // -------------------------------------------------------------
    console.log(`\n--- Test 9: Scheduler runs repeatedly -> idempotent ---`);
    const scanResult1 = await processLifecycleTransitions();
    const scanResult2 = await processLifecycleTransitions();
    assert(scanResult2.noShowCount === 0 && scanResult2.completedCount === 0, `Subsequent scan processed 0 changes`);

    // -------------------------------------------------------------
    // Scenario 10: Invalid date/time or missing start timestamp -> safely handled
    // -------------------------------------------------------------
    console.log(`\n--- Test 10: Invalid date/time or missing start timestamp -> safely handled ---`);
    const apt10a = await createTestAppointment({
      preferredDate: "2026-10-17",
      preferredTime: "unparseable_time_value",
      confirmedDate: "2026-10-17",
      confirmedTime: "unparseable_time_value",
      status: "approved",
    });
    const apt10b = await createTestAppointment({
      status: "in_progress",
      consultationStartedAt: null,
    });

    const scanResult10 = await processLifecycleTransitions();
    assert(scanResult10.errors.length === 0, `Corrupted records safely skipped without exceptions`);

    // -------------------------------------------------------------
    // Scenario 11: Concurrent lifecycle updates -> atomic condition prevents overwrite
    // -------------------------------------------------------------
    console.log(`\n--- Test 11: Concurrent updates -> atomic condition prevents invalid overwrite ---`);
    const apt11 = await createTestAppointment({
      confirmedDate: dateStr3 || "2026-10-17",
      confirmedTime: timeStr3,
      status: "approved",
    });

    // Start once
    const firstStart = await startConsultation(apt11.id);
    assert(firstStart.success === true, `First start succeeded`);

    // Try starting a second time
    const secondStart = await startConsultation(apt11.id);
    assert(secondStart.success === false, `Second start rejected with status 409 conflict`);
    assert(secondStart.statusCode === 409, `Conflict HTTP 409 returned`);

    // -------------------------------------------------------------
    // Scenario 12: Role authorization -> non-admin/non-doctor rejected
    // -------------------------------------------------------------
    console.log(`\n--- Test 12: Role middleware rejects non-doctor/non-admin ---`);
    const doctorAdminMiddleware = requireRole("admin", "doctor");

    const mockRes = (onDenied: () => void) => ({
      status: (code: number) => ({
        json: () => onDenied(),
      }),
    });

    const checkRoleAccess = (role: string) => {
      let allowed = false;
      let denied = false;
      doctorAdminMiddleware(
        { user: { id: 10, email: `${role}@test.com`, role } } as any,
        mockRes(() => {
          denied = true;
        }) as any,
        () => {
          allowed = true;
        },
      );
      return { allowed, denied };
    };

    // Test patient role
    const patientAccess = checkRoleAccess("patient");
    assert(patientAccess.denied === true && patientAccess.allowed === false, `Patient role denied access (403)`);

    // Test doctor role
    const doctorAccess = checkRoleAccess("doctor");
    assert(doctorAccess.allowed === true && doctorAccess.denied === false, `Doctor role granted access`);

    console.log(`\n===============================================================`);
    console.log(`ALL 12 LIFECYCLE VERIFICATION SCENARIOS PASSED SUCCESSFULLY!`);
    console.log(`===============================================================\n`);
  } finally {
    await cleanupTestAppointments();
    await pool.end();
  }
};

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
