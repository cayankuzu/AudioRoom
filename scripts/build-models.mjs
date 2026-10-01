// Kaynak modelleri (assets-src/models) web için sıkıştırıp public/models'e yazar.
// Kullanım: npm run models
import fs from "node:fs/promises";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  metalRough,
  meshopt,
  prune,
  resample,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const SRC = "assets-src/models";
const OUT = "public/models";

/** ratio: korunacak üçgen oranı · texture: en büyük doku kenarı (px) */
const MODELS = [
  { src: "redd-figure.glb", ratio: 0.15, texture: 512 },
  { src: "hayko-infant.glb", ratio: 0.2, texture: 1024 },
  { src: "klostro-turtle.glb", ratio: 0.18, texture: 1024 },
  { src: "klostro-carrot.glb", texture: 256 },
  {
    src: "klostro-bunny-run.glb",
    out: "klostro-bunny.glb",
    texture: 1024,
    mergeAnimationsFrom: "klostro-bunny-walk.glb",
  },
];

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder,
});
await fs.mkdir(OUT, { recursive: true });

for (const model of MODELS) {
  const document = await io.read(path.join(SRC, model.src));

  if (model.mergeAnimationsFrom) {
    await copyAnimations(document, await io.read(path.join(SRC, model.mergeAnimationsFrom)));
  }

  const steps = [metalRough(), dedup(), weld()];
  if (model.ratio) {
    steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: model.ratio, error: 0.002 }));
  }
  steps.push(
    resample(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [model.texture, model.texture] }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await document.transform(...steps);

  const outFile = path.join(OUT, model.out ?? model.src);
  await io.write(outFile, document);
  const { size } = await fs.stat(outFile);
  console.log(`${model.src} → ${outFile} (${(size / 1024).toFixed(0)} KB)`);
}

await fs.copyFile(path.join(SRC, "kuantum-cat.stl"), path.join(OUT, "kuantum-cat.stl"));
console.log("kuantum-cat.stl kopyalandı");

/**
 * İkinci dosyadaki animasyonları, aynı isimli kemiklere yeniden bağlayarak
 * hedef dokümana taşır. Böylece yürüme + koşma tek modelde durur.
 */
async function copyAnimations(target, source) {
  const nodesByName = new Map(target.getRoot().listNodes().map((node) => [node.getName(), node]));
  const buffer = target.getRoot().listBuffers()[0];
  for (const sourceAnimation of source.getRoot().listAnimations()) {
    const animation = target.createAnimation(sourceAnimation.getName());
    for (const sourceChannel of sourceAnimation.listChannels()) {
      const node = nodesByName.get(sourceChannel.getTargetNode()?.getName());
      if (!node) continue;
      const sourceSampler = sourceChannel.getSampler();
      const input = target
        .createAccessor()
        .setArray(sourceSampler.getInput().getArray().slice())
        .setType(sourceSampler.getInput().getType())
        .setBuffer(buffer);
      const output = target
        .createAccessor()
        .setArray(sourceSampler.getOutput().getArray().slice())
        .setType(sourceSampler.getOutput().getType())
        .setBuffer(buffer);
      const sampler = target
        .createAnimationSampler()
        .setInput(input)
        .setOutput(output)
        .setInterpolation(sourceSampler.getInterpolation());
      animation.addSampler(sampler).addChannel(
        target
          .createAnimationChannel()
          .setTargetNode(node)
          .setTargetPath(sourceChannel.getTargetPath())
          .setSampler(sampler),
      );
    }
  }
}
