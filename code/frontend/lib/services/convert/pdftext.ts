import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { join, parse } from "node:path";

const execFileAsync = promisify(execFile);
const EXTRACT_TIMEOUT_MS = 60_000;

/**
 * PDF text extraction via poppler `pdftotext` (Matt-approved 2026-09-18 —
 * won head-to-head vs Ghostscript txtwrite: cleaner layout output, narrower
 * attack surface than a full PostScript interpreter).
 * Fixed argv, no shell, 60s timeout, layout-preserving UTF-8 output.
 */
export async function extractPdfText(
  inputPath: string,
  outDir: string,
): Promise<string> {
  const outputPath = join(outDir, `${parse(inputPath).name}.txt`);
  await execFileAsync(
    "pdftotext",
    ["-layout", "-enc", "UTF-8", inputPath, outputPath],
    { timeout: EXTRACT_TIMEOUT_MS },
  );
  return readFile(outputPath, "utf8");
}
