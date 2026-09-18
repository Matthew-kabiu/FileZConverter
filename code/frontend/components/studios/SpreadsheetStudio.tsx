"use client";

import { useState } from "react";
import { Download, Pencil, Upload } from "lucide-react";
import { StudioCard, StudioShell } from "@/components/studio/StudioShell";
import { Dropzone } from "@/components/studio/Dropzone";
import { FilePanel } from "@/components/studio/FilePanel";
import { PreviewPane } from "@/components/studio/PreviewPane";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { notify } from "@/components/feedback/toast";
import { useConvertSession } from "@/hooks/useConvertSession";
import { usePresetTarget } from "@/hooks/usePresetTarget";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { extOf, outputName, targetsFor } from "@/lib/tools/tools";

interface SheetData {
  name: string;
  rows: (string | number)[][];
}

interface WorkbookFile {
  id: string;
  file: File;
  sheets: SheetData[];
  activeSheet: number;
  ready: boolean;
}

const ACCEPT = ["xlsx", "xls", "ods", "csv"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SpreadsheetStudio() {
  const [books, setBooks] = useState<WorkbookFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [target, setTarget] = usePresetTarget(
    ["csv", "pdf", "html", "xlsx"],
    "csv",
  );
  const [working, setWorking] = useState(false);
  const [editSheet, setEditSheet] = useState("");
  const [editCell, setEditCell] = useState("A1");
  const [editValue, setEditValue] = useState("");
  const { sessionId } = useConvertSession();

  const active = books.find((b) => b.id === activeId) ?? null;
  const sheetTargets = active
    ? targetsFor(extOf(active.file.name))
    : ["csv", "pdf"];
  const currentTarget = sheetTargets.includes(target) ? target : sheetTargets[0];

  const parseXlsxInBrowser = async (file: File): Promise<SheetData[]> => {
    if (extOf(file.name) === "csv") {
      const { parseCsv } = await import("@/lib/convert/csv");
      const text = await file.text();
      return [{ name: "sheet1", rows: parseCsv(text) }];
    }
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
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
  };

  const onFiles = async (incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter((file) => {
      const ok = ACCEPT.includes(extOf(file.name));
      if (!ok) notify.warning(`".${extOf(file.name)}" is not a spreadsheet — try another studio.`);
      return ok;
    });
    if (accepted.length === 0) return;
    const fresh: WorkbookFile[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      sheets: [],
      activeSheet: 0,
      ready: false,
    }));
    setBooks((prev) => [...prev, ...fresh]);
    setActiveId((prev) => prev ?? fresh[0].id);
    setWorking(true);
    try {
      for (const book of fresh) {
        let sheets: SheetData[];
        if (["xlsx", "csv"].includes(extOf(book.file.name))) {
          sheets = await parseXlsxInBrowser(book.file);
        } else {
          // Legacy/ODT sheets have no browser engine: convert to CSV on the
          // server once, then preview from text.
          const blob = await apiClient.convert.document(
            book.file,
            book.file.name,
            "csv",
            sessionId(),
          );
          const text = await blob.text();
          sheets = [
            {
              name: "sheet1",
              rows: text
                .split(/\r?\n/)
                .filter((l) => l.length > 0)
                .map((l) => l.split(",")),
            },
          ];
        }
        setBooks((prev) =>
          prev.map((b) => (b.id === book.id ? { ...b, sheets, ready: true } : b)),
        );
      }
      notify.success("Sheets loaded — preview below.");
    } catch (err) {
      notify.error(err instanceof ApiClientError ? err : "Load failed.");
    } finally {
      setWorking(false);
    }
  };

  const removeBook = (id: string) =>
    setBooks((prev) => {
      const rest = prev.filter((b) => b.id !== id);
      if (activeId === id) setActiveId(rest[0]?.id ?? null);
      return rest;
    });

  const setSheet = (index: number) => {
    if (!activeId) return;
    setBooks((prev) =>
      prev.map((b) => (b.id === activeId ? { ...b, activeSheet: index } : b)),
    );
  };

  const convert = async () => {
    if (!active) {
      notify.warning("Upload a spreadsheet first.");
      return;
    }
    setWorking(true);
    try {
      const blob = await apiClient.convert.document(
        active.file,
        active.file.name,
        currentTarget,
        sessionId(),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outputName(active.file.name, currentTarget);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("Converted on the server — tmp already deleted.");
    } catch (err) {
      notify.error(err instanceof ApiClientError ? err : "Conversion failed.");
    } finally {
      setWorking(false);
    }
  };

  const writeCell = async () => {
    if (!active || !editValue) {
      notify.warning("Upload a sheet and enter a value first.");
      return;
    }
    setWorking(true);
    try {
      // Cell editing needs .xlsx: convert legacy sources first.
      let file = active.file;
      if (extOf(file.name) !== "xlsx") {
        const converted = await apiClient.convert.document(
          file,
          file.name,
          "xlsx",
          sessionId(),
        );
        file = new File([converted], outputName(file.name, "xlsx"), {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      }
      const blob = await apiClient.convert.spreadsheet(file, file.name, [
        {
          sheet: editSheet || active.sheets[active.activeSheet]?.name || "sheet1",
          cell: editCell.toUpperCase(),
          value: editValue,
        },
      ]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outputName(active.file.name, "edited") + ".xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success(`Wrote ${editValue} into ${editCell.toUpperCase()}.`);
    } catch (err) {
      notify.error(err instanceof ApiClientError ? err : "Cell write failed.");
    } finally {
      setWorking(false);
    }
  };

  const current = active?.sheets[active.activeSheet];

  return (
    <StudioShell
      title="Spreadsheet Converter"
      subtitle="Upload XLSX, legacy XLS, ODS, or CSV — preview tables, edit cells, and export CSV or PDF."
      toolbar={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Select
            ariaLabel="Conversion target"
            value={currentTarget}
            onChange={setTarget}
            options={sheetTargets.map((t) => ({
              value: t,
              label: `Sheet → ${t}`,
            }))}
          />
          <Button icon={Download} loading={working} onClick={convert}>
            Convert & Download
          </Button>
        </div>
      }
      panel={
        books.length > 0 ? (
          <FilePanel
            files={books.map((b) => ({
              id: b.id,
              name: b.file.name,
              detail: b.ready
                ? `${b.sheets.length} sheet${b.sheets.length === 1 ? "" : "s"} · ${formatSize(b.file.size)}`
                : "loading…",
            }))}
            activeId={activeId}
            onSelect={setActiveId}
            onRemove={removeBook}
            onAddMore={onFiles}
            acceptExts={ACCEPT}
          />
        ) : undefined
      }
      left={
        <>
          <StudioCard title="Upload Spreadsheet" icon={<Upload size={17} aria-hidden />}>
            <Dropzone
              acceptLabel="Supports .xlsx, .xls, .ods, .csv"
              onFiles={onFiles}
              compact
            />
          </StudioCard>
          <StudioCard title="Cell Editor" icon={<Pencil size={17} aria-hidden />}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Worksheet name"
                value={editSheet}
                onChange={(e) => setEditSheet(e.target.value)}
                placeholder={current ? active.sheets[active.activeSheet]?.name : "sheet"}
                className="h-9 w-28 rounded-lg border border-ocean-500/20 bg-transparent px-2 font-mono text-xs dark:border-white/10"
              />
              <input
                aria-label="Cell reference"
                value={editCell}
                onChange={(e) => setEditCell(e.target.value.toUpperCase())}
                placeholder="B2"
                className="h-9 w-20 rounded-lg border border-ocean-500/20 bg-transparent px-2 font-mono text-xs dark:border-white/10"
              />
              <input
                aria-label="Value to write"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="value"
                className="h-9 w-32 flex-1 rounded-lg border border-ocean-500/20 bg-transparent px-2 text-xs dark:border-white/10"
              />
              <Button icon={Pencil} loading={working} onClick={writeCell}>
                Write cell
              </Button>
            </div>
          </StudioCard>
        </>
      }
      right={
        <>
          <PreviewPane
            label={active ? `Table Preview — ${active.file.name}` : "Table Preview"}
            emptyHint="Your spreadsheet preview will appear here."
          >
            {current && current.rows.length > 0 ? (
              <div>
                {active.sheets.length > 1 && (
                  <div className="mb-2 flex gap-1 overflow-x-auto">
                    {active.sheets.map((s, i) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setSheet(i)}
                        className={`whitespace-nowrap rounded-md px-3 py-1 font-display text-xs font-medium ${
                          i === active.activeSheet
                            ? "bg-ocean-500/15 text-ocean-400 dark:text-surf-600"
                            : "opacity-60 hover:bg-ocean-500/5"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                <table className="w-full border-collapse font-mono text-xs">
                  <tbody>
                    {current.rows.slice(0, 200).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="whitespace-nowrap border border-ocean-500/15 px-2 py-1 dark:border-white/10"
                          >
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {current.rows.length > 200 && (
                  <p className="mt-2 text-[11px] opacity-60">
                    Showing first 200 of {current.rows.length} rows.
                  </p>
                )}
              </div>
            ) : undefined}
          </PreviewPane>
        </>
      }
    />
  );
}
