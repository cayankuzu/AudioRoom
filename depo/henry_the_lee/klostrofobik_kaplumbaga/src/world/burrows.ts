import * as THREE from "three";

const TUNNEL_RADIUS = 1.28;
const ENTRANCE_RADIUS = 1.5;
const UNDERGROUND_Y = -5.45;
const FLOOR_OFFSET = TUNNEL_RADIUS - 0.13;
const SAMPLE_COUNT = 96;

export interface BurrowTravelPlan {
  id: number;
  entry: THREE.Vector3;
  exit: THREE.Vector3;
  stashPosition: THREE.Vector3;
  length: number;
  isNew: boolean;
  getFloorPosition(progress: number, target: THREE.Vector3): THREE.Vector3;
  getDirectionAt(progress: number, target: THREE.Vector3): THREE.Vector3;
}

export interface BurrowSnapshot {
  count: number;
  playerInside: boolean;
  activeTunnelId: number | null;
  sealedEnds: number;
  stashes: number;
  entrances: Array<[number, number, number]>;
}

export interface BurrowSystemHandle {
  readonly isPlayerInside: boolean;
  readonly entrances: readonly THREE.Vector3[];
  openTunnel(start: THREE.Vector3, end: THREE.Vector3): BurrowTravelPlan;
  findExistingTunnel(position: THREE.Vector3, maxDistance?: number): BurrowTravelPlan | null;
  revealExit(tunnelId: number, position: THREE.Vector3): void;
  markStash(tunnelId: number): void;
  isNearEntrance(position: THREE.Vector3, radius?: number): boolean;
  isUndergroundPosition(position: THREE.Vector3): boolean;
  resolveProjectile(
    position: THREE.Vector3,
    radius: number,
    collisionNormal: THREE.Vector3,
  ): boolean;
  tryEnter(position: THREE.Vector3, crouching: boolean, eyeHeight: number): boolean;
  debugPlacePlayerNear(
    targetPosition: THREE.Vector3,
    playerPosition: THREE.Vector3,
    eyeHeight: number,
  ): boolean;
  resolvePlayer(
    position: THREE.Vector3,
    eyeHeight: number,
    forwardInput?: number,
  ): "inside" | "exited";
  getActiveFloorHeight(): number | null;
  setDetail(detail: number): void;
  update(time: number, delta: number): void;
  snapshot(): BurrowSnapshot;
  dispose(): void;
}

interface Portal {
  position: THREE.Vector3;
  group: THREE.Group;
  revealed: boolean;
  revealedAt: number;
  cap: THREE.Mesh | null;
}

interface TunnelRoute {
  id: number;
  root: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  samples: THREE.Vector3[];
  portals: [Portal, Portal];
  stashPosition: THREE.Vector3;
  stashMarker: THREE.Group;
  age: number;
  hasStash: boolean;
}

function smoothstep(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function createTunnelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#4b2514");
    gradient.addColorStop(0.52, "#25130c");
    gradient.addColorStop(1, "#100b08");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    let seed = 73129;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 1800; i += 1) {
      const light = random() > 0.58;
      context.fillStyle = light
        ? `rgba(218, 139, 72, ${0.025 + random() * 0.075})`
        : `rgba(0, 0, 0, ${0.035 + random() * 0.12})`;
      const radius = 0.5 + random() * 3.2;
      context.beginPath();
      context.arc(random() * canvas.width, random() * canvas.height, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = "rgba(229, 148, 75, .08)";
    context.lineWidth = 2;
    for (let y = 26; y < canvas.height; y += 31) {
      context.beginPath();
      context.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 18) {
        context.lineTo(x, y + Math.sin(x * 0.045 + y) * 5);
      }
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4.5, 1.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBurrowSystem(
  scene: THREE.Scene,
  getHeightAt: (x: number, z: number) => number,
  initialDetail = 1,
): BurrowSystemHandle {
  const root = new THREE.Group();
  root.name = "rabbit-burrow-network";
  scene.add(root);

  const tunnelTexture = createTunnelTexture();
  const tunnelMaterial = new THREE.MeshStandardMaterial({
    color: "#5b2c18",
    map: tunnelTexture,
    roughness: 1,
    metalness: 0,
    emissive: "#271008",
    emissiveIntensity: 0.72,
    side: THREE.BackSide,
  });
  const darkMaterial = new THREE.MeshBasicMaterial({
    color: "#050302",
    side: THREE.DoubleSide,
  });
  const portalDarkMaterial = new THREE.MeshBasicMaterial({
    color: "#050302",
    side: THREE.FrontSide,
  });
  const soilMaterial = new THREE.MeshStandardMaterial({
    color: "#6f351a",
    roughness: 1,
    metalness: 0,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: "#a85b2c",
    emissive: "#311108",
    emissiveIntensity: 0.38,
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
  const ribMaterial = new THREE.MeshBasicMaterial({
    color: "#b76d38",
    transparent: true,
    opacity: 0.19,
    depthWrite: false,
  });
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: "#f0a052",
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  let detailLevel = THREE.MathUtils.clamp(initialDetail, 0.45, 1);
  const portalSegments = detailLevel < 0.7 ? 24 : detailLevel < 0.9 ? 32 : 40;
  const portalCircleGeometry = new THREE.CircleGeometry(1.34, portalSegments);
  const portalRingGeometry = new THREE.RingGeometry(1.12, 1.52, portalSegments);
  const portalTorusGeometry = new THREE.TorusGeometry(1.47, 0.2, 7, portalSegments);
  const clodGeometry = new THREE.DodecahedronGeometry(1, 0);
  const ribGeometry = new THREE.TorusGeometry(TUNNEL_RADIUS * 0.955, 0.025, 4, 14);
  const sealedEndGeometry = new THREE.CircleGeometry(TUNNEL_RADIUS * 0.985, 24);
  const tunnelSegmentGeometry = new THREE.CylinderGeometry(
    TUNNEL_RADIUS,
    TUNNEL_RADIUS,
    1,
    detailLevel < 0.65 ? 6 : detailLevel < 0.9 ? 8 : 10,
    1,
    true,
  );
  const tangentAxis = new THREE.Vector3(0, 0, 1);
  const prewarmGeometry = new THREE.TetrahedronGeometry(0.001, 0);
  const prewarmRoot = new THREE.Group();
  const tunnelPrewarm = new THREE.Mesh(tunnelSegmentGeometry, tunnelMaterial);
  tunnelPrewarm.scale.setScalar(0.0001);
  tunnelPrewarm.frustumCulled = false;
  prewarmRoot.add(tunnelPrewarm);
  [portalDarkMaterial, soilMaterial, rimMaterial, ribMaterial, markerMaterial].forEach(
    (material) => {
      const mesh = new THREE.Mesh(prewarmGeometry, material);
      mesh.scale.setScalar(0.0001);
      mesh.frustumCulled = false;
      prewarmRoot.add(mesh);
    },
  );
  root.add(prewarmRoot);
  let prewarmFrames = 2;

  const routes: TunnelRoute[] = [];
  const entrancePositions: THREE.Vector3[] = [];
  const closestPoint = new THREE.Vector3();
  const lateral = new THREE.Vector3();
  const desiredMovement = new THREE.Vector3();
  const tunnelTangent = new THREE.Vector3();
  const lastPlayerPosition = new THREE.Vector3();
  const projectileOffset = new THREE.Vector3();
  let nextId = 1;
  let activeRoute: TunnelRoute | null = null;
  let activeFloorHeight: number | null = null;
  let activeProgress = 0;
  let activeCurveLength = 1;
  let activeForwardDirection: 1 | -1 = 1;
  let transitionCooldown = 0;

  const createPortal = (position: THREE.Vector3, revealed: boolean): Portal => {
    const group = new THREE.Group();
    group.name = "rabbit-hole";
    group.position.copy(position);
    group.scale.setScalar(0.04);

    const darkness = new THREE.Mesh(
      portalCircleGeometry,
      portalDarkMaterial,
    );
    darkness.rotation.x = -Math.PI / 2;
    darkness.position.y = 0.035;
    darkness.scale.z = 0.72;
    group.add(darkness);

    const innerRim = new THREE.Mesh(portalRingGeometry, rimMaterial);
    innerRim.rotation.x = -Math.PI / 2;
    innerRim.position.y = 0.052;
    innerRim.scale.z = 0.72;
    group.add(innerRim);

    const crater = new THREE.Mesh(portalTorusGeometry, soilMaterial);
    crater.rotation.x = Math.PI / 2;
    crater.scale.z = 0.72;
    crater.position.y = 0.08;
    crater.castShadow = true;
    crater.receiveShadow = true;
    group.add(crater);

    const clodCount = Math.round(8 + detailLevel * 5);
    for (let index = 0; index < clodCount; index += 1) {
      const angle = (index / clodCount) * Math.PI * 2 + Math.random() * 0.16;
      const clod = new THREE.Mesh(clodGeometry, soilMaterial);
      clod.scale.setScalar(0.1 + Math.random() * 0.16);
      const radius = 1.38 + Math.random() * 0.42;
      clod.position.set(
        Math.cos(angle) * radius,
        0.12 + Math.random() * 0.16,
        Math.sin(angle) * radius * 0.72,
      );
      clod.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      clod.castShadow = true;
      group.add(clod);
    }

    group.visible = revealed;
    root.add(group);
    return {
      position,
      group,
      revealed,
      revealedAt: revealed ? 0 : Number.POSITIVE_INFINITY,
      cap: null,
    };
  };

  const nearestSample = (route: TunnelRoute, position: THREE.Vector3) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < route.samples.length; index += 1) {
      const sample = route.samples[index];
      const distance = sample.distanceToSquared(position);
      if (distance >= bestDistance) continue;
      bestDistance = distance;
      bestIndex = index;
    }
    return bestIndex;
  };

  const exitTunnel = (
    route: TunnelRoute,
    side: 0 | 1,
    position: THREE.Vector3,
    eyeHeight: number,
  ) => {
    const lastIndex = route.samples.length - 1;
    const endpoint = route.portals[side].position;
    const inside = route.samples[side === 0 ? 2 : lastIndex - 2];
    lateral.set(endpoint.x - inside.x, 0, endpoint.z - inside.z);
    if (lateral.lengthSq() < 0.001) lateral.set(0, 0, 1);
    lateral.normalize();
    position.set(
      endpoint.x + lateral.x * 1.95,
      endpoint.y + eyeHeight,
      endpoint.z + lateral.z * 1.95,
    );
    activeRoute = null;
    activeFloorHeight = null;
    transitionCooldown = 1.1;
    document.body.classList.remove("is-in-tunnel");
  };

  const revealPortal = (route: TunnelRoute, side: 0 | 1) => {
    const portal = route.portals[side];
    if (portal.revealed) return;
    portal.revealed = true;
    portal.revealedAt = route.age;
    portal.cap && (portal.cap.visible = false);
    if (!entrancePositions.includes(portal.position)) {
      entrancePositions.push(portal.position);
    }
  };

  const createTravelPlan = (
    route: TunnelRoute,
    reverse: boolean,
    isNew: boolean,
  ): BurrowTravelPlan => {
    const entry = route.portals[reverse ? 1 : 0].position;
    const exit = route.portals[reverse ? 0 : 1].position;
    const length = Math.max(1, route.curve.getLength());
    return {
      id: route.id,
      entry: entry.clone(),
      exit: exit.clone(),
      stashPosition: route.stashPosition.clone(),
      length,
      isNew,
      getFloorPosition(progress, target) {
        const t = THREE.MathUtils.clamp(progress, 0, 1);
        route.curve.getPointAt(reverse ? 1 - t : t, target);
        target.y -= FLOOR_OFFSET;
        return target;
      },
      getDirectionAt(progress, target) {
        const t = THREE.MathUtils.clamp(progress, 0, 1);
        route.curve.getTangentAt(reverse ? 1 - t : t, target);
        if (reverse) target.negate();
        target.y = 0;
        if (target.lengthSq() < 0.0001) target.set(0, 0, 1);
        return target.normalize();
      },
    };
  };

  return {
    get isPlayerInside() {
      return activeRoute !== null;
    },
    get entrances() {
      return entrancePositions;
    },
    findExistingTunnel(position, maxDistance = 200) {
      const candidates: Array<{
        route: TunnelRoute;
        side: 0 | 1;
        distance: number;
      }> = [];
      for (const route of routes) {
        for (const side of [0, 1] as const) {
          if (!route.portals[side].revealed) continue;
          const portal = route.portals[side].position;
          const distance = Math.hypot(portal.x - position.x, portal.z - position.z);
          if (distance <= maxDistance) candidates.push({ route, side, distance });
        }
      }
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => a.distance - b.distance);
      const nearby = candidates.slice(0, Math.min(3, candidates.length));
      const selected = nearby[Math.floor(Math.random() * nearby.length)];
      return createTravelPlan(selected.route, selected.side === 1, false);
    },
    revealExit(tunnelId, position) {
      const route = routes.find((candidate) => candidate.id === tunnelId);
      if (!route) return;
      const firstDistance = route.portals[0].position.distanceToSquared(position);
      const secondDistance = route.portals[1].position.distanceToSquared(position);
      revealPortal(route, firstDistance <= secondDistance ? 0 : 1);
    },
    openTunnel(start, end) {
      const id = nextId;
      nextId += 1;
      const routeRoot = new THREE.Group();
      routeRoot.name = `rabbit-tunnel-${id}`;
      root.add(routeRoot);

      const entry = new THREE.Vector3(start.x, getHeightAt(start.x, start.z) + 0.025, start.z);
      const exit = new THREE.Vector3(end.x, getHeightAt(end.x, end.z) + 0.025, end.z);
      const dx = exit.x - entry.x;
      const dz = exit.z - entry.z;
      const distance = Math.max(1, Math.hypot(dx, dz));
      const perpendicularX = -dz / distance;
      const perpendicularZ = dx / distance;
      const bendSide = Math.random() > 0.5 ? 1 : -1;
      const bendStrength = Math.min(9, distance * (0.12 + Math.random() * 0.18));
      const waveCount = Math.random() < 0.58 ? 1 : 2;
      const phase = (Math.random() - 0.5) * 0.85;
      const intermediateCount = 2 + Math.floor(Math.random() * 4);
      const points: THREE.Vector3[] = [
        new THREE.Vector3(entry.x, entry.y - 0.08, entry.z),
        new THREE.Vector3(entry.x, UNDERGROUND_Y + 1.15, entry.z),
      ];
      for (let index = 1; index <= intermediateCount; index += 1) {
        const t = index / (intermediateCount + 1);
        const envelope = Math.sin(Math.PI * t);
        const wave = Math.sin(t * Math.PI * waveCount + phase);
        const lateralOffset = bendSide * bendStrength * envelope * wave;
        points.push(
          new THREE.Vector3(
            entry.x + dx * t + perpendicularX * lateralOffset,
            UNDERGROUND_Y - 0.18 - Math.sin(Math.PI * t) * (0.25 + Math.random() * 0.8),
            entry.z + dz * t + perpendicularZ * lateralOffset,
          ),
        );
      }
      points.push(
        new THREE.Vector3(exit.x, UNDERGROUND_Y + 1.15, exit.z),
        new THREE.Vector3(exit.x, exit.y - 0.08, exit.z),
      );
      const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.46);
      const curveLength = Math.max(1, curve.getLength());
      const segments = Math.max(34, Math.ceil(curveLength * (1.4 + detailLevel * 0.9)));
      const radialSegments = detailLevel < 0.65 ? 6 : detailLevel < 0.9 ? 8 : 10;
      const tunnel = new THREE.Mesh(
        new THREE.TubeGeometry(curve, segments, TUNNEL_RADIUS, radialSegments, false),
        tunnelMaterial,
      );
      tunnel.name = "tunnel-interior";
      routeRoot.add(tunnel);

      const ribCount = Math.max(4, Math.floor(curveLength / (detailLevel < 0.7 ? 8 : 6)));
      for (let index = 1; index < ribCount; index += 1) {
        const t = index / ribCount;
        const rib = new THREE.Mesh(ribGeometry, ribMaterial);
        rib.position.copy(curve.getPointAt(t));
        rib.quaternion.setFromUnitVectors(
          tangentAxis,
          curve.getTangentAt(t).normalize(),
        );
        routeRoot.add(rib);
      }

      const samples = Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) =>
        curve.getPointAt(index / SAMPLE_COUNT),
      );
      const stashCenter = curve.getPointAt(0.5);
      const stashPosition = stashCenter.clone();
      stashPosition.y -= FLOOR_OFFSET - 0.1;
      const stashMarker = new THREE.Group();
      stashMarker.position.copy(stashPosition);
      stashMarker.visible = false;
      const marker = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.56, 32), markerMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.025;
      stashMarker.add(marker);
      routeRoot.add(stashMarker);
      const portals: [Portal, Portal] = [
        createPortal(entry, true),
        createPortal(exit, false),
      ];
      const exitCap = new THREE.Mesh(
        sealedEndGeometry,
        darkMaterial,
      );
      exitCap.name = "sealed-tunnel-end";
      exitCap.position.copy(curve.getPointAt(1));
      exitCap.quaternion.setFromUnitVectors(
        tangentAxis,
        curve.getTangentAt(1).normalize(),
      );
      exitCap.position.addScaledVector(curve.getTangentAt(1).normalize(), -0.025);
      routeRoot.add(exitCap);
      portals[1].cap = exitCap;
      entrancePositions.push(entry);
      const route: TunnelRoute = {
        id,
        root: routeRoot,
        curve,
        samples,
        portals,
        stashPosition,
        stashMarker,
        age: 0,
        hasStash: false,
      };
      routes.push(route);
      return createTravelPlan(route, false, true);
    },
    markStash(tunnelId) {
      const route = routes.find((candidate) => candidate.id === tunnelId);
      if (!route) return;
      route.hasStash = true;
      route.stashMarker.visible = true;
    },
    isNearEntrance(position, radius = 3.4) {
      return entrancePositions.some(
        (entrance) =>
          Math.hypot(entrance.x - position.x, entrance.z - position.z) <= radius &&
          Math.abs(entrance.y - (position.y - 1.08)) < 2.2,
      );
    },
    isUndergroundPosition(position) {
      return position.y < -2.25;
    },
    resolveProjectile(position, radius, collisionNormal) {
      if (routes.length === 0) return false;
      let bestRoute: TunnelRoute | null = null;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const route of routes) {
        const index = nearestSample(route, position);
        const sample = route.samples[index];
        const distance = sample.distanceToSquared(position);
        if (distance >= bestDistance) continue;
        bestDistance = distance;
        bestRoute = route;
        bestIndex = index;
      }
      if (!bestRoute) return false;
      if (bestDistance > (TUNNEL_RADIUS + radius + 0.45) ** 2) return false;
      const previousIndex = Math.max(0, bestIndex - 1);
      const nextIndex = Math.min(bestRoute.samples.length - 1, bestIndex + 1);
      tunnelTangent
        .subVectors(bestRoute.samples[nextIndex], bestRoute.samples[previousIndex])
        .normalize();
      const sample = bestRoute.samples[bestIndex];
      projectileOffset.subVectors(position, sample);
      const lastIndex = bestRoute.samples.length - 1;
      if (bestIndex <= 1 && !bestRoute.portals[0].revealed) {
        const axialDistance = projectileOffset.dot(tunnelTangent);
        if (axialDistance < radius) {
          collisionNormal.copy(tunnelTangent);
          position.addScaledVector(collisionNormal, radius - axialDistance + 0.004);
          return true;
        }
      } else if (
        bestIndex >= lastIndex - 1 &&
        !bestRoute.portals[1].revealed
      ) {
        const axialDistance = projectileOffset.dot(tunnelTangent);
        if (axialDistance > -radius) {
          collisionNormal.copy(tunnelTangent).negate();
          position.addScaledVector(collisionNormal, axialDistance + radius + 0.004);
          return true;
        }
      }
      projectileOffset.addScaledVector(
        tunnelTangent,
        -projectileOffset.dot(tunnelTangent),
      );
      const radialDistance = projectileOffset.length();
      const allowedRadius = TUNNEL_RADIUS - radius;
      if (radialDistance <= allowedRadius || radialDistance < 0.0001) return false;
      collisionNormal.copy(projectileOffset).multiplyScalar(-1 / radialDistance);
      position.addScaledVector(collisionNormal, radialDistance - allowedRadius + 0.004);
      return true;
    },
    tryEnter(position, crouching, eyeHeight) {
      if (activeRoute || !crouching || transitionCooldown > 0) return false;
      let candidate: { route: TunnelRoute; side: 0 | 1; distance: number } | null = null;
      for (const route of routes) {
        for (const side of [0, 1] as const) {
          if (!route.portals[side].revealed) continue;
          const entrance = route.portals[side].position;
          const distance = Math.hypot(entrance.x - position.x, entrance.z - position.z);
          if (distance > ENTRANCE_RADIUS || (candidate && distance >= candidate.distance)) continue;
          candidate = { route, side, distance };
        }
      }
      if (!candidate) return false;
      activeRoute = candidate.route;
      activeProgress = candidate.side === 0 ? 0.018 : 0.982;
      activeForwardDirection = candidate.side === 0 ? 1 : -1;
      activeCurveLength = Math.max(1, candidate.route.curve.getLength());
      const sample = candidate.route.curve.getPointAt(activeProgress);
      activeFloorHeight = sample.y - FLOOR_OFFSET;
      position.set(sample.x, activeFloorHeight + eyeHeight, sample.z);
      lastPlayerPosition.copy(position);
      transitionCooldown = 1.15;
      document.body.classList.add("is-in-tunnel");
      return true;
    },
    debugPlacePlayerNear(targetPosition, playerPosition, eyeHeight) {
      if (routes.length === 0) return false;
      let candidateRoute: TunnelRoute | null = null;
      let candidateIndex = 0;
      let candidateDistance = Number.POSITIVE_INFINITY;
      for (const route of routes) {
        const index = nearestSample(route, targetPosition);
        const distance = route.samples[index].distanceToSquared(targetPosition);
        if (distance >= candidateDistance) continue;
        candidateRoute = route;
        candidateIndex = index;
        candidateDistance = distance;
      }
      if (!candidateRoute) return false;
      activeRoute = candidateRoute;
      activeProgress = THREE.MathUtils.clamp(
        candidateIndex / SAMPLE_COUNT - 0.075,
        0.025,
        0.975,
      );
      activeCurveLength = Math.max(1, candidateRoute.curve.getLength());
      activeForwardDirection = 1;
      const sample = candidateRoute.curve.getPointAt(activeProgress, closestPoint);
      activeFloorHeight = sample.y - FLOOR_OFFSET;
      playerPosition.set(sample.x, activeFloorHeight + eyeHeight, sample.z);
      lastPlayerPosition.copy(playerPosition);
      transitionCooldown = 0.8;
      document.body.classList.add("is-in-tunnel");
      return true;
    },
    resolvePlayer(position, eyeHeight, forwardInput = 0) {
      if (!activeRoute) return "exited";
      const route = activeRoute;
      desiredMovement.subVectors(position, lastPlayerPosition).setY(0);
      const movementLength = desiredMovement.length();
      if (movementLength > 0.0001) {
        tunnelTangent.copy(route.curve.getTangentAt(activeProgress)).setY(0);
        const hasHorizontalTangent = tunnelTangent.lengthSq() > 0.001;
        if (hasHorizontalTangent) tunnelTangent.normalize();
        const projectedMovement = hasHorizontalTangent
          ? desiredMovement.dot(tunnelTangent)
          : 0;
        const alongTunnel = Math.abs(forwardInput) > 0.01
          ? movementLength * Math.sign(forwardInput) * activeForwardDirection
          : projectedMovement;
        activeProgress = THREE.MathUtils.clamp(
          activeProgress + alongTunnel / activeCurveLength,
          0,
          1,
        );
      }
      if (!route.portals[0].revealed && activeProgress < 0.018) {
        activeProgress = 0.018;
      }
      if (!route.portals[1].revealed && activeProgress > 0.982) {
        activeProgress = 0.982;
      }
      const sample = route.curve.getPointAt(activeProgress, closestPoint);
      position.x = sample.x;
      position.z = sample.z;
      activeFloorHeight = sample.y - FLOOR_OFFSET;
      position.y = activeFloorHeight + eyeHeight;
      lastPlayerPosition.copy(position);

      if (transitionCooldown <= 0) {
        if (route.portals[0].revealed && activeProgress <= 0.012) {
          exitTunnel(route, 0, position, eyeHeight);
          return "exited";
        }
        if (route.portals[1].revealed && activeProgress >= 0.988) {
          exitTunnel(route, 1, position, eyeHeight);
          return "exited";
        }
      }
      return "inside";
    },
    getActiveFloorHeight() {
      return activeFloorHeight;
    },
    setDetail(detail) {
      detailLevel = THREE.MathUtils.clamp(detail, 0.45, 1);
    },
    update(time, delta) {
      if (prewarmFrames > 0) {
        prewarmFrames -= 1;
        if (prewarmFrames === 0) prewarmRoot.visible = false;
      }
      transitionCooldown = Math.max(0, transitionCooldown - delta);
      for (const route of routes) {
        route.age += delta;
        for (const portal of route.portals) {
          if (!portal.revealed) {
            portal.group.visible = false;
            continue;
          }
          const growth = smoothstep((route.age - portal.revealedAt) / 0.72);
          portal.group.visible = growth > 0;
          portal.group.scale.set(growth, growth, growth);
          portal.group.rotation.y = Math.sin(time * 0.38 + route.id) * 0.035;
        }
        if (route.hasStash) {
          route.stashMarker.rotation.y = time * 0.7;
        }
      }
    },
    snapshot() {
      return {
        count: routes.length,
        playerInside: activeRoute !== null,
        activeTunnelId: activeRoute?.id ?? null,
        sealedEnds: routes.reduce(
          (total, route) =>
            total + route.portals.filter((portal) => !portal.revealed).length,
          0,
        ),
        stashes: routes.filter((route) => route.hasStash).length,
        entrances: entrancePositions.map((position) => [position.x, position.y, position.z]),
      };
    },
    dispose() {
      document.body.classList.remove("is-in-tunnel");
      root.removeFromParent();
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
      });
      tunnelTexture.dispose();
      tunnelMaterial.dispose();
      darkMaterial.dispose();
      portalDarkMaterial.dispose();
      soilMaterial.dispose();
      rimMaterial.dispose();
      ribMaterial.dispose();
      markerMaterial.dispose();
      routes.length = 0;
      entrancePositions.length = 0;
    },
  };
}
