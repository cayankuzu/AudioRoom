import * as THREE from "three";

/**
 * WORLD STREAMING / LOD-LIKE PERFORMANS SİSTEMİ
 * ---------------------------------------------
 * Hedef: Ağır dünya detaylarının (binlerce kaya/çakıl instance'ının)
 * tek bir `InstancedMesh` içinde toplanmasını — ki bu durumda Three.js
 * frustum culling'i tamamen devre dışı kalır, çünkü mesh'in bounding
 * sphere'i merkezde tek bir birim küredir — engelleyip:
 *
 *  1) Var olan `InstancedMesh`'leri UZAYSAL HÜCRELERE (cells) böler,
 *  2) Her hücre için ayrı `InstancedMesh` + doğru bounding sphere üretir,
 *  3) Frustum culling otomatik olarak kamera görüşü dışındaki hücreleri
 *     CPU/GPU iş yükünden çıkarır,
 *  4) Uzak ve KÜÇÜK hücrelerde `castShadow`'u devre dışı bırakır
 *     (uzaktaki ince detayların gölgeleri neredeyse görünmez; gölge pass
 *     maliyetini ciddi düşürür).
 *
 * Bu modül REFAKTÖR ETMEDEN mevcut `rocks.ts`'in çıktısına POST-PROCESS
 * olarak uygulanır — böylece kaya üretim mantığı el değmeden kalır.
 */

export interface WorldStreamingOptions {
  /** Hücre kenar uzunluğu (metre). 40m pratikte iyi bir denge. */
  cellSize?: number;
  /**
   * Eğer bir InstancedMesh bu eşikten daha az instance'a sahipse
   * bucketing'e alınmaz (küçük katmanlar zaten ucuz — parçalamak
   * gereksiz draw-call'a yol açar).
   */
  minInstancesToBucket?: number;
  /**
   * Maks. oyuncu uzaklığında gölge bırakılmayacak mesh adı (regex).
   * rocks.ts'de isimler `rocks:micro`, `rocks:pebble` gibidir — bu
   * desen ile küçük kategoriler dinamik olarak tespit edilir.
   */
  smallCategoryNameRegex?: RegExp;
  /** Küçük kategoriler için gölge kapanma mesafesi (metre). */
  smallShadowCullDistance?: number;
}

const DEFAULTS: Required<WorldStreamingOptions> = {
  cellSize: 40,
  minInstancesToBucket: 220,
  smallCategoryNameRegex: /:(gravel|pebble|micro)$/,
  smallShadowCullDistance: 55,
};

interface BucketedMeshRef {
  mesh: THREE.InstancedMesh;
  /** Hücrenin dünya-uzayı merkezi (xz). */
  cellCenter: THREE.Vector2;
  /** Küçük kategori mi? (gölge culling için). */
  isSmallCategory: boolean;
}

export interface WorldStreamingHandle {
  /** Periyodik güncelleme — her frame çağrılabilir, düşük frekansla iş yapar. */
  update(cameraPos: THREE.Vector3): void;
  /** Debug — kaç hücreye bölündü. */
  readonly bucketCount: number;
  /** Debug — kaç orijinal mesh bucketlendi. */
  readonly bucketedMeshCount: number;
}

/**
 * `group` içindeki `InstancedMesh`'leri uzaysal hücrelere böler.
 *
 * DİKKAT: Orijinal InstancedMesh'ler gruptan çıkarılır ve yerine
 * cell-başına yeni InstancedMesh'ler eklenir. Böylece rocks.ts tarafında
 * `mesh.instanceMatrix.needsUpdate = true` yapılmış olması sorun değil —
 * biz zaten oradan matrisleri okuyup taşıdık.
 */
export function bucketInstancedMeshes(
  group: THREE.Group,
  options: WorldStreamingOptions = {},
): WorldStreamingHandle {
  const opts = { ...DEFAULTS, ...options };
  const bucketed: BucketedMeshRef[] = [];
  let bucketedSourceCount = 0;

  const sources: THREE.InstancedMesh[] = [];
  group.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh) {
      sources.push(o as THREE.InstancedMesh);
    }
  });

  const tmpMat = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3();

  for (const src of sources) {
    if (src.count < opts.minInstancesToBucket) continue;

    const isSmall = opts.smallCategoryNameRegex.test(src.name);
    const geometry = src.geometry;
    const material = src.material;
    const castShadow = src.castShadow;
    const receiveShadow = src.receiveShadow;
    const sourceName = src.name || "rocks:layer";

    /**
     * Instance'ları hücrelere göre sınıflandır. Kaynak mesh'in
     * `instanceColor`'ı varsa, onu da hücre-başına aktarırız — yoksa
     * rocks.ts'in ürettiği per-instance ton çeşitliliği bucketing'den
     * sonra kaybolurdu.
     */
    const srcColor = src.instanceColor as THREE.InstancedBufferAttribute | null;
    const cellMap = new Map<
      string,
      {
        mats: THREE.Matrix4[];
        colors: number[] | null;
        maxScale: number;
        cx: number;
        cz: number;
      }
    >();

    for (let i = 0; i < src.count; i += 1) {
      src.getMatrixAt(i, tmpMat);
      tmpMat.decompose(tmpPos, tmpQuat, tmpScale);
      const gx = Math.floor(tmpPos.x / opts.cellSize);
      const gz = Math.floor(tmpPos.z / opts.cellSize);
      const key = `${gx},${gz}`;
      let bucket = cellMap.get(key);
      if (!bucket) {
        bucket = {
          mats: [],
          colors: srcColor ? [] : null,
          maxScale: 0,
          cx: (gx + 0.5) * opts.cellSize,
          cz: (gz + 0.5) * opts.cellSize,
        };
        cellMap.set(key, bucket);
      }
      bucket.mats.push(tmpMat.clone());
      if (srcColor && bucket.colors) {
        const r = srcColor.getX(i);
        const g = srcColor.getY(i);
        const b = srcColor.getZ(i);
        bucket.colors.push(r, g, b);
      }
      const s = Math.max(tmpScale.x, tmpScale.y, tmpScale.z);
      if (s > bucket.maxScale) bucket.maxScale = s;
    }

    /** Her hücre için ayrı InstancedMesh üret. */
    for (const [key, bucket] of cellMap) {
      if (bucket.mats.length === 0) continue;
      const mesh = new THREE.InstancedMesh(geometry, material, bucket.mats.length);
      mesh.name = `${sourceName}:cell:${key}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      for (let j = 0; j < bucket.mats.length; j += 1) {
        mesh.setMatrixAt(j, bucket.mats[j]);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = true;

      if (bucket.colors && bucket.colors.length === bucket.mats.length * 3) {
        const colorAttr = new THREE.InstancedBufferAttribute(
          new Float32Array(bucket.colors),
          3,
        );
        mesh.instanceColor = colorAttr;
        colorAttr.needsUpdate = true;
      }

      /**
       * Doğru bounding sphere: hücre merkezinde, hücrenin köşegenini
       * kaplayacak + en büyük instance scale'i kadar marj. Bu sayede
       * frustum culling hem hatalı kırpma yapmaz hem de gerçekten
       * kameraya görünmeyen hücreleri otomatik eler.
       */
      const cellHalfDiag = Math.hypot(opts.cellSize, opts.cellSize) * 0.5;
      const boundsRadius = cellHalfDiag + bucket.maxScale * 1.2;
      mesh.geometry = geometry;
      /**
       * Three.js InstancedMesh frustum culling, mesh'in `boundingSphere`
       * ve konumuna bakar. Kendi özel `boundingSphere` atayabiliriz:
       */
      const boundsCenter = new THREE.Vector3(bucket.cx, 0, bucket.cz);
      mesh.position.set(0, 0, 0);
      /**
       * InstancedMesh'in kendi `boundingSphere` alanını override ediyoruz —
       * Three.js r150+ bu değeri frustum culling için dikkate alır.
       */
      const sphere = new THREE.Sphere(boundsCenter, boundsRadius);
      mesh.boundingSphere = sphere;
      /**
       * Bounding box da güvenli tarafta tut — bazı pass'ler (shadow)
       * bounding box üzerinden çalışır.
       */
      mesh.boundingBox = new THREE.Box3(
        new THREE.Vector3(boundsCenter.x - boundsRadius, -50, boundsCenter.z - boundsRadius),
        new THREE.Vector3(boundsCenter.x + boundsRadius, 50, boundsCenter.z + boundsRadius),
      );

      group.add(mesh);
      bucketed.push({
        mesh,
        cellCenter: new THREE.Vector2(bucket.cx, bucket.cz),
        isSmallCategory: isSmall,
      });
    }

    /** Orijinal InstancedMesh'i gruptan çıkar ve serbest bırak. */
    group.remove(src);
    src.dispose();
    bucketedSourceCount += 1;
  }

  /**
   * Sık kontrol gerekmez — 0.25s'de bir yeterli (oyuncu hızı ≤ 8.5 m/s
   * olduğu için hücre durumları çabuk değişmez).
   */
  let accum = 0;
  const UPDATE_INTERVAL = 0.25;
  let lastCamPos = new THREE.Vector3(Infinity, 0, Infinity);

  return {
    get bucketCount() {
      return bucketed.length;
    },
    get bucketedMeshCount() {
      return bucketedSourceCount;
    },
    update(cameraPos) {
      /**
       * Low-frequency: sadece zaman geçtiyse veya kamera 1m'den fazla
       * hareket ettiyse yeniden değerlendir. Böylece her frame'de yüzlerce
       * mesh üzerinde gezmeyiz.
       */
      const dx = cameraPos.x - lastCamPos.x;
      const dz = cameraPos.z - lastCamPos.z;
      const moved = dx * dx + dz * dz > 1;
      accum += 0.016; // yaklaşık 60fps varsayımı; güncelleme periyodu için yeterli
      if (!moved && accum < UPDATE_INTERVAL) return;
      accum = 0;
      lastCamPos.copy(cameraPos);

      const sqCull = opts.smallShadowCullDistance * opts.smallShadowCullDistance;
      for (const ref of bucketed) {
        if (!ref.isSmallCategory) continue;
        const ddx = ref.cellCenter.x - cameraPos.x;
        const ddz = ref.cellCenter.y - cameraPos.z;
        const d2 = ddx * ddx + ddz * ddz;
        /**
         * Uzak küçük hücreler: gölge üretimini kapat. Görsel olarak
         * neredeyse hiçbir fark yaratmaz; gölge pass maliyetini kırar.
         */
        const shouldCast = d2 < sqCull;
        if (ref.mesh.castShadow !== shouldCast) {
          ref.mesh.castShadow = shouldCast;
        }
      }
    },
  };
}
