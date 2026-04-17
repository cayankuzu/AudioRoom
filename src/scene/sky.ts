import * as THREE from "three";

/**
 * Gökyüzü — NÖTR, gri gradyan. Referans albüm kapağında sky neredeyse
 * düz kırık-beyaz/gri; hafif bir vertical gradient var ama renk kayması
 * yok. Bu shader'da mavi/sıcak tint KAPATILDI; yalnızca üç ton gri geçişi
 * bulunur: zenit → horizon → ground haze.
 */
export function createSky(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(460, 48, 24);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      zenithColor: { value: new THREE.Color("#cccfd2") },
      horizonColor: { value: new THREE.Color("#b0b3b6") },
      groundColor: { value: new THREE.Color("#8e9194") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldPosition;
      uniform vec3 zenithColor;
      uniform vec3 horizonColor;
      uniform vec3 groundColor;
      void main() {
        float h = normalize(vWorldPosition).y;
        /** İki ayrı geçiş: altı → horizon, horizon → zenit. */
        float tUp = smoothstep(0.0, 0.72, h);
        float tGround = smoothstep(-0.35, 0.02, h);
        vec3 color = mix(groundColor, horizonColor, tGround);
        color = mix(color, zenithColor, tUp);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}
