/**
 * Pure 3D anatomical mesh neutralization utilities.
 * Transforms a male-proportioned anatomical human mesh into a clean, medical-grade,
 * gender-neutral / universal human silhouette suitable for both female and male patients:
 *  1. Removes external male genital pouch triangles in `skin_shell` and seals every resulting
 *     collar loop with a smooth concentric manifold patch + harmonic/Laplacian surface fairing.
 *  2. Removes external male urethral/reproductive tract triangles in `visceral_context`.
 *  3. Harmonizes whole-body masculine proportions (broad V-taper shoulders, bulky lower pectoral
 *     shelf, narrow hips, thick neck/laryngeal prominence, heavy brow) into a balanced universal
 *     medical human silhouette while keeping all anatomical layers registered in lockstep.
 */

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x < edge0 ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function smoothBand(
  x: number,
  riseStart: number,
  riseEnd: number,
  fallStart: number,
  fallEnd: number
): number {
  return smoothstep(riseStart, riseEnd, x) * (1 - smoothstep(fallStart, fallEnd, x));
}

/**
 * C2-smooth spatial warp mapping masculine skeletal/muscular/skin proportions to a
 * balanced, gender-neutral medical human silhouette. Applied identically across
 * `skin_shell`, `muscular_layer`, `skeleton_frame`, `vascular_tree`, `visceral_context`,
 * and `organ_*` so every internal organ, bone, and vessel stays 100% registered.
 */
export function warpPointToUniversalSilhouette(
  x: number,
  y: number,
  z: number
): [number, number, number] {
  const ax = Math.abs(x);
  const sx = x >= 0 ? 1 : -1;

  // 1. Soften overly broad male shoulders & upper deltoids (y in [0.72, 1.30])
  const shoulderW = smoothBand(y, 0.72, 0.94, 1.18, 1.30);

  // Smoothly translate hanging arms inward to match the narrower universal shoulder joint
  const armWeight =
    smoothstep(0.265, 0.315, ax) * smoothBand(y, -0.18, -0.02, 1.02, 1.18);

  let nx: number;
  if (armWeight > 0.001) {
    const torsoX = x * (1 - 0.068 * shoulderW);
    const armShiftX = x - sx * 0.021 * smoothBand(y, -0.18, 0.02, 1.12, 1.28);
    nx = torsoX * (1 - armWeight) + armShiftX * armWeight;
  } else {
    const neckJawNarrow = 0.052 * smoothBand(y, 1.22, 1.29, 1.40, 1.49);
    const waistTaper =
      0.034 *
      smoothBand(y, 0.33, 0.44, 0.54, 0.66) *
      (1 - smoothstep(0.24, 0.29, ax));
    const hipBalance =
      0.044 *
      smoothBand(y, -0.10, 0.04, 0.20, 0.34) *
      (1 - smoothstep(0.25, 0.30, ax));
    nx = x * (1 - 0.068 * shoulderW - neckJawNarrow - waistTaper + hipBalance);
  }

  const ny = y;
  let nz = z;

  // 2. Soften anterior laryngeal prominence (Adam's apple) & heavy supraorbital brow ridge
  const larynxW =
    smoothBand(y, 1.25, 1.29, 1.33, 1.37) *
    (1 - smoothstep(0.015, 0.045, ax)) *
    smoothstep(0.02, 0.06, z);
  nz -= 0.010 * larynxW;

  const browW =
    smoothBand(y, 1.54, 1.565, 1.59, 1.615) *
    (1 - smoothstep(0.03, 0.075, ax)) *
    smoothstep(0.11, 0.15, z);
  nz -= 0.006 * browW;

  // 3. Soften squared male lower pectoral shelf into a clean, neutral unisex thoracic contour
  const pecW =
    smoothBand(y, 0.71, 0.78, 0.94, 1.03) *
    smoothBand(ax, 0.02, 0.06, 0.16, 0.22) *
    smoothstep(0.08, 0.16, z);
  nz -= 0.014 * pecW;

  return [nx, ny, nz];
}

export function neutralizeBodyLayerPositions(positions: Float32Array): Float32Array {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const [nx, ny, nz] = warpPointToUniversalSilhouette(
      positions[i],
      positions[i + 1],
      positions[i + 2]
    );
    out[i] = nx;
    out[i + 1] = ny;
    out[i + 2] = nz;
  }
  return out;
}

export function neutralPubisEnvelopeZ(absX: number, y: number): number {
  const t = Math.max(0, Math.min(1, (y - 0.005) / (0.175 - 0.005)));
  const baseZ = 0.066 + 0.064 * Math.pow(t, 0.88);
  const lateralBlend = 0.012 * smoothstep(0.035, 0.082, absX);
  return baseZ + lateralBlend;
}

export function neutralPerinealArchMinY(absX: number, z: number): number {
  const antFactor = smoothstep(-0.055, 0.025, z);
  const midFactor = 1 - smoothstep(0.032, 0.074, absX);
  return (-0.036 + 0.056 * antFactor) * midFactor + -0.056 * (1 - midFactor);
}

/**
 * Removes external male genital triangles from `skin_shell`, caps every resulting open
 * pelvic/perineal boundary loop with a clean 2-ring concentric manifold patch, applies
 * whole-body universal proportion warping, and runs Laplacian surface fairing across the
 * pubic/perineal patch and anterior chest so vertex normals are glass-smooth.
 */
export function neutralizeSkinShellMesh(
  rawPositions: Float32Array,
  rawIndices: Uint16Array | Uint32Array
): {
  positions: Float32Array;
  indices: Uint16Array | Uint32Array;
  removedTriangleCount: number;
  sealedLoopCount: number;
} {
  const origVertCount = rawPositions.length / 3;

  // 1. Deduplicate any stray repeated triangles from original boolean mesh export
  const seenTri = new Set<string>();
  const uniqueTris: number[] = [];
  for (let i = 0; i < rawIndices.length; i += 3) {
    const a = rawIndices[i];
    const b = rawIndices[i + 1];
    const c = rawIndices[i + 2];
    if (a === b || b === c || c === a) continue;
    const key = [a, b, c].sort((p, q) => p - q).join('_');
    if (seenTri.has(key)) continue;
    seenTri.add(key);
    uniqueTris.push(a, b, c);
  }

  // 2. Identify external male genital pouch vertices in original coordinates
  const inGenital = new Uint8Array(origVertCount);
  for (let v = 0; v < origVertCount; v++) {
    const ax = Math.abs(rawPositions[v * 3]);
    const y = rawPositions[v * 3 + 1];
    const z = rawPositions[v * 3 + 2];
    if (ax <= 0.066 && y >= -0.060 && y <= 0.150) {
      const planeZ = 0.018 + 0.64 * Math.max(0, y);
      if (z > planeZ || (y < 0.022 && z > 0.008 && ax < 0.058)) {
        inGenital[v] = 1;
      }
    }
  }

  // Find top-of-head vertex to anchor main body connectivity
  let headSeed = 0;
  for (let v = 1; v < origVertCount; v++) {
    if (rawPositions[v * 3 + 1] > rawPositions[headSeed * 3 + 1]) {
      headSeed = v;
    }
  }

  // 3. Iteratively clean islands, dangling fin triangles, and pinch vertices so every hole boundary is a simple closed loop
  let keptTris: number[] = [];
  let holeNext = new Map<number, number>();

  for (let pass = 0; pass < 18; pass++) {
    let changed = false;
    keptTris = [];
    const edgeCnt = new Map<string, number>();
    const removedEdges = new Set<string>();

    for (let i = 0; i < uniqueTris.length; i += 3) {
      const a = uniqueTris[i];
      const b = uniqueTris[i + 1];
      const c = uniqueTris[i + 2];
      if (inGenital[a] || inGenital[b] || inGenital[c]) {
        const e1 = a < b ? `${a}_${b}` : `${b}_${a}`;
        const e2 = b < c ? `${b}_${c}` : `${c}_${b}`;
        const e3 = c < a ? `${c}_${a}` : `${a}_${c}`;
        removedEdges.add(e1);
        removedEdges.add(e2);
        removedEdges.add(e3);
      } else {
        keptTris.push(a, b, c);
        for (const [u, v] of [
          [a, b],
          [b, c],
          [c, a],
        ]) {
          const k = u < v ? `${u}_${v}` : `${v}_${u}`;
          edgeCnt.set(k, (edgeCnt.get(k) || 0) + 1);
        }
      }
    }

    // Absorb any disconnected groin islands unreachable from headSeed
    const kAdj: number[][] = Array.from({ length: origVertCount }, () => []);
    for (let i = 0; i < keptTris.length; i += 3) {
      const a = keptTris[i];
      const b = keptTris[i + 1];
      const c = keptTris[i + 2];
      kAdj[a].push(b, c);
      kAdj[b].push(a, c);
      kAdj[c].push(a, b);
    }
    const reach = new Uint8Array(origVertCount);
    const rq = [headSeed];
    reach[headSeed] = 1;
    while (rq.length > 0) {
      const u = rq.pop()!;
      for (const w of kAdj[u]) {
        if (!reach[w]) {
          reach[w] = 1;
          rq.push(w);
        }
      }
    }
    for (let v = 0; v < origVertCount; v++) {
      if (
        !inGenital[v] &&
        !reach[v] &&
        rawPositions[v * 3 + 1] < 0.3 &&
        Math.abs(rawPositions[v * 3]) < 0.16
      ) {
        inGenital[v] = 1;
        changed = true;
      }
    }

    // Absorb fin triangles with >= 2 open hole edges
    for (let i = 0; i < keptTris.length; i += 3) {
      const tri = [keptTris[i], keptTris[i + 1], keptTris[i + 2]];
      const openFlags = [0, 1, 2].map(( idxEdge ) => {
        const u = tri[idxEdge];
        const v = tri[(idxEdge + 1) % 3];
        const k = u < v ? `${u}_${v}` : `${v}_${u}`;
        return edgeCnt.get(k) === 1 && removedEdges.has(k);
      });
      const openCount = openFlags.filter(Boolean).length;
      if (openCount >= 2) {
        for (let idxV = 0; idxV < 3; idxV++) {
          const prevOpen = openFlags[(idxV + 2) % 3];
          const nextOpen = openFlags[idxV];
          if (prevOpen && nextOpen && !inGenital[tri[idxV]]) {
            inGenital[tri[idxV]] = 1;
            changed = true;
          }
        }
      }
    }

    // Collect directed boundary half-edges (reversed so cap triangles inherit outward winding)
    const multiNext = new Map<number, number[]>();
    const inDeg = new Map<number, number>();
    for (let i = 0; i < keptTris.length; i += 3) {
      const a = keptTris[i];
      const b = keptTris[i + 1];
      const c = keptTris[i + 2];
      for (const [u, v] of [
        [a, b],
        [b, c],
        [c, a],
      ]) {
        const k = u < v ? `${u}_${v}` : `${v}_${u}`;
        if (edgeCnt.get(k) === 1 && removedEdges.has(k)) {
          if (!multiNext.has(v)) multiNext.set(v, []);
          multiNext.get(v)!.push(u);
          inDeg.set(u, (inDeg.get(u) || 0) + 1);
        }
      }
    }

    for (const [v, outs] of multiNext) {
      if (outs.length !== 1 || (inDeg.get(v) || 0) !== 1) {
        inGenital[v] = 1;
        changed = true;
      }
    }

    if (!changed) {
      holeNext = new Map<number, number>();
      for (const [v, outs] of multiNext) {
        holeNext.set(v, outs[0]);
      }
      break;
    }
  }

  const removedTriangleCount = uniqueTris.length / 3 - keptTris.length / 3;

  // 4. Trace all simple closed boundary loops and cap each with a clean 2-ring concentric manifold patch
  const posList = Array.from(rawPositions);
  const capVertFlags: number[] = new Array(origVertCount).fill(0);
  const boundaryCollarSet = new Set<number>();
  const visitedLoopVerts = new Set<number>();
  let sealedLoopCount = 0;

  for (const startV of holeNext.keys()) {
    if (visitedLoopVerts.has(startV)) continue;
    const loop: number[] = [];
    let cur: number | undefined = startV;
    while (cur !== undefined && !visitedLoopVerts.has(cur)) {
      visitedLoopVerts.add(cur);
      loop.push(cur);
      boundaryCollarSet.add(cur);
      cur = holeNext.get(cur);
    }
    if (loop.length < 3 || cur !== startV) continue;

    sealedLoopCount++;
    const m = loop.length;

    // Compute loop centroid
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const v of loop) {
      cx += posList[v * 3];
      cy += posList[v * 3 + 1];
      cz += posList[v * 3 + 2];
    }
    cx /= m;
    cy /= m;
    cz /= m;

    // Add intermediate ring at 50% radial blend + 1 center vertex
    const midRingIndices: number[] = [];
    for (let i = 0; i < m; i++) {
      const bv = loop[i];
      const mx = (posList[bv * 3] + cx) * 0.5;
      const my = (posList[bv * 3 + 1] + cy) * 0.5;
      const mz = (posList[bv * 3 + 2] + cz) * 0.5;
      const newIdx = posList.length / 3;
      posList.push(mx, my, mz);
      capVertFlags.push(1);
      midRingIndices.push(newIdx);
    }

    const centerIdx = posList.length / 3;
    posList.push(cx, cy, cz);
    capVertFlags.push(1);

    // Stitch outer ring (loop -> midRing) and inner fan (midRing -> center) with consistent outward winding
    for (let i = 0; i < m; i++) {
      const nextI = (i + 1) % m;
      const b0 = loop[i];
      const b1 = loop[nextI];
      const m0 = midRingIndices[i];
      const m1 = midRingIndices[nextI];
      keptTris.push(b0, b1, m1);
      keptTris.push(b0, m1, m0);
      keptTris.push(m0, m1, centerIdx);
    }
  }

  // 5. Apply whole-body masculine -> universal silhouette warp across all vertices
  const totalVerts = posList.length / 3;
  const pos = new Float32Array(posList.length);
  for (let v = 0; v < totalVerts; v++) {
    const [nx, ny, nz] = warpPointToUniversalSilhouette(
      posList[v * 3],
      posList[v * 3 + 1],
      posList[v * 3 + 2]
    );
    pos[v * 3] = nx;
    pos[v * 3 + 1] = ny;
    pos[v * 3 + 2] = nz;
  }

  // 6. Build adjacency on the newly sealed manifold mesh for smooth Laplacian fairing
  const adj: number[][] = Array.from({ length: totalVerts }, () => []);
  const addNeighbor = (a: number, b: number) => {
    if (!adj[a].includes(b)) adj[a].push(b);
    if (!adj[b].includes(a)) adj[b].push(a);
  };
  for (let i = 0; i < keptTris.length; i += 3) {
    const a = keptTris[i];
    const b = keptTris[i + 1];
    const c = keptTris[i + 2];
    addNeighbor(a, b);
    addNeighbor(b, c);
    addNeighbor(c, a);
  }

  // 2-ring collar around the sealed groin seam for invisible C1 transition
  const collarRing2 = new Set<number>(boundaryCollarSet);
  for (const bv of boundaryCollarSet) {
    for (const nb of adj[bv]) collarRing2.add(nb);
  }

  const chestWeights = new Float32Array(totalVerts);
  const groinFairWeights = new Float32Array(totalVerts);
  for (let v = 0; v < totalVerts; v++) {
    const ax = Math.abs(pos[v * 3]);
    const y = pos[v * 3 + 1];
    const z = pos[v * 3 + 2];

    if (capVertFlags[v] === 1) {
      groinFairWeights[v] = 0.72;
    } else if (boundaryCollarSet.has(v)) {
      groinFairWeights[v] = 0.55;
    } else if (collarRing2.has(v)) {
      groinFairWeights[v] = 0.32;
    } else {
      groinFairWeights[v] =
        0.38 *
        (1 - smoothstep(0.052, 0.088, ax)) *
        smoothBand(y, -0.075, -0.04, 0.145, 0.185) *
        smoothstep(-0.05, 0.01, z);
    }

    chestWeights[v] =
      (1 - smoothstep(0.16, 0.22, ax)) *
      smoothBand(y, 0.70, 0.76, 0.98, 1.05) *
      smoothstep(0.08, 0.15, z);
  }

  const scratch = new Float32Array(pos.length);
  for (let iter = 0; iter < 28; iter++) {
    scratch.set(pos);
    for (let v = 0; v < totalVerts; v++) {
      const gw = groinFairWeights[v];
      const cw = iter < 10 ? chestWeights[v] * 0.28 : 0;
      const alpha = Math.max(gw, cw);
      if (alpha < 0.002 || adj[v].length === 0) continue;

      let sx = 0;
      let sy = 0;
      let sz = 0;
      const nbs = adj[v];
      for (let k = 0; k < nbs.length; k++) {
        const u3 = nbs[k] * 3;
        sx += pos[u3];
        sy += pos[u3 + 1];
        sz += pos[u3 + 2];
      }
      const inv = 1 / nbs.length;
      let nx = pos[v * 3] * (1 - alpha) + sx * inv * alpha;
      let ny = pos[v * 3 + 1] * (1 - alpha) + sy * inv * alpha;
      let nz = pos[v * 3 + 2] * (1 - alpha) + sz * inv * alpha;

      // Enforce clean gender-neutral pubic & perineal envelope
      if (gw > 0.2) {
        const ax = Math.abs(nx);
        const capZ = neutralPubisEnvelopeZ(ax, ny);
        if (nz > capZ) nz = capZ;
        const minY = neutralPerinealArchMinY(ax, nz);
        if (ny < minY) ny = minY;
      }

      scratch[v * 3] = nx;
      scratch[v * 3 + 1] = ny;
      scratch[v * 3 + 2] = nz;
    }
    pos.set(scratch);
  }

  // 7. Compact unreferenced vertices (such as removed genital pouch vertices) so POSITION buffer & glTF bounds are 100% clean
  const usedMap = new Int32Array(totalVerts).fill(-1);
  const compactPos: number[] = [];
  let compactCount = 0;
  for (let i = 0; i < keptTris.length; i++) {
    const oldV = keptTris[i];
    if (usedMap[oldV] === -1) {
      usedMap[oldV] = compactCount++;
      compactPos.push(pos[oldV * 3], pos[oldV * 3 + 1], pos[oldV * 3 + 2]);
    }
    keptTris[i] = usedMap[oldV];
  }

  const finalPositions = new Float32Array(compactPos);
  const outIndices =
    compactCount > 65535 ? new Uint32Array(keptTris) : new Uint16Array(keptTris);

  return {
    positions: finalPositions,
    indices: outIndices,
    removedTriangleCount,
    sealedLoopCount,
  };
}

/**
 * Filters out triangles belonging to the external male penile urethra / lower reproductive
 * tract in `visceral_context` (`y < 0.076 && z > -0.022` or `y < 0.045`).
 */
export function filterVisceralMaleTractIndices(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array
): Uint16Array | Uint32Array {
  const kept: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    const minY = Math.min(
      positions[a * 3 + 1],
      positions[b * 3 + 1],
      positions[c * 3 + 1]
    );
    const maxZ = Math.max(
      positions[a * 3 + 2],
      positions[b * 3 + 2],
      positions[c * 3 + 2]
    );
    if (minY < 0.045 || (minY < 0.076 && maxZ > -0.022)) {
      continue;
    }
    kept.push(a, b, c);
  }
  return indices instanceof Uint32Array ? new Uint32Array(kept) : new Uint16Array(kept);
}
