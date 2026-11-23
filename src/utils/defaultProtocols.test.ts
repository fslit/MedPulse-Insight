import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SYSTEM_DEFAULT_PROTOCOLS,
  buildDailyDosingSchedule,
  buildDailyDosingScheduleFromTasks,
  convertDefaultProtocolToManagedTask,
  filterDefaultProtocols,
  getDefaultProtocolsForOrgan,
  matchDefaultProtocolsForPatient,
} from './defaultProtocols';
import { ManagedTaskItem } from './clinicalWorkflow';

test('SYSTEM_DEFAULT_PROTOCOLS contains all 17 verbatim clinic default protocols', () => {
  assert.equal(SYSTEM_DEFAULT_PROTOCOLS.length, 17);
  const ids = new Set(SYSTEM_DEFAULT_PROTOCOLS.map((p) => p.id));
  assert.equal(ids.size, 17);

  const liver = SYSTEM_DEFAULT_PROTOCOLS.find((p) => p.id === 'def-liver');
  assert.ok(liver);
  assert.equal(liver.courseDays, 90);
  assert.equal(liver.recommendedCoursesLabel, '需2个疗程');
  assert.equal(liver.regimenItems.length, 3);

  const sleep = SYSTEM_DEFAULT_PROTOCOLS.find((p) => p.id === 'def-sleep-rhythm');
  assert.ok(sleep);
  assert.equal(sleep.courseDays, 10);
  assert.equal(sleep.recommendedCoursesLabel, '需3个疗程');
});

test('matchDefaultProtocolsForPatient matches fatty liver, vascular lipid/BP, and gastric congestion', () => {
  const matched = matchDefaultProtocolsForPatient(
    {
      systolicBp: 142,
      diastolicBp: 92,
      heartRate: 76,
      fastingGlucose: 5.2,
      totalCholesterol: 5.8,
      ldlCholesterol: 3.7,
      liverFatPercent: 8.6,
      gastricStatus: 'mild_congestion',
    },
    '长期熬夜合并海鲜轻度荨麻疹史'
  );

  const matchedIds = matched.map((m) => m.protocol.id);
  assert.ok(matchedIds.includes('def-liver'));
  assert.ok(matchedIds.includes('def-vascular'));
  assert.ok(matchedIds.includes('def-gastric-mucosa'));
  assert.ok(matchedIds.includes('def-sleep-rhythm'));
  assert.ok(matchedIds.includes('def-immune-imbalance'));
});

test('getDefaultProtocolsForOrgan maps all 8 3D OrganIds to relevant default protocols', () => {
  assert.ok(getDefaultProtocolsForOrgan('liver').some((p) => p.id === 'def-liver'));
  assert.ok(getDefaultProtocolsForOrgan('heart').some((p) => p.id === 'def-vascular'));
  assert.ok(getDefaultProtocolsForOrgan('stomach').some((p) => p.id === 'def-gastric-mucosa'));
  assert.ok(getDefaultProtocolsForOrgan('bone').some((p) => p.id === 'def-bone-joint'));
  assert.ok(getDefaultProtocolsForOrgan('brain').some((p) => p.id === 'def-sleep-rhythm'));
});

test('filterDefaultProtocols filters by group and searches by product name or symptom', () => {
  const byProduct = filterDefaultProtocols(SYSTEM_DEFAULT_PROTOCOLS, 'all', '青酸玲菌');
  assert.equal(byProduct.length, 1);
  assert.equal(byProduct[0].id, 'def-hyperuricemia');

  const neuroOnly = filterDefaultProtocols(SYSTEM_DEFAULT_PROTOCOLS, 'neuro_sleep', '');
  assert.equal(neuroOnly.length, 4);
});

test('buildDailyDosingSchedule deduplicates shared products like 优康力 across multiple organs', () => {
  const vascular = SYSTEM_DEFAULT_PROTOCOLS.find((p) => p.id === 'def-vascular')!;
  const intestine = SYSTEM_DEFAULT_PROTOCOLS.find((p) => p.id === 'def-intestine')!;
  const liver = SYSTEM_DEFAULT_PROTOCOLS.find((p) => p.id === 'def-liver')!;

  const schedule = buildDailyDosingSchedule([vascular, intestine, liver]);
  assert.equal(schedule.protocolCount, 3);
  assert.equal(schedule.recommendedMaxCourseDays, 90);

  const mealReplaceSlot = schedule.slots.find((s) => s.slot === 'meal_replace');
  assert.ok(mealReplaceSlot);
  assert.equal(mealReplaceSlot.entries.length, 1);
  assert.equal(mealReplaceSlot.entries[0].productName, '优康力');
  assert.equal(mealReplaceSlot.entries[0].isSharedAcrossOrgans, true);
  assert.deepEqual(mealReplaceSlot.entries[0].sourceOrgans, ['血管损伤', '肠道']);

  // Also test conversion to ManagedTaskItem & round-trip dosing extraction
  const taskPayload = convertDefaultProtocolToManagedTask(liver);
  const fullTask: ManagedTaskItem = {
    ...taskPayload,
    id: 'task-test-liver',
    completedByPatient: false,
  };
  const fromTasks = buildDailyDosingScheduleFromTasks([fullTask]);
  assert.equal(fromTasks.protocolCount, 1);
  assert.equal(fromTasks.slots.length, 3);
});

test('matchDefaultProtocolsForPatient matches cured fatty-liver patient to def-liver and ignores negated 无药物过敏', () => {
  const matched = matchDefaultProtocolsForPatient(
    {
      systolicBp: 122,
      diastolicBp: 78,
      heartRate: 68,
      fastingGlucose: 4.9,
      totalCholesterol: 4.8,
      ldlCholesterol: 2.8,
      liverFatPercent: 4.3,
      gastricStatus: 'normal',
    },
    '轻度脂肪肝伴临界血压基线 无药物过敏 脂肪肝完全逆转·全项达标结案'
  );
  const ids = matched.map((m) => m.protocol.id);
  assert.equal(ids[0], 'def-liver');
  assert.equal(ids.includes('def-immune-imbalance'), false);
});
