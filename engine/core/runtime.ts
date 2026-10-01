import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { lowerTier, QUALITY_PROFILES, resolveProfile, type QualityMode, type QualityProfile } from "./quality";

/**
 * Son görüntü ayarı (sRGB uzayında): parlaklık, kontrast, doygunluk, ton, vinyet, grain, kararma.
 * Üstünde klibin kendi renk katmanı durur (`uClip*`): sinema kamerası her çekime ayrı renk,
 * geçiş (kararma, beyaz flaş, parazit) ve "lens" (böcek gözü, eski film, mikroskop, eski TV)
 * uygular. Dünyanın kendi ayarlarından bağımsızdır; `uClip` 0 iken hiçbir etkisi yoktur.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uExposure: { value: 1 },
    uContrast: { value: 1 },
    uSaturation: { value: 1 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.03 },
    uTime: { value: 0 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uClip: { value: 0 },
    uClipExposure: { value: 1 },
    uClipContrast: { value: 1 },
    uClipSaturation: { value: 1 },
    uClipTint: { value: new THREE.Color(1, 1, 1) },
    uClipLift: { value: new THREE.Color(0, 0, 0) },
    uClipVignette: { value: 0 },
    uClipAberration: { value: 0 },
    uClipGlitch: { value: 0 },
    uClipSoft: { value: 0 },
    uClipLens: { value: 0 },
    uClipLensAmount: { value: 0 },
    uClipFlash: { value: 0 },
    uClipFlashColor: { value: new THREE.Color(1, 1, 1) },
    /** Klipte karanlık karelerin gölgelerini açan gama (1 = etkisiz; ışık ölçerle ayarlanır). */
    uClipGamma: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uExposure, uContrast, uSaturation, uVignette, uGrain, uTime, uFade;
    uniform vec3 uTint, uFadeColor;
    uniform vec2 uResolution;
    uniform float uClip, uClipExposure, uClipContrast, uClipSaturation, uClipVignette, uClipAberration, uClipGlitch, uClipSoft, uClipLens, uClipLensAmount, uClipFlash, uClipGamma;
    uniform vec3 uClipTint, uClipLift, uClipFlashColor;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    // Altıgen ızgara: böcek gözü (her petek kendi merkezini görür).
    vec4 hexCell(vec2 p) {
      vec2 r = vec2(1.0, 1.7320508);
      vec2 h = r * 0.5;
      vec2 a = mod(p, r) - h;
      vec2 b = mod(p - h, r) - h;
      vec2 gv = dot(a, a) < dot(b, b) ? a : b;
      return vec4(gv, p - gv);
    }

    vec3 sampleScene(vec2 uv) {
      float ab = uClipAberration * uClip;
      vec3 c;
      if (ab <= 0.0) {
        c = texture2D(tDiffuse, uv).rgb;
      } else {
        vec2 dir = (uv - 0.5) * ab;
        c = vec3(texture2D(tDiffuse, uv + dir).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir).b);
      }
      // Lens yumuşaklığı: merkez keskin, kenarlar hafif bulanık (sinema objektifi gibi).
      float soft = uClipSoft * uClip * smoothstep(0.18, 0.72, length((uv - 0.5) * vec2(1.3, 1.0)));
      if (soft > 0.001) {
        vec2 px = soft * 6.0 / uResolution;
        vec3 acc = c;
        acc += texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb;
        acc += texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb;
        acc += texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb;
        acc += texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb;
        acc += texture2D(tDiffuse, uv + px * 0.7).rgb;
        acc += texture2D(tDiffuse, uv - px * 0.7).rgb;
        c = acc / 7.0;
      }
      return c;
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uResolution.x / max(1.0, uResolution.y);
      float lens = uClip * uClipLensAmount;
      int mode = int(uClipLens + 0.5);

      // Parazit: yatay şeritler kayar.
      float glitch = uClipGlitch * uClip;
      if (glitch > 0.0) {
        float band = floor(uv.y * 38.0 + floor(uTime * 24.0) * 3.0);
        float shift = (hash(vec2(band, floor(uTime * 24.0))) - 0.5) * step(0.72, hash(vec2(band * 1.7, floor(uTime * 12.0))));
        uv.x += shift * 0.08 * glitch;
      }
      // Eski TV: hafif fıçı eğriliği.
      if (mode == 4 && lens > 0.0) {
        vec2 c = uv - 0.5;
        uv = 0.5 + c * (1.0 + dot(c, c) * 0.35 * lens);
      }
      // Yırtık fotoğraf (lens = ilerleme 0..1): kare tepeden aşağı ortadan yırtılır, iki yarı ayrılır, sonra birleşir.
      float tearGap = 0.0;
      float tearFringe = 0.0;
      float tearShade = 0.0;
      if (mode == 5 && lens > 0.0) {
        float travel = smoothstep(0.0, 0.42, lens) * 1.04;
        float gap = smoothstep(0.42, 0.66, lens) * (1.0 - smoothstep(0.84, 1.0, lens)) * 0.05;
        float wob = (hash(vec2(floor(uv.y * 140.0), 3.0)) - 0.5) * 0.006 + sin(uv.y * 29.0) * 0.0025 + sin(uv.y * 6.5) * 0.005;
        float edgeX = 0.5 + wob;
        float inTear = step(1.0 - travel, uv.y);
        float leftSide = step(uv.x, edgeX);
        uv.x += mix(-gap, gap, leftSide) * inTear;
        float crossed = inTear * abs(leftSide - step(uv.x, edgeX));
        float dist = abs(uv.x - edgeX) * aspect;
        tearGap = crossed;
        tearFringe = inTear * (1.0 - smoothstep(0.0, 0.004, dist)) * (1.0 - crossed);
        tearShade = inTear * (1.0 - smoothstep(0.0, 0.03, dist)) * (1.0 - crossed) * 0.35;
      }
      vec3 c;
      if (mode == 1 && lens > 0.0) {
        vec2 p = vec2(uv.x * aspect, uv.y) * 34.0;
        vec4 cell = hexCell(p);
        vec2 center = vec2(cell.z / aspect, cell.w) / 34.0;
        vec3 facet = sampleScene(mix(uv, center + (uv - center) * 0.35, 0.85));
        float edge = smoothstep(0.42, 0.5, length(cell.xy));
        c = mix(sampleScene(uv), facet * (1.0 - edge * 0.85) * (0.85 + 0.3 * (0.5 - length(cell.xy))), lens);
      } else {
        c = sampleScene(uv);
      }

      c *= uExposure;
      c = (c - 0.5) * uContrast + 0.5;
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, uSaturation) * uTint;

      // Klibin renk katmanı.
      if (uClip > 0.0) {
        // Göz uyumu: karanlık karede gölgeler ve orta tonlar açılır, parlak yerler patlamaz.
        vec3 g = pow(max(c, vec3(0.0)), vec3(1.0 / max(uClipGamma, 0.5))) * uClipExposure;
        g = (g - 0.5) * uClipContrast + 0.5;
        float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
        g = mix(vec3(l), g, uClipSaturation) * uClipTint;
        g += uClipLift * (1.0 - clamp(l, 0.0, 1.0));
        c = mix(c, g, uClip);
      }

      // Lensler.
      if (mode == 2 && lens > 0.0) {
        // Eski film: sepya, titreşen ışık, dikey çizikler, toz.
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        vec3 sepia = vec3(l * 1.07, l * 0.92, l * 0.72);
        float flick = 0.92 + 0.08 * hash(vec2(floor(uTime * 18.0), 1.0));
        float scratch = step(0.9965, hash(vec2(floor(uv.x * 420.0), floor(uTime * 9.0)))) * 0.35;
        float dust = step(0.9993, hash(floor(uv * uResolution * 0.5) + floor(uTime * 12.0))) * 0.6;
        c = mix(c, sepia * flick + scratch - dust, lens);
      } else if (mode == 3 && lens > 0.0) {
        // Mikroskop: yuvarlak göz merceği, soğuk ışık, kenarda koyu halka.
        vec2 d = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
        float r = length(d);
        float disc = smoothstep(0.47, 0.44, r);
        vec3 cool = c * vec3(0.8, 1.02, 1.12) + vec3(0.0, 0.02, 0.04);
        c = mix(c, cool * disc, lens);
      } else if (mode == 4 && lens > 0.0) {
        // Eski TV: tarama çizgileri, RGB maske, kenar kararması.
        float scan = 0.82 + 0.18 * sin(uv.y * uResolution.y * 1.6);
        float mask = 0.9 + 0.1 * sin(uv.x * uResolution.x * 2.1);
        vec2 e = abs(uv - 0.5) * 2.0;
        float edge = smoothstep(1.0, 0.92, max(e.x, e.y));
        c = mix(c, c * scan * mask * edge * vec3(1.02, 1.0, 0.96), lens);
      }
      if (glitch > 0.0) c += (hash(uv * 400.0 + uTime) - 0.5) * 0.2 * glitch;
      if (mode == 5 && lens > 0.0) {
        c *= 1.0 - tearShade;
        c = mix(c, vec3(0.05, 0.045, 0.04), tearGap);
        c = mix(c, vec3(0.92, 0.88, 0.8) * (0.75 + 0.25 * hash(vUv * 900.0)), tearFringe * 0.9);
      }

      vec2 d = vUv - 0.5;
      float vig = uVignette + uClipVignette * uClip;
      c *= 1.0 - vig * smoothstep(0.25, 0.85, length(d) * 1.35);
      c += (hash(vUv * 1024.0 + uTime) - 0.5) * uGrain;
      c = mix(c, uFadeColor, uFade);
      c = mix(c, uClipFlashColor, clamp(uClipFlash * uClip, 0.0, 1.0));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};

export type GradeUniforms = typeof GradeShader.uniforms;

export interface Runtime {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly grade: GradeUniforms;
  readonly bloom: UnrealBloomPass | null;
  readonly profile: QualityProfile;
  paused: boolean;
  onUpdate(fn: (dt: number, time: number) => void): void;
  onQualityChange(fn: (profile: QualityProfile) => void): void;
  setQuality(mode: QualityMode): void;
  /** Evrenin bloom ayarı; kalite değişip efekt zinciri yeniden kurulduğunda korunur. strength 0 kapatır. */
  setBloom(strength: number, threshold?: number, radius?: number): void;
  /** Klip ışık ölçeri: açıkken birkaç karede bir görüntünün ortalama parlaklığı (0..1) ölçülür. */
  meter(on: boolean): void;
  /** Son ölçülen ortalama parlaklık (renk katmanından önce, ekran uzayında). */
  luminance(): number;
  /** Ortam yansıması (metal/cam malzemeler için), 0 kapatır. */
  useRoomEnvironment(intensity: number): void;
  fps(): number;
  /**
   * Görünür tüm malzemelerin shader'larını, sahnenin gerçekten çizildiği ara
   * tampona göre (ton eşleme/renk uzayı aynı) önceden derler: ilk gösterimde takılma olmaz.
   */
  precompile(): Promise<void>;
  capture(): string;
  start(): void;
  dispose(): void;
}

export function createRuntime(
  container: HTMLElement,
  qualityMode: QualityMode,
  onContextLost: () => void,
): Runtime {
  let profile = resolveProfile(qualityMode);
  let mode = qualityMode;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = "ar-canvas";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.08, 1200);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  const gradePass = new ShaderPass(GradeShader);
  const grade = gradePass.uniforms as GradeUniforms;

  let pixelRatio = Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio);
  const bloomSettings = { strength: 0.35, threshold: 0.85, radius: 0.6 };
  const size = new THREE.Vector2(1, 1);

  const buildComposer = () => {
    composer?.dispose();
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: profile.msaa,
    });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    bloom = profile.bloom && bloomSettings.strength > 0
      ? new UnrealBloomPass(new THREE.Vector2(256, 256), bloomSettings.strength, bloomSettings.radius, bloomSettings.threshold)
      : null;
    if (bloom) composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.addPass(gradePass);
    applySize();
  };

  const applySize = () => {
    if (!composer) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    size.set(width, height);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    grade.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  };

  const maxRatio = () => Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio);

  /** keepRatio: otomatik kademe düşüşünde çözünürlük yeniden yükselmesin. */
  const applyProfile = (keepRatio = false) => {
    renderer.shadowMap.enabled = profile.shadows;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    pixelRatio = keepRatio ? THREE.MathUtils.clamp(pixelRatio, profile.minPixelRatio, maxRatio()) : maxRatio();
    buildComposer();
    qualityListeners.forEach((fn) => fn(profile));
  };

  const qualityListeners = new Set<(profile: QualityProfile) => void>();
  const updaters: Array<(dt: number, time: number) => void> = [];
  const resizeObserver = new ResizeObserver(() => applySize());
  resizeObserver.observe(container);

  // FPS ölçümü ve otomatik modda dinamik çözünürlük.
  let fps = 60;
  let frames = 0;
  let windowTime = 0;
  let slowSeconds = 0;
  let fastSeconds = 0;
  const adaptResolution = (dt: number) => {
    frames += 1;
    windowTime += dt;
    if (windowTime < 1) return;
    fps = frames / windowTime;
    frames = 0;
    windowTime = 0;
    if (mode !== "auto") return;
    slowSeconds = fps < 50 ? slowSeconds + 1 : 0;
    fastSeconds = fps > 58 ? fastSeconds + 1 : 0;
    if (slowSeconds >= 2 && pixelRatio > profile.minPixelRatio) {
      pixelRatio = Math.max(profile.minPixelRatio, pixelRatio - 0.1);
      slowSeconds = 0;
      applySize();
    } else if (slowSeconds >= 3 && profile.tier !== "low") {
      // Çözünürlük tabanına inildi ve hâlâ yavaşsa bir alt kaliteye geç.
      profile = QUALITY_PROFILES[lowerTier(profile.tier)];
      slowSeconds = 0;
      applyProfile(true);
    } else if (fastSeconds >= 6 && pixelRatio < maxRatio()) {
      pixelRatio = Math.min(maxRatio(), pixelRatio + 0.1);
      fastSeconds = 0;
      applySize();
    }
  };

  // Işık ölçer: renk katmanına giren görüntü 16×9'a küçültülüp okunur (her 6 karede bir, ucuz).
  const meterState = { on: false, value: 0.3, pending: false };
  const meterTarget = new THREE.WebGLRenderTarget(16, 9);
  const meterCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const meterMaterial = new THREE.ShaderMaterial({
    uniforms: { tSource: { value: null as THREE.Texture | null } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform sampler2D tSource; varying vec2 vUv;
      void main() {
        vec3 acc = vec3(0.0);
        for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) acc += texture2D(tSource, vUv + (vec2(float(i), float(j)) - 1.5) / vec2(64.0, 36.0)).rgb;
        gl_FragColor = vec4(clamp(acc / 16.0, 0.0, 1.0), 1.0);
      }`,
  });
  const meterScene = new THREE.Scene();
  meterScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), meterMaterial));
  const meterPixels = new Uint8Array(16 * 9 * 4);
  const measure = () => {
    const source = grade.tDiffuse.value;
    if (!source) return;
    meterMaterial.uniforms.tSource.value = source;
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(meterTarget);
    renderer.render(meterScene, meterCamera);
    renderer.setRenderTarget(previous);
    // Eşzamansız okuma: GPU'yu bekletmez (senkron okuma entegre ekran kartında kareyi takıyordu).
    meterState.pending = true;
    renderer
      .readRenderTargetPixelsAsync(meterTarget, 0, 0, 16, 9, meterPixels)
      .then(() => {
        let sum = 0;
        for (let i = 0; i < meterPixels.length; i += 4) sum += meterPixels[i] * 0.2126 + meterPixels[i + 1] * 0.7152 + meterPixels[i + 2] * 0.0722;
        meterState.value = sum / (255 * 16 * 9);
      })
      .catch(() => undefined)
      .finally(() => (meterState.pending = false));
  };

  let last = 0;
  let elapsed = 0;
  let frameCount = 0;
  const frame = (now: number) => {
    frameCount += 1;
    if (profile.shadows && profile.shadowInterval > 0 && frameCount % profile.shadowInterval === 0) {
      renderer.shadowMap.needsUpdate = true;
    }
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    if (!runtime.paused) {
      elapsed += dt;
      for (const update of updaters) update(dt, elapsed);
    }
    grade.uTime.value = elapsed;
    adaptResolution(dt);
    composer?.render(dt);
    if (meterState.on && !meterState.pending && frameCount % 10 === 0) measure();
  };

  const onLost = (event: Event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    onContextLost();
  };
  renderer.domElement.addEventListener("webglcontextlost", onLost);

  let pmrem: THREE.PMREMGenerator | null = null;

  const runtime: Runtime = {
    renderer,
    scene,
    camera,
    grade,
    get bloom() {
      return bloom;
    },
    get profile() {
      return profile;
    },
    paused: false,
    onUpdate(fn) {
      updaters.push(fn);
    },
    onQualityChange(fn) {
      qualityListeners.add(fn);
      fn(profile);
    },
    setBloom(strength, threshold = bloomSettings.threshold, radius = bloomSettings.radius) {
      Object.assign(bloomSettings, { strength, threshold, radius });
      buildComposer();
    },
    setQuality(nextMode) {
      mode = nextMode;
      profile = resolveProfile(nextMode);
      applyProfile();
    },
    meter(on) {
      meterState.on = on;
    },
    luminance: () => meterState.value,
    useRoomEnvironment(intensity) {
      if (intensity <= 0) {
        scene.environment = null;
        return;
      }
      pmrem ??= new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = intensity;
    },
    fps: () => Math.round(fps),
    async precompile() {
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(composer?.readBuffer ?? null);
      try {
        await renderer.compileAsync(scene, camera);
        // Otomatik kalitede kare hızı düşerse gölgeler kapanır; o anda bütün shader'lar senkron yeniden
        // derlenip oyunu ~1 sn dondurur. Gölgesiz varyantlar da şimdi (yükleme ekranında) derlenir.
        if (mode === "auto" && profile.shadows) {
          const casters: THREE.Object3D[] = [];
          scene.traverse((object) => {
            if ((object as THREE.Light).isLight && object.castShadow) {
              casters.push(object);
              object.castShadow = false;
            }
          });
          renderer.shadowMap.enabled = false;
          try {
            await renderer.compileAsync(scene, camera);
          } finally {
            renderer.shadowMap.enabled = true;
            casters.forEach((object) => (object.castShadow = true));
          }
        }
        // Dokular da şimdi GPU'ya yüklensin: yoksa bir modelin ilk göründüğü karede takılma olur.
        const uploaded = new Set<THREE.Texture>();
        scene.traverse((object) => {
          const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
          for (const m of Array.isArray(material) ? material : material ? [material] : []) {
            for (const value of Object.values(m)) {
              if (value instanceof THREE.Texture && !uploaded.has(value)) {
                uploaded.add(value);
                renderer.initTexture(value);
              }
            }
          }
        });
      } finally {
        renderer.setRenderTarget(previous);
      }
    },
    capture() {
      composer?.render(0);
      return renderer.domElement.toDataURL("image/jpeg", 0.92);
    },
    start() {
      renderer.setAnimationLoop(frame);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      composer?.dispose();
      pmrem?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };

  applyProfile();
  // Yalnızca geliştirmede: testler HDR tamponunu (NaN/Inf) doğrudan okuyabilsin.
  if (import.meta.env.DEV) Object.defineProperty(runtime, "composer", { get: () => composer });
  return runtime;
}
