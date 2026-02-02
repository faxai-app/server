import { Router } from "express";
import { authenticateToken } from "../auth/auth.middlewares.js";
import {
  toggleLike,
  toggleBookmark,
  getComments,
  addComment,
  deleteComment,
  getPostStats,
} from "./posts.controllers.js";

const router: Router = Router();

// Likes
router.post("/:id/like", authenticateToken as any, toggleLike);
router.get("/:id/like", authenticateToken as any, getPostStats); // Pour vérifier si liké/bookmarké

// Bookmarks
router.post("/:id/bookmark", authenticateToken as any, toggleBookmark);

// Commentaires
router.get("/:id/comments", authenticateToken as any, getComments);
router.post("/:id/comments", authenticateToken as any, addComment);
router.delete("/comments/:commentId", authenticateToken as any, deleteComment);

export default router;
