import { createContext, useContext, useMemo, type ReactNode } from "react";

interface ConfigContextValue {
  companyName: string;
  locale: string;
  timezone: string;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ConfigContextValue>(
    () => ({
      companyName: "Patagonia",
      locale: "es-SV",
      timezone: "America/El_Salvador",
    }),
    [],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig debe utilizarse dentro de ConfigProvider.");
  }

  return context;
}
