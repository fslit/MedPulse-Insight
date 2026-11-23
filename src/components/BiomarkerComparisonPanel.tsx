import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
} from 'lucide-react';
import { OrganId } from '../utils/healthModel';
import {
  ClinicalComparisonResult,
  DoctorTalkingBrief,
} from '../utils/clinicalComparison';
import {
  DefaultOrganProtocol,
  MatchedDefaultProtocol,
  getDefaultProtocolsForOrgan,
} from '../utils/defaultProtocols';

interface BiomarkerComparisonPanelProps {
  comparison: ClinicalComparisonResult;
  talkingBrief: DoctorTalkingBrief;
  selectedOrgan: OrganId | null;
  highlightedRowIds: ReadonlyArray<string>;
  matchedDefaultProtocols: ReadonlyArray<MatchedDefaultProtocol>;
  onSelectOrgan: (organId: OrganId) => void;
  onOpenOrganDetail: (organId: OrganId) => void;
  onOpenProtocolCustomize: () => void;
  onOpenAiSummary: () => void;
  onOpenCasesShowcase: () => void;
}

export const BiomarkerComparisonPanel: React.FC<BiomarkerComparisonPanelProps> = ({
  comparison,
  talkingBrief,
  selectedOrgan,
  highlightedRowIds,
  matchedDefaultProtocols,
  onSelectOrgan,
  onOpenOrganDetail,
  onOpenProtocolCustomize,
  onOpenAiSummary,
  onOpenCasesShowcase,
}) => {
  const [bottomMode, setBottomMode] = useState<'talking' | 'default_protocol'>('default_protocol');

  const isTargetMode = comparison.mode === 'target_12w';
  const scoreDiff = comparison.scoreDelta;
  const totalCount = comparison.biomarkerRows.length;
  const greenCount = totalCount - comparison.currentAbnormalCount;

  const activeDefaultProtocol: {
    protocol: DefaultOrganProtocol;
    matchReason?: string;
  } = useMemo(() => {
    if (selectedOrgan) {
      const patientMatchedForOrgan = matchedDefaultProtocols.find(
        (m) =>
          m.protocol.linkedOrganId === selectedOrgan ||
          m.protocol.secondaryOrganIds?.includes(selectedOrgan)
      );
      if (patientMatchedForOrgan) {
        return {
          protocol: patientMatchedForOrgan.protocol,
          matchReason: patientMatchedForOrgan.matchReason,
        };
      }
      const organDefaults = getDefaultProtocolsForOrgan(selectedOrgan);
      if (organDefaults.length > 0) {
        return { protocol: organDefaults[0] };
      }
    }
    if (matchedDefaultProtocols.length > 0) {
      return {
        protocol: matchedDefaultProtocols[0].protocol,
        matchReason: matchedDefaultProtocols[0].matchReason,
      };
    }
    return { protocol: getDefaultProtocolsForOrgan('liver')[0] };
  }, [selectedOrgan, matchedDefaultProtocols]);

  return (
    <div
      data-testid="traffic-light-biomarker-panel"
      className="bg-white border border-[#dce5ec] rounded-2xl p-4 flex flex-col justify-between gap-3"
    >
      {/* Section 1: Clean 3-KPI Executive Header */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#edf2f6]">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              七项核心指标 · 红绿灯达标对比
            </h2>
            <p className="text-xs text-slate-500 font-num mt-0.5">
              {comparison.currentDate} · 对比 {comparison.referenceLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAiSummary}
            className="px-2.5 py-1 rounded-lg bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-xs font-semibold text-[#0d7a8a] transition-colors whitespace-nowrap shrink-0"
          >
            总检摘要
          </button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#edf2f6] py-2.5 border-b border-[#edf2f6]">
          {/* KPI 1: Health Score */}
          <div className="pr-2.5">
            <div className="text-[11px] text-slate-500 whitespace-nowrap">综合健康分</div>
            <div className="flex items-baseline gap-1 mt-1 font-num">
              {!isTargetMode && (
                <>
                  <span className="text-xs font-bold text-slate-400">
                    {comparison.referenceScore}
                  </span>
                  <span className="text-slate-300 text-xs" aria-hidden="true">
                    →
                  </span>
                </>
              )}
              <span
                data-testid="overall-health-score"
                className="text-2xl font-extrabold text-slate-900 leading-none"
              >
                {comparison.currentScore}
              </span>
              <span className="text-xs text-slate-500">分</span>
            </div>
            <div className="text-[11px] font-num mt-1 whitespace-nowrap">
              {isTargetMode ? (
                <span className="text-[#0d7a8a] font-semibold">
                  靶值 {comparison.referenceScore}分
                </span>
              ) : (
                <span
                  className={
                    scoreDiff >= 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'
                  }
                >
                  {scoreDiff > 0 ? `+${scoreDiff} 分 ↑` : scoreDiff === 0 ? '持平' : `${scoreDiff} 分`}
                </span>
              )}
            </div>
          </div>

          {/* KPI 2: Green-Light Normalized Count */}
          <div className="px-2.5">
            <div className="text-[11px] text-slate-500 whitespace-nowrap">绿灯达标项</div>
            <div className="flex items-baseline gap-1 mt-1 font-num">
              <span className="text-2xl font-extrabold text-emerald-600 leading-none">
                {greenCount}
              </span>
              <span className="text-xs text-slate-500">/ {totalCount} 项</span>
            </div>
            <div className="text-[11px] text-slate-600 font-num mt-1 whitespace-nowrap">
              {comparison.currentAbnormalCount === 0
                ? '全项已入绿区 ✓'
                : `余 ${comparison.currentAbnormalCount} 项向绿区推进`}
            </div>
          </div>

          {/* KPI 3: Course Improvement / Adherence */}
          <div className="pl-2.5">
            <div className="text-[11px] text-slate-500 whitespace-nowrap">
              {isTargetMode ? '预期达标周期' : '向好改善项'}
            </div>
            <div className="flex items-baseline gap-1 mt-1 font-num">
              <span className="text-2xl font-extrabold text-[#0d7a8a] leading-none">
                {isTargetMode
                  ? comparison.courseMeta?.activeCourse.cycleWeeks || 12
                  : comparison.improvedCount}
              </span>
              <span className="text-xs text-slate-500">
                {isTargetMode ? '周' : `/ ${totalCount} 项`}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-num mt-1 whitespace-nowrap">
              {comparison.courseMeta
                ? `依从率 ${comparison.courseMeta.adherencePercent}%`
                : '点选指标联动3D'}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: All 7 Core Biomarkers — Minimalist Traffic-Light Progress Bars */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Clean 3-Zone Traffic-Light Header Legend */}
        <div className="grid grid-cols-[104px_minmax(0,1fr)_112px] items-center gap-2 pb-1.5 mb-1 border-b border-[#edf2f6] text-[10px] font-semibold text-slate-400">
          <span>核心指标 / 状态</span>
          <div className="grid grid-cols-3 text-center">
            <span className="text-red-500">红·超标</span>
            <span className="text-amber-600">黄·偏高</span>
            <span className="text-emerald-600">绿·达标</span>
          </div>
          <span className="text-right">
            {isTargetMode ? '当前 → 靶值' : '基线 → 本期'}
          </span>
        </div>

        <div className="divide-y divide-[#f1f5f8]">
          {comparison.biomarkerRows.map((row) => {
            const isOrganActive = selectedOrgan === row.relatedOrgan;
            const isTopicHighlighted = highlightedRowIds.includes(row.id);

            const curDotHex =
              row.severity === 'normal'
                ? '#16a34a'
                : row.severity === 'caution'
                ? '#d97706'
                : '#dc2626';

            const statusColorClass =
              row.severity === 'normal'
                ? 'text-emerald-700'
                : row.severity === 'caution'
                ? 'text-amber-700'
                : 'text-red-600';

            const refX = row.trafficLightReferencePct * 1.8;
            const curX = row.trafficLightCurrentPct * 1.8;
            const dist = Math.abs(curX - refX);
            const movingRight = curX >= refX;
            const midX = (refX + curX) / 2;

            const targetGap = Number((row.referenceValue - row.currentValue).toFixed(1));
            const absDeltaStr =
              row.id === 'sbp' || row.id === 'dbp'
                ? String(Math.round(Math.abs(row.delta)))
                : Math.abs(row.delta).toFixed(1);

            return (
              <button
                key={row.id}
                type="button"
                data-testid={`tl-row-${row.id}`}
                onClick={() => onSelectOrgan(row.relatedOrgan)}
                className={`w-full py-2 px-2 -mx-2 rounded-xl grid grid-cols-[104px_minmax(0,1fr)_112px] items-center gap-2 text-left transition-colors group ${
                  isOrganActive || isTopicHighlighted
                    ? 'bg-[#eaf5f7]/75'
                    : 'hover:bg-[#f8fafc]'
                }`}
              >
                {/* Col 1: Biomarker Name + Accessible Status Text */}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-[#0d7a8a] whitespace-nowrap">
                    {row.shortLabel}
                  </div>
                  <div
                    className={`text-[11px] font-semibold whitespace-nowrap inline-flex items-center gap-0.5 ${statusColorClass}`}
                  >
                    {row.severity === 'normal' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>已达标</span>
                      </>
                    ) : (
                      <span>
                        {row.severity === 'alert' ? '▲ 超标' : '▲ 偏高'} · {row.clinicalRangeLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Col 2: Standardized 3-Zone Traffic-Light Progress Bar [Red | Amber | Green] */}
                <div className="w-full flex items-center" aria-hidden="true">
                  <svg viewBox="0 0 180 20" className="w-full h-5 overflow-visible">
                    {/* Red Zone [0..58] */}
                    <rect x="0" y="6" width="58" height="8" rx="4" fill="#fee2e2" />
                    {/* Amber Zone [61..119] */}
                    <rect x="61" y="6" width="58" height="8" rx="2" fill="#fef3c7" />
                    {/* Green Zone [122..180] */}
                    <rect x="122" y="6" width="58" height="8" rx="4" fill="#dcfce7" />

                    {/* Progress Vector from Baseline (hollow) -> Current (solid) */}
                    {dist > 1.5 && (
                      <>
                        <line
                          x1={refX}
                          y1="10"
                          x2={curX}
                          y2="10"
                          stroke={
                            isTargetMode
                              ? '#0d7a8a'
                              : movingRight
                              ? '#10b981'
                              : '#ef4444'
                          }
                          strokeWidth="3.4"
                          strokeLinecap="round"
                        />
                        {dist >= 14 && !isTargetMode && (
                          <polygon
                            points={
                              movingRight
                                ? `${midX + 2.6},10 ${midX - 2.2},6.8 ${midX - 2.2},13.2`
                                : `${midX - 2.6},10 ${midX + 2.2},6.8 ${midX + 2.2},13.2`
                            }
                            fill="#ffffff"
                          />
                        )}
                      </>
                    )}

                    {/* Reference / Baseline Hollow Ring */}
                    <circle
                      cx={refX}
                      cy="10"
                      r="3.8"
                      fill="#ffffff"
                      stroke={isTargetMode ? '#059669' : '#64748b'}
                      strokeWidth="1.8"
                    />

                    {/* Current Traffic-Light Solid Dot */}
                    <circle
                      cx={curX}
                      cy="10"
                      r="4.8"
                      fill={curDotHex}
                      stroke="#ffffff"
                      strokeWidth="1.6"
                    />
                  </svg>
                </div>

                {/* Col 3: Clean Tabular Before -> After + Improvement */}
                <div className="text-right font-num min-w-0">
                  {isTargetMode ? (
                    <>
                      <div className="text-xs whitespace-nowrap">
                        <strong className="font-extrabold text-slate-900">
                          {row.currentDisplay}
                        </strong>
                        <span className="text-slate-300 mx-1" aria-hidden="true">
                          →
                        </span>
                        <span className="text-emerald-700 font-bold text-[11px]">
                          {row.referenceDisplay}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                        {row.severity === 'normal'
                          ? `已达标 (${row.unit})`
                          : `距靶值 ${targetGap > 0 ? `+${targetGap}` : targetGap} ${row.unit}`}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs whitespace-nowrap">
                        <span className="text-slate-400 font-semibold text-[11px]">
                          {row.referenceDisplay}
                        </span>
                        <span className="text-slate-300 mx-1" aria-hidden="true">
                          →
                        </span>
                        <strong
                          className={`font-extrabold ${
                            row.severity === 'normal' ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {row.currentDisplay}
                        </strong>
                        <span className="text-[10px] text-slate-400 ml-0.5">{row.unit}</span>
                      </div>
                      <div
                        className={`text-[11px] font-bold whitespace-nowrap ${
                          Math.abs(row.delta) < 1e-6
                            ? 'text-slate-400'
                            : row.semantic === 'improving'
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {Math.abs(row.delta) < 1e-6
                          ? '较基线持平'
                          : `${row.delta < 0 ? '↓' : '↑'}${absDeltaStr} (${
                              row.percentDelta > 0 ? `+${row.percentDelta}` : row.percentDelta
                            }%)`}
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Concise Matched Protocol / Doctor Brief Footer */}
      <div className="pt-2.5 border-t border-[#edf2f6] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Stethoscope className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
            <h3 className="text-xs font-bold text-slate-900 truncate">
              {bottomMode === 'default_protocol'
                ? `靶向恢复方案 · ${activeDefaultProtocol.protocol.organTitle.split('（')[0]}`
                : `沟通重点 · ${talkingBrief.headline}`}
            </h3>
          </div>

          <div
            role="group"
            aria-label="切换方案与话术"
            className="inline-flex items-center bg-[#edf2f6] rounded-lg p-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => setBottomMode('default_protocol')}
              className={`px-2 py-0.5 rounded-md text-[11px] transition-colors whitespace-nowrap ${
                bottomMode === 'default_protocol'
                  ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              推荐方案
            </button>
            <button
              type="button"
              onClick={() => setBottomMode('talking')}
              className={`px-2 py-0.5 rounded-md text-[11px] transition-colors whitespace-nowrap ${
                bottomMode === 'talking'
                  ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              沟通话术
            </button>
          </div>
        </div>

        {bottomMode === 'default_protocol' ? (
          <div className="bg-[#f8fafc] border border-[#e2ebf1] rounded-xl p-2.5 text-xs leading-snug space-y-1">
            <p className="text-slate-800 line-clamp-2">
              <strong className="text-[#0d7a8a] font-semibold">标准组方：</strong>
              <span className="font-num">{activeDefaultProtocol.protocol.recoverySchemeText}</span>
            </p>
            <p className="text-slate-500 text-[11px] truncate">
              周期：{activeDefaultProtocol.protocol.courseDays}天/疗程（{activeDefaultProtocol.protocol.recommendedCoursesLabel}） · {activeDefaultProtocol.protocol.resolutionPoints}
            </p>
          </div>
        ) : (
          <div className="bg-[#f8fafc] border border-[#e2ebf1] rounded-xl p-2.5 text-xs leading-snug space-y-1">
            <p className="text-slate-800 line-clamp-2">{talkingBrief.comparisonTakeaway}</p>
            <p className="text-slate-500 text-[11px] line-clamp-1">{talkingBrief.actionExpectation}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {selectedOrgan ? (
            <button
              type="button"
              onClick={() => onOpenOrganDetail(selectedOrgan)}
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#eaf5f7] hover:bg-[#d8ecf0] border border-[#b5dce3] text-xs font-semibold text-[#0d7a8a] inline-flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <span>查看器官指标详情</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCasesShowcase}
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-xs font-semibold text-slate-700 hover:text-[#0d7a8a] inline-flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <Award className="w-3.5 h-3.5 text-[#0d7a8a]" />
              <span>全院康复案例库</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenProtocolCustomize}
            className="min-h-[34px] px-3 py-1 rounded-lg bg-[#0d7a8a] hover:bg-[#096472] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <span>方案图谱 (17项)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
