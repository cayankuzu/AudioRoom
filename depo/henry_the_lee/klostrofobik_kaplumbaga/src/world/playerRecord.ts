import * as THREE from "three";
import { ASSETS } from "../config";

export type PlayerRecordState = "hidden" | "carried" | "dropped";

export interface PlayerRecordHandle {
  readonly ready: Promise<void>;
  readonly state: PlayerRecordState;
  readonly position: THREE.Vector3;
  readonly isCarried: boolean;
  carry(): void;
  dropAt(position: THREE.Vector3): void;
  hide(): void;
  canPickUp(playerPosition: THREE.Vector3): boolean;
  update(time: number, speed: number): void;
  dispose(): void;
}

function createRecord(texture: THREE.Texture | null): THREE.Group {
  const root = new THREE.Group();
  const vinyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.026, 64),
    new THREE.MeshStandardMaterial({
      color: "#09090b",
      roughness: 0.3,
      metalness: 0.46,
    }),
  );
  vinyl.castShadow = true;
  root.add(vinyl);

  const labelMaterial = new THREE.MeshStandardMaterial({
    color: texture ? "#ffffff" : "#c84d2c",
    map: texture,
    roughness: 0.56,
    emissive: "#2d0803",
    emissiveIntensity: 0.18,
  });
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.125, 36), labelMaterial);
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.014;
  root.add(label);
  const labelBack = label.clone();
  labelBack.rotation.x = Math.PI / 2;
  labelBack.position.y = -0.014;
  root.add(labelBack);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.36, 0.47, 48),
    new THREE.MeshBasicMaterial({
      color: "#ff6941",
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;
  halo.name = "record-halo";
  root.add(halo);
  return root;
}

export function createPlayerRecord(
  scene: THREE.Scene,
  camera: THREE.Camera,
  manager: THREE.LoadingManager,
  getHeightAt: (x: number, z: number) => number,
): PlayerRecordHandle {
  const loader = new THREE.TextureLoader(manager);
  const anchor = new THREE.Group();
  anchor.name = "player-record";
  anchor.visible = false;
  scene.add(anchor);

  let state: PlayerRecordState = "hidden";
  let record: THREE.Group | null = null;
  const worldPosition = new THREE.Vector3();
  const carriedBase = new THREE.Vector3(0.32, -0.37, -0.64);

  const ready = new Promise<void>((resolve) => {
    loader.load(
      ASSETS.albumCover,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        record = createRecord(texture);
        anchor.add(record);
        resolve();
      },
      undefined,
      () => {
        record = createRecord(null);
        anchor.add(record);
        resolve();
      },
    );
  });

  const reparent = (parent: THREE.Object3D) => {
    anchor.removeFromParent();
    parent.add(anchor);
  };

  return {
    ready,
    get state() {
      return state;
    },
    get position() {
      return anchor.getWorldPosition(worldPosition);
    },
    get isCarried() {
      return state === "carried";
    },
    carry() {
      reparent(camera);
      state = "carried";
      anchor.visible = true;
      anchor.position.copy(carriedBase);
      anchor.rotation.set(-0.52, -0.22, 0.14);
      anchor.scale.setScalar(0.78);
      const halo = anchor.getObjectByName("record-halo");
      if (halo) halo.visible = false;
    },
    dropAt(position) {
      reparent(scene);
      state = "dropped";
      anchor.visible = true;
      anchor.scale.setScalar(1);
      anchor.rotation.set(0, 0, 0);
      anchor.position.set(
        position.x,
        getHeightAt(position.x, position.z) + 0.07,
        position.z,
      );
      const halo = anchor.getObjectByName("record-halo");
      if (halo) halo.visible = true;
    },
    hide() {
      reparent(scene);
      state = "hidden";
      anchor.visible = false;
    },
    canPickUp(playerPosition) {
      return (
        state === "dropped" &&
        Math.hypot(anchor.position.x - playerPosition.x, anchor.position.z - playerPosition.z) <= 2.8
      );
    },
    update(time, speed) {
      if (state === "carried") {
        const bob = 0.006 + Math.min(speed, 10) * 0.0018;
        anchor.position.x = carriedBase.x + Math.sin(time * 5.6) * bob * 0.4;
        anchor.position.y = carriedBase.y + Math.abs(Math.sin(time * 11.2)) * bob * 0.55;
        anchor.position.z = carriedBase.z + Math.sin(time * 5.6) * bob * 0.12;
        if (record) record.rotation.y = time * 0.55;
      } else if (state === "dropped") {
        const halo = anchor.getObjectByName("record-halo");
        if (halo) {
          halo.rotation.z = time * 0.45;
          const material = (halo as THREE.Mesh).material as THREE.MeshBasicMaterial;
          material.opacity = 0.2 + Math.sin(time * 2.6) * 0.08;
        }
      }
    },
    dispose() {
      anchor.removeFromParent();
      anchor.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if ("map" in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        });
      });
    },
  };
}
