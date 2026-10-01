import * as THREE from "three";
import type { Player } from "../../engine/core/player";
import { glowSprite } from "../../engine/fx/glow";
import type { Burrow } from "./rabbit";

/**
 * Tavşan tünelleri: zemindeki delikler gerçek birer ağızdır. Deliğe girince
 * dikey bir hunide aşağı kayarsın, fenerinin ışığında dar, köklü bir toprak
 * tünelde sürünürsün ve karşı deliğin gün ışığına tırmanarak çıkarsın.
 * Hareket tünelin eksenine bağlıdır (ray): W bakılan yöne doğru ilerletir,
 * geri dönmek serbesttir. Işınlanma yoktur; her geçiş kesintisizdir.
 */
export const TUNNEL_RADIUS = 1.25;
const EYE = 0.9;
const SHAFT = 1.6;
const CRAWL = 2.3;

export interface Tunnel {
  from: Burrow;
  to: Burrow;
  curve: THREE.CatmullRomCurve3;
  length: number;
  /** Tünelin genel yatay yönü (from → to). */
  heading: THREE.Vector2;
}

type Phase = { kind: "enter"; t: number; start: THREE.Vector3 } | { kind: "crawl" } | { kind: "exit"; t: number; end: THREE.Vector3; at: Burrow };

export interface Tunnels {
  readonly group: THREE.Group;
  readonly tunnels: Tunnel[];
  /** İçerideyse oyuncunun bulunduğu tünel. */
  readonly current: Tunnel | null;
  /** 0 (yüzeyde) … 1 (tamamen yer altında): ışık ve ses geçişleri için. */
  readonly depth: number;
  /** Oyuncunun ayak yüksekliği (tüneldeyken). */
  floor(): number;
  mouthNear(x: number, z: number, distance: number): Burrow | null;
  /**
   * Tavşanın kazdığı yeni ağızdan (from) en yakın yuvaya (to) gerçek, girilebilir bir tünel açar.
   * En çok dört kazılmış tünel kalır; en eskisi (içinde değilsen) kapanır. Açık kazılmış ağızları döndürür.
   */
  dig(from: Burrow, to: Burrow): Burrow[];
  enter(burrow: Burrow): void;
  /** Her kare, oyuncu güncellemesinden sonra: ray üzerinde tutar; çıkışta çıkılan deliği döndürür. */
  update(dt: number, player: Player, forward: THREE.Vector3, axis: number, lantern: THREE.PointLight): Burrow | null;
}

/** Toprak dokusu: çakıl, kök lifleri, nem lekeleri. */
function dirtTexture(random: () => number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#5a3a1e";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i += 1) {
    const shade = 40 + random() * 60;
    g.fillStyle = `rgba(${shade + 40},${shade + 10},${shade - 20},${0.25 + random() * 0.4})`;
    g.beginPath();
    g.arc(random() * 256, random() * 256, 0.6 + random() * 2.6, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = "rgba(200,160,110,0.35)";
  g.lineCap = "round";
  for (let i = 0; i < 22; i += 1) {
    let x = random() * 256;
    let y = random() * 256;
    g.lineWidth = 0.6 + random() * 1.8;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 6; k += 1) {
      x += (random() - 0.5) * 30;
      y += 8 + random() * 14;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Toprak duvar: sahnenin güneşinden etkilenmez (yer altında güneş olmaz). Işık
 * yalnızca üç kaynaktan gelir: oyuncunun feneri, ağızlardan sızan gün ışığı ve
 * tavşan odasındaki mum. Böylece delik yukarıdan gerçek bir karanlık gibi görünür.
 */
function earthMaterial(map: THREE.Texture, repeat: THREE.Vector2, lights: EarthLights): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uMap: { value: map },
      uRepeat: { value: repeat },
      uLantern: lights.lantern,
      uCandle: lights.candle,
    },
    vertexShader: /* glsl */ `
      attribute float shade;
      uniform vec2 uRepeat;
      varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormalW; varying float vShade;
      void main() {
        vUv = uv * uRepeat;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vShade = shade;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uLantern; uniform vec4 uCandle;
      varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormalW; varying float vShade;
      void main() {
        vec3 base = texture2D(uMap, vUv).rgb * vShade;
        vec3 toCam = cameraPosition - vWorld;
        float d = length(toCam);
        float facing = 0.45 + 0.55 * abs(dot(normalize(vNormalW), toCam / max(d, 0.001)));
        float lantern = uLantern / (1.0 + d * d * 0.14);
        float day = smoothstep(-2.6, 0.3, vWorld.y) * 0.95;
        float cd = length(uCandle.xyz - vWorld);
        float candle = uCandle.w / (1.0 + cd * cd * 0.35);
        vec3 light = vec3(1.0, 0.8, 0.56) * lantern + vec3(1.0, 0.95, 0.85) * day + vec3(1.0, 0.62, 0.3) * candle;
        gl_FragColor = vec4(base * (light * facing + 0.025), 1.0);
      }
    `,
  });
}

interface EarthLights {
  lantern: { value: number };
  candle: { value: THREE.Vector4 };
}

function buildCurve(a: Burrow, b: Burrow, wiggle: number): THREE.CatmullRomCurve3 {
  const heading = new THREE.Vector2(b.x - a.x, b.z - a.z);
  const length = heading.length();
  heading.normalize();
  const side = new THREE.Vector2(-heading.y, heading.x);
  const at = (d: number, lateral: number, y: number) =>
    new THREE.Vector3(a.x + heading.x * d + side.x * lateral, y, a.z + heading.y * d + side.y * lateral);
  const points = [
    // Ağız: dikey huni, sonra tünel yatıklaşır.
    at(0, 0, 0.1),
    at(0, 0, -SHAFT * 0.6),
    at(0.9, 0, -SHAFT - 0.6),
    at(2.6, 0, -3.1),
  ];
  const inner = Math.max(2, Math.round((length - 5.2) / 5));
  for (let k = 1; k < inner; k += 1) {
    const t = k / inner;
    points.push(at(2.6 + t * (length - 5.2), Math.sin(t * Math.PI * 2) * wiggle, -3.3 - Math.sin(t * Math.PI) * 0.8));
  }
  points.push(at(length - 2.6, 0, -3.1), at(length - 0.9, 0, -SHAFT - 0.6), at(length, 0, -SHAFT * 0.6), at(length, 0, 0.1));
  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

export function createTunnels(burrows: Burrow[], random: () => number): Tunnels {
  const group = new THREE.Group();
  const texture = dirtTexture(random);
  const lights: EarthLights = { lantern: { value: 0 }, candle: { value: new THREE.Vector4(0, -100, 0, 0) } };
  const material = earthMaterial(texture, new THREE.Vector2(18, 2), lights);
  const pairs: Array<[number, number, number]> = [
    [0, 2, 1.8],
    [1, 3, 2.4],
  ];
  /** Bir tünel (ve süsleri) kendi grubunda kurulur: kazılan tüneller sonradan kaldırılabilsin. */
  const holders = new Map<Tunnel, THREE.Group>();
  const buildTunnel = (from: Burrow, to: Burrow, wiggle: number): Tunnel => {
    const holder = new THREE.Group();
    group.add(holder);
    const curve = buildCurve(from, to, wiggle);
    const length = curve.getLength();
    const segments = Math.round(length * 3);
    const geometry = new THREE.TubeGeometry(curve, segments, TUNNEL_RADIUS, 14, false);
    // Organik duvar: yarıçapı biraz oynat; derinlere indikçe toprak koyulaşır (ağızda gün ışığı).
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const shades = new Float32Array(position.count);
    const point = new THREE.Vector3();
    const center = new THREE.Vector3();
    const ring = 15;
    for (let v = 0; v < position.count; v += 1) {
      const step = Math.floor(v / ring);
      const around = (v % ring) % (ring - 1); // halkanın ilk ve son köşesi aynı noktada: dikiş açılmasın
      const u = step / segments;
      curve.getPointAt(Math.min(1, u), center);
      point.fromBufferAttribute(position, v);
      const offset = point.clone().sub(center);
      const bump = 1 + 0.07 * Math.sin(step * 0.9 + around * 2.1) + 0.05 * Math.sin(step * 0.23 - around * 0.9);
      point.copy(center).addScaledVector(offset, bump);
      position.setXYZ(v, point.x, point.y, point.z);
      // Nem lekeleri: duvar yer yer koyulaşır.
      shades[v] = 0.75 + 0.25 * Math.sin(step * 0.31 + around * 0.7) * Math.sin(step * 0.07);
    }
    geometry.setAttribute("shade", new THREE.BufferAttribute(shades, 1));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    holder.add(mesh);

    // Tavandan sarkan kökler ve ışıldayan mantarlar: yolu okunur kılar, tüneli canlandırır.
    const rootMaterial = new THREE.MeshStandardMaterial({ color: "#8a6a44", roughness: 1 });
    const capMaterial = new THREE.MeshStandardMaterial({ color: "#ffe2a8", emissive: "#ffb24a", emissiveIntensity: 1.6 });
    for (let k = 1; k < 9; k += 1) {
      const u = 0.12 + (k / 9) * 0.76;
      const c = curve.getPointAt(u);
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.5 + random() * 0.6, 5), rootMaterial);
      root.position.set(c.x + (random() - 0.5) * 0.8, c.y + TUNNEL_RADIUS - 0.4, c.z + (random() - 0.5) * 0.8);
      root.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMaterial);
      const side = random() < 0.5 ? -1 : 1;
      const tangent = curve.getTangentAt(u);
      const lateral = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(side * 1.0);
      cap.position.copy(c).add(lateral).setY(c.y - TUNNEL_RADIUS + 0.32);
      const glow = glowSprite("#ffb24a", 0.45);
      glow.position.copy(cap.position);
      holder.add(root, cap, glow);
    }
    const tunnel: Tunnel = {
      from,
      to,
      curve,
      length,
      heading: new THREE.Vector2(to.x - from.x, to.z - from.z).normalize(),
    };
    holders.set(tunnel, holder);
    return tunnel;
  };
  const tunnels: Tunnel[] = pairs.map(([i, j, wiggle]) => buildTunnel(burrows[i], burrows[j], wiggle));

  // Ağızlardaki gün ışığı: yalnızca aşağıdan bakınca görünen aydınlık bir hale.
  const daylight = burrows.map((burrow) => {
    const light = glowSprite("#fff4d6", 3.2);
    light.position.set(burrow.x, -0.6, burrow.z);
    group.add(light);
    return light;
  });

  const dug: Array<{ mouth: Burrow; tunnel: Tunnel; light: THREE.Sprite }> = [];
  let current: Tunnel | null = null;
  let u = 0;
  let phase: Phase | null = null;
  let floor = 0;
  let depth = 0;
  const rail = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  const place = (target: THREE.Vector3, param: number) => {
    // Kamera yatay kesimde tünelin tabanına yakın, dikey hunide eksende durur.
    current!.curve.getPointAt(param, rail);
    current!.curve.getTangentAt(param, tangent);
    const flatness = Math.sqrt(Math.max(0, 1 - tangent.y * tangent.y));
    const eyeY = rail.y - (TUNNEL_RADIUS - EYE - 0.05) * flatness;
    return target.set(rail.x, eyeY - EYE, rail.z);
  };

  const tunnelsApi: Tunnels = {
    group,
    tunnels,
    get current() {
      return current;
    },
    get depth() {
      return depth;
    },
    floor: () => floor,
    mouthNear(x, z, distance) {
      return [...burrows, ...dug.map((d) => d.mouth)].find((b) => Math.hypot(b.x - x, b.z - z) < distance) ?? null;
    },
    dig(from, to) {
      if (dug.length >= 4) {
        const index = dug.findIndex((d) => d.tunnel !== current);
        if (index >= 0) {
          const [old] = dug.splice(index, 1);
          const holder = holders.get(old.tunnel);
          if (holder) group.remove(holder);
          holders.delete(old.tunnel);
          tunnels.splice(tunnels.indexOf(old.tunnel), 1);
          group.remove(old.light);
          daylight.splice(daylight.indexOf(old.light), 1);
        }
      }
      const tunnel = buildTunnel(from, to, 0.7);
      tunnels.push(tunnel);
      const light = glowSprite("#fff4d6", 3.2);
      light.position.set(from.x, -0.6, from.z);
      group.add(light);
      daylight.push(light);
      dug.push({ mouth: from, tunnel, light });
      return dug.map((d) => d.mouth);
    },
    enter(burrow) {
      if (current) return;
      const tunnel = tunnels.find((t) => t.from === burrow || t.to === burrow);
      if (!tunnel) return;
      current = tunnel;
      u = tunnel.from === burrow ? 0 : 1;
      phase = { kind: "enter", t: 0, start: new THREE.Vector3() };
    },
    update(dt, player, forward, axis, lantern) {
      if (!current || !phase) {
        depth = Math.max(0, depth - dt * 2);
        lantern.intensity = depth * 14;
        lights.lantern.value = depth * 2.2;
        daylight.forEach((sprite) => (sprite.material.opacity = depth));
        return null;
      }
      const tunnel = current;
      const towardEnd = u < 0.5;
      let exited: Burrow | null = null;
      const target = new THREE.Vector3();

      if (phase.kind === "enter") {
        // Ağızdan huninin dibine kayış: ayak kayar, göz alçalır, düşüş sesi dünyaya ait.
        if (phase.t === 0) phase.start.copy(player.position);
        phase.t += dt / 0.9;
        const k = Math.min(1, phase.t);
        const slide = towardEnd ? k * 0.09 : 1 - k * 0.09;
        place(target, slide);
        const mix = k * k * (3 - 2 * k);
        player.position.lerpVectors(phase.start, target, mix);
        player.options.eyeHeight = THREE.MathUtils.lerp(1.7, EYE, mix);
        if (k >= 1) {
          u = slide;
          phase = { kind: "crawl" };
        }
      } else if (phase.kind === "crawl") {
        // W: bakılan yöne (tünelin genel doğrultusuna göre) sürün; S: geri.
        const facing = forward.x * tunnel.heading.x + forward.z * tunnel.heading.y;
        const sign = Math.abs(facing) < 0.15 ? 0 : Math.sign(facing);
        u = THREE.MathUtils.clamp(u + (sign * axis * CRAWL * dt) / tunnel.length, 0, 1);
        place(target, u);
        player.position.copy(target);
        if (u >= 0.985 || u <= 0.015) {
          const at = u > 0.5 ? tunnel.to : tunnel.from;
          const out = u > 0.5 ? 1 : -1;
          // Deliğin kenarına tırmanış: tünelin doğrultusunda, ağızdan dışarı.
          const end = new THREE.Vector3(at.x + tunnel.heading.x * out * 2.1, 0, at.z + tunnel.heading.y * out * 2.1);
          phase = { kind: "exit", t: 0, end, at };
        }
      } else {
        phase.t += dt / 0.8;
        const k = Math.min(1, phase.t);
        place(target, u);
        const mix = k * k * (3 - 2 * k);
        // Önce yukarı, sonra dışarı: kenara tutunup çıkıyormuş gibi bir yay.
        player.position.set(
          THREE.MathUtils.lerp(target.x, phase.end.x, mix),
          THREE.MathUtils.lerp(target.y, 0, Math.min(1, k * 1.6)),
          THREE.MathUtils.lerp(target.z, phase.end.z, mix),
        );
        player.options.eyeHeight = THREE.MathUtils.lerp(EYE, 1.7, mix);
        if (k >= 1) {
          exited = phase.at;
          current = null;
          phase = null;
        }
      }
      player.velocity.set(0, 0, 0);
      player.onGround = true;
      floor = player.position.y;
      depth = THREE.MathUtils.clamp(-(player.position.y + EYE) / 2.2, 0, 1);
      lantern.position.copy(player.position).setY(player.position.y + EYE + 0.2);
      lantern.intensity = depth * 14;
      lights.lantern.value = Math.max(0.35, depth) * 2.2;
      daylight.forEach((sprite) => (sprite.material.opacity = depth));
      return exited;
    },
  };
  return tunnelsApi;
}
