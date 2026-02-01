import { Router } from "express";
import { getNotifications, profilePicture } from "./user.controllers.js";
import { authenticateToken } from "../auth/auth.middlewares.js";
import multer from "multer";

const upload = multer({
  dest: "uploads/profiles/",
  limits: { fileSize: 10 * 1024 * 1024 },
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
