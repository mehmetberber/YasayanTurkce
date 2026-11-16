export function normalizeTurkish(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");
}

export function toSearchKey(value: string): string {
  return normalizeTurkish(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildEntryId(sourceId: string, sourceEntryId: string | number): string {
  return `${sourceId}:${sourceEntryId}`;
}
