"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { Download, FileText, Upload } from "lucide-react";
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
import { extOf, outputName, targetsFor } from "@/lib/tools/tools";

const ACCEPT = ["docx", "doc", "odt", "rtf"];

interface WordDoc {
  id: string;
  file: File;
  fileName: string;
  content: string;
  ready: boolean;
}

const SNAPSHOT_KEY = "word";

interface WordSnapshot {
  docs: WordDoc[];
  activeId: string | null;
}

async function extractWordContent(file: File, sessionId: string): Promise<string> {
  const blob = await apiClient.convert.document(file, file.name, "md", sessionId);
  return blob.text();
}

export function WordStudio() {
  const [docs, setDocs] = useState<WordDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [target, setTarget] = usePresetTarget(
    ["md", "txt", "html", "pdf"],
    "pdf",
  );
  const [working, setWorking] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const { sessionId } = useConvertSession();

  useEffect(() => {
    let active = true;
    void loadStudioSnapshot<WordSnapshot>(SNAPSHOT_KEY).then((snapshot) => {
      if (!active) return;
      const saved = Array.isArray(snapshot?.docs)
        ? snapshot.docs.filter(
            (doc) =>
              typeof doc?.id === "string" &&
              doc?.file instanceof File &&
              typeof doc?.fileName === "string" &&
              typeof doc?.content === "string" &&
              typeof doc?.ready === "boolean",
          )
        : [];
      if (saved.length > 0) {
        setDocs(saved);
        setActiveId(
          snapshot?.activeId && saved.some((doc) => doc.id === snapshot.activeId)
            ? snapshot.activeId
            : saved[0].id,
        );
        const pending = saved.filter((doc) => !doc.ready || !doc.content);
        if (pending.length > 0) {
          setWorking(true);
          void (async () => {
            try {
              for (const doc of pending) {
                const content = await extractWordContent(doc.file, sessionId());
                if (!active) return;
                setDocs((current) =>
                  current.map((entry) =>
                    entry.id === doc.id ? { ...entry, content, ready: true } : entry,
                  ),
                );
              }
            } catch {
              if (active) notify.error("A restored Word file could not finish loading.");
            } finally {
              if (active) setWorking(false);
            }
          })();
        }
      }
      setRestored(true);
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!restored) return;
    saveStudioSnapshot(SNAPSHOT_KEY, { docs, activeId } satisfies WordSnapshot);
  }, [docs, activeId, restored]);

  const active = docs.find((d) => d.id === activeId) ?? null;
  useRagIndexFiles(
    "word",
    docs.map((d) => ({ fileName: d.fileName, text: d.content })),
  );

  const previewHtml = useMemo(() => {
    if (!active?.content) return "";
    try {
      const parsed = marked.parse(active.content);
      return DOMPurify.sanitize(typeof parsed === "string" ? parsed : "");
    } catch {
      return "";
    }
  }, [active]);

  const onFiles = async (incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter((file) => {
      const ok = ACCEPT.includes(extOf(file.name));
      if (!ok) notify.warning(`".${extOf(file.name)}" is not a Word format — try another studio.`);
      return ok;
    });
    if (accepted.length === 0) return;
    const fresh: WordDoc[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      content: "",
      ready: false,
    }));
    setDocs((prev) => [...prev, ...fresh]);
    setActiveId((prev) => prev ?? fresh[0].id);
    setWorking(true);
    try {
      // Word formats have no browser engine: extract each to Markdown on
      // the server once, then everything else edits locally.
      for (const doc of fresh) {
        const text = await extractWordContent(doc.file, sessionId());
        setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, content: text, ready: true } : d)));
      }
      notify.success("Extracted — edit freely, export anywhere.");
    } catch (err) {
      notify.error(err instanceof ApiClientError ? err : "Extraction failed.");
    } finally {
      setWorking(false);
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
        .removeFile({ sessionId: getRagSessionId(), studio: "word", fileName: doc.fileName })
        .catch(() => undefined);
    }
    setDocs((prev) => {
      const rest = prev.filter((d) => d.id !== id);
      if (activeId === id) setActiveId(rest[0]?.id ?? null);
      return rest;
    });
  };

  const convert = async () => {
    if (!active?.content) {
      notify.warning("Upload a Word document first.");
      return;
    }
    setWorking(true);
    try {
      const blob = await apiClient.convert.document(
        new File([active.content], "edited.md", { type: "text/markdown" }),
        "edited.md",
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
      notify.success("Converted on the server — tmp already deleted.");
    } catch (err) {
      notify.error(err instanceof ApiClientError ? err : "Conversion failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <StudioShell
      title="Word to Anything Converter"
      subtitle="Upload DOCX, legacy DOC, ODT, or RTF — each extracts to editable Markdown, then exports PDF, HTML, TXT, or back to Word."
      toolbar={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Select
            ariaLabel="Conversion target"
            value={target}
            onChange={setTarget}
            options={targetsFor("docx").map((t) => ({
              value: t,
              label: `Word → ${t}`,
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
              detail: d.ready ? `${d.content.split("\n").length} lines` : "extracting…",
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
          <StudioCard title="Upload Word File" icon={<Upload size={17} aria-hidden />}>
            <Dropzone
              acceptLabel="Supports .docx, .doc, .odt, .rtf"
              onFiles={onFiles}
              compact
            />
            {active && (
              <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs break-words opacity-70">
                <FileText size={13} aria-hidden className="shrink-0" />
                {active.fileName}
              </p>
            )}
          </StudioCard>
          <EditorPane
            label={active ? `Edit ${active.fileName}` : "Edit Document Content"}
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
          />
        </>
      }
      right={
        <>
          <PreviewPane
            label="Live Preview"
            emptyHint="Your document preview will appear here."
          >
            {active?.content ? (
              <div
                className="md-preview max-w-full overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : undefined}
          </PreviewPane>
        </>
      }
    />
  );
}
