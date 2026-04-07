/**
 * Helpers for paginated JSON responses and page-number UI (ellipsis).
 * Supports common backend shapes: { data, total }, { items, meta }, raw arrays, etc.
 */

export type PaginatedExtract<T> = {
  items: T[];
  total: number;
};

const LIST_KEYS = [
  "data",
  "items",
  "results",
  "restaurants",
  "users",
  "admins",
  "records",
] as const;

function pickTotal(
  obj: Record<string, unknown>,
  headerTotal: number | null
): number | null {
  if (headerTotal !== null) return headerTotal;

  const meta = obj.meta as Record<string, unknown> | undefined;
  const pagination = obj.pagination as Record<string, unknown> | undefined;

  const candidates: unknown[] = [
    obj.total,
    obj.totalCount,
    obj.totalItems,
    obj.count,
    meta?.total,
    meta?.totalCount,
    pagination?.total,
    pagination?.totalCount,
    pagination?.itemCount,
  ];

  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return Math.max(0, Math.floor(c));
    if (typeof c === "string" && /^\d+$/.test(c)) return Math.max(0, parseInt(c, 10));
  }

  return null;
}

function pickItems(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;

  if (!body || typeof body !== "object") return [];

  const obj = body as Record<string, unknown>;

  for (const key of LIST_KEYS) {
    const v = obj[key];
    if (Array.isArray(v)) return v;
  }

  return [];
}

/**
 * Normalizes an API body into items + total count.
 * If the API returns a full array, total is its length and items are sliced for the requested page.
 * If the API returns a page slice without total, total is inferred when possible.
 */
export function extractPaginatedData<T>(
  body: unknown,
  page: number,
  limit: number,
  mapItem: (raw: unknown) => T | null,
  headerTotal: number | null = null
): PaginatedExtract<T> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);

  if (Array.isArray(body)) {
    const total = body.length;
    const start = (safePage - 1) * safeLimit;
    const slice = body.slice(start, start + safeLimit);
    return {
      items: slice.map(mapItem).filter((x): x is T => x !== null),
      total,
    };
  }

  if (!body || typeof body !== "object") {
    return { items: [], total: 0 };
  }

  const obj = body as Record<string, unknown>;
  let total = pickTotal(obj, headerTotal);
  const rawItems = pickItems(body);

  if (rawItems.length === 0) {
    return { items: [], total: total ?? 0 };
  }

  if (total === null) {
    if (rawItems.length < safeLimit) {
      total = (safePage - 1) * safeLimit + rawItems.length;
    } else {
      total = safePage * safeLimit;
    }
  }

  const items = rawItems.map(mapItem).filter((x): x is T => x !== null);
  return { items, total };
}

export type PageEntry = number | "ellipsis";

/**
 * Page buttons with ellipsis for large page counts (e.g. 1 … 8 9 10 … 24).
 */
export function buildPageList(totalPages: number, currentPage: number): PageEntry[] {
  if (totalPages < 1) return [];

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: PageEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }

  return result;
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages < 1) return 1;
  return Math.min(Math.max(1, page), totalPages);
}
