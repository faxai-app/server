// controllers/home.controller.ts
import { db } from "../../db/index.js";
import { eq, and, or, desc, inArray, sql, isNull, count } from "drizzle-orm";
import {
  resources,
  resourceAttachments,
  users,
  likes,
  comments,
  bookmarks,
} from "../../db/schema.js";
import type { Request, Response } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    niveau: number | null;
    filiere: string | null;
    specialisation: string | null;
  };
}

const BASE_URL = "http://192.168.8.100:5000"; // ← Suppression de l'espace à la fin

interface PublicationResponse {
  id: number;
  content: string | null;
  type: "post" | "epreuve" | "cours";
  createdAt: Date | null;
  author: {
    id: number;
    name: string | null;
    profilePicture: string | null;
    niveau: number | null;
    filiere: string | null;
  };
  level: {
    niveau: number | null;
    filiere: string | null;
    specialisation: string | null;
    annee: number | null;
  };
  hasMedia: boolean;
  images: {
    id: number;
    url: string;
    thumbnail?: string;
  }[];
  pdfCount: number;
  attachmentsMetadata: {
    id: number;
    fileName: string;
    fileType: string | null;
    fileSize: number | null;
    isImage: boolean;
  }[];
}

// ... (imports identiques)

export const getHomeFeed = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userNiveau = req.user?.niveau;
    const userFiliere = req.user?.filiere;
    const userSpecialisation = req.user?.specialisation;

    if (!userId || !userNiveau || !userFiliere) {
      return res.status(401).json({ error: "Profil incomplet" });
    }

    const niveauxAccessibles = Array.from(
      { length: userNiveau },
      (_, i) => i + 1,
    );

    // Récupérer les publications
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
      .where(
        and(
          or(
            inArray(resources.level, niveauxAccessibles),
            isNull(resources.level),
          ),
          or(eq(resources.filiere, userFiliere), isNull(resources.filiere)),
          userSpecialisation
            ? or(
                eq(resources.specialisation, userSpecialisation),
                isNull(resources.specialisation),
              )
            : sql`1=1`,
        ),
      )
      .orderBy(desc(resources.createdAt))
      .limit(50);

    if (publications.length === 0) {
      return res.json({ publications: [], meta: { total: 0 } });
    }

    const publicationIds = publications.map((p) => p.id);

    // Récupérer les likes de l'utilisateur connecté pour ces posts
    const userLikes = await db
      .select({ resourceId: likes.resourceId })
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          inArray(likes.resourceId, publicationIds),
        ),
      );

    // Récupérer les bookmarks de l'utilisateur
    const userBookmarks = await db
      .select({ resourceId: bookmarks.resourceId })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          inArray(bookmarks.resourceId, publicationIds),
        ),
      );

    const likedIds = new Set(userLikes.map((l) => l.resourceId));
    const bookmarkedIds = new Set(userBookmarks.map((b) => b.resourceId));

    // Récupérer les fichiers
    const attachments = await db
      .select()
      .from(resourceAttachments)
      .where(inArray(resourceAttachments.resourceId, publicationIds));

    // Compter les likes pour chaque post
    const likesCount = await db
      .select({ resourceId: likes.resourceId, count: count() })
      .from(likes)
      .where(inArray(likes.resourceId, publicationIds))
      .groupBy(likes.resourceId);

    const likesCountMap = new Map(
      likesCount.map((l) => [l.resourceId, l.count]),
    );

    const formattedPublications = publications.map((pub) => {
      const pubAttachments = attachments.filter(
        (att) => att.resourceId === pub.id,
      );

      const images = pubAttachments
        .filter((att) => att.fileType?.startsWith("image/"))
        .slice(0, 4)
        .map((img) => ({
          id: img.id,
          url: `${BASE_URL}/${img.filePath.replace(/\\/g, "/")}`,
          thumbnail: `${BASE_URL}/${img.filePath.replace(/\\/g, "/")}`,
        }));

      const pdfs = pubAttachments.filter(
        (att) => att.fileType === "application/pdf",
      );

      return {
        id: pub.id,
        content: pub.content,
        type: pub.type,
        createdAt: pub.createdAt,
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
        images,
        pdfCount: pdfs.length,
        isLiked: likedIds.has(pub.id), // ← AJOUTÉ
        isBookmarked: bookmarkedIds.has(pub.id), // ← AJOUTÉ
        likesCount: likesCountMap.get(pub.id) || 0,
        commentsCount: pub.commentsCount || 0,
        attachmentsMetadata: pubAttachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          fileType: att.fileType,
          fileSize: att.fileSize,
          isImage: att.fileType?.startsWith("image/") || false,
        })),
      };
    });

    return res.json({
      publications: formattedPublications,
      meta: {
        total: formattedPublications.length,
        userNiveau,
        userFiliere,
      },
    });
  } catch (error) {
    console.error("Erreur feed:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};