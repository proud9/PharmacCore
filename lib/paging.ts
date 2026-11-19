/**
 * Server-side paging for long lists. Pages read `?page=` and `?q=` from the URL and load one
 * page of rows, so a list's size no longer grows with the whole table.
 */
export const PAGE_SIZE = 50;

export type ListParams = { page?: string; q?: string; [key: string]: string | undefined };

export function paging(params: ListParams, pageSize = PAGE_SIZE) {
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  return { page, take: pageSize, skip: (page - 1) * pageSize, pageSize };
}

/** The search text from `?q=`, trimmed, or undefined when empty. */
export function searchText(params: ListParams) {
  const q = (params.q ?? "").trim();
  return q ? q.slice(0, 100) : undefined;
}
