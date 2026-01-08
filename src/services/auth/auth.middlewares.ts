import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_a_changer";

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Récupérer le header Authorization (format: "Bearer TOKEN")
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Accès refusé. Token manquant." });
  }

  try {
    // 2. Vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    // 3. Injecter l'ID dans l'objet request pour que updateProfile puisse l'utiliser
    (req as any).user = { id: decoded.userId };

    next(); // Passer au contrôleur suivant (updateProfile)
  } catch (error) {
    return res.status(403).json({ message: "Token invalide ou expiré." });
  }
};
