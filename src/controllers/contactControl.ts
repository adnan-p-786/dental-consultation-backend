import { Request, Response, NextFunction } from "express";
import db from "../db";
import { contact } from "../db/schema";

export const getAllContact = async (req: Request,res: Response,next: NextFunction) => {
    try {
        const AllContact = await db.select().from(contact);
        return res.json({
            success: true,
            data: AllContact,
        });
    } catch (error) {
        next(error);
    }
}


export const createContact = async (req: Request,res: Response,next: NextFunction) => {
    try {
        const {name,email,subject,message} = req.body;
        const rawPhone = req.body.phoneNumber || req.body.phone;

        if (!name || !email || !rawPhone || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // Clean phone number (strip non-digits, drop 91 prefix if 12 digits)
        let cleanPhone = String(rawPhone).replace(/\D/g, "");
        if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
            cleanPhone = cleanPhone.slice(2);
        }
        const phoneNumber = cleanPhone.length > 0 ? cleanPhone.slice(-10) : String(rawPhone).slice(0, 10);

        const newContact = await db.insert(contact).values({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber,
            subject: subject.trim(),
            message: message.trim(),
        });
        return res.json({
            success: true,
            toast: "Message sent successfully",
            data: newContact,
        });
    } catch (error) {
        next(error);
    }
}