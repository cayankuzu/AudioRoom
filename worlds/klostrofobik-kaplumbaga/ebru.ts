import * as THREE from "three";

/**
 * Ebru (Türk kâğıt marmorlaması): alan bükümlü gürültüyle akan hardal–krem
 * damarlar. Kapaktaki zemin deseni; hem yer hem gökyüzü kubbesi bunu kullanır.
 */
const EBRU_GLSL = /* glsl */ `
  uniform float uTime, uFlow, uWarp;
  uniform vec3 uPaper, uInk, uDeep;
  // Ucuz alan bükümü: iç içe sinüsler ebru taraklamasına benzer akışlı damarlar üretir.
  vec3 ebru(vec2 p) {
    float t = uTime * uFlow;
    vec2 q = p + 0.8 * vec2(sin(p.y * 1.3 + t * 2.0), sin(p.x * 1.1 - t * 1.4));
    q += 0.45 * vec2(sin(q.y * 2.3 + t), sin(q.x * 1.9 + 1.7));
    q += 0.2 * vec2(sin(q.y * 4.7 - t * 0.6), sin(q.x * 4.1 + 2.3));
    float bands = sin((q.x * 0.8 + q.y * 0.35) * 6.0 + uWarp * sin(q.y * 1.7 + q.x * 0.9));
    // Kapaktaki gibi keskin kenarlı iki ton: boya damarı ile kâğıt arasında net sınır.
    float line = smoothstep(0.58, 0.66, abs(bands));
    float fine = smoothstep(0.9, 0.97, abs(sin((q.y + q.x * 0.3) * 22.0)));
    vec3 col = mix(uPaper, uInk, line);
    // Tarak izleri: damarın içinde koyu ince çizgiler (yakın plan boş kalmasın).
    return mix(col, uDeep, fine * line * 0.7);
  }
`;

export interface EbruUniforms {
  uTime: { value: number };
  uFlow: { value: number };
  uWarp: { value: number };
  uPaper: { value: THREE.Color };
  uInk: { value: THREE.Color };
  uDeep: { value: THREE.Color };
}

export function createEbruUniforms(): EbruUniforms {
  return {
    uTime: { value: 0 },
    uFlow: { value: 0.05 },
    uWarp: { value: 2.2 },
    uPaper: { value: new THREE.Color("#ecd49a") },
    uInk: { value: new THREE.Color("#c3902f") },
    uDeep: { value: new THREE.Color("#8a5e1c") },
  };
}

export const DROPS = 14;

/**
 * Zemin: ebru deseni + gerçek ışık/gölge. uDrops: oyuncunun damlattığı boyalar
 * (x, z, başlangıç zamanı, en büyük yarıçap) — suya düşen boya gibi eş merkezli halkalar açar.
 * holes: tavşan deliklerinin ağızları (x, z, yarıçap); zemin orada gerçekten açıktır.
 */
export function createEbruFloorMaterial(uniforms: EbruUniforms, drops: THREE.Vector4[], holes: THREE.Vector3[]): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { uDrops: { value: drops }, uHoles: { value: holes }, uRed: { value: new THREE.Color("#b3472a") } });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vEbru;\nvarying vec2 vFloor;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvFloor = (modelMatrix * vec4(transformed, 1.0)).xz;\nvEbru = vFloor * 0.06;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec2 vEbru;\nvarying vec2 vFloor;\nuniform vec4 uDrops[${DROPS}];\nuniform vec3 uHoles[${holes.length}];\nuniform vec3 uRed;\n${EBRU_GLSL}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // Delik ağızları: zemin açık, aşağıdaki tünel görünür; kenarı nemli toprak.
        float rim = 1.0;
        for (int h = 0; h < ${holes.length}; h++) {
          float d = length(vFloor - uHoles[h].xy) - uHoles[h].z;
          if (d < 0.0) discard;
          rim = min(rim, smoothstep(0.0, 0.9, d));
        }
        vec3 paint = ebru(vEbru);
        for (int i = 0; i < ${DROPS}; i++) {
          vec4 d = uDrops[i];
          if (d.w <= 0.0) continue;
          float age = uTime - d.z;
          float radius = d.w * (1.0 - exp(-age * 1.1));
          vec2 rel = vFloor - d.xy;
          // Ebru damlası kusursuz daire değil: kenarları boyanın akışıyla dalgalanır.
          float wobble = 1.0 + 0.07 * sin(atan(rel.y, rel.x) * 5.0 + d.z * 3.0) + 0.04 * sin(atan(rel.y, rel.x) * 11.0 - uTime * 0.2);
          float dist = length(rel) * wobble;
          if (dist < radius) {
            // Battal ebru: damla halka halka açılır; renkler kapağın hardal, kiremit ve kâğıt tonları.
            float ring = fract(dist / max(radius, 0.001) * 3.0 + float(i) * 0.37);
            vec3 ringCol = ring < 0.34 ? uInk : ring < 0.67 ? uRed : uPaper;
            paint = mix(paint, ringCol, smoothstep(radius, radius - 0.12, dist));
          }
        }
        diffuseColor.rgb = mix(vec3(0.24, 0.15, 0.07), paint, rim);`,
      );
  };
  return material;
}

/** Gökyüzü kubbesi: aynı desen, ışıktan bağımsız ve biraz daha soluk. */
export function createEbruSky(uniforms: EbruUniforms): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...uniforms, uFade: { value: 0.12 }, uDark: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }
    `,
    fragmentShader: /* glsl */ `
      ${EBRU_GLSL}
      uniform float uFade;
      uniform float uDark;
      varying vec3 vDir;
      void main() {
        // Kapaktaki gibi yatay akan ince damarlar: desen çoğunlukla yüksekliğe göre değişir.
        // Yönün doğrusal izdüşümü kullanılır (atan yok): dikiş oluşmaz.
        vec2 p = vec2(vDir.y * 11.0 + vDir.x * 0.9, vDir.z * 3.4 + vDir.x * 2.2);
        vec3 col = ebru(p);
        col = mix(col, uPaper * 1.05, uFade + smoothstep(0.1, -0.1, vDir.y) * 0.4 + smoothstep(0.8, 1.0, vDir.y));
        // Evren daralırken gök kararır: önce ufuk, sonra tepe.
        float dark = uDark * (0.55 + 0.45 * smoothstep(0.6, -0.1, vDir.y));
        gl_FragColor = vec4(col * 1.05 * (1.0 - dark), 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
