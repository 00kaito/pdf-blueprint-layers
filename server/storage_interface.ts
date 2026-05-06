import { User, Project, ProjectState, FileMetadata } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: { username: string; passwordHash: string; role?: string }): Promise<User>;
  listAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  normalizeUsernames(): Promise<void>;
  
  getProject(id: string): Promise<Project | undefined>;
  listProjectsForUser(userId: string): Promise<Project[]>;
  createProject(insertProject: { name: string; ownerId: string }): Promise<Project>;
  updateProject(id: string, partial: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  getProjectState(id: string): Promise<ProjectState | undefined>;
  saveProjectState(id: string, state: ProjectState): Promise<void>;
  
  saveFile(buffer: Buffer, originalName: string, mimeType: string, ownerId: string, projectId?: string): Promise<FileMetadata>;
  getFileMeta(fileId: string): Promise<FileMetadata | undefined>;
  getFileBuffer(fileId: string): Promise<Buffer | undefined>;
  deleteFile(fileId: string): Promise<void>;
}
