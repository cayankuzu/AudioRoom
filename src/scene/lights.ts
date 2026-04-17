import * as THREE from "three";
import { LAYER } from "./layers";

export interface WorldLights {
  /** Ana güneş — figürün kafa arkasından vurur, silüet yaratır (disk GÖRÜNMEZ). */
  sun: THREE.DirectionalLight;
  /** Genel gökyüzü/yer dengesi. */
  hemi: THREE.HemisphereLight;
  /** Sahneyi taban okunurlukta tutan ambient. */
  ambient: THREE.AmbientLight;
  /** Yazıları ve ön planı okutan fill (karşı yönden gelir). */
  fill: THREE.DirectionalLight;
  /** Krater içine yumuşak dolgu. */
  craterFill: THREE.PointLight;
  /** 3D yazı bloğuna dedicated rim/ön okunurluk. */
  textRim: THREE.PointLight;
  /** Yalnız TEXT layer'ını etkileyen frontal fill — figürü bozmaz, yazıları okutur. */
  textFill: THREE.DirectionalLight;
  /** Yalnız TEXT layer'ında çalışan yumuşak boost — derinlik hissini artırır. */
  textBoost: THREE.PointLight;
  /**
   * Zeminde yan/grazing yönden hafifçe sürünen dolgu — zemin detayını
   * yakalayıp "cinematic side light" hissini verir. Ana silueti bozmaz.
   */
  groundGraze: THREE.DirectionalLight;
}

/**
 * Işıklandırma felsefesi (sinematik):
 *
 *  - `sun` (DirectionalLight) figürün TAM KAFA ARKASINDA. Görünmez; sadece
 *    backlight etkisi olarak hissedilir. Figür bu ışığın karşısında kalarak
 *    anıtsal bir SİLUET oluşturur. Figüre front-side fill vurmaz.
 *
 *  - `textFill` + `textBoost` YALNIZCA `LAYER.TEXT` katmanında çalışır
 *    (mesh'in `layers.enable(LAYER.TEXT)` çağrısı ile karşılıklı eşleşir).
 *    Figür bu katmanda olmadığı için yazılar aydınlık, figür karanlıkta kalır.
 *
 *  - `fill` / `craterFill` / `hemi` / `ambient` sahnenin geneline çalışır;
 *    yer ve kayalar kapkara çamur olmaz, ama figürü yıkamaz.
 *
 *  - `groundGraze` çok zayıf ama yandan — toprak/kaya detaylarını yakalar,
 *    foto-gerçekçi "sürünen yan ışık" hissi verir.
 *
 *  - Gölge PCFSoftShadow + büyük bias; siyahlar crush olmaz, detay kalır.
 */
export function addLights(scene: THREE.Scene): WorldLights {
  /**
   * ---- Ana güneş (backlight, görünmez) ----
   * Renk neredeyse nötr beyaz — kapak fotoğrafında arka ışık sıcak değil,
   * bulutlu/dağılmış parlak bir gün ışığı hissi veriyor.
   */
  const sun = new THREE.DirectionalLight("#f5f3ee", 2.55);
  sun.position.set(-45, 52, -72);
  sun.target.position.set(0, 6, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  /**
   * Daha geniş gölge blur yarıçapı + daha çok blur örneği → yumuşak,
   * "soft" gerçekçi gölgeler. Küçük ayrıntıların üstüne bir aura oluşur.
   */
  sun.shadow.radius = 6.5;
  sun.shadow.blurSamples = 20;
  sun.shadow.camera.left = -95;
  sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 95;
  sun.shadow.camera.bottom = -95;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 300;
  /**
   * Bias'i biraz daha negatif tutup normalBias'i büyütmek, yamaçta
   * "shadow acne" olmadan yumuşak sızıntıyı önler.
   */
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.055;

  /**
   * ---- Gökyüzü / yer dengesi ----
   * Monokrom referans — üst rengi de alt rengi de NÖTR gri. Referans
   * fotoğraf: siyahlar derin AMA detay var, ön plan okunuyor. Bu yüzden
   * hemi yoğunluğu artırıldı (0.68 → 0.95), ambient de biraz yukarı
   * (0.24 → 0.42). Böylece siyahlar "crush" olmadan derin kalır.
   */
  const hemi = new THREE.HemisphereLight("#c8cbce", "#3a3b3d", 0.95);
  const ambient = new THREE.AmbientLight("#bec1c4", 0.42);

  /**
   * Sahne genel fill — KAMERA tarafından GELEN bir directional. Figür'e
   * doğrudan vurmasın diye zayıf tutulur ve hafif yukardan gelir. Nötr
   * açık gri — siyahlar gri olarak temiz açılır, mavi kayma yok.
   */
  const fill = new THREE.DirectionalLight("#b2b5b8", 0.72);
  fill.position.set(38, 36, 48);
  fill.target.position.set(0, 2, 0);
  fill.castShadow = false;

  /** Krater içi dolgu — nötr gri; kraterin taban gölgelerini açık tutar. */
  const craterFill = new THREE.PointLight("#a5a8ab", 0.95, 155, 1.6);
  craterFill.position.set(0, 4, 0);
  craterFill.castShadow = false;

  const textRim = new THREE.PointLight("#e2e6ec", 0.5, 62, 1.9);
  textRim.position.set(0, 6, 2);
  textRim.castShadow = false;

  /**
   * ---- Yazılara özel fill (YALNIZ LAYER.TEXT) ----
   * Directional — kamera yönünden yazıların yüzüne vurur, arkaya geçmez.
   * Intensity yüksek, çünkü backlight karşısında yazıyı okutması gerekiyor.
   */
  const textFill = new THREE.DirectionalLight("#f4eee0", 3.4);
  textFill.position.set(28, 22, 38);
  textFill.target.position.set(0, 6, 0);
  textFill.castShadow = false;
  textFill.layers.set(LAYER.TEXT);
  textFill.target.layers.set(LAYER.TEXT);

  /** Ek parlama — yazı blokuna çok yakın, okunurluğu garantiler. */
  const textBoost = new THREE.PointLight("#fff0cf", 2.2, 38, 1.4);
  textBoost.position.set(0, 7, 6);
  textBoost.castShadow = false;
  textBoost.layers.set(LAYER.TEXT);

  /**
   * ---- Ground grazing side-light ----
   * Çok düşük yüksekten, yatay yönde gelen NÖTR dolgu. Amacı:
   *   - Yan ışık altında zemin ve küçük kayaların normal map detaylarını
   *     yakalamak (fotoğrafik "side lighting" etkisi).
   *   - Düz ışıkta kaybolan mikro granül hissini öne çıkarmak.
   *
   * Renk nötr açık gri (mavi kayma yok), güç çok kısıtlı (≈0.32).
   */
  const groundGraze = new THREE.DirectionalLight("#b0b3b6", 0.32);
  groundGraze.position.set(62, 4, 28);
  groundGraze.target.position.set(0, 0.5, 0);
  groundGraze.castShadow = false;

  /**
   * textFill + textBoost + textRim SAHNEYE EKLENMİYOR. figure.ts bunları
   * `lightRig`'e (yani compositionGroup'un çocuğuna) ekleyecek. Bu sayede
   * kompozisyon döndüğünde ışıklar da onunla birlikte döner → "MÜKEMMEL
   * BOŞLUK" ve "REDD" yazıları her açıda aynı frontal aydınlatmayı alır,
   * hiçbir zaman tamamen karanlıkta kalmaz.
   */
  scene.add(
    sun,
    sun.target,
    hemi,
    ambient,
    fill,
    fill.target,
    craterFill,
    groundGraze,
    groundGraze.target,
  );
  return {
    sun,
    hemi,
    ambient,
    fill,
    craterFill,
    textRim,
    textFill,
    textBoost,
    groundGraze,
  };
}
