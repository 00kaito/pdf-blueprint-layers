import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { User, Project, ProjectState, FileMetadata } from '../shared/schema';

export class FileStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private dataDir = path.resolve(process.cwd(), 'data');
  private usersFile = path.join(this.dataDir, 'users.json');
  private projectsFile = path.join(this.dataDir, 'projects.json');
  private statesDir = path.join(this.dataDir, 'project-states');
  private filesDir = path.join(this.dataDir, 'files');

  constructor() {
    this.ensureDirs();
    this.loadData();
  }

  private ensureDirs() {
    [this.dataDir, this.statesDir, this.filesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private loadData() {
    if (fs.existsSync(this.usersFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.usersFile, 'utf-8'));
        data.forEach((user: User) => this.users.set(user.id, user));
      } catch (e) {
        console.error('Error loading users:', e);
      }
    }
    if (fs.existsSync(this.projectsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.projectsFile, 'utf-8'));
        data.forEach((project: Project) => this.projects.set(project.id, project));
      } catch (e) {
        console.error('Error loading projects:', e);
      }
    }
  }

  private flushUsers() {
    const tmpFile = `${this.usersFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(Array.from(this.users.values()), null, 2));
    fs.renameSync(tmpFile, this.usersFile);
  }

  private flushProjects() {
    const tmpFile = `${this.projectsFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(Array.from(this.projects.values()), null, 2));
    fs.renameSync(tmpFile, this.projectsFile);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: { username: string; passwordHash: string; role?: string }): Promise<User> {
    const id = uuidv4();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || 'PM',
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    this.flushUsers();
    return user;
  }

  async listAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.role = role;
      this.flushUsers();
    }
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async listProjectsForUser(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => 
      p.ownerId === userId || p.sharedWith.includes(userId)
    );
  }

  async createProject(insertProject: { name: string; ownerId: string }): Promise<Project> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name: insertProject.name,
      ownerId: insertProject.ownerId,
      sharedWith: [],
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, project);
    this.flushProjects();
    return project;
  }

  async updateProject(id: string, partial: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) throw new Error('Project not found');
    const updated = { ...project, ...partial, updatedAt: new Date().toISOString() };
    console.log(`[FileStorage] Updating project ${id}:`, partial);
    this.projects.set(id, updated);
    this.flushProjects();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
    this.flushProjects();
    const stateFile = path.join(this.statesDir, `${id}.json`);
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  }

  async getProjectState(id: string): Promise<ProjectState | undefined> {
    const stateFile = path.join(this.statesDir, `${id}.json`);
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    }
    return undefined;
  }

  async saveProjectState(id: string, state: ProjectState): Promise<void> {
    const stateFile = path.join(this.statesDir, `${id}.json`);
    const tmpFile = `${stateFile}.tmp`;
    console.log(`[FileStorage] Saving project state for ${id} to ${stateFile}`);
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
    fs.renameSync(tmpFile, stateFile);
    await this.updateProject(id, {}); // update updatedAt
  }

  async saveFile(buffer: Buffer, originalName: string, mimeType: string, ownerId: string, projectId?: string): Promise<FileMetadata> {
    const id = uuidv4();
    const meta: FileMetadata = {
      id,
      originalName,
      mimeType,
      ownerId,
      projectId,
      createdAt: new Date().toISOString()
    };
    const filePath = path.join(this.filesDir, id);
    const metaPath = path.join(this.filesDir, `${id}.meta.json`);
    console.log(`[FileStorage] Saving file ${originalName} (ID: ${id}) to ${filePath}`);
    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    return meta;
  }

  async getFileMeta(fileId: string): Promise<FileMetadata | undefined> {
    const metaFile = path.join(this.filesDir, `${fileId}.meta.json`);
    if (fs.existsSync(metaFile)) {
      return JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    }
    return undefined;
  }

  async getFileBuffer(fileId: string): Promise<Buffer | undefined> {
    const filePath = path.join(this.filesDir, fileId);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return undefined;
  }

  async deleteFile(fileId: string): Promise<void> {
    const filePath = path.join(this.filesDir, fileId);
    const metaFile = path.join(this.filesDir, `${fileId}.meta.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
  }
}
