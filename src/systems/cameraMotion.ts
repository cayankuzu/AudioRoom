import * as THREE from "three";
import { CAMERA, PLAYER } from "../config/config";
import { lerp } from "../utils/helpers";
import type { PlayerPose } from "../types";
import type { WindState } from "./windSystem";

export interface CameraMotion {
  apply(camera: THREE.PerspectiveCamera, pose: PlayerPose, time: number, delta: number): void;
  /** Oyuncu yere indiğinde çağır — kamera hafif bir iniş tepkisi verir. */
  notifyLanding(impactVel: number): void;
  /** Rüzgar durumunu dışarıdan ayarla (idle sway için). */
  setWind(wind: WindState | null): void;
}

interface InternalState {
  bobTime: number;
  bobStrength: number;
  /** Oyuncu durduğunda birkaç saniye sonra artan idle seviyesi (0..1). */
  idleLevel: number;
  /** FOV hedefi ve şu anki. */
  currentFov: number;
  /** Landing pulse — inişte 1'e sıçrar, yumuşak söner. */
  landingPulse: number;
  /** Mevcut rüzgar referansı. */
  wind: WindState | null;
}

/**
 * Geliştirilmiş kamera hissi:
 *  - Head bob (yürüme/koşma)
 *  - Hafif lateral sway (doğal vücut hareketi)
 *  - Idle breathing (dururken artan)
 *  - Sprint FOV boost (hafif — midede rahatsızlık vermez)
 *  - Crouch FOV adjust (sakinleşir)
 *  - Landing impact (yere düşüş küçük bir iniş verir)
 *  - Rüzgar idle sway — dururken çok ince rüzgar ritmi
 *  - Küçük subtle randomness → robotik görünmesin
 *
 * Felsefe: FPS oyun değil. Tüm hareket çok küçük genliklerde kalır.
 */
export function createCameraMotion(): CameraMotion {
  const s: InternalState = {
    bobTime: 0,
    bobStrength: 0,
    idleLevel: 0,
    currentFov: CAMERA.fov,
    landingPulse: 0,
    wind: null,
  };

  /** Sprint sırasındaki FOV artışı (hafif — 4 derece). */
  const SPRINT_FOV_BOOST = 4;
  /** Çömelme FOV azalışı. */
  const CROUCH_FOV_DROP = -2;

  /** İdle'a geçiş: hız 0.3'ün altına düşüp sabit kaldığı sürece artar. */
  let idleCharge = 0;
  let lastGrounded = true;

  function notifyLanding(impactVel: number): void {
    const scaled = Math.min(1, Math.abs(impactVel) / 10);
    s.landingPulse = Math.max(s.landingPulse, scaled);
  }

  return {
    setWind(wind) {
      s.wind = wind;
    },
    notifyLanding,
    apply(camera, pose, time, delta) {
      const moving = pose.speed > 0.3 && pose.grounded ? 1 : 0;

      /** Idle charge — hareket edince sıfırlanır, dururken birikir. */
      if (moving) {
        idleCharge = 0;
        s.idleLevel = lerp(s.idleLevel, 0, 1 - Math.exp(-4 * delta));
      } else {
        idleCharge = Math.min(1, idleCharge + delta / 1.8);
        s.idleLevel = lerp(s.idleLevel, idleCharge, 1 - Math.exp(-2.4 * delta));
      }

      /** Head bob — yürüme/koşma hızıyla ritim ve genlik. */
      s.bobStrength = lerp(s.bobStrength, moving, 1 - Math.exp(-6 * delta));
      const speedRatio = Math.min(pose.speed / PLAYER.sprintSpeed, 1);
      s.bobTime += delta * (2.0 + pose.speed * 0.55);
      const bobAmp = CAMERA.bobStrength * (1 + speedRatio * 0.4);
      const vertical = Math.sin(s.bobTime * 7.5) * bobAmp * s.bobStrength;
      const lateral = Math.cos(s.bobTime * 3.75) * CAMERA.bobStrength * 0.42 * s.bobStrength;

      /** Idle breathing — yaşayan, sabit olmayan frekans. */
      const breathFreq = 1.15 + Math.sin(time * 0.23) * 0.08;
      const breath =
        Math.sin(time * breathFreq) * CAMERA.breathStrength * (0.7 + s.idleLevel * 0.6);

      /** Rüzgar idle sway — dururken çok ince yön salınımı. */
      let windSwayX = 0;
      let windSwayY = 0;
      if (s.wind) {
        const w = s.wind.strength;
        const amp = 0.004 * w * s.idleLevel;
        windSwayX = s.wind.direction.x * amp * Math.sin(time * 0.4);
        windSwayY = s.wind.direction.y * amp * Math.sin(time * 0.33 + 0.7);
      }

      /** Landing pulse — yere iniş: kamera hafif aşağı çöker sonra yumuşar. */
      if (s.landingPulse > 0.001) {
        s.landingPulse *= Math.exp(-6 * delta);
      } else {
        s.landingPulse = 0;
      }
      const landingDrop = -s.landingPulse * 0.06;

      camera.position.y += vertical + breath + landingDrop + windSwayY;
      camera.position.x += Math.sin(pose.yaw + Math.PI / 2) * lateral + windSwayX;
      camera.position.z += Math.cos(pose.yaw + Math.PI / 2) * lateral;

      /**
       * Organik mikro-pitch/yaw drift — kamera hiç sabit durmasın. Hem
       * yürüyüşte hem idle'da yaşayan, çok küçük bir "nefes/kafa tutma"
       * salınımı. Fotoğrafik "el kamerası" hissi verir ama mide
       * bulandırmaz (0.08° civarı).
       */
      const microPitch =
        Math.sin(time * 0.31) * 0.0006 +
        Math.sin(time * 0.9 + 1.2) * 0.00035 * (0.4 + s.idleLevel * 0.6);
      const microYaw =
        Math.sin(time * 0.21 + 0.6) * 0.00055 +
        Math.cos(time * 0.77) * 0.00028 * (0.4 + s.idleLevel * 0.6);
      camera.rotation.x += microPitch;
      camera.rotation.y += microYaw;

      /** FOV dinamikleri — sprint hafif açar, crouch hafif kapar. */
      let targetFov = CAMERA.fov;
      if (pose.sprinting && pose.speed > PLAYER.walkSpeed + 0.4) {
        targetFov += SPRINT_FOV_BOOST;
      } else if (pose.crouching) {
        targetFov += CROUCH_FOV_DROP;
      }
      s.currentFov = lerp(s.currentFov, targetFov, 1 - Math.exp(-6 * delta));
      if (Math.abs(camera.fov - s.currentFov) > 0.01) {
        camera.fov = s.currentFov;
        camera.updateProjectionMatrix();
      }

      /** Landing detection — grounded false→true geçişi. */
      if (!lastGrounded && pose.grounded) {
        /** impactVel: hızın düşey bileşeni bilmiyoruz burada; yatay hızı yaklaşık alan referans. */
        notifyLanding(Math.max(2, pose.speed));
      }
      lastGrounded = pose.grounded;
    },
  };
}
