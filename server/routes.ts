import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import passport from "passport";
import bcrypt from "bcrypt";
import multer from "multer";
import { insertUserSchema, projectStateSchema } from "@shared/schema";

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
      res.status(201).json({ id: user.id, username: user.username });
    });
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({ id: user.id, username: user.username });
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ id: req.user!.id, username: req.user!.username });
  });

  // Project Routes
  app.get("/api/projects", requireAuth, async (req, res) => {
    const projects = await storage.listProjectsForUser(req.user!.id);
    res.json(projects);
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
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

  app.put("/api/projects/:id", requireAuth, async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.ownerId !== req.user!.id && !project.sharedWith.includes(req.user!.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const parsed = projectStateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    await storage.saveProjectState(req.params.id, parsed.data);
    res.sendStatus(200);
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const state = await storage.getProjectState(req.params.id);
    if (state) {
      if (state.pdfFileId) await storage.deleteFile(state.pdfFileId);
      if (state.overlayPdfFileId) await storage.deleteFile(state.overlayPdfFileId);
    }
    
    await storage.deleteProject(req.params.id);
    res.sendStatus(200);
  });

  app.post("/api/projects/:id/share", requireAuth, async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { username } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (project.sharedWith.includes(user.id)) return res.sendStatus(200);
    
    await storage.updateProject(req.params.id, {
      sharedWith: [...project.sharedWith, user.id]
    });
    res.sendStatus(200);
  });

  // File Routes
  app.post("/api/files", requireAuth, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { originalname, mimetype, buffer } = req.file;
    const { projectId } = req.body;
    const meta = await storage.saveFile(buffer, originalname, mimetype, req.user!.id, projectId);
    res.json({ fileId: meta.id, url: `/api/files/${meta.id}` });
  });

  app.get("/api/files/:fileId", requireAuth, async (req, res) => {
    const meta = await storage.getFileMeta(req.params.fileId);
    if (!meta) return res.status(404).json({ message: "File not found" });
    
    if (meta.projectId) {
      const project = await storage.getProject(meta.projectId);
      if (!project || (project.ownerId !== req.user!.id && !project.sharedWith.includes(req.user!.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
    } else if (meta.ownerId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const buffer = await storage.getFileBuffer(req.params.fileId);
    if (!buffer) return res.status(404).json({ message: "File not found" });
    
    res.setHeader("Content-Type", meta.mimeType);
    res.send(buffer);
  });

  return httpServer;
}
