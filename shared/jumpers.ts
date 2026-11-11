/**
 * Jumpers: cables between two objects on the plan (TV → floor box HDMI, USB-C to a wall plate…), not
 * home-runs to an IDF. Each jumper is stored on its "from" object (`EditorObject.jumpers`), so it is
 * saved, synced, merged and undone with that object; `toId` points at the other end.
 *
 * Status is field work like a device's: a technician changes it with a `jumperStatus` op, and a PM's
 * save / poll keeps whichever status is newer (`statusUpdatedAt`), per jumper. A jumper is only pulled
 * or not (`JUMPER_STATUSES`); its ends cannot show "pulled" or later until every jumper at them is pulled.
 */

/** The two statuses a jumper has: not pulled yet / pulled. */
export const JUMPER_STATUSES = ['PLANNED', 'CABLE_PULLED'] as const;

/** Pulled (statuses past "pulled" from older saves count too). */
export const isJumperPulled = (j: { status?: string }) => !!j.status && j.status !== 'PLANNED' && j.status !== 'ISSUE';

/** Object statuses that mean its cables are pulled (or further). */
const PULLED_OR_LATER = new Set(['CABLE_PULLED', 'TERMINATED', 'TESTED', 'APPROVED']);

/**
 * Status an object is shown with: one set to pulled or later still shows Planned while a jumper at it is
 * not pulled (`jumperPending`) — something is still missing there. The stored status is kept, so it
 * shows as soon as the jumper is pulled.
 */
export const gatedStatus = <S extends string | undefined>(status: S, jumperPending: boolean): S | 'PLANNED' =>
  jumperPending && status && PULLED_OR_LATER.has(status) ? 'PLANNED' : status;

export const JUMPER_TYPE_IDS = ['HDMI', 'USB_C', 'CAT6', 'SPEAKER', 'COAX', 'FIBER', 'OTHER'] as const;
export type JumperType = (typeof JUMPER_TYPE_IDS)[number];

/** One kind of cable in a jumper: "2× HDMI". */
export type JumperCable = { type: JumperType; count: number };

export type Jumper = {
  id: string;
  /** Object at the other end. */
  toId: string;
  /** Every cable run along this one line (Cat6 + HDMI + USB-C between a TV and its floor box); at least one. */
  cables: JumperCable[];
  /** Waypoints between the two ends (unscaled canvas units); none = a plain arc. */
  points?: { x: number; y: number }[];
  /** Length entered by hand (ft, per cable); unset = measured on the plan. */
  lengthFt?: number;
  label?: string;
  status?: string;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  issueDescription?: string;
};

/**
 * The jumper with its `cables` list. Jumpers saved by the first version held one type (`type`, `count`)
 * instead: they become a one-cable list. Returns `j` itself when it is already in the current shape.
 */
export const normalizeJumper = (j: Jumper): Jumper => {
  if (Array.isArray(j.cables) && j.cables.length) return j;
  const { type, count, ...rest } = j as Jumper & { type?: JumperType; count?: number };
  return { ...rest, cables: [{ type: type && JUMPER_TYPE_IDS.includes(type) ? type : 'OTHER', count: count && count > 0 ? count : 1 }] };
};

const STATUS_KEYS = ['status', 'statusUpdatedAt', 'statusUpdatedBy', 'issueDescription'] as const;

/**
 * `mine` with each jumper's status taken from `theirs` where theirs was changed later (same jumper id).
 * Returns `mine` itself when nothing changes.
 */
export const withNewerJumperStatuses = <J extends Jumper>(mine: J[] | undefined, theirs: J[] | undefined): J[] | undefined => {
  if (!mine?.length || !theirs?.length) return mine;
  const byId = new Map(theirs.map(j => [j.id, j]));
  let changed = false;
  const next = mine.map(j => {
    const t = byId.get(j.id);
    if (!t || (t.statusUpdatedAt ?? '') <= (j.statusUpdatedAt ?? '')) return j;
    changed = true;
    const out: Record<string, unknown> = { ...j };
    for (const key of STATUS_KEYS) {
      if (t[key] === undefined) delete out[key]; else out[key] = t[key];
    }
    return out as J;
  });
  return changed ? next : mine;
};
