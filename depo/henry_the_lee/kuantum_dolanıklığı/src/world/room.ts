import * as THREE from "three";
import { PALETTE, WORLD } from "../config/config";

/**
 * Kutu evren — 4 duvar + tavan. Tamamen **opak mat sarı**, kapaktaki ton.
 * Çizgisiz, gridsiz — düz mustard yüzey. Oyuncu kapalı bir hangar içinde.
 *
 * Önceki versiyonda lattice çizgileri vardı; kullanıcı feedback'i:
 * "duvarlar ve tavan kare kare gözüküyor. çizgileri gözükmemeli." →
 * tüm grid'ler kaldırıldı.
 *
 * Stil:
 *  - `MeshStandardMaterial`, roughness 1.0, metalness 0 → tamamen mat.
 *  - Yüksek emissive (≈%55 sarı) → spot ışıkları uzakta kalsa bile
 *    duvar/tavan kapaktaki sarı tonunu kaybetmez.
 *  - DoubleSide → planenin hangi yüzünden bakılırsa baksın boyalı.
 */
export interface RoomHandle {
  group: THREE.Group;
}

export function createRoom(scene: THREE.Scene): RoomHandle {
  const group = new THREE.Group();
  group.name = "kd-room";

  const half = WORLD.half;
  const ceil = WORLD.ceilingHeight;

  /** Tüm duvar + tavan için aynı mat sarı — kapağın hex'i birebir. */
  const yellow = new THREE.Color(PALETTE.coverYellow);

  const wallMat = new THREE.MeshStandardMaterial({
    color: yellow,
    roughness: 1.0,
    metalness: 0,
    emissive: yellow.clone().multiplyScalar(0.55),
    emissiveIntensity: 1.0,
    side: THREE.DoubleSide,
    fog: true,
  });

  /** Tavan için aynı materyal — istenen "tavan da aynı renk olsun". */
  const ceilingMat = wallMat;

  /** ── Duvarlar: 4 ayrı PlaneGeometry ───────────────────────────── */
  const makeWall = (
    width: number,
    height: number,
    pos: THREE.Vector3,
    rotY: number,
  ) => {
    const geo = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.rotation.y = rotY;
    mesh.position.copy(pos);
    group.add(mesh);
  };

  /**
   * Duvarlar zeminin altından başlar (-7 m), tavanın üstüne kadar uzar.
   * Bump genlikleri yükseltildiği için (vadi tabanı ≈ -5 m) wall lower
   * sınırını -7 m'ye çekiyoruz; gap görünmez.
   * Yükseklik = ceil + 7 (alttan 7m taşma).
   */
  const wallSink = 7;
  const wallH = ceil + wallSink;
  const wallY = wallH * 0.5 - wallSink;

  /**
   * KARE TABAN: tüm duvarlar `half * 2` (= 180 m) genişlikte. X ve Z
   * eksenleri zorunlu olarak eşittir (config açıklamasına bakın).
   */
  makeWall(half * 2, wallH, new THREE.Vector3(0, wallY, -half), 0);
  makeWall(half * 2, wallH, new THREE.Vector3(0, wallY, half), Math.PI);
  makeWall(half * 2, wallH, new THREE.Vector3(half, wallY, 0), -Math.PI / 2);
  makeWall(half * 2, wallH, new THREE.Vector3(-half, wallY, 0), Math.PI / 2);

  /** ── Tavan: yatay plane ─────────────────────────────────────── */
  const ceilingGeo = new THREE.PlaneGeometry(half * 2, half * 2);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = ceil;
  group.add(ceilingMesh);

  scene.add(group);

  return { group };
}
