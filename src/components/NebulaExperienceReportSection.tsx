import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  GitMerge,
  Info,
  Layers,
  Pill,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import { OrganId } from '../utils/healthModel';
import {
  CELL_ENERGY_LEVELS,
  CHEN_XIAOZHEN_NEBULA_REPORT,
  NebulaCategoryTab,
  NebulaImportedReport,
  classifyFoodTherapyDValue,
  classifyMicrobeDValue,
  classifyOrganTissueDValue,
  classifyPathologyDValue,
  summarizeNebulaReportAtStage,
} from '../utils/nebulaReportParser';
import { OrganIcon } from './OrganIcons';

interface NebulaExperienceReportSectionProps {
  activePatientId: string;
  activeCourseNo?: number;
  selectedOrgan: OrganId | null;
  onSelectOrganIn3D: (organId: OrganId) => void;
  onSyncStageCourseNo?: (courseNo: number) => void;
  onSwitchToDemoPatient?: () => void;
  embeddedFlat?: boolean;
}

/**
 * Vector renderer for the official 6-level cellular energy symbols from NebulaByte YSY Pages 3–15.
 */
const CellSymbolGlyph: React.FC<{
  level: 1 | 2 | 3 | 4 | 5 | 6;
  size?: number;
}> = ({ level, size = 14 }) => {
  const spec = CELL_ENERGY_LEVELS[level - 1];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="shrink-0 inline-block"
    >
      {(spec.shapeName === 'hex_light' || spec.shapeName === 'hex_bright') && (
        <polygon
          points="10,2 17,6 17,14 10,18 3,14 3,6"
          fill={spec.fillHex}
          stroke={spec.strokeHex}
          strokeWidth="1.8"
        />
      )}
      {spec.shapeName === 'tri_up' && (
        <polygon
          points="10,2.5 17.5,17 2.5,17"
          fill={spec.fillHex}
          stroke={spec.strokeHex}
          strokeWidth="1.8"
        />
      )}
      {spec.shapeName === 'tri_down' && (
        <polygon
          points="2.5,3 17.5,3 10,17.5"
          fill={spec.fillHex}
          stroke={spec.strokeHex}
          strokeWidth="1.8"
        />
      )}
      {spec.shapeName === 'diamond' && (
        <polygon
          points="10,2 18,10 10,18 2,10"
          fill={spec.fillHex}
          stroke={spec.strokeHex}
          strokeWidth="2"
        />
      )}
      {spec.shapeName === 'square_black' && (
        <rect
          x="3"
          y="3"
          width="14"
          height="14"
          rx="1.5"
          fill={spec.fillHex}
          stroke="#cbd5e1"
          strokeWidth="1.6"
        />
      )}
    </svg>
  );
};

export const NebulaExperienceReportSection: React.FC<NebulaExperienceReportSectionProps> = ({
  activePatientId,
  activeCourseNo,
  selectedOrgan,
  onSelectOrganIn3D,
  onSyncStageCourseNo,
  onSwitchToDemoPatient,
  embeddedFlat = false,
}) => {
  const report: NebulaImportedReport = CHEN_XIAOZHEN_NEBULA_REPORT;
  const isViewingChenXiaozhen = activePatientId === report.patientId;

  const [localCourseNo, setLocalCourseNo] = useState<number>(2);
  const effectiveCourseNo = useMemo(() => {
    if (isViewingChenXiaozhen && typeof activeCourseNo === 'number') {
      return Math.min(2, Math.max(0, activeCourseNo));
    }
    return localCourseNo;
  }, [isViewingChenXiaozhen, activeCourseNo, localCourseNo]);

  const [selectedClusterId, setSelectedClusterId] = useState<string>(
    report.organEnergyClusters[0].id
  );
  const [activeCategory, setActiveCategory] = useState<NebulaCategoryTab>('pathology');
  const [showBlueprintRules, setShowBlueprintRules] = useState<boolean>(false);
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [embedNativePdf, setEmbedNativePdf] = useState<boolean>(false);

  const handleSelectStage = (courseNo: number) => {
    setLocalCourseNo(courseNo);
    if (isViewingChenXiaozhen && onSyncStageCourseNo) {
      onSyncStageCourseNo(courseNo);
    }
  };

  const baselineStats = useMemo(
    () => summarizeNebulaReportAtStage(report, 0),
    [report]
  );
  const currentStats = useMemo(
    () => summarizeNebulaReportAtStage(report, effectiveCourseNo),
    [report, effectiveCourseNo]
  );

  const activeCluster = useMemo(
    () =>
      report.organEnergyClusters.find((c) => c.id === selectedClusterId) ??
      report.organEnergyClusters[0],
    [report.organEnergyClusters, selectedClusterId]
  );

  const activeStageMeta = useMemo(
    () =>
      report.scanStages.find((s) => s.courseNo === effectiveCourseNo) ??
      report.scanStages[report.scanStages.length - 1],
    [report.scanStages, effectiveCourseNo]
  );

  return (
    <section
      id="nebula-ysy-report-section"
      data-testid="nebula-ysy-report-section"
      aria-label="NebulaByte YSY 全身细胞能量与D值体验报告结构化展现舱"
      className={
        embeddedFlat
          ? 'scroll-mt-16 overflow-hidden'
          : 'scroll-mt-16 bg-white border border-[#dce5ec] rounded-2xl overflow-hidden'
      }
    >
      {/* 1. Top Provenance, Stage Switcher & Raw 60-Page PDF Modal Trigger */}
      <div className="p-4 sm:p-5 border-b border-[#edf2f6] space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileSpreadsheet className="w-4 h-4 text-[#0d7a8a] shrink-0" />
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                体验报告导入展现：NebulaByte YSY 细胞能量与 D 值跨期解析舱
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap font-num">
              <span>
                解析样本：<strong className="text-slate-900 font-sans">{report.patientName}</strong>（{report.gender} · {report.age}岁 · 初检 {report.baselineScanDate}）
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span>
                原件 {report.rawPagesCount} 页 / {report.rawEnergySlicesCount} 幅截面 / {report.rawTableRowsCount} 条检测行
              </span>
              <span className="text-slate-400" aria-hidden="true">
                →
              </span>
              <span className="font-semibold text-[#0d7a8a] font-sans">
                智能去重归并为 5 大3D器官簇与跨疗程动态对比
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {!isViewingChenXiaozhen && onSwitchToDemoPatient && (
              <button
                type="button"
                onClick={onSwitchToDemoPatient}
                className="px-3 py-1.5 rounded-xl bg-[#eaf5f7] hover:bg-[#d7edf1] border border-[#8ac6d1] text-xs font-bold text-[#0d7a8a] inline-flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <span>切换至陈小真(74岁)三维全屏档案</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              aria-expanded={showBlueprintRules}
              onClick={() => setShowBlueprintRules((v) => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                showBlueprintRules
                  ? 'bg-[#eaf5f7] border-[#0d7a8a] text-[#0d7a8a]'
                  : 'bg-[#f8fafc] hover:bg-[#f1f5f9] border-[#dce5ec] text-slate-700'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5 text-[#0d7a8a]" />
              <span>60页报告导入重构逻辑</span>
            </button>

            <button
              type="button"
              onClick={() => setPdfModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>对照原版 60 页 PDF</span>
            </button>
          </div>
        </div>

        {/* Non-Diagnostic Compliance & Dual-Track Consultation Note (From PDF Page 2) */}
        <div className="px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-[#e2ebf1] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-xs">
          <div className="flex items-start sm:items-center gap-2 text-slate-600 min-w-0">
            <Info className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0 mt-0.5 sm:mt-0" />
            <span>{report.complianceDisclaimer}</span>
          </div>

          {/* Scan Stage Segmented Control */}
          <div
            role="group"
            aria-label="切换体验报告跨疗程复测节点"
            className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5 shrink-0 self-start lg:self-auto"
          >
            {report.scanStages.map((st) => {
              const active = effectiveCourseNo === st.courseNo;
              return (
                <button
                  key={st.courseNo}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleSelectStage(st.courseNo)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors whitespace-nowrap font-num ${
                    active
                      ? 'bg-[#0d7a8a] text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  {st.courseNo === 0
                    ? '初检基线 (08-23)'
                    : st.courseNo === 1
                    ? '第1疗程复测 (10-07)'
                    : '第2疗程复测 (11-18)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Collapsible 4-Step Import & Visualization Design Blueprint */}
        {showBlueprintRules && (
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {report.architectureRules.map((rule) => (
              <div
                key={rule.stepNo}
                className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2ebf1] space-y-1.5"
              >
                <div className="text-xs font-bold text-slate-900">
                  {rule.stepNo}. {rule.title}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong className="text-slate-700">原件痛点：</strong>
                  {rule.rawPainPoint}
                </p>
                <p className="text-[11px] text-[#0d7a8a] leading-relaxed">
                  <strong>大屏重构：</strong>
                  {rule.transformedPresentation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. 4-Column Tabular Cross-Period Entropy & D-Value KPI Strip */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#fbfdfe] border-b border-[#edf2f6] grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x lg:divide-[#e8eef3]">
        <div className="lg:pr-5">
          <div className="text-xs text-slate-500">E6–E7 高关注病理信号（D&gt;5.0）</div>
          <div className="flex items-baseline gap-2 mt-1 font-num">
            <span className="text-sm text-slate-400">{baselineStats.e6e7HighPathologyCount}项</span>
            <span className="text-slate-300">→</span>
            <strong
              className={`text-xl sm:text-2xl font-extrabold leading-none ${
                currentStats.e6e7HighPathologyCount === 0
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}
            >
              {currentStats.e6e7HighPathologyCount}
            </strong>
            <span className="text-xs text-slate-500">项</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {effectiveCourseNo === 0
              ? '初检胃溃疡(11.038)、软骨退变(11.434)等6项高警'
              : '高危E7信号已随黏膜修复与骨营养降阶'}
          </div>
        </div>

        <div className="lg:px-5">
          <div className="text-xs text-slate-500">6级高熵异常黑块细胞（■）总数</div>
          <div className="flex items-baseline gap-2 mt-1 font-num">
            <span className="text-sm text-slate-400">
              {baselineStats.totalGrade6BlackSquares}处
            </span>
            <span className="text-slate-300">→</span>
            <strong
              className={`text-xl sm:text-2xl font-extrabold leading-none ${
                currentStats.totalGrade6BlackSquares <= 5
                  ? 'text-emerald-600'
                  : 'text-slate-900'
              }`}
            >
              {currentStats.totalGrade6BlackSquares}
            </strong>
            <span className="text-xs text-slate-500">处</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            另含 5级轻微异常菱形(◆) {baselineStats.totalGrade5Diamonds} →{' '}
            <span className="font-num font-semibold text-slate-700">
              {currentStats.totalGrade5Diamonds}
            </span>{' '}
            处
          </div>
        </div>

        <div className="lg:px-5">
          <div className="text-xs text-slate-500">重度负荷组织器官簇（D&gt;2.0）</div>
          <div className="flex items-baseline gap-2 mt-1 font-num">
            <span className="text-sm text-slate-400">{baselineStats.heavyOrganLoadCount}簇</span>
            <span className="text-slate-300">→</span>
            <strong
              className={`text-xl sm:text-2xl font-extrabold leading-none ${
                currentStats.heavyOrganLoadCount === 0
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}
            >
              {currentStats.heavyOrganLoadCount}
            </strong>
            <span className="text-xs text-slate-500">簇</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            涵盖胰腺、总胆管、左心房心肌与胃幽门
          </div>
        </div>

        <div className="lg:pl-5">
          <div className="text-xs text-slate-500">当前扫描期同步执行方案</div>
          <div className="text-xs font-bold text-[#0d7a8a] mt-1 line-clamp-2 leading-snug">
            {activeStageMeta.regimenHeadline}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-num">
            检测日期：{activeStageMeta.scanDate}
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Analytical Split:
             Left: 6-Level Cellular Energy Slice Reconstruction & Cross-Course Entropy Bars (Pages 3–15)
             Right: Deduplicated 3D D-Value Matrix + Reverse-Scale Food & Mineral Therapy (Pages 16–60) */}
      <div className="grid grid-cols-1 xl:grid-cols-[440px_minmax(0,1fr)] divide-y xl:divide-y-0 xl:divide-x divide-[#edf2f6]">
        {/* LEFT COLUMN: 6-Level Cellular Energy Entropy Map */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0d7a8a]" />
                <span>器官截面细胞能量分布（原件 P3–P15 还原）</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                点击切面簇同步聚焦上方 3D 人体器官，对比调理前后高熵黑块消退
              </p>
            </div>
          </div>

          {/* 5 Anatomical Slice Cluster Buttons */}
          <div
            role="group"
            aria-label="选择器官能量切面簇并联动3D人体"
            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-1.5"
          >
            {report.organEnergyClusters.map((cluster) => {
              const isSelected = activeCluster.id === cluster.id;
              const isOrganLinked = selectedOrgan === cluster.organId;
              const curDist =
                cluster.stageDistributions.find((d) => d.courseNo === effectiveCourseNo) ??
                cluster.stageDistributions[0];
              const highEntropyCount = curDist.counts[4] + curDist.counts[5];

              return (
                <button
                  key={cluster.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedClusterId(cluster.id);
                    onSelectOrganIn3D(cluster.organId);
                  }}
                  className={`px-2.5 py-2 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-[#eaf5f7] border-[#0d7a8a]'
                      : isOrganLinked
                      ? 'bg-[#f4f9fa] border-[#9fd0d9]'
                      : 'bg-[#f8fafc] hover:bg-[#f1f5f9] border-[#e2ebf1]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 text-xs">
                    <span className="font-bold text-slate-900 inline-flex items-center gap-1 truncate">
                      <OrganIcon
                        organId={cluster.organId}
                        className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0"
                      />
                      <span className="truncate">{cluster.shortTitle}</span>
                    </span>
                    <span
                      className={`text-[11px] font-num font-semibold whitespace-nowrap ${
                        highEntropyCount === 0
                          ? 'text-emerald-700'
                          : highEntropyCount <= 4
                          ? 'text-[#0d7a8a]'
                          : 'text-red-600'
                      }`}
                    >
                      ◆/■ {highEntropyCount}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5 font-num">
                    {cluster.pdfPages}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Vector Anatomical Energy Scatter Preview + Stage Bar Comparison */}
          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2ebf1] space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">{activeCluster.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  归并切面：{activeCluster.sliceNames.join(' · ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectOrganIn3D(activeCluster.organId)}
                className="text-[11px] font-semibold text-[#0d7a8a] hover:underline whitespace-nowrap shrink-0"
              >
                定位3D{activeCluster.organLabel}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[124px_minmax(0,1fr)] gap-3 items-center">
              {/* Crisp Vector Cross-Section Energy Point Map */}
              <div className="relative h-[124px] rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  role="img"
                  aria-label={`${activeCluster.title} ${activeStageMeta.stageLabel} 细胞能量点阵还原图`}
                >
                  {/* Subtle anatomical cross-section contour */}
                  <ellipse
                    cx="51"
                    cy="52"
                    rx="37"
                    ry="38"
                    fill="#7f1d1d"
                    fillOpacity="0.32"
                    stroke="#f59e0b"
                    strokeOpacity="0.35"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M32,36 C44,24 66,26 72,44 C77,60 64,78 46,78 C31,78 24,52 32,36 Z"
                    fill="#b91c1c"
                    fillOpacity="0.28"
                    stroke="#fda4af"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                  />
                  {activeCluster.scatterPreviewNodes.map((pt, idx) => {
                    const lv =
                      effectiveCourseNo === 0
                        ? pt.baselineLevel
                        : effectiveCourseNo === 1
                        ? pt.course1Level
                        : pt.course2Level;
                    const spec = CELL_ENERGY_LEVELS[lv - 1];
                    return (
                      <g key={idx} transform={`translate(${pt.x - 5}, ${pt.y - 5})`}>
                        {(spec.shapeName === 'hex_light' || spec.shapeName === 'hex_bright') && (
                          <polygon
                            points="5,0.8 9,3 9,7 5,9.2 1,7 1,3"
                            fill={spec.fillHex}
                            stroke={spec.strokeHex}
                            strokeWidth="0.9"
                          />
                        )}
                        {spec.shapeName === 'tri_up' && (
                          <polygon
                            points="5,1 9.2,9 0.8,9"
                            fill={spec.fillHex}
                            stroke={spec.strokeHex}
                            strokeWidth="0.9"
                          />
                        )}
                        {spec.shapeName === 'tri_down' && (
                          <polygon
                            points="0.8,1 9.2,1 5,9"
                            fill={spec.fillHex}
                            stroke={spec.strokeHex}
                            strokeWidth="0.9"
                          />
                        )}
                        {spec.shapeName === 'diamond' && (
                          <polygon
                            points="5,0.6 9.4,5 5,9.4 0.6,5"
                            fill={spec.fillHex}
                            stroke={spec.strokeHex}
                            strokeWidth="1.1"
                          />
                        )}
                        {spec.shapeName === 'square_black' && (
                          <rect
                            x="1.2"
                            y="1.2"
                            width="7.6"
                            height="7.6"
                            fill={spec.fillHex}
                            stroke="#f8fafc"
                            strokeWidth="1"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
                <span className="absolute bottom-1.5 left-2 text-[10px] font-num text-slate-300 whitespace-nowrap">
                  {effectiveCourseNo === 0
                    ? '初检原貌'
                    : effectiveCourseNo === 1
                    ? '第1疗程复测'
                    : '第2疗程复测'}
                </span>
              </div>

              {/* Multi-Course Stacked Proportional Energy Bars */}
              <div className="space-y-2.5 min-w-0">
                {activeCluster.stageDistributions.map((dist) => {
                  const total = dist.counts.reduce((a, b) => a + b, 0) || 1;
                  const highCount = dist.counts[4] + dist.counts[5];
                  const isCurrentRow = dist.courseNo === effectiveCourseNo;
                  const conciseStageName =
                    dist.courseNo === 0
                      ? '初检基线'
                      : dist.courseNo === 1
                      ? '第1疗程结案'
                      : '第2疗程复测';
                  return (
                    <div key={dist.courseNo} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-num whitespace-nowrap">
                        <span
                          className={
                            isCurrentRow
                              ? 'font-bold text-[#0d7a8a] font-sans shrink-0'
                              : 'font-medium text-slate-600 font-sans shrink-0'
                          }
                        >
                          {conciseStageName}
                        </span>
                        <span className="text-slate-600 shrink-0">
                          ■<strong className="text-slate-900 ml-0.5">{dist.counts[5]}</strong> · ◆
                          <strong className="text-slate-900 ml-0.5">{dist.counts[4]}</strong>（高熵{' '}
                          {Math.round((highCount / total) * 100)}%）
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden flex bg-slate-200/70">
                        {dist.counts.map((cnt, idx) => {
                          if (cnt === 0) return null;
                          const pct = (cnt / total) * 100;
                          const bgColors = [
                            'bg-yellow-100',
                            'bg-yellow-400',
                            'bg-orange-400',
                            'bg-blue-600',
                            'bg-cyan-700',
                            'bg-slate-950',
                          ];
                          return (
                            <div
                              key={idx}
                              style={{ width: `${pct}%` }}
                              title={`${CELL_ENERGY_LEVELS[idx].shortLabel}: ${cnt}处`}
                              className={`${bgColors[idx]} h-full transition-all`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {activeCluster.summaryNote}
            </p>
          </div>

          {/* Compact 6-Symbol Legend Matching PDF Footer */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5">
            {CELL_ENERGY_LEVELS.map((lv) => (
              <div key={lv.level} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <CellSymbolGlyph level={lv.level} size={13} />
                <span className={lv.isAbnormalFocus ? 'font-semibold text-slate-900' : ''}>
                  {lv.shortLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Deduplicated Multi-Course D-Value Matrix & Page 60 Food/Mineral Therapy */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3">
            {/* Category Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div
                role="tablist"
                aria-label="体验报告D值分类维度切换"
                className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5 overflow-x-auto no-scrollbar"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'pathology'}
                  onClick={() => setActiveCategory('pathology')}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    activeCategory === 'pathology'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  病理形态 E1–E7 ({report.pathologyItems.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'organ_load'}
                  onClick={() => setActiveCategory('organ_load')}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    activeCategory === 'organ_load'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  组织器官负荷 ({report.organLoadItems.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'microbe'}
                  onClick={() => setActiveCategory('microbe')}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    activeCategory === 'microbe'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  微生态谐振谱 ({report.microbeItems.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'food_mineral'}
                  onClick={() => setActiveCategory('food_mineral')}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors inline-flex items-center gap-1 ${
                    activeCategory === 'food_mineral'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Utensils className="w-3 h-3" />
                  <span>食疗与矿石谱 (P60)</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-num whitespace-nowrap">
                点击行可同步联动中央 3D 器官引线
              </span>
            </div>

            {/* Dual-Scale Anti-Misreading Rule Strip */}
            <div
              className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 flex-wrap ${
                activeCategory === 'food_mineral'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-[#f8fafc] border-[#e2ebf1] text-slate-700'
              }`}
            >
              {activeCategory === 'pathology' && (
                <span>
                  <strong>病理形态标尺（原件P16 · 越高越需关注）：</strong>
                  <span className="font-num">
                    &lt;2.0 低关注(E1–E3) · 2.0–3.99 中等(E4) · 4.0–5.0 中高(E5) ·{' '}
                    <strong className="text-red-600">&gt;5.0 高关注(E6–E7)</strong>
                  </span>
                </span>
              )}
              {activeCategory === 'organ_load' && (
                <span>
                  <strong>组织器官D值标尺（原件P16 · 越高负荷越重）：</strong>
                  <span className="font-num">
                    1.0–1.2 轻度负荷 · 1.2–2.0 中度负荷 ·{' '}
                    <strong className="text-red-600">&gt;2.0 重度负荷</strong>
                  </span>
                </span>
              )}
              {activeCategory === 'microbe' && (
                <span>
                  <strong>微生物谐振标尺（原件P16 · 非核酸确诊）：</strong>
                  <span className="font-num">
                    &lt;0.1 无 · 0.1–0.425 少量 · 0.425–0.759 存在 · 0.759–2.0 明显 ·{' '}
                    <strong className="text-red-600">&gt;2.0 超标预警</strong>
                  </span>
                </span>
              )}
              {activeCategory === 'food_mineral' && (
                <span>
                  <strong>反向契合标尺（原件P60 · 务必区分！）：</strong>
                  食物与矿石疗法为 <strong>D值越低越契合机体频谱</strong>（如黑枣 D=0.003、南瓜 D=0.010 为最高适配食材）
                </span>
              )}
            </div>

            {/* TAB 1: Deduplicated Pathology Morphology E1-E7 Table */}
            {activeCategory === 'pathology' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e8eef3] text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                      <th className="py-2 pr-2.5">去重归并病理项与原PDF页码</th>
                      <th className="py-2 px-2.5 text-right">初检独立基线 (08-23)</th>
                      <th className="py-2 px-2.5 text-right">
                        {effectiveCourseNo === 0
                          ? '第2疗程预期回落'
                          : `${activeStageMeta.stageLabel.slice(0, 5)} D值`}
                      </th>
                      <th className="py-2 pl-2.5">靶向匹配药名与产品品名</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f6]">
                    {report.pathologyItems.map((item) => {
                      const basePt = item.coursePoints[0];
                      const inspectIdx = effectiveCourseNo === 0 ? 2 : effectiveCourseNo;
                      const curPt = item.coursePoints[inspectIdx] ?? item.coursePoints[0];
                      const baseCls = classifyPathologyDValue(basePt.dValue);
                      const curCls = classifyPathologyDValue(curPt.dValue);
                      const dropPct = Math.round(
                        ((curPt.dValue - basePt.dValue) / basePt.dValue) * 100
                      );

                      return (
                        <tr
                          key={item.id}
                          onClick={() => onSelectOrganIn3D(item.organId)}
                          className="hover:bg-[#f4f9fa] cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 pr-2.5 align-top max-w-[270px]">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <OrganIcon
                                organId={item.organId}
                                className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0"
                              />
                              <span>{item.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-num">
                              归并 {item.mergedSlicesCount} 切面 · 原件 {item.pdfPages}
                            </div>
                          </td>

                          <td className="py-2.5 px-2.5 align-top text-right font-num whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              {basePt.dValue.toFixed(3)}
                            </div>
                            <div
                              className={`text-[11px] font-semibold ${
                                baseCls.severity === 'alert'
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {baseCls.grade} {baseCls.attentionLabel}
                            </div>
                          </td>

                          <td className="py-2.5 px-2.5 align-top text-right font-num whitespace-nowrap">
                            <div className="font-extrabold text-slate-900">
                              {curPt.dValue.toFixed(3)}{' '}
                              <span className="text-[11px] font-semibold text-emerald-600">
                                ({dropPct}%)
                              </span>
                            </div>
                            <div
                              className={`text-[11px] font-semibold ${
                                curCls.severity === 'alert'
                                  ? 'text-red-600'
                                  : curCls.severity === 'caution'
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {curCls.grade} {curCls.attentionLabel}
                            </div>
                          </td>

                          <td className="py-2.5 pl-2.5 align-top text-[11px] leading-snug">
                            {item.matchedDrugNames.length > 0 && (
                              <div className="text-slate-700">
                                <strong className="text-indigo-900">药名：</strong>
                                {item.matchedDrugNames.join(' + ')}
                              </div>
                            )}
                            <div className="text-[#0d7a8a] font-medium mt-0.5">
                              <strong>品名：</strong>
                              {item.matchedProductNames.join(' + ')}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Organ & Tissue Functional Load Table */}
            {activeCategory === 'organ_load' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e8eef3] text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                      <th className="py-2 pr-2.5">受损组织器官簇与原PDF溯源</th>
                      <th className="py-2 px-2.5 text-right">初检基线 D值</th>
                      <th className="py-2 px-2.5 text-right">跨疗程复测演进</th>
                      <th className="py-2 pl-2.5">功能解读与靶向产品品名</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f6]">
                    {report.organLoadItems.map((org) => {
                      const basePt = org.coursePoints[0];
                      const c1Pt = org.coursePoints[1];
                      const c2Pt = org.coursePoints[2];
                      const curPt =
                        org.coursePoints[effectiveCourseNo === 0 ? 2 : effectiveCourseNo] ?? c2Pt;
                      const baseCls = classifyOrganTissueDValue(basePt.dValue);
                      const curCls = classifyOrganTissueDValue(curPt.dValue);

                      return (
                        <tr
                          key={org.id}
                          onClick={() => onSelectOrganIn3D(org.organId)}
                          className="hover:bg-[#f4f9fa] cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 pr-2.5 align-top">
                            <div className="font-bold text-slate-900">{org.tissueName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-num">
                              归并 {org.mergedSlicesCount} 切面 · {org.pdfPages}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 align-top text-right font-num whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              {basePt.dValue.toFixed(3)}
                            </div>
                            <div
                              className={`text-[11px] font-semibold ${
                                baseCls.degree === '重' ? 'text-red-600' : 'text-amber-600'
                              }`}
                            >
                              {baseCls.degreeBadge}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 align-top text-right font-num whitespace-nowrap">
                            <div className="text-slate-700">
                              {c1Pt.dValue.toFixed(2)} →{' '}
                              <strong className="text-slate-900 font-extrabold">
                                {c2Pt.dValue.toFixed(3)}
                              </strong>
                            </div>
                            <div
                              className={`text-[11px] font-semibold ${
                                curCls.degree === '轻' || curCls.degree === '正常'
                                  ? 'text-emerald-700'
                                  : 'text-amber-600'
                              }`}
                            >
                              当前：{curCls.degreeBadge}
                            </div>
                          </td>
                          <td className="py-2.5 pl-2.5 align-top max-w-[290px]">
                            <div className="text-[11px] text-slate-600 leading-snug">
                              {org.functionalNote}
                            </div>
                            <div className="text-[11px] font-semibold text-[#0d7a8a] mt-0.5">
                              品名：{org.matchedProductNames.join(' + ')}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: Microbiome & Pathogen Bio-Resonance Signals */}
            {activeCategory === 'microbe' && (
              <div className="space-y-2.5">
                {report.microbeItems.map((mic) => {
                  const basePt = mic.coursePoints[0];
                  const c1Pt = mic.coursePoints[1];
                  const c2Pt = mic.coursePoints[2];
                  const curPt =
                    mic.coursePoints[effectiveCourseNo === 0 ? 2 : effectiveCourseNo] ?? c2Pt;
                  const curCls = classifyMicrobeDValue(curPt.dValue);

                  return (
                    <div
                      key={mic.id}
                      onClick={() => onSelectOrganIn3D(mic.organId)}
                      className="p-3 rounded-xl bg-[#f8fafc] hover:bg-[#f1f7f9] border border-[#e2ebf1] cursor-pointer transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{mic.agentName}</div>
                          <div className="text-[11px] text-slate-500 font-num mt-0.5">
                            检出部位：{mic.ecologicalNiche}（归并 {mic.mergedSlicesCount} 切面 ·{' '}
                            {mic.pdfPages}）
                          </div>
                        </div>

                        <div className="text-right font-num text-xs whitespace-nowrap">
                          <span className="text-red-600 font-bold">
                            初检 {basePt.dValue.toFixed(3)} (超标)
                          </span>
                          <span className="text-slate-300 mx-1.5">→</span>
                          <span className="text-slate-600">{c1Pt.dValue.toFixed(2)}</span>
                          <span className="text-slate-300 mx-1.5">→</span>
                          <strong className="text-emerald-700 font-extrabold">
                            {c2Pt.dValue.toFixed(3)} ({curCls.stateLabel})
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        <span className="text-slate-600">{mic.clinicalVerificationTip}</span>
                        <span className="font-semibold text-[#0d7a8a] whitespace-nowrap">
                          拮抗品名：{mic.matchedProductNames.join(' + ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 4: Page 60 Personalized Low-D Food Therapy & Mineral Resonance */}
            {activeCategory === 'food_mineral' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {report.foodTherapyItems.map((food, idx) => {
                    const fit = classifyFoodTherapyDValue(food.dValue);
                    return (
                      <div
                        key={food.name}
                        className="px-3 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2ebf1] flex items-start justify-between gap-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-num font-bold text-[#0d7a8a]">
                              {String(idx + 1).padStart(2, '0')}.
                            </span>
                            <strong className="font-bold text-slate-900">{food.name}</strong>
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] text-emerald-700 font-medium">
                              {fit.suitabilityLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-700 mt-0.5">
                            {food.targetBenefit}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            老年吃法：{food.elderlyMealTip}
                          </div>
                        </div>
                        <div className="text-right font-num shrink-0">
                          <div className="text-xs font-extrabold text-emerald-700">
                            D={food.dValue.toFixed(3)}
                          </div>
                          <div className="text-[10px] text-slate-400">越低越适合</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mineral Bio-Resonance Reference Row (Page 60 Bottom) */}
                <div className="pt-2.5 border-t border-[#edf2f6] flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0d7a8a]" />
                    <span>原件第 60 页矿石疗法谐振参考（D值由低到高）：</span>
                  </span>
                  <div className="flex items-center gap-3 flex-wrap font-num text-slate-700">
                    {report.mineralItems.map((m, i) => (
                      <React.Fragment key={m.name}>
                        {i > 0 && <span className="text-slate-300">·</span>}
                        <span>
                          <strong className="font-sans text-slate-900">{m.name}</strong> D=
                          {m.dValue.toFixed(3)}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Summary Footer Connecting Experience Report -> Drug + Product + Diet Closed Loop */}
          <div className="pt-3 border-t border-[#edf2f6] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Pill className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
              <span>
                <strong className="text-slate-900">医患沟通金句：</strong>
                用体验报告「6级黑块消退与D值回落」做可视化体感教育，用「药名 + 益生菌产品品名 + 低D值食疗」落实每日三餐依从。
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPdfModalOpen(true)}
              className="text-xs font-semibold text-[#0d7a8a] hover:text-[#096472] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>核对陈小真 60 页原件</span>
            </button>
          </div>
        </div>
      </div>

      {/* In-Page Original 60-Page PDF Source Verification Modal (Zero Auto-Download, Zero window.open) */}
      {pdfModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPdfModalOpen(false);
              setEmbedNativePdf(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="nebula-raw-pdf-modal-title"
        >
          <div className="w-full max-w-5xl h-[88vh] bg-white rounded-2xl border border-[#dce5ec] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 sm:px-5 py-3 border-b border-[#edf2f6] flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h3
                  id="nebula-raw-pdf-modal-title"
                  className="text-sm sm:text-base font-bold text-slate-900 truncate"
                >
                  原版导入文件对照：陈小真 · NebulaByte YSY 健康检测报告（共 60 页）
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap font-num">
                  <span>检测时间：2026/08/23</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium font-sans">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    已完成 49 幅能量截面与 142 条 D 值记录结构化入库
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEmbedNativePdf((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-xs font-semibold text-slate-700 hover:text-[#0d7a8a] transition-colors whitespace-nowrap"
                >
                  {embedNativePdf ? '返回结构化原件章节核对' : '切换浏览器内嵌 PDF 渲染'}
                </button>
                <a
                  href={report.rawPdfPath}
                  download="报告_20260823_121427陈小真.pdf"
                  className="px-3 py-1.5 rounded-xl bg-[#0d7a8a] hover:bg-[#096472] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载 60 页原件</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setPdfModalOpen(false);
                    setEmbedNativePdf(false);
                  }}
                  aria-label="关闭原始PDF报告预览窗口"
                  className="min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {embedNativePdf ? (
              <div className="flex-1 bg-slate-100 relative">
                <iframe
                  src={report.rawPdfPath}
                  title="陈小真 NebulaByte YSY 60页原始检测报告 PDF"
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] space-y-4">
                {/* Chapter 1 & 2: Cover & Disclaimer */}
                <div className="p-4 rounded-xl bg-white border border-[#dce5ec] space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">
                      第 1–2 页：受检者封面信息与生命科学电子设备声明
                    </span>
                    <span className="font-num text-slate-400">PDF P1–P2</span>
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed font-num">
                    姓名：<strong className="text-slate-900 font-sans">陈小真</strong> · 性别：女 · 年龄：74 岁 · 检测日期：2026/8/23 · 报告品牌：云尚云时代生物科技 · AI数智智康 · NebulaByte YSY 健康检测报告。
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    原件第 2 页合规声明摘录：本设备属于生命科学领域的电子评估设备，不作为医疗诊断证明，如身体不适请及时就医结合临床医学检验综合判断。
                  </div>
                </div>

                {/* Chapter 3: Pages 3-15 49 Slices Summary */}
                <div className="p-4 rounded-xl bg-white border border-[#dce5ec] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">
                      第 3–15 页：49 幅器官与细胞超微截面 6 级能量符号图谱
                    </span>
                    <span className="font-num text-slate-400">PDF P3–P15</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    {report.organEnergyClusters.map((cl) => (
                      <div
                        key={cl.id}
                        className="p-3 rounded-xl bg-[#f8fafc] border border-[#e8eef3] space-y-1"
                      >
                        <div className="font-bold text-slate-900 flex items-center justify-between">
                          <span>{cl.title}</span>
                          <span className="text-[11px] font-num text-[#0d7a8a]">{cl.pdfPages}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          包含原始截面：{cl.sliceNames.join('、')}
                        </div>
                        <div className="text-[11px] text-slate-700 font-num">
                          初检 6级黑块(■) {cl.stageDistributions[0].counts[5]} 处 · 5级菱形(◆){' '}
                          {cl.stageDistributions[0].counts[4]} 处
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chapter 4: Pages 16-59 Official D-Value Thresholds & Peak Extracted Rows */}
                <div className="p-4 rounded-xl bg-white border border-[#dce5ec] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">
                      第 16–59 页：D 值官方分级标准与 142 条原始表去重峰值核对
                    </span>
                    <span className="font-num text-slate-400">PDF P16–P59</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-num">
                    {report.pathologyItems.map((p) => (
                      <div
                        key={p.id}
                        className="px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e8eef3] flex items-center justify-between gap-2"
                      >
                        <span className="font-sans font-semibold text-slate-800 truncate">
                          {p.name}（{p.pdfPages}）
                        </span>
                        <span className="text-red-600 font-bold whitespace-nowrap">
                          初检 D={p.coursePoints[0].dValue.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chapter 5: Page 60 Food & Mineral Original Data */}
                <div className="p-4 rounded-xl bg-white border border-[#dce5ec] space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">
                      第 60 页：食物疗法（D值越低越适合）与矿石疗法原始数值表
                    </span>
                    <span className="font-num text-slate-400">PDF P60</span>
                  </div>
                  <div className="text-xs text-slate-700 font-num leading-relaxed">
                    食物前10名：{report.foodTherapyItems.map((f) => `${f.name}(${f.dValue.toFixed(3)})`).join(' · ')}
                  </div>
                  <div className="text-xs text-slate-600 font-num">
                    矿石谐振：{report.mineralItems.map((m) => `${m.name}(${m.dValue.toFixed(3)})`).join(' · ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
