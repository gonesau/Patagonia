import { useEffect, useState } from "react";

function getMatches(query: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function useBreakpoint(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

/** Pantallas pequeñas: vista tarjeta en listados (< md / 768px). */
export function useIsMobile(): boolean {
  return useBreakpoint("(max-width: 767px)");
}

/** Pantallas menores a lg: calendario y layout compacto (< 1024px). */
export function useIsLgDown(): boolean {
  return useBreakpoint("(max-width: 1023px)");
}
