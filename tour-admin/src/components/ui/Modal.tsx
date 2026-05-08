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
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({ isOpen, title, children, onClose, footer, size = "md" }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4" role="presentation">
      <article
        aria-modal="true"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg border border-border bg-white shadow-soft ${sizeClasses[size]}`}
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-xl text-textDark">{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </header>
        <div className="p-5">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">{footer}</footer> : null}
      </article>
    </div>
  );
}
