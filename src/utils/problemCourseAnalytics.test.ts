import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialCohortStore,
  filterAndSortPatientRoster,
  summarizePatientForRoster,
} from './patientCohort';
import {
  buildPatientProblemCourseHierarchy,
  computeCrossPeriodCourseComparison,
} from './problemCourseAnalytics';

test('buildPatientProblemCourseHierarchy maps 1 patient -> multiple health issues -> multiple courses with drug & product names', () => {
  const store = createInitialCohortStore();

  for (const patient of store.patients) {
    const hierarchy = buildPatientProblemCourseHierarchy(patient);
    assert.equal(hierarchy.patientId, patient.id);
    assert.ok(
      hierarchy.issues.length >= 3,
      `Expected ${hierarchy.patientName} to have >= 3 distinct health issues`
    );
    assert.equal(hierarchy.courseRegimens.length, patient.courses.length);

    // Every non-baseline course must expose explicit product brand names and drug regimen entries
    for (const cr of hierarchy.courseRegimens) {
      if (cr.courseNo > 0) {
        assert.ok(
          cr.productItems.length >= 2,
          `Course ${cr.courseId} on ${hierarchy.patientName} has >= 2 product brand names`
        );
        assert.ok(
          cr.drugItems.length >= 1,
          `Course ${cr.courseId} on ${hierarchy.patientName} has >= 1 medication entry`
        );
      }
    }

    // Every health issue owns a cohesive group of >= 2 indicators, each with an independent baseline & dynamic trend
    for (const issue of hierarchy.issues) {
      assert.ok(
        issue.indicators.length >= 2,
        `Issue ${issue.title} owns a group of >= 2 indicators`
      );
      for (const ind of issue.indicators) {
        assert.equal(ind.independentBaseline.courseId, patient.courses[0].id);
        assert.equal(ind.coursePoints.length, patient.courses.length);
      }
    }
  }
});

test('computeCrossPeriodCourseComparison quantifies post-course completion cross-period deltas and drug step-down', () => {
  const store = createInitialCohortStore();
  const chen = store.patients.find((p) => p.id === 'pat-chenjianguo')!;
  const hierarchy = buildPatientProblemCourseHierarchy(chen);

  assert.equal(hierarchy.issues.length, 4);
  assert.equal(hierarchy.closedCoursesCount, 2);
  assert.ok(hierarchy.allDrugNamesAcrossCourses.some((n) => n.includes('苯磺酸氨氯地平片')));
  assert.ok(hierarchy.allProductNamesAcrossCourses.includes('护肝菌'));
  assert.ok(hierarchy.allProductNamesAcrossCourses.includes('优康力'));

  // Compare Course 1 (closed) -> Course 2 (closed)
  const crossC1ToC2 = computeCrossPeriodCourseComparison(
    hierarchy,
    'cjg-c1',
    'cjg-c2',
    'all'
  );
  assert.equal(crossC1ToC2.fromCourse.courseNo, 1);
  assert.equal(crossC1ToC2.toCourse.courseNo, 2);
  assert.ok(crossC1ToC2.improvedCount >= 8);

  const liverFatRow = crossC1ToC2.rows.find((r) => r.indicator.key === 'liverFatPercent')!;
  assert.equal(liverFatRow.fromValue, 12.1);
  assert.equal(liverFatRow.toValue, 9.8);
  assert.equal(liverFatRow.deltaAbs, -2.3);

  // Compare Baseline -> Course 2 (closed) for Zhou Yaqin (full reversal)
  const zhou = store.patients.find((p) => p.id === 'pat-zhouyaqin')!;
  const zhouHierarchy = buildPatientProblemCourseHierarchy(zhou);
  const zhouCross = computeCrossPeriodCourseComparison(
    zhouHierarchy,
    'zyq-c0',
    'zyq-c2',
    'all'
  );
  assert.ok(zhouCross.normalizedCount >= 5);
  assert.equal(
    zhouCross.rows.every((r) => r.toIsNormal),
    true,
    'All indicators for Zhou Yaqin at closed Course 2 are in normal reference zone'
  );
});

test('summarizePatientForRoster and filterAndSortPatientRoster expose health issue counts and search by drug & product names', () => {
  const store = createInitialCohortStore();
  const summaries = store.patients.map(summarizePatientForRoster);

  const byDrug = filterAndSortPatientRoster(summaries, { searchQuery: '络活喜' });
  assert.ok(byDrug.some((s) => s.id === 'pat-chenjianguo'));
  assert.ok(byDrug.some((s) => s.id === 'pat-linxiao'));

  const byProduct = filterAndSortPatientRoster(summaries, { searchQuery: '美龄鹿' });
  assert.equal(byProduct.length, 1);
  assert.equal(byProduct[0].id, 'pat-zhouyaqin');
  assert.equal(byProduct[0].closedCoursesCount, 2);
});
