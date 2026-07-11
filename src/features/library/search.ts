export function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıÄ±]/g, "i")
    .replace(/[ğÄŸ]/g, "g")
    .replace(/[şÅŸ]/g, "s")
    .replace(/[üÃ¼]/g, "u")
    .replace(/[öÃ¶]/g, "o")
    .replace(/[çÃ§]/g, "c")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
