import { Router } from "express";
import {
  addDoctor,
  deleteDoctor,
  getAllDoctors,
  updateDoctor,
  updateDoctorStatus,
} from "../../controllers/doctorControl";
import { uploadDoctorPhoto } from "../../middleware/doctorUpload";


const router = Router();

router.get(["/get-doctors", "/"], getAllDoctors);
router.post(["/add-doctor", "/"], uploadDoctorPhoto, addDoctor);
router.delete(["/delete-doctor/:id", "/:id"], deleteDoctor);
router.put(["/update-doctor/:id", "/:id"], uploadDoctorPhoto, updateDoctor);
router.patch(["/update-status/:id", "/:id/status"], updateDoctorStatus);

export default router;
