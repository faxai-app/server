import { db } from "../../db/index.js";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import {
  bookmarks,
  resources,
  users,
  resourceAttachments,
  likes,
} from "../../db/schema.js";
import type { Request, Response } from "express";

const BASE_URL = "http://192.168.8.100:5000";

interface AuthenticatedRequest extends Request {
  user?: { id: number };
}

export const getUserBookmarks = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    // Récupérer les IDs des ressources bookmarkées avec date
    const userBookmarks = await db
      .select({
        resourceId: bookmarks.resourceId,
        bookmarkedAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));

    if (userBookmarks.length === 0) {
      return res.json({ bookmarks: [] });
    }

    const resourceIds = userBookmarks.map((b) => b.resourceId);

    // Récupérer les publications correspondantes
    const publications = await db
      .select({
        id: resources.id,
        content: resources.content,
        type: resources.type,
        createdAt: resources.createdAt,
        level: resources.level,
        filiere: resources.filiere,
        specialisation: resources.specialisation,
        year: resources.year,
        commentsCount: resources.commentsCount,
        authorId: resources.userId,
        authorName: users.nom,
        authorProfilePic: users.profilePicture,
        authorNiveau: users.niveau,
        authorFiliere: users.filiere,
      })
      .from(resources)
      .innerJoin(users, eq(resources.userId, users.id))
      .where(inArray(resources.id, resourceIds));

    // Récupérer les attachments
    const attachments = await db
      .select()
      .from(resourceAttachments)
      .where(inArray(resourceAttachments.resourceId, resourceIds));

    // Compter likes (optionnel)
    const likesCount = await db
      .select({ resourceId: likes.resourceId, count: count() })
      .from(likes)
      .where(inArray(likes.resourceId, resourceIds))
      .groupBy(likes.resourceId);
    const likesCountMap = new Map(
      likesCount.map((l) => [l.resourceId, l.count]),
    );

    // Mapper dans l'ordre des bookmarks (le plus récent d'abord)
    const formattedBookmarks = userBookmarks
      .map((bookmark) => {
        const pub = publications.find((p) => p.id === bookmark.resourceId);
        if (!pub) return null;

        const pubAttachments = attachments.filter(
          (a) => a.resourceId === pub.id,
        );
        const images = pubAttachments
          .filter((a) => a.fileType?.startsWith("image/"))
          .map((img) => ({
            id: img.id,
            url: `${BASE_URL}/${img.filePath.replace(/\\/g, "/")}`,
            thumbnail: `${BASE_URL}/${img.filePath.replace(/\\/g, "/")}`,
          }));

        return {
          id: pub.id,
          content: pub.content,
          type: pub.type,
          createdAt: pub.createdAt,
          bookmarkedAt: bookmark.bookmarkedAt,
          author: {
            id: pub.authorId,
            name: pub.authorName,
            profilePicture: pub.authorProfilePic,
            niveau: pub.authorNiveau,
            filiere: pub.authorFiliere,
          },
          level: {
            niveau: pub.level,
            filiere: pub.filiere,
            specialisation: pub.specialisation,
            annee: pub.year,
          },
          hasMedia: pubAttachments.length > 0,
          images: images.slice(0, 4),
          pdfCount: pubAttachments.filter(
            (a) => a.fileType === "application/pdf",
          ).length,
          isLiked: false, // À calculer si besoin
          isBookmarked: true, // Forcément true ici
          likesCount: likesCountMap.get(pub.id) || 0,
          commentsCount: pub.commentsCount || 0,
        };
      })
      .filter(Boolean);

    return res.json({ bookmarks: formattedBookmarks });
  } catch (error) {
    console.error("Erreur récupération bookmarks:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};
