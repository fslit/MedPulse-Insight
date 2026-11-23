import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCohortStore } from './patientCohort';
import {
  resolvePatientConsultationTabs,
  sanitizeActiveWorkbenchTab,
} from './consultationWorkbench';

test('resolvePatientConsultationTabs enforces strict patient-only report & recovery case visibility', () => {
  const store = createInitialCohortStore();

  // Chen Xiaozhen owns the 60-page NebulaByte YSY report, no personal recovery case photo
  const chenXiaozhen = store.patients.find((p) => p.id === 'pat-chenxiaozhen')!;
  const cxzTabs = resolvePatientConsultationTabs(chenXiaozhen);
  assert.deepEqual(
    cxzTabs.map((t) => t.id),
    ['trend_evolution', 'problem_regimen', 'reports_imaging', 'own_nebula_report']
  );

  // Chen Jianguo has a personal recovery case record, no Nebula report
  const chenJianguo = store.patients.find((p) => p.id === 'pat-chenjianguo')!;
  const cjgTabs = resolvePatientConsultationTabs(chenJianguo);
  assert.deepEqual(
    cjgTabs.map((t) => t.id),
    ['trend_evolution', 'problem_regimen', 'reports_imaging', 'own_recovery_case']
  );

  // Zhao Mingxuan (newly archived baseline patient) has neither Nebula report nor recovery case
  const zhaoMingxuan = store.patients.find((p) => p.id === 'pat-zhaomingxuan')!;
  const zmxTabs = resolvePatientConsultationTabs(zhaoMingxuan);
  assert.deepEqual(
    zmxTabs.map((t) => t.id),
    ['trend_evolution', 'problem_regimen', 'reports_imaging']
  );

  // Switching from Chen Xiaozhen ('own_nebula_report') to Chen Jianguo sanitizes back to 'trend_evolution'
  assert.equal(
    sanitizeActiveWorkbenchTab('own_nebula_report', cjgTabs),
    'trend_evolution'
  );
  assert.equal(
    sanitizeActiveWorkbenchTab('problem_regimen', cjgTabs),
    'problem_regimen'
  );
});
