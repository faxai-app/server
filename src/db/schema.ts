import {
  mysqlTable,
  serial,
  varchar,
  timestamp,
  int,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  nom: varchar("nom", { length: 100 }),
  ecole: varchar("ecole", { length: 100 }),
  filiere: varchar("filiere", { length: 100 }),
  niveau: int("niveau"),
  specialisation: varchar("specialisation", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});
