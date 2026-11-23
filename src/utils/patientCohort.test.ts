import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTENDING_DOCTORS,
  buildCourseTrendSeries,
  createInitialCohortStore,
  createNewPatientInCohort,
  filterAndSortPatientRoster,
  getAttendingDoctorById,
  startNextTreatmentCourse,
  summarizePatientForRoster,
  syncClinicalStateIntoPatient,
} from './patientCohort';
import { computeCourseComparison } from './clinicalComparison';

test('initial cohort store seeds 6 diverse patients including 陈小真 (YSY report) and defaults to logged-in attending doctor 陈景明', () => {
  const store = createInitialCohortStore();
  assert.equal(store.patients.length, 6);
  assert.equal(store.currentDoctorId, 'doc-chen');

  const currentDoc = getAttendingDoctorById(store.currentDoctorId);
  assert.equal(currentDoc.name, '陈景明');
  assert.equal(currentDoc.title, '主任医师');
  assert.ok(currentDoc.clinicName.includes('健康4S'));
  assert.ok(currentDoc.clinicAddress.includes('上海市静安区南京西路'));
  assert.ok(ATTENDING_DOCTORS.length >= 3);
  for (const doc of ATTENDING_DOCTORS) {
    assert.ok(doc.clinicName.length > 4);
    assert.ok(doc.clinicShortName.length > 2);
    assert.ok(doc.clinicAddress.length > 8);
  }

  const summaries = store.patients.map(summarizePatientForRoster);
  const cxz = summaries.find((p) => p.name === '陈小真')!;
  assert.equal(cxz.age, 74);
  assert.equal(cxz.hasNebulaExperienceReport, true);
  assert.equal(cxz.intakeDate, '2026-08-23');

  const lin = summaries.find((p) => p.name === '林晓')!;
  assert.equal(lin.activeCourseLabel, '第2疗程');
  assert.ok(lin.cumulativeDelta > 0);

  const chen = summaries.find((p) => p.name === '陈建国')!;
  assert.equal(chen.activeCourseLabel, '第3疗程');
  assert.equal(chen.totalCoursesCount, 3);
  assert.ok(chen.cumulativeDelta >= 6, '3-course hypertension + steatosis improvement should boost score significantly');

  const zhou = summaries.find((p) => p.name === '周雅琴')!;
  assert.equal(zhou.abnormalCount, 0);
});

test('filterAndSortPatientRoster sorts chronologically by time and supports convenient pinyin, phone, and keyword search', () => {
  const store = createInitialCohortStore();
  const summaries = store.patients.map(summarizePatientForRoster);

  // Default sort: strictly newest timestamp first ('updated_desc')
  const byNewest = filterAndSortPatientRoster(summaries, { sortBy: 'updated_desc' });
  assert.equal(byNewest.length, 6);
  for (let i = 1; i < byNewest.length; i += 1) {
    assert.ok(
      byNewest[i - 1].updatedAt >= byNewest[i].updatedAt,
      `Expected ${byNewest[i - 1].updatedAt} >= ${byNewest[i].updatedAt}`
    );
  }
  assert.equal(byNewest[0].name, '赵明轩');
  assert.equal(byNewest[byNewest.length - 1].name, '周雅琴');

  // Oldest first ('updated_asc')
  const byOldest = filterAndSortPatientRoster(summaries, { sortBy: 'updated_asc' });
  assert.equal(byOldest[0].name, '周雅琴');
  assert.equal(byOldest[byOldest.length - 1].name, '赵明轩');

  // Sort by first-intake date ('intake_desc')
  const byIntake = filterAndSortPatientRoster(summaries, { sortBy: 'intake_desc' });
  assert.equal(byIntake[0].name, '赵明轩'); // 2026-11-20
  assert.equal(byIntake[byIntake.length - 1].name, '陈建国'); // 2026-03-10

  // Pinyin initials search ('cjg' -> 陈建国)
  const byPinyin = filterAndSortPatientRoster(summaries, { searchQuery: 'cjg' });
  assert.equal(byPinyin.length, 1);
  assert.equal(byPinyin[0].name, '陈建国');

  // Phone tail search ('3912' -> 陈建国 136-0088-3912)
  const byPhone = filterAndSortPatientRoster(summaries, { searchQuery: '3912' });
  assert.equal(byPhone.length, 1);
  assert.equal(byPhone[0].archiveId, 'H4S-20261115-009');

  // Time window ('7d' excludes 2026-11-10 周雅琴 relative to 2026-11-20)
  const recent7d = filterAndSortPatientRoster(summaries, {
    timeRange: '7d',
    referenceDateStr: '2026-11-20',
  });
  assert.equal(recent7d.length, 5);
  assert.ok(!recent7d.some((p) => p.name === '周雅琴'));

  // Experience report keyword search ('体验报告' or 'cxz' -> 陈小真)
  const byNebula = filterAndSortPatientRoster(summaries, { searchQuery: '体验报告' });
  assert.equal(byNebula.length, 1);
  assert.equal(byNebula[0].name, '陈小真');

  // Attending doctor scope ('mine' for doc-shen -> 苏婉清)
  const shenMine = filterAndSortPatientRoster(summaries, {
    doctorScope: 'mine',
    currentDoctorId: 'doc-shen',
  });
  assert.equal(shenMine.length, 1);
  assert.equal(shenMine[0].name, '苏婉清');
});

test('computeCourseComparison compares Course 2 vs Course 1 and Course 2 vs Baseline accurately', () => {
  const store = createInitialCohortStore();
  const lin = store.patients.find((p) => p.id === 'pat-linxiao')!;

  // Course 2 vs Baseline (Course 0)
  const vsBaseline = computeCourseComparison(lin, 'c2-course2', 'c0-baseline');
  assert.equal(vsBaseline.referenceLabel, '初诊基线');
  const sbpBase = vsBaseline.biomarkerRows.find((r) => r.id === 'sbp')!;
  assert.equal(sbpBase.referenceValue, 148);
  assert.equal(sbpBase.currentValue, 142);
  assert.equal(sbpBase.delta, -6);

  // Course 2 vs Previous Course (Course 1)
  const vsPrevCourse = computeCourseComparison(lin, 'c2-course2', 'c1-course1');
  assert.equal(vsPrevCourse.referenceLabel, '第1疗程(结案)');
  const liverPrev = vsPrevCourse.biomarkerRows.find((r) => r.id === 'liver_fat')!;
  assert.equal(liverPrev.referenceValue, 9.8);
  assert.equal(liverPrev.currentValue, 8.6);
  assert.equal(liverPrev.delta, -1.2);

  // Course 2 vs Course End Target
  const vsTarget = computeCourseComparison(lin, 'c2-course2', 'target_course_end');
  assert.equal(vsTarget.mode, 'target_12w');
  assert.equal(vsTarget.referenceLabel, '第2疗程结案目标');
});

test('startNextTreatmentCourse closes current active course and appends Course N+1', () => {
  const store = createInitialCohortStore();
  const lin = store.patients.find((p) => p.id === 'pat-linxiao')!;

  const { updatedPatient, error } = startNextTreatmentCourse(lin, {
    stageTitle: '第3疗程血压全面归绿巩固期',
    cycleWeeks: 8,
    focusRegimenSummary: '低钠高钾膳食 + 睡前慢呼吸维持',
    doctorCourseNote: '启动第3疗程巩固',
  });

  assert.equal(error, null);
  assert.equal(updatedPatient.courses.length, 4); // c0, c1, c2 (completed), c3 (active)
  assert.equal(updatedPatient.courses[2].status, 'completed');
  assert.equal(updatedPatient.courses[3].courseNo, 3);
  assert.equal(updatedPatient.courses[3].status, 'active');
  assert.equal(updatedPatient.compareCourseId, 'c2-course2');
});

test('createNewPatientInCohort validates inputs and creates patient with baseline + Course 1', () => {
  const bad = createNewPatientInCohort({
    name: '',
    gender: '女',
    age: 40,
    heightCm: 165,
    weightKg: 60,
    phone: '13800001111',
    chiefTagline: '',
    stageTitle: '',
    cycleWeeks: 12,
    systolicBp: 135,
    diastolicBp: 86,
    totalCholesterol: 5.5,
    liverFatPercent: 7.2,
    fastingGlucose: 5.1,
  });
  assert.ok(bad.error !== null);

  const ok = createNewPatientInCohort({
    name: '王静怡',
    gender: '女',
    age: 41,
    heightCm: 165,
    weightKg: 62.4,
    phone: '138-1234-5678',
    chiefTagline: '产后血脂偏高与轻度肝脂沉积',
    stageTitle: '首疗程温和减脂调理期',
    cycleWeeks: 12,
    systolicBp: 132,
    diastolicBp: 85,
    totalCholesterol: 5.6,
    liverFatPercent: 7.2,
    fastingGlucose: 5.1,
    attendingDoctorId: 'doc-shen',
  });
  assert.equal(ok.error, null);
  assert.ok(ok.record !== null);
  assert.equal(ok.record!.attendingDoctorId, 'doc-shen');
  assert.ok(ok.record!.clinicalState.publication.publishedBy.includes('沈知夏'));
  assert.equal(ok.record!.courses.length, 2);
  assert.equal(ok.record!.courses[1].courseLabel, '第1疗程');

  const series = buildCourseTrendSeries(ok.record!, true);
  assert.equal(series.length, 3); // 初诊基线, 第1疗程(当前), 结案目标
});

test('syncClinicalStateIntoPatient propagates follow-up recheck normalization into active course', () => {
  const store = createInitialCohortStore();
  const lin = store.patients.find((p) => p.id === 'pat-linxiao')!;
  const nextClinical = {
    ...lin.clinicalState,
    followupRechecks: [
      {
        id: 'rc-1',
        recheckDate: '2026-12-15',
        monthLabel: '12月复查',
        systolicBp: 124,
        diastolicBp: 79,
        totalCholesterol: 4.8,
        liverFatPercent: 4.5,
        weightKg: 63.8,
        doctorAdjustmentNote: '第2疗程结案全项转绿',
      },
    ],
  };

  const synced = syncClinicalStateIntoPatient(lin, nextClinical);
  const latest = synced.courses[synced.courses.length - 1];
  assert.equal(latest.metrics.liverFatPercent, 4.5);
  assert.equal(latest.metrics.systolicBp, 124);
  assert.equal(synced.priorityStatus, 'achieved');
});
