// routes/home.routes.ts
import { Router } from "express";
import { authenticateToken } from "../auth/auth.middlewares.js";
import { getHomeFeed } from "./home.controllers.js";

const router: Router = Router();

router.get("/", authenticateToken as any, getHomeFeed as any);

export default router;
