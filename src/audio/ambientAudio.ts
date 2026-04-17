import type { WindState } from "../systems/windSystem";

export interface AmbientAudio {
  /** Kullanıcı user-gesture'u sonrası çağır — AudioContext'i ayağa kaldırır. */
  start(): void;
  /** Her frame rüzgar durumunu geçir — ses gain'i rüzgar ile modüle olur. */
  update(wind: WindState, delta: number): void;
  /** İsteğe bağlı global gain override (0..1). */
  setMasterVolume(v: number): void;
  dispose(): void;
}

/**
 * Ortam sesi — gramofon sesi değildir. Dünyanın "yaşadığını" hissettiren
 * çok düşük seviyeli rüzgar uğultusu:
 *
 *  - 1 adet beyaz-pembe karışımı gürültü (AudioBuffer ile üretilir)
 *  - Düşük frekans band-pass → toprak/rüzgar benzeri uğultu
 *  - Hafif LFO ile rüzgar şiddetine göre volume modüle edilir
 *  - Kullanıcı plak dinliyor olsa bile müziği gölgede bırakmaz (çok düşük tavan)
 *
 * Yüklendiği anda otomatik başlamaz — `start()` user-gesture sonrası
 * çağrılmalıdır. Tarayıcı autoplay kısıtlamalarına uyumlu.
 */
export function createAmbientAudio(): AmbientAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;
  let bandPass: BiquadFilterNode | null = null;
  let lowShelf: BiquadFilterNode | null = null;
  let started = false;
  let currentGain = 0;
  let masterVolume = 1;

  const MAX_GAIN = 0.06; // ses tavanı — ASLA müziğin önüne geçmez
  const BASE_GAIN = 0.018;

  function buildNoiseBuffer(audioCtx: AudioContext): AudioBuffer {
    /** 4 saniyelik loop. Pembe eğilimli — daha sıcak/dolu uğultu. */
    const length = audioCtx.sampleRate * 4;
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      /** Basit pink yaklaşımı (Paul Kellet). */
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.153852;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
    }
    return buffer;
  }

  return {
    start() {
      if (started) return;
      try {
        const AnyWindow = window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        };
        const Ctor = AnyWindow.AudioContext ?? AnyWindow.webkitAudioContext;
        if (!Ctor) return;
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = 0;

        bandPass = ctx.createBiquadFilter();
        bandPass.type = "bandpass";
        bandPass.frequency.value = 220;
        bandPass.Q.value = 0.6;

        lowShelf = ctx.createBiquadFilter();
        lowShelf.type = "lowshelf";
        lowShelf.frequency.value = 140;
        lowShelf.gain.value = 4;

        noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buildNoiseBuffer(ctx);
        noiseSource.loop = true;

        noiseSource.connect(bandPass);
        bandPass.connect(lowShelf);
        lowShelf.connect(master);
        master.connect(ctx.destination);

        noiseSource.start();
        started = true;
      } catch {
        /** AudioContext oluşturulamadıysa sessizce devre dışı kal. */
        started = false;
      }
    },
    update(wind, delta) {
      if (!started || !ctx || !master || !bandPass) return;

      /** Rüzgar şiddeti × ses tavanı. */
      const target = (BASE_GAIN + (MAX_GAIN - BASE_GAIN) * wind.strength) * masterVolume;
      const k = 1 - Math.exp(-1.8 * delta);
      currentGain += (target - currentGain) * k;
      master.gain.value = currentGain;

      /** Filtre merkezi rüzgar ile hafifçe kaysın — his taze kalsın. */
      const targetFreq = 180 + 120 * wind.strength;
      bandPass.frequency.value +=
        (targetFreq - bandPass.frequency.value) * Math.min(1, delta * 2);
    },
    setMasterVolume(v) {
      masterVolume = Math.max(0, Math.min(1, v));
    },
    dispose() {
      try {
        noiseSource?.stop();
      } catch {
        /* ignore */
      }
      noiseSource?.disconnect();
      bandPass?.disconnect();
      lowShelf?.disconnect();
      master?.disconnect();
      void ctx?.close();
      started = false;
    },
  };
}
