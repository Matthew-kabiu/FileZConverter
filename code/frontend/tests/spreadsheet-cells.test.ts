import { describe, expect, it } from "vitest";
import {
  csvToXlsx,
  editWorkbook,
  readWorkbook,
  rowsToXlsx,
  xlsxToCsv,
} from "@/lib/services/spreadsheet/spreadsheet.service";
import { convertDocument } from "@/lib/services/convert/document.service";

describe("spreadsheet service (exceljs)", () => {
  it("csv→xlsx→csv round-trips quoted commas", async () => {
    const xlsx = await csvToXlsx('a,"b,c"\nd,e');
    const back = await xlsxToCsv(xlsx);
    expect(back).toBe('a,"b,c"\nd,e');
  });

  it("editWorkbook applies cell edits", async () => {
    const base = await rowsToXlsx([["a", "b"]]);
    const out = await editWorkbook(base, [
      { sheet: "sheet1", cell: "B1", value: "EDITED" },
    ]);
    const sheets = await readWorkbook(out);
    expect(sheets[0].rows[0]).toEqual(["a", "EDITED"]);
  });

  it("editWorkbook rejects unknown sheets", async () => {
    const base = await rowsToXlsx([["a"]]);
    await expect(
      editWorkbook(base, [{ sheet: "nope", cell: "A1", value: "x" }]),
    ).rejects.toThrow("Worksheet not found");
  });
});

describe("spreadsheet matrix cells", () => {
  it(
    "xlsx→pdf produces %PDF; legacy xls→csv works",
    async () => {
      const xlsx = await rowsToXlsx([
        ["name", "qty"],
        ["apples", 3],
      ]);
      const pdf = await convertDocument({
        sessionId: "test-xlsx-pdf",
        filename: "stock.xlsx",
        bytes: xlsx,
        from: "xlsx",
        target: "pdf",
      });
      expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");

      // Legacy .xls fixture via soffice, then back to csv.
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const { mkdtemp, readFile, writeFile } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");
      const dir = await mkdtemp(join(tmpdir(), "filez-xls-"));
      await writeFile(join(dir, "stock.xlsx"), xlsx);
      await promisify(execFile)("soffice", [
        "--headless",
        "-env:UserInstallation=file://" + dir + "/profile",
        "--convert-to",
        "xls",
        "--outdir",
        dir,
        join(dir, "stock.xlsx"),
      ]);
      const xls = new Uint8Array(await readFile(join(dir, "stock.xls")));
      const csv = await convertDocument({
        sessionId: "test-xls-csv",
        filename: "stock.xls",
        bytes: xls,
        from: "xls",
        target: "csv",
      });
      const text = new TextDecoder().decode(csv.bytes);
      expect(text).toContain("apples");
    },
    180_000,
  );
});
