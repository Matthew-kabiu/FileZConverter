import { marked } from "marked";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import type {
  MarkdownConvertInput,
} from "@/lib/services/markdown/markdown.schema";
import type { MarkdownConversion } from "@/lib/services/markdown/markdown.types";
import {
  markdownToPlainText,
  plainTextToMarkdown,
} from "@/lib/services/markdown/plaintext";

export { markdownToPlainText, plainTextToMarkdown };

/** Pure business logic — no framework imports, DTOs out. */
export async function convertMarkdown(
  input: MarkdownConvertInput,
): Promise<MarkdownConversion> {
  if (input.target === "txt") {
    return { output: markdownToPlainText(input.content), target: "txt" };
  }
  if (input.target === "html") {
    return { output: await markdownToHtml(input.content), target: "html" };
  }
  return { output: plainTextToMarkdown(input.content), target: "md" };
}

/** Markdown → sanitized-HTML-string. Callers sanitize before rendering. */
export async function markdownToHtml(markdown: string): Promise<string> {
  return marked.parse(markdown);
}

const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

type InlineToken =
  | { type: "text"; text: string }
  | { type: "strong"; tokens?: InlineToken[] }
  | { type: "em"; tokens?: InlineToken[] }
  | { type: "codespan"; text: string }
  | { type: "del"; tokens?: InlineToken[] }
  | { type: "link"; tokens?: InlineToken[] }
  | { type: "image"; text: string };

function inlineRuns(
  tokens: InlineToken[] | undefined,
  opts: { bold?: boolean; italics?: boolean; strike?: boolean } = {},
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  for (const token of tokens ?? []) {
    if (token.type === "text") {
      runs.push(new TextRun({ text: token.text, ...opts }));
    } else if (token.type === "strong") {
      runs.push(...inlineRuns(token.tokens, { ...opts, bold: true }));
    } else if (token.type === "em") {
      runs.push(...inlineRuns(token.tokens, { ...opts, italics: true }));
    } else if (token.type === "codespan") {
      runs.push(new TextRun({ text: token.text, font: "Courier New" }));
    } else if (token.type === "del") {
      runs.push(...inlineRuns(token.tokens, { ...opts, strike: true }));
    } else if (token.type === "link") {
      runs.push(...inlineRuns(token.tokens, opts));
    } else if (token.type === "image") {
      runs.push(new TextRun({ text: token.text, ...opts }));
    }
  }
  return runs;
}

/**
 * Markdown → .docx bytes (spike scope: headings, paragraphs, lists, code,
 * quotes; tables degrade to tab-joined paragraphs — recorded limitation).
 */
export async function markdownToDocxBuffer(markdown: string): Promise<Buffer> {
  const tokens = marked.lexer(markdown);
  const children: (Paragraph | Table)[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "heading":
        children.push(
          new Paragraph({
            heading: HEADINGS[Math.min(token.depth, 6) - 1],
            children: inlineRuns(
              token.tokens as InlineToken[] | undefined,
            ),
          }),
        );
        break;
      case "paragraph":
        children.push(
          new Paragraph({
            children: inlineRuns(token.tokens as InlineToken[] | undefined),
          }),
        );
        break;
      case "list":
        for (const item of token.items) {
          children.push(
            new Paragraph({
              bullet:
                token.ordered === true ? undefined : { level: 0 },
              children: inlineRuns(item.tokens as InlineToken[] | undefined),
            }),
          );
        }
        break;
      case "code":
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: token.text, font: "Courier New" }),
            ],
          }),
        );
        break;
      case "blockquote":
        for (const inner of token.tokens ?? []) {
          if (inner.type === "paragraph") {
            children.push(
              new Paragraph({
                indent: { left: 720 },
                children: inlineRuns(
                  (inner as { tokens?: InlineToken[] }).tokens,
                ),
              }),
            );
          }
        }
        break;
      case "table": {
        const toRow = (cells: { text: string }[], bold: boolean) =>
          new TableRow({
            children: cells.map(
              (cell) =>
                new TableCell({
                  width: { size: 100 / Math.max(cells.length, 1), type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: cell.text, bold }),
                      ],
                    }),
                  ],
                }),
            ),
          });
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              toRow(token.header, true),
              ...token.rows.map((row: { text: string }[]) => toRow(row, false)),
            ],
          }),
        );
        break;
      }
      default:
        break;
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
