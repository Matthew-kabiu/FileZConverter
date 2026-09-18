"use client";

import { useMemo, useRef, useState } from "react";
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
import { usePresetTarget } from "@/hooks/usePresetTarget";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { extOf, outputName, targetsFor } from "@/lib/tools/tools";

const ACCEPT = ["docx", "doc", "odt", "rtf"];

interface WordDoc {
  id: string;
  fileName: string;
  content: string;
  ready: boolean;
}

export function WordStudio() {
  const [docs, setDocs] = useState<WordDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [target, setTarget] = usePresetTarget(
    ["md", "txt", "html", "pdf"],
    "pdf",
  );
  const [working, setWorking] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingRef = useRef(new Map<string, File>());
  const { sessionId } = useConvertSession();

  const active = docs.find((d) => d.id === activeId) ?? null;

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
    const fresh: WordDoc[] = accepted.map((file) => {
      const id = crypto.randomUUID();
      pendingRef.current.set(id, file);
      return { id, fileName: file.name, content: "", ready: false };
    });
    setDocs((prev) => [...prev, ...fresh]);
    setActiveId((prev) => prev ?? fresh[0].id);
    setWorking(true);
    try {
      // Word formats have no browser engine: extract each to Markdown on
      // the server once, then everything else edits locally.
      for (const doc of fresh) {
        const file = pendingRef.current.get(doc.id);
        if (!file) continue;
        const blob = await apiClient.convert.document(
          file,
          file.name,
          "md",
          sessionId(),
        );
        const text = await blob.text();
        pendingRef.current.delete(doc.id);
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

  const removeDoc = (id: string) =>
    setDocs((prev) => {
      const rest = prev.filter((d) => d.id !== id);
      if (activeId === id) setActiveId(rest[0]?.id ?? null);
      return rest;
    });

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
              <p className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
                <FileText size={13} aria-hidden />
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
                className="md-preview"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : undefined}
          </PreviewPane>
        </>
      }
    />
  );
}
