import { createId, type LoopEntry } from "@/lib/state";

/**
 * Parses a spreadsheet column pasted from Excel / Google Sheets.
 *
 * Columns must be separated by tabs, semicolons or runs of two or more spaces
 * (that is what spreadsheet apps put on the clipboard). A comma is treated as a
 * decimal separator, so `64,5` is 64.5 metres.
 *
 * Supported layouts per row:
 *   `64`            → floor 1, length 64
 *   `2\t64`         → floor 2, length 64
 *   `2;64,5`        → floor 2, length 64.5
 * Rows without a positive number are ignored, so headers are skipped silently.
 */
export function parseLoopsFromText(text: string): LoopEntry[] {
  const rows = text.split(/\r?\n/);
  const loops: LoopEntry[] = [];

  for (const row of rows) {
    const cells = row
      .split(/[\t;]|\s{2,}/)
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    if (cells.length === 0) continue;

    const length = Number(cells[cells.length - 1].replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(length) || length <= 0) continue;

    const floorRaw = cells.length > 1 ? Number(cells[0]) : 1;
    const floor = Number.isFinite(floorRaw) && floorRaw > 0 ? Math.round(floorRaw) : 1;

    loops.push({ id: createId(), floor, length: Math.round(length * 100) / 100 });
  }

  return loops;
}
