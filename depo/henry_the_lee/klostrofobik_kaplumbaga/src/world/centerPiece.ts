import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { ASSETS } from "../config";

export interface CenterPieceHandle {
  group: THREE.Group;
  colliders: THREE.Object3D[];
  ready: Promise<void>;
  update(time: number, delta: number): void;
  dispose(): void;
}

function loadFont(loader: FontLoader, url: string): Promise<Font> {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function patchTurkishGlyphs(font: Font): void {
  const glyphs = font.data.glyphs as Record<string, unknown>;
  if (!glyphs["Ğ"] && glyphs.G) glyphs["Ğ"] = { ...(glyphs.G as object) };
  if (!glyphs["İ"] && glyphs.I) glyphs["İ"] = { ...(glyphs.I as object) };
}

function stripMirroredBackCap(sourceGeometry: TextGeometry): THREE.BufferGeometry {
  const source = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry;
  const position = source.getAttribute("position");
  const normal = source.getAttribute("normal");
  const uv = source.getAttribute("uv");
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (let index = 0; index < position.count; index += 3) {
    const averageNormalZ =
      (normal.getZ(index) + normal.getZ(index + 1) + normal.getZ(index + 2)) / 3;
    if (averageNormalZ < -0.1) continue;
    for (let vertex = index; vertex < index + 3; vertex += 1) {
      positions.push(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
      normals.push(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex));
      if (uv) uvs.push(uv.getX(vertex), uv.getY(vertex));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  if (uvs.length > 0) geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingBox();
  if (source !== sourceGeometry) source.dispose();
  sourceGeometry.dispose();
  return geometry;
}

function createText(
  text: string,
  font: Font,
  options: {
    size: number;
    depth: number;
    spacing: number;
    color: string;
    emissive?: string;
  },
): THREE.Group {
  const line = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: options.color,
    emissive: options.emissive ?? "#000000",
    emissiveIntensity: options.emissive ? 0.34 : 0,
    roughness: 0.64,
    metalness: 0.12,
  });
  let cursor = 0;
  for (const character of Array.from(text)) {
    if (character === " ") {
      cursor += options.size * 0.48;
      continue;
    }
    const geometry = stripMirroredBackCap(new TextGeometry(character, {
      font,
      size: options.size,
      depth: options.depth,
      curveSegments: 7,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.012,
      bevelSegments: 2,
    }));
    const bounds = geometry.boundingBox;
    if (!bounds) continue;
    const width = bounds.max.x - bounds.min.x;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = cursor - bounds.min.x;
    mesh.castShadow = true;
    line.add(mesh);
    cursor += width + options.spacing;
  }
  const bounds = new THREE.Box3().setFromObject(line);
  const center = new THREE.Vector3();
  bounds.getCenter(center);
  line.children.forEach((child) => {
    child.position.x -= center.x;
    child.position.y -= center.y;
  });
  return line;
}

function createFallbackTurtle(): THREE.Group {
  const root = new THREE.Group();
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: "#45533a",
    roughness: 0.92,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: "#77825b",
    roughness: 0.88,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 16), shellMaterial);
  shell.scale.set(1, 0.48, 1.22);
  shell.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 14), skinMaterial);
  head.position.set(0, 2.25, 2.45);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 1.8, 16), skinMaterial);
  neck.rotation.x = Math.PI / 2.6;
  neck.position.set(0, 1.75, 1.8);
  root.add(shell, head, neck);
  return root;
}

function findUpperBodyAnchor(
  model: THREE.Group,
  bounds: THREE.Box3,
  height: number,
): THREE.Vector3 {
  model.updateMatrixWorld(true);
  const threshold = bounds.min.y + height * 0.8;
  const vertex = new THREE.Vector3();
  const sum = new THREE.Vector3();
  let count = 0;

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute("position");
    if (!position) return;
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
      if (vertex.y < threshold) continue;
      sum.add(vertex);
      count += 1;
    }
  });

  if (count === 0) return bounds.getCenter(new THREE.Vector3()).setY(bounds.max.y);
  return sum.multiplyScalar(1 / count);
}

function fitModel(model: THREE.Group, targetHeight: number): THREE.Vector3 {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const upperBodyAnchor = findUpperBodyAnchor(model, bounds, size.y);
  const scale = targetHeight / Math.max(0.001, size.y);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  return new THREE.Vector3(
    (upperBodyAnchor.x - center.x) * scale,
    (upperBodyAnchor.y - bounds.min.y) * scale,
    (upperBodyAnchor.z - center.z) * scale,
  );
}

function addReadableFromBothSides(
  frontRoot: THREE.Group,
  backRoot: THREE.Group,
  line: THREE.Group,
  y: number,
): void {
  line.position.set(0, y, 0.13);
  line.rotation.y = 0;
  frontRoot.add(line);

  const reverse = line.clone(true);
  reverse.position.set(0, y, -0.13);
  reverse.rotation.y = Math.PI;
  backRoot.add(reverse);
}

export function createCenterPiece(
  scene: THREE.Scene,
  manager: THREE.LoadingManager,
  camera: THREE.Camera,
  onModelProgress?: (value: number) => void,
): CenterPieceHandle {
  const root = new THREE.Group();
  const colliders: THREE.Object3D[] = [];
  root.name = "klostrofobik-center-piece";
  root.position.y = 2.9;
  scene.add(root);

  const turtleAnchor = new THREE.Group();
  root.add(turtleAnchor);
  const frontTextRoot = new THREE.Group();
  const backTextRoot = new THREE.Group();
  root.add(frontTextRoot, backTextRoot);
  backTextRoot.visible = false;
  const cameraPosition = new THREE.Vector3();
  const centerPosition = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const worldForward = new THREE.Vector3();
  const worldRotation = new THREE.Quaternion();

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(4.55, 0.08, 12, 120),
    new THREE.MeshBasicMaterial({
      color: "#df6b38",
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  );
  halo.position.y = 4.3;
  halo.rotation.x = Math.PI / 2;
  root.add(halo);

  const loader = new GLTFLoader(manager);
  const fontLoader = new FontLoader(manager);

  const modelPromise = new Promise<THREE.Group>((resolve) => {
    loader.load(
      ASSETS.turtleModel,
      (gltf) => resolve(gltf.scene),
      (event) => {
        if (event.total > 0) onModelProgress?.(event.loaded / event.total);
      },
      (error) => {
        console.warn("[Klostrofobik] Kaplumbağa modeli yüklenemedi, yedek form kullanılıyor.", error);
        resolve(createFallbackTurtle());
      },
    );
  });

  const ready = Promise.all([
    modelPromise,
    loadFont(fontLoader, ASSETS.fontBold),
    loadFont(fontLoader, ASSETS.fontRegular),
  ])
    .then(([model, bold, regular]) => {
      patchTurkishGlyphs(bold);
      patchTurkishGlyphs(regular);
      const headAnchor = fitModel(model, 7.6);
      model.rotation.y = Math.PI;
      headAnchor.applyAxisAngle(new THREE.Vector3(0, 1, 0), model.rotation.y);
      frontTextRoot.position.x = headAnchor.x;
      backTextRoot.position.x = headAnchor.x;
      frontTextRoot.position.y = 0.85;
      backTextRoot.position.y = 0.85;
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        colliders.push(object);
        object.castShadow = true;
        object.receiveShadow = true;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.roughness = Math.max(0.58, material.roughness);
            material.envMapIntensity = 0.42;
          }
        });
      });
      turtleAnchor.add(model);

      const title = createText("KLOSTROFOBİK", bold, {
        size: 0.8,
        depth: 0.19,
        spacing: 0.14,
        color: "#f5dfad",
        emissive: "#6e3217",
      });
      addReadableFromBothSides(frontTextRoot, backTextRoot, title, headAnchor.y + 3.45);

      const subtitle = createText("KAPLUMBAĞA", bold, {
        size: 1.0,
        depth: 0.23,
        spacing: 0.16,
        color: "#d76536",
        emissive: "#4a170a",
      });
      addReadableFromBothSides(frontTextRoot, backTextRoot, subtitle, headAnchor.y + 1.9);

      const artist = createText("HENRY THE LEE", regular, {
        size: 0.42,
        depth: 0.1,
        spacing: 0.18,
        color: "#d8bd78",
      });
      addReadableFromBothSides(frontTextRoot, backTextRoot, artist, headAnchor.y + 0.85);
      frontTextRoot.traverse((object) => {
        if (object instanceof THREE.Mesh) colliders.push(object);
      });
      backTextRoot.traverse((object) => {
        if (object instanceof THREE.Mesh) colliders.push(object);
      });
    })
    .catch((error) => {
      console.error("[Klostrofobik] Merkez kompozisyon kurulamadı.", error);
      const fallback = createFallbackTurtle();
      fallback.scale.setScalar(1.2);
      fallback.traverse((object) => {
        if (object instanceof THREE.Mesh) colliders.push(object);
      });
      turtleAnchor.add(fallback);
    });

  return {
    group: root,
    colliders,
    ready,
    update(time, delta) {
      root.rotation.y += delta * 0.055;
      camera.getWorldPosition(cameraPosition);
      root.getWorldPosition(centerPosition);
      root.getWorldQuaternion(worldRotation);
      toCamera.subVectors(cameraPosition, centerPosition).normalize();
      worldForward.set(0, 0, 1).applyQuaternion(worldRotation);
      const showFront = worldForward.dot(toCamera) >= 0;
      frontTextRoot.visible = showFront;
      backTextRoot.visible = !showFront;
      turtleAnchor.position.y = Math.sin(time * 0.62) * 0.2;
      halo.rotation.z -= delta * 0.11;
      const haloMaterial = halo.material as THREE.MeshBasicMaterial;
      haloMaterial.opacity = 0.48 + Math.sin(time * 1.1) * 0.12;
    },
    dispose() {
      scene.remove(root);
      root.traverse((object) => {
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
