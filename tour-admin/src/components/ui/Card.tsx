import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border border-border bg-card p-4 shadow-soft">{children}</section>;
}
