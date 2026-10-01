import { readInputDeviceProfile } from "../../../../shared/app/inputDeviceProfile";

export interface InputHandle {
  pressed: Set<string>;
  look: { x: number; y: number };
  isLocked(): boolean;
  onLockChange(cb: (locked: boolean) => void): () => void;
  requestLock(): void;
  /** Fare kilidi alınamazsa (tarayıcı reddetti, Esc sonrası bekleme, iframe) oyunu yine de başlatır: sürükle-bak. */
  forceStart(): void;
  releaseLock(): void;
  consumeLook(): { x: number; y: number };
  /** Mobil dokunmatik cihaz mı (pointer-lock yerine sanal lock kullan). */
  readonly isTouch: boolean;
  /**
   * Kamera/bakış açısına doğrudan delta enjekte et (dokunmatik sürükleme).
   * Girdi `consumeLook()` ile tüketilecek `look` birikimine eklenir.
   * x/y radyan-birikim; movement sistemi `look.x` kadar yaw, `look.y`
   * kadar pitch ekler. Sinyal yönü mouse olayı ile aynıdır:
   *   - x > 0 → sola dön, x < 0 → sağa dön
   *   - y > 0 → yukarı bak, y < 0 → aşağı bak
   */
  injectLook(dx: number, dy: number): void;
  /**
   * Sanal bir klavye tuşunu basılı/bırak olarak ayarla (D-pad butonları,
   * mobil aksiyon butonları). Bu, hem inputSystem'in `pressed` setine
   * eklenip hareket/koşma sistemleri tarafından okunmasını sağlar, hem de
   * `KeyboardEvent` tetikleyerek interactionSystem ve gameLoop'taki global
   * kısayolların (E, Q, R, F, P, M, L, K, T) aynı şekilde çalışmasını
   * garantiler.
   */
  setVirtualKey(code: string, pressed: boolean): void;
  dispose(): void;
}

function detectTouch(): boolean {
  return readInputDeviceProfile().usesTouchUi;
}

export function createInput(target: HTMLElement): InputHandle {
  const pressed = new Set<string>();
  const look = { x: 0, y: 0 };
  const lockListeners = new Set<(locked: boolean) => void>();
  let locked = false;
  /** Sanal kilit: gerçek fare kilidi yokken oyun sürer; bakış sol tuş basılıyken sürüklenerek döner. */
  let virtual = false;

  const isTouch = detectTouch();

  const onKeyDown = (e: KeyboardEvent) => {
    pressed.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    pressed.delete(e.code);
  };
  const onBlur = () => pressed.clear();

  const onMouseMove = (e: MouseEvent) => {
    if (!locked) return;
    if (virtual && !(e.buttons & 1)) return;
    look.x -= e.movementX * 0.0022;
    look.y -= e.movementY * 0.0018;
  };

  const onPointerLockChange = () => {
    /**
     * Sadece masaüstünde pointer-lock state'ini takip et. Dokunmatik
     * cihazlarda lock durumu `requestLock`/`releaseLock` ile yönetilir.
     */
    if (isTouch) return;
    if (document.pointerLockElement === target) virtual = false;
    else if (virtual) return;
    locked = document.pointerLockElement === target;
    lockListeners.forEach((fn) => fn(locked));
    if (!locked) pressed.clear();
  };
  const onPointerLockError = () => {
    if (!isTouch && !locked) forceStart();
  };
  const onVirtualKey = (e: KeyboardEvent) => {
    if (virtual && e.code === "Escape") {
      virtual = false;
      setLocked(false);
    }
  };
  const tryRealLock = () => {
    if (virtual && document.pointerLockElement !== target) {
      try {
        target.requestPointerLock();
      } catch {
        /* sanal kilitle sürer */
      }
    }
  };
  function forceStart(): void {
    if (locked || isTouch) return;
    virtual = true;
    setLocked(true);
  }

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("pointerlockerror", onPointerLockError);
  document.addEventListener("keydown", onVirtualKey);
  target.addEventListener("mousedown", tryRealLock);

  function setLocked(next: boolean): void {
    if (locked === next) return;
    locked = next;
    lockListeners.forEach((fn) => fn(locked));
    if (!locked) pressed.clear();
  }

  return {
    pressed,
    look,
    isTouch,
    isLocked: () => locked,
    onLockChange(cb) {
      lockListeners.add(cb);
      return () => lockListeners.delete(cb);
    },
    requestLock() {
      if (isTouch) {
        setLocked(true);
        return;
      }
      if (document.pointerLockElement !== target) {
        /**
         * Bazı tarayıcılar (Safari) requestPointerLock'u promise dönmeyebilir;
         * sessizce try/catch yaparız — başarısızsa kullanıcı canvas'a tekrar
         * tıklar.
         */
        try {
          target.requestPointerLock();
        } catch {
          /* yok say */
        }
      }
    },
    forceStart,
    releaseLock() {
      if (virtual) {
        virtual = false;
        setLocked(false);
        return;
      }
      if (isTouch) {
        setLocked(false);
        return;
      }
      if (document.pointerLockElement === target) {
        document.exitPointerLock();
      }
    },
    consumeLook() {
      const value = { x: look.x, y: look.y };
      look.x = 0;
      look.y = 0;
      return value;
    },
    injectLook(dx, dy) {
      look.x += dx;
      look.y += dy;
    },
    setVirtualKey(code, isPressed) {
      /**
       * Not: Burada hem `pressed` setine yazıyoruz hem de synthetic
       * KeyboardEvent dispatch ediyoruz. Böylece movementSystem (pressed
       * set'i okuyor) ve interactionSystem/gameLoop kısayolları (document
       * keydown dinliyor) aynı kodla beslenir — mobil buton tek dokunuşta
       * tüm sistemler için "gerçek tuş" gibi davranır.
       */
      if (isPressed) {
        if (pressed.has(code)) return;
        pressed.add(code);
        try {
          document.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true }));
        } catch {
          /* IE fallback gereksiz */
        }
      } else {
        if (!pressed.has(code)) return;
        pressed.delete(code);
        try {
          document.dispatchEvent(new KeyboardEvent("keyup", { code, key: code, bubbles: true }));
        } catch {
          /* yok say */
        }
      }
    },
    dispose() {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      document.removeEventListener("keydown", onVirtualKey);
      target.removeEventListener("mousedown", tryRealLock);
    },
  };
}
