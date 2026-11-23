import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL_ENERGY_LEVELS,
  CHEN_XIAOZHEN_NEBULA_REPORT,
  classifyFoodTherapyDValue,
  classifyMicrobeDValue,
  classifyOrganTissueDValue,
  classifyPathologyDValue,
  summarizeNebulaReportAtStage,
} from './nebulaReportParser';

test('Page 16 official D-value classifiers accurately grade pathology, organ tissue, microbes, and reverse food scale', () => {
  // Pathology E1 - E7 thresholds
  assert.equal(classifyPathologyDValue(0.188).grade, 'E1'); // 龋齿 P19
  assert.equal(classifyPathologyDValue(0.654).grade, 'E2'); // 肩周炎 P17
  assert.equal(classifyPathologyDValue(1.789).grade, 'E3'); // 肠道菌群失调 P18
  assert.equal(classifyPathologyDValue(3.855).grade, 'E4'); // 慢性支气管粘膜炎 P17
  assert.equal(classifyPathologyDValue(4.718).grade, 'E5'); // 神经血管疾病 P17
  assert.equal(classifyPathologyDValue(11.038).grade, 'E6-E7'); // 慢性胃溃疡 P18
  assert.equal(classifyPathologyDValue(11.038).severity, 'alert');

  // Organ load 轻/中/重 thresholds
  assert.equal(classifyOrganTissueDValue(1.186).degree, '轻'); // 腰椎 P51
  assert.equal(classifyOrganTissueDValue(1.647).degree, '中'); // 幽门胃前壁 P21
  assert.equal(classifyOrganTissueDValue(3.169).degree, '重'); // 总胆管 P27

  // Microbe thresholds
  assert.equal(classifyMicrobeDValue(0.081).stateLabel, '无'); // 胆囊大肠杆菌 P27
  assert.equal(classifyMicrobeDValue(0.137).stateLabel, '少量'); // 肝脏大肠杆菌 P26
  assert.equal(classifyMicrobeDValue(0.669).stateLabel, '存在'); // A型溶血链球菌 P17
  assert.equal(classifyMicrobeDValue(0.913).stateLabel, '明显存在'); // 胃后壁幽门螺杆菌 P20
  assert.equal(classifyMicrobeDValue(2.883).stateLabel, '超标'); // 腹部幽门螺杆菌 P18

  // Reverse Food Therapy scale (Page 60: Lower D = More Suitable)
  assert.equal(classifyFoodTherapyDValue(0.003).tier, 'top'); // 黑枣
  assert.equal(classifyFoodTherapyDValue(0.028).tier, 'recommended'); // 碎荞麦片
});

test('Chen Xiaozhen 60-page NebulaByte YSY dataset preserves exact baseline metrics and demonstrates multi-course entropy & D-value reduction', () => {
  assert.equal(CELL_ENERGY_LEVELS.length, 6);
  assert.equal(CHEN_XIAOZHEN_NEBULA_REPORT.patientName, '陈小真');
  assert.equal(CHEN_XIAOZHEN_NEBULA_REPORT.age, 74);
  assert.equal(CHEN_XIAOZHEN_NEBULA_REPORT.rawPagesCount, 60);
  assert.equal(CHEN_XIAOZHEN_NEBULA_REPORT.foodTherapyItems.length, 10);
  assert.equal(CHEN_XIAOZHEN_NEBULA_REPORT.mineralItems.length, 5);

  const c0Stats = summarizeNebulaReportAtStage(CHEN_XIAOZHEN_NEBULA_REPORT, 0);
  const c1Stats = summarizeNebulaReportAtStage(CHEN_XIAOZHEN_NEBULA_REPORT, 1);
  const c2Stats = summarizeNebulaReportAtStage(CHEN_XIAOZHEN_NEBULA_REPORT, 2);

  // Baseline has 6 E6-E7 high-attention pathology items and 5 heavy organ load clusters
  assert.equal(c0Stats.e6e7HighPathologyCount, 6);
  assert.equal(c0Stats.heavyOrganLoadCount, 5);
  assert.equal(c0Stats.overLimitMicrobeCount, 4);

  // Across Course 1 -> Course 2, Grade-6 black squares and E6-E7 high-attention items drop strictly
  assert.ok(c1Stats.totalGrade6BlackSquares < c0Stats.totalGrade6BlackSquares);
  assert.ok(c2Stats.totalGrade6BlackSquares < c1Stats.totalGrade6BlackSquares);
  assert.equal(c2Stats.e6e7HighPathologyCount, 0);
  assert.equal(c2Stats.heavyOrganLoadCount, 0);
});
