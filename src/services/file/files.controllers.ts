import { db } from "../../db/index.js";
import type { Request as ExpressRequest, Response } from "express";
import { resources, resourceAttachments } from "../../db/schema.js";

export const createResource = async (req: ExpressRequest, res: Response) => {
  await db.transaction(async (tx) => {
    try {
      const { content, type, title, detailsType, professor, year } = req.body;
      const userId = req.user?.id;

      if (!userId) throw new Error("Utilisateur non authentifié");

      const [newResourceHeader] = await tx
        .insert(resources)
        .values({
          userId,
          type,
          content,
          title: title || null,
          level: detailsType || null,
          professor: professor || null,
          year: year ? parseInt(year) : null,
        })
        .$returningId();

      const resourceId = newResourceHeader?.id;

      if (!resourceId)
        throw new Error("Erreur lors de la création de la ressource");

      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        const attachmentsToInsert = files.map((file) => ({
          resourceId: resourceId,
          filePath: file.path.replace(/\\/g, "/"),
          fileName: file.originalname,
          fileType: file.mimetype,
        }));

        await tx.insert(resourceAttachments).values(attachmentsToInsert);
      }

      return res.status(201).json({
        message: "Ressource publiée avec succès !",
        resourceId,
      });
    } catch (error) {
      console.error("Erreur création ressource:", error);
      return res.status(500).json({ error: "Erreur lors de la publication" });
    }
  });
};