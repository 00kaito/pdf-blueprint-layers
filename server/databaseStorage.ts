import { IStorage } from "./storage";
import { User, Project, ProjectState, FileMetadata, users, projects, projectShares, files } from "@shared/schema";
import { db } from "./db";
import { eq, or, inArray, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export class DatabaseStorage implements IStorage {
  private storageRoot = path.resolve(process.cwd(), 'storage');

  constructor() {}

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: { username: string; passwordHash: string }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const rows = await db
      .select({
        project: projects,
        sharedUserId: projectShares.userId
      })
      .from(projects)
      .leftJoin(projectShares, eq(projects.id, projectShares.projectId))
      .where(eq(projects.id, id));

    if (rows.length === 0) return undefined;

    const project = rows[0].project;
    const sharedWith = rows
      .map(r => r.sharedUserId)
      .filter((uid): uid is string => uid !== null);

    return { ...project, sharedWith };
  }

  async listProjectsForUser(userId: string): Promise<Project[]> {
    // Find all project IDs where user is owner or shared with
    const ownedIds = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, userId));
    const sharedIds = await db.select({ id: projectShares.projectId }).from(projectShares).where(eq(projectShares.userId, userId));
    
    const allIds = Array.from(new Set([
      ...ownedIds.map(p => p.id),
      ...sharedIds.map(p => p.id)
    ]));

    if (allIds.length === 0) return [];

    const rows = await db
      .select({
        project: projects,
        sharedUserId: projectShares.userId
      })
      .from(projects)
      .leftJoin(projectShares, eq(projects.id, projectShares.projectId))
      .where(inArray(projects.id, allIds));

    const projectMap = new Map<string, Project>();
    for (const row of rows) {
      if (!projectMap.has(row.project.id)) {
        projectMap.set(row.project.id, { ...row.project, sharedWith: [] });
      }
      if (row.sharedUserId) {
        projectMap.get(row.project.id)!.sharedWith.push(row.sharedUserId);
      }
    }

    return Array.from(projectMap.values());
  }

  async createProject(insertProject: { name: string; ownerId: string }): Promise<Project> {
    return await db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values({
        name: insertProject.name,
        ownerId: insertProject.ownerId,
        state: {}
      }).returning();
      
      return { ...project, sharedWith: [] };
    });
  }

  async updateProject(id: string, partial: Partial<Project>): Promise<Project> {
    return await db.transaction(async (tx) => {
      const { sharedWith, ...projectData } = partial;
      
      // Remove fields that are not in the projects table
      const { id: _, createdAt: __, updatedAt: ___, ...updateData } = projectData as any;

      if (Object.keys(updateData).length > 0) {
        await tx.update(projects)
          .set({ ...updateData, updatedAt: new Date().toISOString() })
          .where(eq(projects.id, id));
      }
      
      if (sharedWith) {
        await tx.delete(projectShares).where(eq(projectShares.projectId, id));
        if (sharedWith.length > 0) {
          await tx.insert(projectShares).values(
            sharedWith.map(userId => ({ projectId: id, userId }))
          );
        }
      }
      
      // Fetch updated project with shares
      const rows = await tx
        .select({
          project: projects,
          sharedUserId: projectShares.userId
        })
        .from(projects)
        .leftJoin(projectShares, eq(projects.id, projectShares.projectId))
        .where(eq(projects.id, id));

      if (rows.length === 0) throw new Error("Project not found after update");

      const project = rows[0].project;
      const finalSharedWith = rows
        .map(r => r.sharedUserId)
        .filter((uid): uid is string => uid !== null);

      return { ...project, sharedWith: finalSharedWith };
    });
  }

  async deleteProject(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(projectShares).where(eq(projectShares.projectId, id));
      await tx.delete(projects).where(eq(projects.id, id));
    });
  }

  async getProjectState(id: string): Promise<ProjectState | undefined> {
    const [project] = await db.select({ state: projects.state }).from(projects).where(eq(projects.id, id));
    return project?.state as ProjectState | undefined;
  }

  async saveProjectState(id: string, state: ProjectState): Promise<void> {
    await db.update(projects)
      .set({ 
        state, 
        updatedAt: new Date().toISOString() 
      })
      .where(eq(projects.id, id));
  }

  async saveFile(buffer: Buffer, originalName: string, mimeType: string, ownerId: string, projectId?: string): Promise<FileMetadata> {
    const id = uuidv4();
    const targetDir = projectId 
      ? path.join(this.storageRoot, 'projects', projectId)
      : path.join(this.storageRoot, 'users', ownerId, 'icons');
      
    fs.mkdirSync(targetDir, { recursive: true });
    const storagePath = path.join(targetDir, id);
    fs.writeFileSync(storagePath, buffer);
    
    const [file] = await db.insert(files).values({
      id,
      ownerId,
      projectId,
      originalName,
      mimeType,
      storagePath,
      size: buffer.length
    }).returning();
    
    return file;
  }

  async getFileMeta(fileId: string): Promise<FileMetadata | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, fileId));
    return file;
  }

  async getFileBuffer(fileId: string): Promise<Buffer | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, fileId));
    if (file && fs.existsSync(file.storagePath)) {
      return fs.readFileSync(file.storagePath);
    }
    return undefined;
  }

  async deleteFile(fileId: string): Promise<void> {
    const [file] = await db.select().from(files).where(eq(files.id, fileId));
    if (file) {
      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
      }
      await db.delete(files).where(eq(files.id, fileId));
    }
  }
}
