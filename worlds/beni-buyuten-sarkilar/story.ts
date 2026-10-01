import type { Beat } from "../../engine/game/timeline";

/**
 * Gölge oyunlarının zaman çizelgesi. Her şarkı, sözlerin senkron zaman
 * damgalarına göre perdelere (act) bölünür; perde değiştikçe zara düşen tablo
 * değişir ve altta kısa bir hikâye satırı belirir. Satırlar sözlerden alıntı
 * değil, o anın yorumudur. Sıra önemlidir: çizimler perde numarasını kullanır.
 */
export const STORY: Record<string, readonly Beat[]> = {
  // Göğe sorulan soru: yalnızlık → kısa bir mutluluk hayali → ipler → isyan.
  "ben-insan-degil-miyim": [
    { at: 0, id: "yalniz", line: "Yağmur, bir lamba, bir bank. Biri yapayalnız oturuyor." },
    { at: 13.7, id: "soru", line: "Adam ayağa kalkıp başını göğe kaldırıyor." },
    { at: 26.4, id: "atilmis", line: "Yağmur sertleşiyor; lamba titriyor." },
    { at: 53, id: "mutlu", line: "Uzakta bir evin penceresi yanıyor." },
    { at: 90.9, id: "gulmek", line: "Biri yağmurun içinden gelip yanında duruyor." },
    { at: 104.2, id: "alindi", line: "Gelen geri dönüp gidiyor; pencerenin ışığı sönüyor." },
    { at: 118.1, id: "kukla", line: "Tepeden ipler iniyor; adam bir kukla gibi oynatılıyor." },
    { at: 169.3, id: "yeniden", line: "Adam yeniden başını kaldırıyor." },
    { at: 182.5, id: "vur", line: "Her vuruşta zar titriyor; bebek irkiliyor." },
    { at: 219.8, id: "isyan", line: "İpler kopuyor; yağmur kararıyor, adam kollarını göğe açıyor." },
    { at: 236, id: "son", line: "Yağmur yavaşlıyor; lamba yanık kalıyor." },
  ],
  // Sabahattin Ali'nin hücresi: eğik baş → dalgalar → ayağa kalkış → şafak.
  "aldirma-gonul": [
    { at: 0, id: "duvar", line: "Yüksek bir duvar, dar bir pencere. Ardında deniz." },
    { at: 35.2, id: "bas", line: "Mahkûm başını kaldırıp pencereye bakıyor." },
    { at: 82, id: "dalga", line: "Dalgalar büyüyor; köpükler pencereye kadar sıçrıyor." },
    { at: 127.6, id: "kalk", line: "Mahkûm ayağa kalkıyor; yumruğu parmaklıklarda." },
    { at: 146.8, id: "yuksel", line: "Zarın içinde sıcak bir akım yükseliyor." },
    { at: 162.8, id: "gunler", line: "Ufukta güneş doğuyor; martılar pencerenin önünde dönüyor." },
    { at: 195, id: "son", line: "Martı hâlâ pencerenin önünde." },
  ],
  // Kurumuş çeşme: şimdi → hatıra → yıllar sonra aynı yere dönen biri.
  "o-cesme": [
    { at: 0, id: "kuru", line: "Taş bir çeşme; musluğundan tek damla akmıyor." },
    { at: 33.4, id: "damla", line: "Bir hatıra canlanıyor: çeşmenin başında gülüşen iki genç." },
    { at: 50, id: "kuru2", line: "Hatıra siliniyor; geriye taş kalıyor." },
    { at: 83.5, id: "yillar", line: "Servi ağaçları boy atıyor; bastonlu biri çeşmeye yürüyor." },
    { at: 100.1, id: "damla2", line: "Bir an çeşmeden su sesi geliyor." },
    { at: 121, id: "kuru3", line: "Hatıra soluyor; bastonlu adam çeşmenin önünde kalakalıyor." },
    { at: 150, id: "son", line: "Testi yere bırakılıyor." },
  ],
  // Kadere itiraz: tek bir yumruk → kalabalık → yakaya yapışan dertler → kızıl.
  "itirazim-var": [
    { at: 0, id: "bekleyis", line: "Kalabalık susuyor; kimse kıpırdamıyor." },
    { at: 24.3, id: "itiraz", line: "Kalabalıktan biri yumruğunu kaldırıyor." },
    { at: 51, id: "yarim", line: "Yumruklar çoğalıyor." },
    { at: 72.5, id: "kaybeden", line: "Yumruklar bir an iniyor; kalabalık yorgun." },
    { at: 93.5, id: "yaka", line: "Tepeden dev bir el iniyor, birini yakasından tutuyor." },
    { at: 104.1, id: "cehennem", line: "Etraf kızıla kesiyor." },
    { at: 141.5, id: "buyuk", line: "Pankart açılıyor; bütün kalabalık ayakta." },
    { at: 168.3, id: "yuzler", line: "Kenarlardan koca yüzler kalabalığa bakıyor." },
    { at: 221.6, id: "cehennem2", line: "Kızıl yeniden yükseliyor." },
    { at: 236, id: "son", line: "Kader duruyor. İtiraz kayda geçiyor." },
  ],
  // Ağır Roman: kulenin dibinde bir sevda, yangınlar, boşalan sokaklar.
  "agla-sevdam": [
    { at: 0, id: "kule", line: "Kulenin altında yağmurlu bir sokak. Bir klarnet çalıyor." },
    { at: 10.5, id: "yemin", line: "İki kişi şemsiyenin altında buluşuyor." },
    { at: 28.4, id: "sar", line: "Şemsiyenin altında birbirlerine sokuluyorlar." },
    { at: 47.7, id: "kuslar", line: "Kulenin üstünden kuşlar geçiyor." },
    { at: 60.8, id: "yangin", line: "Arkada yangınlar." },
    { at: 66.8, id: "yola", line: "Şemsiyeyle birlikte sokakta yürümeye başlıyorlar." },
    { at: 86.8, id: "dar", line: "Sokak daralıyor, duvarlar yaklaşıyor." },
    { at: 105.7, id: "bos", line: "Pencereler tek tek kararıyor." },
    { at: 150, id: "son", line: "Geriye yalnız kule kalıyor." },
  ],
  // Moğollar'ın kâbusu: düş → ateş ve duman → yıkılmayanlar → ıssızlık.
  "issizligin-ortasinda": [
    { at: 0, id: "duz", line: "Boş bir ova, tek bir ağaç." },
    { at: 27, id: "dus", line: "Ağacın altında biri uykuya dalıyor." },
    { at: 55.6, id: "uyku", line: "Uyku ağırlaşıyor; düş karanlığa dönüyor." },
    { at: 83.4, id: "ates", line: "Ufukta alevler; kara dumanlar göğe yükseliyor." },
    { at: 95.2, id: "sazlar", line: "Sazlar ellerden düşüyor." },
    { at: 101.8, id: "ayakta", line: "Sazcılar dumanın içinde kıpırdamadan duruyor." },
    { at: 123.5, id: "issiz", line: "Duman seyreliyor; ovada yalnızca ağaç ve uyuyan kalıyor." },
    { at: 160.2, id: "ates2", line: "Kâbus geri dönüyor; alevler yeniden yükseliyor." },
    { at: 200, id: "issiz2", line: "Duman dağılıyor; yalnızca ağaç kalıyor." },
    { at: 228, id: "son", line: "Uyuyan uyanıyor." },
  ],
  // Tek spot: gidiş → saldıran gölgeler → Kerem gibi yanmak → çalınamayan gece.
  "neydi-gunahim": [
    { at: 0, id: "spot", line: "Tek bir spot. Sahnede yapayalnız." },
    { at: 21.2, id: "gidis", line: "Şarkıcı spotun içinde ağır ağır sallanıyor." },
    { at: 53.8, id: "ekilen", line: "Spotun kenarında gölgeler kıpırdıyor." },
    { at: 69.2, id: "kalles", line: "Karanlıktan iri gölgeler spota sokuluyor." },
    { at: 87.7, id: "soru", line: "Gölgeler geri çekiliyor; spotta yine tek başına." },
    { at: 100.4, id: "kerem", line: "Ayaklarının dibinde alevler beliriyor." },
    { at: 114.5, id: "haydi", line: "Salon bir anlığına alkışa boğuluyor." },
    { at: 125.9, id: "hirsiz", line: "Çuvallı bir gölge spotun içinden koşarak geçiyor." },
    { at: 132.2, id: "felek", line: "Karanlıkta yıldızlar beliriyor; biri çok yakında." },
    { at: 152, id: "son", line: "Spot kararıyor." },
  ],
  // Mahzuni'nin meydanı: âşık → kalabalık → şişkin bey → tek ses.
  "yuh-yuh": [
    { at: 0, id: "saz", line: "Meydanda bir âşık, elinde saz." },
    { at: 13.6, id: "yuh", line: "Meydanda kalabalık toplanıyor." },
    { at: 40.7, id: "muska", line: "Âşığın başının üstünde bir muska sallanıyor." },
    { at: 76, id: "bey", line: "Kürsüye silindir şapkalı şişman bir bey çıkıyor." },
    { at: 103.1, id: "asalet", line: "Kalabalık dönüp beye bakıyor." },
    { at: 138, id: "koro", line: "Bütün meydan tek ses. Bey küçüldükçe küçülüyor." },
    { at: 173.5, id: "son", line: "Saz susuyor; meydan dağılmıyor." },
  ],
  // Paylaşılmış toprak: çitler → dikili taş → kapanan kapılar → elde kalan suç.
  "nem-kaldi": [
    { at: 0, id: "tarla", line: "Uçsuz bir tarla; uzaktan bir türkü yaklaşıyor." },
    { at: 24.3, id: "parsel", line: "Tarlaya birer birer çitler dikiliyor." },
    { at: 35.2, id: "tas", line: "Toprağın ortasında bir taş yükseliyor." },
    { at: 46, id: "kapilar", line: "Evin kapısı kapanıyor; ışık sönüyor." },
    { at: 89.4, id: "namert", line: "İki gölge sırtını dönüp uzaklaşıyor." },
    { at: 112.1, id: "dusman", line: "Uzaklaşanlar dönüp bakmıyor." },
    { at: 155.5, id: "arsiz", line: "Âşığın etrafına tabelalar dikiliyor." },
    { at: 178, id: "ac", line: "Âşık yere çöküyor; önünde boş bir kâse." },
    { at: 202.6, id: "sermaye", line: "Başını öne eğiyor; sazı yanında." },
    { at: 250, id: "son", line: "Toprak hâlâ bölünmüş; türkü hâlâ sürüyor." },
  ],
};

/** Perde ilerlemesi: mevcut perdenin sırası + bir sonrakine kadar geçen oran (0…n). */
export function storyProgress(beats: readonly Beat[], songTime: number): number {
  let index = -1;
  while (index + 1 < beats.length && beats[index + 1].at <= songTime) index += 1;
  if (index < 0) return 0;
  const start = beats[index].at;
  const end = beats[index + 1]?.at ?? start + 20;
  return index + Math.min(1, Math.max(0, (songTime - start) / Math.max(1, end - start)));
}
