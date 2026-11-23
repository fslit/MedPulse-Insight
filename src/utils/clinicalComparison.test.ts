import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialClinicalState } from './clinicalWorkflow';
import {
  buildDoctorConsultationBrief,
  computeClinicalComparison,
  computeRadarPolygonPoints,
} from './clinicalComparison';

test('computeClinicalComparison against first_baseline quantifies 5-month cumulative improvements accurately', () => {
  const state = createInitialClinicalState();
  const cmp = computeClinicalComparison(state, 'first_baseline');

  assert.equal(cmp.currentScore, 86);
  assert.ok(cmp.referenceScore < cmp.currentScore, 'June baseline score should be lower than Nov current score');
  assert.ok(cmp.scoreDelta > 0, 'Score delta vs June baseline should be positive');
  assert.ok(cmp.improvedCount >= 5, 'At least 5 biomarkers improved from June baseline to November');

  const sbp = cmp.biomarkerRows.find((r) => r.id === 'sbp')!;
  assert.equal(sbp.currentValue, 142);
  assert.equal(sbp.referenceValue, 148);
  assert.equal(sbp.delta, -6);
  assert.equal(sbp.deltaDisplay, '-6');
  assert.equal(sbp.semantic, 'improving');

  const liverFat = cmp.biomarkerRows.find((r) => r.id === 'liver_fat')!;
  assert.equal(liverFat.currentValue, 8.6);
  assert.equal(liverFat.referenceValue, 11.2);
  assert.equal(liverFat.delta, -2.6);
  assert.equal(liverFat.semantic, 'improving');
});

test('computeClinicalComparison against target_12w computes remaining gap to clinical remission targets', () => {
  const state = createInitialClinicalState();
  const cmp = computeClinicalComparison(state, 'target_12w');

  assert.ok(cmp.referenceScore >= 91, '12-week remission target should yield >= 91 health score');
  assert.ok(cmp.scoreDelta < 0, 'Current score minus 12-week target score reflects remaining upside');

  const liverFat = cmp.biomarkerRows.find((r) => r.id === 'liver_fat')!;
  assert.equal(liverFat.referenceValue, 4.6);
  assert.equal(liverFat.semantic, 'gap_to_target');
  assert.ok(liverFat.currentPct > liverFat.safeEndPct, 'Current 8.6% sits right of <5.0% safe zone');
  assert.ok(liverFat.referencePct <= liverFat.safeEndPct, 'Target 4.6% sits inside <5.0% safe zone');
});

test('computeRadarPolygonPoints produces valid 8-vertex SVG coordinates without NaN', () => {
  const pts = computeRadarPolygonPoints([94, 92, 78, 80, 88, 90, 87, 79], 130, 130, 92);
  const pairs = pts.split(' ');
  assert.equal(pairs.length, 8);
  for (const pair of pairs) {
    const [x, y] = pair.split(',').map(Number);
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    assert.ok(x >= 20 && x <= 240 && y >= 20 && y <= 240);
  }
});

test('buildDoctorConsultationBrief adapts plain-language talking points to selected organ', () => {
  const state = createInitialClinicalState();
  const cmp = computeClinicalComparison(state, 'first_baseline');

  const overviewBrief = buildDoctorConsultationBrief(
    null,
    cmp,
    state.patientProfile,
    state.draftOrPublishedTasks
  );
  assert.ok(overviewBrief.headline.includes('林晓'));
  assert.ok(overviewBrief.comparisonTakeaway.includes('86'));

  const liverBrief = buildDoctorConsultationBrief(
    'liver',
    cmp,
    state.patientProfile,
    state.draftOrPublishedTasks
  );
  assert.ok(liverBrief.headline.includes('肝脏'));
  assert.ok(liverBrief.plainMechanism.includes('8.6%'));
  assert.equal(liverBrief.linkedTaskTitle, '12周轻度脂肪肝逆转有氧处方');
});

test('BiomarkerComparisonRow maps Red -> Amber -> Green traffic-light zones monotonically from left to right', () => {
  const state = createInitialClinicalState();
  const cmp = computeClinicalComparison(state, 'first_baseline');

  // SBP improved from 148 (alert/Red) -> 142 (alert/Red, closer to Amber)
  const sbp = cmp.biomarkerRows.find((r) => r.id === 'sbp')!;
  assert.equal(sbp.referenceSeverity, 'alert');
  assert.equal(sbp.severity, 'alert');
  assert.ok(sbp.trafficLightReferencePct < 33.3, '148 mmHg sits in Red zone (< 33.3%)');
  assert.ok(
    sbp.trafficLightCurrentPct > sbp.trafficLightReferencePct,
    'Improving from 148 to 142 moves rightward toward Green'
  );

  // Liver fat improved from 11.2% (alert/Red) -> 8.6% (caution/Amber)
  const liverFat = cmp.biomarkerRows.find((r) => r.id === 'liver_fat')!;
  assert.equal(liverFat.referenceSeverity, 'alert');
  assert.equal(liverFat.severity, 'caution');
  assert.equal(liverFat.statusText, '偏高');
  assert.ok(liverFat.trafficLightReferencePct < 33.3, '11.2% sits in Red zone');
  assert.ok(
    liverFat.trafficLightCurrentPct > 33.3 && liverFat.trafficLightCurrentPct < 66.7,
    '8.6% sits cleanly in Amber zone (33.3%..66.7%)'
  );

  // Fasting glucose 5.4 mmol/L is normal -> sits cleanly in Green zone (> 66.7%)
  const fpg = cmp.biomarkerRows.find((r) => r.id === 'fpg')!;
  assert.equal(fpg.severity, 'normal');
  assert.equal(fpg.statusText, '已达标');
  assert.ok(fpg.trafficLightCurrentPct > 66.7, 'Normal glucose sits in Green zone (> 66.7%)');
});

