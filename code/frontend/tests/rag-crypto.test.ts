import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Env BEFORE importing the auth/vault chain (auth throws without a secret,
// sqlite defaults to ./data — both must be contained to tmp).
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "filez-rag-crypto-"));
process.env.BETTER_AUTH_SECRET =
  "test-secret-0123456789abcdef0123456789abcdef";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.AI_VAULT_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const { hashResetToken } = await import("@/lib/auth/reset");
const { ownerTag } = await import("@/lib/ai/rag");
const { decryptSecret, encryptSecret } = await import("@/lib/ai/vault");

describe("hashResetToken", () => {
  it("is deterministic hex", () => {
    expect(hashResetToken("abc")).toBe(hashResetToken("abc"));
    expect(hashResetToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("ownerTag", () => {
  it("is hex-only (TAG-safe) and session-scoped", () => {
    const a = ownerTag("user-1", "sess-1");
    expect(a).toMatch(/^[0-9a-f]{40}$/);
    expect(ownerTag("user-1", "sess-2")).not.toBe(a);
    expect(ownerTag("user-2", "sess-1")).not.toBe(a);
  });
});

describe("vault crypto", () => {
  it("round-trips", () => {
    const ct = encryptSecret("sk-test-123");
    expect(ct).not.toContain("sk-test-123");
    expect(decryptSecret(ct)).toBe("sk-test-123");
  });
});
