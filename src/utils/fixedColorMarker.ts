import * as THREE from "three";

/**
 * POST-PROCESS "SABİT RENK" MASKESİ
 * ---------------------------------
 * Belirli materyallerin (figür, "MÜKEMMEL BOŞLUK", "REDD" yazıları)
 * parlaklık ve kontrast slider'larından etkilenmemesini istiyoruz.
 *
 * Çözüm:
 *  1. Materyal render edilirken fragment shader'da `gl_FragColor.a = 0.25`
 *     olarak alpha kanalı özel bir "marker" değerine yazılır. `transparent`
 *     false olduğu için blending çalışmaz → sadece framebuffer alpha
 *     kanalına 0.25 yazılır, RGB dokunulmaz.
 *  2. `postprocess.ts` içindeki grading shader, alpha < 0.5 olan pikselleri
 *     görünce exposure/lift/contrast/saturation/vignette/grain aşamalarını
 *     tamamen atlar ve pikseli aynen geçirir. Final alpha = 1.0.
 *  3. `renderer.toneMappingExposure` sabit 1.0'a kilitlenir. Parlaklık
 *     slider'ı yerine `uExposure` uniform'unu hareket ettirir. Bu sayede
 *     material-level tonemap aşamasında da marker'lı piksellere exposure
 *     uygulanmaz (çünkü bu materyallerde `toneMapped = false` set edildiği
 *     için tonemap chunk'ı zaten no-op'tur).
 *
 * Kullanım:
 *   applyFixedColorMarker(material);   // her materyale bir kere uygula
 */
export const FIXED_COLOR_ALPHA_MARKER = 0.25;

export function applyFixedColorMarker(material: THREE.Material): void {
  /** Materyal kendi içinde tonemap + exposure uygulamasın. */
  material.toneMapped = false;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    /**
     * `<dithering_fragment>` standart MeshStandardMaterial zincirinde en
     * son çalışan chunk'tır; ondan SONRA alpha'yı ezmek, `<output_fragment>`
     * içindeki `OPAQUE` tanımının `diffuseColor.a = 1.0` atamasını da
     * güvenle geçersiz kılar. RGB'ye dokunmuyoruz.
     */
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
       gl_FragColor.a = ${FIXED_COLOR_ALPHA_MARKER.toFixed(3)};`,
    );
  };
  material.needsUpdate = true;
}
