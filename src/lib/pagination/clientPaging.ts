import { useMemo } from "react";

export const CLIENT_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export type ClientPagedSlice<T> = {
  slice: T[];
  totalPages: number;
  safePage: number;
  total: number;
  rangeFrom: number;
  rangeTo: number;
};

/**
 * Slices a full in-memory list for table pagination (no server round-trip).
 */
export function getClientPagedSlice<T>(
  items: T[],
  page: number,
  pageSize: number
): ClientPagedSlice<T> {
  const total = items.length;
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  const rangeFrom = total === 0 ? 0 : start + 1;
  const rangeTo = Math.min(safePage * pageSize, total);

  return { slice, totalPages, safePage, total, rangeFrom, rangeTo };
}

export function useClientPagedSlice<T>(
  items: T[],
  page: number,
  pageSize: number
): ClientPagedSlice<T> {
  return useMemo(
    () => getClientPagedSlice(items, page, pageSize),
    [items, page, pageSize]
  );
}
