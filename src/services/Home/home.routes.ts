// routes/home.routes.ts
import { Router } from "express";
import { authenticateToken } from "../auth/auth.middlewares.js";

const router: Router = Router();

router.get("/home", authenticateToken);

export default router;
