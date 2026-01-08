import {
  mysqlTable,
  serial,
  varchar,
  timestamp,
  int,
  text,
  boolean,
} from "drizzle-orm/mysql-core";

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