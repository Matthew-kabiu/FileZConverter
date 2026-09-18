export interface MarkdownConversion {
  /** Converted output. */
  output: string;
  /** Target format that was produced. */
  target: "txt" | "md" | "html";
}
