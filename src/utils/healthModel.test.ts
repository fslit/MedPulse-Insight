import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_HEALTH_SCORE,
  ORGAN_ORDER,
  ORGAN_RECORDS,
  calculateProjectedScore,
  computeClippingPlaneConstant,
  computeExplodeOffset,
  filterOrgansBySeverity,
  getDefaultLayersForMode,
  getHealthGradeInfo,
  getStageMaterialPreset,
  isTapGesture,
  layerLevelToOpacity,
} from './healthModel';

test('calculateProjectedScore adds unique action plan gains and caps below 100', () => {
  assert.equal(calculateProjectedScore(BASE_HEALTH_SCORE, []), 86);
  assert.equal(calculateProjectedScore(BASE_HEALTH_SCORE, ['exercise']), 89);
  assert.equal(calculateProjectedScore(BASE_HEALTH_SCORE, ['exercise', 'exercise', 'diet']), 92);
  assert.equal(
    calculateProjectedScore(BASE_HEALTH_SCORE, ['exercise', 'diet', 'sleep', 'followup']),
    95
  );
  assert.equal(
    calculateProjectedScore(96, ['exercise', 'diet', 'sleep', 'followup']),
    99
  );
});

test('getHealthGradeInfo maps clinical score thresholds accurately', () => {
  const good = getHealthGradeInfo(86);
  assert.equal(good.grade, '良好');
  assert.equal(good.segmentIndex, 3);
  assert.ok(good.pointerPercent >= 76 && good.pointerPercent <= 90);

  const excellent = getHealthGradeInfo(94);
  assert.equal(excellent.grade, '优秀');

  const fair = getHealthGradeInfo(72);
  assert.equal(fair.grade, '一般');
});

test('filterOrgansBySeverity returns all 8 organs or the 3 attention organs', () => {
  const all = filterOrgansBySeverity('all');
  assert.equal(all.length, 8);
  assert.deepEqual(
    all.map((o) => o.id),
    ORGAN_ORDER
  );

  const attention = filterOrgansBySeverity('attention');
  assert.equal(attention.length, 3);
  assert.deepEqual(
    attention.map((o) => o.id),
    ['heart', 'liver', 'vascular']
  );
});

test('desktop left and right organ slot indices are unique and ordered top-to-bottom per side', () => {
  const leftOrgans = ORGAN_ORDER.map((id) => ORGAN_RECORDS[id])
    .filter((o) => o.side === 'left')
    .sort((a, b) => a.slotIndex - b.slotIndex);
  const rightOrgans = ORGAN_ORDER.map((id) => ORGAN_RECORDS[id])
    .filter((o) => o.side === 'right')
    .sort((a, b) => a.slotIndex - b.slotIndex);

  assert.deepEqual(leftOrgans.map((o) => o.slotIndex), [0, 1, 2, 3]);
  assert.deepEqual(rightOrgans.map((o) => o.slotIndex), [0, 1, 2, 3]);

  for (let i = 1; i < leftOrgans.length; i++) {
    assert.ok(
      leftOrgans[i - 1].pos[1] > leftOrgans[i].pos[1],
      `Left slot ${i - 1} should be higher than slot ${i}`
    );
  }
  for (let i = 1; i < rightOrgans.length; i++) {
    assert.ok(
      rightOrgans[i - 1].pos[1] > rightOrgans[i].pos[1],
      `Right slot ${i - 1} should be higher than slot ${i}`
    );
  }
});

test('isTapGesture distinguishes click/tap from OrbitControls drag rotation', () => {
  assert.equal(isTapGesture(100, 200, 103, 204, 6), true);
  assert.equal(isTapGesture(100, 200, 112, 205, 6), false);
});

test('getStageMaterialPreset supports overview, BodyVista atlas PBR, systems, and xray modes', () => {
  const overview = getStageMaterialPreset('overview');
  const atlas = getStageMaterialPreset('atlas');
  const systems = getStageMaterialPreset('systems');
  const xray = getStageMaterialPreset('xray');

  assert.equal(overview.isAtlasPbr, false);
  assert.equal(atlas.isAtlasPbr, true);
  assert.ok(overview.shellOpacity > systems.shellOpacity);
  assert.ok(systems.shellOpacity > xray.shellOpacity);
  assert.ok(xray.skeletonOpacity > overview.skeletonOpacity);
  assert.ok(atlas.muscularOpacity > overview.muscularOpacity);
});

test('BodyVista clipping plane, explode offset, and 4-level layer opacity helpers work deterministically', () => {
  assert.equal(computeClippingPlaneConstant(0, -1.5, 1.8), null);
  const midSlice = computeClippingPlaneConstant(50, -1.5, 1.8);
  assert.ok(midSlice !== null && Math.abs(midSlice - 0.15) < 1e-6);

  assert.deepEqual(computeExplodeOffset([-0.065, 0.735, 0.035], 0), [0, 0, 0]);
  const [ex, ey, ez] = computeExplodeOffset([-0.065, 0.735, 0.035], 100);
  assert.ok(ex < 0, 'Negative X organ explodes outward to viewer-left');
  assert.ok(ey > 0, 'Upper abdominal organ shifts slightly upward');
  assert.ok(ez > 0, 'Anterior organ shifts slightly forward');

  const atlasLayers = getDefaultLayersForMode('atlas');
  assert.equal(layerLevelToOpacity('muscular', 0, 'atlas'), 0);
  assert.ok(
    layerLevelToOpacity('skeletal', atlasLayers.skeletal, 'atlas') >
      layerLevelToOpacity('skin', atlasLayers.skin, 'atlas')
  );
});
