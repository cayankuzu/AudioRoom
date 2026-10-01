/**
 * Prosedürel ses tasarımı (Web Audio). Dosya/telif gerektirmez:
 * ambiyans katmanları, adım, alma/takma, arayüz ve an sesleri kodla üretilir.
 */
export type Ambience = "wind" | "womb" | "room" | "desert";
export type Surface = "sand" | "soft" | "hard";
export type Cue =
  | "pickup" | "place" | "drop" | "ui" | "moment" | "finale" | "hit" | "throw" | "deny"
  | "ignite" | "shatter" | "chime" | "switch" | "crumble" | "whoosh" | "pulse";

export interface Sfx {
  start(): void;
  setVolume(volume: number): void;
  /** Müzik çalarken ambiyansı kısar. */
  setDuck(ducked: boolean): void;
  setAmbience(kind: Ambience, level?: number): void;
  /** Kalp atışı hızı (atım/dk) — yalnızca "womb" ambiyansında. */
  setHeartRate(bpm: number): void;
  step(surface: Surface, sprinting: boolean): void;
  cue(kind: Cue): void;
  dispose(): void;
}

export function createSfx(): Sfx {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let ambienceBus: GainNode;
  let reverb: ConvolverNode;
  let noiseBuffer: AudioBuffer;
  let volume = 0.7;
  let ambienceKind: Ambience | null = null;
  let ambienceLevel = 1;
  let ducked = false;
  let heartTimer = 0;
  let heartBpm = 64;
  const ambienceNodes: AudioNode[] = [];

  const now = () => ctx!.currentTime;

  const makeNoise = (seconds: number) => {
    const buffer = ctx!.createBuffer(1, ctx!.sampleRate * seconds, ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = white * 0.55 + brown * 2.2;
    }
    return buffer;
  };

  const makeImpulse = (seconds: number) => {
    const length = ctx!.sampleRate * seconds;
    const buffer = ctx!.createBuffer(2, length, ctx!.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    return buffer;
  };

  const ambienceTarget = () => (ducked ? 0.35 : 1) * ambienceLevel;

  const buildAmbience = () => {
    if (!ctx || !ambienceKind) return;
    ambienceNodes.forEach((node) => node.disconnect());
    ambienceNodes.length = 0;
    window.clearInterval(heartTimer);
    if (ambienceKind === "womb") {
      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.value = 48;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.05;
      drone.connect(droneGain).connect(ambienceBus);
      drone.start();
      ambienceNodes.push(drone, droneGain);
      const beat = () => {
        if (!ctx) return;
        thump(0, 0.55);
        thump(0.28, 0.35);
      };
      beat();
      heartTimer = window.setInterval(beat, 60000 / heartBpm);
    }
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const settings: Record<Ambience, [BiquadFilterType, number, number, number]> = {
      wind: ["bandpass", 420, 0.09, 260],
      desert: ["bandpass", 700, 0.05, 380],
      womb: ["lowpass", 160, 0.12, 40],
      room: ["lowpass", 240, 0.05, 60],
    };
    const [type, frequency, level, sweep] = settings[ambienceKind];
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === "bandpass" ? 0.8 : 0.4;
    gain.gain.value = level;
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = sweep;
    lfo.connect(lfoGain).connect(filter.frequency);
    source.connect(filter).connect(gain).connect(ambienceBus);
    source.start();
    lfo.start();
    ambienceNodes.push(source, filter, gain, lfo, lfoGain);
  };

  const thump = (delay: number, strength: number) => {
    if (!ctx) return;
    const t = now() + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(strength * 0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain).connect(ambienceBus);
    osc.start(t);
    osc.stop(t + 0.35);
  };

  const tone = (frequency: number, start: number, length: number, level: number, type: OscillatorType = "sine", wet = 0.3) => {
    if (!ctx) return;
    const t = now() + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain);
    gain.connect(master);
    if (wet > 0) {
      const send = ctx.createGain();
      send.gain.value = wet;
      gain.connect(send).connect(reverb);
    }
    osc.start(t);
    osc.stop(t + length + 0.05);
  };

  const noise = (start: number, length: number, level: number, filterType: BiquadFilterType, frequency: number, wet = 0.15) => {
    if (!ctx) return;
    const t = now() + start;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    source.connect(filter).connect(gain).connect(master);
    if (wet > 0) {
      const send = ctx.createGain();
      send.gain.value = wet;
      gain.connect(send).connect(reverb);
    }
    source.start(t, Math.random() * 1.5);
    source.stop(t + length + 0.05);
  };

  return {
    start() {
      if (ctx) {
        void ctx.resume();
        return;
      }
      const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      ctx = new AudioCtor();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      ambienceBus = ctx.createGain();
      ambienceBus.gain.value = ambienceTarget();
      ambienceBus.connect(master);
      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(2.6);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.5;
      reverb.connect(reverbGain).connect(master);
      noiseBuffer = makeNoise(3);
      buildAmbience();
    },
    setVolume(next) {
      volume = next;
      if (ctx) master.gain.setTargetAtTime(volume, now(), 0.05);
    },
    setDuck(next) {
      ducked = next;
      if (ctx) ambienceBus.gain.setTargetAtTime(ambienceTarget(), now(), 0.6);
    },
    setAmbience(kind, level = 1) {
      ambienceLevel = level;
      if (kind !== ambienceKind) {
        ambienceKind = kind;
        buildAmbience();
      }
      if (ctx) ambienceBus.gain.setTargetAtTime(ambienceTarget(), now(), 0.6);
    },
    setHeartRate(bpm) {
      if (Math.abs(bpm - heartBpm) < 1) return;
      heartBpm = bpm;
      if (ambienceKind === "womb") buildAmbience();
    },
    step(surface, sprinting) {
      const level = sprinting ? 0.16 : 0.11;
      if (surface === "sand") noise(0, 0.09, level, "lowpass", 900 + Math.random() * 300, 0.05);
      else if (surface === "soft") noise(0, 0.14, level * 0.8, "lowpass", 260, 0.1);
      else noise(0, 0.05, level * 0.9, "bandpass", 1900 + Math.random() * 400, 0.2);
    },
    cue(kind) {
      switch (kind) {
        case "pickup":
          tone(660, 0, 0.18, 0.08);
          tone(990, 0.07, 0.3, 0.06);
          noise(0, 0.2, 0.05, "highpass", 3000);
          break;
        case "place":
          noise(0, 0.05, 0.14, "bandpass", 2400, 0.1);
          tone(110, 0.02, 0.25, 0.1, "sine", 0.1);
          noise(0.35, 1.6, 0.025, "bandpass", 3200, 0);
          break;
        case "drop":
          tone(95, 0, 0.2, 0.08, "sine", 0.1);
          break;
        case "ui":
          tone(1200, 0, 0.06, 0.03, "triangle", 0);
          break;
        case "deny":
          tone(180, 0, 0.14, 0.06, "square", 0);
          break;
        case "moment":
          noise(0, 2.2, 0.06, "bandpass", 500, 0.8);
          tone(220, 0.1, 2.4, 0.03, "sine", 0.9);
          tone(330, 0.3, 2.2, 0.02, "sine", 0.9);
          break;
        case "finale":
          [196, 247, 294, 392].forEach((f, i) => tone(f, i * 0.12, 5, 0.035, "sine", 1));
          break;
        case "hit":
          tone(520, 0, 0.12, 0.09, "triangle", 0.1);
          noise(0, 0.08, 0.1, "highpass", 1800);
          break;
        case "throw":
          noise(0, 0.25, 0.06, "bandpass", 1200, 0);
          break;
        case "ignite":
          noise(0, 0.9, 0.12, "lowpass", 700, 0.3);
          noise(0.05, 0.5, 0.05, "highpass", 2600, 0.1);
          tone(80, 0, 0.6, 0.06, "sine", 0.2);
          break;
        case "shatter":
          for (let i = 0; i < 6; i += 1) tone(2400 + Math.random() * 2600, i * 0.035, 0.25 + Math.random() * 0.3, 0.025, "sine", 0.6);
          noise(0, 0.18, 0.08, "highpass", 4200, 0.4);
          break;
        case "chime":
          tone(880, 0, 1.6, 0.05, "sine", 0.9);
          tone(1318.5, 0.08, 1.8, 0.035, "sine", 0.9);
          tone(1760, 0.16, 1.4, 0.02, "sine", 0.9);
          break;
        case "switch":
          noise(0, 0.03, 0.12, "bandpass", 3200, 0);
          tone(120, 0.02, 0.4, 0.05, "sawtooth", 0.1);
          break;
        case "crumble":
          noise(0, 1.8, 0.1, "bandpass", 380, 0.5);
          noise(0.1, 1.2, 0.04, "highpass", 1800, 0.2);
          break;
        case "whoosh":
          noise(0, 1.4, 0.1, "bandpass", 900, 0.6);
          tone(160, 0, 1.2, 0.05, "sine", 0.6);
          break;
        case "pulse":
          tone(55, 0, 0.9, 0.14, "sine", 0.4);
          noise(0, 0.4, 0.06, "lowpass", 300, 0.5);
          break;
      }
    },
    dispose() {
      window.clearInterval(heartTimer);
      void ctx?.close();
    },
  };
}
