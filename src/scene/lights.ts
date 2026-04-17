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
}

/**
 * Işıklandırma felsefesi:
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
 */
export function addLights(scene: THREE.Scene): WorldLights {
  /** ---- Ana güneş (backlight, görünmez) ---- */
  const sun = new THREE.DirectionalLight("#fff4d8", 2.4);
  sun.position.set(-45, 52, -72);
  sun.target.position.set(0, 6, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4.2;
  sun.shadow.blurSamples = 14;
  sun.shadow.camera.left = -85;
  sun.shadow.camera.right = 85;
  sun.shadow.camera.top = 85;
  sun.shadow.camera.bottom = -85;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 280;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.035;

  /** ---- Gökyüzü / yer dengesi ---- */
  const hemi = new THREE.HemisphereLight("#d9dde2", "#2a241e", 0.62);
  const ambient = new THREE.AmbientLight("#c6c8cc", 0.26);

  /**
   * Sahne genel fill — KAMERA tarafından GELEN bir directional. Figür'e
   * doğrudan vurmasın diye zayıf tutulur ve hafif yukardan gelir.
   */
  const fill = new THREE.DirectionalLight("#b8c3d4", 0.55);
  fill.position.set(38, 36, 48);
  fill.target.position.set(0, 2, 0);
  fill.castShadow = false;

  const craterFill = new THREE.PointLight("#a8b0bc", 0.85, 150, 1.6);
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

  scene.add(
    sun,
    sun.target,
    hemi,
    ambient,
    fill,
    fill.target,
    craterFill,
    textRim,
    textFill,
    textFill.target,
    textBoost,
  );
  return { sun, hemi, ambient, fill, craterFill, textRim, textFill, textBoost };
}
