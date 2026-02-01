import {
  mysqlTable,
  serial,
  varchar,
  timestamp,
  int,
  text,
  boolean,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  profilePicture: varchar("profile_picture", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  nom: varchar("nom", { length: 100 }),
  ecole: varchar("ecole", { length: 100 }),
  filiere: varchar("filiere", { length: 100 }),
  niveau: int("niveau"),
  specialisation: varchar("specialisation", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).default("info"), // info, success, warning
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table principale des publications
export const resources = mysqlTable("resources", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(), // Lien vers l'auteur
  type: mysqlEnum("type", ["post", "epreuve", "cours"]).notNull(),
  content: text("content"), // Le texte "Exprimez-vous..."

  // Champs spécifiques aux cours/épreuves (nullables si c'est juste un post)
  title: varchar("title", { length: 255 }), // Matière
  level: varchar("level", { length: 50 }), // SN1, SN2...
  professor: varchar("professor", { length: 255 }),
  year: int("year"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Table des fichiers (Relation One-to-Many)
export const resourceAttachments = mysqlTable("resource_attachments", {
  id: serial("id").primaryKey(),
  resourceId: int("resource_id").notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(), // Chemin dans le dossier uploads
  fileName: varchar("file_name", { length: 255 }).notNull(), // Nom d'origine
  fileType: varchar("file_type", { length: 50 }), // image/jpeg ou application/pdf
});

// Relations pour Drizzle (facilite les query)
export const resourcesRelations = relations(resources, ({ many }) => ({
  attachments: many(resourceAttachments),
}));

export const attachmentsRelations = relations(
  resourceAttachments,
  ({ one }) => ({
    resource: one(resources, {
      fields: [resourceAttachments.resourceId],
      references: [resources.id],
    }),
  }),
);