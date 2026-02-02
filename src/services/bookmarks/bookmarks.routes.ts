import { Router } from "express";
import { authenticateToken } from "../auth/auth.middlewares.js";
import { getUserBookmarks } from "./bookmarks.controllers.js";

const router: Router = Router();

router.get("/", authenticateToken as any, getUserBookmarks);

export default router;
