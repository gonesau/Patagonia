import type { ReactNode } from "react";
import { Button } from "./Button";

type ModalSize = "sm" | "md" | "lg" | "xl";

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: ModalSize;
  fullScreenOnMobile?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  footer,
  size = "md",
  fullScreenOnMobile = false,
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  const articleClasses = fullScreenOnMobile
    ? `max-h-[100dvh] h-full w-full max-w-full overflow-y-auto rounded-none border border-border bg-white shadow-soft sm:max-h-[90vh] sm:h-auto sm:rounded-lg ${sizeClasses[size]}`
    : `max-h-[90vh] w-full overflow-y-auto rounded-lg border border-border bg-white shadow-soft ${sizeClasses[size]}`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-0 sm:p-4" role="presentation">
      <article aria-modal="true" className={articleClasses} role="dialog">
        <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-5 sm:py-4">
          <h2 className="min-w-0 flex-1 truncate font-heading text-lg text-textDark sm:text-xl">{title}</h2>
          <Button className="shrink-0" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </header>
        <div className="p-3 sm:p-5">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-3 py-3 sm:px-5 sm:py-4">
            {footer}
          </footer>
        ) : null}
      </article>
    </div>
  );
}
