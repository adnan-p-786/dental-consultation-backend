"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.appointments = (0, pg_core_1.pgTable)("appointments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    patientName: (0, pg_core_1.varchar)("patient_name", { length: 255 }).notNull(),
    patientEmail: (0, pg_core_1.varchar)("patient_email", { length: 255 }).notNull(),
    phoneNumber: (0, pg_core_1.varchar)("phone_number", { length: 50 }),
    contactMethod: (0, pg_core_1.varchar)("contact_method", { length: 10 }).notNull(),
    tratmentType: (0, pg_core_1.varchar)("tratment_type", { length: 100 }).notNull(),
    preferredDate: (0, pg_core_1.date)("preferred_date").notNull(),
    preferredTime: (0, pg_core_1.varchar)("preferred_time", { length: 50 }),
    additionalDescription: (0, pg_core_1.text)("additional_description"),
    supportingDocument: (0, pg_core_1.varchar)("supporting_document", { length: 500 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
