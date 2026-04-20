import type * as THREE from "three";

export type AppPhase = "landing" | "experience";

export interface PlayerPose {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  velocity: THREE.Vector3;
  grounded: boolean;
  speed: number;
}

export interface SphereCollider {
  center: THREE.Vector3;
  radius: number;
}

export interface AlbumMeta {
  artist: string;
  title: string;
  playlistId: string;
  playlistUrl: string;
}
