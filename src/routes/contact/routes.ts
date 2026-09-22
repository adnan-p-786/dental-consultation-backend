import { createContact, getAllContact } from "../../controllers/contactControl";
import { Router } from "express";

const router = Router();

router.get(["/get-contacts", "/"], getAllContact)
router.post(["/create-contact", "/"], createContact)

export default router