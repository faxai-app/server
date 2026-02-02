import { db } from "../../db/index.js";
import { eq, or, like, and, sql } from "drizzle-orm";
import { resources, resourceAttachments, users } from "../../db/schema.js";
import type { Request, Response } from "express";

const BASE_URL = "http://192.168.8.100:5000";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    niveau: number;
    filiere: string;
    specialisation?: string;
  };
}

export const globalSearch = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const userNiveau = req.user?.niveau;
    const userFiliere = req.user?.filiere;
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Requête trop courte (min 2 caractères)" });
    }

    const searchTerm = `%${query}%`;

    // 1. Recherche dans les publications (content, title, professor)
    const posts = await db
      .select({
        id: resources.id,
        content: resources.content,
        type: resources.type,
        createdAt: resources.createdAt,
        title: resources.title,
        professor: resources.professor,
        level: resources.level,
        filiere: resources.filiere,
        year: resources.year,
        authorId: resources.userId,
        authorName: users.nom,
        authorProfilePic: users.profilePicture,
      })
      .from(resources)
      .innerJoin(users, eq(resources.userId, users.id))
      .where(
        and(
          // Filtrer par niveau/filière comme le feed
          userFiliere
            ? or(
                eq(resources.filiere, userFiliere),
                sql`${resources.filiere} IS NULL`,
              )
            : sql`${resources.filiere} IS NULL`,
          // Recherche textuelle
          or(
            like(resources.content, searchTerm),
            like(resources.title, searchTerm),
            like(resources.professor, searchTerm),
          ),
        ),
      )
      .limit(20);

    // 2. Recherche dans les fichiers (nom de fichier)
    const files = await db
      .select({
        id: resourceAttachments.id,
        fileName: resourceAttachments.fileName,
        fileType: resourceAttachments.fileType,
        resourceId: resourceAttachments.resourceId,
        resourceType: resources.type,
        resourceTitle: resources.title,
        authorName: users.nom,
      })
      .from(resourceAttachments)
      .innerJoin(resources, eq(resourceAttachments.resourceId, resources.id))
      .innerJoin(users, eq(resources.userId, users.id))
      .where(
        and(
          like(resourceAttachments.fileName, searchTerm),
          userFiliere
            ? or(
                eq(resources.filiere, userFiliere),
                sql`${resources.filiere} IS NULL`,
              )
            : sql`${resources.filiere} IS NULL`,
        ),
      )
      .limit(10);

    // 3. Recherche utilisateurs (optionnel)
    const foundUsers = await db
      .select({
        id: users.id,
        name: users.nom,
        profilePicture: users.profilePicture,
        niveau: users.niveau,
        filiere: users.filiere,
      })
      .from(users)
      .where(
        and(
          like(users.nom, searchTerm),
          userFiliere ? eq(users.filiere, userFiliere) : sql`true`, // Même filière uniquement
          sql`${users.id} != ${userId}`, // Exclure soi-même
        ),
      )
      .limit(5);

    // Formater les résultats
    const formattedPosts = posts.map((post) => ({
      ...post,
      author: {
        id: post.authorId,
        name: post.authorName,
        profilePicture: post.authorProfilePic,
      },
      level: {
        niveau: post.level,
        filiere: post.filiere,
        annee: post.year,
      },
      hasMedia: true,
      images: [],
      pdfCount: 0,
      isLiked: false,
      isBookmarked: false,
      likesCount: 0,
      commentsCount: 0,
      attachmentsMetadata: [],
    }));

    return res.json({
      posts: formattedPosts,
      files,
      users: foundUsers,
      query: query.trim(),
      total: posts.length + files.length + foundUsers.length,
    });
  } catch (error) {
    console.error("Erreur recherche:", error);
    return res.status(500).json({ error: "Erreur lors de la recherche" });
  }
};
