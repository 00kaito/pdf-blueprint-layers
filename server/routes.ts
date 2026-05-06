import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth";
import passport from "passport";
import bcrypt from "bcrypt";
import multer from "multer";
import { insertUserSchema, projectStateSchema, updateUserRoleSchema, updateUserPasswordSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const { username, password } = parsed.data;
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({ username, passwordHash });
    req.login(user, (err) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    });
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        console.log(`[Auth] Login failed: ${info?.message || "Invalid credentials"}`);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        console.log(`[Auth] Login successful: ${user.username} (role: ${user.role}, id: ${user.id})`);
        res.json({ id: user.id, username: user.username, role: user.role });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/auth/me", (req, res) => {
    console.log(`[Auth] GET /api/auth/me - isAuthenticated: ${req.isAuthenticated()}`);
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log(`[Auth] Session active for user: ${req.user!.username} (role: ${req.user!.role})`);
    res.json({ id: req.user!.id, username: req.user!.username, role: req.user!.role });
  });

  // Project Routes
  app.get("/api/projects", requireAuth, async (req, res) => {
    const projects = await storage.listProjectsForUser(req.user!.id);
    res.json(projects);
  });

  app.post("/api/projects", requireAuth, requireRole('PM', 'admin'), async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const project = await storage.createProject({ name, ownerId: req.user!.id });
    res.status(201).json(project);
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.ownerId !== req.user!.id && !project.sharedWith.includes(req.user!.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const state = await storage.getProjectState(req.params.id);
    res.json(state || {});
  });

  app.put("/api/projects/:id", requireAuth, requireRole('PM', 'admin'), async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.ownerId !== req.user!.id && !project.sharedWith.includes(req.user!.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const parsed = projectStateSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error(`[Project] Update failed for ${req.params.id}:`, parsed.error);
      return res.status(400).json(parsed.error);
    }
    console.log(`[Project] Saving state for project ${req.params.id} by user ${req.user!.username}`);
    await storage.saveProjectState(req.params.id, parsed.data);
    res.sendStatus(200);
  });

  app.delete("/api/projects/:id", requireAuth, requireRole('PM', 'admin'), async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    console.log(`[Project] Deleting project ${req.params.id} by user ${req.user!.username}`);
    const state = await storage.getProjectState(req.params.id);
    if (state) {
      if (state.pdfFileId) await storage.deleteFile(state.pdfFileId);
      if (state.overlayPdfFileId) await storage.deleteFile(state.overlayPdfFileId);
    }
    
    await storage.deleteProject(req.params.id);
    res.sendStatus(200);
  });

  app.post("/api/projects/:id/share", requireAuth, requireRole('PM', 'admin'), async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { username } = req.body;
    const normalizedUsername = username?.toLowerCase();
    console.log(`[Project] Sharing project ${req.params.id} with user ${normalizedUsername}`);
    const user = await storage.getUserByUsername(normalizedUsername);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (project.sharedWith.includes(user.id)) return res.sendStatus(200);
    
    await storage.updateProject(req.params.id, {
      sharedWith: [...project.sharedWith, user.id]
    });
    res.sendStatus(200);
  });

  // File Routes
  app.post("/api/files", requireAuth, requireRole('PM', 'admin'), upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { originalname, mimetype, buffer } = req.file;
    const { projectId } = req.body;
    console.log(`[File] Uploading: ${originalname} (${mimetype}, ${buffer.length} bytes) for project: ${projectId || 'none'} by user: ${req.user!.username}`);
    const meta = await storage.saveFile(buffer, originalname, mimetype, req.user!.id, projectId);
    console.log(`[File] Saved with ID: ${meta.id}`);
    res.json({ fileId: meta.id, url: `/api/files/${meta.id}` });
  });

  app.get("/api/files/:fileId", requireAuth, async (req, res) => {
    const meta = await storage.getFileMeta(req.params.fileId);
    if (!meta) {
      console.warn(`[File] Meta not found for ${req.params.fileId}`);
      return res.status(404).json({ message: "File not found" });
    }
    
    if (meta.projectId) {
      const project = await storage.getProject(meta.projectId);
      if (!project || (project.ownerId !== req.user!.id && !project.sharedWith.includes(req.user!.id))) {
        console.warn(`[File] Access denied for ${req.params.fileId} (project mismatch or no access)`);
        return res.status(403).json({ message: "Forbidden" });
      }
    } else if (meta.ownerId !== req.user!.id) {
      console.warn(`[File] Access denied for ${req.params.fileId} (owner mismatch)`);
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const buffer = await storage.getFileBuffer(req.params.fileId);
    if (!buffer) {
      console.error(`[File] Buffer not found for ${req.params.fileId} even though meta exists`);
      return res.status(404).json({ message: "File not found" });
    }
    
    res.setHeader("Content-Type", meta.mimeType);
    res.send(buffer);
  });

  // Admin Routes
  app.get("/api/admin/users", requireAuth, requireRole('admin'), async (req, res) => {
    const users = await storage.listAllUsers();
    res.json(users.map(({ passwordHash, email, ...rest }) => rest));
  });

  app.put("/api/admin/users/:id/role", requireAuth, requireRole('admin'), async (req, res) => {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }
    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    await storage.updateUserRole(req.params.id, parsed.data.role);
    res.sendStatus(200);
  });

  app.put("/api/admin/users/:id/password", requireAuth, requireRole('admin'), async (req, res) => {
    const parsed = updateUserPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await storage.updateUserPassword(req.params.id, passwordHash);
    res.sendStatus(200);
  });

  return httpServer;
}
