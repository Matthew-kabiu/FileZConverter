import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/convert/csv";

describe("parseCsv", () => {
  it("handles quoted commas, escaped quotes, and CRLF", () => {
    expect(parseCsv('a,"b,c"\r\nd,"e""f"')).toEqual([
      ["a", "b,c"],
      ["d", 'e"f'],
    ]);
  });

  it("returns rows for plain input", () => {
    expect(parseCsv("a,b\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});
