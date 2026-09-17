import { Router, Request, Response } from "express";

const router = Router();

// Dental services used by the React frontend
const TREATMENTS = [
  {
    id: "general-consultation",
    treatmentCode: "general_consultation",
    name: "General Dental Consultation",
    group: "consultation",
    groupLabel: "Consultation",
    shortDescription:
      "Talk through symptoms, an existing treatment plan, or a second opinion with a dentist, online by video or in the clinic.",
    fullDescription:
      "A general consultation is the starting point for most patients. The dentist reviews your symptoms and dental history, discusses any treatment you have already been advised to have, and recommends next steps.",
    consultationTypes: ["online", "in_clinic"],
    duration: "15–30 minutes",
    indicativeFee: null,
    features: [
      "Choose an online video consultation or an in-clinic visit",
      "Attach photos or documents to your request",
      "Written consultation notes and recommendations in your patient account",
      "Follow-up appointment arranged where the dentist advises one",
    ],
    candidateFor: [
      "New symptoms you want assessed before committing to treatment",
      "A second opinion on treatment you have been advised to have",
      "General questions about your oral health",
    ],
  },
  {
    id: "dental-implant",
    treatmentCode: "dental_implant",
    name: "Dental Implants",
    group: "surgical",
    groupLabel: "Surgical",
    shortDescription:
      "Permanent replacement for missing teeth using titanium posts integrated into the jawbone.",
    fullDescription:
      "Dental implants provide a long-term, natural-looking replacement for missing teeth.",
    consultationTypes: ["online", "in_clinic"],
    duration: "30–45 minutes",
    indicativeFee: null,
    features: [
      "Bone density & 3D scan assessment",
      "Computer-guided placement planning",
      "Custom crown matching your natural teeth",
    ],
    candidateFor: [
      "Patients missing one or more teeth",
      "Patients looking for a fixed alternative to dentures",
    ],
  },
  {
    id: "orthodontics",
    treatmentCode: "orthodontics",
    name: "Orthodontics & Clear Aligners",
    group: "cosmetic",
    groupLabel: "Cosmetic & Alignment",
    shortDescription:
      "Straighten misaligned teeth and fix bite issues using discreet clear aligners or fixed braces.",
    fullDescription:
      "Modern orthodontic treatments designed to align teeth, improve bite function, and give you confidence in your smile.",
    consultationTypes: ["online", "in_clinic"],
    duration: "20–30 minutes",
    indicativeFee: null,
    features: [
      "Digital 3D smile simulation",
      "Clear aligner and brace options",
      "Remote progress check-ins available",
    ],
    candidateFor: [
      "Crowded, crooked, or spaced teeth",
      "Overbite, underbite, or crossbite issues",
    ],
  },
  {
    id: "root-canal",
    treatmentCode: "root_canal",
    name: "Endodontics & Root Canal Treatment",
    group: "restorative",
    groupLabel: "Restorative",
    shortDescription:
      "Relieve tooth pain and save infected teeth with gentle, precise root canal therapy.",
    fullDescription:
      "Root canal treatment eliminates pain caused by infected or inflamed dental pulp while preserving your natural tooth.",
    consultationTypes: ["in_clinic"],
    duration: "45–60 minutes",
    indicativeFee: null,
    features: [
      "Rotary endodontics for precision",
      "Effective local anesthesia for pain-free treatment",
      "Post-procedure restoration planning",
    ],
    candidateFor: [
      "Severe or lingering tooth sensitivity",
      "Pain when chewing or swelling near the tooth",
    ],
  },
];

router.get("/treatments", (_req: Request, res: Response) => {
  res.json(TREATMENTS);
});

export default router;
