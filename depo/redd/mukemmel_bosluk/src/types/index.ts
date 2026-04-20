import type * as THREE from "three";

export type AppPhase = "landing" | "experience";

export interface PlayerPose {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  velocity: THREE.Vector3;
  grounded: boolean;
  crouching: boolean;
  sprinting: boolean;
  speed: number;
}

export interface SphereCollider {
  center: THREE.Vector3;
  radius: number;
}

/** Basit sabit albüm metası — UI metinleri için. */
export interface AlbumMeta {
  artist: string;
  title: string;
  playlistId: string;
  playlistUrl: string;
}
