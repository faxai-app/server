import { db } from "../../db/index.js";
import { posts, resources, media } from ".././../db/schema.js";

export const shareContent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { content, type, details: detailsRaw } = req.body;
    const files = req.files as Express.Multer.File[];

    let parentId;
    let category;

    if (type === "post") {
      const [newPost] = await db
        .insert(posts)
        .values({ userId, content })
        .returning();
      parentId = newPost.id;
      category = "post";
    } else {
      const details = JSON.parse(detailsRaw);
      const [newRes] = await db
        .insert(resources)
        .values({
          userId,
          title: details.title,
          type: type, // 'epreuve' or 'cours'
          subType: details.type, // SN1, SN2...
          professor: details.professor,
          year: parseInt(details.year),
          description: content,
        })
        .returning();
      parentId = newRes.id;
      category = "resource";
    }

    // Stockage des fichiers dans la table Media
    if (files && files.length > 0) {
      const mediaValues = files.map((file) => ({
        parentId,
        category,
        url: file.path,
        fileType: file.mimetype,
      }));
      await db.insert(media).values(mediaValues);
    }

    res.json({ message: "Publié avec succès !" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur lors du partage" });
  }
};
