// controllers/home.controller.ts
import { db } from "../../db/index.js";
import { eq, and, or, desc, inArray, sql, isNull } from "drizzle-orm";
import { resources, resourceAttachments, users } from "../../db/schema.js";
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

export const getHomeFeed = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userNiveau = req.user?.niveau;
    const userFiliere = req.user?.filiere;
    const userSpecialisation = req.user?.specialisation;

    if (!userId || !userNiveau || !userFiliere) {
      return res.status(401).json({
        error:
          "Utilisateur non authentifié ou profil incomplet (niveau/filière requis)",
      });
    }

    const niveauxAccessibles: number[] = Array.from(
      { length: userNiveau },
      (_, i) => i + 1,
    );

    const publications = await db
      .select({
        id: resources.id,
        content: resources.content,
        type: resources.type,
        createdAt: resources.createdAt,
        level: resources.level,
        filiere: resources.filiere,
        specialisation: resources.specialisation,
        professor: resources.professor,
        year: resources.year,
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
      return res.status(200).json({
        publications: [],
        meta: {
          total: 0,
          userNiveau,
          userFiliere,
          niveauxVisibles: niveauxAccessibles,
        },
      });
    }

    const publicationIds = publications.map((p) => p.id);

    const attachments = await db
      .select()
      .from(resourceAttachments)
      .where(inArray(resourceAttachments.resourceId, publicationIds));

    const formattedPublications: PublicationResponse[] = publications.map(
      (pub) => {
        const pubAttachments = attachments.filter(
          (att) => att.resourceId === pub.id,
        );

        // ← CORRECTION ICI : URLs absolues pour les images
        const images = pubAttachments
          .filter((att) => att.fileType?.startsWith("image/"))
          .slice(0, 4)
          .map((img) => {
            const cleanPath = img.filePath.replace(/\\/g, "/"); // Normalise les slashs
            return {
              id: img.id,
              url: `${BASE_URL}/${cleanPath}`, // URL absolue complète !
              thumbnail: `${BASE_URL}/${cleanPath}`, // Même chose pour thumbnail
            };
          });

        const pdfs = pubAttachments.filter(
          (att) => att.fileType === "application/pdf",
        );

        const attachmentsMetadata = pubAttachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          fileType: att.fileType,
          fileSize: att.fileSize,
          isImage: att.fileType ? att.fileType.startsWith("image/") : false,
        }));

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
          attachmentsMetadata,
        };
      },
    );

    return res.status(200).json({
      publications: formattedPublications,
      meta: {
        total: formattedPublications.length,
        userNiveau,
        userFiliere,
        niveauxVisibles: niveauxAccessibles,
      },
    });
  } catch (error) {
    console.error("Erreur récupération feed:", error);
    return res.status(500).json({
      error: "Erreur lors de la récupération des publications",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};