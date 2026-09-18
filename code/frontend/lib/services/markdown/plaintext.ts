/**
 * Dependency-free plain-text transforms. Kept in a module with NO imports so
 * client components can bundle them without pulling parsing libraries.
 */

/** See markdown.service.ts markdownToPlainText for the documented rules. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      if (/^```/.test(line.trim())) return "";
      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) return heading[2];
      let out = line.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
      out = out.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
      out = out.replace(/`([^`]*)`/g, "$1");
      out = out.replace(/(\*\*|__)(.*?)\1/g, "$2");
      out = out.replace(/(\*|_)(.*?)\1/g, "$2");
      out = out.replace(/~~(.*?)~~/g, "$1");
      out = out.replace(/^(\s*)([-*+]|\d+\.)\s+/, "$1");
      return out;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Plain text becomes a markdown paragraph (blank-line separated). */
export function plainTextToMarkdown(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .join("\n\n");
}
