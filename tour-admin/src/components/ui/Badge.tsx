import type { ReactNode } from "react";

type BadgeTone = "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-success/20 text-dark-900",
  warning: "bg-warning/20 text-textDark",
  danger: "bg-danger/20 text-textDark",
  neutral: "bg-neutral/20 text-textDark",
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>;
}
