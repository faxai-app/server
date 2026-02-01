import { Router } from "express";
import multer from "multer";
import { createResource } from "./files.controllers.js";
import { authenticateToken } from "../auth/auth.middlewares.js";

const router: Router = Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/", authenticateToken, upload.array("files"), createResource);

export default router;
