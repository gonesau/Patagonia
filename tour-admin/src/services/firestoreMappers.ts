import type { DocumentData, QueryDocumentSnapshot, SnapshotOptions } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

function convertValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (Array.isArray(value)) {
    return value.map(convertValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        convertValue(nestedValue),
      ]),
    );
  }
  return value;
}

export function timestampToDate<T extends Record<string, unknown>>(value: T): T {
  return convertValue(value) as T;
}

export const firestoreConverter = <T extends Record<string, unknown>>() => ({
  toFirestore: (data: T): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T => {
    const data = snapshot.data(options) as T;
    return timestampToDate(data);
  },
});
