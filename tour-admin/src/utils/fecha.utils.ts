import { format } from "date-fns";
import { es } from "date-fns/locale";

export function formatDateToSpanish(date: Date): string {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: es });
}
