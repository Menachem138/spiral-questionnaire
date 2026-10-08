import "server-only";
import { timingSafeEqual } from "node:crypto";

/** אימות ה-worker שרץ אצל המנהל (Claude Code / Codex) מול השרת */
export function isWorker(req: Request) {
  const token = process.env.WORKER_TOKEN ?? "";
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token.length < 24 || got.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(token));
}
