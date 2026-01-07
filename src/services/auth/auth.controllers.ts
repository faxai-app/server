import type { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_a_changer";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    //Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    //Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    //Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    //Création dans la DB
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    res
      .status(201)
      .json({ message: "Utilisateur créé avec succès", userId: user.id });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    //Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Champs requis" });
    }

    //Trouver l'utilisateur
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    //Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    //Création du Token de session (JWT)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Connexion réussie",
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};
