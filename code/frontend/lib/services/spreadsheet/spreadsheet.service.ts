import ExcelJS from "exceljs";

export interface SheetData {
  name: string;
  rows: (string | number)[][];
}

export interface CellEdit {
  /** Worksheet name or 1-based index. */
  sheet: string | number;
  /** A1-style reference, e.g. "B2". */
  cell: string;
  value: string | number | boolean | null;
}

/** Reads every worksheet into plain row arrays (render payload + edit base). */
export async function readWorkbook(buffer: Uint8Array): Promise<SheetData[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const out: SheetData[] = [];
  wb.eachSheet((ws) => {
    const rows: (string | number)[][] = [];
    ws.eachRow((row) => {
      const cells: (string | number)[] = [];
      row.eachCell((cell) => {
        const v = cell.value;
        cells.push(
          typeof v === "string" || typeof v === "number"
            ? v
            : (cell.text ?? ""),
        );
      });
      rows.push(cells);
    });
    out.push({ name: ws.name, rows });
  });
  return out;
}

/** Applies cell edits and returns fresh .xlsx bytes. */
export async function editWorkbook(
  buffer: Uint8Array,
  edits: CellEdit[],
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  for (const edit of edits) {
    const ws =
      typeof edit.sheet === "number"
        ? wb.getWorksheet(edit.sheet)
        : wb.getWorksheet(edit.sheet);
    if (!ws) throw new Error(`Worksheet not found: ${edit.sheet}`);
    ws.getCell(edit.cell).value = edit.value;
  }
  const out = await wb.xlsx.writeBuffer();
  return new Uint8Array(out as ArrayBuffer);
}

/** Builds a single-sheet .xlsx from row arrays. */
export async function rowsToXlsx(
  rows: (string | number)[][],
  sheetName = "sheet1",
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  for (const row of rows) ws.addRow(row);
  const out = await wb.xlsx.writeBuffer();
  return new Uint8Array(out as ArrayBuffer);
}

/** .xlsx → csv text (first worksheet). */
export async function xlsxToCsv(buffer: Uint8Array): Promise<string> {
  const sheets = await readWorkbook(buffer);
  if (sheets.length === 0) return "";
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return sheets[0].rows.map((row) => row.map(escape).join(",")).join("\n");
}

/** csv text → .xlsx bytes (parsed by exceljs itself — quoted commas safe). */
export async function csvToXlsx(csv: string): Promise<Uint8Array> {
  const { Readable } = await import("node:stream");
  const wb = new ExcelJS.Workbook();
  await wb.csv.read(Readable.from([csv]));
  const ws = wb.getWorksheet("sheet1") ?? wb.worksheets[0];
  const rows: (string | number)[][] = [];
  ws?.eachRow((row) => {
    const cells: (string | number)[] = [];
    row.eachCell((cell) => {
      const v = cell.value;
      cells.push(
        typeof v === "string" || typeof v === "number" ? v : (cell.text ?? ""),
      );
    });
    rows.push(cells);
  });
  return rowsToXlsx(rows);
}
