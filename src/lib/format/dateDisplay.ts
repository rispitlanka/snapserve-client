/**
 * Formats API date/time strings for display.
 * - ISO datetime (e.g. `2026-04-07T10:30:00.000Z`) → `2026-04-07: 10.30 am` (local time)
 * - Plain date `YYYY-MM-DD` (no time) → returned as-is (avoids timezone shifting)
 * - `Date` → same visual format using local calendar/time
 */

function formatLocalDateTimeParts(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  let h = d.getHours();
  const min = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  const mm = String(min).padStart(2, "0");
  return `${y}-${m}-${day}: ${h12}.${mm} ${ampm}`;
}

export function formatDateTimeForDisplay(value: string | Date | null | undefined): string {
  if (value == null) return "—";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    return formatLocalDateTimeParts(value);
  }

  const s = String(value).trim();
  if (s === "" || s === "—") return "—";

  // Date-only: do not parse as Date (avoids UTC midnight shifting to previous local day).
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return s;
  }

  return formatLocalDateTimeParts(d);
}
