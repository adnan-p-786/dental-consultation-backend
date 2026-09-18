"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.userRole = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.userRole = (0, pg_core_1.pgEnum)("user_role", ["patient", "doctor", "admin"]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    phoneNumber: (0, pg_core_1.varchar)("phone_number", { length: 10 }).notNull(),
    role: (0, exports.userRole)("role").notNull().default("patient"),
    password: (0, pg_core_1.varchar)("password", { length: 8 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
