import {
  processLifecycleTransitions,
  seedDefaultAppointmentStatuses,
} from "./appointmentLifecycleService";

/**
 * Frequency of background lifecycle scan (runs every 30 seconds)
 */
export const LIFECYCLE_CHECK_INTERVAL_SECONDS = 30;

let schedulerInterval: NodeJS.Timeout | null = null;
let initialTimeout: NodeJS.Timeout | null = null;
let isRunning = false;
let isProcessing = false;

/**
 * Executes a single atomic lifecycle scan safely.
 * Prevents overlapping runs if a previous run takes longer than the interval.
 */
export const runLifecycleCheck = async (): Promise<void> => {
  if (isProcessing) {
    console.log(
      "[Lifecycle Scheduler] Previous scan still in progress. Skipping overlapping run.",
    );
    return;
  }

  isProcessing = true;
  try {
    const result = await processLifecycleTransitions();
    if (result.noShowCount > 0 || result.completedCount > 0) {
      console.log(
        `[Lifecycle Scheduler] Scan completed: ${result.noShowCount} marked no_show, ${result.completedCount} marked completed.`,
      );
    }
  } catch (err) {
    console.error(
      "[Lifecycle Scheduler] Uncaught error during lifecycle scan:",
      err,
    );
  } finally {
    isProcessing = false;
  }
};

/**
 * Starts the automatic background appointment lifecycle daemon.
 * Ensures idempotent timer initialization.
 */
export const startAppointmentLifecycleScheduler = (): void => {
  if (isRunning || schedulerInterval) {
    console.warn(
      "[Lifecycle Scheduler] Daemon is already active. Ignoring duplicate start request.",
    );
    return;
  }

  isRunning = true;
  const intervalMs = LIFECYCLE_CHECK_INTERVAL_SECONDS * 1000;

  console.log(
    `[Lifecycle Scheduler] Starting automatic daemon (polling every ${LIFECYCLE_CHECK_INTERVAL_SECONDS}s).`,
  );

  // 1. Initial seed of default canonical statuses
  seedDefaultAppointmentStatuses().catch((err) =>
    console.error("[Lifecycle Scheduler] Failed initial status seeding:", err),
  );

  // 2. Initial scan shortly after server start (3s)
  initialTimeout = setTimeout(() => {
    runLifecycleCheck().catch((err) =>
      console.error("[Lifecycle Scheduler] Initial run error:", err),
    );
  }, 3000);

  // 3. Periodic recurring scheduler
  schedulerInterval = setInterval(() => {
    runLifecycleCheck().catch((err) =>
      console.error("[Lifecycle Scheduler] Periodic run error:", err),
    );
  }, intervalMs);
};

/**
 * Gracefully stops the appointment lifecycle daemon.
 */
export const stopAppointmentLifecycleScheduler = (): void => {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  isRunning = false;
  isProcessing = false;
  console.log("[Lifecycle Scheduler] Gracefully stopped daemon.");
};
