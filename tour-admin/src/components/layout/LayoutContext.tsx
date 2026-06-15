import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";

interface LayoutContextValue {
  modalPortalRef: RefObject<HTMLDivElement | null>;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const modalPortalRef = useRef<HTMLDivElement | null>(null);

  return <LayoutContext.Provider value={{ modalPortalRef }}>{children}</LayoutContext.Provider>;
}

export function useLayoutModalPortal(): RefObject<HTMLDivElement | null> {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutModalPortal must be used within LayoutProvider");
  }
  return context.modalPortalRef;
}

export function useOptionalLayoutModalPortal(): RefObject<HTMLDivElement | null> | null {
  const context = useContext(LayoutContext);
  return context?.modalPortalRef ?? null;
}
