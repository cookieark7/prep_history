/**
 * Copy rich content: text/plain (Markdown) and text/html together via ClipboardItem, so a
 * rich editor keeps headings and lists and a plain editor gets clean Markdown. Falls back to
 * writeText where ClipboardItem is unavailable. Resolves to whether anything was written.
 */
export async function copyRich(markdown: string, html: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([markdown], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return true;
    }
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }
}
