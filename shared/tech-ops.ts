/**
 * Field work on a project, shared by the server (which applies it) and the client (which sends it).
 *
 * A technician (TECH) cannot save the whole project. Everything they do goes to the server as small
 * operations ("ops") that the server checks and applies to the stored state: status, label position,
 * change requests (move / rename / IDF) for the PM to approve, comments and photos. PMs use the same
 * ops for comments, photos and their decisions on requests.
 *
 * Comments, photos and requests belong to the server: a PM's full save keeps the stored ones (the
 * PM's open plan may not have the latest yet), and status / label position keep whichever is newer.
 */

export type UserRole = 'admin' | 'PM' | 'TECH';

export type OpsUser = { id: string; username: string; role: string };

export type ObjectComment = {
  id: string;
  text: string;
  authorId?: string;
  authorName: string;
  authorRole?: string;
  /** ISO time; empty for comments from before authors were kept. */
  at: string;
  /** Top-level comment this one answers. */
  replyTo?: string;
};

/** What a technician asks to change; `rackId: null` = back to the nearest IDF. */
export type RequestChanges = { x?: number; y?: number; name?: string; rackId?: string | null };

/** A technician's pending change request on an object — one per object, later edits join it. */
export type TechRequest = {
  id: string;
  byId: string;
  byName: string;
  at: string;
  note?: string;
  changes: RequestChanges;
  /** The values when the request was made, to show "from → to". */
  from: { x: number; y: number; name?: string; rackId?: string | null };
};

/** The PM's decision on the last request, kept on the object so the technician sees it. */
export type RequestResult = {
  approved: boolean;
  reason?: string;
  byName: string;
  at: string;
  changes: RequestChanges;
  requestedBy: string;
};

export type TechOp =
  | { type: 'status'; objectId: string; status: string; issueDescription?: string }
  | { type: 'label'; objectId: string; labelPosition: 'bottom' | 'top' | 'left' | 'right' }
  | { type: 'request'; objectId: string; changes: RequestChanges; note?: string }
  | { type: 'cancelRequest'; objectId: string }
  | { type: 'resolve'; objectId: string; approve: boolean; reason?: string }
  | { type: 'comment'; objectId: string; text: string; replyTo?: string }
  | { type: 'deleteComment'; objectId: string; commentId: string }
  | { type: 'addPhoto'; objectId: string; url: string }
  | { type: 'removePhoto'; objectId: string; url: string };

/** Fields only ops change: a full save keeps the stored values. */
export const SERVER_OWNED_FIELDS = ['comments', 'photos', 'photoBy', 'techRequest', 'requestResult'] as const;

export const isManager = (role: string | undefined) => role === 'PM' || role === 'admin';

type Obj = Record<string, any>;

let idCounter = 0;
const newId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Comments as objects: projects from before kept plain strings. */
export const normalizeComments = (comments: unknown): ObjectComment[] =>
  Array.isArray(comments)
    ? comments.map((c, i) => typeof c === 'string'
      ? { id: `legacy-${i}`, text: c, authorName: '', at: '' }
      : c as ObjectComment)
    : [];

/** The changes that really differ from the object as it is now (an unchanged value drops out). */
export const effectiveChanges = (o: Obj, changes: RequestChanges): RequestChanges => {
  const out: RequestChanges = {};
  if (changes.x !== undefined && changes.y !== undefined && (Math.abs(changes.x - o.x) > 0.01 || Math.abs(changes.y - o.y) > 0.01)) {
    out.x = changes.x;
    out.y = changes.y;
  }
  if (changes.name !== undefined && changes.name !== (o.name ?? '')) out.name = changes.name;
  if (changes.rackId !== undefined && (changes.rackId ?? null) !== (o.metadata?.rackId ?? null)) out.rackId = changes.rackId;
  return out;
};

export const hasChanges = (c: RequestChanges) => Object.keys(c).length > 0;

/** The object with the requested changes applied (an approved request). */
export const applyChanges = (o: Obj, c: RequestChanges): Obj => {
  const next: Obj = { ...o };
  if (c.x !== undefined && c.y !== undefined) { next.x = c.x; next.y = c.y; }
  if (c.name !== undefined) next.name = c.name;
  if (c.rackId !== undefined) {
    const metadata = { ...(o.metadata ?? {}) };
    if (c.rackId === null) delete metadata.rackId; else metadata.rackId = c.rackId;
    next.metadata = metadata;
  }
  return next;
};

export class OpError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/**
 * Applies ops to the stored objects (in order). Throws OpError when an op is not allowed.
 * `photoOwners`: who uploaded each photo URL of an addPhoto op (checked by the caller against the files table).
 */
export const applyOps = (
  objects: Obj[],
  ops: TechOp[],
  user: OpsUser,
  photoOwners: Record<string, string | undefined> = {},
  now = new Date().toISOString(),
): { objects: Obj[]; changedIds: string[] } => {
  const byId = new Map(objects.map(o => [o.id as string, o]));
  const changed = new Set<string>();
  const manager = isManager(user.role);

  for (const op of ops) {
    const o = byId.get(op.objectId);
    if (!o) throw new OpError('Object not found — it may have been deleted, or not saved yet', 409);
    let next: Obj = o;

    switch (op.type) {
      case 'status':
        next = {
          ...o, status: op.status, statusUpdatedAt: now, statusUpdatedBy: user.username,
          ...(op.issueDescription !== undefined ? { issueDescription: op.issueDescription } : {}),
        };
        break;
      case 'label': {
        const { labelOffset, ...rest } = o;
        next = { ...rest, labelPosition: op.labelPosition, labelUpdatedAt: now };
        break;
      }
      case 'request': {
        if (manager) throw new OpError('PMs change the plan directly');
        const prev = o.techRequest as TechRequest | undefined;
        const mine = prev && prev.byId === user.id ? prev : undefined;
        if (prev && !mine) throw new OpError(`${prev.byName} already has a pending request on this object`, 409);
        const changes = effectiveChanges(o, { ...(mine?.changes ?? {}), ...op.changes });
        const { techRequest, ...rest } = o;
        next = hasChanges(changes)
          ? {
            ...rest,
            techRequest: {
              id: mine?.id ?? newId(), byId: user.id, byName: user.username, at: now,
              note: op.note?.trim() || mine?.note, changes,
              from: mine?.from ?? { x: o.x, y: o.y, name: o.name, rackId: o.metadata?.rackId ?? null },
            } satisfies TechRequest,
          }
          : rest;
        break;
      }
      case 'cancelRequest': {
        const req = o.techRequest as TechRequest | undefined;
        if (!req) break;
        if (!manager && req.byId !== user.id) throw new OpError('Only the author or a PM can cancel this request', 403);
        const { techRequest, ...rest } = o;
        next = rest;
        break;
      }
      case 'resolve': {
        if (!manager) throw new OpError('Only a PM can approve or reject requests', 403);
        const req = o.techRequest as TechRequest | undefined;
        if (!req) break;
        const { techRequest, ...rest } = o;
        const reason = op.reason?.trim() || undefined;
        next = {
          ...(op.approve ? applyChanges(rest, req.changes) : rest),
          requestResult: { approved: op.approve, reason, byName: user.username, at: now, changes: req.changes, requestedBy: req.byName } satisfies RequestResult,
        };
        if (!op.approve && reason) {
          next.comments = [...normalizeComments(o.comments), {
            id: newId(), text: `Request rejected: ${reason}`, authorId: user.id, authorName: user.username, authorRole: user.role, at: now,
          } satisfies ObjectComment];
        }
        break;
      }
      case 'comment': {
        const text = op.text.trim();
        if (!text) break;
        const comments = normalizeComments(o.comments);
        // Replies hang off top-level comments only.
        const parent = op.replyTo ? comments.find(c => c.id === op.replyTo) : undefined;
        if (op.replyTo && !parent) throw new OpError('The comment you replied to was deleted', 409);
        next = {
          ...o,
          comments: [...comments, {
            id: newId(), text, authorId: user.id, authorName: user.username, authorRole: user.role, at: now,
            ...(parent ? { replyTo: parent.replyTo ?? parent.id } : {}),
          } satisfies ObjectComment],
        };
        break;
      }
      case 'deleteComment': {
        const comments = normalizeComments(o.comments);
        const target = comments.find(c => c.id === op.commentId);
        if (!target) break;
        if (!manager && target.authorId !== user.id) throw new OpError('You can only delete your own comments', 403);
        next = { ...o, comments: comments.filter(c => c.id !== op.commentId && c.replyTo !== op.commentId) };
        break;
      }
      case 'addPhoto': {
        if (photoOwners[op.url] !== user.id) throw new OpError('Photo not found', 400);
        if ((o.photos ?? []).includes(op.url)) break;
        next = { ...o, photos: [...(o.photos ?? []), op.url], photoBy: { ...(o.photoBy ?? {}), [op.url]: user.id } };
        break;
      }
      case 'removePhoto': {
        if (!manager && o.photoBy?.[op.url] !== user.id) throw new OpError('You can only remove photos you added', 403);
        const { [op.url]: _, ...photoBy } = o.photoBy ?? {};
        next = { ...o, photos: (o.photos ?? []).filter((p: string) => p !== op.url), photoBy };
        break;
      }
    }
    if (next !== o) {
      byId.set(op.objectId, next);
      changed.add(op.objectId);
    }
  }
  return { objects: objects.map(o => byId.get(o.id) ?? o), changedIds: Array.from(changed) };
};

/**
 * A PM's full save over the stored state: comments, photos and requests stay as stored (only ops
 * change them), and status / label position stay as stored when they were changed later than the
 * PM's copy (a technician's op the PM's plan had not picked up yet).
 */
export const mergeManagerSave = (stored: Obj[] | undefined, incoming: Obj[]): Obj[] => {
  if (!stored) return incoming;
  const byId = new Map(stored.map(o => [o.id as string, o]));
  return incoming.map(o => {
    const s = byId.get(o.id);
    if (!s) return o;
    const next: Obj = { ...o };
    for (const key of SERVER_OWNED_FIELDS) {
      if (s[key] === undefined) delete next[key]; else next[key] = s[key];
    }
    if ((s.statusUpdatedAt ?? '') > (o.statusUpdatedAt ?? '')) {
      for (const key of ['status', 'statusUpdatedAt', 'statusUpdatedBy', 'issueDescription']) next[key] = s[key];
    }
    if ((s.labelUpdatedAt ?? '') > (o.labelUpdatedAt ?? '')) {
      for (const key of ['labelPosition', 'labelOffset', 'labelUpdatedAt']) {
        if (s[key] === undefined) delete next[key]; else next[key] = s[key];
      }
    }
    return next;
  });
};

/** Short description of requested changes: "move 4.2 ft · rename "A" → "B" · IDF → IDF 2". */
export const describeChanges = (
  c: RequestChanges,
  from: { x: number; y: number; name?: string },
  opts: { feetPerUnit?: number | null; rackName?: (id: string | null) => string } = {},
): string[] => {
  const parts: string[] = [];
  if (c.x !== undefined && c.y !== undefined) {
    const d = Math.hypot(c.x - from.x, c.y - from.y);
    parts.push(opts.feetPerUnit ? `Move ${(d * opts.feetPerUnit).toFixed(1)} ft` : 'Move');
  }
  if (c.name !== undefined) parts.push(`Rename "${from.name ?? ''}" → "${c.name}"`);
  if (c.rackId !== undefined) parts.push(`IDF → ${opts.rackName ? opts.rackName(c.rackId) : (c.rackId ?? 'nearest')}`);
  return parts;
};
