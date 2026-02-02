import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    niveau: number | null;
    filiere: string | null;
    specialisation: string | null;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    if (!token) {
      return res.status(401).json({ error: "Token manquant" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      email: string;
    };

    // Récupérer les infos complètes du user depuis la DB
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        niveau: users.niveau,
        filiere: users.filiere,
        specialisation: users.specialisation,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return res
        .status(403)
        .json({ error: "Token invalide - utilisateur non trouvé" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      niveau: user.niveau,
      filiere: user.filiere,
      specialisation: user.specialisation,
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: "Token invalide" });
  }
};
