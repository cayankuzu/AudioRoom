import * as THREE from "three";
import { WORLD } from "../config/config";
import { smoothstep } from "../utils/helpers";
import { createGroundSurfaceMaps } from "./terrainTextures";

export interface TerrainHandle {
  mesh: THREE.Mesh;
  getHeightAt(x: number, z: number): number;
}

function hash(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x: number, z: number, octaves: number): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** Ana büyük ölçekli yükseklik (dalgalı, ölü çöl). */
export function heightAt(x: number, z: number): number {
  const cx = WORLD.craterCenter.x;
  const cz = WORLD.craterCenter.z;
  const dist = Math.hypot(x - cx, z - cz);

  const baseHills = fbm(x * 0.018, z * 0.018, 4) * 6.2 - 2.4;
  const midDetail = fbm(x * 0.06, z * 0.06, 4) * 1.35;
  const microDetail = fbm(x * 0.12, z * 0.12, 3) * 0.58;

  const hillLobes =
    Math.exp(-((x - 42) ** 2 + (z - 30) ** 2) / 380) * 7.5 +
    Math.exp(-((x + 50) ** 2 + (z + 40) ** 2) / 460) * 8.2 +
    Math.exp(-((x - 62) ** 2 + (z + 55) ** 2) / 520) * 6.8 +
    Math.exp(-((x + 22) ** 2 + (z + 70) ** 2) / 420) * 5.9 +
    Math.exp(-((x - 12) ** 2 + (z - 72) ** 2) / 520) * 6.4;

  const distantRidge =
    Math.exp(-((z - 96) ** 2) / 280) * 7.4 +
    Math.exp(-((z + 98) ** 2) / 320) * 5.9;

  /**
   * Daha yayvan çanak: tabanı yassılaştırılmış, kenara doğru yumuşak
   * yükselen bir form. Tam siyah delik değil, sakin/ağır bir çanak.
   */
  const craterFactor = 1 - smoothstep(0, WORLD.craterRadius, dist);
  const craterShaped = Math.pow(craterFactor, 1 + WORLD.craterShape); // 0..1
  const craterFloor = -WORLD.craterDepth * craterShaped;

  const rimGauss = Math.exp(
    -((dist - WORLD.craterRimRadius) ** 2) / (WORLD.craterRimRadius * 1.1),
  );
  const craterRim = 1.7 * rimGauss;

  const dunes =
    Math.sin(x * 0.085 + fbm(x * 0.02, z * 0.02, 3) * 4) * 0.35 +
    Math.cos(z * 0.072 + fbm(x * 0.018, z * 0.018, 3) * 4) * 0.32;

  const ripple = (Math.sin(x * 0.55) + Math.cos(z * 0.6)) * 0.08;

  const boundaryRise =
    smoothstep(WORLD.boundary * 0.9, WORLD.boundary * 1.05, dist) * 22;

  return (
    baseHills +
    midDetail +
    microDetail +
    hillLobes +
    distantRidge +
    craterFloor +
    craterRim +
    dunes +
    ripple +
    boundaryRise
  );
}

/**
 * RENDERED yüzeye birebir eşit yükseklik. Hem mesh oluştururken hem de
 * objeleri zemine oturturken TEK bu fonksiyon kullanılmalı — aksi halde
 * objeler toprağa gömülü görünür (smooth heightAt ile geometri arasındaki
 * mikro gürültü farkı nedeniyle).
 */
export function sampleSurface(x: number, z: number): number {
  const base = heightAt(x, z);
  const micro =
    fbm(x * 0.45, z * 0.45, 5) * 0.34 +
    fbm(x * 1.25, z * 1.22, 4) * 0.11 +
    fbm(x * 3.25, z * 3.1, 3) * 0.035;
  return base + micro;
}

export function createTerrain(): TerrainHandle {
  const geometry = new THREE.PlaneGeometry(
    WORLD.size,
    WORLD.size,
    WORLD.segments,
    WORLD.segments,
  );
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  /**
   * Volkanik kum — antrasit → kömür → füme geçişi; her yer kapkara değil.
   * Tonlar biraz yukarı çekildi ki post-grading contrast 1.02 + lift 0.035
   * ile birlikte yüzey okunabilir kalsın. Hâlâ "koyu volkanik siyah" ama
   * crush değil.
   */
  const colDune = new THREE.Color("#26272b");
  const colFlat = new THREE.Color("#1d1e22");
  const colDeep = new THREE.Color("#242830");
  const colRim = new THREE.Color("#2f3036");

  const {
    colorMap,
    roughnessMap,
    normalMap,
    detailNormalMap,
    macroVariationMap,
  } = createGroundSurfaceMaps(1024);

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = sampleSurface(x, z);
    pos.setY(i, y);

    const dist = Math.hypot(x, z);
    const bowl = 1 - smoothstep(0, WORLD.craterRimRadius, dist);
    const patch = fbm(x * 0.05, z * 0.05, 3);
    let c = colFlat.clone().lerp(colDune, patch);
    c.lerp(colDeep, bowl * 0.55);
    const rimRead = Math.exp(-((dist - WORLD.craterRimRadius) ** 2) / 120);
    c.lerp(colRim, rimRead * 0.35);

    /** Çok küçük parıltı — sert kuru yüzeyde bir-iki mikro taş gibi. */
    const glint = fbm(x * 2.2, z * 2.2, 2);
    if (glint > 0.93) c.multiplyScalar(1.25);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    color: "#ffffff",
    map: colorMap,
    roughness: 1,
    metalness: 0.02,
    roughnessMap,
    normalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    /**
     * Kum tanelerinin grazing angle'da yakaladığı hafif ışığı temsil eden
     * bir taban emissive — shader içinde view-angle'a göre modüle edilir.
     */
    emissive: new THREE.Color("#2a2216"),
    emissiveIntensity: 0.0,
  });

  /**
   * Macro + mid + micro kum hissi için shader'a ek iki sample eklenir:
   *  - `uDetailNormal`: çok yüksek frekanslı micro normal → yakın plan granül
   *  - `uMacroVariation`: düşük frekanslı renk/roughness varyasyonu →
   *     tile'ın robotik tekrarını kırar
   *
   * Kamera pozisyonuna göre foreground-boost uygulanır (yakın yerlerde
   * detay daha güçlü). `uCameraY` uniform'u animate loop'ta güncellenir.
   */
  type ExtendedUniforms = {
    uDetailNormal: { value: THREE.Texture };
    uDetailRepeat: { value: number };
    uDetailStrength: { value: number };
    uMacroVariation: { value: THREE.Texture };
    uMacroRepeat: { value: number };
    uMacroStrength: { value: number };
    uSparkleTint: { value: THREE.Color };
    uSparkleStrength: { value: number };
    uSunDirWorld: { value: THREE.Vector3 };
  };
  const extendedUniforms: ExtendedUniforms = {
    uDetailNormal: { value: detailNormalMap },
    uDetailRepeat: { value: 240.0 },
    uDetailStrength: { value: 0.62 },
    uMacroVariation: { value: macroVariationMap },
    uMacroRepeat: { value: 1.4 },
    uMacroStrength: { value: 0.26 },
    /**
     * Grazing kum parıltısı — monokrom referansa uygun NÖTR açık gri/beyaz.
     * Güç düşürüldü (0.22) ki parıltı "renkli vurgu" yapmasın, sadece
     * fiziksel bir mikro highlight olarak hissedilsin.
     */
    uSparkleTint: { value: new THREE.Color("#eeeeee") },
    uSparkleStrength: { value: 0.22 },
    /** Güneşten geliyormuş gibi bir yön (lights.ts ile uyumlu). */
    uSunDirWorld: { value: new THREE.Vector3(-45, 52, -72).normalize() },
  };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDetailNormal = extendedUniforms.uDetailNormal;
    shader.uniforms.uDetailRepeat = extendedUniforms.uDetailRepeat;
    shader.uniforms.uDetailStrength = extendedUniforms.uDetailStrength;
    shader.uniforms.uMacroVariation = extendedUniforms.uMacroVariation;
    shader.uniforms.uMacroRepeat = extendedUniforms.uMacroRepeat;
    shader.uniforms.uMacroStrength = extendedUniforms.uMacroStrength;
    shader.uniforms.uSparkleTint = extendedUniforms.uSparkleTint;
    shader.uniforms.uSparkleStrength = extendedUniforms.uSparkleStrength;
    shader.uniforms.uSunDirWorld = extendedUniforms.uSunDirWorld;

    /** Grazing-angle sparkle için view-space vektörleri gerekir; vViewPosition
     *  zaten MeshStandardMaterial tarafından sağlanır. World normal hesabı için
     *  vertex shader'a küçük bir çıkış ekliyoruz (zaten mevcut vNormal'i
     *  kullanabiliriz — view-space). */

    /**
     * Three.js r152+ her map için ayrı UV varying kullanıyor:
     *   vMapUv, vNormalMapUv, vRoughnessMapUv...
     * `vUv` varsayılan olarak tanımlı DEĞİL (USE_UV / USE_ANISOTROPY yoksa).
     * Tüm map'lerimiz aynı UV setini (attribute `uv`) kullandığı için
     * güvenle `vMapUv` üzerinden sample yapabiliriz.
     */
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
          uniform sampler2D uDetailNormal;
          uniform float uDetailRepeat;
          uniform float uDetailStrength;
          uniform sampler2D uMacroVariation;
          uniform float uMacroRepeat;
          uniform float uMacroStrength;
          uniform vec3 uSparkleTint;
          uniform float uSparkleStrength;
          uniform vec3 uSunDirWorld;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
          #ifdef USE_NORMALMAP_TANGENTSPACE
            vec3 microN = texture2D(uDetailNormal, vNormalMapUv * uDetailRepeat).xyz * 2.0 - 1.0;
            float viewDist = length(vViewPosition);
            float nearBoost = 1.0 - smoothstep(3.0, 60.0, viewDist);
            normal = normalize(normal + microN * uDetailStrength * nearBoost);
          #endif`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
          #ifdef USE_MAP
            float macroVar = texture2D(uMacroVariation, vMapUv * uMacroRepeat).r;
            float macroMix = (macroVar - 0.5) * 2.0 * uMacroStrength;
            diffuseColor.rgb *= (1.0 + macroMix);
            /**
             * Kanalları dengele → NÖTR gri siyah kum hissi (renk kayması
             * yok). Üç kanalı ortalamaya çek: mavi/sıcak shift uygulanmaz.
             */
            float greyAvg = dot(diffuseColor.rgb, vec3(0.333));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(greyAvg), 0.35);
          #endif`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
          #ifdef USE_ROUGHNESSMAP
            float macroVarR = texture2D(uMacroVariation, vRoughnessMapUv * uMacroRepeat).r;
            /** Daha geniş bir roughness aralığı — ışık bölgeleri belirgin olsun. */
            roughnessFactor = clamp(roughnessFactor + (macroVarR - 0.5) * 0.32, 0.28, 1.0);
          #endif`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
          /**
           * --- Grazing angle sand sparkle ---
           * Kumun yatay ışıkta (sabah/akşam) yakaladığı mikro parıltıyı
           * taklit eder. Yalnızca:
           *   (a) view vektörü yüzeye teğet ise (grazing),
           *   (b) ışık ters yönden (arka/yan) geliyorsa,
           *   (c) detail normal haritasının "parlak" bir taneciği ise
           * aktif olur. Böylece sahne geneline spam parıltı bulaşmaz.
           */
          {
            vec3 V = normalize(vViewPosition);
            float graze = 1.0 - clamp(dot(normalize(normal), V), 0.0, 1.0);
            float sparkleMask = texture2D(uDetailNormal, vNormalMapUv * uDetailRepeat * 0.85).z;
            sparkleMask = smoothstep(0.45, 0.95, sparkleMask);
            float viewDist = length(vViewPosition);
            float nearCut = 1.0 - smoothstep(0.5, 32.0, viewDist);
            /** Güneş yönüne bakan teğetlerde daha güçlü — backlight uyumu. */
            float sunKick = clamp(1.0 - dot(normalize(normal), normalize(uSunDirWorld)), 0.0, 1.0);
            float sparkle = pow(graze, 5.5) * sparkleMask * nearCut * sunKick;
            reflectedLight.directDiffuse += uSparkleTint * (sparkle * uSparkleStrength);
          }
        `,
      );
  };
  material.needsUpdate = true;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  return {
    mesh,
    /**
     * Objeleri ve oyuncuyu yerleştirmek için RENDERED yüzey.
     * getHeightAt'i doğrudan `sampleSurface`'e bağlıyoruz — her ikisi
     * de aynı noktada aynı değeri üretmeli.
     */
    getHeightAt: sampleSurface,
  };
}
