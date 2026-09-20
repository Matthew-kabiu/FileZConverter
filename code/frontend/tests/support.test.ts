import { describe, expect, it } from "vitest";
import {
  buildSupportPayload,
  validateSupportEmail,
  validateSupportInput,
} from "@/lib/support/support";

describe("support payload", () => {
  it("builds a trimmed payload with timestamp", () => {
    const now = new Date("2026-09-20T12:00:00.000Z");
    expect(
      buildSupportPayload({
        type: "bug",
        description: "  PDF export drops tables  ",
        email: "  ada@example.com ",
        page: "https://app/pdf",
        now,
      }),
    ).toEqual({
      type: "bug",
      description: "PDF export drops tables",
      email: "ada@example.com",
      page: "https://app/pdf",
      app: "FilezConverter",
      timestamp: "2026-09-20T12:00:00.000Z",
    });
  });

  it("nulls an empty email", () => {
    const payload = buildSupportPayload({
      type: "feature",
      description: "Dark mode for previews please",
      email: "   ",
      page: "/",
    });
    expect(payload.email).toBeNull();
  });

  it("rejects short and oversized descriptions", () => {
    expect(validateSupportInput("  short  ")).not.toBeNull();
    expect(validateSupportInput("a".repeat(5001))).not.toBeNull();
    expect(
      validateSupportInput("The merge lane drops page three every time"),
    ).toBeNull();
  });

  it("allows empty email but rejects malformed ones", () => {
    expect(validateSupportEmail("")).toBeNull();
    expect(validateSupportEmail("   ")).toBeNull();
    expect(validateSupportEmail("not-an-email")).not.toBeNull();
    expect(validateSupportEmail("ada@example.com")).toBeNull();
  });
});
