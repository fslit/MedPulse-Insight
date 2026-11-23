import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  filterVisceralMaleTractIndices,
  neutralPerinealArchMinY,
  neutralPubisEnvelopeZ,
  neutralizeSkinShellMesh,
  warpPointToUniversalSilhouette,
} from './anatomyNeutralizer';

test('warpPointToUniversalSilhouette softens broad male shoulders, pectoral shelf, and balances hips', () => {
  // Broad shoulder point (x = 0.24, y = 1.06) narrows smoothly
  const [sx] = warpPointToUniversalSilhouette(0.24, 1.06, 0.02);
  assert.ok(sx < 0.24 && sx > 0.22, `Expected softened shoulder x, got ${sx}`);

  // Pelvic/hip point (x = 0.21, y = 0.12) gently balances outward relative to waist
  const [hx] = warpPointToUniversalSilhouette(0.21, 0.12, 0.0);
  assert.ok(hx > 0.21 && hx < 0.225, `Expected balanced hip x, got ${hx}`);

  // Anterior lower pectoral shelf (x = 0.11, y = 0.84, z = 0.22) softens inward
  const [, , pz] = warpPointToUniversalSilhouette(0.11, 0.84, 0.22);
  assert.ok(pz < 0.22 && pz > 0.20, `Expected softened pectoral z, got ${pz}`);
});

test('filterVisceralMaleTractIndices removes external male urethral triangles while preserving pelvic viscera', () => {
  const positions = new Float32Array([
    // Tri 0: Male penile urethra outside pelvis (y = -0.04..0.02, z = 0.11)
    0.0, -0.04, 0.115,
    0.001, 0.01, 0.108,
    -0.001, 0.02, 0.104,
    // Tri 1: Internal abdominal/pelvic viscera (y = 0.24..0.28, z = 0.03)
    -0.05, 0.24, 0.03,
    0.05, 0.24, 0.03,
    0.0, 0.28, 0.02,
  ]);
  const indices = new Uint16Array([0, 1, 2, 3, 4, 5]);
  const filtered = filterVisceralMaleTractIndices(positions, indices);
  assert.equal(filtered.length, 3);
  assert.deepEqual(Array.from(filtered), [3, 4, 5]);
});

test('neutralizeSkinShellMesh removes groin protrusion on synthetic dome-with-pouch mesh', () => {
  // Build a connected 8-vertex outer ring outside genital box around a central groin spike v=4 at z=0.195
  const rawPos = new Float32Array([
    -0.08, 0.17, 0.08,   0.0, 0.18, 0.09,   0.08, 0.17, 0.08,
    -0.08, 0.06, 0.07,   0.0, 0.06, 0.195,  0.08, 0.06, 0.07,
    -0.08, -0.08, 0.05,  0.0, -0.08, 0.05,  0.08, -0.08, 0.05,
    0.0, 1.70, 0.0, // headSeed anchor connected around outer frame
  ]);
  const rawIdx = new Uint16Array([
    // 8 inner fan triangles touching spike v=4 (counter-clockwise outward +Z)
    4, 1, 0,  4, 0, 3,  4, 3, 6,  4, 6, 7,
    4, 7, 8,  4, 8, 5,  4, 5, 2,  4, 2, 1,
    // Outer ring collar connected to headSeed v=9 so all 8 ring vertices stay body-connected
    0, 1, 9,  1, 2, 9,  2, 5, 9,  5, 8, 9,
    8, 7, 9,  7, 6, 9,  6, 3, 9,  3, 0, 9,
  ]);
  const res = neutralizeSkinShellMesh(rawPos, rawIdx);
  assert.equal(res.removedTriangleCount, 8);
  assert.equal(res.sealedLoopCount, 1);
  // Check all resulting groin vertices respect neutralPubisEnvelopeZ & neutralPerinealArchMinY
  for (let v = 0; v < res.positions.length / 3; v++) {
    const ax = Math.abs(res.positions[v * 3]);
    const y = res.positions[v * 3 + 1];
    const z = res.positions[v * 3 + 2];
    if (ax < 0.05 && y > -0.02 && y < 0.15) {
      assert.ok(z <= neutralPubisEnvelopeZ(ax, y) + 0.015, `z=${z} exceeded neutral envelope`);
      assert.ok(y >= neutralPerinealArchMinY(ax, z) - 0.01);
    }
  }
});

test('baked public/models/bodyvista_anatomy.glb is universal gender-neutral with zero male anatomy artifacts', () => {
  const buf = fs.readFileSync('public/models/bodyvista_anatomy.glb');
  assert.equal(buf.readUInt32LE(0), 0x46546c67); // "glTF"
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const bin = buf.subarray(20 + jsonLen + 8);

  assert.equal(gltf.asset?.extras?.genderProfile, 'universal-gender-neutral');

  const readFloat32 = (accIdx: number): Float32Array => {
    const acc = gltf.accessors[accIdx];
    const bv = gltf.bufferViews[acc.bufferView];
    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const out = new Float32Array(acc.count * 3);
    for (let i = 0; i < out.length; i++) out[i] = bin.readFloatLE(byteOffset + i * 4);
    return out;
  };

  const readIndices = (accIdx: number): Uint32Array => {
    const acc = gltf.accessors[accIdx];
    const bv = gltf.bufferViews[acc.bufferView];
    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const out = new Uint32Array(acc.count);
    for (let i = 0; i < acc.count; i++) {
      out[i] =
        acc.componentType === 5125
          ? bin.readUInt32LE(byteOffset + i * 4)
          : bin.readUInt16LE(byteOffset + i * 2);
    }
    return out;
  };

  // 1. Verify skin_shell has zero groin protrusion (old maxZ was 0.196!) and zero NaN normals
  const skinNode = gltf.nodes.find((n: { name: string }) => n.name === 'skin_shell');
  const skinPrim = gltf.meshes[skinNode.mesh].primitives[0];
  const skinPos = readFloat32(skinPrim.attributes.POSITION);
  const skinNorm = readFloat32(skinPrim.attributes.NORMAL);

  for (let i = 0; i < skinNorm.length; i++) {
    assert.ok(Number.isFinite(skinNorm[i]), 'skin_shell normal must be finite');
  }

  let maxGroinZ = -Infinity;
  let hangingScrotalVerts = 0;
  for (let v = 0; v < skinPos.length / 3; v++) {
    const ax = Math.abs(skinPos[v * 3]);
    const y = skinPos[v * 3 + 1];
    const z = skinPos[v * 3 + 2];
    if (ax < 0.058 && y >= -0.05 && y <= 0.145) {
      if (z > maxGroinZ) maxGroinZ = z;
    }
    if (ax < 0.055 && y < -0.018 && y > -0.08 && z > 0.025) {
      hangingScrotalVerts++;
    }
  }
  assert.ok(
    maxGroinZ <= 0.132,
    `Expected clean gender-neutral pubic contour maxZ <= 0.132, got ${maxGroinZ}`
  );
  assert.equal(hangingScrotalVerts, 0, 'Expected zero hanging scrotal vertices');

  // 2. Verify visceral_context has zero referenced male urethral vertices below pelvic floor
  const viscNode = gltf.nodes.find((n: { name: string }) => n.name === 'visceral_context');
  const viscPrim = gltf.meshes[viscNode.mesh].primitives[0];
  const viscPos = readFloat32(viscPrim.attributes.POSITION);
  const viscIdx = readIndices(viscPrim.indices);

  let maleTractRefs = 0;
  for (let i = 0; i < viscIdx.length; i++) {
    const v = viscIdx[i];
    const y = viscPos[v * 3 + 1];
    const z = viscPos[v * 3 + 2];
    if (y < 0.045 || (y < 0.075 && z > 0.01)) {
      maleTractRefs++;
    }
  }
  assert.equal(maleTractRefs, 0, 'Expected zero male urethral tract triangles in visceral_context');
});
