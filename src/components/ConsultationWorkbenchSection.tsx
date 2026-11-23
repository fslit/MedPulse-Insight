import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  GitCompareArrows,
  Stethoscope,
} from 'lucide-react';
import { OrganId } from '../utils/healthModel';
import { ClinicalComparisonResult } from '../utils/clinicalComparison';
import { PatientCohortRecord } from '../utils/patientCohort';
import {
  BASELINE_METRIC_SPECS,
  BaselineMetricKey,
  CourseCheckupTimelineEvent,
  HistoricalBaselinePackage,
  buildMilestoneEvolutionMatrix,
  buildPatientTimelineAndBaselines,
  evaluateEventAgainstBaseline,
  getMetricNumericValue,
} from '../utils/courseTimelineBaseline';
import {
  HealthIssueKey,
  IndicatorCourseTrajectory,
  IndicatorKey,
  PatientProblemCourseHierarchy,
} from '../utils/problemCourseAnalytics';
import {
  ConsultationWorkbenchTabId,
  resolvePatientConsultationTabs,
  sanitizeActiveWorkbenchTab,
} from '../utils/consultationWorkbench';
import { OrganIcon } from './OrganIcons';
import { ProblemCourseMatrixSection } from './ProblemCourseMatrixSection';
import { MedicalImagingSection } from './MedicalImagingSection';
import { NebulaExperienceReportSection } from './NebulaExperienceReportSection';
import { CourseRecoveryShowcase } from './CourseRecoveryShowcase';

interface ConsultationWorkbenchSectionProps {
  patient: PatientCohortRecord;
  comparison: ClinicalComparisonResult;
  activeTab: ConsultationWorkbenchTabId;
  onChangeTab: (tabId: ConsultationWorkbenchTabId) => void;
  selectedOrgan: OrganId | null;
  selectedIssueKey: HealthIssueKey | 'all';
  selectedIndicatorKey: IndicatorKey;
  onSelectOrgan: (organId: OrganId) => void;
  onSelectIssueKey: (issueKey: HealthIssueKey | 'all', organId?: OrganId) => void;
  onSelectIndicatorFromMatrix: (ind: IndicatorCourseTrajectory) => void;
  onSelectCourses: (activeCourseId: string, compareCourseId: string) => void;
  onSyncCourseFromShowcase: (courseId: string) => void;
  onSyncNebulaStageCourseNo: (courseNo: number) => void;
  onOpenPatientIn3DWidescreen: (patientId: string, courseId: string) => void;
  onOpenFullCasesPage: () => void;
  onOpenProtocolAtlas: () => void;
  problemCourseHierarchy: PatientProblemCourseHierarchy;
}

const INDICATOR_TO_BASELINE_METRIC: Record<IndicatorKey, BaselineMetricKey> = {
  systolicBp: 'systolicBp',
  diastolicBp: 'diastolicBp',
  heartRate: 'systolicBp',
  liverFatPercent: 'liverFatPercent',
  serumAlt: 'liverFatPercent',
  totalCholesterol: 'totalCholesterol',
  ldlCholesterol: 'ldlCholesterol',
  fastingGlucose: 'fastingGlucose',
  gastricMucosaScore: 'fastingGlucose',
  bmi: 'bmi',
};

const BASELINE_METRIC_TO_ORGAN: Record<BaselineMetricKey, OrganId | null> = {
  healthScore: null,
  systolicBp: 'heart',
  diastolicBp: 'heart',
  liverFatPercent: 'liver',
  totalCholesterol: 'vascular',
  ldlCholesterol: 'vascular',
  fastingGlucose: 'stomach',
  bmi: 'liver',
};

export const ConsultationWorkbenchSection: React.FC<ConsultationWorkbenchSectionProps> = ({
  patient,
  comparison,
  activeTab,
  onChangeTab,
  selectedOrgan,
  selectedIssueKey,
  selectedIndicatorKey,
  onSelectOrgan,
  onSelectIssueKey,
  onSelectIndicatorFromMatrix,
  onSelectCourses,
  onSyncCourseFromShowcase,
  onSyncNebulaStageCourseNo,
  onOpenPatientIn3DWidescreen,
  onOpenFullCasesPage,
  onOpenProtocolAtlas,
  problemCourseHierarchy,
}) => {
  const availableTabs = useMemo(
    () => resolvePatientConsultationTabs(patient),
    [patient]
  );
  const safeActiveTab = sanitizeActiveWorkbenchTab(activeTab, availableTabs);

  useEffect(() => {
    if (safeActiveTab !== activeTab) {
      onChangeTab(safeActiveTab);
    }
  }, [safeActiveTab, activeTab, onChangeTab]);

  const bundle = useMemo(() => buildPatientTimelineAndBaselines(patient), [patient]);

  const [selectedMetric, setSelectedMetric] = useState<BaselineMetricKey>('systolicBp');
  const [matrixDensity, setMatrixDensity] = useState<'key_milestones' | 'all_events'>(
    'key_milestones'
  );
  const [reportCourseFilter, setReportCourseFilter] = useState<number | 'all'>('all');
  const [archiveRightTab, setArchiveRightTab] = useState<'systems_delta' | 'imaging'>(
    'systems_delta'
  );
  const [inspectedEventId, setInspectedEventId] = useState<string>('');

  // Keep chart metric synced when clinician clicks an organ/indicator on the 3D Hero Stage
  useEffect(() => {
    const mapped = INDICATOR_TO_BASELINE_METRIC[selectedIndicatorKey];
    if (mapped) {
      setSelectedMetric(mapped);
    }
  }, [selectedIndicatorKey]);

  // Derive the locked Baseline Package directly from the Global Top Controller's compareCourseId
  const activeBaselinePkg: HistoricalBaselinePackage = useMemo(() => {
    const matched = bundle.baselinePackagesAsc.find(
      (b) => b.linkedCourseId === patient.compareCourseId
    );
    return matched ?? bundle.baselinePackagesAsc[0];
  }, [bundle.baselinePackagesAsc, patient.compareCourseId]);

  // Sync inspected timeline event whenever patient or activeCourseId changes in the Global Top Controller
  useEffect(() => {
    const eventsForActiveCourse = bundle.timelineEventsAsc.filter(
      (ev) => ev.courseId === patient.activeCourseId
    );
    const preferred =
      eventsForActiveCourse[eventsForActiveCourse.length - 1] ??
      bundle.timelineEventsDesc[0];
    if (preferred) {
      setInspectedEventId(preferred.id);
    }
    setReportCourseFilter('all');
  }, [patient.id, patient.activeCourseId, bundle]);

  const inspectedEvent: CourseCheckupTimelineEvent = useMemo(
    () =>
      bundle.timelineEventsAsc.find((e) => e.id === inspectedEventId) ??
      bundle.timelineEventsDesc[0],
    [bundle.timelineEventsAsc, bundle.timelineEventsDesc, inspectedEventId]
  );

  const evolutionMatrix = useMemo(
    () =>
      buildMilestoneEvolutionMatrix(
        bundle,
        activeBaselinePkg,
        inspectedEvent,
        matrixDensity
      ),
    [bundle, activeBaselinePkg, inspectedEvent, matrixDensity]
  );

  const activeMetricSpec = useMemo(
    () =>
      BASELINE_METRIC_SPECS.find((m) => m.key === selectedMetric) ?? BASELINE_METRIC_SPECS[1],
    [selectedMetric]
  );

  const inspectedMetricDelta = useMemo(
    () => evaluateEventAgainstBaseline(inspectedEvent, activeBaselinePkg, selectedMetric),
    [inspectedEvent, activeBaselinePkg, selectedMetric]
  );

  const filteredEventsDesc = useMemo(
    () =>
      reportCourseFilter === 'all'
        ? bundle.timelineEventsDesc
        : bundle.timelineEventsDesc.filter((ev) => ev.courseNo === reportCourseFilter),
    [bundle.timelineEventsDesc, reportCourseFilter]
  );

  const handleSelectReportEvent = (ev: CourseCheckupTimelineEvent) => {
    setInspectedEventId(ev.id);
    const latestCourse = patient.courses[patient.courses.length - 1];
    const nextCourseId =
      ev.courseId === patient.compareCourseId && patient.courses.length > 1
        ? latestCourse.id
        : ev.courseId;
    onSelectCourses(nextCourseId, patient.compareCourseId);
  };

  const handleSelectChartMetric = (key: BaselineMetricKey) => {
    setSelectedMetric(key);
    const organ = BASELINE_METRIC_TO_ORGAN[key];
    if (organ) {
      onSelectOrgan(organ);
    }
  };

  // Single Unified Longitudinal Trend Chart Geometry
  const chartGeometry = useMemo(() => {
    const pts = bundle.timelineEventsAsc;
    const width = 580;
    const height = 220;
    const padLeft = 42;
    const padRight = 22;
    const padTop = 28;
    const padBottom = 36;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const values = pts.map((e) => getMetricNumericValue(e, selectedMetric));
    const baseVal = getMetricNumericValue(activeBaselinePkg, selectedMetric);
    const normalBoundary =
      activeMetricSpec.polarity === 'higher_better'
        ? activeMetricSpec.safeMin
        : activeMetricSpec.safeMax;

    const allVals = [...values, baseVal, normalBoundary];
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const spread = Math.max(rawMax - rawMin, activeMetricSpec.decimals === 0 ? 8 : 1.4);
    const yMin = rawMin - spread * 0.18;
    const yMax = rawMax + spread * 0.22;

    const toY = (v: number) =>
      Math.max(padTop, Math.min(padTop + plotH, padTop + ((yMax - v) / (yMax - yMin)) * plotH));
    const toX = (idx: number) =>
      pts.length <= 1 ? padLeft + plotW / 2 : padLeft + (idx / (pts.length - 1)) * plotW;

    const baselineY = toY(baseVal);
    const safeTopVal =
      activeMetricSpec.polarity === 'higher_better' ? yMax : activeMetricSpec.safeMax;
    const safeBottomVal =
      activeMetricSpec.polarity === 'higher_better' ? activeMetricSpec.safeMin : yMin;
    const safeRectY1 = toY(safeTopVal);
    const safeRectY2 = toY(safeBottomVal);
    const safeBandTop = Math.min(safeRectY1, safeRectY2);
    const safeBandHeight = Math.max(0, Math.abs(safeRectY2 - safeRectY1));

    const coords = pts.map((ev, idx) => {
      const val = getMetricNumericValue(ev, selectedMetric);
      const deltaObj = evaluateEventAgainstBaseline(ev, activeBaselinePkg, selectedMetric);
      return {
        ev,
        val,
        deltaObj,
        x: toX(idx),
        y: toY(val),
      };
    });

    const courseBands: Array<{
      courseNo: number;
      label: string;
      x1: number;
      x2: number;
    }> = [];
    bundle.courseSpans.forEach((sp) => {
      const matchingIndices = pts
        .map((p, i) => (p.courseNo === sp.courseNo ? i : -1))
        .filter((i) => i >= 0);
      if (matchingIndices.length > 0) {
        const firstIdx = matchingIndices[0];
        const lastIdx = matchingIndices[matchingIndices.length - 1];
        const xStart =
          firstIdx === 0 ? padLeft : (toX(firstIdx - 1) + toX(firstIdx)) / 2;
        const xEnd =
          lastIdx === pts.length - 1
            ? width - padRight
            : (toX(lastIdx) + toX(lastIdx + 1)) / 2;
        courseBands.push({
          courseNo: sp.courseNo,
          label: sp.courseLabel,
          x1: xStart,
          x2: xEnd,
        });
      }
    });

    const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const areaPath =
      coords.length >= 2
        ? `M ${coords[0].x.toFixed(1)},${baselineY.toFixed(1)} ` +
          coords.map((c) => `L ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') +
          ` L ${coords[coords.length - 1].x.toFixed(1)},${baselineY.toFixed(1)} Z`
        : '';

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      plotW,
      plotH,
      baselineY,
      baseVal,
      safeBandTop,
      safeBandHeight,
      courseBands,
      coords,
      polylinePoints,
      areaPath,
    };
  }, [
    bundle.timelineEventsAsc,
    bundle.courseSpans,
    activeBaselinePkg,
    selectedMetric,
    activeMetricSpec,
  ]);

  const activeCourseRecord =
    comparison.courseMeta?.activeCourse ?? patient.courses[patient.courses.length - 1];

  return (
    <section
      id="consultation-workbench-section"
      data-testid="consultation-workbench-section"
      aria-label="分步讲解答疑工作台"
      className="scroll-mt-16 bg-white border border-[#dce5ec] rounded-2xl overflow-hidden"
    >
      {/* =====================================================================
          STEP-BY-STEP CONSULTATION TAB BAR (按门诊讲解顺序切换，告别超长堆叠)
         ===================================================================== */}
      <div className="px-4 sm:px-5 pt-3 border-b border-[#edf2f6] flex flex-col xl:flex-row xl:items-end justify-between gap-2 bg-[#fbfcfd]">
        <div
          role="tablist"
          aria-label="门诊分步讲解答疑页签"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {availableTabs.map((tab) => {
            const isSelected = safeActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-testid={`workbench-tab-${tab.id}`}
                aria-selected={isSelected}
                onClick={() => onChangeTab(tab.id)}
                className={`px-3.5 py-2.5 text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 border-b-[3px] inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-[#0d7a8a] text-[#0d7a8a] font-extrabold bg-white rounded-t-xl'
                    : 'border-transparent text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <span className="font-num text-xs opacity-75">{tab.stepLabel}.</span>
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>

        <div className="pb-2.5 text-xs text-slate-500 font-num whitespace-nowrap shrink-0">
          全局同步口径：
          <strong className="text-amber-800 font-sans mx-1">
            {comparison.referenceLabel}
          </strong>
          <ArrowRight className="w-3 h-3 inline-block text-slate-400 mx-0.5" />
          <strong className="text-[#0d7a8a] font-sans ml-1">
            {activeCourseRecord.courseLabel}
          </strong>
        </div>
      </div>

      {/* =====================================================================
          TAB 01: UNIFIED TREND CHART + CROSS-COURSE EVOLUTION MATRIX TABLE
         ===================================================================== */}
      {safeActiveTab === 'trend_evolution' && (
        <div>
          {/* Top Split: Unified Longitudinal Trend Chart (Left) + Course Milestone Summary & Doctor Note (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.42fr_1fr] divide-y xl:divide-y-0 xl:divide-x divide-[#edf2f6]">
            {/* Left: Single Unified Phase-Segmented Trend Chart */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                    <GitCompareArrows className="w-4 h-4 text-[#0d7a8a] shrink-0" />
                    <span>
                      {activeMetricSpec.label} · 跨疗程基准线（{activeBaselinePkg.code}）与达标绿区趋势图
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-num">
                    琥珀虚线为 {activeBaselinePkg.code} 起点（
                    {activeBaselinePkg.dotDate}） · 绿色色带为临床正常区间（
                    {activeMetricSpec.normalTargetText}）
                  </p>
                </div>
              </div>

              {/* Compact 8-Metric Selector Strip */}
              <div
                role="group"
                aria-label="切换趋势图分析指标"
                className="flex items-center gap-1.5 flex-wrap"
              >
                {BASELINE_METRIC_SPECS.map((m) => {
                  const active = selectedMetric === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleSelectChartMetric(m.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors whitespace-nowrap border ${
                        active
                          ? 'bg-[#0d7a8a] border-[#0d7a8a] text-white font-bold'
                          : 'bg-[#f8fafc] hover:bg-[#eaf5f7] border-[#e2ebf1] text-slate-700 font-medium'
                      }`}
                    >
                      {m.shortLabel}
                    </button>
                  );
                })}
              </div>

              {/* Clean SVG Longitudinal Chart */}
              <div className="rounded-xl bg-[#fbfcfd] border border-[#e5edf2] p-2.5 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                  className="w-full min-w-[480px] h-auto select-none"
                  role="img"
                  aria-label={`${activeMetricSpec.label}跨疗程基准线与达标绿区对比趋势图`}
                >
                  {/* Course Phase Background Bands */}
                  {chartGeometry.courseBands.map((band, idx) => (
                    <g key={band.courseNo}>
                      <rect
                        x={band.x1}
                        y={chartGeometry.padTop}
                        width={Math.max(0, band.x2 - band.x1)}
                        height={chartGeometry.plotH}
                        fill={idx % 2 === 0 ? '#f8fafc' : '#f1f7f9'}
                      />
                      <text
                        x={(band.x1 + band.x2) / 2}
                        y={chartGeometry.padTop - 9}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-slate-500"
                      >
                        {band.label}
                      </text>
                    </g>
                  ))}

                  {/* Shaded Clinical Normal Safe Target Zone */}
                  {chartGeometry.safeBandHeight > 1 && (
                    <g>
                      <rect
                        x={chartGeometry.padLeft}
                        y={chartGeometry.safeBandTop}
                        width={chartGeometry.plotW}
                        height={chartGeometry.safeBandHeight}
                        fill="#dcfce7"
                        fillOpacity="0.65"
                      />
                      <text
                        x={chartGeometry.padLeft + 6}
                        y={Math.max(chartGeometry.padTop + 11, chartGeometry.safeBandTop + 12)}
                        className="text-[9.5px] font-bold fill-emerald-700"
                      >
                        达标绿区 ({activeMetricSpec.normalTargetText})
                      </text>
                    </g>
                  )}

                  {/* Shaded Improvement Area Between Baseline & Curve */}
                  {chartGeometry.areaPath && (
                    <path d={chartGeometry.areaPath} fill="rgba(16, 185, 129, 0.08)" />
                  )}

                  {/* Locked Reference Baseline Horizontal Line */}
                  <line
                    x1={chartGeometry.padLeft}
                    y1={chartGeometry.baselineY}
                    x2={chartGeometry.width - chartGeometry.padRight}
                    y2={chartGeometry.baselineY}
                    stroke="#d97706"
                    strokeWidth="1.8"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={chartGeometry.width - chartGeometry.padRight - 4}
                    y={Math.max(chartGeometry.padTop + 10, chartGeometry.baselineY - 5)}
                    textAnchor="end"
                    className="text-[9.5px] font-bold fill-amber-800"
                  >
                    基准 {activeBaselinePkg.code}：{chartGeometry.baseVal.toFixed(activeMetricSpec.decimals)}
                    {activeMetricSpec.unit}
                  </text>

                  {/* Trajectory Line */}
                  {chartGeometry.coords.length >= 2 && (
                    <polyline
                      fill="none"
                      stroke="#0d7a8a"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartGeometry.polylinePoints}
                    />
                  )}

                  {/* Clickable Checkup Report Milestone Dots */}
                  {chartGeometry.coords.map((pt) => {
                    const isInspected = inspectedEvent.id === pt.ev.id;
                    const isNormal = pt.deltaObj.currentStatus === 'normal';
                    const dotColor = isNormal ? '#16a34a' : '#0d7a8a';

                    return (
                      <g
                        key={pt.ev.id}
                        onClick={() => handleSelectReportEvent(pt.ev)}
                        className="cursor-pointer"
                      >
                        {isInspected && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="9"
                            fill="rgba(13, 122, 138, 0.16)"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isInspected ? 5.2 : 4}
                          fill={dotColor}
                          stroke="#ffffff"
                          strokeWidth="1.8"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 8}
                          textAnchor="middle"
                          className={`text-[10px] font-bold ${
                            isInspected ? 'fill-[#0d7a8a]' : 'fill-slate-700'
                          }`}
                        >
                          {pt.val.toFixed(activeMetricSpec.decimals)}
                        </text>
                        <text
                          x={pt.x}
                          y={chartGeometry.height - 10}
                          textAnchor="middle"
                          className={`text-[9.5px] ${
                            isInspected ? 'font-bold fill-[#0d7a8a]' : 'fill-slate-400'
                          }`}
                        >
                          {pt.ev.dotDate.slice(5)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Right: Focused Milestone Summary & Active Course Clinical Regimen Brief */}
            <div className="p-4 sm:p-5 flex flex-col justify-between gap-3.5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    当前聚焦节点：{inspectedEvent.title}
                  </span>
                  <span className="text-xs font-num text-slate-400">
                    {inspectedEvent.dotDate}
                  </span>
                </div>

                {/* Big Shift Readout for Selected Metric */}
                <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2ebf1] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">
                      {activeMetricSpec.label}（较基线 {activeBaselinePkg.code}）
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5 font-num">
                      <span className="text-base font-bold text-amber-800">
                        {inspectedMetricDelta.baselineValue.toFixed(activeMetricSpec.decimals)}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 self-center" />
                      <span className="text-2xl font-extrabold text-slate-900">
                        {inspectedMetricDelta.currentValue.toFixed(activeMetricSpec.decimals)}
                      </span>
                      <span className="text-xs text-slate-500">{activeMetricSpec.unit}</span>
                    </div>
                  </div>

                  <div className="text-right font-num">
                    <div
                      className={`text-sm font-extrabold ${
                        inspectedMetricDelta.isUnchanged
                          ? 'text-slate-500'
                          : inspectedMetricDelta.isImproved
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {inspectedMetricDelta.intuitiveChangeBadge}
                    </div>
                    <div className="text-[11px] font-sans font-semibold text-slate-600 mt-0.5">
                      {inspectedMetricDelta.transitionBadgeText}
                    </div>
                  </div>
                </div>

                {/* Active Course Regimen & Doctor Note Summary */}
                <div className="space-y-2 text-xs leading-relaxed">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
                    <span>
                      {activeCourseRecord.courseLabel} · {activeCourseRecord.stageTitle}
                    </span>
                  </div>
                  <p className="text-slate-700">
                    <strong className="text-slate-900">阶段执行方案：</strong>
                    {activeCourseRecord.focusRegimenSummary}
                  </p>
                  <p className="text-slate-600">
                    <strong className="text-[#0d7a8a]">主治医师评语：</strong>
                    {activeCourseRecord.doctorCourseNote}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#edf2f6] flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 font-num">
                  下次随访复评：{patient.clinicalState.publication.nextFollowupDate}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeTab('problem_regimen')}
                  className="font-semibold text-[#0d7a8a] hover:text-[#096472] inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span>查看药名与营养品品名明细</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom: Left-to-Right Cross-Course Evolution Matrix Table */}
          <div className="p-4 sm:p-5 border-t border-[#edf2f6] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  历次疗程横向演进对比总表（从左到右看全程变化）
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  首列固定为顶部锁定的对比基线（{activeBaselinePkg.code}），向右依次并列各疗程实测值；点击任意指标行可切换上方趋势曲线
                </p>
              </div>

              <div
                role="group"
                aria-label="切换横向总表列数"
                className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5 shrink-0 self-start sm:self-auto"
              >
                <button
                  type="button"
                  onClick={() => setMatrixDensity('key_milestones')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors whitespace-nowrap ${
                    matrixDensity === 'key_milestones'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  各疗程关键节点 ({bundle.courseSpans.length + 1}列)
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixDensity('all_events')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors whitespace-nowrap ${
                    matrixDensity === 'all_events'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  展开全部中期复查 ({bundle.timelineEventsAsc.length}列)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#e2ebf1] rounded-xl">
              <table className="w-full text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2ebf1] text-slate-600">
                    <th className="py-2.5 px-3 text-left font-bold text-slate-800 whitespace-nowrap">
                      检验指标 / 临床正常值
                    </th>
                    {evolutionMatrix.columns.map((col) => (
                      <th
                        key={col.id}
                        onClick={() => {
                          if (col.eventRef) handleSelectReportEvent(col.eventRef);
                        }}
                        className={`py-2.5 px-3 text-right whitespace-nowrap transition-colors ${
                          col.eventRef ? 'cursor-pointer hover:bg-[#eaf5f7]/60' : ''
                        } ${
                          col.isLockedBaseline
                            ? 'bg-[#fffbeb] text-amber-950'
                            : col.isInspectedReport
                            ? 'bg-[#eaf5f7]/80 text-[#0d7a8a]'
                            : ''
                        }`}
                      >
                        <div className="font-extrabold">{col.headerTitle}</div>
                        <div className="text-[10px] font-num font-normal text-slate-500">
                          {col.subDate} · {col.courseTag}
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3.5 text-right font-bold text-emerald-900 bg-[#f3fcf7] whitespace-nowrap">
                      <div>较基准 ({activeBaselinePkg.code}) 净变化</div>
                      <div className="text-[10px] font-normal text-emerald-700 font-num">
                        对比 {inspectedEvent.shortNodeLabel}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f6] font-num">
                  {evolutionMatrix.rows.map((row) => {
                    const isRowSelected = selectedMetric === row.spec.key;
                    return (
                      <tr
                        key={row.spec.key}
                        onClick={() => handleSelectChartMetric(row.spec.key)}
                        className={`cursor-pointer transition-colors ${
                          isRowSelected ? 'bg-[#f4fbfa]' : 'hover:bg-[#f8fafc]'
                        }`}
                      >
                        <td className="py-2 px-3 font-sans whitespace-nowrap">
                          <div className="font-bold text-slate-900">{row.spec.label}</div>
                          <div className="text-[10px] font-num text-slate-400">
                            正常 {row.spec.normalTargetText} ({row.spec.unit})
                          </div>
                        </td>

                        {row.cells.map((cell) => {
                          const colMeta = evolutionMatrix.columns.find(
                            (c) => c.id === cell.columnId
                          );
                          return (
                            <td
                              key={cell.columnId}
                              className={`py-2 px-3 text-right whitespace-nowrap ${
                                cell.isBaselineOrigin
                                  ? 'bg-[#fffbeb]/65'
                                  : colMeta?.isInspectedReport
                                  ? 'bg-[#eaf5f7]/45'
                                  : ''
                              }`}
                            >
                              <div className="inline-flex items-center justify-end gap-1">
                                {cell.status === 'normal' && (
                                  <CheckCircle2
                                    className="w-3 h-3 text-emerald-600 shrink-0"
                                    aria-label="已达标"
                                  />
                                )}
                                <span
                                  className={`text-sm font-extrabold ${
                                    cell.isBaselineOrigin
                                      ? 'text-amber-900'
                                      : cell.status === 'normal'
                                      ? 'text-emerald-700'
                                      : cell.status === 'alert'
                                      ? 'text-red-600'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {cell.formattedValue}
                                </span>
                              </div>
                              <div
                                className={`text-[10px] ${
                                  cell.isBaselineOrigin
                                    ? 'text-amber-700 font-sans font-semibold'
                                    : cell.isImprovedVsBaseline
                                    ? 'text-emerald-600 font-semibold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {cell.isBaselineOrigin
                                  ? '对比基准原点'
                                  : `${cell.deltaFromBaseline} ${cell.percentFromBaseline}`}
                              </div>
                            </td>
                          );
                        })}

                        <td className="py-2 px-3.5 text-right whitespace-nowrap bg-[#f3fcf7]/60">
                          <div
                            className={`text-xs font-extrabold ${
                              row.overallDelta.isUnchanged
                                ? 'text-slate-500'
                                : row.overallDelta.isImproved
                                ? 'text-emerald-700'
                                : 'text-red-600'
                            }`}
                          >
                            {row.overallDelta.intuitiveChangeBadge}
                          </div>
                          <div className="text-[10px] font-sans font-semibold text-slate-600">
                            {row.overallDelta.transitionBadgeText}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 02: MULTI-PROBLEM × DRUG NAMES & PRODUCT BRAND NAMES MATRIX
         ===================================================================== */}
      {safeActiveTab === 'problem_regimen' && (
        <ProblemCourseMatrixSection
          hierarchy={problemCourseHierarchy}
          selectedIssueKey={selectedIssueKey}
          onSelectIssueKey={onSelectIssueKey}
          selectedIndicatorKey={selectedIndicatorKey}
          onSelectIndicator={(ind) => {
            onSelectIndicatorFromMatrix(ind);
            onChangeTab('trend_evolution');
          }}
          activeWidescreenCourseId={activeCourseRecord.id}
          globalCompareCourseId={patient.compareCourseId}
          hideLocalPeriodControls={true}
          embeddedFlat={true}
          onSelectWidescreenCourses={onSelectCourses}
        />
      )}

      {/* =====================================================================
          TAB 03: PATIENT CHECKUP REPORT TIMELINE & SYSTEM / IMAGING ARCHIVE
         ===================================================================== */}
      {safeActiveTab === 'reports_imaging' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.06fr_1fr] divide-y xl:divide-y-0 xl:divide-x divide-[#edf2f6]">
          {/* Left: Patient's Own Chronological Checkup Reports */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#0d7a8a]" />
                  <span>{patient.clinicalState.patientProfile.name} · 历次检验报告时间线</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  共归档 {bundle.timelineEventsDesc.length} 份本人结构化检验单，点选任一报告可同步上方对比视角
                </p>
              </div>

              <div
                role="group"
                aria-label="按疗程筛选报告单"
                className="flex items-center gap-1 flex-wrap"
              >
                <button
                  type="button"
                  onClick={() => setReportCourseFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    reportCourseFilter === 'all'
                      ? 'bg-[#0d7a8a] text-white font-bold'
                      : 'bg-[#f8fafc] border border-[#dce5ec] text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  全部 ({bundle.timelineEventsDesc.length})
                </button>
                {bundle.courseSpans.map((sp) => (
                  <button
                    key={sp.courseId}
                    type="button"
                    onClick={() => setReportCourseFilter(sp.courseNo)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      reportCourseFilter === sp.courseNo
                        ? 'bg-[#0d7a8a] text-white font-bold'
                        : 'bg-[#f8fafc] border border-[#dce5ec] text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    {sp.courseLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredEventsDesc.map((ev) => {
                const isSelected = inspectedEvent.id === ev.id;
                const bpDelta = evaluateEventAgainstBaseline(
                  ev,
                  activeBaselinePkg,
                  'systolicBp'
                );
                const liverDelta = evaluateEventAgainstBaseline(
                  ev,
                  activeBaselinePkg,
                  'liverFatPercent'
                );

                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => handleSelectReportEvent(ev)}
                    className={`w-full p-3 rounded-xl border text-left transition-colors block ${
                      isSelected
                        ? 'bg-[#f2fafb] border-[#0d7a8a]'
                        : 'bg-white hover:bg-[#f8fafc] border-[#e2ebf1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-bold text-slate-900">{ev.title}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-num">{ev.dotDate}</span>
                        {ev.anchoredBaselineCode && (
                          <span className="text-amber-800 font-num font-bold">
                            基准 {ev.anchoredBaselineCode}
                          </span>
                        )}
                      </div>
                      <span className="font-num font-bold text-[#0d7a8a] whitespace-nowrap">
                        {ev.healthScore}分 · {ev.archiveStatus}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap text-[11px] font-num text-slate-600">
                      <span>
                        血压 {ev.metrics.systolicBp}/{ev.metrics.diastolicBp} mmHg（
                        {bpDelta.isUnchanged ? '持平' : bpDelta.formattedDelta}）
                      </span>
                      <span>
                        肝脂 {ev.metrics.liverFatPercent.toFixed(1)}%（
                        {liverDelta.isUnchanged ? '持平' : liverDelta.formattedDelta}）
                      </span>
                      <span>
                        TC {ev.metrics.totalCholesterol.toFixed(1)} · FPG{' '}
                        {ev.metrics.fastingGlucose.toFixed(1)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: 8-System Score Comparison | Medical Imaging Evidence */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {archiveRightTab === 'systems_delta'
                    ? '八大生理系统分值增减对照'
                    : '检查影像归档与 3D 病灶定位'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {archiveRightTab === 'systems_delta'
                    ? `对比 ${comparison.referenceLabel} 与 ${activeCourseRecord.courseLabel} 各系统得分变化`
                    : '点击任一检查影像结论可自动高亮上方 3D 人体对应器官'}
                </p>
              </div>

              <div
                role="group"
                aria-label="切换系统分值与检查影像"
                className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setArchiveRightTab('systems_delta')}
                  className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    archiveRightTab === 'systems_delta'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  八大系统分值
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveRightTab('imaging')}
                  className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    archiveRightTab === 'imaging'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  检查影像证据
                </button>
              </div>
            </div>

            {archiveRightTab === 'systems_delta' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 pt-1">
                {comparison.radarSystems.map((sys) => {
                  const active = selectedOrgan === sys.organId;
                  const delta = sys.deltaScore;
                  const barColor =
                    sys.severity === 'alert'
                      ? 'bg-red-500'
                      : sys.severity === 'caution'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';

                  return (
                    <button
                      key={sys.organId}
                      type="button"
                      onClick={() => onSelectOrgan(sys.organId)}
                      className={`py-2 px-2.5 -mx-2 rounded-xl text-left transition-colors ${
                        active ? 'bg-[#eaf5f7]/80' : 'hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                          <OrganIcon
                            organId={sys.organId}
                            className="w-3.5 h-3.5 text-[#0d7a8a]"
                          />
                          <span>{sys.systemName}</span>
                        </span>
                        <span className="font-num whitespace-nowrap">
                          <span className="text-slate-400 text-[11px]">
                            {sys.referenceScore}
                          </span>
                          <span className="text-slate-300 mx-1">→</span>
                          <strong className="text-slate-900 font-bold">
                            {sys.currentScore}分
                          </strong>
                          <span
                            className={`ml-1 text-[11px] font-semibold ${
                              comparison.mode === 'target_12w'
                                ? 'text-[#0d7a8a]'
                                : delta > 0
                                ? 'text-emerald-600'
                                : delta < 0
                                ? 'text-red-600'
                                : 'text-slate-400'
                            }`}
                          >
                            ({delta > 0 ? `+${delta}` : delta})
                          </span>
                        </span>
                      </div>

                      <div className="relative h-2 rounded-full bg-[#edf2f6] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all`}
                          style={{ width: `${sys.currentScore}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-900/65"
                          style={{ left: `${Math.min(99, sys.referenceScore)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <MedicalImagingSection onSelectOrgan={onSelectOrgan} embedded={true} />
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 04 (PATIENT-SPECIFIC): OWN 60-PAGE NEBULABYTE YSY D-VALUE REPORT
         ===================================================================== */}
      {safeActiveTab === 'own_nebula_report' && patient.hasNebulaExperienceReport && (
        <NebulaExperienceReportSection
          activePatientId={patient.id}
          activeCourseNo={activeCourseRecord.courseNo}
          selectedOrgan={selectedOrgan}
          onSelectOrganIn3D={onSelectOrgan}
          onSyncStageCourseNo={onSyncNebulaStageCourseNo}
          embeddedFlat={true}
        />
      )}

      {/* =====================================================================
          TAB 04/05 (PATIENT-SPECIFIC): OWN COURSE RECOVERY PHOTO & EXPERIENCE
         ===================================================================== */}
      {safeActiveTab === 'own_recovery_case' && (
        <CourseRecoveryShowcase
          variant="embedded"
          ownCaseOnly={true}
          embeddedFlat={true}
          activePatient={patient}
          inspectedCourseId={activeCourseRecord.id}
          selectedOrgan={selectedOrgan}
          onSyncPatientCourse={onSyncCourseFromShowcase}
          onSelectOrganIn3D={onSelectOrgan}
          onOpenPatientIn3DWidescreen={onOpenPatientIn3DWidescreen}
          onOpenFullCasesPage={onOpenFullCasesPage}
          onOpenProtocolAtlas={onOpenProtocolAtlas}
        />
      )}
    </section>
  );
};
