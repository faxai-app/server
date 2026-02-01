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
  // BIGINT UNSIGNED pour matcher users.id (SERIAL = BIGINT UNSIGNED)
  userId: bigint("user_id", { unsigned: true, mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).default("info"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resources = mysqlTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    // BIGINT UNSIGNED pour matcher users.id
    userId: bigint("user_id", { unsigned: true, mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["post", "epreuve", "cours"]).notNull(),
    content: text("content"),
    title: varchar("title", { length: 255 }),
    level: int("level"),
    filiere: varchar("filiere", { length: 100 }),
    specialisation: varchar("specialisation", { length: 100 }),
    professor: varchar("professor", { length: 100 }), // Ajouté ici
    year: int("year"),
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

export const resourceAttachments = mysqlTable(
  "resource_attachments",
  {
    id: serial("id").primaryKey(),
    // BIGINT UNSIGNED pour matcher resources.id
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  resources: many(resources),
  notifications: many(notifications),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  author: one(users, {
    fields: [resources.userId],
    references: [users.id],
  }),
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