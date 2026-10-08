import {
  pgTable,
  serial,
  varchar,
  time,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const workingHours = pgTable("working_hours", {
  id: serial("id").primaryKey(),

  dayOfWeek: varchar("day_of_week", {
    length: 20,
  }).notNull(),

  startTime: time("start_time").notNull(),

  endTime: time("end_time").notNull(),

  breakStart: time("break_start"),

  breakEnd: time("break_end"),

  isWorking: boolean("is_working")
    .notNull()
    .default(true),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});
