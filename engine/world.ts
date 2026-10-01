import type * as THREE from "three";
import type { AlbumData } from "./album";
import type { Assets } from "./core/assets";
import type { Colliders } from "./core/colliders";
import type { Shot } from "./game/director";
import type { Input } from "./core/input";
import type { Player, PlayerOptions } from "./core/player";
import type { Runtime } from "./core/runtime";
import type { Gramophone, PlinthStyle } from "./game/gramophone";
import type { Interaction, PromptLine } from "./game/interaction";
import type { GameRecord, Records } from "./game/records";
import type { Secrets } from "./game/secrets";
import type { Music } from "./audio/music";
import type { Sfx, Surface } from "./audio/sfx";
import type { Hud } from "./ui/hud";

export interface Track {
  id: string;
  /** Albümdeki sıra (1'den başlar) — yalnızca künye için; oyunda sıra zorunlu değildir. */
  order: number;
  title: string;
  videoId: string;
  /** Parça çalmaya başladığında ekranda beliren kısa, özgün (söz alıntısı olmayan) cümle. */
  mood: string;
  /** Orijinal yorumcu (cover albümler için). */
  credit?: string;
}

export interface ControlHint {
  keys: string;
  label: string;
}

export interface CoverPoint {
  /** Oyuncunun durduğu işaret noktası. */
  stand: { x: number; z: number };
  /** roll: bakış ekseni etrafında yatırma (radyan; kapaktaki eğik kadraj). */
  camera: { position: THREE.Vector3; target: THREE.Vector3; fov: number; roll?: number };
  /** Kadraja girilince/çıkılınca: dünya kapaktaki pozu kurar (ör. tavşanı kapaktaki yerine koyar). */
  onEnter?(): void;
  onExit?(): void;
}

export interface WorldMeta {
  id: string;
  artist: string;
  album: string;
  year: string;
  cover: string;
  /** Arayüz vurgu rengi ve bu evrenin başlık fontu (CSS). */
  accent: string;
  accentInk: string;
  displayFont: string;
  /** 3D yazı tipi: public/fonts/<ad>.typeface.json (assets-src/fonts içindeki TTF'den, npm run fonts). */
  font3d: string;
  description: string;
  mechanic: { name: string; text: string };
  controls: ControlHint[];
  credits: string[];
}

export interface WorldContext {
  runtime: Runtime;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  assets: Assets;
  input: Input;
  player: Player;
  colliders: Colliders;
  records: Records;
  gramophone: Gramophone;
  interaction: Interaction;
  music: Music;
  sfx: Sfx;
  hud: Hud;
  tracks: readonly Track[];
  /** Telefonda çalışan sade demo mu? */
  demo: boolean;
  random: () => number;
  /** Dinlenen (gramofonda çalınmış) parça kimlikleri. */
  found: ReadonlySet<string>;
  /** Evren açılırken kitaplıkta duracak plaklar: dinlenenler (geçici test kipinde bütün plaklar, bkz. devFlags). */
  startShelved: ReadonlySet<string>;
  /** Plağı doğrudan gramofona takıp çalar (dünya mekanikleri için). */
  placeOnGramophone(record: GameRecord): void;
  /** Plağı oyuncunun eline verir (dünya mekanikleri için, ör. kabarcık patlatma). */
  pickUp(record: GameRecord): void;
  /** Gizli keşifler: dünya bir sırrı açığa çıkarınca kart gösterilir ve kaydedilir. */
  secrets: Secrets;
  /** Sinema kamerası (klip) kamerayı yönetiyor mu? Kamera yakınlığına bağlı keşifler o sırada tetiklenmez. */
  readonly cinema: boolean;
  /** Şu an çalan parçanın saniyesi (çalmıyorsa son bilinen konum; klip kapalıyken -1: evren kapak hâlinde kalır). */
  songTime(): number;
}

export interface WorldLogic {
  ground(x: number, z: number): number;
  /** Geliştirme/test kancası: dünyanın uçtan uca testlerde erişilmesi gereken nesneleri (kedi, tavşan…). */
  debug?: Record<string, unknown>;
  /** Adım sesi zemini. */
  surface?: Surface;
  /** Evrene ilk girişte üstte beliren yönlendirme. */
  startHint?: string;
  /** Bakılan bir nesne yokken gösterilecek, dünyaya özgü istem (ör. uzaktan ölçüm). */
  prompt?(): PromptLine[] | null;
  /** Bakılan bir nesne yokken E'ye basılınca dünyanın genel eylemi (true: bir şey yaptı). */
  use?(): boolean;
  /** Elde plak yokken ekranda gösterilecek dünyaya özgü hedef (ör. gramofonun karşı noktası). */
  objective?(): { position: THREE.Vector3; label: string } | null;
  update(dt: number, time: number): void;
  /** Oyuncu kamerası uygulandıktan sonra (sarsıntı, eğilme gibi kamera etkileri için). */
  afterCamera?(camera: THREE.PerspectiveCamera, dt: number, time: number): void;
  /**
   * Şarkının klibi: sinema kamerasının çekim listesi (şarkının saniyelerine bağlı).
   * Liste yoksa sinema modu o şarkıda açılmaz.
   */
  shots?(trackId: string): readonly Shot[] | null;
  /** Klibin başında ve sonunda şarkı adı kartı gösterilsin mi (yazısız filmler için false). */
  filmCard?(trackId: string): boolean;
  /** Gramofon kucağa alındığında ya da bir yere konduğunda (dünya hedefleri gramofonun yerini izler). */
  onGramophoneMoved?(spot: "stand" | "carried" | "ground"): void;
  /** Gramofondaki plak değiştiğinde (null: plak yok / çalma durdu). */
  onTrack?(track: Track | null): void;
  /** Yeni bir plak ilk kez dinlendiğinde — ilerleme mekaniği buradan beslenir. */
  onFound?(count: number, total: number): void;
  /** Tüm plaklar dinlendiğinde bir kez çağrılır; sinematik süresi (sn) döner. */
  onFinale?(): number;
  /** Final kartında "Evrende kal" seçilince (sinematik etkileri geri almak için). */
  onFinaleDone?(): void;
  /** Oyuncu bir plağı eline aldığında. */
  onPickup?(record: GameRecord): void;
  coverPoint?: CoverPoint;
}

export interface WorldDefinition extends AlbumData {
  /** Gramofonun durduğu kaide. */
  plinth?: PlinthStyle;
  /** Gramofonun altındaki yuvarlak sahne (kavisli zeminlerde kapatılır). */
  dais?: boolean;
  /** Plak kitaplığının ölçeği (büyük açık evrenlerde uzaktan okunsun diye büyütülebilir). */
  shelfScale?: number;
  /** El feneri (F): karanlık evrenlerde oyuncu önünü aydınlatabilir. */
  flashlight?: boolean;
  player: Partial<PlayerOptions> & { start: { x: number; z: number }; lookAt: { x: number; z: number } };
  build(ctx: WorldContext): Promise<WorldLogic>;
}
