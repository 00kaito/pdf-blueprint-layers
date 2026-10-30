import type { Request, Response } from "express";

/**
 * Live updates of open plans (Server-Sent Events): every save / op of a project tells the tabs that
 * have it open its new revision, and they fetch the plan at once (instead of on the next poll).
 * In-process: fine for one server instance.
 */
const listeners = new Map<string, Set<Response>>();

/** How often an idle stream sends a comment, so proxies do not close it. */
const KEEPALIVE_MS = 25000;

export const openLiveStream = (req: Request, res: Response, projectId: string) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // nginx: pass events through at once.
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 5000\n\n");
  const set = listeners.get(projectId) ?? new Set<Response>();
  set.add(res);
  listeners.set(projectId, set);
  const keepAlive = setInterval(() => res.write(": ping\n\n"), KEEPALIVE_MS);
  req.on("close", () => {
    clearInterval(keepAlive);
    set.delete(res);
    if (set.size === 0) listeners.delete(projectId);
  });
};

export const publishRevision = (projectId: string, revision: number, byUserId: string) => {
  const set = listeners.get(projectId);
  if (!set) return;
  const message = `data: ${JSON.stringify({ revision, by: byUserId })}\n\n`;
  set.forEach((res) => res.write(message));
};
