/**
 * Gizli keşifler (easter egg). Her evren kendi sırlarını tanımlar; bulunanlar
 * ilerlemeyle birlikte saklanır, hub'da sayısı görünür. Başlık ve metin,
 * bulunana kadar oyuncuya gösterilmez.
 */
export interface Secret {
  id: string;
  title: string;
  text: string;
}

export interface Secrets {
  readonly total: number;
  readonly found: ReadonlySet<string>;
  /** Sırrı açığa çıkarır; ilk kez bulunduysa true. */
  reveal(id: string): boolean;
  has(id: string): boolean;
}

export function createSecrets(
  list: readonly Secret[],
  found: Set<string>,
  onReveal: (secret: Secret, count: number, total: number) => void,
): Secrets {
  const byId = new Map(list.map((secret) => [secret.id, secret]));
  return {
    total: list.length,
    found,
    has: (id) => found.has(id),
    reveal(id) {
      const secret = byId.get(id);
      if (!secret || found.has(id)) return false;
      found.add(id);
      onReveal(secret, found.size, list.length);
      return true;
    },
  };
}
