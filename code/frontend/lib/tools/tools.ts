import { ROUTES } from "@/lib/routes";
import { DOCUMENT_MATRIX } from "@/lib/services/convert/document.schema";

export interface StudioTool {
  slug: string;
  navLabel: string;
  title: string;
  subtitle: string;
  href: string;
  /** Extensions this studio accepts. */
  accept: readonly string[];
  /** Default target selected on load. */
  defaultTarget: string;
  /** Short label for the editor pane, e.g. "Markdown Content". */
  editorLabel: string;
  /** Short label for the preview pane. */
  previewLabel: string;
}

export const STUDIO_TOOLS: StudioTool[] = [
  {
    slug: "markdown",
    navLabel: "Markdown",
    title: "Markdown Converter",
    subtitle:
      "Upload, edit, preview, and convert Markdown into polished DOCX, PDF, HTML, or TXT documents.",
    href: ROUTES.pages.markdown,
    accept: ["md", "markdown", "txt"],
    defaultTarget: "docx",
    editorLabel: "Markdown Content",
    previewLabel: "Live Preview",
  },
  {
    slug: "word",
    navLabel: "Word",
    title: "Word Converter",
    subtitle:
      "Upload Word documents — DOCX, legacy DOC, ODT, RTF — edit as Markdown, and export anywhere.",
    href: ROUTES.pages.word,
    accept: ["docx", "doc", "odt", "rtf"],
    defaultTarget: "pdf",
    editorLabel: "Document Content (Markdown)",
    previewLabel: "Live Preview",
  },
  {
    slug: "spreadsheet",
    navLabel: "Spreadsheet",
    title: "Spreadsheet Converter",
    subtitle:
      "Upload XLSX, legacy XLS, ODS, or CSV — preview tables, edit cells, and export CSV or PDF.",
    href: ROUTES.pages.spreadsheet,
    accept: ["xlsx", "xls", "ods", "csv"],
    defaultTarget: "csv",
    editorLabel: "Cell Editor",
    previewLabel: "Table Preview",
  },
  {
    slug: "pdf",
    navLabel: "PDF",
    title: "PDF Tools",
    subtitle:
      "Merge PDFs, split out pages, or extract text — previews instantly, nothing retained.",
    href: ROUTES.pages.pdf,
    accept: ["pdf"],
    defaultTarget: "txt",
    editorLabel: "Page Selection",
    previewLabel: "Preview",
  },
];

/** Secondary conversions for the Tools menu. Each deep-links a studio with
 * its target pre-selected (?target=), so the menu item IS the conversion. */
export const MORE_TOOLS: { label: string; href: string; target?: string }[] = [
  { label: "Markdown To Docx", href: ROUTES.pages.markdown, target: "docx" },
  { label: "Markdown To PDF", href: ROUTES.pages.markdown, target: "pdf" },
  { label: "Markdown To HTML", href: ROUTES.pages.markdown, target: "html" },
  { label: "Word To Markdown", href: ROUTES.pages.word, target: "md" },
  { label: "Excel To CSV", href: ROUTES.pages.spreadsheet, target: "csv" },
  { label: "Merge PDFs", href: ROUTES.pages.pdf },
  { label: "Split PDF", href: ROUTES.pages.pdf },
  { label: "PDF To Text", href: ROUTES.pages.pdf },
];

export function toolHref(tool: { href: string; target?: string }): string {
  return tool.target ? `${tool.href}?target=${tool.target}` : tool.href;
}

export function targetsFor(ext: string): string[] {
  const entry = (DOCUMENT_MATRIX as Record<string, readonly string[]>)[ext];
  return entry ? [...entry] : [];
}

export function extOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function outputName(name: string, target: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name}.${target}`;
}
