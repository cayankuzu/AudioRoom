# Redd — Mükemmel Boşluk: Albüm dünyası

Tarayıcıda çalışan, gezilebilir sinematik bir albüm deneyimi. **TypeScript + Vite + Three.js**.

- Siyah volkanik çöl, geniş krater, arka ışıkla silüet figür
- 3D metin: **MÜKEMMEL BOŞLUK** ve **REDD** (`troika-three-text`, Türkçe glif)
- Toplanan plaklar yalnızca `track.id` ile gramofona bağlanır; çalan parça seçilen plağın kimliğiyle birebir eşleşir
- Müzik: YouTube IFrame API (`loadVideoById` tercih). Tam eşleşme için `VITE_YT_API_KEY` veya `src/data/youtubeManualVideoIds.ts`

## Kurulum

```bash
npm install
npm run dev
```

Üretim: `npm run build`

## Gramofon / müzik

- **Oynat / Duraklat / Durdur / Başa sar** — Durdur gramofondaki plağı da kaldırır (durum sıfırlanır).
- Konsolda `[Gramofon]` ve `[Gramofon:YouTube]` önekli günlükler vardır.
- Yanlış parça riski: `youtubeVideoId` yoksa playlist indeksi kullanılır; API ile başlık eşlemesi veya elle video ID önerilir.

## Yapı özeti

Ana modüller: `src/app/gameLoop.ts`, `src/world/*`, `src/audio/youtubePlayer.ts`, `src/ui/*`, `src/data/trackLibrary.ts`.
