import { deviceClass } from "../../engine/core/device";

/**
 * Evren sürümleri. Her albümün evreni birden çok sürümde yaşar; eski sürümler
 * silinmez, kütüphanede "Evrene gir" ile açılan seçiciden hangisine girileceği
 * seçilir. Yeni bir sürüm eklemek için listenin başına bir kayıt eklemek yeter.
 *
 * Sürüm 1: evrenlerin ilk hâli (özgün kodu `depo/` altında, hiç değiştirilmeden korunur).
 * Sürüm 2: kapağın birebir içi, her şarkıya özel klip ve sahne, sinema kamerası.
 */
export interface WorldVersion {
  number: number;
  /** Kısa etiket: "Güncel", "İlk sürüm". */
  tag: string;
  /** Yayın tarihi (gösterim için). */
  date: string;
  href: string;
  title: string;
  summary: string;
  features: readonly string[];
  /** Önizleme kareleri (ilk kare büyük gösterilir). */
  previews: readonly string[];
  /** Telefonda (dar dokunmatik ekran): tam evren, sade demo ya da açılmaz. */
  phone: Access;
  /** Klavyesiz tablette (geniş dokunmatik ekran). */
  tablet: Access;
}

export type Access = "full" | "demo" | "none";

const previews = (id: string, version: number, count = 3) =>
  Array.from({ length: count }, (_, i) => `previews/${id}/v${version}-${i + 1}.jpg`);

export const VERSIONS: Readonly<Record<string, readonly WorldVersion[]>> = {
  "mukemmel-bosluk": [
    {
      number: 2,
      tag: "Güncel",
      date: "Eylül 2026",
      href: "worlds/mukemmel-bosluk/",
      title: "Kapağın içi, her şarkının klibi",
      summary: "Krater kapaktaki gibi durur; plak takılınca o şarkının klibine dönüşür: yanan gemiler, dev böcek, geri sayım, küle dönen orman…",
      features: ["12 şarkıya özel, dizelere kurgulanmış 3D klip", "Şarkıyla değişen sahneler, gizli mesajlar ve etkileşimler", "31 gizli keşif, kapak noktası ve fotoğraf modu", "Taşınabilir gramofon · tablette 4 şarkılık demo"],
      previews: previews("mukemmel-bosluk", 2),
      phone: "none",
      tablet: "demo",
    },
    {
      number: 1,
      tag: "İlk sürüm",
      date: "Nisan 2026",
      href: "depo/redd/mukemmel_bosluk/",
      title: "Gece yürüyüşü",
      summary: "Sessiz kraterde dağılmış plakları bul, gramofona tak ve albümü parça parça gece yürüyüşünün içine aç.",
      features: ["Fener, harita ve serbest dolaşım", "Plakları topla, gramofonda çal", "Parlaklık, kontrast ve ekran görüntüsü", "Telefonda yatay oynanır"],
      previews: previews("mukemmel-bosluk", 1),
      phone: "full",
      tablet: "full",
    },
  ],
  "beni-buyuten-sarkilar-vol-1": [
    {
      number: 2,
      tag: "Güncel",
      date: "Eylül 2026",
      href: "worlds/beni-buyuten-sarkilar/",
      title: "Dokuz ay, dokuz şarkı",
      summary: "Rahmin içinde anı kabarcıkları; her şarkı zarda kendi gölge oyununu oynar, bebek her plakla büyür.",
      features: ["9 şarkıya özel gölge oyunu, sahne parçası ve klip", "Anı kabarcıkları, büyüyen bebek, hızlanan kalp", "24 gizli keşif ve hatıra eşyası", "Kapak noktası ve fotoğraf modu"],
      previews: previews("beni-buyuten-sarkilar", 2),
      phone: "none",
      tablet: "none",
    },
    {
      number: 1,
      tag: "İlk sürüm",
      date: "Nisan 2026",
      href: "depo/hayko_cepkin/Beni_Büyüten_Şarkılar_Vol.1/",
      title: "Kor halkası",
      summary: "Kor halkasının içindeki biyolojik sahnede dolaş, plakları topla ve gramofona takarak albümü parça parça aç.",
      features: ["Kor halkası ve biyolojik sahne", "Plakları topla, gramofonda çal", "Harita ve albüm paneli"],
      previews: previews("beni-buyuten-sarkilar", 1),
      phone: "none",
      tablet: "none",
    },
  ],
  "kuantum-dolaniklik": [
    {
      number: 2,
      tag: "Güncel",
      date: "Eylül 2026",
      href: "worlds/kuantum-dolaniklik/",
      title: "Sarı kutu",
      summary: "Kapaktan ölçülmüş sarı oda: dolanık ikizin plağı taşır, dizeler odayı değiştirir; klip kapağın kadrajıyla açılıp kapanır.",
      features: ["Seni ayna gibi taklit eden dolanık ikiz", "Dizelerle değişen oda: ay, ipler, kadeh, gamze", "Çatlaktan kutunun dışına bakış ve 8 gizli keşif", "Klip ve sinema kamerası"],
      previews: previews("kuantum-dolaniklik", 2),
      phone: "none",
      tablet: "none",
    },
    {
      number: 1,
      tag: "İlk sürüm",
      date: "Nisan 2026",
      href: "depo/henry_the_lee/kuantum_dolanıklığı/",
      title: "Heisenberg sınırı",
      summary: "Boşlukta süzülen plağın izini sür: G ile konumunu, H ile hızını ölç ve belirsizlik sınırı içinde gramofona yerleştir.",
      features: ["Konum ve hız ölçümü", "Dalgalanan zemin ve süzülen plak", "Harita ve albüm paneli"],
      previews: previews("kuantum-dolaniklik", 1),
      phone: "none",
      tablet: "none",
    },
  ],
  "klostrofobik-kaplumbaga": [
    {
      number: 2,
      tag: "Güncel",
      date: "Eylül 2026",
      href: "worlds/klostrofobik-kaplumbaga/",
      title: "Ebru kâğıdında konser",
      summary: "Kaplumbağa kabuğunun üstünde gitar çalar; tavşanı havuçla yakala, kabuğuna çekil, gerçek tavşan deliklerinde sürün.",
      features: ["Akan ebru kâğıdı ve boya damlaları", "Tavşan delikleri ve dar tüneller", "9 gizli keşif, klip ve sinema kamerası", "Kapak noktası ve fotoğraf modu"],
      previews: previews("klostrofobik-kaplumbaga", 2),
      phone: "none",
      tablet: "none",
    },
    {
      number: 1,
      tag: "İlk sürüm",
      date: "Ağustos 2026",
      href: "depo/henry_the_lee/klostrofobik_kaplumbaga/",
      title: "Tavşan avı",
      summary: "Tavşanı üç isabette yavaşlat, üç isabet daha vurarak durdur ve plağı kurtar; sonra gramofona koşan tavşandan onu koru.",
      features: ["Havuç atarak tavşan avı", "Tavşan delikleri ve tüneller", "Grafik ayarları ve harita", "Telefonda yatay oynanır"],
      previews: previews("klostrofobik-kaplumbaga", 1),
      phone: "none",
      tablet: "full",
    },
  ],
};

export const versionsOf = (id: string): readonly WorldVersion[] => VERSIONS[id] ?? [];

/** Bu cihazda sürüm açılır mı: bilgisayarda tam; telefonda ve tablette sürümün kendi ayarı. */
export function accessOf(version: WorldVersion): Access {
  const device = deviceClass();
  return device === "desktop" ? "full" : version[device];
}

/** Bu cihazda açılabilen bir sürümü var mı? (Telefonda yalnızca Mükemmel Boşluk Sürüm 1.) */
export const reachableHere = (id: string): boolean => versionsOf(id).some((version) => accessOf(version) !== "none");

const LAST_KEY = (id: string) => `audioroom.hub.version.${id}`;

/** Albümde en son girilen sürüm (seçicide işaretlenir). */
export function lastVersion(id: string): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_KEY(id)));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function rememberVersion(id: string, number: number): void {
  try {
    localStorage.setItem(LAST_KEY(id), String(number));
  } catch {
    // Depolama kapalıysa hatırlanmaz; seçim yine çalışır.
  }
}
