import type { SongScene } from "../../../engine/game/songStage";
import { createAshScene } from "./ash";
import { createBoatsScene } from "./boats";
import { createCityScene } from "./city";
import { createConfessionScene } from "./confession";
import { createDanceScene } from "./dance";
import { createFrozenScene } from "./frozen";
import { createHeartsScene } from "./hearts";
import { createHouseScene } from "./house";
import type { SceneKit } from "./kit";
import { createOrbitScene } from "./orbit";
import { createStarsScene } from "./stars";
import { dressingModels, dressSong } from "./dressing";
import { createVirusScene } from "./virus";
import { createWoundScene } from "./wound";

export interface ReddScenes {
  scenes: Record<string, SongScene>;
  /** Denizin gökyüzünü yansıtması için (Kalpsiz Romantik). */
  setSky?(top: import("three").Color, horizon: import("three").Color): void;
}

/** Her şarkıya özel sahne. Telefondaki demo yalnızca kendi parçalarının sahnelerini kurar. */
/** Şarkı sahnelerinin kullandığı hazır modeller (Poly Haven, CC0); yalnızca istenen şarkılarınki yüklenir. */
export const SONG_MODELS: Readonly<Record<string, readonly string[]>> = {
  kaniyorduk: ["painted_wooden_table", "dining_chair_02"],
  "kalpsiz-romantik": ["dutch_ship_medium", "wine_barrel_01", "wooden_crate_01", "wooden_lantern_01"],
  kafakafka: ["dining_chair_02", "television_02", "vintage_suitcase", "book_encyclopedia_set_01", "vintage_microwave", "woodenchair_01", "wall_clock", "alarm_clock_01"],
  sextronot: ["sofa_02", "vintage_day_bed", "dining_chair_02"],
  itiraf: ["metal_jerrycan"],
  "tam-bi-delilik": ["painted_wooden_bench"],
};
export function songModelNames(only?: readonly string[]): string[] {
  const ids = Object.keys(SONG_MODELS).concat(["kaniyorduk", "ask-virus", "onlar-bile-uzulurler", "bugun-herkes-olsun-istedim", "senden-vazgeceli-cok-oldu", "boslukta-dans", "hala-seni-cok-ozluyorum"]);
  return [...new Set(ids.filter((id) => !only || only.includes(id)).flatMap((id) => [...(SONG_MODELS[id] ?? []), ...dressingModels(id)]))];
}

export async function createSongScenes(kit: SceneKit, only?: readonly string[]): Promise<ReddScenes> {
  const want = (id: string) => !only || only.includes(id);
  const scenes: Record<string, SongScene> = {};
  let setSky: ReddScenes["setSky"];
  if (want("kalpsiz-romantik")) {
    const boats = createBoatsScene(kit);
    scenes["kalpsiz-romantik"] = boats;
    setSky = boats.setSky;
  }
  if (want("kaniyorduk")) scenes.kaniyorduk = createStarsScene(kit);
  if (want("ask-virus")) scenes["ask-virus"] = await createVirusScene(kit);
  if (want("onlar-bile-uzulurler")) scenes["onlar-bile-uzulurler"] = createHeartsScene(kit);
  if (want("bugun-herkes-olsun-istedim")) scenes["bugun-herkes-olsun-istedim"] = createFrozenScene(kit);
  if (want("senden-vazgeceli-cok-oldu")) scenes["senden-vazgeceli-cok-oldu"] = createAshScene(kit);
  if (want("kafakafka")) scenes.kafakafka = createHouseScene(kit);
  if (want("tam-bi-delilik")) scenes["tam-bi-delilik"] = createCityScene(kit);
  if (want("sextronot")) scenes.sextronot = await createOrbitScene(kit);
  if (want("itiraf")) scenes.itiraf = createConfessionScene(kit);
  if (want("boslukta-dans")) scenes["boslukta-dans"] = createDanceScene(kit);
  if (want("hala-seni-cok-ozluyorum")) scenes["hala-seni-cok-ozluyorum"] = createWoundScene(kit);
  // Set döşemesi: her şarkının hazır modelleri kendi köküne (sahneyle görünür/kaybolur).
  for (const [id, scene] of Object.entries(scenes)) {
    const group = dressSong(kit, id);
    if (group) scene.root.add(group);
  }
  return { scenes, setSky };
}
