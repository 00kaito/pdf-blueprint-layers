import JSZip from "jszip";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { getServerId, safeMimeType } from "./server-id";
import type { FileMetadata, Project, ProjectState, User } from "@shared/schema";

/**
 * Backups, in one format for both sizes:
 *  - the whole server (admin): every project and the icon library;
 *  - one project (anyone who can open it): the same ZIP with just that project.
 * Portable: no accounts or passwords travel with it, so it imports into any server, also a bare
 * installation with its own admin. One full import, or the single-project ZIPs one by one, bring
 * back every project as it was (the icon library is in every ZIP and is matched by content).
 *
 * People travel as username only. The importer owns the imported projects and decides who is who
 * (`PeopleMapping`, the import dialog): an account here for each person — their photos, comments,
 * requests become that account's — and whether to share the project with them. From this very
 * server (same `serverId`) ids are trusted as they are and access is kept as it was.
 * People left without an account stay in the plan as they were and are listed in the project's
 * `importedPeople`, so they can be linked to an account later (`linkImportedPerson`).
 *
 * ZIP layout:
 *   backup.json                      manifest (BackupManifest)
 *   projects/<id>/state.json         the plan (every layer, object and property, as saved)
 *   projects/<id>/files/<fileId>     its files: PDF, overlay PDF, photos, images
 *   icons/<iconId>                   icon library images
 *
 * An import is all or nothing: on any error the projects and icons it added are removed again.
 * File types from the ZIP are checked (`safeMimeType`): only PDFs and images are served as such.
 *
 * Older single-project ZIPs (`project.json` + `document.pdf`, from the in-browser export) are
 * imported too (`importLegacyProject`): their PDFs and photos go to the file storage.
 */

const FORMAT = "pdf-blueprint-backup";
const VERSION = 3;

type BackupFile = { id: string; originalName: string; mimeType: string; ownerId: string };
/** Who a user id in the plan is — nothing else (no password, no e-mail, no role). */
type BackupUser = { id: string; username: string };
type BackupProject = {
  id: string; name: string; ownerId: string; sharedWith: string[];
  createdAt: string; updatedAt: string; files: BackupFile[];
};
type BackupIcon = { id: string; name: string; mimeType: string; createdBy?: string };
export type BackupManifest = {
  format: typeof FORMAT; version: number; exportedAt: string; exportedBy: string;
  /** Installation the ZIP comes from (see `getServerId`). */
  serverId?: string;
  /** 'server' = everything on the server; 'project' = one project. */
  scope?: 'server' | 'project';
  users: BackupUser[]; projects: BackupProject[]; icons: BackupIcon[];
};

/** Per person of the ZIP (by their id there): the account here (null = none) and whether to share the projects with it. */
export type PeopleMapping = Record<string, { userId: string | null; share: boolean }>;

export type ImportReport = {
  imported: string[];
  /** Ids of the imported projects, in the order of `imported`. */
  projectIds: string[];
  skipped: string[];
  /** Imported as a copy (new id) because the project already exists here. */
  copied: string[];
  /** People of the ZIP given an account here ("tech1 → jan"). */
  matchedUsers: string[];
  /** People left without an account: kept in the plan, listed in the project to link later. */
  unknownUsers: string[];
  /** Accounts the projects were shared with. */
  sharedWith: string[];
  /** The ZIP comes from this server (ids and access kept as they were). */
  sameServer: boolean;
  icons: number;
  missingFiles: number;
};

const emptyReport = (): ImportReport => ({
  imported: [], projectIds: [], skipped: [], copied: [], matchedUsers: [], unknownUsers: [], sharedWith: [],
  sameServer: false, icons: 0, missingFiles: 0,
});

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

const zipStream = (zip: JSZip) =>
  zip.generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "DEFLATE", compressionOptions: { level: 6 } });

/** Adds one project (plan + all its files) to the ZIP; returns its manifest entry and the plan. */
const addProject = async (zip: JSZip, project: Project) => {
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
  const entry: BackupProject = {
    id: project.id, name: project.name, ownerId: project.ownerId, sharedWith: project.sharedWith,
    createdAt: project.createdAt, updatedAt: project.updatedAt, files: saved,
  };
  return { entry, state };
};

const addIcons = async (zip: JSZip): Promise<BackupIcon[]> => {
  const icons: BackupIcon[] = [];
  for (const icon of await storage.listIcons()) {
    const meta = await storage.getFileMeta(icon.fileId);
    const buffer = await storage.getFileBuffer(icon.fileId);
    if (!meta || !buffer) continue;
    zip.file(`icons/${icon.id}`, buffer);
    icons.push({ id: icon.id, name: icon.name, mimeType: meta.mimeType, createdBy: icon.createdBy });
  }
  return icons;
};

/**
 * People a project names: accounts here (owner, shares, file owners, any id in the plan) and the
 * people an earlier import left unlinked (`importedPeople`) — so they travel on to the next server.
 */
const namedPeople = (users: User[], project: Project, files: BackupFile[], state: ProjectState | undefined): BackupUser[] => {
  const text = JSON.stringify(state ?? {});
  const named = new Set([project.ownerId, ...project.sharedWith, ...files.map(f => f.ownerId)]);
  const people = users.filter(u => named.has(u.id) || text.includes(u.id)).map(u => ({ id: u.id, username: u.username }));
  for (const [id, username] of Object.entries(state?.importedPeople ?? {})) {
    if (!people.some(p => p.id === id)) people.push({ id, username });
  }
  return people;
};

const newManifest = (by: User, scope: 'server' | 'project'): BackupManifest => ({
  format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), exportedBy: by.username,
  serverId: getServerId(), scope, users: [], projects: [], icons: [],
});

export async function exportBackup(admin: User): Promise<NodeJS.ReadableStream> {
  const zip = new JSZip();
  const allUsers = await storage.listAllUsers();
  const manifest = newManifest(admin, 'server');
  const people = new Map<string, BackupUser>();
  for (const project of await storage.listAllProjects()) {
    const { entry, state } = await addProject(zip, project);
    manifest.projects.push(entry);
    for (const p of namedPeople(allUsers, project, entry.files, state)) people.set(p.id, p);
  }
  manifest.icons = await addIcons(zip);
  manifest.users = Array.from(people.values());

  zip.file("backup.json", JSON.stringify(manifest, null, 2));
  console.log(`[Backup] Export by ${admin.username}: ${manifest.projects.length} projects, ${manifest.icons.length} icons`);
  return zipStream(zip);
}

/** One project in the backup format: its plan and files, the icon library, and the people it names. */
export async function exportProject(project: Project, user: User): Promise<NodeJS.ReadableStream> {
  const zip = new JSZip();
  const { entry, state } = await addProject(zip, project);
  const manifest = newManifest(user, 'project');
  manifest.users = namedPeople(await storage.listAllUsers(), project, entry.files, state);
  manifest.projects = [entry];
  manifest.icons = await addIcons(zip);
  zip.file("backup.json", JSON.stringify(manifest, null, 2));
  console.log(`[Backup] Project export by ${user.username}: ${project.name} (${entry.files.length} files)`);
  return zipStream(zip);
}

export class BackupError extends Error {}

export type ImportOptions = {
  /**
   * What to do with a project whose id already exists here: 'skip' (a full import run twice
   * changes nothing) or 'copy' (import it again under a new id, e.g. a single project re-imported).
   */
  existing: 'skip' | 'copy';
  /** Who is who (the import dialog). Unset: same server → as it was; other server → nobody linked, nothing shared. */
  people?: PeopleMapping;
};

/** Undo of an import that failed half way: what it created. */
type Rollback = { projects: string[]; icons: string[] };

const rollback = async (done: Rollback) => {
  for (const id of done.projects) {
    try { await storage.deleteProject(id); } catch (e) { console.error(`[Backup] Rollback: could not remove project ${id}`, e); }
  }
  for (const id of done.icons) {
    try { await storage.deleteIcon(id); } catch (e) { console.error(`[Backup] Rollback: could not remove icon ${id}`, e); }
  }
};

/** Reads the manifest of a backup ZIP (null = an older single-project ZIP without one). */
export const readManifest = async (zip: JSZip): Promise<BackupManifest | null> => {
  const entry = zip.file("backup.json");
  if (!entry) return null;
  const manifest = JSON.parse(await entry.async("string")) as BackupManifest;
  if (manifest.format !== FORMAT || manifest.version > VERSION) throw new BackupError("Unsupported backup format");
  return manifest;
};

/**
 * Imports a backup (whole server or one project) or an older single-project ZIP. Never creates
 * accounts or touches passwords; the importer owns the projects. Several projects at once: admin only.
 */
export async function importBackup(data: Buffer, user: User, options: ImportOptions, fileName = "Imported project"): Promise<ImportReport> {
  const zip = await JSZip.loadAsync(data).catch(() => { throw new BackupError("Not a ZIP file"); });
  const manifest = await readManifest(zip);
  if (!manifest) {
    if (zip.file("project.json")) return importLegacyProject(zip, user, fileName);
    throw new BackupError("Not a project export (backup.json / project.json missing)");
  }
  if (user.role !== 'admin' && (manifest.scope === 'server' || manifest.projects.length > 1)) {
    throw new BackupError("This is a backup of several projects — an admin imports it (Import all projects)");
  }

  const report = emptyReport();
  report.sameServer = !!manifest.serverId && manifest.serverId === getServerId();

  // Who is who: person of the ZIP (old id) → account here, and whether they get the projects shared.
  const accounts = new Map<string, string>();
  const shareWith = new Set<string>();
  for (const person of manifest.users ?? []) {
    let account: User | undefined;
    let share = false;
    const choice = options.people?.[person.id];
    if (choice) {
      account = choice.userId ? await storage.getUser(choice.userId) : undefined;
      if (choice.userId && !account) throw new BackupError(`Unknown account chosen for ${person.username}`);
      share = choice.share;
    } else if (report.sameServer && !options.people) {
      account = await storage.getUser(person.id);
      share = true; // limited below to the people who had the project
    }
    if (account) {
      accounts.set(person.id, account.id);
      if (share) shareWith.add(person.id);
      report.matchedUsers.push(account.username === person.username ? person.username : `${person.username} → ${account.username}`);
    } else {
      report.unknownUsers.push(person.username);
    }
  }
  /** For stored records that must name a real account (file / icon owner): the chosen account, else the importer. */
  const accountOf = (oldId: string | undefined) => (oldId && accounts.get(oldId)) || user.id;

  const done: Rollback = { projects: [], icons: [] };
  try {
    const existingIcons = new Set((await storage.listIcons()).map(i => i.id));
    const iconIds = new Map<string, string>();
    for (const icon of manifest.icons) {
      const entry = zip.file(`icons/${icon.id}`);
      if (!entry) { report.missingFiles++; continue; }
      const buffer = await entry.async("nodebuffer");
      const hash = createHash("sha256").update(buffer).digest("hex");
      const mimeType = safeMimeType(icon.mimeType, icon.name);
      const added = await storage.addIcon({ buffer, name: icon.name, mimeType, hash, createdBy: accountOf(icon.createdBy) });
      if (!existingIcons.has(added.id)) { done.icons.push(added.id); existingIcons.add(added.id); }
      iconIds.set(icon.id, added.id);
      report.icons++;
    }

    const shared = new Set<string>();
    for (const p of manifest.projects) {
      const exists = !!(await storage.getProject(p.id));
      if (exists && options.existing === 'skip') {
        report.skipped.push(p.name);
        continue;
      }
      const projectId = exists ? uuidv4() : p.id;
      const name = exists ? `${p.name} (copy)` : p.name;
      await storage.createProject({ id: projectId, name, ownerId: user.id, createdAt: p.createdAt });
      done.projects.push(projectId);

      // Same server, nothing chosen: whoever had the project keeps it. Otherwise: the people ticked in the dialog.
      const hadIt = new Set([p.ownerId, ...p.sharedWith]);
      const sharedWith = Array.from(new Set(Array.from(shareWith)
        .filter(oldId => options.people || hadIt.has(oldId))
        .map(oldId => accounts.get(oldId)!)))
        .filter(id => id !== user.id);
      if (sharedWith.length) await storage.updateProject(projectId, { sharedWith });
      sharedWith.forEach(id => shared.add(id));

      const remap = new Map([...Array.from(accounts), ...Array.from(iconIds)]);
      remap.set(p.id, projectId);
      for (const f of p.files) {
        const entry = zip.file(`projects/${p.id}/files/${f.id}`);
        if (!entry) { report.missingFiles++; continue; }
        const mimeType = safeMimeType(f.mimeType, f.originalName);
        const meta = await storage.saveFile(await entry.async("nodebuffer"), f.originalName, mimeType, accountOf(f.ownerId), projectId);
        remap.set(f.id, meta.id);
      }
      const stateEntry = zip.file(`projects/${p.id}/state.json`);
      const state = stateEntry ? JSON.parse(await stateEntry.async("string")) as ProjectState : {} as ProjectState;

      // People of this project without an account here (authors in the plan, owner, shares, file
      // owners): listed in the project, so they can be linked — and given access — later.
      const importedPeople: Record<string, string> = {};
      const text = JSON.stringify(state);
      const involved = new Set([...Array.from(hadIt), ...p.files.map(f => f.ownerId)]);
      for (const [id, username] of Object.entries(state.importedPeople ?? {})) if (!accounts.has(id)) importedPeople[id] = username;
      for (const person of manifest.users ?? []) {
        if (!accounts.has(person.id) && (involved.has(person.id) || text.includes(person.id))) importedPeople[person.id] = person.username;
      }
      const { importedPeople: _old, ...plan } = state;
      const next = remapIds(plan, remap) as ProjectState;
      if (Object.keys(importedPeople).length) next.importedPeople = importedPeople;
      if (Object.keys(state).length) await storage.saveProjectState(projectId, next);

      report.imported.push(name);
      report.projectIds.push(projectId);
      if (exists) report.copied.push(name);
    }
    for (const id of Array.from(shared)) {
      const u = await storage.getUser(id);
      if (u) report.sharedWith.push(u.username);
    }
  } catch (e) {
    console.error(`[Backup] Import by ${user.username} failed — removing what it added`, e);
    await rollback(done);
    throw e instanceof BackupError ? e : new BackupError(`Import failed, nothing was imported: ${e instanceof Error ? e.message : String(e)}`);
  }

  console.log(`[Backup] Import by ${user.username}: ${report.imported.length} imported, ${report.skipped.length} skipped, ${report.matchedUsers.length} people linked, ${report.unknownUsers.length} not`);
  return report;
}

/**
 * Links a person an import left without an account (`importedPeople`) to an account here: their
 * photos, comments and requests in the plan become the account's; optionally shares the project.
 * Returns the new plan revision.
 */
export const linkImportedPerson = (state: ProjectState, personId: string, userId: string): ProjectState => {
  const { importedPeople = {}, ...plan } = state;
  if (!(personId in importedPeople)) throw new BackupError("This person is not in the project's imported people");
  const rest = { ...importedPeople };
  delete rest[personId];
  const next = remapIds(plan, new Map([[personId, userId]])) as ProjectState;
  if (Object.keys(rest).length) next.importedPeople = rest;
  return next;
};

const DATA_URL = /^data:([^;,]+)(;base64)?,([\s\S]*)$/;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

/**
 * Older single-project ZIP (in-browser export: `project.json` with photos inlined as data URLs,
 * `document.pdf`, `overlay.pdf`): a new project owned by the importer, its PDFs and photos stored
 * as files like any other project's. All or nothing, like `importBackup`.
 */
async function importLegacyProject(zip: JSZip, user: User, fileName: string): Promise<ImportReport> {
  const report = emptyReport();
  const data = JSON.parse(await zip.file("project.json")!.async("string"));
  const name = (typeof data.projectName === 'string' && data.projectName.trim()) || fileName.replace(/\.zip$/i, '') || 'Imported project';
  const project = await storage.createProject({ name, ownerId: user.id });
  try {
    const saveEntry = async (path: string, mimeType: string, originalName: string) => {
      const entry = zip.file(path);
      if (!entry) return null;
      return storage.saveFile(await entry.async("nodebuffer"), originalName, safeMimeType(mimeType, originalName), user.id, project.id);
    };
    const pdf = await saveEntry("document.pdf", "application/pdf", "blueprint.pdf");
    const overlay = await saveEntry("overlay.pdf", "application/pdf", "overlay.pdf");

    /** Photo / image from a data URL or an `assets/…` entry → stored file URL. */
    const cache = new Map<string, string>();
    const toFileUrl = async (value: string, label: string): Promise<string> => {
      if (typeof value !== 'string') return value;
      if (cache.has(value)) return cache.get(value)!;
      let meta: FileMetadata | null = null;
      const m = DATA_URL.exec(value);
      if (m) {
        const buffer = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
        const fileName = `${label}.${EXT[m[1]] ?? 'bin'}`;
        meta = await storage.saveFile(buffer, fileName, safeMimeType(m[1], fileName), user.id, project.id);
      } else if (value.startsWith('assets/')) {
        const base = value.split('/').pop() || label;
        meta = await saveEntry(value, '', base);
        if (!meta) report.missingFiles++;
      }
      const url = meta ? `/api/files/${meta.id}` : value;
      cache.set(value, url);
      return url;
    };

    const objects = await Promise.all((data.objects ?? []).map(async (o: any) => {
      const next = { ...o };
      if (Array.isArray(o.photos)) {
        next.photos = await Promise.all(o.photos.map((p: string, i: number) => toFileUrl(p, `photo-${i + 1}`)));
        // Who added which photo, where the old bundle still says so (inlined photos lost it: no author).
        const by: Record<string, string> = {};
        next.photos.forEach((url: string, i: number) => {
          const author = o.photoBy?.[o.photos[i]];
          if (author) by[url] = author;
        });
        next.photoBy = by;
      }
      if (o.type === 'image' && typeof o.content === 'string' && o.content.startsWith('assets/')) {
        next.content = await toFileUrl(o.content, 'image');
      }
      return next;
    }));

    const { projectName: _name, ...rest } = data;
    await storage.saveProjectState(project.id, {
      ...rest, objects,
      pdfFileId: pdf?.id ?? null,
      overlayPdfFileId: overlay?.id ?? null,
    } as ProjectState);
    if (!pdf) report.missingFiles++;
  } catch (e) {
    console.error(`[Backup] Legacy import by ${user.username} failed — removing it`, e);
    await rollback({ projects: [project.id], icons: [] });
    throw new BackupError(`Import failed, nothing was imported: ${e instanceof Error ? e.message : String(e)}`);
  }
  report.imported.push(name);
  report.projectIds.push(project.id);
  console.log(`[Backup] Legacy project import by ${user.username}: ${name}`);
  return report;
}
