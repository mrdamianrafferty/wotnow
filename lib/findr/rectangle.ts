export function normalizeRectangleCode(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  if (/^[0-9]{2}[A-Z][0-9]$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
