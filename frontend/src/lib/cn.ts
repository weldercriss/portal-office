type ClassValue = string | number | null | boolean | undefined;

/** Junta classes ignorando valores falsos. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
