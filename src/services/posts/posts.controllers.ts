import { db } from "../../db/index.js";
import {
  likes,
  bookmarks,
  comments,
  resources,
  users,
} from "../../db/schema.js";
import type { Request, Response } from "express";
import { eq, and, desc, count, sql } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
  };
}

// Helper pour parser l'ID avec vérification
const parseResourceId = (id: string | undefined): number => {
  if (!id) throw new Error("ID manquant");
  const parsed = parseInt(id);
  if (isNaN(parsed)) throw new Error("ID invalide");
  return parsed;
};

// Toggle Like
export const toggleLike = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const resourceId = parseResourceId(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.resourceId, resourceId)))
      .limit(1);

    if (existingLike.length > 0) {
      await db
        .delete(likes)
        .where(and(eq(likes.userId, userId), eq(likes.resourceId, resourceId)));

      const likesCount = await getLikesCount(resourceId);
      return res.json({ liked: false, count: likesCount });
    } else {
      await db.insert(likes).values({
        userId,
        resourceId,
      });

      const likesCount = await getLikesCount(resourceId);
      return res.json({ liked: true, count: likesCount });
    }
  } catch (error) {
    console.error("Erreur toggle like:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur serveur",
    });
  }
};

// Toggle Bookmark
export const toggleBookmark = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const resourceId = parseResourceId(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const existingBookmark = await db
      .select()
      .from(bookmarks)
      .where(
        and(eq(bookmarks.userId, userId), eq(bookmarks.resourceId, resourceId)),
      )
      .limit(1);

    if (existingBookmark.length > 0) {
      await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            eq(bookmarks.resourceId, resourceId),
          ),
        );

      return res.json({ bookmarked: false });
    } else {
      await db.insert(bookmarks).values({
        userId,
        resourceId,
      });

      return res.json({ bookmarked: true });
    }
  } catch (error) {
    console.error("Erreur toggle bookmark:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur serveur",
    });
  }
};

// Récupérer les commentaires
export const getComments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resourceId = parseResourceId(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const data = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        userId: comments.userId,
        userName: users.nom,
        userProfilePic: users.profilePicture,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.resourceId, resourceId))
      .orderBy(desc(comments.createdAt));

    return res.json(data);
  } catch (error) {
    console.error("Erreur get comments:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur serveur",
    });
  }
};

// Ajouter un commentaire
export const addComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const resourceId = parseResourceId(req.params.id);
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Contenu requis" });
    }

    const [newComment] = await db
      .insert(comments)
      .values({
        resourceId,
        userId,
        content: content.trim(),
      })
      .$returningId();

    if (!newComment) {
      return res
        .status(500)
        .json({ error: "Erreur lors de la création du commentaire" });
    }

    const [commentData] = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        userId: comments.userId,
        userName: users.nom,
        userProfilePic: users.profilePicture,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, newComment.id));

    // Incrémenter le compteur
    await db
      .update(resources)
      .set({ commentsCount: sql`${resources.commentsCount} + 1` })
      .where(eq(resources.id, resourceId));

    return res.status(201).json(commentData);
  } catch (error) {
    console.error("Erreur add comment:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur serveur",
    });
  }
};

// Supprimer un commentaire
export const deleteComment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const commentId = parseInt(req.params.commentId || "0");

    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    if (isNaN(commentId)) {
      return res.status(400).json({ error: "ID commentaire invalide" });
    }

    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!comment) {
      return res.status(404).json({ error: "Commentaire non trouvé" });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    await db.delete(comments).where(eq(comments.id, commentId));

    // Décrémenter le compteur (vérifier qu'il ne devient pas négatif)
    await db
      .update(resources)
      .set({
        commentsCount: sql`GREATEST(${resources.commentsCount} - 1, 0)`,
      })
      .where(eq(resources.id, comment.resourceId));

    return res.json({ message: "Commentaire supprimé" });
  } catch (error) {
    console.error("Erreur delete comment:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur serveur",
    });
  }
};

// Stats d'un post
export const getPostStats = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const resourceId = parseResourceId(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const [likesData] = await db
      .select({ count: count() })
      .from(likes)
      .where(eq(likes.resourceId, resourceId));

    const [userLike] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.resourceId, resourceId)))
      .limit(1);

    const [userBookmark] = await db
      .select()
      .from(bookmarks)
      .where(
        and(eq(bookmarks.userId, userId), eq(bookmarks.resourceId, resourceId)),
      )
      .limit(1);

    return res.json({
      likesCount: likesData?.count ?? 0, // Gestion du undefined
      isLiked: userLike !== undefined,
      isBookmarked: userBookmark !== undefined,
    });
  } catch (error) {
    console.error("Erreur get stats:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur serveur",
    });
  }
};

// Helper avec valeur par défaut
async function getLikesCount(resourceId: number): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(likes)
    .where(eq(likes.resourceId, resourceId));
  return result?.count ?? 0;
}
