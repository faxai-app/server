import { notifications, users } from "../../db/schema.js";
import { db } from "../../db/index.js";
import type { Request, Response } from "express";
import { eq, desc } from "drizzle-orm";

export const profilePicture = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const file = (req as any).file;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }
    if (!file) {
      return res.status(400).json({ error: "Aucune image reçue" });
    }
    const filePath = file.path;

    await db
      .update(users)
      .set({ profilePicture: filePath })
      .where(eq(users.id, userId));

    res.json({
      message: "Photo mise à jour avec succès",
      url: filePath,
    });
  } catch (e) {
    console.error("Erreur Upload:", e);
    res
      .status(500)
      .json({ error: "Erreur serveur lors de l'enregistrement de l'image" });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const data = await db
      .select()
      .from(notifications) // Maintenant reconnu grâce à l'import
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt)); // Maintenant reconnu grâce à l'import

    res.json(data);
  } catch (e) {
    console.error("Erreur GetNotifications:", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
