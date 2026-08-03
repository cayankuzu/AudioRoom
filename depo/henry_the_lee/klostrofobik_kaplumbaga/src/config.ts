export const WORLD = {
  radius: 92,
  fogColor: "#2b1d0c",
  fogDensity: 0.0115,
  centerExclusion: 0,
} as const;

export const PLAYER = {
  start: { x: 0, z: 43 },
  eyeHeight: 1.72,
  walkSpeed: 5.4,
  sprintSpeed: 9.2,
  acceleration: 12,
  jumpSpeed: 6.4,
  gravity: 17,
  crouchEyeHeight: 1.08,
  crouchSpeed: 3.2,
  sprintDuration: 3,
  sprintRecharge: 6,
} as const;

export const BUNNY = {
  height: 2.25,
  runSpeed: 8.2,
  walkSpeed: 2.75,
  hitRadius: 1.05,
  collectRadius: 3,
  routeRadius: 27,
  stopDuration: 3,
  hitWindow: 3,
  gramophoneReach: 1.65,
  recordReach: 1.45,
  guardRadius: 9,
  boundaryRadius: 72,
} as const;

export const BLASTER = {
  speed: 42,
  gravity: 9.8,
  cooldown: 0.28,
  groundBounce: 0.48,
  wallBounce: 0.64,
} as const;

export const GRAMOPHONE = {
  position: { x: -16, z: 17 },
  interactRadius: 3.4,
} as const;

export const ASSETS = {
  turtleModel:
    "../../../henry_the_lee/klostrofobik_kaplumbaga/models/shellbound-turtle-quality.glb",
  turtleModels: {
    performance:
      "../../../henry_the_lee/klostrofobik_kaplumbaga/models/shellbound-turtle-performance.glb",
    balanced:
      "../../../henry_the_lee/klostrofobik_kaplumbaga/models/shellbound-turtle-balanced.glb",
    quality:
      "../../../henry_the_lee/klostrofobik_kaplumbaga/models/shellbound-turtle-quality.glb",
  },
  bunnyRunning:
    "../../../henry_the_lee/klostrofobik_kaplumbaga/models/dapper-bunny-running.glb",
  bunnyWalking:
    "../../../henry_the_lee/klostrofobik_kaplumbaga/models/dapper-bunny-walking.glb",
  albumCover:
    "../../../henry_the_lee/klostrofobik_kaplumbaga/images/album-cover.jpg",
  carrotModel:
    "../../../henry_the_lee/klostrofobik_kaplumbaga/models/low-poly-carrot.glb",
  carrotBodyTexture:
    "../../../henry_the_lee/klostrofobik_kaplumbaga/models/Carrot_Texture.png",
  carrotLeavesTexture:
    "../../../henry_the_lee/klostrofobik_kaplumbaga/models/Carrot_Leaves_Texture.png",
  fontRegular: "../../../assets/fonts/gentilis_regular.typeface.json",
  fontBold: "../../../assets/fonts/gentilis_bold.typeface.json",
} as const;

export const ALBUM = {
  artist: "Henry the Lee",
  title: "Klostrofobik Kaplumbağa",
  videoId: "NT6uepCbmEo",
  playlistId: "RDNT6uepCbmEo",
  url: "https://www.youtube.com/watch?v=NT6uepCbmEo&list=RDNT6uepCbmEo&start_radio=1",
} as const;
