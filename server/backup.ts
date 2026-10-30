import JSZip from "jszip";
import bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { storage } from "./storage";
import type { FileMetadata, ProjectState, User } from "@shared/schema";

/**
 * Whole-server backup (admin): every project with its plan, files (PDFs, overlays, photos, images),
 * the icon library and who owns / shares what — one ZIP that `importBackup` restores, here or on
 * another server.
 *
 * ZIP layout:
 *   backup.json                      manifest (BackupManifest)
 *   projects/<id>/state.json         the plan
 *   projects/<id>/files/<fileId>     its files
 *   icons/<iconId>                   icon library images
 *
 * Ids: projects keep theirs (re-importing skips projects that already exist); files and icons get
 * new ids on import, users are matched by username — the plans are rewritten to the new ids.
 */

const FORMAT = "pdf-blueprint-backup";
const VERSION = 1;

type BackupFile = { id: string; originalName: string; mimeType: string; ownerId: string };
type BackupUser = { id: string; username: string; role: string };
type BackupProject = {
  id: string; name: string; ownerId: string; sharedWith: string[];
  createdAt: string; updatedAt: string; files: BackupFile[];
};
type BackupIcon = { id: string; name: string; mimeType: string };
type BackupManifest = {
  format: typeof FORMAT; version: number; exportedAt: string; exportedBy: string;
  users: BackupUser[]; projects: BackupProject[]; icons: BackupIcon[];
};

export type ImportReport = {
  imported: string[];
  skipped: string[];
  /** Accounts the backup needed that were missing here: created with a random password (set a new one). */
  createdUsers: string[];
  icons: number;
  missingFiles: number;
};

const FILE_URL_ID = /\/api\/files\/([0-9a-f-]{36})/gi;

/** Files a plan points at, besides the ones stored under the project. */
const referencedFileIds = (state: ProjectState | undefined): string[] => {
  if (!state) return [];
  const ids = new Set<string>();
  if (state.pdfFileId) ids.add(state.pdfFileId);
  if (state.overlayPdfFileId) ids.add(state.overlayPdfFileId);
  JSON.stringify(state).replace(FILE_URL_ID, (_, id: string) => { ids.add(id); return ''; });
  return Array.from(ids);
};

/** Replaces every old id in the plan by its new one (ids are UUIDs, so a plain text replace is exact). */
const remapIds = <T>(value: T, ids: Map<string, string>): T => {
  if (ids.size === 0) return value;
  let text = JSON.stringify(value);
  ids.forEach((to, from) => { if (from !== to) text = text.split(from).join(to); });
  return JSON.parse(text);
};

export async function exportBackup(admin: User): Promise<NodeJS.ReadableStream> {
  const zip = new JSZip();
  const users = await storage.listAllUsers();
  const projects = await storage.listAllProjects();
  const manifest: BackupManifest = {
    format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), exportedBy: admin.username,
    users: users.map(u => ({ id: u.id, username: u.username, role: u.role })),
    projects: [], icons: [],
  };

  for (const project of projects) {
    const state = await storage.getProjectState(project.id);
    const files = new Map<string, FileMetadata>();
    for (const meta of await storage.listProjectFiles(project.id)) files.set(meta.id, meta);
    for (const id of referencedFileIds(state)) {
      if (files.has(id)) continue;
      const meta = await storage.getFileMeta(id);
      if (meta) files.set(id, meta);
    }
    const saved: BackupFile[] = [];
    for (const meta of Array.from(files.values())) {
      const buffer = await storage.getFileBuffer(meta.id);
      if (!buffer) continue;
      zip.file(`projects/${project.id}/files/${meta.id}`, buffer);
      saved.push({ id: meta.id, originalName: meta.originalName, mimeType: meta.mimeType, ownerId: meta.ownerId });
    }
    zip.file(`projects/${project.id}/state.json`, JSON.stringify(state ?? {}));
    manifest.projects.push({
      id: project.id, name: project.name, ownerId: project.ownerId, sharedWith: project.sharedWith,
      createdAt: project.createdAt, updatedAt: project.updatedAt, files: saved,
    });
  }

  for (const icon of await storage.listIcons()) {
    const meta = await storage.getFileMeta(icon.fileId);
    const buffer = await storage.getFileBuffer(icon.fileId);
    if (!meta || !buffer) continue;
    zip.file(`icons/${icon.id}`, buffer);
    manifest.icons.push({ id: icon.id, name: icon.name, mimeType: meta.mimeType });
  }

  zip.file("backup.json", JSON.stringify(manifest, null, 2));
  console.log(`[Backup] Export by ${admin.username}: ${manifest.projects.length} projects, ${manifest.icons.length} icons`);
  return zip.generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export class BackupError extends Error {}

export async function importBackup(data: Buffer, admin: User): Promise<ImportReport> {
  const zip = await JSZip.loadAsync(data).catch(() => { throw new BackupError("Not a ZIP file"); });
  const manifestEntry = zip.file("backup.json");
  if (!manifestEntry) throw new BackupError("Not a full backup (backup.json missing) — single projects are imported with “Import from ZIP / JSON”");
  const manifest = JSON.parse(await manifestEntry.async("string")) as BackupManifest;
  if (manifest.format !== FORMAT || manifest.version > VERSION) throw new BackupError("Unsupported backup format");

  const report: ImportReport = { imported: [], skipped: [], createdUsers: [], icons: 0, missingFiles: 0 };
  const ids = new Map<string, string>();

  // Users by username; the ones missing here are created (random password — the admin sets one).
  const backupUsers = new Map(manifest.users.map(u => [u.id, u]));
  const userId = async (oldId: string): Promise<string> => {
    if (ids.has(oldId)) return ids.get(oldId)!;
    const u = backupUsers.get(oldId);
    if (!u) return admin.id;
    let local = await storage.getUserByUsername(u.username);
    if (!local) {
      const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
      local = await storage.createUser({ username: u.username, passwordHash, role: u.role });
      report.createdUsers.push(u.username);
    }
    ids.set(oldId, local.id);
    return local.id;
  };
  // Every user a plan can name (comment authors, photo owners, request authors), not only owners.
  for (const u of manifest.users) await userId(u.id);

  for (const icon of manifest.icons) {
    const entry = zip.file(`icons/${icon.id}`);
    if (!entry) { report.missingFiles++; continue; }
    const buffer = await entry.async("nodebuffer");
    const hash = createHash("sha256").update(buffer).digest("hex");
    const added = await storage.addIcon({ buffer, name: icon.name, mimeType: icon.mimeType, hash, createdBy: admin.id });
    ids.set(icon.id, added.id);
    report.icons++;
  }

  for (const p of manifest.projects) {
    if (await storage.getProject(p.id)) {
      report.skipped.push(p.name);
      continue;
    }
    const ownerId = await userId(p.ownerId);
    await storage.createProject({ id: p.id, name: p.name, ownerId });
    const sharedWith = Array.from(new Set(await Promise.all(p.sharedWith.map(userId)))).filter(id => id !== ownerId);
    if (sharedWith.length) await storage.updateProject(p.id, { sharedWith });

    const fileIds = new Map(ids);
    for (const f of p.files) {
      const entry = zip.file(`projects/${p.id}/files/${f.id}`);
      if (!entry) { report.missingFiles++; continue; }
      const meta = await storage.saveFile(await entry.async("nodebuffer"), f.originalName, f.mimeType, await userId(f.ownerId), p.id);
      fileIds.set(f.id, meta.id);
    }
    const stateEntry = zip.file(`projects/${p.id}/state.json`);
    const state = stateEntry ? JSON.parse(await stateEntry.async("string")) as ProjectState : undefined;
    if (state && Object.keys(state).length) await storage.saveProjectState(p.id, remapIds(state, fileIds));
    report.imported.push(p.name);
  }

  console.log(`[Backup] Import by ${admin.username}: ${report.imported.length} imported, ${report.skipped.length} skipped, ${report.createdUsers.length} users created`);
  return report;
}
