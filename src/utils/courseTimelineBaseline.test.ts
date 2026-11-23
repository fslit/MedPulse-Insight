import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCohortStore } from './patientCohort';
import {
  buildMilestoneEvolutionMatrix,
  buildPatientTimelineAndBaselines,
  evaluateEventAgainstBaseline,
  summarizeReportVsBaseline,
} from './courseTimelineBaseline';

test('buildPatientTimelineAndBaselines generates B001/B002/B003 baseline packages and chronological intra-course events', () => {
  const store = createInitialCohortStore();
  const chenJianGuo = store.patients.find((p) => p.id === 'pat-chenjianguo')!;

  const bundle = buildPatientTimelineAndBaselines(chenJianGuo);

  assert.equal(bundle.baselinePackagesAsc.length, 3);
  assert.deepEqual(
    bundle.baselinePackagesAsc.map((b) => b.code),
    ['B001', 'B002', 'B003']
  );
  assert.equal(bundle.baselinePackagesDesc[0].code, 'B003');
  assert.equal(bundle.baselinePackagesDesc[2].code, 'B001');
  assert.equal(bundle.baselinePackagesAsc[0].versionStatus, 'V1 已确认');

  assert.equal(bundle.courseSpans.length, 3);
  assert.equal(bundle.timelineEventsAsc.length, 9);
  assert.equal(
    bundle.timelineEventsDesc[0].id,
    bundle.timelineEventsAsc[bundle.timelineEventsAsc.length - 1].id
  );

  for (let i = 1; i < bundle.timelineEventsAsc.length; i += 1) {
    assert.ok(
      bundle.timelineEventsAsc[i].isoDate >= bundle.timelineEventsAsc[i - 1].isoDate,
      `Expected ${bundle.timelineEventsAsc[i].isoDate} >= ${bundle.timelineEventsAsc[i - 1].isoDate}`
    );
  }
});

test('evaluateEventAgainstBaseline switches reference baseline line accurately between B001 and B002', () => {
  const store = createInitialCohortStore();
  const cxz = store.patients.find((p) => p.id === 'pat-chenxiaozhen')!;
  const bundle = buildPatientTimelineAndBaselines(cxz);

  assert.equal(bundle.baselinePackagesAsc.length, 2);
  const b001 = bundle.baselinePackagesAsc[0];
  const b002 = bundle.baselinePackagesAsc[1];
  const latestEvent = bundle.timelineEventsDesc[0];

  const vsB001 = evaluateEventAgainstBaseline(latestEvent, b001, 'systolicBp');
  assert.equal(vsB001.baselineValue, 146);
  assert.equal(vsB001.currentValue, 132);
  assert.equal(vsB001.rawDelta, -14);
  assert.equal(vsB001.isImproved, true);
  assert.ok(vsB001.percentChange < -9);
  assert.equal(vsB001.temporalRelation, 'after_baseline');

  const vsB002 = evaluateEventAgainstBaseline(latestEvent, b002, 'systolicBp');
  assert.equal(vsB002.baselineValue, 138);
  assert.equal(vsB002.currentValue, 132);
  assert.equal(vsB002.rawDelta, -6);
  assert.equal(vsB002.isImproved, true);
});

test('summarizeReportVsBaseline and buildMilestoneEvolutionMatrix quantify visual shifts and normalized biomarkers', () => {
  const store = createInitialCohortStore();
  const zhou = store.patients.find((p) => p.id === 'pat-zhouyaqin')!;
  const bundle = buildPatientTimelineAndBaselines(zhou);

  const b001 = bundle.baselinePackagesAsc[0];
  const latestReport = bundle.timelineEventsDesc[0];

  const summary = summarizeReportVsBaseline(latestReport, b001);
  assert.ok(summary.scoreDelta > 0);
  assert.ok(summary.newlyNormalizedCount >= 2);
  assert.equal(summary.currentAbnormalCount, 0);

  const cjg = store.patients.find((p) => p.id === 'pat-chenjianguo')!;
  const cjgBundle = buildPatientTimelineAndBaselines(cjg);
  const matrix = buildMilestoneEvolutionMatrix(
    cjgBundle,
    cjgBundle.baselinePackagesAsc[0],
    cjgBundle.timelineEventsDesc[0],
    'key_milestones'
  );
  // Column 1 (B001) + Course 1 End + Course 2 End + Course 3 Latest = 4 columns
  assert.equal(matrix.columns.length, 4);
  assert.equal(matrix.columns[0].isLockedBaseline, true);
  assert.equal(matrix.rows.length, 8);
});
