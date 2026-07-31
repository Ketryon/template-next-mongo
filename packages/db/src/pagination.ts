import type { Filter, ObjectId } from "mongodb";
import { toObjectId } from "./schemas/shared";

/**
 * Cursor pagination, not skip/limit.
 *
 * `skip(n)` makes the database walk n documents to reach page n, and the usual
 * companion `countDocuments()` is a second full scan on every request. Seeking
 * on `_id` is an index range read: page 500 costs the same as page 1.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageParams {
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Hard ceiling — never let `?limit=` decide how much of a collection to read. */
export function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit) || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(limit), MAX_PAGE_SIZE);
}

/**
 * Descending `_id` seek. Pair with an index ending in `_id: -1` so the sort is
 * served by the index rather than an in-memory sort.
 */
export function cursorFilter<T extends { _id: ObjectId }>(
  cursor?: string,
): Filter<T> {
  if (!cursor) return {} as Filter<T>;
  return { _id: { $lt: toObjectId(cursor, "cursor") } } as Filter<T>;
}

/**
 * Turn `limit + 1` fetched documents into a page.
 *
 * The sentinel row is how "is there more?" is answered without a count query.
 */
export function buildPage<TDoc extends { _id: ObjectId }, TDto>(
  docs: TDoc[],
  limit: number,
  map: (doc: TDoc) => TDto,
): Page<TDto> {
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;
  const last = items.at(-1);

  return {
    items: items.map(map),
    nextCursor: hasMore && last ? last._id.toString() : null,
  };
}
