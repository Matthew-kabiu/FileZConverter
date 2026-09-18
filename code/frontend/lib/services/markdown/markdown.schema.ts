import { z } from "zod";

/** Hard cap on conversion input — bounds ReDoS/CPU abuse on untrusted text. */
export const MAX_INPUT_CHARS = 1_000_000;

export const markdownTargetSchema = z.enum(["txt", "md", "html"]);

export const markdownConvertSchema = z.object({
  /** Source markdown for md→txt, or plain text for txt→md. */
  content: z.string().min(1).max(MAX_INPUT_CHARS),
  target: markdownTargetSchema,
});

export type MarkdownConvertInput = z.infer<typeof markdownConvertSchema>;
