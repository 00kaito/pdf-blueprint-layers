import { pgTable, text, uuid, timestamp, jsonb, integer, primaryKey, index } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
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
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [
  index("files_project_id_idx").on(t.projectId),
  index("files_owner_id_idx").on(t.ownerId),
]);

// Types
export type User = Omit<typeof users.$inferSelect, "email"> & { email?: string | null };
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = Omit<typeof projects.$inferSelect, "state"> & { state?: any; sharedWith: string[] };
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type FileMetadata = Omit<typeof files.$inferSelect, "projectId" | "storagePath" | "size"> & { 
  projectId?: string | null;
  storagePath?: string;
  size?: number;
};

// Zod Schemas
export const projectStateSchema = z.object({
  layers: z.array(z.any()),
  objects: z.array(z.any()),
  customIcons: z.array(z.any()),
  exportSettings: z.any(),
  autoNumbering: z.any(),
  overlayOpacity: z.number(),
  pdfFileId: z.string().optional().nullable(),
  overlayPdfFileId: z.string().optional().nullable(),
  activeLayerId: z.string().optional().nullable(),
});

export type ProjectState = z.infer<typeof projectStateSchema>;

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  ownerId: z.string(),
  pdfFileId: z.string().optional().nullable(),
  overlayPdfFileId: z.string().optional().nullable(),
});
