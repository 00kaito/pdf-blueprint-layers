import { pgTable, text, uuid, timestamp, jsonb, integer, primaryKey, index } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("PM"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  state: jsonb("state").notNull().default({}),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [
  index("projects_owner_id_idx").on(t.ownerId),
]);

export const projectShares = pgTable("project_shares", {
  projectId: uuid("project_id").notNull().references(() => projects.id),
  userId: uuid("user_id").notNull().references(() => users.id),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.userId] }),
  index("project_shares_user_id_idx").on(t.userId),
  index("project_shares_project_id_idx").on(t.projectId),
]);

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  projectId: uuid("project_id").references(() => projects.id),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

// Tabela sesji dla connect-pg-simple
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { mode: 'string' }).notNull(),
});

export const projectStateSchema = z.object({
  layers: z.array(z.any()).default([]),
  objects: z.array(z.any()).default([]),
  customIcons: z.array(z.any()).optional(),
  exportSettings: z.any().optional(),
  autoNumbering: z.any().optional(),
  overlayOpacity: z.number().optional(),
  pdfFileId: z.string().optional().nullable(),
  overlayPdfFileId: z.string().optional().nullable(),
  activeLayerId: z.string().optional().nullable(),
});

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect & { sharedWith: string[] };
export type FileMetadata = typeof files.$inferSelect;

export type ProjectState = z.infer<typeof projectStateSchema>;

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required").transform(val => val.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "PM", "TECH"]),
});

export const updateUserPasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const insertProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  ownerId: z.string(),
  pdfFileId: z.string().optional().nullable(),
  overlayPdfFileId: z.string().optional().nullable(),
});
