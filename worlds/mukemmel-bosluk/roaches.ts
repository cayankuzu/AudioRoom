import * as THREE from "three";
import { createRoach, type Roach } from "./roach";
import { craterHeight } from "./terrain";

/**
 * Hamam böceği sürüsü: klip çalarken kraterde, oyuncunun çevresinde dolaşan böcekler. Her biri kendi
 * rotasında yürür, ara sıra durur, oyuncu yaklaşınca kaçar. Şarkı yokken hepsi yuvasına çekilir (kapak hâli).
 */
interface Bug {
  roach: Roach;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  pause: number;
  turn: number;
}

export interface Roaches {
  update(dt: number, time: number, active: boolean, player: THREE.Vector3): void;
}

export function createRoaches(scene: THREE.Scene, random: () => number, count = 14): Roaches {
  const bugs: Bug[] = [];
  for (let i = 0; i < count; i += 1) {
    const roach = createRoach();
    roach.group.scale.setScalar(0.85 + random() * 0.5);
    roach.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshPhysicalMaterial | undefined;
      if (mesh.isMesh && material && "emissive" in material) {
        const own = material.clone();
        own.emissive.set("#3a1a0c");
        own.emissiveIntensity = 0.55;
        mesh.material = own;
      }
    });
    roach.group.visible = false;
    scene.add(roach.group);
    const a = random() * Math.PI * 2;
    const r = 10 + random() * 40;
    bugs.push({ roach, x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: random() * Math.PI * 2, speed: 0, pause: random() * 3, turn: (random() - 0.5) * 0.8 });
  }
  let level = 0;
  return {
    update(dt, time, active, player) {
      level += ((active ? 1 : 0) - level) * Math.min(1, dt * 0.8);
      for (const bug of bugs) {
        const visible = level > 0.02;
        bug.roach.group.visible = visible;
        if (!visible) continue;
        // Kaçış: oyuncu 3 m'ye girince ters yöne hızlanır; yoksa duraklamalı gezinti.
        const dx = bug.x - player.x;
        const dz = bug.z - player.z;
        const d = Math.hypot(dx, dz);
        let want = 0.9;
        if (d < 3.5) {
          bug.yaw = Math.atan2(dx, dz) + (random() - 0.5) * 0.6;
          want = 3.2;
          bug.pause = 0;
        } else {
          bug.pause -= dt;
          if (bug.pause <= 0) {
            bug.pause = 1.5 + random() * 4;
            bug.turn = (random() - 0.5) * 1.6;
            if (random() < 0.3) want = 0;
          }
          bug.yaw += bug.turn * dt;
          if (bug.pause > 3.8) want = 0;
        }
        // Oyuncudan 45 m'den uzağa gitmesin: kratere döner.
        if (d > 45) bug.yaw = Math.atan2(-dx, -dz);
        bug.speed += (want - bug.speed) * Math.min(1, dt * 3);
        bug.x += Math.sin(bug.yaw) * bug.speed * dt;
        bug.z += Math.cos(bug.yaw) * bug.speed * dt;
        bug.roach.group.position.set(bug.x, craterHeight(bug.x, bug.z) + 0.02, bug.z);
        bug.roach.group.rotation.set(0, bug.yaw, 0);
        bug.roach.group.scale.setScalar(bug.roach.group.scale.x); // ölçek sabit
        bug.roach.update(dt, time, bug.speed);
        // Belirirken küçükten büyür (yerden çıkar gibi).
        const s = Math.max(0.001, level);
        bug.roach.body.scale.setScalar(s);
      }
    },
  };
}
