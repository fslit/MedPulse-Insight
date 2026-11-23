import test from 'node:test';
import assert from 'node:assert/strict';
import { TreatmentCourseRecord, createInitialCohortStore } from './patientCohort';
import {
  RECOVERY_SUCCESS_CASES,
  filterRecoveryCases,
  findNodeAlignedToCourse,
  getRecoveryCaseByPatientId,
  resolveAlignedCaseForPatient,
} from './recoveryCases';

test('RECOVERY_SUCCESS_CASES binds every course node to exact patient courseIds and non-empty experience metrics', () => {
  const store = createInitialCohortStore();
  assert.equal(RECOVERY_SUCCESS_CASES.length, 4);

  for (const item of RECOVERY_SUCCESS_CASES) {
    const patient = store.patients.find((p) => p.id === item.patientId);
    assert.ok(patient, `Patient ${item.patientId} exists in cohort`);
    assert.ok(item.courseNodes.length >= 3, `${item.patientName} has >= 3 course nodes`);

    for (const node of item.courseNodes) {
      const matchedCourse: TreatmentCourseRecord | undefined = patient.courses.find(
        (c) => c.id === node.courseId
      );
      assert.ok(
        matchedCourse,
        `Node ${node.courseId} matches exact TreatmentCourseRecord on ${item.patientName}`
      );
      assert.equal(matchedCourse.courseNo, node.courseNo);
      assert.equal(node.experienceMetrics.length, 4);
      assert.ok(node.labProofs.length >= 3);
      assert.ok(node.patientQuote.length > 15);
    }
  }
});

test('resolveAlignedCaseForPatient aligns exact course node for recovered patients and matches peer benchmark for new intake patient', () => {
  const store = createInitialCohortStore();

  // 1. Cured patient Zhou Yaqin: switching between Course 1 and Course 2 updates alignedNode
  const zhou = store.patients.find((p) => p.id === 'pat-zhouyaqin')!;
  const resC1 = resolveAlignedCaseForPatient(zhou, 'zyq-c1', null);
  assert.equal(resC1.mode, 'own_case');
  assert.equal(resC1.alignedNode.courseId, 'zyq-c1');
  assert.equal(resC1.alignedNode.courseNo, 1);

  const resC2 = resolveAlignedCaseForPatient(zhou, 'zyq-c2', null);
  assert.equal(resC2.mode, 'own_case');
  assert.equal(resC2.alignedNode.courseId, 'zyq-c2');
  assert.equal(resC2.alignedNode.milestoneStatus, 'cured');

  // 2. Newly enrolled patient Zhao Mingxuan: matches peer benchmark case and adapts to selectedOrgan
  const zhao = store.patients.find((p) => p.id === 'pat-zhaomingxuan')!;
  const peerLiver = resolveAlignedCaseForPatient(zhao, 'zmx-c1', 'liver');
  assert.equal(peerLiver.mode, 'peer_benchmark');
  assert.equal(peerLiver.activeCase.id, 'case-zhouyaqin');

  const peerStomach = resolveAlignedCaseForPatient(zhao, 'zmx-c1', 'stomach');
  assert.equal(peerStomach.mode, 'peer_benchmark');
  assert.equal(peerStomach.activeCase.id, 'case-suwanqing');

  const peerHeart = resolveAlignedCaseForPatient(zhao, 'zmx-c1', 'heart');
  assert.equal(peerHeart.mode, 'peer_benchmark');
  assert.equal(peerHeart.activeCase.id, 'case-chenjianguo');
});

test('filterRecoveryCases filters by organ and search query accurately', () => {
  assert.equal(filterRecoveryCases('all').length, 4);
  const stomachCases = filterRecoveryCases('stomach');
  assert.equal(stomachCases.length, 1);
  assert.equal(stomachCases[0].patientName, '苏婉清');

  const byKeyword = filterRecoveryCases('all', '优康力');
  assert.ok(byKeyword.length >= 3);

  const zhouCase = getRecoveryCaseByPatientId('pat-zhouyaqin')!;
  assert.equal(findNodeAlignedToCourse(zhouCase, 'zyq-c0').courseNo, 0);
});
