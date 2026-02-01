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
router.post("/:id/like", authenticateToken, toggleLike);
router.get("/:id/like", authenticateToken, getPostStats); // Pour vérifier si liké/bookmarké

// Bookmarks
router.post("/:id/bookmark", authenticateToken, toggleBookmark);

// Commentaires
router.get("/:id/comments", authenticateToken, getComments);
router.post("/:id/comments", authenticateToken, addComment);
router.delete("/comments/:commentId", authenticateToken, deleteComment);

export default router;
