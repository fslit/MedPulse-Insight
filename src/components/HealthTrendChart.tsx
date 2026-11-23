import React, { useEffect, useState } from 'react';
import { Pill, Sparkles } from 'lucide-react';
import { TREND_6M_DATA, TrendDataPoint } from '../utils/healthModel';
import { TrendFocusMetric } from '../utils/clinicalComparison';
import { CourseTrendPoint } from '../utils/patientCohort';
import {
  CourseRegimenBreakdown,
  IndicatorCourseTrajectory,
  IndicatorKey,
} from '../utils/problemCourseAnalytics';

interface HealthTrendChartProps {
  data?: TrendDataPoint[];
  courseSeries?: CourseTrendPoint[];
  focusMetric?: TrendFocusMetric;
  onChangeFocusMetric?: (metric: TrendFocusMetric) => void;
  currentLiverFatPercent?: number;
  showTargetProjection?: boolean;
  /** Optional 6-tier single-indicator independent baseline & regimen trajectory mode */
  indicatorTrajectory?: IndicatorCourseTrajectory;
  allIndicators?: ReadonlyArray<IndicatorCourseTrajectory>;
  courseRegimens?: ReadonlyArray<CourseRegimenBreakdown>;
  onSelectIndicatorKey?: (key: IndicatorKey) => void;
}

const FOCUS_TABS: ReadonlyArray<{ id: TrendFocusMetric; label: string }> = [
  { id: 'bp', label: '血压双线' },
  { id: 'liver', label: '肝脂肪率' },
  { id: 'lipid', label: '总胆固醇' },
  { id: 'weight_score', label: '体重与评分' },
];

export const HealthTrendChart: React.FC<HealthTrendChartProps> = ({
  data = TREND_6M_DATA,
  courseSeries,
  focusMetric: externalFocus,
  onChangeFocusMetric,
  currentLiverFatPercent = 8.6,
  showTargetProjection = true,
  indicatorTrajectory,
  allIndicators,
  courseRegimens,
  onSelectIndicatorKey,
}) => {
  const [internalFocus, setInternalFocus] = useState<TrendFocusMetric>('bp');
  const focus = externalFocus ?? internalFocus;

  // ===========================================================================
  // MODE A: Single-Indicator Independent Baseline + Multi-Course Dynamic Trend
  // ===========================================================================
  const indicatorNodes = React.useMemo(() => {
    if (!indicatorTrajectory) return [];
    const nodes = indicatorTrajectory.coursePoints.map((pt) => ({
      courseId: pt.courseId,
      label:
        pt.courseNo === 0
          ? '初诊基线'
          : `${pt.courseLabel}${pt.status === 'completed' ? '(结案)' : '(当前)'}`,
      shortCourseLabel: pt.courseLabel,
      date: pt.date,
      value: pt.value,
      formatted: pt.formatted,
      isNormal: pt.isNormal,
      deltaFromBaseline: pt.deltaFromBaseline,
      deltaPercentFromBaseline: pt.deltaPercentFromBaseline,
      isProjected: false,
    }));

    if (showTargetProjection && nodes.length > 0) {
      const baseVal = indicatorTrajectory.independentBaseline.value;
      const projVal = indicatorTrajectory.projectedTarget.value;
      const deltaBase = Number((projVal - baseVal).toFixed(indicatorTrajectory.decimals));
      const deltaPct =
        baseVal !== 0 ? Number((((projVal - baseVal) / baseVal) * 100).toFixed(1)) : 0;
      nodes.push({
        courseId: 'target_course_end',
        label: '结案靶值',
        shortCourseLabel: '结案理想靶值',
        date: '预期满期',
        value: projVal,
        formatted: indicatorTrajectory.projectedTarget.formatted,
        isNormal: true,
        deltaFromBaseline: deltaBase,
        deltaPercentFromBaseline: deltaPct,
        isProjected: true,
      });
    }
    return nodes;
  }, [indicatorTrajectory, showTargetProjection]);

  // ===========================================================================
  // MODE B: Legacy Multi-Metric Fallback
  // ===========================================================================
  const enrichedSeries = React.useMemo(() => {
    if (courseSeries && courseSeries.length > 0) {
      return courseSeries.map((c) => ({
        month: c.month,
        stageTitle: c.stageTitle,
        systolicBp: c.systolicBp,
        diastolicBp: c.diastolicBp,
        cholesterol: c.cholesterol,
        weightKg: c.weightKg,
        healthScore: c.healthScore,
        liverFat: c.liverFat,
        isProjected: Boolean(c.isProjected),
      }));
    }

    const baseLen = data.length;
    const rows = data.map((d, idx) => {
      const progress = baseLen <= 1 ? 1 : idx / (baseLen - 1);
      const estLiverFat =
        idx === baseLen - 1
          ? currentLiverFatPercent
          : Number((11.2 - progress * (11.2 - currentLiverFatPercent)).toFixed(1));
      return {
        ...d,
        stageTitle: `${d.month}体检实测`,
        liverFat: Math.max(3.5, estLiverFat),
        isProjected: false,
      };
    });

    if (showTargetProjection && rows.length > 0) {
      const last = rows[rows.length - 1];
      rows.push({
        month: '12周目标',
        stageTitle: '12周结案预期靶值',
        systolicBp: 126,
        diastolicBp: 80,
        cholesterol: 4.9,
        weightKg: Number(Math.max(54, last.weightKg - 2.8).toFixed(1)),
        healthScore: Math.min(96, Math.max(92, last.healthScore + 7)),
        liverFat: 4.6,
        isProjected: true,
      });
    }
    return rows;
  }, [courseSeries, data, currentLiverFatPercent, showTargetProjection]);

  const actualNodeCount = indicatorTrajectory
    ? indicatorTrajectory.coursePoints.length
    : enrichedSeries.filter((r) => !r.isProjected).length;

  const [activeIdx, setActiveIdx] = useState<number>(Math.max(0, actualNodeCount - 1));

  useEffect(() => {
    setActiveIdx(Math.max(0, actualNodeCount - 1));
  }, [actualNodeCount, courseSeries, indicatorTrajectory?.key]);

  const W = 560;
  const H = 198;
  const padL = 44;
  const padR = 32;
  const padT = 18;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  if (indicatorTrajectory && indicatorNodes.length > 0) {
    const safeIdx = Math.min(activeIdx, Math.max(0, indicatorNodes.length - 1));
    const currentNode = indicatorNodes[safeIdx] ?? indicatorNodes[0];

    const values = indicatorNodes.map((n) => n.value);
    const minValRaw = Math.min(...values, indicatorTrajectory.safeMin * 0.92);
    const maxValRaw = Math.max(
      ...values,
      indicatorTrajectory.independentBaseline.value * 1.06,
      indicatorTrajectory.safeMax * 1.12
    );
    const rangeSpan = Math.max(0.8, maxValRaw - minValRaw);
    const minV = minValRaw - rangeSpan * 0.08;
    const maxV = maxValRaw + rangeSpan * 0.1;

    const xAt = (i: number) =>
      indicatorNodes.length <= 1
        ? padL + plotW / 2
        : padL + (i / (indicatorNodes.length - 1)) * plotW;
    const yAt = (v: number) => padT + (1 - (v - minV) / (maxV - minV)) * plotH;

    const safeTopY = Math.max(padT, Math.min(padT + plotH, yAt(indicatorTrajectory.safeMax)));
    const safeBottomY = Math.max(
      padT,
      Math.min(padT + plotH, yAt(indicatorTrajectory.safeMin))
    );
    const baselineY = yAt(indicatorTrajectory.independentBaseline.value);

    const tickStep = (maxV - minV) / 3;
    const ticks = [0, 1, 2, 3].map((idx) =>
      Number((minV + tickStep * idx).toFixed(indicatorTrajectory.decimals))
    );

    const measuredNodes = indicatorNodes.filter((n) => !n.isProjected);
    const solidPts = measuredNodes.map((n, i) => `${xAt(i)},${yAt(n.value)}`).join(' ');
    const dashedPts =
      showTargetProjection && indicatorNodes.length > measuredNodes.length && measuredNodes.length > 0
        ? `${xAt(measuredNodes.length - 1)},${yAt(
            measuredNodes[measuredNodes.length - 1].value
          )} ${xAt(indicatorNodes.length - 1)},${yAt(
            indicatorNodes[indicatorNodes.length - 1].value
          )}`
        : '';

    const matchedRegimen =
      courseRegimens?.find((cr) => cr.courseId === currentNode.courseId) ??
      (currentNode.isProjected && courseRegimens && courseRegimens.length > 0
        ? courseRegimens[courseRegimens.length - 1]
        : undefined);

    return (
      <div
        id="indicator-independent-trend-chart"
        className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 flex flex-col justify-between scroll-mt-16"
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-2.5 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                单指标独立基线与跨疗程动态曲线 · {indicatorTrajectory.label}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                所属健康问题：{indicatorTrajectory.issueShortTitle} · 琥珀虚线为该指标独立初诊基线（
                <span className="font-num font-semibold text-amber-700">
                  {indicatorTrajectory.independentBaseline.formatted}
                </span>
                ），绿带为达标靶区（{indicatorTrajectory.referenceLabel}）
              </p>
            </div>

            {allIndicators && allIndicators.length > 0 && onSelectIndicatorKey && (
              <div className="flex items-center gap-1.5 shrink-0">
                <label htmlFor="single-indicator-select" className="text-xs text-slate-500 whitespace-nowrap">
                  切换指标：
                </label>
                <select
                  id="single-indicator-select"
                  value={indicatorTrajectory.key}
                  onChange={(e) => onSelectIndicatorKey(e.target.value as IndicatorKey)}
                  className="bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-2.5 py-1 text-xs font-semibold text-[#0d7a8a] focus:outline-none focus:border-[#0d7a8a]"
                >
                  {allIndicators.map((ind) => (
                    <option key={ind.key} value={ind.key}>
                      {ind.issueShortTitle} · {ind.shortLabel}（基线 {ind.independentBaseline.formatted}）
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Course Node Readout vs Independent Baseline */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs mb-2.5 pb-2 border-b border-[#e8eef3] font-num">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[#0d7a8a] font-semibold">
                <span className="w-2.5 h-0.5 bg-[#0d7a8a] inline-block" />
                <span>{currentNode.shortCourseLabel}：</span>
                <strong className="text-slate-900 text-sm">
                  {currentNode.formatted} {indicatorTrajectory.unit}
                </strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-600">
                独立初诊基线：{indicatorTrajectory.independentBaseline.formatted}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span
                className={`font-semibold ${
                  currentNode.deltaFromBaseline < 0
                    ? 'text-emerald-700'
                    : 'text-slate-500'
                }`}
              >
                较独立基线{' '}
                {currentNode.deltaFromBaseline > 0 ? '+' : ''}
                {currentNode.deltaFromBaseline.toFixed(indicatorTrajectory.decimals)}{' '}
                {indicatorTrajectory.unit}（{currentNode.deltaPercentFromBaseline > 0 ? '+' : ''}
                {currentNode.deltaPercentFromBaseline}%）
              </span>
            </div>

            <span
              className={`font-semibold ${
                currentNode.isNormal ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {currentNode.date} · {currentNode.isNormal ? '已落入正常靶区' : '持续逆转下降中'}
            </span>
          </div>
        </div>

        {/* SVG Single-Indicator Independent Baseline & Multi-Course Trajectory */}
        <div className="relative w-full h-[198px]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full overflow-visible select-none"
            role="img"
            aria-label={`${indicatorTrajectory.label}独立基线与多疗程动态趋势图`}
          >
            {/* Shaded Green Clinical Safe Reference Band */}
            <rect
              x={padL}
              y={Math.min(safeTopY, safeBottomY)}
              width={plotW}
              height={Math.max(8, Math.abs(safeBottomY - safeTopY))}
              fill="rgba(16, 185, 129, 0.11)"
              rx="4"
            />
            <line
              x1={padL}
              y1={safeTopY}
              x2={W - padR}
              y2={safeTopY}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={W - padR - 6}
              y={Math.min(padT + plotH - 4, Math.max(padT + 10, safeTopY + 11))}
              textAnchor="end"
              fontSize="10"
              fill="#047857"
              fontWeight="600"
            >
              达标参考上限 ({indicatorTrajectory.referenceLabel})
            </text>

            {/* Independent C0 Baseline Horizontal Reference Line */}
            <line
              x1={padL}
              y1={baselineY}
              x2={W - padR}
              y2={baselineY}
              stroke="#d97706"
              strokeWidth="1.2"
              strokeDasharray="5 3"
            />
            <text
              x={W - padR - 6}
              y={Math.max(padT + 9, baselineY - 4)}
              textAnchor="end"
              fontSize="10"
              fill="#b45309"
              fontWeight="600"
            >
              独立初诊基线 {indicatorTrajectory.independentBaseline.formatted}
            </text>

            {/* Y-Axis Ticks */}
            {ticks.map((tickVal, idx) => {
              const y = yAt(tickVal);
              return (
                <g key={`${tickVal}-${idx}`}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={W - padR}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padL - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    className="font-num"
                  >
                    {tickVal.toFixed(indicatorTrajectory.decimals)}
                  </text>
                </g>
              );
            })}

            {/* Active Course Vertical Guide */}
            <line
              x1={xAt(safeIdx)}
              y1={padT}
              x2={xAt(safeIdx)}
              y2={H - padB}
              stroke="rgba(13, 122, 138, 0.45)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />

            {/* Measured Trajectory + Dashed Completion Target */}
            <polyline
              fill="none"
              stroke="#0d7a8a"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={solidPts}
            />
            {dashedPts && (
              <polyline
                fill="none"
                stroke="#059669"
                strokeWidth="2.4"
                strokeDasharray="5 4"
                points={dashedPts}
              />
            )}

            {/* Course Nodes with Inline Value Readouts */}
            {indicatorNodes.map((n, i) => {
              const cx = xAt(i);
              const cy = yAt(n.value);
              const active = i === safeIdx;
              const strokeCol =
                i === 0
                  ? '#d97706'
                  : n.isProjected || n.isNormal
                  ? '#059669'
                  : '#0d7a8a';

              return (
                <g key={n.courseId}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={active ? 5.5 : 4}
                    fill={i === 0 ? '#fffbeb' : n.isNormal ? '#ecfdf5' : '#ffffff'}
                    stroke={strokeCol}
                    strokeWidth={active ? 2.8 : 2.1}
                  />
                  <text
                    x={cx}
                    y={Math.max(padT + 9, cy - 8)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill={active ? '#0f172a' : '#475569'}
                    className="font-num"
                  >
                    {n.formatted}
                  </text>
                  <text
                    x={cx}
                    y={H - 6}
                    textAnchor="middle"
                    fill={active ? '#0d7a8a' : n.isProjected ? '#047857' : '#64748b'}
                    fontWeight={active || n.isProjected ? '700' : '500'}
                    fontSize="10.5"
                  >
                    {n.label}
                  </text>
                  <rect
                    x={cx - 32}
                    y={padT}
                    width={64}
                    height={plotH + 22}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => setActiveIdx(i)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Synchronized Course Drug Names (`药名`) & Product Brand Names (`产品品名`) Readout */}
        {matchedRegimen && (
          <div className="mt-2 py-2 px-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 font-num">
              <span className="font-bold text-slate-800 font-sans">
                {currentNode.isProjected
                  ? `${matchedRegimen.courseLabel}结案预期维持方案`
                  : `${matchedRegimen.courseLabel}（${matchedRegimen.statusText}）同步治疗方案`}
              </span>
              {matchedRegimen.courseNo > 0 && (
                <span>依从率 {matchedRegimen.adherencePercent}%</span>
              )}
            </div>

            {matchedRegimen.courseNo === 0 ? (
              <div className="text-[11px] text-slate-500">
                初诊基线采集期（未服药、未使用营养产品），确立该指标独立基线{' '}
                <strong className="text-slate-800 font-num">
                  {indicatorTrajectory.independentBaseline.formatted}
                </strong>
              </div>
            ) : (
              <div className="space-y-1 text-[11px]">
                <div className="flex items-start gap-1 text-slate-700 leading-snug">
                  <Pill className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5" />
                  <strong className="text-slate-900 shrink-0">药名：</strong>
                  <span>
                    {matchedRegimen.drugItems.length > 0
                      ? matchedRegimen.drugItems
                          .map(
                            (d) =>
                              `${d.name}${d.changeTag ? `[${d.changeTag}]` : ''}`
                          )
                          .join(' + ')
                      : '零西药干预'}
                  </span>
                </div>
                <div className="flex items-start gap-1 text-slate-700 leading-snug">
                  <Sparkles className="w-3 h-3 text-[#0d7a8a] shrink-0 mt-0.5" />
                  <strong className="text-[#0d7a8a] shrink-0">品名：</strong>
                  <span>
                    {matchedRegimen.productItems.map((p) => p.name).join(' + ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accessible Course Node Selector Buttons */}
        <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-[#e8eef3] overflow-x-auto no-scrollbar">
          {indicatorNodes.map((n, i) => {
            const active = i === safeIdx;
            return (
              <button
                key={n.courseId}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`查看 ${n.label} ${indicatorTrajectory.shortLabel}数值与对应药名品名`}
                className={`flex-1 py-1 px-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#eaf5f7] text-[#0d7a8a] font-semibold border border-[#b5dce3]'
                    : n.isProjected
                    ? 'text-emerald-700 hover:bg-emerald-50 border border-transparent font-semibold'
                    : 'text-slate-500 hover:text-slate-900 border border-transparent'
                }`}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Fallback Legacy Multi-Metric Chart
  // ===========================================================================
  const safeIdx = Math.min(activeIdx, Math.max(0, enrichedSeries.length - 1));
  const currentPoint = enrichedSeries[safeIdx] ?? enrichedSeries[0];

  const handleSelectFocus = (m: TrendFocusMetric) => {
    setInternalFocus(m);
    onChangeFocusMetric?.(m);
  };

  const xAt = (i: number) =>
    enrichedSeries.length <= 1
      ? padL + plotW / 2
      : padL + (i / (enrichedSeries.length - 1)) * plotW;

  const chartSpec = React.useMemo(() => {
    if (focus === 'bp') {
      const minV = 70;
      const maxV = 160;
      const yFn = (v: number) => padT + (1 - (v - minV) / (maxV - minV)) * plotH;
      return {
        unit: 'mmHg',
        ticks: [85, 110, 130, 150],
        yTick: yFn,
        safeTopY: yFn(130),
        safeBottomY: yFn(85),
        safeLabel: '达标安全带 (<130/85 mmHg)',
        primaryColor: '#0d7a8a',
        secondaryColor: '#6366f1',
        yPrimary: (d: (typeof enrichedSeries)[number]) => yFn(d.systolicBp),
        ySecondary: (d: (typeof enrichedSeries)[number]) => yFn(d.diastolicBp),
      };
    }
    if (focus === 'liver') {
      const minV = 2.0;
      const maxV = 13.0;
      const yFn = (v: number) => padT + (1 - (v - minV) / (maxV - minV)) * plotH;
      return {
        unit: '%',
        ticks: [3, 5, 8.5, 12],
        yTick: yFn,
        safeTopY: yFn(5.0),
        safeBottomY: yFn(2.0),
        safeLabel: '正常肝脂阈值 (<5.0%)',
        primaryColor: '#d97706',
        secondaryColor: null,
        yPrimary: (d: (typeof enrichedSeries)[number]) => yFn(d.liverFat),
        ySecondary: null,
      };
    }
    if (focus === 'lipid') {
      const minV = 3.8;
      const maxV = 6.8;
      const yFn = (v: number) => padT + (1 - (v - minV) / (maxV - minV)) * plotH;
      return {
        unit: 'mmol/L',
        ticks: [4.2, 5.2, 6.0, 6.6],
        yTick: yFn,
        safeTopY: yFn(5.2),
        safeBottomY: yFn(3.8),
        safeLabel: '血脂理想区间 (TC <5.2)',
        primaryColor: '#0d7a8a',
        secondaryColor: null,
        yPrimary: (d: (typeof enrichedSeries)[number]) => yFn(d.cholesterol),
        ySecondary: null,
      };
    }
    const weights = enrichedSeries.map((d) => d.weightKg);
    const minW = Math.floor(Math.min(...weights) - 3);
    const maxW = Math.ceil(Math.max(...weights) + 3);
    const yFnW = (v: number) => padT + (1 - (v - minW) / Math.max(6, maxW - minW)) * plotH;
    const yFnScore = (s: number) => padT + (1 - (s - 70) / 30) * plotH;
    const step = Math.max(2, Math.round((maxW - minW) / 3));
    return {
      unit: 'kg',
      ticks: [minW, minW + step, minW + step * 2, maxW],
      yTick: yFnW,
      safeTopY: yFnScore(95),
      safeBottomY: yFnScore(85),
      safeLabel: '优良健康指数带 (≥85分)',
      primaryColor: '#0d7a8a',
      secondaryColor: '#4f46e5',
      yPrimary: (d: (typeof enrichedSeries)[number]) => yFnW(d.weightKg),
      ySecondary: (d: (typeof enrichedSeries)[number]) => yFnScore(d.healthScore),
    };
  }, [focus, enrichedSeries, plotH]);

  const actualPoints = enrichedSeries.filter((d) => !d.isProjected);
  const actualCount = actualPoints.length;

  const solidPrimaryPts = actualPoints
    .map((d, i) => `${xAt(i)},${chartSpec.yPrimary(d)}`)
    .join(' ');
  const dashedPrimaryPts =
    showTargetProjection && enrichedSeries.length > actualCount && actualCount > 0
      ? `${xAt(actualCount - 1)},${chartSpec.yPrimary(enrichedSeries[actualCount - 1])} ${xAt(
          enrichedSeries.length - 1
        )},${chartSpec.yPrimary(enrichedSeries[enrichedSeries.length - 1])}`
      : '';

  const solidSecondaryPts = chartSpec.ySecondary
    ? actualPoints.map((d, i) => `${xAt(i)},${chartSpec.ySecondary!(d)}`).join(' ')
    : '';
  const dashedSecondaryPts =
    chartSpec.ySecondary &&
    showTargetProjection &&
    enrichedSeries.length > actualCount &&
    actualCount > 0
      ? `${xAt(actualCount - 1)},${chartSpec.ySecondary(enrichedSeries[actualCount - 1])} ${xAt(
          enrichedSeries.length - 1
        )},${chartSpec.ySecondary(enrichedSeries[enrichedSeries.length - 1])}`
      : '';

  return (
    <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {courseSeries ? '跨疗程纵向演进与结案达标推演' : '多期纵向趋势与12周达标推演'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {courseSeries
                ? '按「初诊基线 → 各干预疗程 → 结案靶值」追踪疗效轨迹，绿色带为临床理想参考靶区'
                : '绿色阴影为临床安全靶区 · 虚线为执行处方后的 12 周预期轨迹'}
            </p>
          </div>

          <div
            role="group"
            aria-label="趋势指标切换"
            className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5"
          >
            {FOCUS_TABS.map((tab) => {
              const active = focus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectFocus(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs mb-2.5 pb-2.5 border-b border-[#e8eef3] font-num">
          <div className="flex items-center gap-3 flex-wrap">
            {focus === 'bp' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[#0d7a8a] font-medium">
                  <span className="w-2.5 h-0.5 bg-[#0d7a8a] inline-block" />
                  收缩压 <strong className="text-slate-900">{currentPoint.systolicBp}</strong> mmHg
                </span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-indigo-700 font-medium">
                  <span className="w-2.5 h-0.5 bg-indigo-500 inline-block" />
                  舒张压 <strong className="text-slate-900">{currentPoint.diastolicBp}</strong> mmHg
                </span>
              </>
            )}
            {focus === 'liver' && (
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                <span className="w-2.5 h-0.5 bg-amber-600 inline-block" />
                肝脂肪含量 MRI-PDFF{' '}
                <strong className="text-slate-900">{currentPoint.liverFat.toFixed(1)}%</strong>
                <span className="text-slate-500 font-sans">（临床逆转线 &lt; 5.0%）</span>
              </span>
            )}
            {focus === 'lipid' && (
              <span className="inline-flex items-center gap-1.5 text-[#0d7a8a] font-medium">
                <span className="w-2.5 h-0.5 bg-[#0d7a8a] inline-block" />
                总胆固醇 TC{' '}
                <strong className="text-slate-900">{currentPoint.cholesterol.toFixed(1)}</strong>{' '}
                mmol/L
                <span className="text-slate-500 font-sans">（理想上限 &lt; 5.2）</span>
              </span>
            )}
            {focus === 'weight_score' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[#0d7a8a] font-medium">
                  <span className="w-2.5 h-0.5 bg-[#0d7a8a] inline-block" />
                  体重 <strong className="text-slate-900">{currentPoint.weightKg.toFixed(1)}</strong>{' '}
                  kg
                </span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-indigo-700 font-medium">
                  <span className="w-2.5 h-0.5 bg-indigo-600 inline-block" />
                  综合健康分 <strong className="text-slate-900">{currentPoint.healthScore}</strong> 分
                </span>
              </>
            )}
          </div>

          <span
            className={`font-semibold ${
              currentPoint.isProjected ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            {currentPoint.month}
            {currentPoint.isProjected ? '（预期达标态）' : `实测 · 综合 ${currentPoint.healthScore}分`}
          </span>
        </div>
      </div>

      <div className="relative w-full h-[196px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full overflow-visible select-none"
          role="img"
          aria-label="多期指标纵向趋势与临床达标靶区对比图"
        >
          <rect
            x={padL}
            y={Math.min(chartSpec.safeTopY, chartSpec.safeBottomY)}
            width={plotW}
            height={Math.max(8, Math.abs(chartSpec.safeBottomY - chartSpec.safeTopY))}
            fill="rgba(16, 185, 129, 0.11)"
            rx="4"
          />
          <line
            x1={padL}
            y1={chartSpec.safeTopY}
            x2={W - padR}
            y2={chartSpec.safeTopY}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={W - padR - 6}
            y={Math.max(padT + 10, chartSpec.safeTopY - 4)}
            textAnchor="end"
            fontSize="10"
            fill="#047857"
            fontWeight="600"
          >
            {chartSpec.safeLabel}
          </text>

          {chartSpec.ticks.map((tickVal) => {
            const y = chartSpec.yTick(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  className="font-num"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          <line
            x1={xAt(safeIdx)}
            y1={padT}
            x2={xAt(safeIdx)}
            y2={H - padB}
            stroke="rgba(13, 122, 138, 0.45)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {solidSecondaryPts && chartSpec.secondaryColor && (
            <>
              <polyline
                fill="none"
                stroke={chartSpec.secondaryColor}
                strokeWidth="2"
                points={solidSecondaryPts}
              />
              {dashedSecondaryPts && (
                <polyline
                  fill="none"
                  stroke={chartSpec.secondaryColor}
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  points={dashedSecondaryPts}
                />
              )}
            </>
          )}

          <polyline
            fill="none"
            stroke={chartSpec.primaryColor}
            strokeWidth="2.5"
            points={solidPrimaryPts}
          />
          {dashedPrimaryPts && (
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              points={dashedPrimaryPts}
            />
          )}

          {enrichedSeries.map((d, i) => {
            const cx = xAt(i);
            const active = i === safeIdx;
            const py = chartSpec.yPrimary(d);
            const sy = chartSpec.ySecondary ? chartSpec.ySecondary(d) : null;
            const nodeStroke = d.isProjected ? '#059669' : chartSpec.primaryColor;

            return (
              <g key={d.month}>
                {sy !== null && chartSpec.secondaryColor && (
                  <circle
                    cx={cx}
                    cy={sy}
                    r={active ? 4.5 : 3.2}
                    fill="#ffffff"
                    stroke={chartSpec.secondaryColor}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                )}
                <circle
                  cx={cx}
                  cy={py}
                  r={active ? 5.5 : 3.8}
                  fill={d.isProjected ? '#ecfdf5' : '#ffffff'}
                  stroke={nodeStroke}
                  strokeWidth={active ? 2.8 : 2.1}
                />
                <text
                  x={cx}
                  y={H - 6}
                  textAnchor="middle"
                  fill={active ? '#0d7a8a' : d.isProjected ? '#047857' : '#64748b'}
                  fontWeight={active || d.isProjected ? '700' : '500'}
                  fontSize="10.5"
                >
                  {d.month}
                </text>
                <rect
                  x={cx - 28}
                  y={padT}
                  width={56}
                  height={plotH + 22}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => setActiveIdx(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-[#e8eef3] overflow-x-auto no-scrollbar">
        {enrichedSeries.map((d, i) => {
          const active = i === safeIdx;
          return (
            <button
              key={d.month}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`查看 ${d.month} 趋势数值`}
              className={`flex-1 py-1 px-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#eaf5f7] text-[#0d7a8a] font-semibold border border-[#b5dce3]'
                  : d.isProjected
                  ? 'text-emerald-700 hover:bg-emerald-50 border border-transparent font-semibold'
                  : 'text-slate-500 hover:text-slate-900 border border-transparent'
              }`}
            >
              {d.month}
            </button>
          );
        })}
      </div>
    </div>
  );
};
