import {
  mysqlTable,
  serial,
  varchar,
  timestamp,
  int,
  text,
  boolean,
  mysqlEnum,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// 1. Table de base : users (aucune dépendance)
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

// 2. Resources (dépend de users)
export const resources = mysqlTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["post", "epreuve", "cours"]).notNull(),
    content: text("content"),
    title: varchar("title", { length: 255 }),
    level: varchar("level", { length: 10 }),
    filiere: varchar("filiere", { length: 100 }),
    specialisation: varchar("specialisation", { length: 100 }),
    professor: varchar("professor", { length: 100 }),
    year: int("year"),
    commentsCount: int("comments_count").default(0), // ← AJOUTÉ ICI
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("user_id_idx").on(table.userId),
    levelIdx: index("level_idx").on(table.level),
    filiereIdx: index("filiere_idx").on(table.filiere),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  }),
);

// 3. Notifications (dépend de users)
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { unsigned: true, mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).default("info"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Likes (dépend de users et resources)
export const likes = mysqlTable(
  "likes",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: bigint("resource_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueLike: uniqueIndex("unique_like").on(table.userId, table.resourceId),
  }),
);

// 5. Bookmarks (dépend de users et resources)
export const bookmarks = mysqlTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: bigint("resource_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueBookmark: uniqueIndex("unique_bookmark").on(table.userId, table.resourceId),
  }),
);

// 6. Comments (dépend de users et resources)
export const comments = mysqlTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    resourceId: bigint("resource_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    resourceIdx: index("comment_resource_idx").on(table.resourceId),
    userIdx: index("comment_user_idx").on(table.userId),
  }),
);

// 7. Resource Attachments (dépend de resources)
export const resourceAttachments = mysqlTable(
  "resource_attachments",
  {
    id: serial("id").primaryKey(),
    resourceId: bigint("resource_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    filePath: varchar("file_path", { length: 500 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileType: varchar("file_type", { length: 50 }),
    fileSize: int("file_size"),
  },
  (table) => ({
    resourceIdx: index("resource_id_idx").on(table.resourceId),
  }),
);

// ==========================================
// RELATIONS (UNIQUEMENT À LA FIN, SANS DOUBLONS)
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  resources: many(resources),
  notifications: many(notifications),
  likes: many(likes),
  bookmarks: many(bookmarks),
  comments: many(comments),
}));

// ATTENTION : Une seule déclaration de resourcesRelations !
export const resourcesRelations = relations(resources, ({ one, many }) => ({
  author: one(users, {
    fields: [resources.userId],
    references: [users.id],
  }),
  attachments: many(resourceAttachments),
  likes: many(likes),
  bookmarks: many(bookmarks),
  comments: many(comments),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [likes.resourceId],
    references: [resources.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [bookmarks.resourceId],
    references: [resources.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [comments.resourceId],
    references: [resources.id],
  }),
}));

export const resourceAttachmentsRelations = relations(
  resourceAttachments,
  ({ one }) => ({
    resource: one(resources, {
      fields: [resourceAttachments.resourceId],
      references: [resources.id],
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));