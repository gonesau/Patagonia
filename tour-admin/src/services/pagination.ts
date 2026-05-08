import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

export interface PaginationParams {
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData>;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: QueryDocumentSnapshot<DocumentData>;
}

export const DEFAULT_PAGE_SIZE = 25;
