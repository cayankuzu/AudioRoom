import type { Beat } from "../../engine/game/timeline";

/**
 * Kuantum Dolanıklık'ın zaman çizelgesi: sözlerin senkron zaman damgalarına göre.
 * Uzun enstrümantal girişten sonra her dize odada bir şeyi değiştirir. Satırlar
 * sözlerden alıntı değil, o anın yorumudur.
 */
export const STORY: readonly Beat[] = [
  { at: 0, id: "kutu", line: "Sarı bir kutu, duvarda göz kırpan bir yüz. İki ayrı boşlukta iki kişi; ikisinin elinde birer çiçek." },
  { at: 22, id: "ikiz", line: "Adamınki açıyor; kadınınki o an soluyor. Kadın çiçeğine dokunuyor: açıyor. Adamınki soluyor. Sıra hiç bozulmuyor." },
  { at: 44, id: "kedi", line: "Bir kedi dolaşıyor; yalnızca kimse ona bakmazken. Çiçekler sırayla açıp solmaya devam ediyor." },
  { at: 66, id: "cicek", line: "Taç yaprağın içine giriyoruz. Yaprağın dokusu Ay'ın yüzeyine dönüyor." },
  { at: 72.4, id: "ay", line: "Ay'a çıkan bir yol. Adam koşuyor; kadın geride kalıyor. Gömlek cebine uzanınca: kadın orada, minicik, dışarı bakıyor." },
  { at: 92, id: "tafra", line: "Adam başını sallayınca cepteki kadın da sallıyor. Ay bir aydınlanıyor, bir sönüyor. Tek neden, tek sonuç." },
  { at: 118.6, id: "bag", line: "Uzun, boş bir yol. Kadının elinde tasma, tasma adamın boynunda. Yürüyorlar; kamera arkalarında." },
  { at: 125.1, id: "yalnizlik", line: "Yolun yanında dev bir ayna. Gerçekte tasma kadının elinde. Aynada: ip adamın elinde, tasma kadının boynunda." },
  { at: 136, id: "ara", line: "Kadın kayboluyor. Adam yalnız. Yalnızlık saydam bir koza gibi sarıyor; daralıyor. Zarın öbür yanında kadın: dokunamıyorlar." },
  { at: 171.4, id: "zehir", line: "Koza zarı bir kadehin camı oluyor. Masada karşılıklı. Kadın koyu yeşil bir sıvı uzatıyor; içmeden önce onun boğazı tutuluyor, sonra adamınki." },
  { at: 177.9, id: "tasma", line: "Kadehteki yeşil yükseliyor, tasma oluyor. Adam yine tasmalı, ip yine kadının elinde. İkisi de rahatsız." },
  { at: 197.6, id: "gulus", line: "Kamera kadının yanağında. Gülünce bir gamze oluyor; gamzenin içinde küçücük bir yıldız büyüyor, evren oluyor. İçeride iki kalp aynı anda atıyor; iki beden tek siluet." },
  { at: 217, id: "son", line: "Son notada siluet ikiye ayrılıyor. Birbirlerine bakıyorlar. Karanlık." },
];
