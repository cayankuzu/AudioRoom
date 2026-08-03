import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSETS, BUNNY } from "../config";

const UP = new THREE.Vector3(0, 1, 0);

export type BunnyStage =
  | "loading"
  | "running"
  | "walking"
  | "stopped"
  | "captured";

export type BunnyObjective = "flee" | "record" | "gramophone" | "idle";

export interface BunnyUpdateContext {
  playerPosition: THREE.Vector3;
  gramophonePosition: THREE.Vector3;
  gramophoneStolen: boolean;
  gramophoneGuarded: boolean;
  gramophoneAvailable: boolean;
  droppedRecordPosition: THREE.Vector3 | null;
  onStealGramophone(): boolean;
  onStealRecord(): boolean;
  onHitStreakExpired(): void;
}

export interface BunnyHandle {
  readonly group: THREE.Group;
  readonly ready: Promise<void>;
  readonly stage: BunnyStage;
  readonly hits: number;
  readonly hitWindowRemaining: number;
  readonly objective: BunnyObjective;
  readonly position: THREE.Vector3;
  readonly hasRecord: boolean;
  hit(): BunnyStage;
  canCollect(playerPosition: THREE.Vector3): boolean;
  collect(): boolean;
  reset(): void;
  update(time: number, delta: number, context: BunnyUpdateContext): void;
  getHitPoint(target?: THREE.Vector3): THREE.Vector3;
  dispose(): void;
}

function loadGltf(
  loader: GLTFLoader,
  url: string,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, onProgress, reject);
  });
}

function fitCharacter(model: THREE.Group, targetHeight: number): void {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const scale = targetHeight / Math.max(0.001, size.y);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
}

function createFallbackBunny(): THREE.Group {
  const root = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: "#eee4cf", roughness: 0.9 });
  const coat = new THREE.MeshStandardMaterial({ color: "#a84025", roughness: 0.78 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.05, 6, 12), coat);
  body.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), fur);
  head.position.y = 2.15;
  const earGeometry = new THREE.CapsuleGeometry(0.13, 0.72, 4, 10);
  const leftEar = new THREE.Mesh(earGeometry, fur);
  const rightEar = leftEar.clone();
  leftEar.position.set(-0.2, 2.82, 0);
  rightEar.position.set(0.2, 2.82, 0);
  leftEar.rotation.z = -0.09;
  rightEar.rotation.z = 0.09;
  root.add(body, head, leftEar, rightEar);
  return root;
}

function createRecord(texture: THREE.Texture | null): THREE.Group {
  const root = new THREE.Group();
  const vinyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.028, 48),
    new THREE.MeshStandardMaterial({
      color: "#11100d",
      roughness: 0.38,
      metalness: 0.42,
    }),
  );
  const labelMaterial = new THREE.MeshBasicMaterial({
    color: texture ? "#ffffff" : "#d76937",
    map: texture,
    toneMapped: false,
  });
  const labelFront = new THREE.Mesh(new THREE.CircleGeometry(0.115, 32), labelMaterial);
  const labelBack = labelFront.clone();
  labelFront.rotation.x = -Math.PI / 2;
  labelBack.rotation.x = Math.PI / 2;
  labelFront.position.y = 0.016;
  labelBack.position.y = -0.016;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.325, 0.018, 8, 48),
    new THREE.MeshBasicMaterial({
      color: "#f08a45",
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  root.add(vinyl, labelFront, labelBack, rim);
  return root;
}

function routePosition(angle: number, target = new THREE.Vector3()): THREE.Vector3 {
  const radius = BUNNY.routeRadius + Math.sin(angle * 3.0) * 4.2 + Math.cos(angle * 1.7) * 1.6;
  target.set(
    Math.sin(angle) * radius,
    0,
    Math.cos(angle) * radius,
  );
  return target;
}

export function createBunny(
  scene: THREE.Scene,
  manager: THREE.LoadingManager,
  getHeightAt: (x: number, z: number) => number,
  onLoadProgress?: (value: number) => void,
): BunnyHandle {
  const root = new THREE.Group();
  root.name = "record-thief-bunny";
  scene.add(root);

  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(1.12, 1.22, 40),
    new THREE.MeshBasicMaterial({
      color: "#efbc62",
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.position.y = 0.08;
  root.add(targetRing);

  const loader = new GLTFLoader(manager);
  const textureLoader = new THREE.TextureLoader(manager);
  let stage: BunnyStage = "loading";
  let hits = 0;
  let routeAngle = Math.random() * Math.PI * 2;
  let speed = 0;
  let hitPulse = 0;
  let stoppedFor = 0;
  let hitWindowRemaining = 0;
  let diversionFor = 0;
  let pendingHitEvasion = false;
  let escapeSide = 1;
  let hitTurnSide = 1;
  let boundaryTurnSide = 1;
  let boundaryTurning = false;
  let hasRecord = true;
  let objective: BunnyObjective = "flee";
  let mixer: THREE.AnimationMixer | null = null;
  let runAction: THREE.AnimationAction | null = null;
  let walkAction: THREE.AnimationAction | null = null;
  let character: THREE.Group | null = null;
  let hand: THREE.Object3D | null = null;
  let record: THREE.Group | null = null;
  const movementTarget = new THREE.Vector3();
  const moveDirection = new THREE.Vector3();
  const awayFromPlayer = new THREE.Vector3();
  const avoidanceTangent = new THREE.Vector3();
  const travelDirection = new THREE.Vector3();
  const actualMovementDirection = new THREE.Vector3();
  const hitTurnDirection = new THREE.Vector3();
  const oppositeHitTurnDirection = new THREE.Vector3();
  const boundaryOutward = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  const handPosition = new THREE.Vector3();
  const recordNormal = new THREE.Vector3();
  const recordSide = new THREE.Vector3();
  const recordLight = new THREE.PointLight("#e7783e", 0.75, 7.5, 2);
  scene.add(recordLight);

  const chooseDiversion = (minimumDistance = 12) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = minimumDistance + Math.random() * 18;
    movementTarget.set(
      root.position.x + Math.sin(angle) * distance,
      0,
      root.position.z + Math.cos(angle) * distance,
    );
    const limit = BUNNY.boundaryRadius - 2;
    const radial = Math.hypot(movementTarget.x, movementTarget.z);
    if (radial > limit) {
      movementTarget.x *= limit / radial;
      movementTarget.z *= limit / radial;
    }
  };

  const chooseEscapeFrom = (
    playerPosition: THREE.Vector3,
    minimumDistance = 18,
    changeSide = false,
  ) => {
    awayFromPlayer.subVectors(root.position, playerPosition);
    awayFromPlayer.y = 0;
    if (awayFromPlayer.lengthSq() < 0.001) {
      awayFromPlayer.set(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y));
    }
    awayFromPlayer.normalize();
    avoidanceTangent.set(-awayFromPlayer.z, 0, awayFromPlayer.x);
    if (changeSide) {
      travelDirection.set(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y));
      const turnAngle = THREE.MathUtils.degToRad(64);
      hitTurnDirection
        .copy(travelDirection)
        .applyAxisAngle(UP, turnAngle);
      oppositeHitTurnDirection
        .copy(travelDirection)
        .applyAxisAngle(UP, -turnAngle);
      if (hits <= 1) {
        hitTurnSide =
          hitTurnDirection.dot(awayFromPlayer) >=
          oppositeHitTurnDirection.dot(awayFromPlayer)
            ? 1
            : -1;
      }
      hitTurnDirection
        .copy(travelDirection)
        .applyAxisAngle(UP, turnAngle * hitTurnSide);
      // Preserve the visible turn while guaranteeing that the bunny never dodges at the player.
      const awayAlignment = hitTurnDirection.dot(awayFromPlayer);
      if (awayAlignment < 0.18) {
        hitTurnDirection
          .addScaledVector(awayFromPlayer, 0.18 - awayAlignment)
          .normalize();
      }
      escapeSide = avoidanceTangent.dot(hitTurnDirection) >= 0 ? 1 : -1;
      movementTarget
        .copy(root.position)
        .addScaledVector(hitTurnDirection, minimumDistance + 8 + Math.random() * 8);
    } else {
      movementTarget
        .copy(root.position)
        .addScaledVector(awayFromPlayer, minimumDistance + Math.random() * 14)
        .addScaledVector(avoidanceTangent, escapeSide * (7 + Math.random() * 9));
    }
    const radial = Math.hypot(movementTarget.x, movementTarget.z);
    const limit = BUNNY.boundaryRadius - 2;
    if (radial > limit) {
      movementTarget.x *= limit / radial;
      movementTarget.z *= limit / radial;
    }
    if (changeSide) {
      moveDirection.subVectors(movementTarget, root.position);
      moveDirection.y = 0;
      if (moveDirection.lengthSq() > 0.001) {
        moveDirection.normalize();
        root.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
        actualMovementDirection.copy(moveDirection);
      }
    }
  };

  const resumeRunning = (gramophoneStolen = false) => {
    hits = 0;
    hitWindowRemaining = 0;
    stoppedFor = 0;
    stage = "running";
    speed = BUNNY.runSpeed;
    mixer && (mixer.timeScale = 1);
    walkAction?.fadeOut(0.14);
    runAction?.reset().fadeIn(0.18).play();
    const carryingLoot = hasRecord || gramophoneStolen;
    diversionFor = carryingLoot ? Math.max(diversionFor, 1.8) : 0;
    pendingHitEvasion = carryingLoot;
  };

  const texturePromise = new Promise<THREE.Texture | null>((resolve) => {
    textureLoader.load(
      ASSETS.albumCover,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });

  const ready = Promise.all([
    loadGltf(loader, ASSETS.bunnyRunning, (event) => {
      if (event.total > 0) onLoadProgress?.(event.loaded / event.total);
    }),
    loadGltf(loader, ASSETS.bunnyWalking),
    texturePromise,
  ])
    .then(([running, walking, coverTexture]) => {
      character = running.scene;
      fitCharacter(character, BUNNY.height);
      character.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      root.add(character);
      hand =
        character.getObjectByName("RightHand") ??
        character.getObjectByName("LeftHand") ??
        null;

      mixer = new THREE.AnimationMixer(character);
      const runClip = running.animations[0];
      const walkClip = walking.animations[0];
      if (runClip) {
        runAction = mixer.clipAction(runClip);
        runAction.play();
      }
      if (walkClip) walkAction = mixer.clipAction(walkClip);

      record = createRecord(coverTexture);
      record.name = "stolen-record";
      scene.add(record);

      walking.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });

      stage = "running";
      speed = BUNNY.runSpeed;
    })
    .catch((error) => {
      console.error("[Klostrofobik] Tavşan animasyonları yüklenemedi.", error);
      character = createFallbackBunny();
      root.add(character);
      record = createRecord(null);
      scene.add(record);
      stage = "running";
      speed = BUNNY.runSpeed;
    });

  const updateRecord = (time: number) => {
    if (!record || !hasRecord) return;
    if (hand) {
      hand.getWorldPosition(handPosition);
      recordSide.set(-0.18, -0.04, 0.05).applyQuaternion(root.quaternion);
      record.position.copy(handPosition).add(recordSide);
      recordNormal.set(0, 0, 1).applyQuaternion(root.quaternion).normalize();
      record.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), recordNormal);
    } else {
      record.position.copy(root.position).add(new THREE.Vector3(0.5, 1.45, 0));
      record.rotation.set(Math.PI / 2, root.rotation.y, 0);
    }
    record.rotateY(time * 0.9);
    recordLight.position.copy(record.position);
    recordLight.intensity = 0.62 + Math.sin(time * 3.1) * 0.18;
  };

  routePosition(routeAngle, root.position);
  routePosition(routeAngle + 0.7, movementTarget);
  moveDirection.subVectors(movementTarget, root.position);
  root.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
  root.position.y = getHeightAt(root.position.x, root.position.z);

  return {
    group: root,
    ready,
    get stage() {
      return stage;
    },
    get hits() {
      return hits;
    },
    get hitWindowRemaining() {
      return hitWindowRemaining;
    },
    get objective() {
      return objective;
    },
    get position() {
      return root.position;
    },
    get hasRecord() {
      return hasRecord;
    },
    hit() {
      if (stage === "loading" || stage === "stopped" || stage === "captured") {
        return stage;
      }
      hits += 1;
      hitWindowRemaining = BUNNY.hitWindow;
      hitPulse = 1;
      diversionFor = 2.8;
      pendingHitEvasion = true;
      if (hits === 3) {
        stage = "walking";
        speed = BUNNY.walkSpeed;
        if (walkAction) {
          walkAction.reset().play();
          runAction?.crossFadeTo(walkAction, 0.42, true);
        }
      } else if (hits >= 6) {
        stage = "stopped";
        speed = 0;
        stoppedFor = BUNNY.stopDuration;
        hitWindowRemaining = 0;
        pendingHitEvasion = false;
      }
      return stage;
    },
    canCollect(playerPosition) {
      return (
        stage === "stopped" && hasRecord &&
        Math.hypot(
          root.position.x - playerPosition.x,
          root.position.z - playerPosition.z,
        ) <= BUNNY.collectRadius
      );
    },
    collect() {
      if (stage !== "stopped") return false;
      hasRecord = false;
      objective = "idle";
      record?.removeFromParent();
      recordLight.intensity = 0;
      return true;
    },
    reset() {
      hits = 0;
      hitWindowRemaining = 0;
      routeAngle = Math.random() * Math.PI * 2;
      speed = BUNNY.runSpeed;
      stoppedFor = 0;
      diversionFor = 0;
      pendingHitEvasion = false;
      escapeSide = 1;
      hitTurnSide = 1;
      boundaryTurnSide = 1;
      boundaryTurning = false;
      hasRecord = true;
      objective = "flee";
      stage = character ? "running" : "loading";
      mixer && (mixer.timeScale = 1);
      walkAction?.stop();
      runAction?.reset().fadeIn(0.18).play();
      if (record && !record.parent) scene.add(record);
      recordLight.intensity = 0.7;
      routePosition(routeAngle, root.position);
      routePosition(routeAngle + 0.7, movementTarget);
      moveDirection.subVectors(movementTarget, root.position);
      root.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
    },
    update(time, delta, context) {
      diversionFor = Math.max(0, diversionFor - delta);

      if (
        hits > 0 &&
        hits < 6 &&
        (stage === "running" || stage === "walking")
      ) {
        hitWindowRemaining = Math.max(0, hitWindowRemaining - delta);
        if (hitWindowRemaining <= 0) {
          hits = 0;
          if (stage === "walking") {
            stage = "running";
            speed = BUNNY.runSpeed;
            mixer && (mixer.timeScale = 1);
            walkAction?.fadeOut(0.14);
            runAction?.reset().fadeIn(0.18).play();
          }
          hitTurnSide = 1;
          context.onHitStreakExpired();
        }
      }

      if (stage === "stopped") {
        stoppedFor -= delta;
        if (stoppedFor <= 0) resumeRunning(context.gramophoneStolen);
      }

      if (stage === "running" || stage === "walking") {
        if (pendingHitEvasion) {
          objective = "flee";
          chooseEscapeFrom(context.playerPosition, 20, true);
          pendingHitEvasion = false;
        }

        const canCarryNewLoot = !hasRecord && !context.gramophoneStolen;
        const canSeekRecord =
          canCarryNewLoot &&
          context.droppedRecordPosition !== null &&
          diversionFor <= 0;
        const canSeekGramophone =
          canCarryNewLoot &&
          context.gramophoneAvailable &&
          !context.gramophoneGuarded &&
          diversionFor <= 0;

        if (canSeekRecord && context.droppedRecordPosition) {
          objective = "record";
          movementTarget.copy(context.droppedRecordPosition);
          if (
            root.position.distanceToSquared(context.droppedRecordPosition) <=
            BUNNY.recordReach ** 2
          ) {
            if (context.onStealRecord()) {
              hasRecord = true;
              if (record && !record.parent) scene.add(record);
              recordLight.intensity = 0.7;
              objective = "flee";
              diversionFor = 5;
              chooseEscapeFrom(context.playerPosition, 24, true);
            }
          }
        } else if (canSeekGramophone) {
          objective = "gramophone";
          movementTarget.copy(context.gramophonePosition);
          if (
            root.position.distanceToSquared(context.gramophonePosition) <=
            BUNNY.gramophoneReach ** 2
          ) {
            if (context.onStealGramophone()) {
              objective = "flee";
              diversionFor = 5;
              chooseEscapeFrom(context.playerPosition, 26, true);
            }
          }
        } else {
          const lostLootTarget = objective === "record" || objective === "gramophone";
          objective = hasRecord || context.gramophoneStolen ? "flee" : "idle";
          if (lostLootTarget || movementTarget.distanceToSquared(root.position) < 3.2) {
            if (objective === "flee") {
              chooseEscapeFrom(context.playerPosition, context.gramophoneStolen ? 26 : 20);
            } else {
              chooseDiversion(14);
            }
          }
        }

        moveDirection.subVectors(movementTarget, root.position);
        moveDirection.y = 0;
        const remaining = moveDirection.length();
        if (remaining > 0.001) {
          moveDirection.multiplyScalar(1 / remaining);

          awayFromPlayer.subVectors(root.position, context.playerPosition);
          awayFromPlayer.y = 0;
          let hasPlayerDirection = false;
          const pursuingLoot = objective === "record" || objective === "gramophone";
          const mustDodgePlayer = !pursuingLoot;
          if (mustDodgePlayer && awayFromPlayer.lengthSq() > 0.001) {
            hasPlayerDirection = true;
            awayFromPlayer.normalize();
            const awayDot = moveDirection.dot(awayFromPlayer);
            if (awayDot < 0.08) {
              avoidanceTangent.set(-awayFromPlayer.z, 0, awayFromPlayer.x);
              moveDirection
                .copy(avoidanceTangent)
                .multiplyScalar(escapeSide * 0.78)
                .addScaledVector(awayFromPlayer, 0.62)
                .normalize();
            }
          }

          const radial = Math.hypot(root.position.x, root.position.z);
          if (radial < BUNNY.boundaryRadius - 7) boundaryTurning = false;
          if (radial >= BUNNY.boundaryRadius - 2) {
            boundaryOutward.set(
              root.position.x / Math.max(0.001, radial),
              0,
              root.position.z / Math.max(0.001, radial),
            );
            const outwardSpeed = moveDirection.dot(boundaryOutward);
            if (outwardSpeed > -0.18) {
              if (!boundaryTurning) {
                travelDirection.set(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y));
                avoidanceTangent.set(-boundaryOutward.z, 0, boundaryOutward.x);
                boundaryTurnSide = avoidanceTangent.dot(travelDirection) >= 0 ? 1 : -1;
                boundaryTurning = true;
              }
              moveDirection
                .set(
                  -boundaryOutward.z * boundaryTurnSide - boundaryOutward.x * 0.38,
                  0,
                  boundaryOutward.x * boundaryTurnSide - boundaryOutward.z * 0.38,
                )
                .normalize();
            }
          }

          const desiredYaw = Math.atan2(moveDirection.x, moveDirection.z);
          const yawDifference = Math.atan2(
            Math.sin(desiredYaw - root.rotation.y),
            Math.cos(desiredYaw - root.rotation.y),
          );
          const turnRate = pursuingLoot ? 7.2 : stage === "walking" ? 2.7 : 4.1;
          const turnDelta = Math.min(delta, 0.05);
          root.rotation.y += THREE.MathUtils.clamp(
            yawDifference,
            -turnRate * turnDelta,
            turnRate * turnDelta,
          );
          root.rotation.y = Math.atan2(Math.sin(root.rotation.y), Math.cos(root.rotation.y));
          travelDirection.set(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y));

          actualMovementDirection
            .copy(travelDirection)
            .lerp(moveDirection, pursuingLoot ? 0.72 : 0.35)
            .normalize();
          if (hasPlayerDirection) {
            const towardPlayer = actualMovementDirection.dot(awayFromPlayer);
            if (towardPlayer < 0.06) {
              actualMovementDirection
                .addScaledVector(awayFromPlayer, 0.06 - towardPlayer)
                .normalize();
            }
          }
          if (
            radial >= BUNNY.boundaryRadius - 2 &&
            actualMovementDirection.dot(boundaryOutward) > -0.08
          ) {
            const outwardMovement = actualMovementDirection.dot(boundaryOutward);
            actualMovementDirection
              .addScaledVector(boundaryOutward, -0.12 - outwardMovement)
              .normalize();
          }
          const targetAlignment = Math.max(0, actualMovementDirection.dot(moveDirection));
          const movementScale = 0.58 + targetAlignment * 0.42;
          root.position.addScaledVector(
            actualMovementDirection,
            Math.min(remaining, speed * delta * movementScale),
          );
          const boundedRadius = Math.hypot(root.position.x, root.position.z);
          if (boundedRadius > BUNNY.boundaryRadius) {
            root.position.x *= BUNNY.boundaryRadius / boundedRadius;
            root.position.z *= BUNNY.boundaryRadius / boundedRadius;
          }
        }
      }
      root.position.y = getHeightAt(root.position.x, root.position.z);

      if (mixer) {
        if (stage === "stopped" || stage === "captured") {
          mixer.timeScale += (0.035 - mixer.timeScale) * (1 - Math.exp(-7 * delta));
        } else {
          mixer.timeScale += (1 - mixer.timeScale) * (1 - Math.exp(-5 * delta));
        }
        mixer.update(delta);
      } else if (character && (stage === "running" || stage === "walking")) {
        character.rotation.z = Math.sin(time * (stage === "running" ? 12 : 5)) * 0.055;
      }

      hitPulse = Math.max(0, hitPulse - delta * 2.6);
      const ringMaterial = targetRing.material as THREE.MeshBasicMaterial;
      ringMaterial.color.set(hitPulse > 0 ? "#ff5d32" : stage === "stopped" ? "#d7e782" : "#efbc62");
      ringMaterial.opacity = 0.45 + Math.sin(time * 4) * 0.16 + hitPulse * 0.32;
      targetRing.scale.setScalar(1 + hitPulse * 0.5);
      updateRecord(time);
    },
    getHitPoint(target = hitPoint) {
      return target.copy(root.position).add(new THREE.Vector3(0, BUNNY.height * 0.52, 0));
    },
    dispose() {
      mixer?.stopAllAction();
      scene.remove(root);
      record?.removeFromParent();
      scene.remove(recordLight);
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
      record?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
    },
  };
}
