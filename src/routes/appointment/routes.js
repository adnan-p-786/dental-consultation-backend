"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../../config/db");
const appointment_1 = require("../../db/schema/appointmentBooking/appointment");
const router = (0, express_1.Router)();
router.get("/get-appointments", async (_reqequest, res, next) => {
    try {
        const allAppointments = await db_1.db.select().from(appointment_1.appointments);
        res.json({
            success: true,
            data: allAppointments,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
