import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * POST-PROCESS COLOR GRADING
 * --------------------------
 * Amaç: Three.js çıktısını "demo" hissinden alıp "foto-gerçek" tarafa
 * çekmek. Kullanılan geçişler:
 *
 *  1) RenderPass → sahneyi offscreen target'a alır.
 *  2) GradingPass → kompakt bir shader içinde:
 *        - cool shift (mavi/gri kayma)
 *        - gentle contrast lift (siyahlar derin ama detaylı)
 *        - saturation kontrolü (düşük ama kontrollü)
 *        - vignette (kenarları hafif karart → dikkat merkeze)
 *        - hafif film grain (çok düşük, "renkli kar" değil)
 *  3) OutputPass → tone-mapped renderer çıktısını sRGB'ye dönüştürür.
 *
 * PERFORMANS:
 *  - Tek bir fragment pass. DPR 1.85 üstü için ekstra maliyet küçük.
 *  - Grain lookup texture veya noise yok — sadece hash-based noise.
 */
export interface PostProcessHandle {
  composer: EffectComposer;
  resize(width: number, height: number): void;
  /** Her frame çağırılır — grain animasyonu için zaman uniform'u tazelenir. */
  tick(time: number): void;
  grading: {
    exposure: { value: number };
    coolShift: { value: number };
    contrast: { value: number };
    saturation: { value: number };
    vignetteStrength: { value: number };
    vignetteSoftness: { value: number };
    grainStrength: { value: number };
    lift: { value: number };
  };
  dispose(): void;
}

const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    /**
     * uExposure: Parlaklık slider'ının gerçek değeri. Daha önce
     * `renderer.toneMappingExposure`'u sürüyordu; artık renderer'ın
     * exposure'ı sabit 1.0, slider bu uniform'u değiştiriyor. Bu sayede
     * aşağıdaki `skipGrading` kontrolüyle birlikte figür + yazılar
     * parlaklıktan etkilenmiyor — yalnızca serbest sahne pikselleri
     * exposure ile ölçekleniyor.
     */
    uExposure: { value: 1.0 },
    /**
     * Referans: albüm kapak fotoğrafı — saf siyah/beyaz/gri + sadece
     * "REDD" yazısında canlı kırmızı. Grading bu monokrom hedefe kilitlendi.
     *
     * YUMUŞAK FOTO-GERÇEK KALİBRASYON (göz yormasın):
     *  - Contrast çok hafif (1.02) — "S-curve" crush yok, yumuşak geçiş
     *  - Lift belirgin (0.035) — siyahlar derin ama DETAY var, katı değil
     *  - Vignette çok hafif (0.14) — estetik bir kenar düşüşü, "tünel" yok
     *  - Satürasyon düşük ama kontrollü (0.18) — monokrom ama ölü değil
     *  - `redMask` ile REDD yazısı kırmızı kalır
     */
    uCoolShift: { value: 0.0 },
    uContrast: { value: 1.01 },
    uSaturation: { value: 0.18 },
    uVignetteStrength: { value: 0.14 },
    uVignetteSoftness: { value: 1.05 },
    uGrainStrength: { value: 0.01 },
    /**
     * Lift'i düşürüyoruz: siyah yazı (MÜKEMMEL BOŞLUK) ve figür silüeti
     * gri görünmesin. Sahne zaten hemi + ambient ile taban aydınlanmasını
     * aldığı için aşırı lift detayı değil yalnızca kontrastı öldürüyordu.
     */
    uLift: { value: 0.014 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uExposure;
    uniform float uCoolShift;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignetteStrength;
    uniform float uVignetteSoftness;
    uniform float uGrainStrength;
    uniform float uLift;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;

      /**
       * ---- SABİT RENK MASKESİ ----
       * Figür ve "MÜKEMMEL BOŞLUK" / "REDD" yazıları alpha=0.25 marker'ı
       * ile render edilir. Bu pikseller NE exposure, NE grading, NE
       * vignette, NE grain'den etkilenir — fotoğraftaki gibi tamamen
       * sabit siyah + koyu kırmızı kalırlar. Alpha 1.0 ile yazılarak
       * OutputPass doğru sRGB dönüşümünü yapar.
       */
      if (c.a < 0.5) {
        gl_FragColor = vec4(col, 1.0);
        return;
      }

      /** --- Exposure (yalnızca serbest sahne pikselleri) --- */
      col *= uExposure;

      /** --- Lift (blacks): siyahları çok hafif kaldır, "crush" olmasın. --- */
      col = col + vec3(uLift);

      /** --- Opsiyonel cool/warm kayma (varsayılan 0 — referans foto monokrom). */
      col.b += uCoolShift * 0.8;
      col.r -= uCoolShift * 0.35;

      /** --- Kontrast (S-curve basit) --- */
      col = (col - 0.5) * uContrast + 0.5;

      /**
       * --- MONOKROM + KIRMIZI KORUMA ---
       * Sahneyi neredeyse siyah-beyaza çekeriz (saturation ≈ 0.14) ama
       * "kırmızı dominant" pikseller (REDD yazısı, güneş halkasının
       * sıcak kalıntısı) korunur:
       *
       *   redDominance = max(0, R - max(G, B))
       *
       * Bu değer yeşil ve mavi kanala göre kırmızının ne kadar baskın
       * olduğunu söyler; gri tonlar (R≈G≈B) için 0, kırmızı için ~R büyür.
       * redDominance > 0 olan bölgelerde satürasyon tamamen KORUNUR,
       * diğer her yer monokroma kayar.
       */
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float redDom = max(col.r - max(col.g, col.b), 0.0);
      /**
       * Eşiği düşürdük (0.06/0.22 → 0.02/0.12): böylece KOYU kırmızı da
       * (REDD yazısı gibi kısmen gölgede kalan alanlar) renginde kalır,
       * gri tonlara düşmez.
       */
      float redMask = smoothstep(0.02, 0.12, redDom);
      float satMix = mix(uSaturation, 1.0, redMask);
      col = mix(vec3(luma), col, satMix);

      /** --- Vignette: radial darken, kenarları yumuşak --- */
      vec2 centered = vUv - 0.5;
      float r = length(centered * vec2(1.05, 1.0));
      float vig = 1.0 - smoothstep(uVignetteSoftness * 0.35,
                                   uVignetteSoftness * 0.9,
                                   r) * uVignetteStrength;
      col *= vig;

      /** --- Hafif film grain --- */
      float g = hash12(vUv * vec2(1920.0, 1080.0) + uTime * 60.0) - 0.5;
      col += g * uGrainStrength;

      gl_FragColor = vec4(clamp(col, 0.0, 10.0), 1.0);
    }
  `,
};

export function createPostProcess(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostProcessHandle {
  const pr = renderer.getPixelRatio();
  const size = new THREE.Vector2();
  renderer.getSize(size);

  const target = new THREE.WebGLRenderTarget(
    Math.floor(size.x * pr),
    Math.floor(size.y * pr),
    {
      type: THREE.HalfFloatType,
      samples: 0,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.LinearSRGBColorSpace,
    },
  );
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pr);
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const gradingPass = new ShaderPass(ColorGradingShader);
  composer.addPass(gradingPass);

  /**
   * OutputPass tone mapping + sRGB çıktı dönüşümünü yapar. Renderer
   * `ACESFilmicToneMapping` ayarlıdır; OutputPass bu ayarı kullanır.
   */
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    grading: {
      exposure: gradingPass.uniforms.uExposure,
      coolShift: gradingPass.uniforms.uCoolShift,
      contrast: gradingPass.uniforms.uContrast,
      saturation: gradingPass.uniforms.uSaturation,
      vignetteStrength: gradingPass.uniforms.uVignetteStrength,
      vignetteSoftness: gradingPass.uniforms.uVignetteSoftness,
      grainStrength: gradingPass.uniforms.uGrainStrength,
      lift: gradingPass.uniforms.uLift,
    },
    resize(width, height) {
      composer.setSize(width, height);
    },
    tick(time) {
      gradingPass.uniforms.uTime.value = time;
    },
    dispose() {
      target.dispose();
      composer.dispose();
    },
  };
}
