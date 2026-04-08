/**
 * Shared API / client utilities used across list views and fetch helpers.
 * Implementation stays in `src/lib`; this file is the type barrel.
 */
export type { PaginatedExtract, PageEntry } from "@/lib/api/pagination";
export type { ClientPagedSlice } from "@/lib/pagination/clientPaging";
export { CLIENT_PAGE_SIZE_OPTIONS } from "@/lib/pagination/clientPaging";
