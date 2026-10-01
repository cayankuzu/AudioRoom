import * as THREE from "three";
import { createLightShaft } from "../fx/lightShaft";
import type { CoverPoint } from "../world";
import type { Interactable } from "./interaction";

/**
 * Kapak Noktası: albüm kapağını taşıyan bir sehpa. Önünde durup E'ye basınca
 * kamera, sahnenin kapakla birebir hizalandığı kadraja süzülür; arayüz kaybolur,
 * fotoğraf çekilebilir. E, ESC, hareket tuşları ya da tık ile çıkılır.
 */
export interface CoverPointController {
  readonly interactable: Interactable;
  readonly marker: THREE.Object3D;
  /** Kapağı taşıyan sehpa (katı nesne olarak eklenir). */
  readonly easel: THREE.Object3D;
  readonly active: boolean;
  /** Oyuncunun durması gereken nokta (hedef işareti için). */
  readonly stand: THREE.Vector3;
  exit(): void;
  /** Etkinken kamerayı sürer; true döndürürse oyuncu kamerası uygulanmaz. */
  update(dt: number, camera: THREE.PerspectiveCamera, time: number): boolean;
}

function easel(coverUrl: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#3a2616", roughness: 0.65 });
  const brass = new THREE.MeshStandardMaterial({ color: "#c79a45", metalness: 1, roughness: 0.3 });
  // Üç ayaklı sehpa.
  for (const [x, z, tilt] of [[-0.32, 0.12, 0.12], [0.32, 0.12, -0.12], [0, -0.3, 0]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.7, 8), wood);
    leg.position.set(x, 0.82, z);
    leg.rotation.set(z < 0 ? -0.28 : 0.06, 0, tilt);
    group.add(leg);
  }
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.1), wood);
  ledge.position.set(0, 0.92, 0.12);
  group.add(ledge);
  // Çerçeveli kapak (iki yüzlü: arkada pirinç çerçeve).
  const texture = new THREE.TextureLoader().load(coverUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.04), brass);
  frame.position.set(0, 1.34, 0.1);
  frame.rotation.x = -0.1;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 }));
  art.position.z = 0.021;
  frame.add(art);
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.01), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.4 }));
  plaque.position.set(0, -0.36, 0.03);
  frame.add(plaque);
  group.add(frame);
  group.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return group;
}

export function createCoverPoint(
  point: CoverPoint,
  groundY: number,
  accent: string,
  coverUrl: string,
  callbacks: { onEnter(): void; onExit(): void },
): CoverPointController {
  const marker = new THREE.Group();
  marker.position.set(point.stand.x, groundY + 0.02, point.stand.z);
  // Sehpa, kapağın kadraj yönünde: oyuncu sehpanın önünde durunca aynı yöne bakar.
  const stand = easel(coverUrl, accent);
  const look = new THREE.Vector3().subVectors(point.camera.target, point.camera.position).setY(0).normalize();
  stand.position.set(look.x * 1.1, 0, look.z * 1.1);
  stand.rotation.y = Math.atan2(-look.x, -look.z);
  marker.add(stand);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 64), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  const inner = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.23, 48), ringMaterial);
  inner.rotation.x = -Math.PI / 2;
  marker.add(ring, inner);
  const beam = createLightShaft("#f4efe6", 14, 0.12);
  marker.add(beam.mesh);

  const from = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), fov: 70 };
  const to = { position: point.camera.position.clone(), quaternion: new THREE.Quaternion(), fov: point.camera.fov };
  // Kamera kuralı: -Z hedefe bakar (Matrix4.lookAt bu kuralı kullanır).
  to.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().lookAt(point.camera.position, point.camera.target, new THREE.Vector3(0, 1, 0)),
  );
  if (point.camera.roll) to.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), point.camera.roll));

  let phase: "idle" | "entering" | "holding" | "leaving" = "idle";
  let t = 0;
  const smooth = (x: number) => x * x * (3 - 2 * x);
  const standPosition = new THREE.Vector3(point.stand.x, groundY + 0.8, point.stand.z);

  const controller: CoverPointController = {
    marker,
    easel: stand,
    stand: standPosition,
    get active() {
      return phase !== "idle";
    },
    interactable: {
      radius: 0.6,
      reach: 1.6,
      always: true,
      position: (target) => target.copy(standPosition),
      prompt: () => (phase === "idle" ? [{ key: "E", label: "Kapak Noktası — kapağın içine bak" }] : null),
      use: () => {
        phase = "entering";
        t = 0;
        callbacks.onEnter();
      },
    },
    exit() {
      if (phase === "holding" || phase === "entering") {
        phase = "leaving";
        t = 0;
      }
    },
    update(dt, camera, time) {
      ring.scale.setScalar(1 + Math.sin(time * 2) * 0.04);
      ringMaterial.opacity = phase === "idle" ? 0.45 + Math.sin(time * 2) * 0.15 : 0;
      const distance = camera.position.distanceTo(standPosition);
      beam.opacity = phase === "idle" ? THREE.MathUtils.clamp((distance - 6) / 20, 0, 1) * 0.5 : 0;
      beam.update();
      if (phase === "idle") {
        from.position.copy(camera.position);
        from.quaternion.copy(camera.quaternion);
        from.fov = camera.fov;
        return false;
      }
      t = Math.min(1, t + dt / (phase === "entering" ? 2.2 : 1.2));
      const k = smooth(t);
      const [a, b] = phase === "leaving" ? [to, from] : [from, to];
      camera.position.lerpVectors(a.position, b.position, k);
      camera.quaternion.slerpQuaternions(a.quaternion, b.quaternion, k);
      camera.fov = THREE.MathUtils.lerp(a.fov, b.fov, k);
      camera.updateProjectionMatrix();
      if (t >= 1) {
        if (phase === "entering") phase = "holding";
        else if (phase === "leaving") {
          phase = "idle";
          callbacks.onExit();
          return false;
        }
      }
      return true;
    },
  };
  return controller;
}
