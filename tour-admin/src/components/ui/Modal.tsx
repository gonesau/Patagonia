import type { ReactNode } from "react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ isOpen, title, children, onClose }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <article className="w-full max-w-xl rounded-lg border border-border bg-white p-5 shadow-soft">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl text-textDark">{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </header>
        {children}
      </article>
    </div>
  );
}
