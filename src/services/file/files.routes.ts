import { Router } from "express";
import multer from "multer";
import { createResource } from "./files.controllers.js";
import { authenticateToken } from "../auth/auth.middlewares.js";
import { upload } from "../../config/multer.js";

const router: Router = Router();

router.post(
  "/",
  authenticateToken as any,
  upload.array("files"),
  createResource,
);

export default router;
