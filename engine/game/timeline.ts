/**
 * Şarkı zaman çizelgesi: şarkının saniyesine bağlı "vuruşlar" (beat). Şarkı
 * ilerledikçe sırayla tetiklenir; geri sarılırsa ya da şarkı baştan başlarsa
 * kendini sıfırlar. Zamanlar, sözlerin senkron zaman damgalarından alınmıştır
 * (sözlerin kendisi saklanmaz; yalnızca anın yorumu).
 */
export interface Beat {
  /** Saniye. */
  at: number;
  id: string;
  /** Yönetmen notu: o anın kısa, özgün tarifi (ekranda gösterilmez; söz alıntısı değil). */
  line?: string;
}

export interface Timeline {
  /** Son geçilen vuruş (henüz yoksa null). */
  readonly current: Beat | null;
  /** Şarkı zamanı ilerletilir; bu karede geçilen vuruşlar sırayla döner. */
  update(songTime: number): Beat[];
  /** Belirli bir vuruşun geçilip geçilmediği. */
  passed(id: string): boolean;
  /** Mevcut vuruşun başlangıcından bu yana geçen süre. */
  since(songTime: number): number;
  reset(): void;
}

export function createTimeline(beats: readonly Beat[]): Timeline {
  const sorted = [...beats].sort((a, b) => a.at - b.at);
  let index = 0;
  let last = -1;
  const timeline: Timeline = {
    get current() {
      return index > 0 ? sorted[index - 1] : null;
    },
    update(songTime) {
      // Geri sarma ya da şarkının yeniden başlaması: baştan say.
      if (songTime < last - 1.5) index = 0;
      last = songTime;
      const crossed: Beat[] = [];
      while (index < sorted.length && sorted[index].at <= songTime) {
        crossed.push(sorted[index]);
        index += 1;
      }
      // Geçilen son vuruş kök öğede de durur (ekranda görünmez; otomatik testler filmin hangi anında olduğunu buradan okur).
      if (crossed.length > 0 && typeof document !== "undefined") document.documentElement.dataset.beat = crossed[crossed.length - 1].id;
      return crossed;
    },
    passed(id) {
      const at = sorted.findIndex((beat) => beat.id === id);
      return at >= 0 && at < index;
    },
    since(songTime) {
      const beat = timeline.current;
      return beat ? songTime - beat.at : songTime;
    },
    reset() {
      index = 0;
      last = -1;
    },
  };
  return timeline;
}
