import { HealthSeverity, ORGAN_ORDER, OrganId } from './healthModel';
import {
  ClinicalClosedLoopState,
  DerivedClinicalEvaluation,
  LabMetricsSnapshot,
  PatientProfile,
  computeBmi,
  deriveClinicalEvaluation,
  getEffectiveLabMetrics,
} from './clinicalWorkflow';
import { PatientCohortRecord, TreatmentCourseRecord } from './patientCohort';

export type ComparisonBaselineMode = 'first_baseline' | 'prev_report' | 'target_12w';

export type ConsultationTopicId =
  | 'all'
  | 'cardio_bp'
  | 'liver_metabolic'
  | 'lipid_vascular'
  | 'gastric_digestive';

export type TrendFocusMetric = 'bp' | 'liver' | 'lipid' | 'weight_score';

export interface ConsultationTopicOption {
  id: ConsultationTopicId;
  label: string;
  organId: OrganId | null;
  trendMetric: TrendFocusMetric;
  highlightedRowIds: ReadonlyArray<string>;
}

export const CONSULTATION_TOPICS: ReadonlyArray<ConsultationTopicOption> = [
  {
    id: 'all',
    label: '全景对比',
    organId: null,
    trendMetric: 'bp',
    highlightedRowIds: [],
  },
  {
    id: 'cardio_bp',
    label: '讲血压心血管',
    organId: 'heart',
    trendMetric: 'bp',
    highlightedRowIds: ['sbp', 'dbp'],
  },
  {
    id: 'liver_metabolic',
    label: '讲脂肪肝代谢',
    organId: 'liver',
    trendMetric: 'liver',
    highlightedRowIds: ['liver_fat', 'fpg', 'bmi'],
  },
  {
    id: 'lipid_vascular',
    label: '讲血脂与血管',
    organId: 'vascular',
    trendMetric: 'lipid',
    highlightedRowIds: ['tc', 'ldlc'],
  },
  {
    id: 'gastric_digestive',
    label: '讲消化黏膜',
    organId: 'stomach',
    trendMetric: 'weight_score',
    highlightedRowIds: ['fpg', 'bmi'],
  },
];

export type DeltaTrendSemantic = 'improving' | 'stable' | 'worsening' | 'gap_to_target';

export interface BiomarkerComparisonRow {
  id: 'sbp' | 'dbp' | 'liver_fat' | 'tc' | 'ldlc' | 'fpg' | 'bmi';
  label: string;
  shortLabel: string;
  unit: string;
  relatedOrgan: OrganId;
  currentValue: number;
  referenceValue: number;
  currentDisplay: string;
  referenceDisplay: string;
  delta: number;
  deltaDisplay: string;
  clinicalRangeLabel: string;
  severity: HealthSeverity;
  semantic: DeltaTrendSemantic;
  /** Legacy bullet bar [0..100] coordinates */
  safeStartPct: number;
  safeEndPct: number;
  currentPct: number;
  referencePct: number;
  /** Standardized 3-zone Traffic-Light Progress [0..100]: [0..33.3]=红区超标, [33.3..66.7]=黄区偏高, [66.7..100]=绿区达标 */
  trafficLightCurrentPct: number;
  trafficLightReferencePct: number;
  referenceSeverity: HealthSeverity;
  statusText: '已达标' | '偏高' | '超标';
  percentDelta: number;
}

export interface TrafficLightDomain {
  safeMin: number;
  safeMax: number;
  alertThreshold: number;
  severeCap: number;
  idealCenter: number;
}

/**
 * Maps a clinical biomarker value onto a standardized 3-zone horizontal Traffic-Light Track [0..100]:
 * - [0 .. 33.3]: Red Zone (明显超标) — higher/worse values sit near left, moving right as they improve
 * - [33.3 .. 66.7]: Amber Zone (轻度偏高) — caution values approaching clinical normal
 * - [66.7 .. 100]: Green Zone (理想达标) — clinically normal values inside [safeMin, safeMax]
 */
export function computeTrafficLightProgress(
  val: number,
  domain: TrafficLightDomain
): {
  pct: number;
  severity: HealthSeverity;
  statusText: '已达标' | '偏高' | '超标';
} {
  const { safeMin, safeMax, alertThreshold, severeCap, idealCenter } = domain;

  if (val >= alertThreshold) {
    const span = Math.max(0.1, severeCap - alertThreshold);
    const ratio = Math.min(1, Math.max(0, (severeCap - val) / span));
    const pct = 5 + ratio * 26.5; // [5 .. 31.5] inside Red Zone (0..33.3)
    return {
      pct: Number(pct.toFixed(1)),
      severity: 'alert',
      statusText: '超标',
    };
  }

  if (val > safeMax) {
    const span = Math.max(0.05, alertThreshold - safeMax);
    const ratio = Math.min(1, Math.max(0, (alertThreshold - val) / span));
    const pct = 35.5 + ratio * 29; // [35.5 .. 64.5] inside Amber Zone (33.3..66.7)
    return {
      pct: Number(pct.toFixed(1)),
      severity: 'caution',
      statusText: '偏高',
    };
  }

  if (val < safeMin) {
    return {
      pct: 50,
      severity: 'caution',
      statusText: '偏高',
    };
  }

  // Clinically normal: map [safeMax .. idealCenter] smoothly into Green Zone [69 .. 93]
  const greenSpan = Math.max(0.1, safeMax - idealCenter);
  const closeness = Math.min(1, Math.max(0, (safeMax - val) / greenSpan));
  const pct = 70 + closeness * 22;
  return {
    pct: Number(Math.min(95, Math.max(69, pct)).toFixed(1)),
    severity: 'normal',
    statusText: '已达标',
  };
}

export interface SystemDualRadarItem {
  organId: OrganId;
  name: string;
  systemName: string;
  currentScore: number;
  referenceScore: number;
  deltaScore: number;
  severity: HealthSeverity;
}

export interface CourseComparisonMeta {
  activeCourse: TreatmentCourseRecord;
  referenceCourse: TreatmentCourseRecord | null;
  isTargetMode: boolean;
  weightDeltaKg: number;
  adherencePercent: number;
  focusRegimenSummary: string;
  keyPrescriptions: string[];
  doctorCourseNote: string;
  activeEvaluation: DerivedClinicalEvaluation;
}

export interface ClinicalComparisonResult {
  mode: ComparisonBaselineMode;
  currentLabel: string;
  currentDate: string;
  referenceLabel: string;
  referenceDate: string;
  currentScore: number;
  referenceScore: number;
  scoreDelta: number;
  currentAbnormalCount: number;
  referenceAbnormalCount: number;
  improvedCount: number;
  biomarkerRows: BiomarkerComparisonRow[];
  radarSystems: SystemDualRadarItem[];
  courseMeta?: CourseComparisonMeta;
}

export interface DoctorTalkingBrief {
  headline: string;
  organTag: string;
  plainMechanism: string;
  comparisonTakeaway: string;
  actionExpectation: string;
  linkedTaskTitle: string | null;
}

function clampPct(val: number, minScale: number, maxScale: number): number {
  if (maxScale <= minScale) return 50;
  const raw = ((val - minScale) / (maxScale - minScale)) * 100;
  return Math.min(96, Math.max(4, Number(raw.toFixed(1))));
}

function formatSigned(val: number, decimals: number): string {
  const rounded = Number(val.toFixed(decimals));
  if (Math.abs(rounded) < 1e-6) return '0';
  const str = decimals === 0 ? String(Math.round(rounded)) : rounded.toFixed(decimals);
  return rounded > 0 ? `+${str}` : str;
}

/**
 * Resolves the comparison baseline snapshot (earliest baseline report, immediate previous report,
 * or 12-week evidence-based clinical remission target).
 */
export function resolveComparisonReference(
  state: ClinicalClosedLoopState,
  mode: ComparisonBaselineMode
): {
  label: string;
  date: string;
  metrics: LabMetricsSnapshot;
  weightKg: number;
} {
  const reports = state.reports;
  const activeIdx = Math.max(
    0,
    reports.findIndex((r) => r.id === state.activeReportId)
  );
  const activeRep = reports[activeIdx] ?? reports[reports.length - 1];
  const currentWeight = activeRep?.weightKg ?? state.patientProfile.weightKg;

  if (mode === 'target_12w') {
    const heightM = Math.max(0.5, state.patientProfile.heightCm / 100);
    const idealWeight = Number(Math.min(currentWeight, 22.2 * heightM * heightM).toFixed(1));
    return {
      label: '12周干预目标值',
      date: state.publication.nextFollowupDate || '12周预期',
      weightKg: idealWeight,
      metrics: {
        systolicBp: 126,
        diastolicBp: 80,
        heartRate: 70,
        fastingGlucose: 5.0,
        totalCholesterol: 4.9,
        ldlCholesterol: 3.0,
        liverFatPercent: 4.6,
        gastricStatus: 'normal',
      },
    };
  }

  if (mode === 'prev_report') {
    const prevRep =
      state.followupRechecks.length > 0
        ? activeRep
        : activeIdx > 0
        ? reports[activeIdx - 1]
        : reports[0];
    return {
      label: `上期随访 (${prevRep.monthLabel})`,
      date: prevRep.reportDate,
      metrics: prevRep.metrics,
      weightKg: prevRep.weightKg ?? state.patientProfile.weightKg,
    };
  }

  // Default: 'first_baseline'
  const firstRep = reports[0];
  return {
    label: `初诊基线 (${firstRep.monthLabel})`,
    date: firstRep.reportDate,
    metrics: firstRep.metrics,
    weightKg: firstRep.weightKg ?? state.patientProfile.weightKg,
  };
}

/**
 * Computes full multi-period clinical comparison metrics, bullet-gauge coordinates,
 * and 8-organ dual-radar scores for widescreen doctor-patient explanation.
 */
export function computeClinicalComparison(
  state: ClinicalClosedLoopState,
  mode: ComparisonBaselineMode
): ClinicalComparisonResult {
  const currentLab = getEffectiveLabMetrics(state);
  const currentEval = deriveClinicalEvaluation(
    state.patientProfile,
    currentLab.metrics,
    currentLab.effectiveWeightKg,
    state.draftOrPublishedTasks
  );

  const refSource = resolveComparisonReference(state, mode);
  const refEval = deriveClinicalEvaluation(
    state.patientProfile,
    refSource.metrics,
    refSource.weightKg,
    []
  );

  const curBmi = computeBmi(currentLab.effectiveWeightKg, state.patientProfile.heightCm);
  const refBmi = computeBmi(refSource.weightKg, state.patientProfile.heightCm);

  const specs: Array<{
    id: BiomarkerComparisonRow['id'];
    label: string;
    shortLabel: string;
    unit: string;
    relatedOrgan: OrganId;
    cur: number;
    ref: number;
    decimals: number;
    rangeLabel: string;
    minScale: number;
    maxScale: number;
    safeMin: number;
    safeMax: number;
    alertThreshold: number;
    idealCenter: number;
    severity: HealthSeverity;
  }> = [
    {
      id: 'sbp',
      label: '收缩压 SBP',
      shortLabel: '收缩压',
      unit: 'mmHg',
      relatedOrgan: 'heart',
      cur: currentLab.metrics.systolicBp,
      ref: refSource.metrics.systolicBp,
      decimals: 0,
      rangeLabel: '90–129',
      minScale: 95,
      maxScale: 168,
      safeMin: 90,
      safeMax: 129,
      alertThreshold: 140,
      idealCenter: 118,
      severity:
        currentLab.metrics.systolicBp >= 140
          ? 'alert'
          : currentLab.metrics.systolicBp >= 130
          ? 'caution'
          : 'normal',
    },
    {
      id: 'dbp',
      label: '舒张压 DBP',
      shortLabel: '舒张压',
      unit: 'mmHg',
      relatedOrgan: 'heart',
      cur: currentLab.metrics.diastolicBp,
      ref: refSource.metrics.diastolicBp,
      decimals: 0,
      rangeLabel: '60–84',
      minScale: 60,
      maxScale: 108,
      safeMin: 60,
      safeMax: 84,
      alertThreshold: 90,
      idealCenter: 75,
      severity:
        currentLab.metrics.diastolicBp >= 90
          ? 'alert'
          : currentLab.metrics.diastolicBp >= 85
          ? 'caution'
          : 'normal',
    },
    {
      id: 'liver_fat',
      label: '肝脂肪含量 MRI-PDFF',
      shortLabel: '肝脂肪率',
      unit: '%',
      relatedOrgan: 'liver',
      cur: currentLab.metrics.liverFatPercent,
      ref: refSource.metrics.liverFatPercent,
      decimals: 1,
      rangeLabel: '< 5.0%',
      minScale: 1.5,
      maxScale: 16.0,
      safeMin: 1.0,
      safeMax: 4.99,
      alertThreshold: 10.0,
      idealCenter: 3.6,
      severity:
        currentLab.metrics.liverFatPercent >= 10.0
          ? 'alert'
          : currentLab.metrics.liverFatPercent >= 5.0
          ? 'caution'
          : 'normal',
    },
    {
      id: 'tc',
      label: '总胆固醇 TC',
      shortLabel: '总胆固醇',
      unit: 'mmol/L',
      relatedOrgan: 'vascular',
      cur: currentLab.metrics.totalCholesterol,
      ref: refSource.metrics.totalCholesterol,
      decimals: 1,
      rangeLabel: '< 5.2',
      minScale: 3.2,
      maxScale: 7.2,
      safeMin: 2.8,
      safeMax: 5.19,
      alertThreshold: 6.2,
      idealCenter: 4.4,
      severity:
        currentLab.metrics.totalCholesterol >= 6.2
          ? 'alert'
          : currentLab.metrics.totalCholesterol >= 5.2
          ? 'caution'
          : 'normal',
    },
    {
      id: 'ldlc',
      label: '低密度脂蛋白 LDL-C',
      shortLabel: 'LDL-C',
      unit: 'mmol/L',
      relatedOrgan: 'vascular',
      cur: currentLab.metrics.ldlCholesterol,
      ref: refSource.metrics.ldlCholesterol,
      decimals: 1,
      rangeLabel: '< 3.4',
      minScale: 1.8,
      maxScale: 4.9,
      safeMin: 1.5,
      safeMax: 3.39,
      alertThreshold: 4.1,
      idealCenter: 2.5,
      severity:
        currentLab.metrics.ldlCholesterol >= 4.1
          ? 'alert'
          : currentLab.metrics.ldlCholesterol >= 3.4
          ? 'caution'
          : 'normal',
    },
    {
      id: 'fpg',
      label: '空腹血糖 FPG',
      shortLabel: '空腹血糖',
      unit: 'mmol/L',
      relatedOrgan: 'stomach',
      cur: currentLab.metrics.fastingGlucose,
      ref: refSource.metrics.fastingGlucose,
      decimals: 1,
      rangeLabel: '3.9–6.1',
      minScale: 3.6,
      maxScale: 7.8,
      safeMin: 3.9,
      safeMax: 6.09,
      alertThreshold: 7.0,
      idealCenter: 5.0,
      severity:
        currentLab.metrics.fastingGlucose >= 7.0
          ? 'alert'
          : currentLab.metrics.fastingGlucose >= 6.1
          ? 'caution'
          : 'normal',
    },
    {
      id: 'bmi',
      label: '体重指数 BMI',
      shortLabel: '体重指数',
      unit: 'kg/m²',
      relatedOrgan: 'liver',
      cur: curBmi,
      ref: refBmi,
      decimals: 1,
      rangeLabel: '18.5–23.9',
      minScale: 17.5,
      maxScale: 30.0,
      safeMin: 18.5,
      safeMax: 23.9,
      alertThreshold: 27.5,
      idealCenter: 21.8,
      severity: curBmi >= 27.5 ? 'alert' : curBmi > 23.9 ? 'caution' : 'normal',
    },
  ];

  let improvedCount = 0;

  const biomarkerRows: BiomarkerComparisonRow[] = specs.map((s) => {
    const rawDelta = Number((s.cur - s.ref).toFixed(s.decimals));
    let semantic: DeltaTrendSemantic = 'stable';

    if (mode === 'target_12w') {
      semantic = s.severity === 'normal' ? 'improving' : 'gap_to_target';
    } else {
      const curDist = Math.abs(s.cur - s.idealCenter);
      const refDist = Math.abs(s.ref - s.idealCenter);
      if (Math.abs(rawDelta) < (s.decimals === 0 ? 1 : 0.08)) {
        semantic = 'stable';
      } else if (curDist < refDist) {
        semantic = 'improving';
        improvedCount += 1;
      } else {
        semantic = 'worsening';
      }
    }

    const tlDomain: TrafficLightDomain = {
      safeMin: s.safeMin,
      safeMax: s.safeMax,
      alertThreshold: s.alertThreshold,
      severeCap: s.maxScale,
      idealCenter: s.idealCenter,
    };
    const curTl = computeTrafficLightProgress(s.cur, tlDomain);
    const refTl = computeTrafficLightProgress(s.ref, tlDomain);
    const percentDelta =
      Math.abs(s.ref) > 1e-6
        ? Number((((s.cur - s.ref) / s.ref) * 100).toFixed(1))
        : 0;

    return {
      id: s.id,
      label: s.label,
      shortLabel: s.shortLabel,
      unit: s.unit,
      relatedOrgan: s.relatedOrgan,
      currentValue: s.cur,
      referenceValue: s.ref,
      currentDisplay: s.decimals === 0 ? String(Math.round(s.cur)) : s.cur.toFixed(s.decimals),
      referenceDisplay: s.decimals === 0 ? String(Math.round(s.ref)) : s.ref.toFixed(s.decimals),
      delta: rawDelta,
      deltaDisplay: formatSigned(rawDelta, s.decimals),
      clinicalRangeLabel: s.rangeLabel,
      severity: curTl.severity,
      semantic,
      safeStartPct: Math.max(0, Math.min(100, ((s.safeMin - s.minScale) / (s.maxScale - s.minScale)) * 100)),
      safeEndPct: Math.max(0, Math.min(100, ((s.safeMax - s.minScale) / (s.maxScale - s.minScale)) * 100)),
      currentPct: clampPct(s.cur, s.minScale, s.maxScale),
      referencePct: clampPct(s.ref, s.minScale, s.maxScale),
      trafficLightCurrentPct: curTl.pct,
      trafficLightReferencePct: refTl.pct,
      referenceSeverity: refTl.severity,
      statusText: curTl.statusText,
      percentDelta,
    };
  });

  const radarSystems: SystemDualRadarItem[] = ORGAN_ORDER.map((id) => {
    const curOrg = currentEval.organRecords[id];
    const refOrg = refEval.organRecords[id];
    return {
      organId: id,
      name: curOrg.name,
      systemName: curOrg.systemName,
      currentScore: curOrg.score,
      referenceScore: refOrg.score,
      deltaScore: curOrg.score - refOrg.score,
      severity: curOrg.severity,
    };
  });

  const currentAbnormalCount = biomarkerRows.filter((r) => r.severity !== 'normal').length;
  const referenceAbnormalCount = specs.filter((s) => s.ref < s.safeMin || s.ref > s.safeMax).length;

  return {
    mode,
    currentLabel:
      state.followupRechecks.length > 0 ? '最新复查实测' : '本期体检实测',
    currentDate: currentLab.effectiveDate,
    referenceLabel: refSource.label,
    referenceDate: refSource.date,
    currentScore: currentEval.healthScore,
    referenceScore: refEval.healthScore,
    scoreDelta: currentEval.healthScore - refEval.healthScore,
    currentAbnormalCount,
    referenceAbnormalCount,
    improvedCount,
    biomarkerRows,
    radarSystems,
  };
}

/**
 * Computes head-to-head quantitative comparison between any two Treatment Courses (`疗程`)
 * of a patient, or between an active course and its completion clinical target (`target_course_end`).
 */
export function computeCourseComparison(
  patient: PatientCohortRecord,
  activeCourseId?: string,
  compareCourseId?: string
): ClinicalComparisonResult {
  const courses = patient.courses;
  const profile = patient.clinicalState.patientProfile;
  const targetCourseId = activeCourseId ?? patient.activeCourseId;
  const refCourseId = compareCourseId ?? patient.compareCourseId;

  const activeCourse =
    courses.find((c) => c.id === targetCourseId) ?? courses[courses.length - 1];

  const isTargetMode = refCourseId === 'target_course_end';
  let refMetrics: LabMetricsSnapshot;
  let refWeightKg: number;
  let refLabel: string;
  let refDate: string;
  let referenceCourse: TreatmentCourseRecord | null = null;
  let mode: ComparisonBaselineMode = 'first_baseline';

  if (isTargetMode) {
    mode = 'target_12w';
    const heightM = Math.max(0.5, profile.heightCm / 100);
    refWeightKg = Number(Math.min(activeCourse.weightKg, 22.2 * heightM * heightM).toFixed(1));
    refLabel = `${activeCourse.courseLabel}结案目标`;
    refDate = activeCourse.endDate || `${activeCourse.cycleWeeks || 12}周预期`;
    refMetrics = {
      systolicBp: Math.min(activeCourse.metrics.systolicBp, 126),
      diastolicBp: Math.min(activeCourse.metrics.diastolicBp, 80),
      heartRate: 70,
      fastingGlucose: Math.min(activeCourse.metrics.fastingGlucose, 5.0),
      totalCholesterol: Math.min(activeCourse.metrics.totalCholesterol, 4.9),
      ldlCholesterol: Math.min(activeCourse.metrics.ldlCholesterol, 3.0),
      liverFatPercent: Math.min(activeCourse.metrics.liverFatPercent, 4.6),
      gastricStatus: 'normal',
    };
  } else {
    const foundRef =
      courses.find((c) => c.id === refCourseId) ?? courses[0];
    referenceCourse = foundRef;
    mode = foundRef.courseNo === 0 ? 'first_baseline' : 'prev_report';
    refMetrics = foundRef.metrics;
    refWeightKg = foundRef.weightKg;
    refLabel =
      foundRef.courseNo === 0
        ? '初诊基线'
        : `${foundRef.courseLabel}(${foundRef.status === 'active' ? '当前' : '结案'})`;
    refDate = foundRef.endDate;
  }

  // Synthesize a temporary ClinicalClosedLoopState representing activeCourse vs refMetrics
  const syntheticState: ClinicalClosedLoopState = {
    ...patient.clinicalState,
    reports: [
      {
        id: 'ref-course-snap',
        reportDate: refDate,
        monthLabel: refLabel,
        institution: '健康4S 疗程评估中心',
        packageName: refLabel,
        verificationStatus: 'verified',
        doctorVerificationNote: '',
        weightKg: refWeightKg,
        metrics: refMetrics,
      },
      {
        id: 'cur-course-snap',
        reportDate: activeCourse.endDate,
        monthLabel: activeCourse.courseLabel,
        institution: '健康4S 疗程评估中心',
        packageName: activeCourse.stageTitle,
        verificationStatus: 'verified',
        doctorVerificationNote: activeCourse.doctorCourseNote,
        weightKg: activeCourse.weightKg,
        metrics: activeCourse.metrics,
      },
    ],
    activeReportId: 'cur-course-snap',
    followupRechecks: [],
  };

  const baseComparison = computeClinicalComparison(
    syntheticState,
    isTargetMode ? 'target_12w' : 'first_baseline'
  );

  const activeEvaluation = deriveClinicalEvaluation(
    profile,
    activeCourse.metrics,
    activeCourse.weightKg,
    activeCourse.status === 'active' ? patient.clinicalState.draftOrPublishedTasks : []
  );

  return {
    ...baseComparison,
    mode,
    currentLabel:
      activeCourse.courseNo === 0
        ? '初诊基线'
        : `${activeCourse.courseLabel} · ${activeCourse.stageTitle}`,
    currentDate:
      activeCourse.courseNo === 0
        ? activeCourse.startDate
        : `${activeCourse.courseLabel}（${activeCourse.elapsedWeeks}/${activeCourse.cycleWeeks}周）`,
    referenceLabel: refLabel,
    referenceDate: refDate,
    courseMeta: {
      activeCourse,
      referenceCourse,
      isTargetMode,
      weightDeltaKg: Number((activeCourse.weightKg - refWeightKg).toFixed(1)),
      adherencePercent: activeCourse.adherencePercent,
      focusRegimenSummary: activeCourse.focusRegimenSummary,
      keyPrescriptions: activeCourse.keyPrescriptions,
      doctorCourseNote: activeCourse.doctorCourseNote,
      activeEvaluation,
    },
  };
}

/**
 * Computes SVG polygon coordinate string for an N-axis clinical system radar chart.
 * Scale maps score [50..100] onto radius [18%..100%] of maxRadius so deltas are visually legible.
 */
export function computeRadarPolygonPoints(
  scores: ReadonlyArray<number>,
  cx: number,
  cy: number,
  maxRadius: number
): string {
  const n = scores.length;
  if (n === 0) return '';
  return scores
    .map((score, i) => {
      const clamped = Math.min(100, Math.max(50, score));
      const norm = 0.18 + ((clamped - 50) / 50) * 0.82;
      const r = norm * maxRadius;
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Generates plain-language doctor-to-patient talking points synchronized with the selected 3D organ
 * and active multi-period comparison mode.
 */
export function buildDoctorConsultationBrief(
  selectedOrgan: OrganId | null,
  comparison: ClinicalComparisonResult,
  profile: PatientProfile,
  tasks: ReadonlyArray<{ title: string; relatedOrgan: OrganId }>
): DoctorTalkingBrief {
  const byId = Object.fromEntries(comparison.biomarkerRows.map((r) => [r.id, r]));
  const sbp = byId.sbp;
  const dbp = byId.dbp;
  const liverFat = byId.liver_fat;
  const tc = byId.tc;
  const ldlc = byId.ldlc;
  const isTargetMode = comparison.mode === 'target_12w';

  if (!selectedOrgan) {
    return {
      headline: `${profile.name} 全身多期对比总评`,
      organTag: '心·肝·血管 代谢联动轴',
      plainMechanism:
        '大脑、肺、肾与骨骼基础功能均在 87–94 分优良区间；当前核心矛盾集中在「轻度脂肪肝—血脂偏高—血压临界」这一同源代谢链条。',
      comparisonTakeaway: isTargetMode
        ? `当前综合健康分 ${comparison.currentScore} 分，距 12 周干预目标（${comparison.referenceScore} 分）仍有 ${Math.abs(comparison.scoreDelta)} 分提升空间，核心在于把收缩压压回 130 以内、肝脂肪率降到 5% 以下。`
        : `对比${comparison.referenceLabel}，综合评分已由 ${comparison.referenceScore} 分稳步提升至 ${comparison.currentScore} 分（${formatSigned(comparison.scoreDelta, 0)} 分），共有 ${comparison.improvedCount} 项关键指标持续向好。`,
      actionExpectation:
        '无需过度焦虑，目前处于非药物生活方式干预的黄金可逆窗口期；点击左侧雷达或右侧任一异常指标即可在 3D 人体定位对应器官逐项拆解。',
      linkedTaskTitle: tasks[0]?.title ?? null,
    };
  }

  const matchedTask = tasks.find((t) => t.relatedOrgan === selectedOrgan)?.title ?? null;

  switch (selectedOrgan) {
    case 'heart':
      return {
        headline: '心血管与血压负荷解读',
        organTag: '心脏 · 动脉后负荷',
        plainMechanism: `血管好比有弹性的输水管道，当前实测血压 ${sbp.currentDisplay}/${dbp.currentDisplay} mmHg 略高于 <130/85 安全线，意味着心脏每次搏动需要克服更大的外周阻力。`,
        comparisonTakeaway: isTargetMode
          ? `距离 12 周理想控制靶值（126/80 mmHg）还需下调 ${Math.max(0, Math.round(sbp.currentValue - 126))}/${Math.max(0, Math.round(dbp.currentValue - 80))} mmHg。`
          : `对比${comparison.referenceLabel}（${sbp.referenceDisplay}/${dbp.referenceDisplay} mmHg），血压已变化 ${sbp.deltaDisplay}/${dbp.deltaDisplay} mmHg，血管张力正在逐步缓和。`,
        actionExpectation:
          '坚持每日限盐 <5g（DASH低钠膳食）配合睡前慢呼吸减压，预计 8–12 周可将静息血压平稳拉回安全绿区。',
        linkedTaskTitle: matchedTask,
      };

    case 'liver':
      return {
        headline: '肝脏脂肪浸润与代谢逆转解读',
        organTag: '肝脏 · 定量超声 MRI-PDFF',
        plainMechanism: `正常肝脏脂肪占比应低于 5.0%，当前实测 ${liverFat.currentDisplay}%，好比肝细胞内暂存了过多能量脂滴，但转氨酶正常、尚未引发肝细胞实质损伤。`,
        comparisonTakeaway: isTargetMode
          ? `距离逆转脂肪肝红线（<5.0%）还需净减肝脂约 ${Math.max(0, liverFat.currentValue - 4.6).toFixed(1)} 个百分点。`
          : `对比${comparison.referenceLabel}（${liverFat.referenceDisplay}%），肝脂肪含量已变化 ${liverFat.deltaDisplay}%，证明前期控糖与减重已在肝脏层面生效。`,
        actionExpectation:
          '只要在未来 12 周继续减重 2.5–3.5 kg（每周 5 次 × 35 分钟中等强度有氧），肝内多余脂滴可完全代谢清除。',
        linkedTaskTitle: matchedTask,
      };

    case 'vascular':
      return {
        headline: '血脂谱与外周动脉弹性解读',
        organTag: '外周血管 · 脂质清除',
        plainMechanism: `总胆固醇 ${tc.currentDisplay} mmol/L、低密度脂蛋白 ${ldlc.currentDisplay} mmol/L 偏高，血液中多余脂蛋白若长期滞留易在血管内壁形成微沉积。`,
        comparisonTakeaway: isTargetMode
          ? `12 周目标是将总胆固醇控制在 <5.2 mmol/L、LDL-C 控制在 <3.4 mmol/L。`
          : `对比${comparison.referenceLabel}（TC ${tc.referenceDisplay} / LDL-C ${ldlc.referenceDisplay}），血脂水平变化 ${tc.deltaDisplay} / ${ldlc.deltaDisplay} mmol/L。`,
        actionExpectation:
          '每周用 2 次深海鱼替代红肉、主食替换 1/3 为燕麦杂豆，可显著提升肝脏对低密度脂蛋白的清除效率。',
        linkedTaskTitle: matchedTask,
      };

    case 'stomach':
      return {
        headline: '胃窦黏膜与消化吸收解读',
        organTag: '胃部 · 电子胃镜评估',
        plainMechanism:
          '幽门螺杆菌阴性、无溃疡或息肉，仅胃窦部黏膜见轻度浅表充血，与日常进餐节奏快或咖啡浓茶刺激有关。',
        comparisonTakeaway:
          '消化道结构安全性高（评分 88 分），空腹血糖维持在理想正常区间，无需药物过度干预。',
        actionExpectation:
          '保持三餐定时七分饱、食物温度不超 55℃、睡前 2.5 小时禁食，胃黏膜屏障可自然修复。',
        linkedTaskTitle: matchedTask,
      };

    default: {
      const sysItem = comparison.radarSystems.find((s) => s.organId === selectedOrgan);
      return {
        headline: `${sysItem?.name ?? '器官'}功能储备优良`,
        organTag: `${sysItem?.systemName ?? '系统评估'} · ${sysItem?.currentScore ?? 90}分`,
        plainMechanism:
          '该器官结构形态、血流灌注与功能生化指标均处于健康参考区间内，是全身代谢调理的坚实基础。',
        comparisonTakeaway: `多期随访分值稳定保持在 ${sysItem?.currentScore ?? 90} 分高水平区间，无异常退行性波动。`,
        actionExpectation:
          '维持现有规律作息、均衡饮水与适度力量活动即可，按年度常规体检随访复查。',
        linkedTaskTitle: matchedTask,
      };
    }
  }
}
