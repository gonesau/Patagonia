import type { ItinerarioTipoItem, ItinerarioTipoNormalized } from "@/types/itinerarioTipo.types";

export function createEmptyItinerarioTipoItem(): ItinerarioTipoItem {
  return { hora: "", actividad: "" };
}

function isItinerarioTipoItem(value: unknown): value is ItinerarioTipoItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.hora === "string" && typeof record.actividad === "string";
}

export function normalizeItinerarioTipoFromFirestore(value: unknown): ItinerarioTipoNormalized {
  if (value === undefined || value === null || value === "") {
    return { kind: "empty" };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { kind: "legacy", text: value } : { kind: "empty" };
  }
  if (Array.isArray(value)) {
    const items = value.filter(isItinerarioTipoItem).map((item) => ({
      hora: item.hora,
      actividad: item.actividad,
    }));
    return items.length > 0 ? { kind: "structured", items } : { kind: "empty" };
  }
  return { kind: "empty" };
}

export function sanitizeItinerarioTipoItems(items: ItinerarioTipoItem[]): ItinerarioTipoItem[] {
  return items.filter((item) => item.hora.trim() !== "" || item.actividad.trim() !== "");
}

export function hasStructuredItinerarioTipoItems(items: ItinerarioTipoItem[]): boolean {
  return sanitizeItinerarioTipoItems(items).length > 0;
}

export function formatItinerarioTipoForDisplay(items: ItinerarioTipoItem[]): string {
  return sanitizeItinerarioTipoItems(items)
    .map((item) => {
      const hora = item.hora.trim();
      const actividad = item.actividad.trim();
      if (hora && actividad) {
        return `${hora} - ${actividad}`;
      }
      if (actividad) {
        return actividad;
      }
      return hora;
    })
    .join("\n");
}

export function resolveItinerarioTipoForPersist(
  items: ItinerarioTipoItem[],
  legacyText?: string,
): ItinerarioTipoItem[] | string | undefined {
  const sanitized = sanitizeItinerarioTipoItems(items);
  if (sanitized.length > 0) {
    return sanitized;
  }
  if (legacyText?.trim()) {
    return legacyText;
  }
  return undefined;
}

export function formatItinerarioTipoForDetailView(
  value: ItinerarioTipoItem[] | string | undefined,
): string | null {
  const normalized = normalizeItinerarioTipoFromFirestore(value);
  if (normalized.kind === "legacy") {
    return normalized.text;
  }
  if (normalized.kind === "structured") {
    const formatted = formatItinerarioTipoForDisplay(normalized.items);
    return formatted || null;
  }
  return null;
}
