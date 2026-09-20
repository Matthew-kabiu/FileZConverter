"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { Download, Upload } from "lucide-react";
import { StudioCard, StudioShell } from "@/components/studio/StudioShell";
import { Dropzone } from "@/components/studio/Dropzone";
import { EditorPane } from "@/components/studio/EditorPane";
import { FilePanel } from "@/components/studio/FilePanel";
import { MdToolbar } from "@/components/studio/MdToolbar";
import { PreviewPane } from "@/components/studio/PreviewPane";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { notify } from "@/components/feedback/toast";
import { useConvertSession } from "@/hooks/useConvertSession";
import { useRagIndexFiles } from "@/hooks/useRagIndex";
import { getRagSessionId } from "@/lib/rag-session";
import { usePresetTarget } from "@/hooks/usePresetTarget";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { loadStudioSnapshot, saveStudioSnapshot } from "@/lib/storage/studioStore";
import {
  clientTargetsFor,
  convertInBrowser,
  downloadTextFile,
} from "@/lib/convert/clientConvert";
import { extOf, outputName, targetsFor } from "@/lib/tools/tools";

const EXAMPLE = `# Markdown to Word Example

## Features

This is a **powerful** Markdown converter that supports lists, code, tables, and quotes:

- **Bold text** and *italic text*
- Multi-level headings
- Ordered and unordered lists
- \`Code snippets\` and code blocks
- Blockquotes

| name | qty |
| --- | --- |
| apples | 3 |
| oranges | 5 |

> Tip: everything converts both ways where an engine exists.
`;

const TEXT_MIME: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
};

const ACCEPT = ["md", "markdown", "txt"];

interface MdDoc {
  id: string;
  fileName: string;
  content: string;
}

const SNAPSHOT_KEY = "markdown";

interface MarkdownSnapshot {
  docs: MdDoc[];
  activeId: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MarkdownStudio() {
  const [docs, setDocs] = useState<MdDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    void loadStudioSnapshot<MarkdownSnapshot>(SNAPSHOT_KEY).then((snapshot) => {
      if (!active) return;
      const saved = Array.isArray(snapshot?.docs)
        ? snapshot.docs.filter(
            (doc) =>
              typeof doc?.id === "string" &&
              typeof doc?.fileName === "string" &&
              typeof doc?.content === "string",
          )
        : [];
      if (saved.length > 0) {
        setDocs(saved);
        setActiveId(
          snapshot?.activeId && saved.some((doc) => doc.id === snapshot.activeId)
            ? snapshot.activeId
            : saved[0].id,
        );
      }
      setRestored(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    saveStudioSnapshot(SNAPSHOT_KEY, { docs, activeId } satisfies MarkdownSnapshot);
  }, [docs, activeId, restored]);
  const [target, setTarget] = usePresetTarget(
    ["docx", "pdf", "html", "txt"],
    "docx",
  );
  const [working, setWorking] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const { sessionId } = useConvertSession();

  const active = docs.find((d) => d.id === activeId) ?? null;
  useRagIndexFiles(
    "markdown",
    docs.map((d) => ({ fileName: d.fileName, text: d.content })),
  );

  const previewHtml = useMemo(() => {
    if (!active?.content) return "";
    let html = "";
    try {
      const parsed = marked.parse(active.content);
      html = typeof parsed === "string" ? parsed : "";
    } catch {
      html = "";
    }
    return DOMPurify.sanitize(html);
  }, [active]);

  const onFiles = async (incoming: FileList | File[]) => {
    const next: MdDoc[] = [];
    for (const file of Array.from(incoming)) {
      const ext = extOf(file.name);
      if (!ACCEPT.includes(ext)) {
        notify.warning(`".${ext}" goes in the Word studio — Markdown takes md/txt here.`);
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        fileName: file.name,
        content: await file.text(),
      });
    }
    if (next.length > 0) {
      setDocs((prev) => [...prev, ...next]);
      setActiveId((prev) => prev ?? next[0].id);
    }
  };

  const updateContent = (content: string) => {
    if (!activeId) return;
    setDocs((prev) => prev.map((d) => (d.id === activeId ? { ...d, content } : d)));
  };

  const removeDoc = (id: string) => {
    const doc = docs.find((d) => d.id === id);
    if (doc) {
      // Best-effort: drop the removed file's vectors so Snow forgets it.
      apiClient.rag
        .removeFile({ sessionId: getRagSessionId(), studio: "markdown", fileName: doc.fileName })
        .catch(() => undefined);
    }
    setDocs((prev) => {
      const rest = prev.filter((d) => d.id !== id);
      if (activeId === id) setActiveId(rest[0]?.id ?? null);
      return rest;
    });
  };

  const convert = async () => {
    if (!active) {
      notify.warning("Add Markdown content first.");
      return;
    }
    setWorking(true);
    try {
      const from = extOf(active.fileName) === "txt" ? "txt" : "md";
      if ((clientTargetsFor(from) as readonly string[]).includes(target)) {
        const out = await convertInBrowser(active.content, from, target as "txt" | "md" | "html");
        downloadTextFile(out, outputName(active.fileName, target), TEXT_MIME[target] ?? "text/plain");
        notify.success(`${active.fileName} converted on your device.`);
        return;
      }
      const blob = await apiClient.convert.document(
        new File([active.content], active.fileName, { type: "text/markdown" }),
        active.fileName,
        target,
        sessionId(),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outputName(active.fileName, target);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success(`${active.fileName} converted on the server — tmp already deleted.`);
    } catch (err) {
      notify.error(
        err instanceof ApiClientError ? err : "Conversion failed.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <StudioShell
      title="Markdown Converter"
      subtitle="Upload, edit, and preview Markdown — then export polished DOCX, PDF, HTML, or TXT documents."
      toolbar={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Select
            ariaLabel="Conversion target"
            value={target}
            onChange={setTarget}
            options={targetsFor("md").map((t) => ({
              value: t,
              label: `Markdown → ${t}`,
            }))}
          />
          <Button icon={Download} loading={working} onClick={convert}>
            Convert & Download
          </Button>
        </div>
      }
      panel={
        docs.length > 0 ? (
          <FilePanel
            files={docs.map((d) => ({
              id: d.id,
              name: d.fileName,
              detail: `${d.content.split("\n").length} lines`,
            }))}
            activeId={activeId}
            onSelect={setActiveId}
            onRemove={removeDoc}
            onAddMore={onFiles}
            acceptExts={ACCEPT}
          />
        ) : undefined
      }
      left={
        <>
          <StudioCard title="Upload Markdown File" icon={<Upload size={17} aria-hidden />}>
            <Dropzone
              acceptLabel="Supports .md, .markdown, .txt files"
              onFiles={onFiles}
              compact
            />
          </StudioCard>
          <EditorPane
            label={active ? `Edit ${active.fileName}` : "Edit Markdown Content"}
            value={active?.content ?? ""}
            onChange={updateContent}
            lineCount
            inputRef={editorRef}
            toolbar={
              <MdToolbar
                value={active?.content ?? ""}
                onChange={updateContent}
                inputRef={editorRef}
              />
            }
            onLoadExample={() => {
              const doc: MdDoc = {
                id: crypto.randomUUID(),
                fileName: "example.md",
                content: EXAMPLE,
              };
              setDocs((prev) => [...prev, doc]);
              setActiveId((prev) => prev ?? doc.id);
            }}
          />
        </>
      }
      right={
        <>
          <PreviewPane
            label="Live Preview"
            emptyHint="Your Markdown preview will appear here."
          >
            {active?.content ? (
              <div
                className="md-preview max-w-full overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : undefined}
          </PreviewPane>
          {active && (
            <p className="max-w-full break-words text-[11px] opacity-60">
              {formatSize(new Blob([active.content]).size)} · editing {active.fileName}
            </p>
          )}
        </>
      }
    />
  );
}
