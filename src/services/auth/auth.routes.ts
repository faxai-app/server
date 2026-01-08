import { Router } from "express";
import { login, register, updateProfile } from "./auth.controllers.js";
import { authenticateToken } from "./auth.middlewares.js";

const router: Router = Router();

router.post("/register", register);
router.post("/login", login);
router.put("/complete-profile", authenticateToken, updateProfile);

export default router;
