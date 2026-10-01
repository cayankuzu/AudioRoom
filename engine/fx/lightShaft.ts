import * as THREE from "three";

export interface LightShaft {
  readonly mesh: THREE.Mesh;
  /** 0..1 görünürlük (mesafeye ve oyun durumuna göre dünya ayarlar). */
  opacity: number;
  setStyle(color: THREE.ColorRepresentation, additive: boolean): void;
  update(): void;
}

/**
 * İnce, yumuşak kenarlı dikey ışık huzmesi: uzaktan bir hedefi gösterir.
 * Yerde parlak bir çekirdek, yukarı doğru incelip kaybolur (koni değil, çizgi).
 */
export function createLightShaft(color: THREE.ColorRepresentation, height = 22, width = 0.22): LightShaft {
  const geometry = new THREE.CylinderGeometry(width * 0.35, width, height, 24, 1, true);
  geometry.translate(0, height / 2, 0);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uHeight: { value: height } },
    vertexShader: /* glsl */ `
      uniform float uHeight;
      varying float vH; varying vec3 vN; varying vec3 vView;
      void main() {
        vH = clamp(position.y / uHeight, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity;
      varying float vH; varying vec3 vN; varying vec3 vView;
      void main() {
        // Kenarlarda yumuşak, ortada dolu: silindir yüzeyinde çizgi gibi bir huzme.
        float core = pow(clamp(abs(dot(vN, vView)), 0.0, 1.0), 2.0);
        float fade = pow(clamp(1.0 - vH, 0.0, 1.0), 1.4) * smoothstep(0.0, 0.02, vH);
        gl_FragColor = vec4(uColor, core * fade * uOpacity);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;

  const shaft: LightShaft = {
    mesh,
    opacity: 0,
    setStyle(next, additive) {
      material.uniforms.uColor.value.set(next);
      material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
    },
    update() {
      material.uniforms.uOpacity.value = shaft.opacity;
      mesh.visible = shaft.opacity > 0.005;
    },
  };
  return shaft;
}

/** Yerde yumuşak ışık halkası (hedefin tam yerini gösterir). */
export function createGroundGlow(color: THREE.ColorRepresentation, radius: number): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity, uTime;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float pool = pow(clamp(1.0 - d, 0.0, 1.0), 2.2) * 0.55;
        float ring = smoothstep(0.08, 0.0, abs(d - 0.72 - 0.05 * sin(uTime * 2.0))) * 0.8;
        gl_FragColor = vec4(uColor, (pool + ring) * uOpacity);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}
