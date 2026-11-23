import { LabMetricsSnapshot, computeBmi, deriveClinicalEvaluation } from './clinicalWorkflow';
import { PatientCohortRecord, TreatmentCourseRecord } from './patientCohort';

export type BaselineMetricKey =
  | 'healthScore'
  | 'systolicBp'
  | 'diastolicBp'
  | 'liverFatPercent'
  | 'totalCholesterol'
  | 'ldlCholesterol'
  | 'fastingGlucose'
  | 'bmi';

export type MetricClinicalStatus = 'normal' | 'caution' | 'alert';

export type BaselineTransitionState =
  | 'normalized'
  | 'improving'
  | 'maintained_normal'
  | 'unchanged'
  | 'regressed';

export interface BaselineMetricSpec {
  key: BaselineMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  /** 'higher_better' for healthScore; 'lower_better' for BP / lipids / liver fat / glucose / BMI */
  polarity: 'higher_better' | 'lower_better';
  normalTargetText: string;
  decimals: number;
  /** Visual ruler min/max domain for consistent 0..100% bullet positioning */
  scaleMin: number;
  scaleMax: number;
  /** Clinical healthy target zone [safeMin, safeMax] within [scaleMin, scaleMax] */
  safeMin: number;
  safeMax: number;
  /** Threshold separating caution vs alert when outside [safeMin, safeMax] */
  alertThreshold: number;
}

export const BASELINE_METRIC_SPECS: ReadonlyArray<BaselineMetricSpec> = [
  {
    key: 'healthScore',
    label: '综合健康评分',
    shortLabel: '综合评分',
    unit: '分',
    polarity: 'higher_better',
    normalTargetText: '≥ 90 分',
    decimals: 0,
    scaleMin: 65,
    scaleMax: 98,
    safeMin: 90,
    safeMax: 98,
    alertThreshold: 80,
  },
  {
    key: 'systolicBp',
    label: '收缩压 (高压)',
    shortLabel: '收缩压',
    unit: 'mmHg',
    polarity: 'lower_better',
    normalTargetText: '90–129 mmHg',
    decimals: 0,
    scaleMin: 100,
    scaleMax: 170,
    safeMin: 100,
    safeMax: 129,
    alertThreshold: 140,
  },
  {
    key: 'diastolicBp',
    label: '舒张压 (低压)',
    shortLabel: '舒张压',
    unit: 'mmHg',
    polarity: 'lower_better',
    normalTargetText: '60–84 mmHg',
    decimals: 0,
    scaleMin: 60,
    scaleMax: 108,
    safeMin: 60,
    safeMax: 84,
    alertThreshold: 90,
  },
  {
    key: 'liverFatPercent',
    label: '肝脏脂肪率',
    shortLabel: '肝脂肪率',
    unit: '%',
    polarity: 'lower_better',
    normalTargetText: '< 5.0%',
    decimals: 1,
    scaleMin: 2.0,
    scaleMax: 17.0,
    safeMin: 2.0,
    safeMax: 5.0,
    alertThreshold: 10.0,
  },
  {
    key: 'totalCholesterol',
    label: '总胆固醇 (TC)',
    shortLabel: '总胆固醇',
    unit: 'mmol/L',
    polarity: 'lower_better',
    normalTargetText: '< 5.2 mmol/L',
    decimals: 1,
    scaleMin: 3.2,
    scaleMax: 7.2,
    safeMin: 3.2,
    safeMax: 5.2,
    alertThreshold: 6.2,
  },
  {
    key: 'ldlCholesterol',
    label: '低密度脂蛋白 (LDL-C)',
    shortLabel: 'LDL-C',
    unit: 'mmol/L',
    polarity: 'lower_better',
    normalTargetText: '< 3.4 mmol/L',
    decimals: 1,
    scaleMin: 1.6,
    scaleMax: 5.0,
    safeMin: 1.6,
    safeMax: 3.4,
    alertThreshold: 4.1,
  },
  {
    key: 'fastingGlucose',
    label: '空腹血糖 (FPG)',
    shortLabel: '空腹血糖',
    unit: 'mmol/L',
    polarity: 'lower_better',
    normalTargetText: '3.9–6.1 mmol/L',
    decimals: 1,
    scaleMin: 3.9,
    scaleMax: 8.0,
    safeMin: 3.9,
    safeMax: 6.1,
    alertThreshold: 7.0,
  },
  {
    key: 'bmi',
    label: '体重指数 (BMI)',
    shortLabel: 'BMI',
    unit: 'kg/m²',
    polarity: 'lower_better',
    normalTargetText: '18.5–23.9',
    decimals: 1,
    scaleMin: 18.5,
    scaleMax: 30.0,
    safeMin: 18.5,
    safeMax: 23.9,
    alertThreshold: 27.0,
  },
];

/** The 7 clinical biomarkers excluding composite healthScore */
export const CLINICAL_BIOMARKER_KEYS: ReadonlyArray<BaselineMetricKey> = [
  'systolicBp',
  'diastolicBp',
  'liverFatPercent',
  'totalCholesterol',
  'ldlCholesterol',
  'fastingGlucose',
  'bmi',
];

export interface HistoricalBaselinePackage {
  /** Baseline package code, e.g. 'B001', 'B002', 'B003' */
  code: string;
  /** Target treatment course number anchored by this starting baseline (1 = 第1疗程起点, 2 = 第2疗程起点...) */
  targetCourseNo: number;
  title: string;
  shortTitle: string;
  roleTag: string;
  versionStatus: 'V1 已确认';
  /** YYYY.MM.DD */
  dotDate: string;
  /** YYYY.MM */
  yearMonth: string;
  /** YYYY-MM-DD */
  isoDate: string;
  /** Underlying TreatmentCourseRecord.id used when syncing to 3D Widescreen comparison */
  linkedCourseId: string;
  reportsCount: number;
  structuredMetricsCount: number;
  healthScore: number;
  weightKg: number;
  bmi: number;
  metrics: LabMetricsSnapshot;
  summaryMetricsText: string;
}

export type CheckupTimelineNodeKind =
  | 'course_start_baseline'
  | 'mid_course_recheck'
  | 'course_completed_recheck'
  | 'course_active_latest';

export interface CourseCheckupTimelineEvent {
  id: string;
  courseNo: number;
  courseId: string;
  courseLabel: string;
  courseStageTitle: string;
  courseWindowDot: string;
  nodeKind: CheckupTimelineNodeKind;
  title: string;
  shortNodeLabel: string;
  archiveStatus: '已入档';
  /** YYYY-MM-DD */
  isoDate: string;
  /** YYYY.MM.DD */
  dotDate: string;
  sourceSubtitle: string;
  focusDomainTag: string;
  /** Baseline package code anchored or referenced by this report (e.g., 'B001', 'B002') */
  anchoredBaselineCode?: string;
  courseBaselineCode: string;
  regimenSummary: string;
  healthScore: number;
  weightKg: number;
  bmi: number;
  metrics: LabMetricsSnapshot;
}

export interface EventBaselineDelta {
  eventId: string;
  metricKey: BaselineMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  normalTargetText: string;
  currentValue: number;
  baselineValue: number;
  rawDelta: number;
  /** Signed percentage change relative to baseline, e.g. -43.8 */
  percentChange: number;
  formattedCurrent: string;
  formattedBaseline: string;
  formattedDelta: string;
  /** Concise human-friendly change badge, e.g. "↓ 6.4% (降幅 43.8%)" or "↓ 20 mmHg (-12.8%)" */
  intuitiveChangeBadge: string;
  baselineStatus: MetricClinicalStatus;
  currentStatus: MetricClinicalStatus;
  baselineStatusLabel: string;
  currentStatusLabel: string;
  transitionState: BaselineTransitionState;
  transitionBadgeText: string;
  /** 0..100 visual ruler positions */
  safeStartPct: number;
  safeEndPct: number;
  baselinePct: number;
  currentPct: number;
  temporalRelation: 'before_baseline' | 'at_baseline' | 'after_baseline';
  /** True when the metric moved in the clinically healthy direction relative to baseline */
  isImproved: boolean;
  isUnchanged: boolean;
}

export interface ReportVsBaselineExecutiveSummary {
  scoreBaseline: number;
  scoreCurrent: number;
  scoreDelta: number;
  baselineAbnormalCount: number;
  currentAbnormalCount: number;
  abnormalReducedCount: number;
  newlyNormalizedCount: number;
  improvedMetricsCount: number;
  totalBiomarkers: number;
  topHighlightLabel: string;
  topHighlightDetail: string;
  biomarkerDeltas: EventBaselineDelta[];
}

export interface MilestoneMatrixColumn {
  id: string;
  isLockedBaseline: boolean;
  isInspectedReport: boolean;
  headerTitle: string;
  subDate: string;
  courseTag: string;
  eventRef?: CourseCheckupTimelineEvent;
  baselineRef?: HistoricalBaselinePackage;
}

export interface MilestoneMatrixCell {
  columnId: string;
  formattedValue: string;
  numericValue: number;
  status: MetricClinicalStatus;
  statusLabel: string;
  deltaFromBaseline: string;
  percentFromBaseline: string;
  isImprovedVsBaseline: boolean;
  isBaselineOrigin: boolean;
}

export interface MilestoneMatrixRow {
  spec: BaselineMetricSpec;
  cells: MilestoneMatrixCell[];
  overallDelta: EventBaselineDelta;
}

export interface CourseSpanTrackItem {
  courseId: string;
  courseNo: number;
  courseLabel: string;
  stageTitle: string;
  startBaselineCode: string;
  startDotDate: string;
  endDotDate: string;
  cycleWeeks: number;
  elapsedWeeks: number;
  status: TreatmentCourseRecord['status'];
  adherencePercent: number;
  regimenSummary: string;
  eventsCount: number;
  startScore: number;
  endScore: number;
}

export interface PatientTimelineBaselineBundle {
  patientId: string;
  /** Ordered newest-first (e.g. B002 above B001) matching clinical baseline package list */
  baselinePackagesDesc: HistoricalBaselinePackage[];
  /** Ordered oldest-first (B001 -> B002 -> B003) */
  baselinePackagesAsc: HistoricalBaselinePackage[];
  /** Course-level horizontal Gantt/span tracks (第1疗程 -> 第2疗程 -> 第3疗程) */
  courseSpans: CourseSpanTrackItem[];
  /** Chronological checkup events ordered newest-first for vertical timeline rail */
  timelineEventsDesc: CourseCheckupTimelineEvent[];
  /** Chronological checkup events ordered oldest-first for longitudinal baseline line chart */
  timelineEventsAsc: CourseCheckupTimelineEvent[];
}

function toDotDate(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, '.');
}

function toYearMonth(isoDate: string): string {
  return isoDate.slice(0, 7).replace(/-/g, '.');
}

function toChineseCourseNumeral(courseNo: number): string {
  const map: Record<number, string> = {
    1: '第一',
    2: '第二',
    3: '第三',
    4: '第四',
    5: '第五',
  };
  return map[courseNo] ?? `第${courseNo}`;
}

function midpointIsoDate(startIso: string, endIso: string): string {
  const s = Date.parse(`${startIso.slice(0, 10)}T00:00:00Z`);
  const e = Date.parse(`${endIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return startIso.slice(0, 10);
  const mid = Math.round((s + e) / 2);
  return new Date(mid).toISOString().slice(0, 10);
}

function clampPct(pct: number): number {
  return Math.max(3, Math.min(97, Number(pct.toFixed(1))));
}

function toScalePct(val: number, spec: BaselineMetricSpec): number {
  const span = Math.max(0.0001, spec.scaleMax - spec.scaleMin);
  return clampPct(((val - spec.scaleMin) / span) * 100);
}

export function classifyMetricClinicalStatus(
  value: number,
  spec: BaselineMetricSpec
): { status: MetricClinicalStatus; label: string } {
  if (spec.polarity === 'higher_better') {
    if (value >= spec.safeMin) return { status: 'normal', label: '理想达标' };
    if (value >= spec.alertThreshold) return { status: 'caution', label: '轻度亚健康' };
    return { status: 'alert', label: '明显偏低' };
  }
  if (value <= spec.safeMax && value >= spec.safeMin) {
    return { status: 'normal', label: '达标正常' };
  }
  if (value < spec.safeMin) {
    return { status: 'caution', label: '偏低关注' };
  }
  if (value >= spec.alertThreshold) {
    return { status: 'alert', label: '明显超标' };
  }
  return { status: 'caution', label: '轻度偏高' };
}

function interpolateMetrics(
  start: LabMetricsSnapshot,
  end: LabMetricsSnapshot,
  ratio: number
): LabMetricsSnapshot {
  const lerp = (a: number, b: number, decimals: number) =>
    Number((a + (b - a) * ratio).toFixed(decimals));
  return {
    systolicBp: lerp(start.systolicBp, end.systolicBp, 0),
    diastolicBp: lerp(start.diastolicBp, end.diastolicBp, 0),
    heartRate: lerp(start.heartRate, end.heartRate, 0),
    fastingGlucose: lerp(start.fastingGlucose, end.fastingGlucose, 1),
    totalCholesterol: lerp(start.totalCholesterol, end.totalCholesterol, 1),
    ldlCholesterol: lerp(start.ldlCholesterol, end.ldlCholesterol, 1),
    liverFatPercent: lerp(start.liverFatPercent, end.liverFatPercent, 1),
    gastricStatus: ratio >= 0.65 ? end.gastricStatus : start.gastricStatus,
  };
}

function pickCourseFocusTag(patient: PatientCohortRecord, courseNo: number): string {
  const primary = patient.focusOrgans[0];
  if (patient.hasNebulaExperienceReport) {
    return courseNo === 1 ? '胃肠黏膜与细胞能量复查' : '胆系疏泄与骨代谢复查';
  }
  if (primary === 'heart') return '血压与心血管负荷复查';
  if (primary === 'liver') return '肝脏减脂与代谢复查';
  if (primary === 'vascular') return '血脂与血管斑块复查';
  if (primary === 'stomach') return '胃黏膜与糖代谢复查';
  return '多系统慢病综合复查';
}

export function getMetricNumericValue(
  item: {
    healthScore: number;
    bmi: number;
    metrics: LabMetricsSnapshot;
  },
  metricKey: BaselineMetricKey
): number {
  switch (metricKey) {
    case 'healthScore':
      return item.healthScore;
    case 'systolicBp':
      return item.metrics.systolicBp;
    case 'diastolicBp':
      return item.metrics.diastolicBp;
    case 'liverFatPercent':
      return item.metrics.liverFatPercent;
    case 'totalCholesterol':
      return item.metrics.totalCholesterol;
    case 'ldlCholesterol':
      return item.metrics.ldlCholesterol;
    case 'fastingGlucose':
      return item.metrics.fastingGlucose;
    case 'bmi':
      return item.bmi;
  }
}

export function formatBaselineMetricValue(value: number, metricKey: BaselineMetricKey): string {
  const spec =
    BASELINE_METRIC_SPECS.find((m) => m.key === metricKey) ?? BASELINE_METRIC_SPECS[0];
  return `${value.toFixed(spec.decimals)} ${spec.unit}`;
}

/**
 * Builds Historical Baseline Packages (B001, B002, ...) and Per-Course Checkup Timeline Events
 * for any patient in the cohort.
 */
export function buildPatientTimelineAndBaselines(
  patient: PatientCohortRecord
): PatientTimelineBaselineBundle {
  const profile = patient.clinicalState.patientProfile;
  const treatmentCourses = patient.courses.filter((c) => c.courseNo >= 1);
  const baselineCourse0 = patient.courses[0];

  const baselinePackagesAsc: HistoricalBaselinePackage[] = [];
  const courseSpans: CourseSpanTrackItem[] = [];
  const allEvents: CourseCheckupTimelineEvent[] = [];

  treatmentCourses.forEach((course, idx) => {
    const targetCourseNo = course.courseNo;
    const code = `B${String(targetCourseNo).padStart(3, '0')}`;
    const startSourceCourse = idx === 0 ? baselineCourse0 : treatmentCourses[idx - 1];
    const startIsoDate = idx === 0 ? baselineCourse0.startDate : course.startDate;
    const startEval = deriveClinicalEvaluation(
      profile,
      startSourceCourse.metrics,
      startSourceCourse.weightKg,
      []
    );
    const startBmi = computeBmi(startSourceCourse.weightKg, profile.heightCm);
    const endEval = deriveClinicalEvaluation(profile, course.metrics, course.weightKg, []);
    const endBmi = computeBmi(course.weightKg, profile.heightCm);

    const reportsCount = patient.hasNebulaExperienceReport && idx === 0 ? 2 : 1;

    baselinePackagesAsc.push({
      code,
      targetCourseNo,
      title: `第${targetCourseNo}疗程起点 · ${toYearMonth(startIsoDate)}`,
      shortTitle: idx === 0 ? `首诊总基线 (${code})` : `第${targetCourseNo}疗程起点 (${code})`,
      roleTag: idx === 0 ? '首诊总基准线' : `第${targetCourseNo}疗程换方起点`,
      versionStatus: 'V1 已确认',
      dotDate: toDotDate(startIsoDate),
      yearMonth: toYearMonth(startIsoDate),
      isoDate: startIsoDate,
      linkedCourseId: startSourceCourse.id,
      reportsCount,
      structuredMetricsCount: 8,
      healthScore: startEval.healthScore,
      weightKg: startSourceCourse.weightKg,
      bmi: startBmi,
      metrics: startSourceCourse.metrics,
      summaryMetricsText: `评分 ${startEval.healthScore}分 · 血压 ${startSourceCourse.metrics.systolicBp}/${startSourceCourse.metrics.diastolicBp} · 肝脂 ${startSourceCourse.metrics.liverFatPercent.toFixed(1)}% · TC ${startSourceCourse.metrics.totalCholesterol.toFixed(1)}`,
    });

    const cnPrefix = toChineseCourseNumeral(targetCourseNo);
    const courseWindowDot = `${toDotDate(course.startDate)} — ${toDotDate(course.endDate)}`;
    let courseEventsCount = 0;

    // Event 1: Course Starting Baseline Report
    allEvents.push({
      id: `${patient.id}-ev-c${targetCourseNo}-start`,
      courseNo: targetCourseNo,
      courseId: course.id,
      courseLabel: course.courseLabel,
      courseStageTitle: course.stageTitle,
      courseWindowDot,
      nodeKind: 'course_start_baseline',
      title: `${cnPrefix}疗程起点报告`,
      shortNodeLabel: idx === 0 ? `首诊起点 (${code})` : `${targetCourseNo}期起点 (${code})`,
      archiveStatus: '已入档',
      isoDate: startIsoDate,
      dotDate: toDotDate(startIsoDate),
      sourceSubtitle:
        patient.hasNebulaExperienceReport && idx === 0
          ? '门诊生化检验 + 60页细胞能量报告 · 8 项结构化指标'
          : '门诊实验室与影像建档报告 · 8 项结构化指标',
      focusDomainTag: `基线 ${code}`,
      anchoredBaselineCode: code,
      courseBaselineCode: code,
      regimenSummary: course.focusRegimenSummary,
      healthScore: startEval.healthScore,
      weightKg: startSourceCourse.weightKg,
      bmi: startBmi,
      metrics: startSourceCourse.metrics,
    });
    courseEventsCount += 1;

    // Event 2: Mid-Course Follow-up Recheck (when course has progressed >= 3 weeks)
    if (course.elapsedWeeks >= 3) {
      const midIso = midpointIsoDate(course.startDate, course.endDate);
      const midMetrics = interpolateMetrics(startSourceCourse.metrics, course.metrics, 0.55);
      const midWeight = Number(
        (startSourceCourse.weightKg + (course.weightKg - startSourceCourse.weightKg) * 0.55).toFixed(
          1
        )
      );
      const midEval = deriveClinicalEvaluation(profile, midMetrics, midWeight, []);
      const midBmi = computeBmi(midWeight, profile.heightCm);

      allEvents.push({
        id: `${patient.id}-ev-c${targetCourseNo}-mid`,
        courseNo: targetCourseNo,
        courseId: course.id,
        courseLabel: course.courseLabel,
        courseStageTitle: course.stageTitle,
        courseWindowDot,
        nodeKind: 'mid_course_recheck',
        title: `${cnPrefix}疗程中期复查`,
        shortNodeLabel: `${targetCourseNo}期中期复查`,
        archiveStatus: '已入档',
        isoDate: midIso,
        dotDate: toDotDate(midIso),
        sourceSubtitle: `第 ${Math.max(2, Math.round(course.elapsedWeeks / 2))} 周随访实验室复检 · 8 项结构化指标`,
        focusDomainTag: pickCourseFocusTag(patient, targetCourseNo),
        courseBaselineCode: code,
        regimenSummary: course.focusRegimenSummary,
        healthScore: midEval.healthScore,
        weightKg: midWeight,
        bmi: midBmi,
        metrics: midMetrics,
      });
      courseEventsCount += 1;
    }

    // Event 3: Course Completion Recheck OR Active Course Latest Checkup
    const isCompleted = course.status === 'completed';
    const latestIso = isCompleted
      ? course.endDate
      : patient.clinicalState.patientProfile.updatedAt.slice(0, 10) >= course.startDate
      ? patient.clinicalState.patientProfile.updatedAt.slice(0, 10)
      : course.endDate;

    if (course.elapsedWeeks >= 2 || isCompleted) {
      allEvents.push({
        id: `${patient.id}-ev-c${targetCourseNo}-end`,
        courseNo: targetCourseNo,
        courseId: course.id,
        courseLabel: course.courseLabel,
        courseStageTitle: course.stageTitle,
        courseWindowDot,
        nodeKind: isCompleted ? 'course_completed_recheck' : 'course_active_latest',
        title: isCompleted
          ? `${cnPrefix}疗程结案复评报告`
          : `${cnPrefix}疗程第 ${course.elapsedWeeks} 周复查`,
        shortNodeLabel: isCompleted
          ? `${targetCourseNo}期结案报告`
          : `${targetCourseNo}期第${course.elapsedWeeks}周`,
        archiveStatus: '已入档',
        isoDate: latestIso,
        dotDate: toDotDate(latestIso),
        sourceSubtitle: isCompleted
          ? `满 ${course.cycleWeeks} 周疗程结案全套复检 · 8 项结构化指标`
          : `当前执行期动态随访复检（依从率 ${course.adherencePercent}%）· 8 项指标`,
        focusDomainTag: isCompleted
          ? `${course.courseLabel}结案达标评估`
          : pickCourseFocusTag(patient, targetCourseNo),
        courseBaselineCode: code,
        regimenSummary: course.focusRegimenSummary,
        healthScore: endEval.healthScore,
        weightKg: course.weightKg,
        bmi: endBmi,
        metrics: course.metrics,
      });
      courseEventsCount += 1;
    }

    courseSpans.push({
      courseId: course.id,
      courseNo: targetCourseNo,
      courseLabel: course.courseLabel,
      stageTitle: course.stageTitle,
      startBaselineCode: code,
      startDotDate: toDotDate(course.startDate),
      endDotDate: toDotDate(course.endDate),
      cycleWeeks: course.cycleWeeks,
      elapsedWeeks: course.elapsedWeeks,
      status: course.status,
      adherencePercent: course.adherencePercent,
      regimenSummary: course.focusRegimenSummary,
      eventsCount: courseEventsCount,
      startScore: startEval.healthScore,
      endScore: endEval.healthScore,
    });
  });

  const kindOrder: Record<CheckupTimelineNodeKind, number> = {
    course_start_baseline: 1,
    mid_course_recheck: 2,
    course_completed_recheck: 3,
    course_active_latest: 4,
  };

  const timelineEventsAsc = [...allEvents].sort((a, b) => {
    if (a.isoDate !== b.isoDate) return a.isoDate.localeCompare(b.isoDate);
    if (a.courseNo !== b.courseNo) return a.courseNo - b.courseNo;
    return kindOrder[a.nodeKind] - kindOrder[b.nodeKind];
  });

  const timelineEventsDesc = [...timelineEventsAsc].reverse();
  const baselinePackagesDesc = [...baselinePackagesAsc].reverse();

  return {
    patientId: patient.id,
    baselinePackagesDesc,
    baselinePackagesAsc,
    courseSpans,
    timelineEventsDesc,
    timelineEventsAsc,
  };
}

/**
 * Evaluates a timeline checkup event against a locked Historical Baseline Package (e.g. B001 or B002),
 * producing complete visual ruler percentages, clinical status transitions, and % change badges.
 */
export function evaluateEventAgainstBaseline(
  event: CourseCheckupTimelineEvent,
  baselinePkg: HistoricalBaselinePackage,
  metricKey: BaselineMetricKey
): EventBaselineDelta {
  const spec =
    BASELINE_METRIC_SPECS.find((m) => m.key === metricKey) ?? BASELINE_METRIC_SPECS[0];
  const currentValue = getMetricNumericValue(event, metricKey);
  const baselineValue = getMetricNumericValue(baselinePkg, metricKey);
  const rawDelta = Number((currentValue - baselineValue).toFixed(spec.decimals));
  const percentChange =
    Math.abs(baselineValue) > 1e-6
      ? Number((((currentValue - baselineValue) / baselineValue) * 100).toFixed(1))
      : 0;

  const temporalRelation: EventBaselineDelta['temporalRelation'] =
    event.anchoredBaselineCode === baselinePkg.code
      ? 'at_baseline'
      : event.isoDate < baselinePkg.isoDate
      ? 'before_baseline'
      : 'after_baseline';

  const isUnchanged = Math.abs(rawDelta) < 1e-6;
  const isImproved =
    !isUnchanged &&
    (spec.polarity === 'higher_better' ? rawDelta > 0 : rawDelta < 0);

  const sign = rawDelta > 0 ? '+' : '';
  const formattedDelta = isUnchanged
    ? '与基线持平'
    : `${sign}${rawDelta.toFixed(spec.decimals)} ${spec.unit}`;

  const absDeltaStr = `${Math.abs(rawDelta).toFixed(spec.decimals)} ${spec.unit}`;
  const absPctStr = `${Math.abs(percentChange).toFixed(1)}%`;
  const arrow = rawDelta < 0 ? '↓' : rawDelta > 0 ? '↑' : '—';
  const intuitiveChangeBadge = isUnchanged
    ? '持平 (0.0%)'
    : metricKey === 'healthScore'
    ? `${arrow} ${sign}${rawDelta.toFixed(0)} 分`
    : `${arrow} ${absDeltaStr} (${rawDelta < 0 ? '-' : '+'}${absPctStr})`;

  const baseCls = classifyMetricClinicalStatus(baselineValue, spec);
  const curCls = classifyMetricClinicalStatus(currentValue, spec);

  let transitionState: BaselineTransitionState = 'unchanged';
  let transitionBadgeText = `${baseCls.label} → ${curCls.label}`;

  if (baseCls.status !== 'normal' && curCls.status === 'normal') {
    transitionState = 'normalized';
    transitionBadgeText = `${baseCls.label} → 已归绿达标`;
  } else if (baseCls.status === 'normal' && curCls.status === 'normal') {
    transitionState = 'maintained_normal';
    transitionBadgeText = '稳居达标绿区';
  } else if (isImproved) {
    transitionState = 'improving';
    transitionBadgeText =
      baseCls.status !== curCls.status
        ? `${baseCls.label} → ${curCls.label}`
        : spec.polarity === 'higher_better'
        ? '向达标绿区攀升'
        : '向达标绿区回落';
  } else if (isUnchanged) {
    transitionState = 'unchanged';
    transitionBadgeText = `维持${curCls.label}`;
  } else {
    transitionState = 'regressed';
    transitionBadgeText = '较基线波动上升';
  }

  const span = Math.max(0.0001, spec.scaleMax - spec.scaleMin);
  const safeStartPct = Math.max(0, Math.min(100, ((spec.safeMin - spec.scaleMin) / span) * 100));
  const safeEndPct = Math.max(0, Math.min(100, ((spec.safeMax - spec.scaleMin) / span) * 100));

  return {
    eventId: event.id,
    metricKey,
    label: spec.label,
    shortLabel: spec.shortLabel,
    unit: spec.unit,
    normalTargetText: spec.normalTargetText,
    currentValue,
    baselineValue,
    rawDelta,
    percentChange,
    formattedCurrent: `${currentValue.toFixed(spec.decimals)} ${spec.unit}`,
    formattedBaseline: `${baselineValue.toFixed(spec.decimals)} ${spec.unit}`,
    formattedDelta,
    intuitiveChangeBadge,
    baselineStatus: baseCls.status,
    currentStatus: curCls.status,
    baselineStatusLabel: baseCls.label,
    currentStatusLabel: curCls.label,
    transitionState,
    transitionBadgeText,
    safeStartPct: Number(safeStartPct.toFixed(1)),
    safeEndPct: Number(safeEndPct.toFixed(1)),
    baselinePct: toScalePct(baselineValue, spec),
    currentPct: toScalePct(currentValue, spec),
    temporalRelation,
    isImproved,
    isUnchanged,
  };
}

/**
 * Summarizes overall clinical transformation from a locked HistoricalBaselinePackage
 * to a selected CourseCheckupTimelineEvent across all 7 clinical biomarkers.
 */
export function summarizeReportVsBaseline(
  event: CourseCheckupTimelineEvent,
  baselinePkg: HistoricalBaselinePackage
): ReportVsBaselineExecutiveSummary {
  const biomarkerDeltas = CLINICAL_BIOMARKER_KEYS.map((key) =>
    evaluateEventAgainstBaseline(event, baselinePkg, key)
  );

  const baselineAbnormalCount = biomarkerDeltas.filter(
    (d) => d.baselineStatus !== 'normal'
  ).length;
  const currentAbnormalCount = biomarkerDeltas.filter(
    (d) => d.currentStatus !== 'normal'
  ).length;
  const newlyNormalizedCount = biomarkerDeltas.filter(
    (d) => d.transitionState === 'normalized'
  ).length;
  const improvedMetricsCount = biomarkerDeltas.filter(
    (d) => d.isImproved || d.transitionState === 'maintained_normal'
  ).length;

  const improvedOnly = biomarkerDeltas.filter((d) => d.isImproved);
  improvedOnly.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
  const best = improvedOnly[0];

  return {
    scoreBaseline: baselinePkg.healthScore,
    scoreCurrent: event.healthScore,
    scoreDelta: event.healthScore - baselinePkg.healthScore,
    baselineAbnormalCount,
    currentAbnormalCount,
    abnormalReducedCount: Math.max(0, baselineAbnormalCount - currentAbnormalCount),
    newlyNormalizedCount,
    improvedMetricsCount,
    totalBiomarkers: biomarkerDeltas.length,
    topHighlightLabel: best ? `${best.shortLabel}改善最显著` : '处于基线起点阶段',
    topHighlightDetail: best
      ? `${best.baselineValue.toFixed(best.metricKey === 'systolicBp' || best.metricKey === 'diastolicBp' ? 0 : 1)} → ${best.currentValue.toFixed(best.metricKey === 'systolicBp' || best.metricKey === 'diastolicBp' ? 0 : 1)} ${best.unit}（降幅 ${Math.abs(best.percentChange).toFixed(1)}%）`
      : '选择后续疗程复查节点即可查看降幅',
    biomarkerDeltas,
  };
}

/**
 * Builds a side-by-side chronological matrix table comparing the Locked Baseline Package
 * in Column 1 against each Course Milestone Report (or all checkup events) from left to right.
 */
export function buildMilestoneEvolutionMatrix(
  bundle: PatientTimelineBaselineBundle,
  lockedBaseline: HistoricalBaselinePackage,
  inspectedEvent: CourseCheckupTimelineEvent,
  density: 'key_milestones' | 'all_events'
): {
  columns: MilestoneMatrixColumn[];
  rows: MilestoneMatrixRow[];
} {
  const columns: MilestoneMatrixColumn[] = [];

  if (density === 'all_events') {
    bundle.timelineEventsAsc.forEach((ev) => {
      const isLockedOrigin = ev.anchoredBaselineCode === lockedBaseline.code;
      columns.push({
        id: ev.id,
        isLockedBaseline: isLockedOrigin,
        isInspectedReport: ev.id === inspectedEvent.id,
        headerTitle: ev.shortNodeLabel,
        subDate: ev.dotDate,
        courseTag: ev.courseLabel,
        eventRef: ev,
      });
    });
  } else {
    // Column 1: Explicitly pin the Locked Baseline Package
    columns.push({
      id: `base-${lockedBaseline.code}`,
      isLockedBaseline: true,
      isInspectedReport: inspectedEvent.anchoredBaselineCode === lockedBaseline.code,
      headerTitle: lockedBaseline.shortTitle,
      subDate: lockedBaseline.dotDate,
      courseTag: '对比基准线',
      baselineRef: lockedBaseline,
    });

    // Subsequent columns: Each course's completion/latest report (plus inspectedEvent if it's a mid-course report)
    bundle.courseSpans.forEach((sp) => {
      const endEv = bundle.timelineEventsAsc.find(
        (e) =>
          e.courseNo === sp.courseNo &&
          (e.nodeKind === 'course_completed_recheck' || e.nodeKind === 'course_active_latest')
      );
      const midEv = bundle.timelineEventsAsc.find(
        (e) => e.courseNo === sp.courseNo && e.nodeKind === 'mid_course_recheck'
      );

      if (midEv && midEv.id === inspectedEvent.id) {
        columns.push({
          id: midEv.id,
          isLockedBaseline: false,
          isInspectedReport: true,
          headerTitle: midEv.shortNodeLabel,
          subDate: midEv.dotDate,
          courseTag: sp.courseLabel,
          eventRef: midEv,
        });
      }

      if (endEv) {
        columns.push({
          id: endEv.id,
          isLockedBaseline: false,
          isInspectedReport: endEv.id === inspectedEvent.id,
          headerTitle: endEv.shortNodeLabel,
          subDate: endEv.dotDate,
          courseTag: sp.courseLabel,
          eventRef: endEv,
        });
      }
    });

    // Fallback for brand-new 1-week intake patient with only 1 start event
    if (columns.length === 1 && bundle.timelineEventsAsc[0]) {
      const firstEv = bundle.timelineEventsAsc[0];
      columns[0].eventRef = firstEv;
    }
  }

  const rows: MilestoneMatrixRow[] = BASELINE_METRIC_SPECS.map((spec) => {
    const baseVal = getMetricNumericValue(lockedBaseline, spec.key);
    const cells: MilestoneMatrixCell[] = columns.map((col) => {
      const source = col.eventRef ?? col.baselineRef ?? lockedBaseline;
      const val = getMetricNumericValue(source, spec.key);
      const cls = classifyMetricClinicalStatus(val, spec);
      const rawDelta = Number((val - baseVal).toFixed(spec.decimals));
      const pct =
        Math.abs(baseVal) > 1e-6
          ? Number((((val - baseVal) / baseVal) * 100).toFixed(1))
          : 0;
      const isZero = Math.abs(rawDelta) < 1e-6;
      const isImp =
        !isZero && (spec.polarity === 'higher_better' ? rawDelta > 0 : rawDelta < 0);
      const sign = rawDelta > 0 ? '+' : '';

      return {
        columnId: col.id,
        formattedValue: `${val.toFixed(spec.decimals)}`,
        numericValue: val,
        status: cls.status,
        statusLabel: cls.label,
        deltaFromBaseline: col.isLockedBaseline
          ? '基准原点'
          : isZero
          ? '持平'
          : `${sign}${rawDelta.toFixed(spec.decimals)}`,
        percentFromBaseline: col.isLockedBaseline || isZero ? '' : `${sign}${pct.toFixed(1)}%`,
        isImprovedVsBaseline: isImp,
        isBaselineOrigin: col.isLockedBaseline,
      };
    });

    return {
      spec,
      cells,
      overallDelta: evaluateEventAgainstBaseline(inspectedEvent, lockedBaseline, spec.key),
    };
  });

  return { columns, rows };
}
