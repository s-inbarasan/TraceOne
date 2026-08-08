/**
 * Generates a standard unified diff between two text contents.
 */
export function generateUnifiedDiff(filePath: string, original: string, modified: string): string {
  const origLines = (original || "").split(/\r?\n/);
  const modLines = (modified || "").split(/\r?\n/);
  
  // If identical
  if (original === modified) {
    return `--- a/${filePath}\n+++ b/${filePath}\n@@ -0,0 +0,0 @@\n  (No changes)\n`;
  }

  let startOffset = 0;
  while (startOffset < origLines.length && startOffset < modLines.length && origLines[startOffset] === modLines[startOffset]) {
    startOffset++;
  }

  let endOffsetOrig = origLines.length - 1;
  let endOffsetMod = modLines.length - 1;
  while (endOffsetOrig >= startOffset && endOffsetMod >= startOffset && origLines[endOffsetOrig] === modLines[endOffsetMod]) {
    endOffsetOrig--;
    endOffsetMod--;
  }

  const contextBeforeStart = Math.max(0, startOffset - 3);
  const contextAfterEnd = Math.min(origLines.length, endOffsetOrig + 4);

  const origBlockLines = origLines.slice(startOffset, endOffsetOrig + 1);
  const modBlockLines = modLines.slice(startOffset, endOffsetMod + 1);

  const oldLineCount = origBlockLines.length + (startOffset - contextBeforeStart) + (contextAfterEnd - (endOffsetOrig + 1));
  const newLineCount = modBlockLines.length + (startOffset - contextBeforeStart) + (contextAfterEnd - (endOffsetOrig + 1));

  let diff = `--- a/${filePath}\n+++ b/${filePath}\n`;
  diff += `@@ -${contextBeforeStart + 1},${oldLineCount} +${contextBeforeStart + 1},${newLineCount} @@\n`;

  // Context before
  for (let i = contextBeforeStart; i < startOffset; i++) {
    diff += ` ${origLines[i]}\n`;
  }
  // Removed lines
  for (const line of origBlockLines) {
    diff += `-${line}\n`;
  }
  // Added lines
  for (const line of modBlockLines) {
    diff += `+${line}\n`;
  }
  // Context after
  for (let i = endOffsetOrig + 1; i < contextAfterEnd; i++) {
    diff += ` ${origLines[i]}\n`;
  }

  return diff;
}
