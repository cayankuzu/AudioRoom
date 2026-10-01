import * as THREE from "three";
import { dress, scatter, type Placement } from "../../../engine/core/dressing";
import { CENTER, CONE, GRAMOPHONE, ground, rim, STAGE, type SceneKit } from "./kit";

/**
 * Şarkı sahnelerinin set döşemesi: hazır modeller (Poly Haven, CC0) kraterin siyahına uydurulmuş (solgun,
 * koyu). Her şarkının eşyaları kendi hikâyesini anlatır ve krater geneline yayılır; sahne kapanınca kaybolur.
 */
const AVOID = [
  { x: 0, z: 0, r: 9 },
  { x: GRAMOPHONE.x, z: GRAMOPHONE.z, r: 8 },
  { x: 4, z: 82, r: 12 },
  { x: 0, z: 64, r: 9 },
];
const P = (model: string, x: number, z: number, size: number, extra: Partial<Placement> = {}): Placement => ({ model, x, z, size, ...extra });

export const SONG_DRESSING: Record<string, (kit: SceneKit) => Placement[]> = {
  // Kıyı: bekleyenlerin bıraktıkları — çizmeler, şapka, kova; sığlıkta şamandıralar; kenarda paslı bir top ve
  // hiç açılmamış bir hazine sandığı (dönmeyen gemilerin yükü).
  "kalpsiz-romantik": (kit) => [
    P("rubber_boots", 46.5, 12.5, 0.45, { yaw: 0.8 }),
    P("fishermans_hat", 47.8, 10.9, 0.42, { yaw: 2.1 }),
    P("wooden_bucket_01", 45.2, 14.8, 0.5, { round: true, solid: true }),
    P("wicker_basket_01", 48.6, 8.4, 0.7, { yaw: 1.2 }),
    P("ocean_buoy", 30, 22, 1.4, { lift: -3.3 }),
    P("lateral_sea_marker", -20, 32, 1.1, { lift: -3.3, by: "height" }),
    P("lifebuoy", 41, 15.5, 0.75, { tilt: Math.PI / 2, lift: 0.05 }),
    P("cannon_01", Math.cos(2.4) * 58, Math.sin(2.4) * 58, 3.2, { yaw: 2.4 + Math.PI / 2, solid: true }),
    P("treasure_chest", 6, -20, 1.6, { yaw: 0.6, lift: -0.35, solid: true }),
    P("bronze_whale_statue", Math.cos(-0.6) * 62, Math.sin(-0.6) * 62, 4.5, { yaw: -0.6 + Math.PI, solid: true }),
    // Filmin geçtiği kıyı şeridi (kuzey kıyısı) boş kalır: yük oraya film için yerleştirilir.
    ...scatter(kit.random, ["wooden_barrels_01", "wine_barrel_01", "wooden_crate_02", "old_military_crate"], 8, { cx: 0, cz: 0, r0: 49, r1: 56 }, [0.9, 1.4], [...AVOID, { x: 5, z: 50, r: 38 }], { solid: true, round: true }),
  ],
  // Defterin çevresi bir çalışma masasının dağınıklığı: kitaplar, notlar, gözlük, projeksiyon, çıkrık (kader).
  kaniyorduk: () => [],  // Film kendi odasını ve kırını kurar.
  // Laboratuvar: kordonun içinde bırakılmış deney takımları, mikroskoplar, gaz maskesi.
  "ask-virus": (kit) => [
    P("chemistry_set", 12, 26, 1.4, { yaw: 0.4, solid: true }),
    P("bunsen_burner", 13.6, 24.2, 0.5, { yaw: 0.1 }),
    P("industrial_microscope", -14, 30, 0.9, { yaw: 2.5, solid: true }),
    P("vintage_microscope", 26, -18, 0.8, { yaw: 0.9 }),
    P("medical_box", -24, -22, 0.7, { yaw: 1.7 }),
    P("medical_tape", -25.2, -20.8, 0.3),
    P("magnifying_glass_01", 30, 6, 0.7, { yaw: 0.6, tilt: -0.2 }),
    P("old_gas_mask", -30, 12, 0.6, { yaw: 2.9, tilt: 0.4 }),
    P("metal_toolbox", 38, 30, 0.8, { yaw: 1.2 }),
    ...scatter(kit.random, ["medical_box", "metal_toolbox", "old_gas_mask", "bunsen_burner"], 10, { cx: 0, cz: 0, r0: 24, r1: 62 }, [0.5, 0.9], AVOID),
  ],
  // Müze deposu: heykel başları, büstler, vazolar, boş çerçeveler, merdiven — sergilenmeyen kalpler.
  "onlar-bile-uzulurler": (kit) => [
    P("marble_bust_01", STAGE.x - 20, STAGE.z + 4, 1.6, { yaw: 1.2, solid: true, round: true }),
    P("gothic_statue", STAGE.x + 22, STAGE.z + 2, 2.6, { yaw: -1.4, solid: true, round: true }),
    P("horse_statue_01", STAGE.x - 26, STAGE.z - 12, 2.2, { yaw: 0.6, solid: true }),
    P("lion_head", STAGE.x + 12, STAGE.z - 16, 1.2, { yaw: 2.4, tilt: 0.3 }),
    P("bull_head", STAGE.x - 12, STAGE.z - 18, 1.2, { yaw: 0.2, tilt: -0.2 }),
    P("horse_head", STAGE.x + 4, STAGE.z - 22, 1.1, { yaw: 1.1, tilt: 0.5 }),
    P("antique_ceramic_vase_01", STAGE.x - 16, STAGE.z + 14, 0.9, { round: true, solid: true }),
    P("brass_vase_01", STAGE.x - 17.5, STAGE.z + 15.2, 0.7, { round: true }),
    P("ceramic_vase_02", STAGE.x + 18, STAGE.z + 12, 0.8, { round: true }),
    P("ceramic_vase_04", STAGE.x + 19.4, STAGE.z + 13.1, 0.6, { round: true }),
    P("standing_picture_frame_01", STAGE.x + 8, STAGE.z + 20, 1.6, { yaw: 2.8 }),
    P("standing_picture_frame_02", STAGE.x - 9, STAGE.z + 21, 1.4, { yaw: 0.4 }),
    P("fancy_picture_frame_02", STAGE.x + 2, STAGE.z + 24, 1.5, { yaw: 3.0, tilt: -0.9 }),
    P("wooden_ladder", STAGE.x + 26, STAGE.z + 16, 4.2, { by: "height", yaw: 0.8, tilt: 0.25, solid: true }),
    P("standing_chalkboard_01", STAGE.x - 24, STAGE.z + 20, 1.8, { by: "height", yaw: 1.1, solid: true }),
    P("potted_plant_02", STAGE.x + 14, STAGE.z + 26, 1.2, { by: "height", round: true }),
    ...scatter(kit.random, ["ceramic_vase_01", "ceramic_vase_03", "brass_vase_02", "standing_picture_frame_01"], 12, { cx: 0, cz: 0, r0: 28, r1: 66 }, [0.6, 1.3], AVOID),
  ],
  // Duran zaman: kratere saçılmış saatler, hepsi aynı anda durmuş; bazıları dev.
  "bugun-herkes-olsun-istedim": (kit) => [
    P("vintage_grandfather_clock_01", 18, 20, 4.2, { by: "height", yaw: -0.9, solid: true }),
    P("vintage_grandfather_clock_01", -30, -24, 3.6, { by: "height", yaw: 0.7, tilt: 0.35, solid: true }),
    P("mantel_clock_01", 9, -22, 1.6, { yaw: 2.2 }),
    P("mantel_clock_01", -22, 26, 1.3, { yaw: 0.4, tilt: -0.5 }),
    P("wall_clock", 28, -8, 2.4, { tilt: -Math.PI / 2 + 0.2, lift: 0.05 }),
    P("wall_clock", -12, 40, 1.8, { tilt: -Math.PI / 2 - 0.2, lift: 0.05 }),
    P("alarm_clock_01", 14, 36, 1.1, { by: "height", yaw: 1.2 }),
    P("alarm_clock_01", -36, 10, 0.9, { by: "height", yaw: 2.6, tilt: 0.6 }),
    P("pocket_watch", 4, 26, 1.4, { yaw: 0.3 }),
    P("vintage_pocket_watch", -8, -32, 1.2, { yaw: 1.5 }),
    ...scatter(kit.random, ["wall_clock", "alarm_clock_01", "mantel_clock_01", "pocket_watch"], 16, { cx: 0, cz: 0, r0: 30, r1: 70 }, [0.8, 2.2], AVOID),
  ],
  // Yanmış orman: kütükler, kuru dallar, çalılar, iki balta (kendi kestiği ağaçlar), taşlar.
  "senden-vazgeceli-cok-oldu": (kit) => [
    ...scatter(kit.random, ["tree_stump_01", "tree_stump_02", "dead_quiver_trunk"], 14, { cx: 0, cz: 0, r0: 24, r1: 68 }, [1.2, 2.2], AVOID, { solid: true, round: true }),
    ...scatter(kit.random, ["dead_quiver_branch_01", "dead_quiver_branch_02", "dry_branches_medium_01"], 22, { cx: 0, cz: 0, r0: 20, r1: 70 }, [1.2, 2.6], AVOID),
    ...scatter(kit.random, ["shrub_02", "shrub_03", "shrub_04", "wild_rooibos_bush"], 16, { cx: 0, cz: 0, r0: 22, r1: 70 }, [0.9, 1.8], AVOID),
    ...scatter(kit.random, ["rock_07", "rock_09", "stone_01"], 10, { cx: 0, cz: 0, r0: 26, r1: 66 }, [0.8, 1.8], AVOID, { solid: true, round: true }),
    P("wooden_axe", 22, 30, 0.9, { yaw: 0.8, tilt: 0.2 }),
    P("wooden_axe_02", -26, 22, 0.9, { yaw: 2.0, tilt: -0.3 }),
  ],
  // Boşluğa saçılmış ev (enkazın devamı): dolaplar, komodinler, sehpalar, yastıklar, çerçeveler, ocak, vantilatör.
  kafakafka: (kit) => [
    ...scatter(kit.random, ["classicnightstand_01", "gothiccabinet_01", "gothiccommode_01", "drawer_cabinet", "painted_wooden_cabinet", "painted_wooden_nightstand", "wooden_bookshelf_worn", "vintage_wooden_drawer_01", "metal_office_desk", "scandinavian_masonry_heater"], 14, { cx: 0, cz: 0, r0: 22, r1: 68 }, [1.4, 2.6], AVOID, { solid: true, tilt: 0.25 }),
    ...scatter(kit.random, ["ottoman_01", "rockingchair_01", "schoolchair_01", "schooldesk_01", "greenchair_01", "armchair_01", "coffeetable_01", "woodentable_02", "round_wooden_table_01", "side_table_01", "small_wooden_table_01", "mid_century_lounge_chair", "modern_arm_chair_01", "plastic_monobloc_chair_01"], 16, { cx: 0, cz: 0, r0: 20, r1: 70 }, [1.2, 2.0], AVOID, { tilt: 0.6 }),
    ...scatter(kit.random, ["throw_pillows_01", "fancy_picture_frame_02", "hanging_picture_frame_01", "standing_picture_frame_02", "vintage_electric_kettle", "boombox", "cassette_player", "classic_laptop", "electric_stove", "ceiling_fan", "tea_set_01", "jug_01", "brass_goblets"], 18, { cx: 0, cz: 0, r0: 18, r1: 66 }, [0.6, 1.3], AVOID, { tilt: 0.4 }),
  ],
  // Sessiz şehir: sokak lambaları, çöp bidonları, yangın musluğu, telefon kulübesi, terk edilmiş tekerlekli
  // sandalye ve koltuk değnekleri; uzakta apartman cepheleri.
  "tam-bi-delilik": (kit) => [
    ...scatter(kit.random, ["street_lamp_01"], 10, { cx: 0, cz: 0, r0: 30, r1: 74 }, [5.5, 6.5], AVOID, { by: "height", solid: true, round: true }),
    ...scatter(kit.random, ["metal_trash_can", "trashbag", "cardboard_box_01", "old_tyre", "utility_box_01", "power_box_01", "korean_fire_extinguisher_01"], 20, { cx: 0, cz: 0, r0: 20, r1: 72 }, [0.7, 1.3], AVOID, { solid: true }),
    P("fire_hydrant", 14, -46, 1.0, { by: "height", solid: true, round: true }),
    P("korean_public_payphone_01", -18, -62, 2.4, { by: "height", yaw: 0.6, solid: true }),
    P("wheelchair_01", -3, -70, 1.1, { yaw: 2.4, solid: true }),
    P("vintage_crutches_01", -1.4, -71.2, 1.2, { by: "height", yaw: 1.2, tilt: 0.5 }),
    P("hand_truck", 26, -30, 1.3, { by: "height", yaw: -0.8, tilt: -0.9 }),
    P("modular_street_seating", 8, -58, 3.0, { yaw: 1.4, solid: true }),
    P("concrete_road_barrier_02", -30, -36, 2.4, { yaw: 0.4, solid: true }),
    P("concrete_road_barrier_02", -33, -37, 2.4, { yaw: 0.5, solid: true }),
    P("security_camera_01", 20, -50, 0.5, { lift: 5.0, yaw: 2.2 }),
    P("water_manhole_cover", 2, -40, 1.0, { lift: 0.02 }),
    P("modular_fire_escape", 44, -66, 9, { by: "height", yaw: -2.2, solid: true }),
    P("modular_urban_apartments_facade", Math.cos(-1.9) * 92, Math.sin(-1.9) * 92, 28, { by: "height", yaw: -1.9 + Math.PI / 2, solid: true }),
    P("modular_urban_apartments_facade", Math.cos(-1.4) * 96, Math.sin(-1.4) * 96, 32, { by: "height", yaw: -1.4 + Math.PI / 2, solid: true }),
    P("modular_urban_apartments_facade", Math.cos(-2.4) * 94, Math.sin(-2.4) * 94, 26, { by: "height", yaw: -2.4 + Math.PI / 2, solid: true }),
  ],
  // Fırlatma sahası: kapının ve kapsülün çevresinde aletler, projektör, jeneratör, gaz tüpleri, kameralar.
  sextronot: (kit) => [
    P("portable_searchlight", GRAMOPHONE.x + 2, GRAMOPHONE.z - 22, 1.2, { by: "height", yaw: 0.6, solid: true }),
    P("portable_generator", GRAMOPHONE.x - 12, GRAMOPHONE.z - 10, 1.1, { yaw: 1.2, solid: true }),
    P("propane_tank", GRAMOPHONE.x - 10, GRAMOPHONE.z - 6, 1.0, { by: "height", round: true, solid: true }),
    P("small_lpg_tank", GRAMOPHONE.x - 9.2, GRAMOPHONE.z - 7.2, 0.8, { by: "height", round: true }),
    P("metal_toolbox", GRAMOPHONE.x + 6, GRAMOPHONE.z - 9, 0.7, { yaw: 0.3 }),
    P("ammo_box", GRAMOPHONE.x + 7.2, GRAMOPHONE.z - 8.2, 0.6, { yaw: 1.0 }),
    P("vintage_spacecraft_instrument", GRAMOPHONE.x + 3, GRAMOPHONE.z - 11, 0.6, { yaw: 0.4 }),
    P("retro_multimeter", GRAMOPHONE.x + 3.8, GRAMOPHONE.z - 10.2, 0.4, { yaw: 1.5 }),
    P("circuit_board", GRAMOPHONE.x + 2.2, GRAMOPHONE.z - 10.4, 0.4, { yaw: 2.2 }),
    P("old_gas_mask", GRAMOPHONE.x - 6, GRAMOPHONE.z - 16, 0.5, { yaw: 2.6, tilt: 0.3 }),
    P("vintage_video_camera", GRAMOPHONE.x + 9, GRAMOPHONE.z - 16, 0.7, { yaw: -1.0 }),
    P("camera_01", GRAMOPHONE.x + 8.4, GRAMOPHONE.z - 17.4, 0.4, { yaw: 0.9 }),
    P("binoculars", GRAMOPHONE.x - 3, GRAMOPHONE.z - 19, 0.4, { yaw: 1.4 }),
    P("vintage_binocular", GRAMOPHONE.x - 2.2, GRAMOPHONE.z - 18.2, 0.35, { yaw: 2.0 }),
    P("modular_airduct_circular_01", GRAMOPHONE.x - 16, GRAMOPHONE.z - 20, 4.0, { yaw: 0.7, tilt: 0.1, solid: true }),
    P("security_light", GRAMOPHONE.x + 12, GRAMOPHONE.z - 4, 0.6, { lift: 3.2, yaw: 2.4 }),
    ...scatter(kit.random, ["signal_flashlight", "pull_chain_light_socket", "lightbulb_01", "gaming_console", "industrial_caged_sconce"], 8, { cx: GRAMOPHONE.x, cz: GRAMOPHONE.z - 12, r0: 6, r1: 18 }, [0.35, 0.6], AVOID),
  ],
  // İtiraf yolu: şamdanlar, düşmüş bir avize, yalnız bir taş heykel ve kraterin ortasında tek başına duran
  // kapalı bir kilise kapısı (arkasında kimse yok).
  itiraf: (kit) => [
    P("brass_candleholders", GRAMOPHONE.x - 8, GRAMOPHONE.z - 4, 0.9, { by: "height", yaw: 0.4 }),
    P("wooden_candlestick", GRAMOPHONE.x - 2, GRAMOPHONE.z - 16, 0.6, { by: "height" }),
    P("brass_diya_lantern", GRAMOPHONE.x + 4, GRAMOPHONE.z - 24, 0.5, { by: "height" }),
    P("chandelier_01", -6, 24, 2.4, { tilt: 1.1, yaw: 0.6, lift: 0.3, solid: true }),
    P("lantern_chandelier_01", 12, 14, 1.4, { tilt: 0.9, lift: 0.2 }),
    P("caged_hanging_light", -14, 8, 0.8, { tilt: 1.3, lift: 0.1 }),
    P("gothic_statue", -26, 30, 2.8, { yaw: 0.9, solid: true, round: true }),
    P("marble_bust_01", 24, 36, 1.5, { yaw: -2.0, solid: true, round: true }),
    P("large_castle_door", -4, -30, 6.5, { by: "height", yaw: 0.2, solid: true }),
    P("large_iron_gate", 30, -20, 5.5, { by: "height", yaw: -1.1, solid: true }),
    ...scatter(kit.random, ["wooden_candlestick", "brass_diya_lantern", "brass_candleholders"], 14, { cx: 0, cz: 0, r0: 14, r1: 60 }, [0.5, 0.9], AVOID, { by: "height" }),
  ],
  // Dans pisti çevresi: teyp, kasetçalarlar, banklar, çöp bidonu — sokak partisinden kalanlar.
  "boslukta-dans": (kit) => [
    P("boombox", CENTER.x + 6, CENTER.z + 9, 0.7, { yaw: -0.6 }),
    P("cassette_player", CENTER.x - 7, CENTER.z + 8, 0.5, { yaw: 1.2 }),
    P("portable_cassette_player", CENTER.x + 9, CENTER.z - 5, 0.5, { yaw: 2.2 }),
    P("modular_street_seating", 22, 30, 3.0, { yaw: 2.4, solid: true }),
    P("modular_street_seating", -24, 28, 3.0, { yaw: 0.8, solid: true }),
    P("painted_wooden_bench", 30, -6, 1.5, { yaw: 1.6, solid: true }),
    P("metal_trash_can", -20, -10, 1.0, { by: "height", round: true, solid: true }),
    ...scatter(kit.random, ["metal_trash_can", "cardboard_box_01", "trashbag"], 8, { cx: 0, cz: 0, r0: 30, r1: 60 }, [0.7, 1.1], AVOID, { solid: true }),
  ],
  // Özlemin yolu: anılar yol boyunca bırakılmış — bavul, çerçeveler, sepetler, çay takımı, gözlük, çakmak.
  "hala-seni-cok-ozluyorum": (kit) => [
    P("vintage_suitcase", GRAMOPHONE.x - 6, GRAMOPHONE.z - 6, 1.1, { yaw: 0.9, solid: true }),
    P("standing_picture_frame_01", GRAMOPHONE.x - 12, GRAMOPHONE.z - 14, 0.9, { yaw: 2.6 }),
    P("standing_picture_frame_02", -6, 42, 0.8, { yaw: 0.5, tilt: -0.3 }),
    P("hanging_picture_frame_01", 4, 28, 1.0, { tilt: -Math.PI / 2 + 0.1, lift: 0.05 }),
    P("wicker_basket_02", -10, 30, 0.8, { yaw: 1.1 }),
    P("tea_set_01", 8, 18, 0.9, { yaw: 0.4 }),
    P("round_spectacles", -2, 12, 0.35, { yaw: 1.6 }),
    P("vintage_lighter", 3, 8, 0.2, { yaw: 0.2 }),
    P("cigarette_case", 3.6, 7.4, 0.25, { yaw: 1.0 }),
    P("throw_pillows_01", -14, 20, 0.9, { yaw: 2.2 }),
    P("woodenchair_01", 16, 40, 1.9, { by: "height", yaw: -2.2, tilt: 0.5, solid: true }),
    P("jug_01", -18, 50, 0.5, { yaw: 0.3 }),
    ...scatter(kit.random, ["standing_picture_frame_01", "wicker_basket_01", "postcard_set_01", "throw_pillows_01"], 12, { cx: 0, cz: 0, r0: 24, r1: 64 }, [0.5, 1.0], AVOID),
  ],
};

/** Şarkının döşeme grubunu kurar (modelleri olmayanlar atlanır). */
export function dressSong(kit: SceneKit, id: string): THREE.Group | null {
  const build = SONG_DRESSING[id];
  if (!build) return null;
  return dress(kit.models, build(kit), { ground, style: "muted", colliders: kit.colliders, dim: 0.62 });
}

/** Döşemede geçen model adları (yükleme listesi için). */
export function dressingModels(id: string): string[] {
  const build = SONG_DRESSING[id];
  if (!build) return [];
  const seed = 1;
  let s = seed;
  const random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const fake = { random, colliders: undefined } as unknown as SceneKit;
  return [...new Set(build(fake).map((p) => p.model))];
}
// Kullanılmayan içe aktarmaları sustur (bazı tablolar CONE/rim kullanmaz).
void CONE;
void rim;
