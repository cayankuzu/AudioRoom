import type { Beat } from "../../engine/game/timeline";

/**
 * Klostrofobik Kaplumbağa: kısa filmin zaman çizelgesi (sözlerin senkron zaman damgalarına oturur).
 * Amaç sözleri resmetmek değil: izleyene yer kalmadığını hissettirmek. Uçsuz bucaksız bir kâğıt →
 * kabuğun içindeki küçük ev → koşan tavşan, küçülen kapı → evren daralır (duvar yok: kâğıdın ötesi
 * karanlık, karanlık yaklaşır) → kabuğun içinde ikinci, daha küçük ev → çorba/çatal → tavşanın yer
 * altına kaçışı → nefes alanı kalmaması → geri çekilince bütün dünyanın bir kabuk olduğu görülür.
 * Satırlar sözlerden alıntı değil, o anın yorumudur.
 */
export const STORY: readonly Beat[] = [
  { at: 0, id: "bos", line: "Uçsuz bucaksız bir ebru kâğıdı. Ortasında kabuğunun üstünde gitar çalan bir kaplumbağa; kâğıdın ucunda tek bir adam. Bol yer var." },
  { at: 24, id: "ev", line: "Adam kabuğun içine giriyor: küçük ama yaşanır bir ev. Lamba, masa, çay, gitar. Rahat dönebiliyor." },
  { at: 47.9, id: "tavsan", line: "Bir tavşan kâğıdı koşarak geçiyor. Kabuğun ağzına geliyor; ağız öncekinden biraz daha dar. Duraksıyor, daha hızlı koşuyor." },
  { at: 60, id: "damla", line: "Kâğıda üç boya damlası düşüyor. Kâğıdın kenarında bir karanlık beliriyor; henüz kimse fark etmiyor." },
  { at: 83.8, id: "daralma", line: "Karanlık yaklaşıyor. Eşyalar aynı boyda; yalnız yer azalıyor. Önce kıpırdadı mı diye bakıyorsun." },
  { at: 95.8, id: "sikisma", line: "Kadraj sıkışıyor: nefes alacak boşluk kalmıyor. Adam evin içinde dönmeye çalışıyor; kabuk duvara değiyor." },
  { at: 108, id: "akis", line: "Kâğıt akıyor, dünya hızlanıyor. Karanlık üç adım daha yaklaşıyor." },
  { at: 133.2, id: "ikinci", line: "Kaplumbağa kabuğuna çekiliyor. Kabuğun içinde aynı ev bir kez daha var: daha küçük. Bu mümkün değil ama orada." },
  { at: 143.9, id: "corba", line: "Küçük evin ortasında bir çorba kâsesi; içinde bir çatal. Kâse geçidi kapatıyor; adam etrafından dolanamıyor." },
  { at: 152.9, id: "catal", line: "Çatal çorbadan kalkıyor; dişlerinden çorba akıyor. Hayat çorba, elde çatal. Gülünç değil; ciddi." },
  { at: 155.8, id: "kacis", line: "Tavşan daralan koridorda kazmaya başlıyor. Deliğe giriyor; toprak üstüne kapanıyor. Aşağıda da yer yok." },
  { at: 173.9, id: "nefes", line: "Tavan kabuğa değiyor, duvarlar iki yana. Kamera burnunun dibinde. Bir nefes içeri, bir nefes dışarı. Kesme yok." },
  { at: 186, id: "durus", line: "Her şey daralmayı bırakıyor. Sessizlik." },
  { at: 194.9, id: "acilis", line: "Kamera geri çekiliyor: küçük ev kabuğun içinde, kabuk dev. Daha geri: bütün kâğıt da bir kabuğun içinde. Dışarısı yok." },
  { at: 199, id: "son", line: "Dünya kabuğun kendisi. Kaçmıyor, çünkü dışarısı yok. Ama nefes alıyor. Son bir nefes." },
];

/** Her perdede kâğıdın yarıçapı (m); 160 = ufuk (karanlık görünmez). Eşyalar aynı kalır, yer azalır. */
export const RADIUS_TARGET: Record<string, number> = {
  bos: 160,
  ev: 160,
  tavsan: 160,
  damla: 120,
  daralma: 70,
  sikisma: 46,
  akis: 32,
  ikinci: 22,
  corba: 18,
  catal: 16,
  kacis: 13,
  nefes: 10.5,
  durus: 10.5,
  acilis: 160,
  son: 160,
};

/** Kabuk evinin daralması (0: 2,8 m, 1: 1,6 m). */
export const SQUEEZE_TARGET: Record<string, number> = {
  ev: 0,
  sikisma: 0.25,
  ikinci: 0.55,
  corba: 0.7,
  catal: 0.75,
  kacis: 0.85,
  nefes: 1,
  durus: 1,
};
