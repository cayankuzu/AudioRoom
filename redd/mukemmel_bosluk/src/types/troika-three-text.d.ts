declare module "troika-three-text" {
  import type * as THREE from "three";

  export class Text extends THREE.Mesh {
    text: string;
    fontSize: number;
    color: number | string;
    anchorX: number | string;
    anchorY: number | string;
    letterSpacing: number;
    lineHeight: number | "normal";
    maxWidth: number;
    font?: string;
    material: THREE.Material;
    sync(): void;
    dispose(): void;
  }
}
