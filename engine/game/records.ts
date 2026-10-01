import * as THREE from "three";
import { createGroundGlow, createLightShaft, type LightShaft } from "../fx/lightShaft";
import { createShelf, type Shelf } from "./shelf";
import type { Track } from "../world";
import { createSleeveMesh, createVinylMesh, loadImage, SLEEVE_SIZE, VINYL_RADIUS } from "./vinyl";

/** Dünyadaki plaklar okunabilirlik için büyütülür; elde ve gramofonda gerçek boyuttadır. */
const WORLD_SCALE = 2.6;

export type RecordState = "world" | "held" | "placed" | "hidden" | "collected";

export interface GameRecord {
  readonly track: Track;
  /** Dünyadaki görünüm (plak + ışık huzmesi + yer ışığı). */
  readonly group: THREE.Group;
  readonly vinyl: THREE.Group;
  /** Dünyadaki duruş: zarf + zarftan yarı çıkmış plak (ölçekli, sabit). */
  readonly display: THREE.Group;
  state: RecordState;
  /** Oyuncunun E ile alabileceği durumda mı (dünya mekanikleri kapatabilir). */
  pickable: boolean;
  /** Dünyada süzülme yüksekliği (zemin üstü). */
  hover: number;
}

export interface Records {
  readonly list: readonly GameRecord[];
  readonly held: GameRecord | null;
  /** Işık huzmeleri (dünya kendi işaretini kullanıyorsa kapatılabilir). */
  beacons: boolean;
  byTrack(id: string): GameRecord | undefined;
  /** Plağı dünyaya bırakır: zarfıyla (x, y, z) noktasına dikilir; yaw verilmezse rastgele yön. */
  drop(record: GameRecord, x: number, y: number, z: number, yaw?: number): void;
  hide(record: GameRecord): void;
  hold(record: GameRecord): void;
  /** Bir kez çalınmış plak kitaplıktaki yuvasına girer (dünyaya dağılmaz; sıfırlanana kadar orada durur). */
  collect(record: GameRecord): void;
  /** Gramofonun yanındaki plak kitaplığı. */
  readonly shelf: Shelf;
  release(record: GameRecord): THREE.Group;
  /** Huzme rengi; açık gökyüzünde görünür olması için additive kapatılabilir. */
  setBeaconStyle(color: THREE.ColorRepresentation, additive: boolean): void;
  update(dt: number, time: number, cameraPosition: THREE.Vector3): void;
  /** Eldeki plağın tutulduğu yer: kamera (birinci kişi) ya da karakterin eli (üçüncü kişi). */
  setHand(hand: THREE.Object3D | null): void;
}

interface Marks {
  shaft: LightShaft;
  glow: THREE.Mesh;
}

export async function createRecords(
  scene: THREE.Scene,
  camera: THREE.Camera,
  tracks: readonly Track[],
  coverUrl: string,
  accent: string,
): Promise<Records> {
  const cover = await loadImage(coverUrl);
  const marks = new Map<GameRecord, Marks>();
  const shelf = createShelf(tracks.map((track) => track.title), WORLD_SCALE);
  scene.add(shelf.root);
  const slotOf = (record: GameRecord) => Math.max(0, tracks.indexOf(record.track));
  /** Rafta ışıksız evrenlerde de okunsun diye zarfın ön yüzü hafifçe kendi ışığını verir. */
  const sleeveFront = (record: GameRecord) => {
    const mesh = record.display.children[0] as THREE.Mesh;
    return (mesh.material as THREE.MeshStandardMaterial[])[4];
  };
  const setShelved = (record: GameRecord, shelved: boolean) => {
    const front = sleeveFront(record);
    if (shelved && !front.emissiveMap) {
      front.emissive.set("#ffffff");
      front.emissiveMap = front.map;
      front.needsUpdate = true;
    }
    front.emissiveIntensity = shelved ? 0.32 : 0;
    const mark = marks.get(record);
    if (mark) {
      mark.shaft.mesh.visible = !shelved;
      mark.glow.visible = !shelved;
    }
    shelf.setFilled(slotOf(record), shelved);
    if (!shelved && record.group.parent !== scene) {
      scene.add(record.group);
      record.group.scale.setScalar(1);
    }
  };
  const list: GameRecord[] = tracks.map((track) => {
    const index = String(track.order).padStart(2, "0");
    const vinyl = createVinylMesh(cover, track.title, index, accent);
    const group = new THREE.Group();
    group.name = `record:${track.id}`;
    // Zarf hafifçe geriye yaslanmış; plak üstünden yarı çıkmış durur.
    const display = new THREE.Group();
    display.scale.setScalar(WORLD_SCALE);
    display.rotation.x = -0.09;
    display.add(createSleeveMesh(cover, track.title, index, accent));
    group.add(display);
    const shaft = createLightShaft(accent);
    const glow = createGroundGlow(accent, 1.4);
    glow.position.y = 0.04;
    group.add(shaft.mesh, glow);
    group.visible = false;
    scene.add(group);
    const record: GameRecord = { track, group, vinyl, display, state: "hidden", pickable: true, hover: 0 };
    marks.set(record, { shaft, glow });
    return record;
  });

  const holder = new THREE.Group();
  holder.position.set(0.24, -0.22, -0.42);
  holder.rotation.set(1.05, -0.35, 0.15);
  camera.add(holder);

  let held: GameRecord | null = null;
  let holdBlend = 0;
  const toCamera = new THREE.Vector3();
  let inHand = false;

  /** Plağı zarfın içine, üst kısmı dışarıda kalacak şekilde dik yerleştirir (zarf ölçeğinde). */
  const attachVinylToGroup = (record: GameRecord) => {
    record.vinyl.position.set(0, SLEEVE_SIZE / 2 + VINYL_RADIUS * 0.62, 0);
    record.vinyl.rotation.set(Math.PI / 2, 0, 0);
    record.vinyl.scale.setScalar(1);
    record.display.add(record.vinyl);
  };

  const records: Records = {
    list,
    shelf,
    beacons: true,
    get held() {
      return held;
    },
    byTrack: (id) => list.find((record) => record.track.id === id),
    drop(record, x, y, z, yaw) {
      if (held === record) held = null;
      setShelved(record, false);
      attachVinylToGroup(record);
      record.state = "world";
      record.group.position.set(x, y, z);
      record.group.rotation.y = yaw ?? ((x * 12.9898 + z * 78.233) % (Math.PI * 2));
      record.group.visible = true;
    },
    hide(record) {
      if (held === record) held = null;
      setShelved(record, false);
      record.state = "hidden";
      record.group.visible = false;
    },
    hold(record) {
      setShelved(record, false);
      held = record;
      record.state = "held";
      record.group.visible = false;
      record.vinyl.position.set(0, 0, 0);
      record.vinyl.rotation.set(0, 0, 0);
      record.vinyl.scale.setScalar(1);
      holder.clear();
      holder.add(record.vinyl);
      holdBlend = 0;
    },
    collect(record) {
      if (held === record) {
        held = null;
        holder.clear();
      }
      record.state = "collected";
      attachVinylToGroup(record);
      // Kitaplıktaki yuvası: parça sırasına göre; zarf yuvanın tabanında, plak üstünden yarı çıkmış.
      const slot = shelf.slot(slotOf(record));
      slot.add(record.group);
      record.group.position.set(0, 0, 0);
      record.group.rotation.set(0, 0, 0);
      record.group.scale.setScalar(shelf.recordScale);
      record.display.position.y = 0;
      record.group.visible = true;
      setShelved(record, true);
    },
    release(record) {
      setShelved(record, false);
      if (held === record) {
        held = null;
        holder.clear();
      }
      record.state = "placed";
      record.group.visible = false;
      record.vinyl.scale.setScalar(1);
      return record.vinyl;
    },
    setBeaconStyle(color, additive) {
      for (const { shaft, glow } of marks.values()) {
        shaft.setStyle(color, additive);
        const material = glow.material as THREE.ShaderMaterial;
        material.uniforms.uColor.value.set(color);
        material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
        material.needsUpdate = true;
      }
    },
    setHand(hand) {
      if (hand) {
        if (holder.parent !== hand) {
          hand.add(holder);
          inHand = true;
        }
        holder.visible = true;
      } else if (holder.parent !== camera) {
        camera.add(holder);
        inHand = false;
      }
    },
    update(dt, time, cameraPosition) {
      for (const [i, record] of list.entries()) {
        if (record.state !== "world") continue;
        // Plak zarfıyla yere sabit dikilir (dönmez); dünya isterse hover kadar yüksekte durur.
        record.display.position.y = record.hover;
        toCamera.copy(cameraPosition).sub(record.group.position);

        const { shaft, glow } = marks.get(record)!;
        const distance = toCamera.length();
        shaft.opacity = records.beacons ? THREE.MathUtils.clamp((distance - 5) / 14, 0, 1) * 0.7 : 0;
        shaft.update();
        const glowMaterial = glow.material as THREE.ShaderMaterial;
        // Yer halkası uzaktan belirgin, yanına gelince (plak zaten görünür) söner.
        glowMaterial.uniforms.uOpacity.value = records.beacons ? THREE.MathUtils.clamp((distance - 3) / 8, 0.15, 0.9) : 0;
        glowMaterial.uniforms.uTime.value = time + i;
        glow.visible = records.beacons;
      }
      shelf.update(time);
      if (held) {
        holdBlend = Math.min(1, holdBlend + dt * 4);
        const ease = 1 - (1 - holdBlend) ** 3;
        if (inHand) {
          // Elde: zarf avucun içinde, kola paralel; el kemiği ölçeği figür ölçeğine göre.
          holder.position.set(0, 0.16, 0.06);
          holder.rotation.set(-1.2, 0.2, 0.6);
          holder.scale.setScalar(1);
        } else {
          holder.position.set(0.24, -0.22 - (1 - ease) * 0.25, -0.42);
          holder.rotation.set(1.05, -0.35, 0.15);
          holder.scale.setScalar(1);
        }
        held.vinyl.rotation.z = Math.sin(time * 1.6) * 0.03;
      }
    },
  };
  return records;
}
