import { mkdir, rm, readdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Zero-retention session file handling (privacy terms 2026-09-18).
 * Browser = memory only; server = per-session tmp dirs, deleted after the
 * response. Filenames are generated internally — user input NEVER becomes a
 * path segment. A sweeper purges orphaned sessions (close-without-beacon).
 */
const BASE = join(/*turbopackIgnore: true*/ tmpdir(), "filezconverter");
const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;
const STALE_AFTER_MS = 30 * 60 * 1000;

export function resolveSessionId(provided: unknown): string {
  if (typeof provided === "string" && SESSION_ID.test(provided)) return provided;
  return randomUUID();
}

export async function getSessionDir(sessionId: string): Promise<string> {
  const dir = join(BASE, sessionId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Writes input bytes under a generated name. ext must be allowlisted upstream. */
export async function writeSessionInput(
  sessionId: string,
  ext: string,
  bytes: Uint8Array,
): Promise<string> {
  const dir = await getSessionDir(sessionId);
  const path = join(dir, `input${ext}`);
  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(path);
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(bytes);
  });
  return path;
}

export async function purgeSession(sessionId: string): Promise<boolean> {
  if (!SESSION_ID.test(sessionId)) return false;
  try {
    await rm(join(BASE, basename(sessionId)), {
      recursive: true,
      force: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Deletes session dirs older than STALE_AFTER_MS. Fire-and-forget safe. */
export async function sweepStaleSessions(): Promise<number> {
  let purged = 0;
  let entries: string[];
  try {
    entries = await readdir(BASE);
  } catch {
    return 0;
  }
  const now = Date.now();
  for (const entry of entries) {
    if (!SESSION_ID.test(entry)) continue;
    try {
      const info = await stat(join(BASE, entry));
      if (now - info.mtimeMs > STALE_AFTER_MS) {
        await purgeSession(entry);
        purged += 1;
      }
    } catch {
      continue;
    }
  }
  return purged;
}
