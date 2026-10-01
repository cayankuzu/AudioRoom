/**
 * Anılar: dışarıdaki dünya, arkadan aydınlanan rahim zarına Karagöz perdesi gibi
 * gölge olarak düşer. Her şarkının tablosu şarkı ilerledikçe perde perde değişir
 * (story.ts); oyuncu anıya dokununca (E) o anın küçük bir iyiliği gerçekleşir.
 * Çizimler 1024×512 alanda, zemin çizgisi y=420; siyah = gölge, saydam = zardan
 * sızan ışık.
 *
 * t: dünya saati · e: dokunuş (0…1) · s: perde ilerlemesi (0…n; story.ts)
 */
type G = CanvasRenderingContext2D;
export type MemoryDraw = (g: G, t: number, event: number, story: number) => void;

const GROUND = 420;
const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Perde i boyunca 0→1 (perdenin tamamına yayılır). */
const through = (s: number, i: number) => clamp01(s - i);
/** Perde i başladığında hızlıca 0→1 (perdenin ilk bölümünde). */
const arrive = (s: number, i: number, k = 0.15) => ease(clamp01((s - i) / k));
/** a perdesinden b perdesine kadar 1, dışında 0 (yumuşak geçişli). */
const during = (s: number, a: number, b: number) => arrive(s, a) * (1 - arrive(s, b));

type Pose = "stand" | "sit" | "walk" | "fist" | "arms" | "embrace" | "sing";

/** İnsan silueti: baş, gövde, kollar, bacaklar — pozla değişir. */
function person(g: G, x: number, ground: number, h: number, pose: Pose = "stand", t = 0, facing = 1, raise = 0): void {
  const r = h * 0.075;
  const shoulderY = ground - h * 0.8;
  const hipY = pose === "sit" ? ground - h * 0.3 : ground - h * 0.47;
  const limb = h * 0.068;
  g.save();
  g.translate(x, 0);
  g.scale(facing, 1);
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = "#000";
  g.fillStyle = "#000";
  // Bacaklar
  g.lineWidth = limb;
  g.beginPath();
  if (pose === "sit") {
    g.moveTo(-h * 0.05, hipY);
    g.lineTo(h * 0.2, hipY);
    g.lineTo(h * 0.2, ground);
    g.moveTo(h * 0.03, hipY);
    g.lineTo(h * 0.26, hipY + 2);
    g.lineTo(h * 0.27, ground);
  } else {
    const swing = pose === "walk" ? Math.sin(t * 6) * h * 0.12 : h * 0.04;
    g.moveTo(-h * 0.04, hipY);
    g.lineTo(-h * 0.05 - swing, ground);
    g.moveTo(h * 0.04, hipY);
    g.lineTo(h * 0.05 + swing, ground);
  }
  g.stroke();
  // Gövde
  g.beginPath();
  g.moveTo(-h * 0.11, shoulderY);
  g.quadraticCurveTo(-h * 0.13, (shoulderY + hipY) / 2, -h * 0.085, hipY);
  g.lineTo(h * 0.085, hipY);
  g.quadraticCurveTo(h * 0.13, (shoulderY + hipY) / 2, h * 0.11, shoulderY);
  g.closePath();
  g.fill();
  // Baş ve boyun
  g.lineWidth = limb * 0.8;
  g.beginPath();
  g.moveTo(0, shoulderY);
  g.lineTo(0, shoulderY - r * 0.9);
  g.stroke();
  g.beginPath();
  g.arc(pose === "sing" ? r * 0.3 : 0, shoulderY - r * 1.6, r, 0, Math.PI * 2);
  g.fill();
  // Kollar
  g.lineWidth = limb * 0.85;
  g.beginPath();
  const up = ease(clamp01(raise));
  if (pose === "fist" || pose === "arms") {
    g.moveTo(h * 0.1, shoulderY + 4);
    g.lineTo(h * 0.16, shoulderY - h * 0.12 * up + h * 0.2 * (1 - up));
    g.lineTo(h * 0.14, shoulderY - h * 0.3 * up + h * 0.32 * (1 - up));
    if (pose === "arms") {
      g.moveTo(-h * 0.1, shoulderY + 4);
      g.lineTo(-h * 0.16, shoulderY - h * 0.12 * up + h * 0.2 * (1 - up));
      g.lineTo(-h * 0.14, shoulderY - h * 0.3 * up + h * 0.32 * (1 - up));
    } else {
      g.moveTo(-h * 0.1, shoulderY + 4);
      g.lineTo(-h * 0.13, hipY + h * 0.04);
    }
  } else if (pose === "embrace") {
    g.moveTo(h * 0.1, shoulderY + 4);
    g.lineTo(h * 0.22, shoulderY + h * 0.12);
    g.lineTo(h * 0.3, shoulderY + h * 0.02);
    g.moveTo(-h * 0.1, shoulderY + 4);
    g.lineTo(-h * 0.13, hipY + h * 0.02);
  } else if (pose === "sing") {
    g.moveTo(h * 0.1, shoulderY + 4);
    g.lineTo(h * 0.2, shoulderY + h * 0.08);
    g.lineTo(h * 0.16, shoulderY - h * 0.06);
    g.moveTo(-h * 0.1, shoulderY + 4);
    g.lineTo(-h * 0.2 - up * h * 0.1, shoulderY + h * 0.1 - up * h * 0.35);
  } else {
    const sway = pose === "walk" ? Math.sin(t * 6) * h * 0.08 : 0;
    g.moveTo(h * 0.1, shoulderY + 4);
    g.lineTo(h * 0.13 - sway, hipY + h * 0.04);
    g.moveTo(-h * 0.1, shoulderY + 4);
    g.lineTo(-h * 0.13 + sway, hipY + h * 0.04);
  }
  g.stroke();
  if (pose === "fist" || pose === "arms") {
    g.beginPath();
    g.arc(h * 0.14, shoulderY - h * 0.3 * up + h * 0.32 * (1 - up), limb * 0.8, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Yerde uzanan biri (uyuyan). */
function sleeper(g: G, x: number, h: number): void {
  g.save();
  g.translate(x, GROUND - h * 0.07);
  g.rotate(-Math.PI / 2);
  person(g, 0, h * 0.47, h, "stand");
  g.restore();
}

/** Yağmur; weight > 1 kalın, koyu ("kara") yağmur. */
function rain(g: G, t: number, density: number, slant = 0.25, weight = 1): void {
  g.save();
  g.strokeStyle = `rgba(0,0,0,${Math.min(0.85, 0.28 + (weight - 1) * 0.3)})`;
  g.lineWidth = 1.5 * weight;
  g.beginPath();
  for (let i = 0; i < density; i += 1) {
    const x = ((i * 97.13) % 1100) - 40 + ((t * 420 * slant) % 60);
    const y = ((i * 53.7 + t * 520) % 560) - 40;
    g.moveTo(x, y);
    g.lineTo(x - 14 * slant, y + 22);
  }
  g.stroke();
  g.restore();
}

function ground(g: G, y = GROUND): void {
  g.fillStyle = "#000";
  g.fillRect(0, y, 1024, 512 - y);
}

function tree(g: G, x: number, y: number, length: number, angle: number, width: number, depth: number, bloom: number, seed: number): void {
  const x2 = x + Math.cos(angle) * length;
  const y2 = y + Math.sin(angle) * length;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x2, y2);
  g.stroke();
  if (depth === 0) {
    if (bloom > 0) {
      const count = Math.round(6 * bloom);
      for (let i = 0; i < count; i += 1) {
        const a = seed * 12.9 + i * 2.3;
        g.beginPath();
        g.arc(x2 + Math.cos(a) * 9, y2 + Math.sin(a) * 9, 4 + ((i * 7) % 5), 0, Math.PI * 2);
        g.fill();
      }
    }
    return;
  }
  const spread = 0.42 + ((seed * 7) % 3) * 0.05;
  tree(g, x2, y2, length * 0.72, angle - spread, width * 0.66, depth - 1, bloom, seed * 1.7 + 1);
  tree(g, x2, y2, length * 0.68, angle + spread, width * 0.66, depth - 1, bloom, seed * 2.3 + 2);
}

function saz(g: G, x: number, y: number, s: number, angle: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.beginPath();
  g.ellipse(0, 0, 22 * s, 30 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(-3 * s, -110 * s, 6 * s, 90 * s);
  g.restore();
}

function lamp(g: G, x: number): void {
  g.fillRect(x - 5, GROUND - 250, 10, 250);
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(x, GROUND - 245);
  g.quadraticCurveTo(x + 10, GROUND - 285, x + 60, GROUND - 280);
  g.stroke();
  g.beginPath();
  g.moveTo(x + 45, GROUND - 282);
  g.lineTo(x + 78, GROUND - 282);
  g.lineTo(x + 70, GROUND - 262);
  g.lineTo(x + 53, GROUND - 262);
  g.closePath();
  g.fill();
}

function bench(g: G, x: number): void {
  g.fillRect(x - 70, GROUND - 58, 150, 9);
  g.fillRect(x - 70, GROUND - 105, 150, 7);
  g.fillRect(x - 64, GROUND - 105, 6, 105);
  g.fillRect(x + 68, GROUND - 105, 6, 105);
}

/** Alev dili: aşağıdan yukarı titreyen siyah bir yaprak. */
function flame(g: G, x: number, y: number, size: number, t: number, seed: number): void {
  const sway = Math.sin(t * 7 + seed * 3.1) * size * 0.25;
  const h = size * (1 + Math.sin(t * 11 + seed) * 0.18);
  g.beginPath();
  g.moveTo(x - size * 0.35, y);
  g.quadraticCurveTo(x - size * 0.45, y - h * 0.5, x + sway, y - h);
  g.quadraticCurveTo(x + size * 0.45, y - h * 0.5, x + size * 0.35, y);
  g.closePath();
  g.fill();
}

/** Uçan kuş: iki kanatlı kıvrım. */
function bird(g: G, x: number, y: number, t: number, s = 1, seed = 0): void {
  const flap = Math.sin(t * 8 + seed) * 7 * s;
  g.lineWidth = 3 * s;
  g.beginPath();
  g.moveTo(x - 16 * s, y - flap);
  g.quadraticCurveTo(x - 7 * s, y - 6 * s, x, y);
  g.quadraticCurveTo(x + 7 * s, y - 6 * s, x + 16 * s, y - flap);
  g.stroke();
}

/** Zardan sızan ışığı kesip açan delik (pencere, yıldız, spot). */
function cut(g: G, draw: () => void, alpha = 1): void {
  if (alpha <= 0) return;
  g.save();
  g.globalCompositeOperation = "destination-out";
  g.globalAlpha = alpha;
  g.beginPath();
  draw();
  g.fill();
  g.restore();
}

export const MEMORIES: Record<string, MemoryDraw> = {
  // Göğe sorulan soru. Dokunuş: yağmurda yanına oturan bir yabancı.
  "ben-insan-degil-miyim": (g, t, e, s) => {
    g.save();
    // "Vur" perdesi: her yumrukta perde sarsılır.
    const hit = during(s, 8, 9) * Math.exp(-((t * 1.25) % 1) * 6);
    g.translate(Math.sin(t * 53) * 9 * hit, Math.cos(t * 41) * 6 * hit);
    ground(g);
    // Uzakta bir ev: hayal kurulurken penceresi yanar, hayal alınınca söner.
    g.fillRect(820, GROUND - 120, 140, 120);
    g.beginPath();
    g.moveTo(808, GROUND - 120);
    g.lineTo(890, GROUND - 175);
    g.lineTo(972, GROUND - 120);
    g.fill();
    const dream = arrive(s, 3) * (1 - 0.85 * arrive(s, 5));
    cut(g, () => {
      g.rect(846, GROUND - 95, 34, 34);
      g.rect(900, GROUND - 95, 34, 34);
    }, dream);
    lamp(g, 600);
    bench(g, 470);

    // Yalnız adam: oturur → soruyla kalkar → iplerle oynatılır → iplerini koparır.
    const puppet = during(s, 6, 9);
    const stood = arrive(s, 1);
    const jerk = puppet * Math.sin(t * 2.6) * 10;
    const x = 430 + jerk;
    if (stood < 0.5) person(g, x, GROUND, 150, "sit", t);
    else if (s >= 9) person(g, x, GROUND, 158, "arms", t, 1, 1);
    else if (s >= 8) person(g, x, GROUND, 150, "fist", t, 1, 0.4 + 0.6 * Math.exp(-((t * 1.25) % 1) * 4));
    else if (puppet > 0.2) person(g, x, GROUND, 150, "arms", t, 1, 0.5 + 0.5 * Math.sin(t * 2.2));
    else person(g, x, GROUND, 150, "arms", t, 1, 0.3 * (1 - arrive(s, 3)) + 0.12);
    // İpler: tepedeki haçtan başa ve ellere; isyanda kopup yukarı toplanır.
    const strings = arrive(s, 6) * (1 - arrive(s, 9, 0.05));
    const recoil = arrive(s, 9, 0.3);
    if (arrive(s, 6) > 0 && recoil < 1) {
      const barX = x + Math.sin(t * 1.3) * 16;
      const barY = 40 - (1 - arrive(s, 6)) * 60;
      g.fillRect(barX - 60, barY - 3, 120, 6);
      g.fillRect(barX - 3, barY - 30, 6, 60);
      g.strokeStyle = "rgba(0,0,0,0.75)";
      g.lineWidth = 1.5;
      g.beginPath();
      for (const [dx, y] of [[-56, GROUND - 110], [0, GROUND - 145], [56, GROUND - 110]]) {
        g.moveTo(barX + dx, barY);
        const reach = strings > 0.01 ? 1 : 1 - recoil;
        g.lineTo(barX + dx + (x + dx * 0.5 - barX - dx) * reach, barY + (y - barY) * reach);
      }
      g.stroke();
    }
    // Hayaldeki sevgili: gelir (4), sorulmadan gider (5).
    const come = ease(clamp01(through(s, 4) * 2.2));
    const go = through(s, 5);
    if (come > 0 && go < 1) {
      g.globalAlpha = 1 - go;
      const lx = 900 - come * 370 + go * 420;
      person(g, lx, GROUND, 140, (come < 1 || go > 0) ? "walk" : "stand", t, go > 0 ? 1 : -1);
      g.globalAlpha = 1;
    }
    // Dokunuş: bir yabancı yağmurda yürüyüp yanına oturur.
    if (e > 0) {
      const walk = ease(clamp01(e * 1.4));
      person(g, 900 - walk * 390, GROUND, 150, walk < 1 ? "walk" : "sit", t, -1);
    }
    rain(g, t, Math.max(30, 120 + 80 * arrive(s, 2) + 90 * arrive(s, 9) - e * 90), 0.25, 1 + arrive(s, 9) * 1.6);
    g.restore();
  },

  // Hücreden deniz. Dokunuş: parmaklıklar açılır, martı dışarı süzülür.
  "aldirma-gonul": (g, t, e, s) => {
    g.fillStyle = "#000";
    const wx = 352;
    const wy = 110;
    const ww = 320;
    const wh = 240;
    const horizon = wy + 150;
    // Şafaktan önce gökyüzü koyu; şafakla güneş doğar.
    const dawn = arrive(s, 5, 0.4);
    g.fillStyle = `rgba(0,0,0,${0.4 * (1 - dawn)})`;
    g.fillRect(wx, wy, ww, horizon - wy);
    g.fillStyle = "#000";
    if (dawn > 0) {
      const sy = horizon + 20 - dawn * 70;
      g.lineWidth = 3;
      g.strokeStyle = "#000";
      g.beginPath();
      g.arc(wx + 230, sy, 24, Math.PI, 0);
      g.stroke();
      for (let r = 0; r < 7; r += 1) {
        const a = Math.PI + (r + 0.5) * (Math.PI / 7);
        g.beginPath();
        g.moveTo(wx + 230 + Math.cos(a) * 32, sy + Math.sin(a) * 32);
        g.lineTo(wx + 230 + Math.cos(a) * (44 + Math.sin(t * 2 + r) * 4), sy + Math.sin(a) * (44 + Math.sin(t * 2 + r) * 4));
        g.stroke();
      }
    }
    // Deniz: dalgalar "dalga" perdesinde büyür, şafakta durulur.
    const swell = 3 + 11 * arrive(s, 2) * (1 - 0.6 * dawn);
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 3;
    for (let row = 0; row < 5; row += 1) {
      g.beginPath();
      const y = horizon + row * 18;
      for (let x = wx; x <= wx + ww; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + t * (1.5 + swell * 0.1) + row) * swell * (0.5 + row * 0.2));
      g.stroke();
    }
    // Duvara çarpan köpük.
    const spray = during(s, 2, 5);
    if (spray > 0) {
      g.fillStyle = "rgba(0,0,0,0.5)";
      for (let i = 0; i < 14; i += 1) {
        const k = (t * 0.9 + i * 0.137) % 1;
        const x = wx + 20 + ((i * 53) % (ww - 40));
        g.beginPath();
        g.arc(x, wy + wh - 10 - Math.sin(k * Math.PI) * 60 * spray, 4 * (1 - k) + 1, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Duvar ve pencere.
    g.fillStyle = "#000";
    g.fillRect(0, 0, 1024, wy);
    g.fillRect(0, wy + wh, 1024, 512 - wy - wh);
    g.fillRect(0, wy, wx, wh);
    g.fillRect(wx + ww, wy, 1024 - wx - ww, wh);
    // Ufukta bir tekne.
    g.beginPath();
    g.moveTo(wx + 210, horizon - 2);
    g.lineTo(wx + 260, horizon - 2);
    g.lineTo(wx + 250, horizon + 8);
    g.lineTo(wx + 218, horizon + 8);
    g.fill();
    g.fillRect(wx + 233, horizon - 32, 3, 30);
    // Mahkûm: başı eğik → kalkık; yumruğu parmaklığa, sonra göğe.
    const px = wx + 92;
    const bow = 1 - arrive(s, 1, 0.2);
    const stand = arrive(s, 3, 0.2);
    g.beginPath();
    g.ellipse(px, wy + wh + 16 - stand * 26, 78, 48, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(px, wy + wh - 42 + bow * 30 - stand * 26, 27, 0, Math.PI * 2);
    g.fill();
    if (stand > 0) {
      const lift = stand * (0.85 + 0.15 * Math.sin(t * 3));
      g.lineWidth = 16;
      g.lineCap = "round";
      g.strokeStyle = "#000";
      g.beginPath();
      g.moveTo(px + 52, wy + wh - 20);
      g.lineTo(px + 74, wy + wh - 40 - lift * 110);
      g.stroke();
      g.beginPath();
      g.arc(px + 74, wy + wh - 46 - lift * 110, 13, 0, Math.PI * 2);
      g.fill();
    }
    // Parmaklıklar: dokunuşla ya da "yüksel" perdesinde kendiliğinden eğilir.
    const open = Math.max(ease(clamp01(e * 1.2)), 0.3 * arrive(s, 4, 0.3));
    for (let i = 0; i < 6; i += 1) {
      const base = wx + 30 + i * 52;
      const side = base < wx + ww / 2 ? -1 : 1;
      const bend = open * (70 - Math.abs(base - (wx + ww / 2)) * 0.25) * side;
      g.lineWidth = 12;
      g.strokeStyle = "#000";
      g.beginPath();
      g.moveTo(base, wy);
      g.quadraticCurveTo(base + bend, wy + wh / 2, base, wy + wh);
      g.stroke();
    }
    // Martı: dokunuşla pencereden çıkar; şafakta arkadaşları gelir.
    const fly = clamp01(e * 1.3 - 0.3);
    bird(g, wx + 120 + fly * 260 + Math.sin(t * 2) * 10, wy + 90 - fly * 150, t, 1 + fly * 3);
    for (let i = 0; i < 3 * dawn; i += 1) {
      bird(g, wx + ((t * 30 + i * 110) % (ww + 60)) - 30, wy + 40 + i * 22 + Math.sin(t + i) * 6, t, 0.8, i);
    }
  },

  // Kurumuş çeşme. Dokunuş: bir an yine su akar, testi dolar.
  "o-cesme": (g, t, e, s) => {
    ground(g);
    g.fillStyle = "#000";
    // Servi ağaçları: yıllar geçtikçe boy atar.
    const years = arrive(s, 3, 0.4);
    for (const x of [230, 800]) {
      const h = 300 + years * 60;
      g.beginPath();
      g.moveTo(x, GROUND);
      g.quadraticCurveTo(x - 34, GROUND - h * 0.57, x + Math.sin(t * 0.7 + x) * 4, GROUND - h);
      g.quadraticCurveTo(x + 34, GROUND - h * 0.57, x, GROUND);
      g.fill();
    }
    // Çeşme gövdesi, sivri kemerli niş ve yalak.
    g.fillRect(420, GROUND - 260, 190, 260);
    g.fillRect(405, GROUND - 275, 220, 18);
    cut(g, () => {
      g.moveTo(455, GROUND - 60);
      g.lineTo(455, GROUND - 170);
      g.quadraticCurveTo(460, GROUND - 225, 515, GROUND - 240);
      g.quadraticCurveTo(570, GROUND - 225, 575, GROUND - 170);
      g.lineTo(575, GROUND - 60);
      g.closePath();
    });
    g.fillStyle = "#000";
    g.fillRect(470, GROUND - 150, 90, 8);
    g.fillRect(508, GROUND - 150, 12, 26);
    g.fillRect(430, GROUND - 60, 170, 22);
    // Hatıra perdeleri: soluk iki genç, akan su.
    const memory = during(s, 1, 2) + during(s, 4, 5);
    const flow = Math.max(memory, clamp01(e * 1.5) * (1 - clamp01(e * 1.5 - 1.2)));
    if (flow > 0) {
      g.fillStyle = `rgba(0,0,0,${0.7 * flow})`;
      for (let i = 0; i < 16; i += 1) {
        const y = GROUND - 124 + ((t * 180 + i * 5) % 64);
        g.fillRect(512, y, 4, 5);
      }
      g.fillStyle = "#000";
    }
    if (memory > 0) {
      g.globalAlpha = 0.5 * memory;
      person(g, 660, GROUND, 150, "stand", t, -1);
      g.beginPath();
      g.ellipse(640, GROUND - 60 - 30 * memory, 14, 20, 0, 0, Math.PI * 2);
      g.fill();
      person(g, 745, GROUND, 162, "stand", t, -1);
      g.globalAlpha = 1;
    }
    // Yıllar sonra: bastonlu biri yavaşça çeşmeye yürür.
    if (s >= 3) {
      const walk = ease(clamp01(through(s, 3) * 1.4));
      const ox = 960 - walk * 280;
      g.save();
      g.translate(ox, GROUND);
      g.rotate(0.12);
      g.translate(-ox, -GROUND);
      person(g, ox, GROUND, 140, walk < 1 ? "walk" : "stand", t * 0.5, -1);
      g.restore();
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(ox - 26, GROUND - 70);
      g.lineTo(ox - 34, GROUND);
      g.stroke();
      // Dokunuş: testi kaldırılır; son perdede yere bırakılır.
      const lift = ease(clamp01(e * 1.2 - 0.2));
      const set = arrive(s, 6, 0.3);
      g.beginPath();
      g.ellipse(ox - 22 - set * 60, GROUND - 58 - lift * 40 + set * 38, 13, 18, 0, 0, Math.PI * 2);
      g.fill();
    }
  },

  // Kadere itiraz. Dokunuş: bütün kalabalık yumruk kaldırır, pankart açılır.
  "itirazim-var": (g, t, e, s) => {
    ground(g);
    const defeat = 1 - 0.75 * during(s, 3, 4);
    for (let row = 0; row < 2; row += 1) {
      for (let i = 0; i < 9; i += 1) {
        const x = 110 + i * 100 + row * 50;
        const wave = clamp01(e * 2.2 - i * 0.08 - row * 0.2);
        const first = row === 0 && i === 4 ? arrive(s, 1) : 0;
        const story = Math.max(first, row === 0 && i % 2 === 0 ? arrive(s, 2) : 0, arrive(s, 6, 0.1 + i * 0.02)) * defeat;
        const raise = Math.max(wave, story) * (0.85 + 0.15 * Math.sin(t * 5 + i));
        person(g, x, GROUND + row * 18, 130 + row * 25 + ((i * 17) % 20), "fist", t, i % 2 ? 1 : -1, raise);
      }
    }
    // Yakaya yapışan dev el.
    const grip = during(s, 4, 6);
    if (grip > 0) {
      const hy = -200 + grip * 330 + Math.sin(t * 2) * 6;
      g.beginPath();
      g.ellipse(512, hy, 90, 70, 0, 0, Math.PI * 2);
      g.fill();
      for (let f = 0; f < 4; f += 1) {
        const fx = 452 + f * 40;
        g.beginPath();
        g.roundRect(fx - 14, hy + 30, 28, 100 - Math.abs(f - 1.5) * 14, 14);
        g.fill();
      }
      g.fillRect(480, hy - 260, 64, 200);
    }
    // Dost olmayan yüzler: iki yandan kocaman profiller.
    const faces = during(s, 7, 8);
    if (faces > 0) {
      for (const side of [-1, 1]) {
        const fx = side < 0 ? -140 + faces * 300 : 1164 - faces * 300;
        g.beginPath();
        g.ellipse(fx, 200, 110, 140, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(fx - side * -100, 190);
        g.lineTo(fx - side * -150, 225);
        g.lineTo(fx - side * -100, 240);
        g.fill();
        cut(g, () => g.ellipse(fx + side * 45, 165, 12, 7, 0, 0, Math.PI * 2));
      }
    }
    const banner = Math.max(ease(clamp01(e * 1.4 - 0.3)), arrive(s, 6, 0.3));
    if (banner > 0) {
      const y = GROUND - 150 - banner * 90;
      g.fillRect(380, y, 8, 180);
      g.fillRect(640, y, 8, 180);
      g.fillRect(380, y, 268, 60 * banner);
    }
  },

  // Ağır Roman: kulenin dibi. Dokunuş: şemsiyenin altında sarılırlar.
  "agla-sevdam": (g, t, e, s) => {
    ground(g);
    const squeeze = during(s, 6, 8);
    const sink = arrive(s, 8, 0.5);
    // Evler: sokak daraldıkça yaklaşır, boşaldıkça pencereler kararır, sonunda çöker.
    const windows: [number, number][] = [];
    for (let i = 0; i < 12; i += 1) {
      const base = i * 90 - 20;
      const x = base + (base + 40 < 512 ? 1 : -1) * 70 * squeeze;
      const h = (70 + ((i * 37) % 60)) * (1 - sink);
      if (h < 2) continue;
      g.fillRect(x, GROUND - h, 80, h);
      g.beginPath();
      g.moveTo(x - 6, GROUND - h);
      g.lineTo(x + 40, GROUND - h - 30 * (1 - sink));
      g.lineTo(x + 86, GROUND - h);
      g.fill();
      if (h > 50 && (i / 12) >= through(s, 7)) windows.push([x + 32, GROUND - h + 22]);
    }
    cut(g, () => windows.forEach(([x, y]) => g.rect(x, y, 16, 20)), 0.9);
    g.fillStyle = "#000";
    // Kule
    g.fillRect(700, GROUND - 330, 70, 330);
    g.beginPath();
    g.moveTo(690, GROUND - 330);
    g.lineTo(735, GROUND - 420);
    g.lineTo(780, GROUND - 330);
    g.fill();
    cut(g, () => g.rect(725, GROUND - 300, 20, 30), 0.8);
    g.fillStyle = "#000";
    // Yangınlar: çatıların ardında.
    const fire = arrive(s, 4, 0.3) * (1 - sink);
    for (let i = 0; i < 9 * fire; i += 1) flame(g, 60 + i * 115, GROUND - 120, 50 + ((i * 23) % 40), t, i);
    // Habersiz kuşlar
    const birds = during(s, 3, 7);
    for (let i = 0; i < 5 * birds; i += 1) bird(g, ((t * 70 + i * 230) % 1200) - 90, 70 + i * 18 + Math.sin(t * 2 + i) * 8, t, 0.9, i);
    // Sevgililer: yaklaşır, sarılmaya hazır, yola düşer.
    const near = arrive(s, 1, 0.4);
    const close = Math.max(0.45 * arrive(s, 2), ease(clamp01(e * 1.3)));
    const walking = s >= 5 && s < 6;
    const shift = through(s, 5) * 160;
    const lx = 250 + near * 110 + close * 30 + shift;
    const rx = 600 - near * 130 - close * 40 + shift;
    const embrace = close > 0.8;
    person(g, lx, GROUND, 160, embrace ? "embrace" : walking ? "walk" : "stand", t, 1);
    person(g, rx, GROUND, 150, embrace ? "embrace" : walking ? "walk" : "stand", t, walking ? 1 : -1);
    // Şemsiye
    const ux = (lx + rx) / 2;
    g.beginPath();
    g.moveTo(ux - 90, GROUND - 190);
    g.quadraticCurveTo(ux, GROUND - 270 + close * 10, ux + 90, GROUND - 190);
    g.closePath();
    g.fill();
    g.fillRect(ux - 2, GROUND - 240, 4, 110);
    rain(g, t, Math.max(40, 200 - e * 120 - fire * 60), 0.35);
  },

  // Moğollar'ın kâbusu. Dokunuş: ıssız ağaç çiçek açar, kuşlar döner.
  "issizligin-ortasinda": (g, t, e, s) => {
    g.fillStyle = "#000";
    g.beginPath();
    g.moveTo(0, GROUND + 10);
    for (let x = 0; x <= 1024; x += 32) g.lineTo(x, GROUND + Math.sin(x * 0.01) * 10);
    g.lineTo(1024, 512);
    g.lineTo(0, 512);
    g.fill();
    const nightmare = during(s, 3, 6) + during(s, 7, 8);
    // Duman sütunları ve ufuktaki alevler.
    if (nightmare > 0) {
      for (let c = 0; c < 4; c += 1) {
        const cx = 90 + c * 270;
        for (let k = 0; k < 7; k += 1) {
          const rise = (t * 0.08 + k / 7 + c * 0.13) % 1;
          g.fillStyle = `rgba(0,0,0,${0.45 * nightmare * (1 - rise)})`;
          g.beginPath();
          g.arc(cx + Math.sin(rise * 5 + c) * 30 + rise * 60, GROUND - 20 - rise * 360, 22 + rise * 70, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.fillStyle = "#000";
      for (let i = 0; i < 14 * nightmare; i += 1) flame(g, 20 + i * 76, GROUND + 6, 34 + ((i * 29) % 30), t, i);
      // Sazlı gölgeler: önce çalar, telleri kopunca sazlar yere düşer; kendileri dimdik kalır.
      const fallen = arrive(s, 4, 0.5);
      for (let i = 0; i < 4; i += 1) {
        const fx = 170 + i * 230;
        g.globalAlpha = nightmare;
        person(g, fx, GROUND, 150 + (i % 2) * 14, "stand", t, i % 2 ? -1 : 1);
        saz(g, fx + (i % 2 ? -24 : 24) + fallen * 30, GROUND - 70 + fallen * 62, 0.8, (i % 2 ? 0.9 : -0.9) * (1 - fallen) + fallen * (i % 2 ? 1.57 : -1.57));
        g.globalAlpha = 1;
      }
    }
    g.strokeStyle = "#000";
    g.lineCap = "round";
    const bloom = ease(clamp01(e * 1.2));
    tree(g, 512, GROUND, 110, -Math.PI / 2, 22, 5, bloom, 1);
    // Ağacın altındaki uyuyan: yürüyüp gelir, uyur, sonunda uyanıp oturur.
    if (s < 1) person(g, 150 + through(s, 0) * 420, GROUND, 140, "walk", t, 1);
    else if (s < 9) sleeper(g, 560, 140);
    else person(g, 580, GROUND, 140, "sit", t, 1);
    const birds = Math.max(clamp01(e * 1.5 - 0.4), arrive(s, 9, 0.4));
    for (let i = 0; i < 5 * birds; i += 1) {
      const a = t * 0.8 + i * 1.3;
      bird(g, 512 + Math.cos(a) * (180 + i * 20), 150 + Math.sin(a) * 40, t, 0.8, i);
    }
  },

  // Tek spot. Dokunuş: spot genişler, salon dolar.
  "neydi-gunahim": (g, t, e, s) => {
    const widen = ease(clamp01(e * 1.2));
    g.fillStyle = "rgba(0,0,0,0.82)";
    g.fillRect(0, 0, 1024, 512);
    // Spot: son perdede daralır.
    const w = (70 + widen * 90) * (1 - 0.65 * arrive(s, 9, 0.6));
    cut(g, () => {
      g.moveTo(512 - 20, 0);
      g.lineTo(512 + 20, 0);
      g.lineTo(512 + w, GROUND);
      g.lineTo(512 - w, GROUND);
      g.closePath();
    });
    // Çalınamayan gece: karanlıkta yıldızlar belirir.
    const stars = arrive(s, 8, 0.5);
    cut(g, () => {
      for (let i = 0; i < 22 * stars; i += 1) {
        const x = (i * 211) % 1024;
        const y = 30 + ((i * 97) % 200);
        g.moveTo(x + 3, y);
        g.arc(x, y, 2 + ((i * 7) % 3) * (0.7 + 0.3 * Math.sin(t * 3 + i)), 0, Math.PI * 2);
      }
    }, 0.9);
    g.fillStyle = "#000";
    ground(g);
    person(g, 500, GROUND, 170, "sing", t, 1, widen);
    g.fillRect(545, GROUND - 150, 4, 150);
    g.beginPath();
    g.arc(547, GROUND - 152, 7, 0, Math.PI * 2);
    g.fill();
    // Kalleş gölgeler: iki yandan spotun kenarına sokulur.
    const threat = during(s, 3, 5);
    if (threat > 0) {
      for (const side of [-1, 1]) {
        const x = 512 + side * (420 - threat * 300);
        person(g, x, GROUND, 210, "arms", t * 0.5, -side, 0.55 + 0.1 * Math.sin(t * 2));
      }
    }
    // Kerem gibi yanmak: ayaklarının dibinde alevler.
    const burn = during(s, 5, 6);
    for (let i = 0; i < 7 * burn; i += 1) flame(g, 440 + i * 22, GROUND, 26 + ((i * 13) % 20), t, i);
    // Hırsız: çuvalıyla spotun içinden koşarak geçer.
    if (s >= 7 && s < 8) {
      const hx = 250 + through(s, 7) * 560;
      person(g, hx, GROUND, 110, "walk", t * 2, 1);
      g.beginPath();
      g.arc(hx - 26, GROUND - 90, 22, 0, Math.PI * 2);
      g.fill();
    }
    const crowd = Math.max(clamp01(e * 1.6 - 0.4), arrive(s, 6, 0.2) * (1 - 0.5 * arrive(s, 9)));
    for (let i = 0; i < 14 * crowd; i += 1) {
      const x = 40 + i * 72;
      const clap = during(s, 6, 7) * Math.abs(Math.sin(t * 6 + i)) * 8;
      g.beginPath();
      g.arc(x, 505, 34, Math.PI, 0);
      g.fill();
      g.beginPath();
      g.arc(x, 455 - clap + Math.sin(t * 3 + i) * 2, 16, 0, Math.PI * 2);
      g.fill();
    }
  },

  // Mahzuni'nin meydanı. Dokunuş: kollar ve bayraklar kalkar.
  "yuh-yuh": (g, t, e, s) => {
    ground(g);
    person(g, 190, GROUND, 150, "sit", t);
    saz(g, 245, GROUND - 70, 1.1, -0.9 + Math.sin(t * 8) * 0.02);
    // Muska: ipinden sallanır.
    const amulet = arrive(s, 2, 0.3);
    if (amulet > 0) {
      const sway = Math.sin(t * 1.4) * 0.25;
      const ax = 330 + Math.sin(sway) * 140;
      const ay = -40 + amulet * 190;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(330, 0);
      g.lineTo(ax, ay);
      g.stroke();
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(ax + 22, ay + 38);
      g.lineTo(ax - 22, ay + 38);
      g.closePath();
      g.fill();
    }
    // Kürsüdeki bey: koro yükseldikçe küçülür.
    const bey = arrive(s, 3, 0.3);
    if (bey > 0) {
      const shrink = 1 - 0.65 * arrive(s, 5, 0.5);
      const bx = 900;
      const top = GROUND - 90;
      g.fillRect(bx - 70, top, 140, 90);
      g.save();
      g.translate(bx, top);
      g.scale(shrink * bey, shrink * bey);
      g.beginPath();
      g.ellipse(0, -80, 55, 70, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(0, -170, 26, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-26, -236, 52, 56);
      g.fillRect(-40, -186, 80, 8);
      g.fillRect(22, -168, 34, 5);
      g.fillRect(-30, -12, 16, 12);
      g.fillRect(14, -12, 16, 12);
      g.restore();
    }
    const crowd = Math.round(2 + 6 * arrive(s, 1, 0.5));
    const rise = Math.max(ease(clamp01(e * 1.3)), 0.7 * arrive(s, 5, 0.2));
    for (let i = 0; i < crowd; i += 1) {
      const x = 420 + i * 58;
      const bob = Math.abs(Math.sin(t * 4 + i)) * 6 * (0.3 + rise);
      const facing = s >= 4 ? 1 : i % 2 ? 1 : -1;
      person(g, x, GROUND - bob, 140 + ((i * 13) % 18), "arms", t, facing, rise * (0.6 + 0.4 * Math.abs(Math.sin(t * 4 + i))));
    }
    for (const x of [520, 700]) {
      const top = GROUND - 200 - rise * 80;
      g.fillRect(x, top, 5, 200 + rise * 80);
      g.beginPath();
      g.moveTo(x + 5, top);
      for (let k = 0; k <= 10; k += 1) g.lineTo(x + 5 + k * 9, top + Math.sin(t * 5 + k * 0.6) * 6 * rise);
      for (let k = 10; k >= 0; k -= 1) g.lineTo(x + 5 + k * 9, top + 46 + Math.sin(t * 5 + k * 0.6) * 6 * rise);
      g.fill();
    }
  },

  // Bölünmüş toprak. Dokunuş: çitler devrilir, buğday yükselir.
  "nem-kaldi": (g, t, e, s) => {
    ground(g, GROUND + 20);
    // Ev ve kapı: kapılar kapanınca ışık söner.
    g.fillRect(780, GROUND - 90, 150, 110);
    g.beginPath();
    g.moveTo(765, GROUND - 90);
    g.lineTo(855, GROUND - 150);
    g.lineTo(945, GROUND - 90);
    g.fill();
    cut(g, () => g.rect(840, GROUND - 50, 30, 70), 1 - arrive(s, 3, 0.2));
    g.fillStyle = "#000";
    // Çitler: toprak bölündükçe tek tek dikilir; dokunuşla devrilir.
    const fences = 3 * arrive(s, 1, 0.6);
    const fall = ease(clamp01(e * 1.3));
    for (let f = 0; f < 3; f += 1) {
      const up = clamp01(fences - f);
      if (up <= 0) continue;
      const fx = 140 + f * 190;
      g.save();
      g.translate(fx, GROUND + 20);
      g.rotate(fall * (f % 2 ? 1.3 : -1.3));
      g.scale(1, up);
      g.fillRect(-4, -95, 8, 95);
      g.fillRect(-60, -75, 120, 6);
      g.fillRect(-60, -40, 120, 6);
      g.fillRect(-60, -95, 8, 95);
      g.fillRect(52, -95, 8, 95);
      g.restore();
    }
    // Dikili taş
    const stone = arrive(s, 2, 0.4);
    if (stone > 0) {
      g.beginPath();
      g.moveTo(628, GROUND + 20);
      g.lineTo(634, GROUND + 20 - 170 * stone);
      g.quadraticCurveTo(655, GROUND + 20 - 185 * stone, 676, GROUND + 20 - 168 * stone);
      g.lineTo(682, GROUND + 20);
      g.fill();
    }
    // Arkasını dönen "yiğitler": yürüyüp uzaklaşır.
    const leave = during(s, 4, 6);
    if (leave > 0) {
      const k = clamp01((s - 4) / 2);
      g.globalAlpha = leave;
      person(g, 520 - k * 380, GROUND + 20, 140, "walk", t, -1);
      person(g, 760 + k * 220, GROUND + 20, 150, "walk", t, 1);
      g.globalAlpha = 1;
    }
    // Takılan yaftalar: çubuklara asılı tabelalar.
    const labels = arrive(s, 6, 0.4);
    for (let i = 0; i < 3 * labels; i += 1) {
      const lx = 470 + i * 70;
      g.fillRect(lx, GROUND - 120, 4, 140);
      g.save();
      g.translate(lx + 2, GROUND - 120);
      g.rotate(Math.sin(t + i) * 0.08);
      g.fillRect(-28, -34, 56, 34);
      g.restore();
    }
    // Âşık: saz elinde; aç bırakılınca oturur, sonunda başı öne düşer.
    const sit = s >= 7;
    person(g, 600, GROUND + 20, sit ? 138 : 150, sit ? "sit" : "stand", t, -1);
    if (arrive(s, 7) > 0) {
      g.beginPath();
      g.ellipse(560, GROUND + 14, 22, 8, 0, 0, Math.PI);
      g.fill();
    }
    saz(g, 690, GROUND - 20, 0.9, 0.25);
    const wheat = ease(clamp01(e * 1.5 - 0.3));
    g.lineWidth = 2;
    for (let i = 0; i < 90 * wheat; i += 1) {
      const x = 30 + i * 8;
      const h = (40 + ((i * 29) % 30)) * wheat;
      const sway = Math.sin(t * 2 + i * 0.3) * 5;
      g.beginPath();
      g.moveTo(x, GROUND + 20);
      g.quadraticCurveTo(x + sway * 0.5, GROUND + 20 - h / 2, x + sway, GROUND + 20 - h);
      g.stroke();
      g.beginPath();
      g.ellipse(x + sway, GROUND + 14 - h, 3, 8, 0, 0, Math.PI * 2);
      g.fill();
    }
  },
};
