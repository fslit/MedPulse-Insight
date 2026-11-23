import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  GitCompareArrows,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PatientCohortRecord } from '../utils/patientCohort';
import {
  BASELINE_METRIC_SPECS,
  BaselineMetricKey,
  CourseCheckupTimelineEvent,
  EventBaselineDelta,
  HistoricalBaselinePackage,
  buildMilestoneEvolutionMatrix,
  buildPatientTimelineAndBaselines,
  evaluateEventAgainstBaseline,
  formatBaselineMetricValue,
  getMetricNumericValue,
  summarizeReportVsBaseline,
} from '../utils/courseTimelineBaseline';

interface CourseBaselineTimelineSectionProps {
  patient: PatientCohortRecord;
  /** Currently compared reference course ID from 3D Widescreen */
  widescreenCompareCourseId: string;
  /** Syncs selected course + locked baseline package back to the 3D Widescreen */
  onSyncWidescreenComparison: (activeCourseId: string, compareCourseId: string) => void;
}

export const CourseBaselineTimelineSection: React.FC<CourseBaselineTimelineSectionProps> = ({
  patient,
  widescreenCompareCourseId,
  onSyncWidescreenComparison,
}) => {
  const bundle = useMemo(() => buildPatientTimelineAndBaselines(patient), [patient]);

  const [lockedBaselineCode, setLockedBaselineCode] = useState<string>(() => {
    const matched = bundle.baselinePackagesAsc.find(
      (b) => b.linkedCourseId === widescreenCompareCourseId
    );
    return matched?.code ?? bundle.baselinePackagesAsc[0]?.code ?? 'B001';
  });

  const [expandedBaselineDetail, setExpandedBaselineDetail] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] = useState<BaselineMetricKey>('systolicBp');
  const [matrixDensity, setMatrixDensity] = useState<'key_milestones' | 'all_events'>(
    'key_milestones'
  );
  const [courseFilter, setCourseFilter] = useState<number | 'all'>('all');
  const [inspectedEventId, setInspectedEventId] = useState<string>(
    () => bundle.timelineEventsDesc[0]?.id ?? ''
  );

  useEffect(() => {
    const matched = bundle.baselinePackagesAsc.find(
      (b) => b.linkedCourseId === widescreenCompareCourseId
    );
    if (matched) {
      setLockedBaselineCode(matched.code);
    } else if (bundle.baselinePackagesAsc[0]) {
      setLockedBaselineCode(bundle.baselinePackagesAsc[0].code);
    }
    setCourseFilter('all');
    setExpandedBaselineDetail(false);
    setInspectedEventId(bundle.timelineEventsDesc[0]?.id ?? '');
  }, [patient.id, widescreenCompareCourseId, bundle]);

  const activeBaselinePkg: HistoricalBaselinePackage = useMemo(
    () =>
      bundle.baselinePackagesAsc.find((b) => b.code === lockedBaselineCode) ??
      bundle.baselinePackagesAsc[0],
    [bundle.baselinePackagesAsc, lockedBaselineCode]
  );

  const inspectedEvent: CourseCheckupTimelineEvent = useMemo(
    () =>
      bundle.timelineEventsAsc.find((e) => e.id === inspectedEventId) ??
      bundle.timelineEventsDesc[0],
    [bundle.timelineEventsAsc, bundle.timelineEventsDesc, inspectedEventId]
  );

  const executiveSummary = useMemo(
    () => summarizeReportVsBaseline(inspectedEvent, activeBaselinePkg),
    [inspectedEvent, activeBaselinePkg]
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

  const filteredEventsDesc = useMemo(
    () =>
      courseFilter === 'all'
        ? bundle.timelineEventsDesc
        : bundle.timelineEventsDesc.filter((ev) => ev.courseNo === courseFilter),
    [bundle.timelineEventsDesc, courseFilter]
  );

  const activeMetricSpec = useMemo(
    () =>
      BASELINE_METRIC_SPECS.find((m) => m.key === selectedMetric) ?? BASELINE_METRIC_SPECS[1],
    [selectedMetric]
  );

  const handleLockBaseline = (pkg: HistoricalBaselinePackage) => {
    setLockedBaselineCode(pkg.code);
    const latestCourse = patient.courses[patient.courses.length - 1];
    const nextActiveCourseId =
      patient.activeCourseId === pkg.linkedCourseId ? latestCourse.id : patient.activeCourseId;
    onSyncWidescreenComparison(nextActiveCourseId, pkg.linkedCourseId);
  };

  const handleSelectTimelineEvent = (ev: CourseCheckupTimelineEvent) => {
    setInspectedEventId(ev.id);
    const latestCourse = patient.courses[patient.courses.length - 1];
    const targetCourseId =
      ev.courseId === activeBaselinePkg.linkedCourseId ? latestCourse.id : ev.courseId;
    onSyncWidescreenComparison(targetCourseId, activeBaselinePkg.linkedCourseId);
  };

  // Large Longitudinal Chart Geometry with Clinical Normal Target Band + Locked Baseline Line + Course Bands
  const chartGeometry = useMemo(() => {
    const pts = bundle.timelineEventsAsc;
    const width = 560;
    const height = 224;
    const padLeft = 42;
    const padRight = 22;
    const padTop = 30;
    const padBottom = 38;
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

    // Safe green target zone rectangle inside plot area
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

    // Course phase background bands
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

  const inspectedSelectedMetricDelta: EventBaselineDelta = useMemo(
    () => evaluateEventAgainstBaseline(inspectedEvent, activeBaselinePkg, selectedMetric),
    [inspectedEvent, activeBaselinePkg, selectedMetric]
  );

  return (
    <section
      id="course-baseline-timeline-section"
      data-testid="course-baseline-timeline-section"
      aria-label="基线数据与历次疗程报告直观变化对比舱"
      className="scroll-mt-20 bg-white border border-[#dce5ec] rounded-2xl overflow-hidden"
    >
      {/* =======================================================================
          ZONE 1: TOP HEADER & DUAL-ANCHOR VISUAL SELECTOR (① 选基线 ══▶ ② 选疗程报告)
         ======================================================================= */}
      <div className="p-4 sm:p-5 border-b border-[#edf2f6] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarRange className="w-4 h-4 text-[#0d7a8a] shrink-0" />
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                基线数据 vs 疗程报告 · 直观变化对比舱
              </h2>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-xs font-semibold text-slate-600 font-num">
                正在对比：
                <strong className="text-amber-700 mx-1">
                  {activeBaselinePkg.shortTitle}（{activeBaselinePkg.dotDate}）
                </strong>
                →
                <strong className="text-[#0d7a8a] ml-1">
                  {inspectedEvent.title}（{inspectedEvent.dotDate}）
                </strong>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              先选定左侧「历史基线包（B001/B002）」作为对比原点，再点选右侧任一疗程检查报告，即可通过推进标尺、跨疗程演进表与趋势带直观查看每项指标改善幅度
            </p>
          </div>

          <button
            type="button"
            onClick={() => setExpandedBaselineDetail((prev) => !prev)}
            className="self-start lg:self-auto px-3 py-1.5 rounded-xl bg-[#fffbeb] hover:bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <span>
              {expandedBaselineDetail
                ? `收起 ${activeBaselinePkg.code} 起点原始指标`
                : `查看 ${activeBaselinePkg.code} 起点8项原始指标`}
            </span>
            {expandedBaselineDetail ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Dual-Anchor Strip: Left = Historical Baseline Packages | Right = Course Checkup Milestone Stepper */}
        <div className="grid grid-cols-1 xl:grid-cols-[344px_minmax(0,1fr)] gap-2.5 items-stretch">
          {/* Anchor 1: Historical Baseline Packages (B001 / B002 / B003) */}
          <div className="rounded-xl bg-[#f8fafc] border border-[#e2ebf1] p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>① 对比基线包</span>
              </span>
              <span className="text-[11px] font-num text-slate-500">
                {bundle.baselinePackagesAsc.length} 份已确认
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {bundle.baselinePackagesAsc.map((pkg) => {
                const isLocked = activeBaselinePkg.code === pkg.code;
                return (
                  <button
                    key={pkg.code}
                    type="button"
                    data-testid={`baseline-pkg-${pkg.code}`}
                    aria-pressed={isLocked}
                    onClick={() => handleLockBaseline(pkg)}
                    className={`p-2 rounded-xl border text-left transition-colors ${
                      isLocked
                        ? 'bg-[#fffbeb] border-amber-500 shadow-2xs'
                        : 'bg-white hover:bg-amber-50/40 border-[#dce5ec]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span
                        className={`font-num font-extrabold whitespace-nowrap ${
                          isLocked ? 'text-amber-800' : 'text-slate-800'
                        }`}
                      >
                        {pkg.code}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
                        {isLocked ? '已锁定' : '已确认'}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">
                      {pkg.targetCourseNo === 1 ? '首诊总基线' : `第${pkg.targetCourseNo}疗程起点`}
                    </div>
                    <div className="text-[10px] font-num text-slate-500 mt-0.5 whitespace-nowrap">
                      {pkg.dotDate.slice(2)} · {pkg.healthScore}分
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anchor 2: Per-Course Horizontal Checkup Report Stepper */}
          <div className="rounded-xl bg-[#f8fafc] border border-[#e2ebf1] p-2.5 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
                <span>② 点选要对比的疗程检查报告（按时间线由早到晚）</span>
              </span>
              <span className="text-[11px] font-num text-slate-500">
                共 {bundle.courseSpans.length} 个疗程 · {bundle.timelineEventsAsc.length} 份归档报告
              </span>
            </div>

            <div className="flex items-stretch gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {bundle.courseSpans.map((sp) => {
                const courseEvents = bundle.timelineEventsAsc.filter(
                  (e) => e.courseNo === sp.courseNo
                );
                return (
                  <div
                    key={sp.courseId}
                    className="bg-white border border-[#dce5ec] rounded-xl px-2 py-1.5 shrink-0 space-y-1 flex-1 min-w-fit"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-num">
                      <span className="font-sans font-bold text-slate-800 whitespace-nowrap">
                        {sp.courseLabel}
                      </span>
                      <span className="text-slate-400 whitespace-nowrap">
                        {sp.startDotDate.slice(5)}—{sp.endDotDate.slice(5)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {courseEvents.map((ev) => {
                        const isSelected = inspectedEvent.id === ev.id;
                        const isOrigin = ev.anchoredBaselineCode === activeBaselinePkg.code;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => handleSelectTimelineEvent(ev)}
                            className={`flex-1 px-2 py-1 rounded-lg border text-left transition-colors whitespace-nowrap shrink-0 ${
                              isSelected
                                ? 'bg-[#0d7a8a] border-[#0d7a8a] text-white shadow-2xs'
                                : isOrigin
                                ? 'bg-[#fffbeb] border-amber-400 border-dashed text-amber-900'
                                : 'bg-[#f8fafc] hover:bg-[#eaf5f7] border-[#e2ebf1] text-slate-700'
                            }`}
                          >
                            <div className="text-[11px] font-bold leading-tight">
                              {ev.shortNodeLabel}
                            </div>
                            <div
                              className={`text-[10px] font-num leading-tight mt-0.5 ${
                                isSelected ? 'text-cyan-100' : 'text-slate-500'
                              }`}
                            >
                              {ev.dotDate.slice(5)} · {ev.healthScore}分
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Optional Expandable Raw Baseline Package Snapshot */}
        {expandedBaselineDetail && (
          <div className="rounded-xl bg-[#fffbeb]/70 border border-amber-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-num">
            <div className="font-sans">
              <div className="font-bold text-amber-950">
                {activeBaselinePkg.title}（{activeBaselinePkg.code} · {activeBaselinePkg.versionStatus}）
              </div>
              <div className="text-[11px] text-amber-800 mt-0.5 font-num">
                建档日期 {activeBaselinePkg.dotDate} · {activeBaselinePkg.reportsCount} 份检查原件 · 体重{' '}
                {activeBaselinePkg.weightKg}kg
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 font-sans block text-[11px]">基线血压</span>
                <strong className="text-slate-900">
                  {activeBaselinePkg.metrics.systolicBp}/{activeBaselinePkg.metrics.diastolicBp} mmHg
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[11px]">基线肝脂肪率</span>
                <strong className="text-slate-900">
                  {activeBaselinePkg.metrics.liverFatPercent.toFixed(1)}%
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[11px]">基线总胆固醇 / LDL</span>
                <strong className="text-slate-900">
                  {activeBaselinePkg.metrics.totalCholesterol.toFixed(1)} /{' '}
                  {activeBaselinePkg.metrics.ldlCholesterol.toFixed(1)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[11px]">基线血糖 / BMI</span>
                <strong className="text-slate-900">
                  {activeBaselinePkg.metrics.fastingGlucose.toFixed(1)} /{' '}
                  {activeBaselinePkg.bmi.toFixed(1)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =======================================================================
          ZONE 2: HERO VISUAL BEFORE ➔ AFTER COMPARISON BOARD (一眼看清基线到报告的变化)
         ======================================================================= */}
      <div className="p-4 sm:p-5 border-b border-[#edf2f6] space-y-4">
        {/* 4-Column Big-Number Executive Shift Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#edf2f6] border border-[#e2ebf1] rounded-xl bg-[#fbfcfd]">
          <div className="p-3.5">
            <div className="text-xs text-slate-500">综合健康评分跃迁</div>
            <div className="mt-1 flex items-baseline gap-1.5 font-num">
              <span className="text-base font-bold text-amber-700">
                {executiveSummary.scoreBaseline}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 self-center shrink-0" />
              <span className="text-2xl font-extrabold text-slate-900">
                {executiveSummary.scoreCurrent}
              </span>
              <span className="text-xs text-slate-500">分</span>
              <span
                className={`ml-1 text-xs font-bold ${
                  executiveSummary.scoreDelta > 0
                    ? 'text-emerald-600'
                    : executiveSummary.scoreDelta < 0
                    ? 'text-red-600'
                    : 'text-slate-500'
                }`}
              >
                {executiveSummary.scoreDelta > 0
                  ? `+${executiveSummary.scoreDelta}分 ↑`
                  : executiveSummary.scoreDelta === 0
                  ? '持平'
                  : `${executiveSummary.scoreDelta}分`}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-num">
              琥珀色为基线 {activeBaselinePkg.code} · 深色为所选报告
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-xs text-slate-500">超标异常指标项数</div>
            <div className="mt-1 flex items-baseline gap-1.5 font-num">
              <span className="text-base font-bold text-amber-700">
                {executiveSummary.baselineAbnormalCount}项
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 self-center shrink-0" />
              <span
                className={`text-2xl font-extrabold ${
                  executiveSummary.currentAbnormalCount === 0
                    ? 'text-emerald-600'
                    : 'text-slate-900'
                }`}
              >
                {executiveSummary.currentAbnormalCount}
              </span>
              <span className="text-xs text-slate-500">
                / {executiveSummary.totalBiomarkers} 项
              </span>
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 mt-0.5 font-num">
              {executiveSummary.newlyNormalizedCount > 0
                ? `已有 ${executiveSummary.newlyNormalizedCount} 项超标指标彻底转绿达标 ✓`
                : executiveSummary.currentAbnormalCount === 0
                ? '全项指标处于临床达标绿区 ✓'
                : '各项超标幅度均在稳步收窄'}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-xs text-slate-500">指标向好改善覆盖率</div>
            <div className="mt-1 flex items-baseline gap-1 font-num">
              <span className="text-2xl font-extrabold text-emerald-600">
                {executiveSummary.improvedMetricsCount}
              </span>
              <span className="text-sm font-bold text-slate-500">
                / {executiveSummary.totalBiomarkers} 项向好或达标
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              绿色长条箭头代表向正常安全区回落距离
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#0d7a8a]" />
              <span>头号直观改善指标</span>
            </div>
            <div className="mt-1 text-sm font-extrabold text-[#0d7a8a] truncate">
              {executiveSummary.topHighlightLabel}
            </div>
            <div className="text-[11px] font-num font-semibold text-emerald-700 mt-0.5 truncate">
              {executiveSummary.topHighlightDetail}
            </div>
          </div>
        </div>

        {/* Legend Strip Above Visual Ruler Cards */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="font-bold text-slate-900">
            七大核心检验指标 · 基线 ({activeBaselinePkg.code}) → 疗程报告 直观推进标尺
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-300 inline-block" />
              <span>临床正常达标绿区</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-amber-500 inline-block" />
              <span>基线起点 ({activeBaselinePkg.code})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>改善推进幅度</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0d7a8a] inline-block" />
              <span>所选疗程报告值</span>
            </span>
          </div>
        </div>

        {/* 2-Column Wide Visual Dumbbell / Progress Ruler Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {executiveSummary.biomarkerDeltas.map((d) => {
            const isSelectedOnChart = selectedMetric === d.metricKey;
            const curMarkerColor =
              d.currentStatus === 'normal'
                ? '#059669'
                : d.currentStatus === 'caution'
                ? '#0d7a8a'
                : '#dc2626';
            const barStrokeColor = d.isUnchanged
              ? '#94a3b8'
              : d.isImproved
              ? '#10b981'
              : '#ef4444';

            const decimals =
              d.metricKey === 'systolicBp' || d.metricKey === 'diastolicBp' ? 0 : 1;
            const moveDistance = Math.abs(d.currentPct - d.baselinePct);
            const movingLeft = d.currentPct < d.baselinePct;
            const midPct = (d.baselinePct + d.currentPct) / 2;

            return (
              <div
                key={d.metricKey}
                onClick={() => setSelectedMetric(d.metricKey)}
                className={`rounded-xl border p-3.5 transition-colors cursor-pointer space-y-2.5 ${
                  isSelectedOnChart
                    ? 'bg-[#f4fbfa] border-[#0d7a8a]'
                    : d.transitionState === 'normalized'
                    ? 'bg-[#f3fcf7] border-[#a7e3c5] hover:border-[#0d7a8a]'
                    : 'bg-white hover:bg-[#f8fafc] border-[#e2ebf1]'
                }`}
              >
                {/* Top Line: Biomarker Name + Reference + Status Transition | Bold Change % */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">
                      {d.label}
                    </span>
                    <span className="text-[11px] font-num text-slate-400 whitespace-nowrap">
                      正常 {d.normalTargetText}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={`text-[11px] font-semibold whitespace-nowrap ${
                        d.transitionState === 'normalized' ||
                        d.transitionState === 'maintained_normal'
                          ? 'text-emerald-700'
                          : d.isImproved
                          ? 'text-[#0d7a8a]'
                          : 'text-slate-500'
                      }`}
                    >
                      {d.transitionState === 'normalized' ? '✓ ' : ''}
                      {d.transitionBadgeText}
                    </span>
                  </div>

                  {/* Unmistakable Change Magnitude Readout */}
                  <span
                    className={`text-xs font-num font-extrabold whitespace-nowrap shrink-0 ${
                      d.isUnchanged
                        ? 'text-slate-500'
                        : d.isImproved
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {d.intuitiveChangeBadge}
                  </span>
                </div>

                {/* Bottom Line: [基线数值] ═══ [Wide Visual Ruler with Green Safe Zone + Vector Arrow] ═══ [报告数值] */}
                <div className="grid grid-cols-[78px_minmax(0,1fr)_88px] items-center gap-2.5">
                  {/* Left: Baseline Value */}
                  <div className="font-num">
                    <div className="text-[10px] text-amber-800 font-sans font-semibold">
                      基线 {activeBaselinePkg.code}
                    </div>
                    <div className="text-sm font-bold text-amber-900 whitespace-nowrap">
                      {d.baselineValue.toFixed(decimals)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">{d.unit}</span>
                    </div>
                  </div>

                  {/* Center: Wide High-Contrast Visual Ruler */}
                  <div aria-hidden="true" className="w-full">
                    <svg viewBox="0 0 200 26" className="w-full h-6.5 overflow-visible">
                      {/* Neutral Full Scale Track */}
                      <rect x="0" y="9" width="200" height="8" rx="4" fill="#edf2f6" />

                      {/* Shaded Clinical Normal Safe Band */}
                      <rect
                        x={d.safeStartPct * 2}
                        y="6"
                        width={Math.max(8, (d.safeEndPct - d.safeStartPct) * 2)}
                        height="14"
                        rx="3.5"
                        fill="#bbf7d0"
                        stroke="#86efac"
                        strokeWidth="0.8"
                      />
                      <text
                        x={(d.safeStartPct + d.safeEndPct)}
                        y="4"
                        textAnchor="middle"
                        className="text-[7.5px] font-semibold fill-emerald-700"
                      >
                        达标绿区
                      </text>

                      {/* Thick Directional Shift Bar Connecting Baseline -> Current */}
                      {moveDistance > 0.5 && (
                        <>
                          <line
                            x1={d.baselinePct * 2}
                            y1="13"
                            x2={d.currentPct * 2}
                            y2="13"
                            stroke={barStrokeColor}
                            strokeWidth="4.5"
                            strokeLinecap="round"
                          />
                          {moveDistance >= 8 && (
                            <polygon
                              points={
                                movingLeft
                                  ? `${midPct * 2 - 3},13 ${midPct * 2 + 2.5},9.5 ${midPct * 2 + 2.5},16.5`
                                  : `${midPct * 2 + 3},13 ${midPct * 2 - 2.5},9.5 ${midPct * 2 - 2.5},16.5`
                              }
                              fill="#ffffff"
                            />
                          )}
                        </>
                      )}

                      {/* Amber Baseline Hollow Marker */}
                      <circle
                        cx={d.baselinePct * 2}
                        cy="13"
                        r="4.8"
                        fill="#ffffff"
                        stroke="#d97706"
                        strokeWidth="2.2"
                      />

                      {/* Selected Course Report Solid Marker */}
                      <circle
                        cx={d.currentPct * 2}
                        cy="13"
                        r="5.6"
                        fill={curMarkerColor}
                        stroke="#ffffff"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>

                  {/* Right: Selected Course Report Value */}
                  <div className="text-right font-num">
                    <div className="text-[10px] text-slate-500 font-sans font-semibold">
                      本期报告值
                    </div>
                    <div
                      className={`text-base font-extrabold whitespace-nowrap ${
                        d.currentStatus === 'normal'
                          ? 'text-emerald-700'
                          : d.currentStatus === 'caution'
                          ? 'text-slate-900'
                          : 'text-red-600'
                      }`}
                    >
                      {d.currentValue.toFixed(decimals)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">{d.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =======================================================================
          ZONE 3: CROSS-COURSE EVOLUTION MATRIX TABLE (横向一表看清基线 → 历次疗程演进)
         ======================================================================= */}
      <div className="p-4 sm:p-5 border-b border-[#edf2f6] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              历次疗程横向演进对比总表（从左到右看全程变化）
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              首列固定为当前锁定的基准线（{activeBaselinePkg.code}），向右依次并列各疗程报告实测值与较基线涨跌幅；点击任意表头可切换上方标尺对比节点
            </p>
          </div>

          <div
            role="group"
            aria-label="切换演进对比表列密度"
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
              各疗程关键报告 ({bundle.courseSpans.length + 1}列)
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
          <table className="w-full text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2ebf1] text-slate-600">
                <th className="py-2.5 px-3 text-left font-bold text-slate-800 whitespace-nowrap">
                  检验指标 / 临床正常值
                </th>
                {evolutionMatrix.columns.map((col) => (
                  <th
                    key={col.id}
                    onClick={() => {
                      if (col.eventRef) handleSelectTimelineEvent(col.eventRef);
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
                  <div>较基线 ({activeBaselinePkg.code}) 净变化</div>
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
                    onClick={() => setSelectedMetric(row.spec.key)}
                    className={`cursor-pointer transition-colors ${
                      isRowSelected ? 'bg-[#f4fbfa]' : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
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

      {/* =======================================================================
          ZONE 4: LARGE PHASE-SEGMENTED TREND CHART (含临床达标绿带 + 基准线) & COMPACT TIMELINE
         ======================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.18fr_1fr] divide-y xl:divide-y-0 xl:divide-x divide-[#edf2f6]">
        {/* Left: Large Trend Chart with Both Clinical Safe Zone AND Locked Reference Baseline Line */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <GitCompareArrows className="w-4 h-4 text-[#0d7a8a]" />
                <span>
                  {activeMetricSpec.label} · 跨疗程基准线（{activeBaselinePkg.code}）与达标绿区轨迹图
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-num">
                琥珀虚线 = 锁定基线 {activeBaselinePkg.code}（
                {formatBaselineMetricValue(chartGeometry.baseVal, selectedMetric)}） · 浅绿横带 =
                临床正常达标区（{activeMetricSpec.normalTargetText}）
              </p>
            </div>
          </div>

          {/* 8-Metric Quick Selector Tabs */}
          <div
            role="group"
            aria-label="切换趋势图对比指标"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5"
          >
            {BASELINE_METRIC_SPECS.map((m) => {
              const active = selectedMetric === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMetric(m.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 border ${
                    active
                      ? 'bg-[#eaf5f7] border-[#0d7a8a] text-[#0d7a8a] font-bold'
                      : 'bg-[#f8fafc] border-[#e2ebf1] text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  {m.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2ebf1] space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-num flex-wrap">
              <span className="font-sans font-semibold text-slate-800">
                基线 {activeBaselinePkg.code}：
                <strong className="font-num text-amber-800 mx-1">
                  {inspectedSelectedMetricDelta.formattedBaseline}
                </strong>
                → {inspectedEvent.title}：
                <strong className="font-num text-[#0d7a8a] ml-1">
                  {inspectedSelectedMetricDelta.formattedCurrent}
                </strong>
              </span>
              <span
                className={`font-extrabold ${
                  inspectedSelectedMetricDelta.isUnchanged
                    ? 'text-slate-500'
                    : inspectedSelectedMetricDelta.isImproved
                    ? 'text-emerald-700'
                    : 'text-red-600'
                }`}
              >
                较基线 {activeBaselinePkg.code}：{inspectedSelectedMetricDelta.intuitiveChangeBadge}
              </span>
            </div>

            <svg
              viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label={`${activeMetricSpec.label} 分疗程基准线与临床正常区对比曲线`}
            >
              {/* Alternating Course Phase Columns */}
              {chartGeometry.courseBands.map((band, idx) => (
                <g key={band.courseNo}>
                  <rect
                    x={band.x1}
                    y={chartGeometry.padTop - 16}
                    width={Math.max(0, band.x2 - band.x1)}
                    height={chartGeometry.plotH + 16}
                    fill={idx % 2 === 0 ? '#f1f5f9' : '#ffffff'}
                    fillOpacity="0.65"
                  />
                  {idx > 0 && (
                    <line
                      x1={band.x1}
                      y1={chartGeometry.padTop - 16}
                      x2={band.x1}
                      y2={chartGeometry.padTop + chartGeometry.plotH}
                      stroke="#cbd5e1"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  )}
                  <text
                    x={(band.x1 + band.x2) / 2}
                    y={chartGeometry.padTop - 5}
                    textAnchor="middle"
                    className="text-[9.5px] font-bold fill-slate-500"
                  >
                    {band.label}
                  </text>
                </g>
              ))}

              {/* Shaded Clinical Normal Target Band */}
              {chartGeometry.safeBandHeight > 1 && (
                <g>
                  <rect
                    x={chartGeometry.padLeft}
                    y={chartGeometry.safeBandTop}
                    width={chartGeometry.plotW}
                    height={chartGeometry.safeBandHeight}
                    fill="#bbf7d0"
                    fillOpacity="0.45"
                  />
                  <text
                    x={chartGeometry.padLeft + 6}
                    y={Math.min(
                      chartGeometry.padTop + chartGeometry.plotH - 4,
                      chartGeometry.safeBandTop + 11
                    )}
                    className="text-[9px] font-bold fill-emerald-800"
                  >
                    临床正常达标区 ({activeMetricSpec.normalTargetText})
                  </text>
                </g>
              )}

              {/* Shaded Improvement Area Between Baseline Line & Trajectory */}
              {chartGeometry.areaPath && (
                <path d={chartGeometry.areaPath} fill="#10b981" fillOpacity="0.10" />
              )}

              {/* Locked Horizontal Reference Baseline Line */}
              <line
                x1={chartGeometry.padLeft}
                y1={chartGeometry.baselineY}
                x2={chartGeometry.width - chartGeometry.padRight}
                y2={chartGeometry.baselineY}
                stroke="#d97706"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              {(() => {
                const lastPt = chartGeometry.coords[chartGeometry.coords.length - 1];
                const nearRightNode =
                  lastPt !== undefined && Math.abs(lastPt.y - chartGeometry.baselineY) < 20;
                const labelY = nearRightNode
                  ? Math.min(chartGeometry.height - 42, chartGeometry.baselineY + 13)
                  : Math.max(24, chartGeometry.baselineY - 5);
                return (
                  <text
                    x={chartGeometry.width - chartGeometry.padRight - 2}
                    y={labelY}
                    textAnchor="end"
                    className="text-[10px] font-bold fill-amber-800"
                  >
                    基准线 {activeBaselinePkg.code}:{' '}
                    {chartGeometry.baseVal.toFixed(activeMetricSpec.decimals)}
                    {activeMetricSpec.unit}
                  </text>
                );
              })()}

              {/* Chronological Trajectory Polyline */}
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

              {/* Data Nodes */}
              {chartGeometry.coords.map((pt) => {
                const isBaselineAnchor = pt.ev.anchoredBaselineCode === activeBaselinePkg.code;
                const isInspected = inspectedEvent.id === pt.ev.id;

                return (
                  <g
                    key={pt.ev.id}
                    onClick={() => handleSelectTimelineEvent(pt.ev)}
                    className="cursor-pointer"
                  >
                    {isInspected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="9"
                        fill="#0d7a8a"
                        fillOpacity="0.18"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isInspected ? 5.5 : 4.2}
                      fill={
                        isBaselineAnchor
                          ? '#d97706'
                          : pt.deltaObj.currentStatus === 'normal'
                          ? '#059669'
                          : '#0d7a8a'
                      }
                      stroke="#ffffff"
                      strokeWidth="1.8"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 9}
                      textAnchor="middle"
                      className="text-[10px] font-extrabold fill-slate-900"
                    >
                      {pt.val.toFixed(activeMetricSpec.decimals)}
                    </text>
                    <text
                      x={pt.x}
                      y={chartGeometry.height - 17}
                      textAnchor="middle"
                      className="text-[9.5px] fill-slate-500"
                    >
                      {pt.ev.dotDate.slice(5)}
                    </text>
                    <text
                      x={pt.x}
                      y={chartGeometry.height - 4}
                      textAnchor="middle"
                      className="text-[9px] font-semibold fill-slate-700"
                    >
                      {pt.ev.anchoredBaselineCode
                        ? pt.ev.anchoredBaselineCode
                        : `${pt.ev.courseNo}期`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Compact, High-Contrast Checkup Report Timeline Rail */}
        <div className="p-4 sm:p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                检查报告时间线（逐单前后对比）
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                每份报告直接显示「基线 {activeBaselinePkg.code} → 当次报告」实测对比；点选即联动全屏
              </p>
            </div>

            <div
              role="group"
              aria-label="按疗程筛选时间线报告"
              className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-lg p-0.5 text-[11px] font-num"
            >
              <button
                type="button"
                onClick={() => setCourseFilter('all')}
                className={`px-2 py-0.5 rounded-md whitespace-nowrap ${
                  courseFilter === 'all'
                    ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部 ({bundle.timelineEventsDesc.length})
              </button>
              {bundle.courseSpans.map((sp) => (
                <button
                  key={sp.courseId}
                  type="button"
                  onClick={() => setCourseFilter(sp.courseNo)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap ${
                    courseFilter === sp.courseNo
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sp.courseNo}期
                </button>
              ))}
            </div>
          </div>

          <div className="relative pl-5 space-y-2.5 max-h-[330px] overflow-y-auto pr-1 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#cbe8dc]">
            {filteredEventsDesc.map((ev) => {
              const isInspected = inspectedEvent.id === ev.id;
              const isLockedAnchor = ev.anchoredBaselineCode === activeBaselinePkg.code;
              const focusDelta = evaluateEventAgainstBaseline(
                ev,
                activeBaselinePkg,
                selectedMetric
              );
              const scoreDelta = ev.healthScore - activeBaselinePkg.healthScore;

              return (
                <div key={ev.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-5 top-3 w-4 h-4 rounded-full border-[3px] border-white ${
                      isLockedAnchor
                        ? 'bg-amber-500 ring-1 ring-amber-300'
                        : isInspected
                        ? 'bg-[#0d7a8a] ring-1 ring-[#8ac6d1]'
                        : 'bg-[#5ec29f]'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => handleSelectTimelineEvent(ev)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors space-y-1.5 ${
                      isInspected
                        ? 'bg-[#f4fbfa] border-[#0d7a8a]'
                        : isLockedAnchor
                        ? 'bg-[#fffbeb]/75 border-amber-300'
                        : 'bg-white hover:bg-[#f8fafc] border-[#e2ebf1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="font-num font-bold text-slate-600 whitespace-nowrap">
                          {ev.dotDate}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-extrabold text-slate-900 whitespace-nowrap">
                          {ev.title}
                        </span>
                        {ev.anchoredBaselineCode && (
                          <span className="text-[11px] font-num font-bold text-amber-800 whitespace-nowrap">
                            ({ev.anchoredBaselineCode})
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{ev.archiveStatus}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs font-num flex-wrap pt-1 border-t border-[#edf2f6]">
                      <span className="text-slate-600">
                        评分{' '}
                        <span className="text-amber-800 font-semibold">
                          {activeBaselinePkg.healthScore}
                        </span>{' '}
                        → <strong className="text-slate-900">{ev.healthScore}分</strong>
                        <span
                          className={`ml-1 font-semibold ${
                            scoreDelta > 0
                              ? 'text-emerald-600'
                              : scoreDelta < 0
                              ? 'text-red-600'
                              : 'text-slate-400'
                          }`}
                        >
                          ({scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta === 0 ? '原点' : scoreDelta})
                        </span>
                      </span>

                      <span className="text-slate-700">
                        <span className="font-sans text-slate-500 mr-1">
                          {activeMetricSpec.shortLabel}:
                        </span>
                        <span className="text-amber-800 font-semibold">
                          {focusDelta.baselineValue.toFixed(activeMetricSpec.decimals)}
                        </span>{' '}
                        →{' '}
                        <strong className="text-slate-900">
                          {focusDelta.currentValue.toFixed(activeMetricSpec.decimals)}{' '}
                          {activeMetricSpec.unit}
                        </strong>
                        <span
                          className={`ml-1.5 font-extrabold ${
                            focusDelta.isUnchanged
                              ? 'text-slate-400'
                              : focusDelta.isImproved
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                        >
                          {focusDelta.isUnchanged ? '(持平)' : focusDelta.intuitiveChangeBadge}
                        </span>
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
