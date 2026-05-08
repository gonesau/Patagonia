export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function normalizePhone(value: string): string {
  return onlyDigits(value).slice(0, 8);
}

export function formatDui(value: string): string {
  const digits = onlyDigits(value).slice(0, 9);
  if (digits.length <= 8) {
    return digits;
  }

  return `${digits.slice(0, 8)}-${digits.slice(8)}`;
}

export function normalizeDui(value: string): string {
  return onlyDigits(value).slice(0, 9);
}

export function formatPlate(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toUpperCase()
    .slice(0, 10);
}
