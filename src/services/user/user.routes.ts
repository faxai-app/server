import { Router } from "express";
import { getNotifications, profilePicture } from "./user.controllers.js";
import { authenticateToken } from "../auth/auth.middlewares.js";
import multer from "multer";

const upload = multer({
  dest: "uploads/profiles/", // Assure-toi que ce dossier existe à la racine de ton projet
  limits: { fileSize: 2 * 1024 * 1024 }, // Limite à 2Mo par exemple
});

const router: Router = Router();

router.put(
  "/profile-picture",
  authenticateToken,
  upload.single("profilePicture"),
  profilePicture
);

router.get("/notifications", authenticateToken, getNotifications);

export default router;
