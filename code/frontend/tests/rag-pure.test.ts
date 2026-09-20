import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/ai/chunk";
import { getClientIp, rateKey } from "@/lib/security/rateLimit";

describe("chunkText", () => {
  it("returns short text as a single chunk", () => {
    expect(chunkText("hello world")).toEqual(["hello world"]);
  });

  it("returns [] for blank input", () => {
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("splits long text with overlap and keeps every chunk bounded", () => {
    const para = "lorem ipsum dolor sit amet ".repeat(200);
    const text = [para, para, para].join("\n\n");
    const chunks = chunkText(text, 1200, 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1200);
    // Overlap: second chunk starts with the tail of the first.
    expect(chunks[1]?.startsWith(chunks[0]?.slice(-200) ?? "")).toBe(true);
  });
});

describe("rateKey", () => {
  it("sanitizes hostile segments", () => {
    expect(rateKey(["ask", "user", "a/b:c@d"])).toBe("ask:user:a_b_c_d");
    expect(rateKey(["x", null, undefined])).toBe("x:anon:anon");
  });
});

describe("getClientIp", () => {
  it("takes the first forwarded entry", () => {
    const req = new Request("http://x/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back when no header", () => {
    expect(getClientIp(new Request("http://x/"))).toBe("unknown-ip");
  });
});
