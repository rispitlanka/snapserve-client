"use client";

import { buildPageList, clampPage, type PageEntry } from "@/lib/api/pagination";
import { CLIENT_PAGE_SIZE_OPTIONS } from "@/lib/pagination/clientPaging";
import { twMerge } from "tailwind-merge";

export type ClientTablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  rangeFrom: number;
  rangeTo: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Shared pagination bar: range label, page-size select, prev/next, page numbers with ellipsis.
 */
export default function ClientTablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  rangeFrom,
  rangeTo,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  className,
}: ClientTablePaginationProps) {
  const safePage = clampPage(page, totalPages);
  const pageButtons: PageEntry[] = buildPageList(totalPages, safePage);

  const goToPage = (p: number) => {
    onPageChange(clampPage(p, totalPages));
  };

  return (
    <div
      className={twMerge(
        "space-y-4 border-t border-gray-200 pt-4 transition-opacity duration-200 dark:border-gray-800",
        disabled ? "opacity-60" : "opacity-100",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing{" "}
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {totalItems === 0 ? "0" : `${rangeFrom}–${rangeTo}`}
          </span>{" "}
          of <span className="font-medium text-gray-800 dark:text-gray-200">{totalItems}</span>{" "}
          items
        </p>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="whitespace-nowrap">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            disabled={disabled}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {CLIENT_PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Page {safePage} of {totalPages}
        </p>

        <nav
          className="flex flex-wrap items-center justify-center gap-2 sm:justify-end"
          aria-label="Table pagination"
        >
          <button
            type="button"
            onClick={() => goToPage(safePage - 1)}
            disabled={disabled || safePage <= 1}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Previous
          </button>

          <div className="flex flex-wrap items-center justify-center gap-1">
            {pageButtons.map((entry, i) =>
              entry === "ellipsis" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1.5 text-gray-500 dark:text-gray-500"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  onClick={() => goToPage(entry)}
                  disabled={disabled}
                  className={twMerge(
                    "flex h-10 min-w-10 items-center justify-center rounded-lg text-sm font-medium transition",
                    entry === safePage
                      ? "bg-brand-500 text-white shadow-theme-xs dark:bg-brand-500"
                      : "text-gray-700 hover:bg-brand-500/8 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-brand-400"
                  )}
                  aria-current={entry === safePage ? "page" : undefined}
                >
                  {entry}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => goToPage(safePage + 1)}
            disabled={disabled || safePage >= totalPages}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}
