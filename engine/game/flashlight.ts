import * as THREE from "three";
import { approach } from "../fx/fade";

/**
 * El feneri: kameranın biraz sağ altından (elde tutulur gibi) bakılan yöne sıcak bir huzme. Işık sahneye baştan eklenir
 * ve kapalıyken şiddeti sıfırdır: açıp kapamak ışık sayısını değiştirmez, shader'lar yeniden derlenmez (takılma olmaz).
 * Sinema ve kapak kadrajında söner; oyuncu yürümeye dönünce yine yanar.
 */
export interface Flashlight {
  readonly on: boolean;
  toggle(): boolean;
  /** chest: üçüncü kişide fener karakterin göğsünden yanar (kameradan yanınca karakterin sırtı patlıyordu). */
  update(camera: THREE.Camera, dt: number, allowed: boolean, chest?: THREE.Vector3): void;
}

/** Huzmenin şiddeti (kandela): 10 m'de zemin ve yüzler, 30 m'de kayalar okunur. */
const INTENSITY = 90;

export function createFlashlight(scene: THREE.Scene): Flashlight {
  const light = new THREE.SpotLight("#ffeedd", 0, 60, 0.6, 0.72, 1.2);
  light.castShadow = false;
  scene.add(light, light.target);
  const hand = new THREE.Vector3(0.16, -0.22, -0.05);
  const ahead = new THREE.Vector3(0, -0.06, -10);
  const forward = new THREE.Vector3();
  let on = false;
  let level = 0;
  return {
    get on() {
      return on;
    },
    toggle() {
      on = !on;
      return on;
    },
    update(camera, dt, allowed, chest) {
      // Yanarken hızlı, sönerken biraz daha yavaş (kesmede yanıp sönme hissi olmasın).
      level = approach(level, on && allowed ? 1 : 0, on && allowed ? 14 : 9, dt);
      light.intensity = level * INTENSITY;
      camera.updateMatrixWorld();
      light.target.position.copy(ahead).applyMatrix4(camera.matrixWorld);
      if (chest) {
        camera.getWorldDirection(forward);
        light.position.copy(chest).addScaledVector(forward.setY(0).normalize(), 0.45);
        light.target.position.sub(camera.position).add(light.position);
      } else light.position.copy(hand).applyMatrix4(camera.matrixWorld);
      light.target.updateMatrixWorld();
    },
  };
}
