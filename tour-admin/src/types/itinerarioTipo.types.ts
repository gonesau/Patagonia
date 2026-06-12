export interface ItinerarioTipoItem {
  hora: string;
  actividad: string;
}

export type ItinerarioTipoNormalized =
  | { kind: "structured"; items: ItinerarioTipoItem[] }
  | { kind: "legacy"; text: string }
  | { kind: "empty" };
