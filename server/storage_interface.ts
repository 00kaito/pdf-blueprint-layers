import { User, Project, ProjectState, FileMetadata, LibraryIcon } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: { username: string; passwordHash: string; role?: string }): Promise<User>;
  listAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  normalizeUsernames(): Promise<void>;
  /** Startup check of the file storage (and migration of stored paths); logs missing files. */
  prepareFileStorage(): Promise<void>;
  
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

  /** Shared icon library, oldest first. */
  listIcons(): Promise<LibraryIcon[]>;
  getIcon(id: string): Promise<LibraryIcon | undefined>;
  /** Adds an icon — or returns the existing entry when the same image (by hash) is already there. */
  addIcon(icon: { buffer: Buffer; name: string; mimeType: string; hash: string; createdBy: string }): Promise<LibraryIcon>;
  /** Removes the icon and its image file. */
  deleteIcon(id: string): Promise<void>;
}
