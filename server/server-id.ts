import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { config } from "./config";

/**
 * This installation's id: random, made once and kept in the file storage (a persistent volume),
 * so it survives restarts and deployments. Exports carry it; an import with the same id comes from
 * this very server (a copy / restore), where user ids can be trusted as they are.
 */
let cached: string | null = null;

export const getServerId = (): string => {
  if (cached) return cached;
  const file = path.resolve(process.cwd(), config.storageDir, "server-id");
  try {
    const stored = fs.readFileSync(file, "utf-8").trim();
    if (stored) return (cached = stored);
  } catch { /* first start */ }
  const id = randomUUID();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, id);
  return (cached = id);
};

/** Extensions of the types an import may have lost (older bundles name files only). */
const EXT_TYPES: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp", heic: "image/heic", heif: "image/heif",
  avif: "image/avif", tif: "image/tiff", tiff: "image/tiff", ico: "image/x-icon",
};

/**
 * The type a file from an import ZIP is stored with. Everything the app keeps is a PDF or an image,
 * so those types pass as declared (an image cannot run code; SVG is fenced by `fileSecurityHeaders`).
 * Anything else (text/html, scripts…) gets the type of its extension, else
 * `application/octet-stream` — a crafted ZIP cannot make the server serve HTML from this origin.
 */
export const safeMimeType = (declared: string | undefined, fileName = ""): string => {
  const type = (declared ?? "").toLowerCase().split(";")[0].trim();
  if (type === "application/pdf" || /^image\/[a-z0-9.+-]+$/.test(type)) return type;
  return EXT_TYPES[fileName.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
};

/** Headers for serving a stored file: no type sniffing; an SVG cannot run scripts when opened directly. */
export const fileSecurityHeaders = (mimeType: string): Record<string, string> => ({
  "X-Content-Type-Options": "nosniff",
  ...(mimeType === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox" } : {}),
});
