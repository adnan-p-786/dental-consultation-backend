import { Router, Request, Response, NextFunction } from "express";

import { db } from "../../config/db";
import { appointments } from "../../db/schema/appointmentBooking/appointment";

import { eq } from "drizzle-orm";

const router = Router();




router.get("/get-appointments",async (_reqequest, res: Response, next: NextFunction) => {
    try {
      const allAppointments = await db.select().from(appointments);

      res.json({
        success: true,
        data: allAppointments,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;