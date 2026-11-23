import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  GitCompareArrows,
  Pill,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { OrganId } from '../utils/healthModel';
import {
  HealthIssueKey,
  IndicatorCourseTrajectory,
  IndicatorKey,
  PatientProblemCourseHierarchy,
  computeCrossPeriodCourseComparison,
} from '../utils/problemCourseAnalytics';
import { OrganIcon } from './OrganIcons';

interface ProblemCourseMatrixSectionProps {
  hierarchy: PatientProblemCourseHierarchy;
  selectedIssueKey: HealthIssueKey | 'all';
  onSelectIssueKey: (issueKey: HealthIssueKey | 'all', organId?: OrganId) => void;
  selectedIndicatorKey: IndicatorKey;
  onSelectIndicator: (indicator: IndicatorCourseTrajectory) => void;
  activeWidescreenCourseId: string;
  globalCompareCourseId?: string;
  hideLocalPeriodControls?: boolean;
  embeddedFlat?: boolean;
  onSelectWidescreenCourses: (activeCourseId: string, compareCourseId: string) => void;
}

/**
 * Inline deterministic SVG sparkline for a single indicator's independent baseline (C0)
 * and dynamic trajectory across all courses, with a green dashed upper reference threshold.
 */
const IndicatorDynamicSparkline: React.FC<{
  indicator: IndicatorCourseTrajectory;
  active: boolean;
}> = ({ indicator, active }) => {
  const pts = indicator.coursePoints;
  const W = 132;
  const H = 36;
  const padX = 8;
  const padY = 6;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const values = pts.map((p) => p.value);
  const minRaw = Math.min(...values, indicator.safeMax * 0.92);
  const maxRaw = Math.max(...values, indicator.safeMax * 1.08);
  const span = Math.max(0.4, maxRaw - minRaw);

  const xAt = (idx: number) =>
    pts.length <= 1 ? W / 2 : padX + (idx / (pts.length - 1)) * innerW;
  const yAt = (val: number) => padY + (1 - (val - minRaw) / span) * innerH;

  const safeLineY = Math.min(H - 3, Math.max(3, yAt(indicator.safeMax)));
  const baseLineY = yAt(indicator.independentBaseline.value);
  const polylinePoints = pts.map((p, idx) => `${xAt(idx)},${yAt(p.value)}`).join(' ');
  const lastPt = pts[pts.length - 1];
  const strokeColor = lastPt?.isNormal
    ? '#059669'
    : active
    ? '#0d7a8a'
    : '#0f766e';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-[132px] h-[36px] overflow-visible block"
      aria-label={`${indicator.shortLabel}独立基线动态趋势迷你曲线`}
    >
      {/* Safe target zone fill below safeMax */}
      <rect
        x={padX - 2}
        y={safeLineY}
        width={innerW + 4}
        height={Math.max(2, H - padY - safeLineY + 2)}
        fill="rgba(16, 185, 129, 0.09)"
        rx="2"
      />
      {/* Independent C0 Baseline subtle horizontal guide */}
      <line
        x1={padX}
        y1={baseLineY}
        x2={W - padX}
        y2={baseLineY}
        stroke="#cbd5e1"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      {/* Clinical Normal Upper Limit dashed guide */}
      <line
        x1={padX - 2}
        y1={safeLineY}
        x2={W - padX + 2}
        y2={safeLineY}
        stroke="#10b981"
        strokeWidth="1"
        strokeDasharray="3 2"
      />
      {/* Multi-course dynamic trajectory */}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylinePoints}
      />
      {pts.map((pt, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === pts.length - 1;
        return (
          <circle
            key={pt.courseId}
            cx={xAt(idx)}
            cy={yAt(pt.value)}
            r={isLast ? 3.2 : isFirst ? 2.6 : 2.3}
            fill={isFirst ? '#fffbeb' : pt.isNormal ? '#ecfdf5' : '#ffffff'}
            stroke={isFirst ? '#d97706' : pt.isNormal ? '#059669' : strokeColor}
            strokeWidth={isLast ? 2 : 1.5}
          />
        );
      })}
    </svg>
  );
};

export const ProblemCourseMatrixSection: React.FC<ProblemCourseMatrixSectionProps> = ({
  hierarchy,
  selectedIssueKey,
  onSelectIssueKey,
  selectedIndicatorKey,
  onSelectIndicator,
  activeWidescreenCourseId,
  globalCompareCourseId,
  hideLocalPeriodControls = false,
  embeddedFlat = false,
  onSelectWidescreenCourses,
}) => {
  const [crossFromId, setCrossFromId] = useState<string>(hierarchy.defaultCrossFromCourseId);
  const [crossToId, setCrossToId] = useState<string>(hierarchy.defaultCrossToCourseId);

  // Reset cross-period comparison pair cleanly whenever switching patients
  useEffect(() => {
    setCrossFromId(hierarchy.defaultCrossFromCourseId);
    setCrossToId(hierarchy.defaultCrossToCourseId);
  }, [
    hierarchy.patientId,
    hierarchy.defaultCrossFromCourseId,
    hierarchy.defaultCrossToCourseId,
  ]);

  const effectiveFromId = useMemo(() => {
    if (!hideLocalPeriodControls || !globalCompareCourseId) return crossFromId;
    if (globalCompareCourseId === 'target_course_end') {
      return activeWidescreenCourseId;
    }
    return globalCompareCourseId;
  }, [
    hideLocalPeriodControls,
    globalCompareCourseId,
    crossFromId,
    activeWidescreenCourseId,
  ]);

  const effectiveToId = useMemo(() => {
    if (!hideLocalPeriodControls || !globalCompareCourseId) return crossToId;
    if (globalCompareCourseId === 'target_course_end') {
      return 'target_course_end';
    }
    if (activeWidescreenCourseId === globalCompareCourseId) {
      return hierarchy.defaultCrossToCourseId;
    }
    return activeWidescreenCourseId;
  }, [
    hideLocalPeriodControls,
    globalCompareCourseId,
    crossToId,
    activeWidescreenCourseId,
    hierarchy.defaultCrossToCourseId,
  ]);

  const crossComparison = useMemo(
    () =>
      computeCrossPeriodCourseComparison(
        hierarchy,
        effectiveFromId,
        effectiveToId,
        selectedIssueKey
      ),
    [hierarchy, effectiveFromId, effectiveToId, selectedIssueKey]
  );

  const closedRegimens = useMemo(
    () => hierarchy.courseRegimens.filter((c) => c.courseNo > 0 && c.status === 'completed'),
    [hierarchy.courseRegimens]
  );

  const baselineRegimen = hierarchy.courseRegimens[0];
  const latestRegimen = hierarchy.courseRegimens[hierarchy.courseRegimens.length - 1];
  const latestClosedRegimen =
    closedRegimens.length > 0 ? closedRegimens[closedRegimens.length - 1] : null;
  const firstClosedRegimen = closedRegimens.length >= 2 ? closedRegimens[0] : null;

  const applyCrossPreset = (fromId: string, toId: string) => {
    setCrossFromId(fromId);
    setCrossToId(toId);
    if (toId !== 'target_course_end') {
      onSelectWidescreenCourses(toId, fromId);
    } else {
      onSelectWidescreenCourses(latestRegimen.courseId, 'target_course_end');
    }
  };

  return (
    <section
      id="problem-course-matrix"
      data-testid="problem-course-matrix"
      aria-label="患者多健康问题与多疗程药名品名指标跨期对比矩阵"
      className={
        embeddedFlat
          ? 'overflow-hidden scroll-mt-16'
          : 'bg-white border border-[#dce5ec] rounded-2xl overflow-hidden scroll-mt-16'
      }
    >
      {/* =====================================================================
          TIER 1 & TIER 2: 1 PATIENT -> MULTIPLE HEALTH ISSUES CHAIN & FILTER BAR
         ===================================================================== */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#edf2f6] space-y-3.5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                全链路疗效矩阵：{hierarchy.patientName} · 多问题 × 多疗程 × 药名品名 × 结案跨期对比
              </h2>
            </div>
            {/* Explicit 6-Link Analytical Chain Summary (Clean Unboxed Typography) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 flex-wrap font-num">
              <span className="text-slate-800 font-semibold font-sans">
                1名患者（{hierarchy.patientName}）
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="text-slate-800 font-semibold">
                {hierarchy.totalIssuesCount}项共管健康问题
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="text-slate-800 font-semibold">
                {hierarchy.totalInterventionCoursesCount}个干预疗程（已结案 {hierarchy.closedCoursesCount} 期）
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
              <span>每疗程 {hierarchy.allIndicators.length} 项分组指标</span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
              <span>每指标独立初诊基线与动态趋势</span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="text-[#0d7a8a] font-semibold">疗程结案后跨期对比</span>
            </div>
          </div>

          {/* Aggregate Drug & Product Brand Inventory Summary */}
          <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap font-num shrink-0">
            <span>
              累计涉及临床药名{' '}
              <strong className="text-slate-900">
                {hierarchy.allDrugNamesAcrossCourses.length}
              </strong>{' '}
              种
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span>
              功能营养/微生态产品品名{' '}
              <strong className="text-[#0d7a8a]">
                {hierarchy.allProductNamesAcrossCourses.length}
              </strong>{' '}
              种
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span>
              已达标逆转问题{' '}
              <strong className="text-emerald-700">
                {hierarchy.resolvedIssuesCount}/{hierarchy.totalIssuesCount}
              </strong>{' '}
              项
            </span>
          </div>
        </div>

        {/* Interactive Health-Problem Selector Cards/Tabs (`多个健康问题`) */}
        <div
          role="group"
          aria-label="按患者具体健康问题筛选指标组与靶向方案"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2"
        >
          <button
            type="button"
            onClick={() => onSelectIssueKey('all')}
            aria-pressed={selectedIssueKey === 'all'}
            className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors flex flex-col justify-between ${
              selectedIssueKey === 'all'
                ? 'bg-[#eaf5f7] border-[#0d7a8a] text-slate-900'
                : 'bg-[#f8fafc] border-[#e2e8f0] text-slate-700 hover:border-[#8ac6d1]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <span
                className={`text-xs font-bold whitespace-nowrap ${
                  selectedIssueKey === 'all' ? 'text-[#0d7a8a]' : 'text-slate-900'
                }`}
              >
                全部健康问题汇总
              </span>
              <span className="text-[11px] font-num font-semibold text-slate-500 whitespace-nowrap">
                {hierarchy.allIndicators.length}项指标
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 font-num truncate">
              共管 {hierarchy.totalIssuesCount} 大问题 · 跨 {hierarchy.courseRegimens.length} 个时期全览
            </div>
          </button>

          {hierarchy.issues.map((issue) => {
            const active = selectedIssueKey === issue.key;
            const statusColor =
              issue.status === 'cured_closed'
                ? 'text-emerald-700'
                : issue.status === 'stepdown_remission'
                ? 'text-[#0d7a8a]'
                : 'text-amber-700';

            return (
              <button
                key={issue.key}
                type="button"
                onClick={() => onSelectIssueKey(issue.key, issue.organId)}
                aria-pressed={active}
                className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                  active
                    ? 'bg-[#eaf5f7] border-[#0d7a8a] text-slate-900'
                    : 'bg-[#f8fafc] border-[#e2e8f0] text-slate-700 hover:border-[#8ac6d1]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <OrganIcon
                      organId={issue.organId}
                      className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0"
                    />
                    <span
                      className={`text-xs font-bold truncate ${
                        active ? 'text-[#0d7a8a]' : 'text-slate-900'
                      }`}
                    >
                      0{issue.indexNo}. {issue.shortTitle}
                    </span>
                  </span>
                  <span className={`text-[11px] font-semibold whitespace-nowrap ${statusColor}`}>
                    {issue.statusLabel}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 font-num mt-1 truncate">
                  {issue.baselineSummary} → <strong className="text-slate-900">{issue.latestSummary}</strong>
                </div>

                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  品名：{issue.associatedProductNames.join('+') || '生活方式'}
                  {issue.associatedDrugNames.length > 0
                    ? ` · 药名：${issue.associatedDrugNames
                        .map((n) => n.split('（')[0])
                        .join('+')}`
                    : ' · 零西药'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          TIER 3: MULTIPLE COURSES × EXPLICIT DRUG NAMES (`药名`) & PRODUCT NAMES (`产品品名`)
         ===================================================================== */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#edf2f6] bg-[#fbfdfe]">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900">
              各疗程治疗方案演进明细（临床药名 + 功能营养/微生态产品品名）
            </h3>
            <span className="text-xs text-slate-500">
              点击任一疗程列可同步上方 3D 人体评估视角，清晰展示跨疗程「西药减量/停药」与「产品品名组方迭代」
            </span>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-2 ${
            hierarchy.courseRegimens.length >= 4
              ? 'xl:grid-cols-4'
              : 'xl:grid-cols-3'
          } gap-3`}
        >
          {hierarchy.courseRegimens.map((cr) => {
            const isActiveOn3D = activeWidescreenCourseId === cr.courseId;
            const filteredDrugs =
              selectedIssueKey === 'all'
                ? cr.drugItems
                : cr.drugItems.filter((d) => d.targetIssueKey === selectedIssueKey);
            const filteredProducts =
              selectedIssueKey === 'all'
                ? cr.productItems
                : cr.productItems.filter((p) => p.targetIssueKey === selectedIssueKey);

            return (
              <div
                key={cr.courseId}
                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-colors ${
                  isActiveOn3D
                    ? 'bg-[#f2fafb] border-[#0d7a8a]'
                    : 'bg-white border-[#e2e8f0] hover:border-[#9fd0d9]'
                }`}
              >
                <div>
                  {/* Course Header */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#edf2f6]">
                    <button
                      type="button"
                      onClick={() => {
                        const refId =
                          cr.courseNo === 0
                            ? 'target_course_end'
                            : baselineRegimen.courseId;
                        onSelectWidescreenCourses(cr.courseId, refId);
                      }}
                      className="text-left inline-flex items-center gap-1.5 group focus-visible:outline-none"
                    >
                      <span className="text-xs font-extrabold text-slate-900 group-hover:text-[#0d7a8a] whitespace-nowrap">
                        {cr.courseLabel}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">
                        {cr.stageTitle}
                      </span>
                    </button>

                    <span
                      className={`text-[11px] font-semibold font-num whitespace-nowrap inline-flex items-center gap-0.5 ${
                        cr.status === 'completed'
                          ? 'text-emerald-700'
                          : cr.status === 'active'
                          ? 'text-[#0d7a8a]'
                          : 'text-slate-500'
                      }`}
                    >
                      {cr.status === 'completed' && (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      )}
                      <span>{cr.statusText}</span>
                    </span>
                  </div>

                  {/* Course Date Span */}
                  <div className="text-[11px] text-slate-500 font-num mt-1.5 mb-2.5 flex items-center justify-between">
                    <span>
                      {cr.courseNo === 0
                        ? `建档采样日 ${cr.startDate}`
                        : `${cr.startDate} 至 ${cr.endDate}`}
                    </span>
                    {cr.courseNo > 0 && <span>依从率 {cr.adherencePercent}%</span>}
                  </div>

                  {cr.courseNo === 0 ? (
                    <div className="py-3 text-xs text-slate-500 leading-relaxed">
                      {cr.regimenEvolutionNote}。各健康问题指标在此建立互不混淆的
                      <strong className="text-slate-800">独立初诊基线（C0）</strong>。
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Clinical Drug Names (`药名`) */}
                      <div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
                          <Pill className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>临床药名（处方药 / 医学营养药）</span>
                        </div>
                        {filteredDrugs.length === 0 ? (
                          <div className="text-xs text-slate-400">
                            当前筛选问题未启用处方西药（零西药干预期）
                          </div>
                        ) : (
                          <ul className="space-y-1">
                            {filteredDrugs.map((d) => (
                              <li
                                key={d.id}
                                className="text-xs text-slate-800 leading-snug flex items-baseline justify-between gap-1.5"
                              >
                                <div className="min-w-0">
                                  <strong className="font-semibold text-slate-900">
                                    {d.name}
                                  </strong>
                                  <span className="text-slate-500 text-[11px] ml-1 font-num">
                                    {d.dosageSpec}
                                  </span>
                                </div>
                                {d.changeTag && (
                                  <span
                                    className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                                      d.changeTag.includes('减') || d.changeTag.includes('停')
                                        ? 'text-emerald-700'
                                        : 'text-indigo-700'
                                    }`}
                                  >
                                    {d.changeTag}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Functional Product Brand Names (`产品品名`) */}
                      <div className="pt-2 border-t border-[#f1f5f9]">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#0d7a8a] mb-1">
                          <Sparkles className="w-3 h-3 text-[#0d7a8a] shrink-0" />
                          <span>产品品名（微生态菌株 / 功能营养品）</span>
                        </div>
                        {filteredProducts.length === 0 ? (
                          <div className="text-xs text-slate-400">
                            当前筛选问题在本期以基础膳食为主
                          </div>
                        ) : (
                          <ul className="space-y-1">
                            {filteredProducts.map((p) => (
                              <li
                                key={p.id}
                                className="text-xs text-slate-800 leading-snug flex items-baseline justify-between gap-1.5"
                              >
                                <div className="min-w-0">
                                  <strong className="font-bold text-[#0d7a8a]">
                                    {p.name}
                                  </strong>
                                  <span className="text-slate-500 text-[11px] ml-1 font-num">
                                    {p.dosageSpec}
                                  </span>
                                </div>
                                {p.changeTag && (
                                  <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                                    {p.changeTag}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#f1f5f9] text-[11px] text-slate-500 leading-snug">
                  {cr.courseNo === 0
                    ? '各指标基线数值与采样日期独立归档，作为后续各期结案跨期对比锚点'
                    : cr.regimenEvolutionNote}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          TIER 4, TIER 5 & TIER 6:
          INDICATOR GROUP PER COURSE × INDEPENDENT BASELINE & DYNAMIC TREND × POST-COMPLETION CROSS-PERIOD COMPARISON
         ===================================================================== */}
      <div className="px-4 sm:px-6 py-4 space-y-3">
        {/* Post-Completion Cross-Period Comparison Controls (`疗程结案后跨期对比`) */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <GitCompareArrows className="w-4 h-4 text-[#0d7a8a] shrink-0" />
            <h3 className="text-sm font-bold text-slate-900">
              每疗程分组指标 × 独立基线迷你趋势 × 全局对比结果
            </h3>
            <span className="text-xs text-slate-500">
              点击任意指标行可联动上方 3D 靶器官与趋势图
            </span>
          </div>

          {!hideLocalPeriodControls && (
          <div className="flex items-center gap-2 flex-wrap font-num">
            <div
              role="group"
              aria-label="结案跨期对比快捷组合"
              className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5 overflow-x-auto no-scrollbar"
            >
              {latestClosedRegimen && (
                <button
                  type="button"
                  onClick={() =>
                    applyCrossPreset(
                      baselineRegimen.courseId,
                      latestClosedRegimen.courseId
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    crossFromId === baselineRegimen.courseId &&
                    crossToId === latestClosedRegimen.courseId
                      ? 'bg-white text-[#0d7a8a] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {latestClosedRegimen.courseLabel}(结案) vs 初诊基线
                </button>
              )}

              {firstClosedRegimen &&
                latestClosedRegimen &&
                firstClosedRegimen.courseId !== latestClosedRegimen.courseId && (
                  <button
                    type="button"
                    onClick={() =>
                      applyCrossPreset(
                        firstClosedRegimen.courseId,
                        latestClosedRegimen.courseId
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      crossFromId === firstClosedRegimen.courseId &&
                      crossToId === latestClosedRegimen.courseId
                        ? 'bg-white text-[#0d7a8a] shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {latestClosedRegimen.courseLabel}(结案) vs {firstClosedRegimen.courseLabel}(结案)
                  </button>
                )}

              {latestRegimen.status === 'active' && latestClosedRegimen && (
                <button
                  type="button"
                  onClick={() =>
                    applyCrossPreset(
                      latestClosedRegimen.courseId,
                      latestRegimen.courseId
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    crossFromId === latestClosedRegimen.courseId &&
                    crossToId === latestRegimen.courseId
                      ? 'bg-white text-[#0d7a8a] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {latestRegimen.courseLabel}(当前) vs {latestClosedRegimen.courseLabel}(结案)
                </button>
              )}

              {!latestClosedRegimen && (
                <button
                  type="button"
                  onClick={() =>
                    applyCrossPreset(baselineRegimen.courseId, 'target_course_end')
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    crossToId === 'target_course_end'
                      ? 'bg-white text-[#0d7a8a] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  首疗程结案靶值 vs 初诊基线
                </button>
              )}
            </div>

            {/* Arbitrary Cross-Period From -> To Dropdowns */}
            <div className="inline-flex items-center gap-1 text-xs">
              <label htmlFor="cross-from-course" className="text-slate-500 whitespace-nowrap">
                跨期起点：
              </label>
              <select
                id="cross-from-course"
                value={crossFromId}
                onChange={(e) => setCrossFromId(e.target.value)}
                className="bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0d7a8a]"
              >
                {hierarchy.courseRegimens.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.courseLabel}
                    {c.status === 'completed' && c.courseNo > 0 ? '(已结案)' : ''}
                  </option>
                ))}
              </select>

              <span className="text-slate-400">→</span>

              <label htmlFor="cross-to-course" className="sr-only">
                跨期终点结案期
              </label>
              <select
                id="cross-to-course"
                value={crossToId}
                onChange={(e) => setCrossToId(e.target.value)}
                className="bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2 py-1 text-xs font-semibold text-[#0d7a8a] focus:outline-none focus:border-[#0d7a8a]"
              >
                {hierarchy.courseRegimens
                  .filter((c) => c.courseNo > 0)
                  .map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseLabel}
                      {c.status === 'completed' ? '（已结案）' : '（进行中）'}
                    </option>
                  ))}
                <option value="target_course_end">
                  {latestRegimen.courseLabel}结案预期靶值
                </option>
              </select>
            </div>
          </div>
          )}
        </div>

        {/* Cross-Period Regimen & Outcome Summary Banner */}
        <div className="py-2.5 px-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-xs">
          <div className="text-slate-700 min-w-0">
            <span className="font-bold text-slate-900 font-num">
              跨期窗口 [{crossComparison.spanSummaryLabel}]：
            </span>
            <span className="ml-1">{crossComparison.regimenTransitionSummary}</span>
          </div>
          <div className="flex items-center gap-3 font-num shrink-0 whitespace-nowrap">
            <span>
              下降改善指标{' '}
              <strong className="text-[#0d7a8a]">
                {crossComparison.improvedCount}/{crossComparison.rows.length}
              </strong>{' '}
              项
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span>
              跨期新转绿达标{' '}
              <strong className="text-emerald-700">
                {crossComparison.normalizedCount}
              </strong>{' '}
              项
            </span>
          </div>
        </div>

        {/* High-Density Tabular Indicator Matrix */}
        <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                <th className="py-2.5 pl-3.5 pr-2.5">健康问题 · 分组指标</th>
                <th className="py-2.5 px-2.5 text-right">
                  独立初诊基线（{baselineRegimen.startDate}）
                </th>
                {hierarchy.courseRegimens
                  .filter((c) => c.courseNo > 0)
                  .map((cr) => (
                    <th key={cr.courseId} className="py-2.5 px-2.5 text-right">
                      <div>
                        {cr.courseLabel}
                        {cr.status === 'completed' ? ' · 已结案' : ' · 当前期'}
                      </div>
                      <div className="text-[10px] font-normal text-slate-400 font-num">
                        {cr.endDate}
                      </div>
                    </th>
                  ))}
                <th className="py-2.5 px-3 text-center">独立基线动态趋势</th>
                <th className="py-2.5 pl-2.5 pr-3.5 text-right bg-[#f2fafb]">
                  <div>
                    结案跨期对比（{crossComparison.fromCourse.courseLabel} →{' '}
                    {crossComparison.toCourse.courseLabel}）
                  </div>
                  <div className="text-[10px] font-normal text-[#0d7a8a]">
                    起点 → 终点 ｜ 净变化 Δ (%)
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#edf2f6] text-xs">
              {crossComparison.rows.map((row) => {
                const ind = row.indicator;
                const isSelected = selectedIndicatorKey === ind.key;
                const interventionPoints = ind.coursePoints.filter((p) => p.courseNo > 0);

                return (
                  <tr
                    key={ind.key}
                    onClick={() => onSelectIndicator(ind)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#eaf5f7]/80' : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    {/* Col 1: Issue & Indicator Name + Safe Reference Range */}
                    <td className="py-2.5 pl-3.5 pr-2.5 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold ${
                            isSelected ? 'text-[#0d7a8a]' : 'text-slate-900'
                          }`}
                        >
                          {ind.label}
                        </span>
                        {isSelected && (
                          <ChevronRight
                            className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-num">
                        <span className="font-sans">{ind.issueShortTitle}</span>
                        <span aria-hidden="true">·</span>
                        <span>靶区 {ind.referenceLabel}</span>
                      </div>
                    </td>

                    {/* Col 2: Independent Baseline (C0) */}
                    <td className="py-2.5 px-2.5 align-middle text-right font-num whitespace-nowrap">
                      <div
                        className={`font-bold ${
                          ind.independentBaseline.isAbnormal
                            ? 'text-amber-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {ind.independentBaseline.formatted}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {ind.independentBaseline.deviationText}
                      </div>
                    </td>

                    {/* Cols 3..N: Measured Indicator Group per Intervention Course */}
                    {interventionPoints.map((pt) => {
                      const deltaSign = pt.deltaFromBaseline > 0 ? '+' : '';
                      return (
                        <td
                          key={pt.courseId}
                          className="py-2.5 px-2.5 align-middle text-right font-num whitespace-nowrap"
                        >
                          <div className="inline-flex items-center justify-end gap-1">
                            <strong
                              className={
                                pt.isNormal
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-slate-900 font-bold'
                              }
                            >
                              {pt.formatted}
                            </strong>
                            <span className="text-[11px] text-slate-400">{ind.unit}</span>
                          </div>
                          <div
                            className={`text-[11px] mt-0.5 ${
                              pt.deltaFromBaseline < 0
                                ? 'text-emerald-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {pt.deltaFromBaseline === 0
                              ? '较基线持平'
                              : `较基线 ${deltaSign}${pt.deltaFromBaseline.toFixed(
                                  ind.decimals
                                )}`}
                          </div>
                        </td>
                      );
                    })}

                    {/* Col N+1: Independent Baseline & Dynamic Trend SVG Sparkline */}
                    <td className="py-2 px-3 align-middle">
                      <div className="flex justify-center">
                        <IndicatorDynamicSparkline
                          indicator={ind}
                          active={isSelected}
                        />
                      </div>
                    </td>

                    {/* Col N+2: Post-Course Completion Cross-Period Delta */}
                    <td className="py-2.5 pl-2.5 pr-3.5 align-middle text-right font-num whitespace-nowrap bg-[#f8fcfd]">
                      <div className="flex items-center justify-end gap-1 text-xs">
                        <span className="text-slate-500">{row.fromFormatted}</span>
                        <span className="text-slate-300">→</span>
                        <strong
                          className={
                            row.toIsNormal
                              ? 'text-emerald-700 font-extrabold'
                              : 'text-slate-900 font-extrabold'
                          }
                        >
                          {row.toFormatted}
                        </strong>
                        <span className="text-[11px] text-slate-400">{ind.unit}</span>
                      </div>

                      <div className="mt-0.5 inline-flex items-center justify-end gap-1.5 text-[11px]">
                        {row.deltaAbs < 0 && (
                          <TrendingDown className="w-3 h-3 text-emerald-600 shrink-0" />
                        )}
                        <span
                          className={`font-semibold ${
                            row.deltaAbs < 0
                              ? 'text-emerald-700'
                              : row.deltaAbs > 0
                              ? 'text-red-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.deltaFormatted} ({row.deltaPercent > 0 ? '+' : ''}
                          {row.deltaPercent}%)
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={
                            row.newlyNormalized
                              ? 'text-emerald-700 font-bold font-sans'
                              : row.toIsNormal
                              ? 'text-emerald-600 font-sans'
                              : 'text-[#0d7a8a] font-sans'
                          }
                        >
                          {row.newlyNormalized
                            ? '跨期转绿达标'
                            : row.toIsNormal
                            ? '稳态达标'
                            : '跨期改善'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
