import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  const base = "rounded-lg border border-border bg-card p-4 shadow-soft";
  return <section className={className ? `${base} ${className}` : base}>{children}</section>;
}
