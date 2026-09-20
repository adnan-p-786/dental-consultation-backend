import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

// Doctor photos upload directory
const doctorUploadDir = path.join(process.cwd(), "uploads", "doctors");

// Ensure directory exists
if (!fs.existsSync(doctorUploadDir)) {
  fs.mkdirSync(doctorUploadDir, {
    recursive: true,
  });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, doctorUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `doctor-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// Allowed file types for doctor profile photos
const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed for doctor photos"));
  }
};

// Multer instance for doctors
export const doctorMulter = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// Middleware with error handling wrapper
export const uploadDoctorPhoto = (req: Request, res: Response, next: NextFunction) => {
  doctorMulter.single("doctorPhoto")(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Doctor photo file size cannot exceed 5MB",
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to upload doctor photo",
      });
    }
    next();
  });
};
