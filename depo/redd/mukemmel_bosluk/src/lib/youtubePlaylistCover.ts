/**
 * Deneyimdeki YouTube çalma listesi sayfası için oEmbed üzerinden kapak görseli.
 * Tarayıcıdan doğrudan YouTube'a istek; başarısız olursa çağıran yer yedek URL kullanır.
 */
export async function fetchPlaylistThumbnailUrl(playlistPageUrl: string): Promise<string | null> {
  try {
    const endpoint = new URL("https://www.youtube.com/oembed");
    endpoint.searchParams.set("url", playlistPageUrl);
    endpoint.searchParams.set("format", "json");
    const res = await fetch(endpoint.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    const u = data.thumbnail_url?.trim();
    return u && u.length > 0 ? u : null;
  } catch {
    return null;
  }
}
