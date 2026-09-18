import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";

const execFileAsync = promisify(execFile);

/** Output formats this runner will produce. Strict allowlist — never user input. */
export const LIBRE_OUTPUTS = ["pdf", "html", "txt"] as const;
export type LibreOutput = (typeof LIBRE_OUTPUTS)[number];

const CONVERT_TIMEOUT_MS = 60_000;

/**
 * LibreOffice headless conversion (approved engine 2026-09-18).
 * Fixed argv, no shell, 60s timeout. Input/output paths are generated
 * internally by sessionFiles — user filenames never reach argv.
 */
export async function convertWithLibreOffice(
  inputPath: string,
  outDir: string,
  format: LibreOutput,
): Promise<string> {
  const outputPath = join(
    /*turbopackIgnore: true*/ outDir,
    `${parse(inputPath).name}.${format === "txt" ? "txt" : format}`,
  );
  // Isolated profile per call: parallel soffice instances share a default
  // profile lock and kill each other. A throwaway profile dir fixes it.
  const profile = await mkdtemp(join(/*turbopackIgnore: true*/ tmpdir(), "filez-profile-"));
  await execFileAsync(
    "soffice",
    [
      "--headless",
      `-env:UserInstallation=file://${profile}`,
      "--convert-to",
      format,
      "--outdir",
      outDir,
      inputPath,
    ],
    { timeout: CONVERT_TIMEOUT_MS },
  );
  // Fail loudly if soffice exited 0 but produced nothing.
  await readFile(/*turbopackIgnore: true*/ outputPath);
  return outputPath;
}
