import { Router } from "express";
import { authenticateToken } from "../auth/auth.middlewares.js";
import { globalSearch } from "./search.controllers.js";

const router: Router = Router();

router.get("/", authenticateToken as any, globalSearch as any);

export default router;
