"use client";

import { useEffect, useRef, useState } from "react";
import {
  Files,
  Scissors,
  Type,
  Upload,
} from "lucide-react";
import { StudioCard } from "@/components/studio/StudioShell";
import { Dropzone } from "@/components/studio/Dropzone";
import { FilePanel } from "@/components/studio/FilePanel";
import { PreviewPane } from "@/components/studio/PreviewPane";
import { Button } from "@/components/ui/Button";
import { notify } from "@/components/feedback/toast";
import { useConvertSession } from "@/hooks/useConvertSession";
import { useRagIndexFiles } from "@/hooks/useRagIndex";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { authClient } from "@/lib/auth/client";
import { getRagSessionId } from "@/lib/rag-session";
import { loadStudioSnapshot, saveStudioSnapshot } from "@/lib/storage/studioStore";

type ExtractionState = "pending" | "extracting" | "ready" | "empty" | "error";

interface PdfFile {
  id: string;
  file: File;
  url: string;
  selected: boolean;
  text: string;
  extraction: ExtractionState;
}

interface StoredPdfFile {
  id: string;
  file: File;
  selected: boolean;
  text: string;
  extraction: ExtractionState;
}

interface PdfSnapshot {
  files: StoredPdfFile[];
  activeId: string | null;
  pages: string;
}

const SNAPSHOT_KEY = "pdf";

async function extractPdfText(file: File, sessionId: string): Promise<string> {
  const blob = await apiClient.convert.document(file, file.name, "txt", sessionId);
  return blob.text();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PdfStudio() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pages, setPages] = useState("");
  const [restored, setRestored] = useState(false);
  const [working, setWorking] = useState(false);
  const { sessionId } = useConvertSession();
  const { data: authSession, isPending: authPending } = authClient.useSession();
  const filesRef = useRef(files);
  const extractingRef = useRef(new Set<string>());

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    let active = true;
    void loadStudioSnapshot<PdfSnapshot>(SNAPSHOT_KEY).then((snapshot) => {
      if (!active) return;
      const saved = Array.isArray(snapshot?.files)
        ? snapshot.files
            .filter(
              (entry) =>
                typeof entry?.id === "string" &&
                entry?.file instanceof File &&
                typeof entry?.selected === "boolean",
            )
            .map((entry) => ({
              ...entry,
              text: typeof entry.text === "string" ? entry.text : "",
              extraction:
                entry.extraction === "ready" || entry.extraction === "empty"
                  ? entry.extraction
                  : ("pending" as const),
            }))
        : [];
      const restoredFiles = saved.map((entry) => ({
        ...entry,
        url: URL.createObjectURL(entry.file),
      }));
      if (restoredFiles.length > 0) {
        setFiles(restoredFiles);
        setActiveId(
          snapshot?.activeId && restoredFiles.some((entry) => entry.id === snapshot.activeId)
            ? snapshot.activeId
            : restoredFiles[0].id,
        );
      }
      if (typeof snapshot?.pages === "string") setPages(snapshot.pages);
      setRestored(true);
    });
    return () => {
      active = false;
      for (const entry of filesRef.current) URL.revokeObjectURL(entry.url);
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    saveStudioSnapshot(SNAPSHOT_KEY, {
      files: files.map(({ id, file, selected, text, extraction }) => ({
        id,
        file,
        selected,
        text,
        extraction,
      })),
      activeId,
      pages,
    } satisfies PdfSnapshot);
  }, [files, activeId, pages, restored]);

  const extractionKey = files
    .filter((entry) => !entry.text && entry.extraction !== "empty" && entry.extraction !== "error")
    .map((entry) => `${entry.id}:${entry.file.size}:${entry.file.lastModified}`)
    .join("|");
  useEffect(() => {
    if (!restored || authPending || !authSession?.user) return;
    const pending = files.filter(
      (entry) => entry.extraction === "pending" && !extractingRef.current.has(entry.id),
    );
    if (pending.length === 0) return;
    void (async () => {
      for (const entry of pending) {
        extractingRef.current.add(entry.id);
        setFiles((current) =>
          current.map((file) =>
            file.id === entry.id ? { ...file, extraction: "extracting" } : file,
          ),
        );
        try {
          const text = await extractPdfText(entry.file, sessionId());
          setFiles((current) =>
            current.map((file) =>
              file.id === entry.id
                ? {
                    ...file,
                    text,
                    extraction: text.trim() ? "ready" : "empty",
                  }
                : file,
            ),
          );
        } catch {
          setFiles((current) =>
            current.map((file) =>
              file.id === entry.id ? { ...file, extraction: "error" } : file,
            ),
          );
        } finally {
          extractingRef.current.delete(entry.id);
        }
      }
    })();
    // `extractionKey` is the stable identity of the relevant file state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, authPending, authSession?.user, extractionKey]);

  useRagIndexFiles(
    "pdf",
    files.map((entry) => ({ fileName: entry.file.name, text: entry.text })),
  );

  const onFiles = (incoming: FileList | File[]) => {
    const next: PdfFile[] = [];
    for (const file of Array.from(incoming)) {
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      if (ext !== "pdf") {
        notify.warning(`".${ext}" is not a PDF — try another studio.`);
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        selected: false,
        text: "",
        extraction: "pending",
      });
    }
    if (next.length > 0) {
      setFiles((prev) => [...prev, ...next]);
      setActiveId((prev) => prev ?? next[0].id);
    }
  };

  const toggleSelect = (id: string) =>
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f)),
    );

  const removeFile = (id: string) =>
    setFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found) {
        URL.revokeObjectURL(found.url);
        apiClient.rag
          .removeFile({ sessionId: getRagSessionId(), studio: "pdf", fileName: found.file.name })
          .catch(() => undefined);
      }
      const rest = prev.filter((f) => f.id !== id);
      if (activeId === id) setActiveId(rest[0]?.id ?? null);
      return rest;
    });

  const merge = async () => {
    const picked = files.filter((f) => f.selected);
    if (picked.length < 2) {
      notify.warning("Select at least two PDFs to merge.");
      return;
    }
    setWorking(true);
    try {
      const blob = await apiClient.pdf.merge(
        picked.map((f) => ({ blob: f.file, filename: f.file.name })),
      );
      downloadBlob(blob, "merged.pdf");
      notify.success(`Merged ${picked.length} PDFs — tmp already deleted.`);
    } catch (err) {
      notify.error(err instanceof ApiClientError ? err : "Merge failed.");
    } finally {
      setWorking(false);
    }
  };

  const split = async () => {
    const active = files.find((f) => f.id === activeId);
    if (!active) {
      notify.warning("Upload a PDF first.");
      return;
    }
    const nums = pages
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (nums.length === 0) {
      notify.warning("Enter page numbers like 1,3.");
      return;
    }
    setWorking(true);
    try {
      const blob = await apiClient.pdf.split(active.file, active.file.name, nums);
      downloadBlob(blob, active.file.name.replace(/\.pdf$/i, "") + "-split.pdf");
      notify.success("Split ready — tmp already deleted.");
    } catch (err) {
      notify.error(err instanceof ApiClientError ? err : "Split failed.");
    } finally {
      setWorking(false);
    }
  };

  const extractText = async () => {
    const active = files.find((f) => f.id === activeId);
    if (!active) {
      notify.warning("Upload a PDF first.");
      return;
    }
    if (active.extraction === "extracting") {
      notify.info("Snow is already reading this PDF.");
      return;
    }
    setWorking(true);
    try {
      const text = active.text || (await extractPdfText(active.file, sessionId()));
      setFiles((current) =>
        current.map((file) =>
          file.id === active.id
            ? { ...file, text, extraction: text.trim() ? "ready" : "empty" }
            : file,
        ),
      );
      downloadBlob(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
        active.file.name.replace(/\.pdf$/i, "") + ".txt",
      );
      notify.success("Text ready — temporary server file deleted.");
    } catch (err) {
      notify.error(err instanceof ApiClientError ? err : "Extraction failed.");
    } finally {
      setWorking(false);
    }
  };

  const active = files.find((f) => f.id === activeId);

  // PDF-studio-only layout: preview takes center stage (~80%), the files +
  // upload + split column takes the remaining ~20%. Other studios keep the
  // shared two-pane StudioShell.
  return (
    <main className="mx-auto w-[94%] px-[4%] py-8 sm:w-[85vw] sm:px-6">
      <div className="animate-rise mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          PDF Tools
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm opacity-70 sm:text-lg">
          Preview PDFs instantly. Merge several into one, split out pages, or
          extract text — automatic reading uses temporary server processing,
          then keeps the result only on this device.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button icon={Files} loading={working} onClick={merge}>
            Merge selected
          </Button>
          <Button icon={Type} loading={working} onClick={extractText}>
            Extract text
          </Button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 space-y-4 xl:w-[20%] xl:shrink-0">
          {files.length > 0 && (
            <FilePanel
              files={files.map((f) => ({
                id: f.id,
                name: f.file.name,
                detail:
                  f.extraction === "extracting"
                    ? "reading text…"
                    : f.extraction === "ready"
                      ? "ready for Snow"
                      : f.extraction === "empty"
                        ? "no embedded text"
                        : f.extraction === "error"
                          ? "text unavailable"
                          : "waiting to read",
              }))}
              activeId={activeId}
              onSelect={setActiveId}
              onRemove={removeFile}
              onAddMore={onFiles}
              acceptExts={["pdf"]}
              checked={Object.fromEntries(
                files.filter((f) => f.selected).map((f) => [f.id, true]),
              )}
              onToggleCheck={toggleSelect}
              checkLabel="Select for merge"
            />
          )}
          <StudioCard title="Upload PDFs" icon={<Upload size={17} aria-hidden />}>
            <Dropzone
              acceptLabel="Supports .pdf files — select several to merge"
              onFiles={onFiles}
              compact
            />
          </StudioCard>
          <StudioCard title="Split Pages" icon={<Scissors size={17} aria-hidden />}>
            <label className="sr-only" htmlFor="pdf-pages">
              Pages to extract
            </label>
            <input
              id="pdf-pages"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="pages e.g. 1,3"
              className="h-10 w-full rounded-xl border border-ocean-500/20 bg-transparent px-3 text-sm dark:border-white/10"
            />
            <Button
              icon={Scissors}
              loading={working}
              onClick={split}
            >
              Split
            </Button>
          </StudioCard>
        </div>

        <div className="min-w-0 flex-1">
          <PreviewPane
            label="Preview"
            emptyHint="Your PDF preview will appear here."
          >
            {active ? (
              <iframe
                title={`Preview of ${active.file.name}`}
                src={active.url}
                // NOTE: no sandbox attribute on purpose — sandboxed frames
                // block the browser's built-in PDF viewer, rendering blank.
                // The source is always the user's own local file (blob:).
                className="h-[80vh] w-full rounded-lg border border-ocean-500/15 bg-white dark:border-white/10"
              />
            ) : undefined}
          </PreviewPane>
        </div>
      </div>
    </main>
  );
}
