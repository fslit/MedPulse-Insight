import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PATIENT_PROFILE_PRESETS,
  PROTOCOL_LIBRARY,
  buildLongitudinalTrends,
  computeBmi,
  createInitialClinicalState,
  deriveClinicalEvaluation,
  filterProtocolTemplates,
  getEffectiveLabMetrics,
  validateCustomTaskInput,
  validateFollowupRecheckInput,
  validateLabMetricsInput,
  validatePatientProfileInput,
  validateSymptomFeedbackInput,
} from './clinicalWorkflow';

test('initial state defaults to universal gender-neutral profile and presets cover female/male/universal', () => {
  const state = createInitialClinicalState();
  assert.equal(state.patientProfile.gender, '通用');
  assert.equal(state.patientProfile.name, '林晓');
  const genders = PATIENT_PROFILE_PRESETS.map((p) => p.profile.gender);
  assert.deepEqual(genders, ['通用', '女', '男']);
});

test('initial clinical closed-loop state yields baseline score 86 and 3 risk prompts', () => {
  const state = createInitialClinicalState();
  const { metrics, effectiveWeightKg } = getEffectiveLabMetrics(state);
  const evalResult = deriveClinicalEvaluation(
    state.patientProfile,
    metrics,
    effectiveWeightKg,
    state.draftOrPublishedTasks
  );

  assert.equal(computeBmi(76.2, 176), 24.6);
  assert.equal(evalResult.healthScore, 86);
  assert.equal(evalResult.riskPrompts.length, 3);
  assert.equal(evalResult.organRecords.heart.severity, 'alert');
  assert.equal(evalResult.organRecords.liver.severity, 'caution');
  assert.equal(evalResult.organRecords.vascular.severity, 'caution');
});

test('Step 5 patient task check-in increases projectedScore accurately', () => {
  const state = createInitialClinicalState();
  const updatedTasks = state.draftOrPublishedTasks.map((t, idx) =>
    idx < 2 ? { ...t, completedByPatient: true } : t
  );
  const { metrics, effectiveWeightKg } = getEffectiveLabMetrics(state);
  const evalResult = deriveClinicalEvaluation(
    state.patientProfile,
    metrics,
    effectiveWeightKg,
    updatedTasks
  );

  assert.equal(evalResult.healthScore, 86);
  assert.equal(evalResult.projectedScore, 92); // +3 (cardio) +3 (liver)
});

test('Step 6 follow-up recheck normalization updates 3D organ severities, boosts score, and appends trend point', () => {
  const state = createInitialClinicalState();
  state.followupRechecks.push({
    id: 'rc-1',
    recheckDate: '2027-02-19',
    monthLabel: '2月复查',
    systolicBp: 124,
    diastolicBp: 78,
    totalCholesterol: 4.8,
    liverFatPercent: 4.4,
    weightKg: 72.8,
    doctorAdjustmentNote: '血压、血脂及肝脂肪含量均达标，转入巩固期每 24 周随访。',
  });

  const { metrics, effectiveWeightKg } = getEffectiveLabMetrics(state);
  const evalResult = deriveClinicalEvaluation(
    state.patientProfile,
    metrics,
    effectiveWeightKg,
    state.draftOrPublishedTasks
  );

  assert.equal(evalResult.organRecords.heart.severity, 'normal');
  assert.equal(evalResult.organRecords.liver.severity, 'normal');
  assert.equal(evalResult.organRecords.vascular.severity, 'normal');
  assert.equal(evalResult.riskPrompts.length, 0);
  assert.ok(evalResult.healthScore >= 90);

  const trends = buildLongitudinalTrends(state);
  assert.equal(trends.length, 7);
  assert.equal(trends[trends.length - 1].month, '2月复查');
  assert.equal(trends[trends.length - 1].systolicBp, 124);
});

test('Step 3 protocol library filtering matches category and search keywords', () => {
  const cardioOnly = filterProtocolTemplates(PROTOCOL_LIBRARY, 'cardio', '');
  assert.equal(cardioOnly.length, 1);
  assert.equal(cardioOnly[0].id, 'tpl-dash-bp');

  const omegaMatch = filterProtocolTemplates(PROTOCOL_LIBRARY, 'all', 'Omega-3');
  assert.equal(omegaMatch.length, 1);
  assert.equal(omegaMatch[0].relatedOrgan, 'vascular');
});

test('clinical workflow validators reject empty or out-of-bounds inputs cleanly', () => {
  assert.notEqual(
    validatePatientProfileInput({ name: '   ', age: 38, heightCm: 176, weightKg: 76 }),
    null
  );
  assert.equal(
    validatePatientProfileInput({ name: '王女士', age: 42, heightCm: 164, weightKg: 58 }),
    null
  );

  assert.notEqual(
    validateLabMetricsInput({
      reportDate: '2026-11-20',
      institution: '体检中心',
      systolicBp: 85,
      diastolicBp: 95, // invalid: systolic <= diastolic
      totalCholesterol: 5.2,
      liverFatPercent: 6.0,
    }),
    null
  );

  assert.notEqual(
    validateCustomTaskInput({ title: '', targetTag: '目标', frequency: '每日', summary: '说明' }),
    null
  );

  assert.notEqual(
    validateSymptomFeedbackInput({ symptomCategory: '头晕', description: '太短' }),
    null
  );

  assert.notEqual(
    validateFollowupRecheckInput({
      recheckDate: '',
      systolicBp: 126,
      diastolicBp: 80,
      totalCholesterol: 4.9,
      liverFatPercent: 4.8,
      weightKg: 73,
    }),
    null
  );
});
