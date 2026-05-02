import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  passwordHash: z.string(),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const projectSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  sharedWith: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

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

export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  ownerId: z.string(),
  pdfFileId: z.string().optional().nullable(),
  overlayPdfFileId: z.string().optional().nullable(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;

export interface FileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  ownerId: string;
  projectId?: string;
  createdAt: string;
}
