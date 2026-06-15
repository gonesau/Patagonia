import { useEffect, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOptionalLayoutModalPortal } from "@/components/layout/LayoutContext";
import { useIsLgDown } from "@/hooks/useBreakpoint";
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

function getArticleClasses(size: ModalSize, fullScreenOnMobile: boolean): string {
  const baseClasses = "w-full overflow-y-auto border border-border bg-white shadow-soft";

  if (fullScreenOnMobile) {
    return [
      baseClasses,
      "max-lg:h-[100dvh] max-lg:max-h-[100dvh] max-lg:max-w-none max-lg:rounded-none",
      "lg:max-h-[90vh] lg:rounded-lg",
      sizeClasses[size],
    ].join(" ");
  }

  return [baseClasses, "max-h-[90vh] rounded-lg", sizeClasses[size]].join(" ");
}

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  footer,
  size = "md",
  fullScreenOnMobile = false,
}: ModalProps) {
  const modalPortalRef = useOptionalLayoutModalPortal();
  const isLgDown = useIsLgDown();

  const portalTarget = modalPortalRef?.current ?? null;
  const isScopedToContent = !isLgDown && portalTarget !== null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scrollTarget = isScopedToContent && portalTarget ? portalTarget : document.body;
    const previousOverflow = scrollTarget.style.overflow;
    scrollTarget.style.overflow = "hidden";

    return () => {
      scrollTarget.style.overflow = previousOverflow;
    };
  }, [isOpen, isScopedToContent, portalTarget]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const overlayClasses = isScopedToContent
    ? "absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-0 sm:p-4"
    : "fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-0 sm:p-4";

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className={overlayClasses} onClick={handleBackdropClick} role="presentation">
      <article
        aria-modal="true"
        className={getArticleClasses(size, fullScreenOnMobile)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
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

  if (isScopedToContent && portalTarget) {
    return createPortal(modalContent, portalTarget);
  }

  return createPortal(modalContent, document.body);
}
