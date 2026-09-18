import { z } from "zod";

/** Input formats the document endpoint accepts. Generated tmp names only. */
export const documentInputExtSchema = z.enum([
  "md",
  "txt",
  "html",
  "docx",
  "doc",
  "odt",
  "rtf",
  "xlsx",
  "xls",
  "ods",
  "csv",
  "pdf",
]);

/** Conversion targets by input. Binary targets return file downloads. */
export const DOCUMENT_MATRIX = {
  md: ["docx", "pdf", "html", "txt"],
  txt: ["md", "pdf"],
  html: ["pdf", "md"],
  docx: ["md", "txt", "html", "pdf"],
  doc: ["pdf", "html", "txt", "md"],
  odt: ["pdf", "html", "txt", "md"],
  rtf: ["pdf", "html", "txt", "md"],
  xlsx: ["csv", "pdf", "html"],
  xls: ["csv", "pdf", "html"],
  ods: ["csv", "pdf", "html"],
  csv: ["xlsx", "pdf"],
  pdf: ["txt"],
} as const;

export type DocumentInputExt = keyof typeof DOCUMENT_MATRIX;

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const documentTargetSchema = z.enum([
  "docx",
  "pdf",
  "html",
  "txt",
  "md",
  "xlsx",
  "csv",
]);

export const CONTENT_TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  html: "text/html",
  txt: "text/plain",
  md: "text/markdown",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv",
};
