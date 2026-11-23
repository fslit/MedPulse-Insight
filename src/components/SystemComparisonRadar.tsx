import React from 'react';
import {
  Activity,
  Bone,
  Dumbbell,
  HeartPulse,
  Layers,
  PersonStanding,
  Scan,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  BodyVistaLayerKey,
  BodyVistaLayerLevel,
  OrganId,
  OrganRecord,
} from '../utils/healthModel';
import {
  ClinicalComparisonResult,
  computeRadarPolygonPoints,
} from '../utils/clinicalComparison';

export type AnatomyPresetId = 'surface' | 'internal' | 'all';

interface SystemComparisonRadarProps {
  comparison: ClinicalComparisonResult;
  selectedOrgan: OrganId | null;
  onSelectOrgan: (organId: OrganId) => void;
  layers: Record<BodyVistaLayerKey, BodyVistaLayerLevel>;
  onChangeLayer: (key: BodyVistaLayerKey, level: BodyVistaLayerLevel) => void;
  activePreset: AnatomyPresetId;
  onApplyPreset: (preset: AnatomyPresetId) => void;
  visibleStructureCount: number;
  anatomyQuery: string;
  onChangeAnatomyQuery: (q: string) => void;
  matchingOrgans: OrganRecord[];
}

const LAYER_SEGMENT_LABELS: ReadonlyArray<{ level: BodyVistaLayerLevel; label: string }> = [
  { level: 0, label: '隐藏' },
  { level: 1, label: '轮廓' },
  { level: 2, label: '半透' },
  { level: 3, label: '实体' },
];

const BODYVISTA_SYSTEM_ROWS: ReadonlyArray<{
  key: BodyVistaLayerKey;
  label: string;
  icon: 'bone' | 'muscle' | 'skin' | 'vascular' | 'visceral';
}> = [
  { key: 'skeletal', label: '骨与关节', icon: 'bone' },
  { key: 'muscular', label: '肌肉系统', icon: 'muscle' },
  { key: 'skin', label: '体表皮肤', icon: 'skin' },
  { key: 'vascular', label: '心血管系', icon: 'vascular' },
  { key: 'visceral', label: '内脏消化', icon: 'visceral' },
];

export const SystemComparisonRadar: React.FC<SystemComparisonRadarProps> = ({
  comparison,
  selectedOrgan,
  onSelectOrgan,
  layers,
  onChangeLayer,
  activePreset,
  onApplyPreset,
  visibleStructureCount,
  anatomyQuery,
  onChangeAnatomyQuery,
  matchingOrgans,
}) => {
  const cx = 138;
  const cy = 122;
  const maxR = 76;
  const systems = comparison.radarSystems;
  const n = systems.length;

  const currentPts = computeRadarPolygonPoints(
    systems.map((s) => s.currentScore),
    cx,
    cy,
    maxR
  );
  const referencePts = computeRadarPolygonPoints(
    systems.map((s) => s.referenceScore),
    cx,
    cy,
    maxR
  );

  const isTargetMode = comparison.mode === 'target_12w';
  const refStroke = isTargetMode ? '#059669' : '#94a3b8';
  const refFill = isTargetMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(148, 163, 184, 0.12)';

  const improvedSystems = systems.filter((s) => s.deltaScore > 0).length;
  const focusSystems = systems.filter((s) => s.severity !== 'normal').length;

  return (
    <aside
      aria-label="八维系统对比雷达与解剖分层控制台"
      className="hidden xl:flex bg-white border border-[#dce5ec] rounded-2xl p-3.5 flex-col justify-start gap-3"
    >
      {/* Top Section: Dual-Polygon 8-System Clinical Comparison Radar */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#edf2f6]">
          <h2 className="text-sm font-bold text-slate-900 whitespace-nowrap">
            八维系统评分对比
          </h2>
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            点击定位3D器官
          </span>
        </div>

        {/* Clean Unboxed Legend */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 mt-1.5 mb-0.5 font-num">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-0.5 bg-[#0d7a8a] inline-block" aria-hidden="true" />
            <span>
              {comparison.courseMeta
                ? `${comparison.courseMeta.activeCourse.courseLabel} (${comparison.currentScore}分)`
                : `本期 (${comparison.currentScore}分)`}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-2.5 h-0.5 border-t-2 border-dashed inline-block"
              style={{ borderColor: refStroke }}
              aria-hidden="true"
            />
            <span className="truncate max-w-[136px]">
              {comparison.referenceLabel} ({comparison.referenceScore}分)
            </span>
          </span>
        </div>

        {/* Interactive SVG 8-Axis Radar */}
        <div className="relative w-full h-[218px] select-none">
          <svg
            viewBox="0 0 276 244"
            className="w-full h-full overflow-visible"
            role="img"
            aria-label="八大系统本期与对比期评分雷达图"
          >
            {/* Concentric Octagon Rings (65, 80, 95) */}
            {[65, 80, 95].map((lvl) => {
              const ringPts = computeRadarPolygonPoints(
                new Array(n).fill(lvl),
                cx,
                cy,
                maxR
              );
              return (
                <polygon
                  key={lvl}
                  points={ringPts}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={lvl === 80 ? '2 2' : undefined}
                />
              );
            })}

            {/* Radial Spokes */}
            {systems.map((sys, idx) => {
              const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / n;
              const x2 = cx + Math.cos(angle) * maxR;
              const y2 = cy + Math.sin(angle) * maxR;
              return (
                <line
                  key={sys.organId}
                  x1={cx}
                  y1={cy}
                  x2={x2}
                  y2={y2}
                  stroke="#e8eef3"
                  strokeWidth="1"
                />
              );
            })}

            {/* Reference Baseline / 12-Week Target Polygon */}
            <polygon
              points={referencePts}
              fill={refFill}
              stroke={refStroke}
              strokeWidth="1.6"
              strokeDasharray="4 3"
            />

            {/* Current Active Report Polygon */}
            <polygon
              points={currentPts}
              fill="rgba(13, 122, 138, 0.16)"
              stroke="#0d7a8a"
              strokeWidth="2.1"
            />

            {/* Vertices & Interactive Axis Labels */}
            {systems.map((sys, idx) => {
              const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / n;
              const curNorm = 0.18 + ((Math.min(100, Math.max(50, sys.currentScore)) - 50) / 50) * 0.82;
              const vx = cx + Math.cos(angle) * (curNorm * maxR);
              const vy = cy + Math.sin(angle) * (curNorm * maxR);

              const labelR = maxR + 24;
              const lx = cx + Math.cos(angle) * labelR;
              const ly = cy + Math.sin(angle) * labelR;

              const isSelected = selectedOrgan === sys.organId;
              const dotColor =
                sys.severity === 'alert'
                  ? '#dc2626'
                  : sys.severity === 'caution'
                  ? '#d97706'
                  : '#0d7a8a';

              const anchor =
                Math.abs(Math.cos(angle)) < 0.22
                  ? 'middle'
                  : Math.cos(angle) > 0
                  ? 'start'
                  : 'end';

              const textX =
                anchor === 'start' ? lx - 4 : anchor === 'end' ? lx + 4 : lx;

              const deltaStr =
                sys.deltaScore > 0
                  ? `+${sys.deltaScore}`
                  : sys.deltaScore < 0
                  ? `${sys.deltaScore}`
                  : '0';

              return (
                <g
                  key={sys.organId}
                  className="cursor-pointer"
                  onClick={() => onSelectOrgan(sys.organId)}
                >
                  {isSelected && (
                    <circle
                      cx={vx}
                      cy={vy}
                      r={7}
                      fill="rgba(13, 122, 138, 0.22)"
                    />
                  )}
                  <circle
                    cx={vx}
                    cy={vy}
                    r={isSelected ? 4.4 : 3.4}
                    fill="#ffffff"
                    stroke={dotColor}
                    strokeWidth="2.2"
                  />
                  <text
                    x={textX}
                    y={ly - 2}
                    textAnchor={anchor}
                    fontSize="11"
                    fontWeight={isSelected ? '700' : '600'}
                    fill={isSelected ? '#0d7a8a' : '#1e293b'}
                  >
                    {sys.name}
                  </text>
                  <text
                    x={textX}
                    y={ly + 10}
                    textAnchor={anchor}
                    fontSize="10"
                    className="font-num"
                    fill={
                      sys.severity === 'alert'
                        ? '#dc2626'
                        : sys.severity === 'caution'
                        ? '#b45309'
                        : '#64748b'
                    }
                  >
                    {sys.currentScore}分({deltaStr})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Accessible Keyboard Button Strip for Radar Systems */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          {systems.map((sys) => {
            const active = selectedOrgan === sys.organId;
            const warn = sys.severity !== 'normal';
            return (
              <button
                key={sys.organId}
                type="button"
                onClick={() => onSelectOrgan(sys.organId)}
                aria-label={`定位${sys.name}（本期${sys.currentScore}分）`}
                className={`py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap truncate border ${
                  active
                    ? 'bg-[#eaf5f7] border-[#0d7a8a] text-[#0d7a8a] font-bold'
                    : warn
                    ? 'bg-amber-50/60 border-amber-200/80 text-amber-800 hover:border-amber-400'
                    : 'bg-[#f8fafc] border-[#e2e8f0] text-slate-700 hover:border-[#8ac6d1]'
                }`}
              >
                {sys.name} <span className="font-num">{sys.currentScore}</span>
              </button>
            );
          })}
        </div>
        {/* Concise System Summary Line */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-num">
          <span>
            {isTargetMode
              ? `12周预期提升 ${systems.filter((s) => s.deltaScore < 0).length} 个系统`
              : `较对比期改善 ${improvedSystems} 个系统`}
          </span>
          <span className="text-amber-700 font-medium">重点关注 {focusSystems} 个系统</span>
        </div>
      </div>

      {/* Bottom Section: BodyVista Anatomical Layer Peeling Controls (Single Card Divider, Zero Nesting) */}
      <div className="pt-2.5 border-t border-[#dce5ec] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">解剖分层透视</span>
          <span className="text-[11px] font-num text-slate-500">
            {visibleStructureCount} / 2900 结构
          </span>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <label htmlFor="bodyvista-organ-search" className="sr-only">
            查找解剖器官或指标
          </label>
          <Search
            className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="bodyvista-organ-search"
            type="text"
            value={anatomyQuery}
            onChange={(e) => onChangeAnatomyQuery(e.target.value)}
            placeholder="快速定位器官或指标（如：肝脏）"
            className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
          />
          {anatomyQuery && (
            <button
              type="button"
              onClick={() => onChangeAnatomyQuery('')}
              aria-label="清空查找关键词"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {anatomyQuery.trim() !== '' && (
          <div className="bg-[#f8fafc] border border-[#dce5ec] rounded-lg p-1 divide-y divide-slate-200/60">
            {matchingOrgans.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-slate-500">未找到匹配器官或指标</div>
            ) : (
              matchingOrgans.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    onSelectOrgan(org.id);
                    onChangeAnatomyQuery('');
                  }}
                  className="w-full px-2 py-1.5 flex items-center justify-between text-left text-xs hover:bg-white rounded transition-colors"
                >
                  <span className="font-semibold text-slate-800">
                    {org.name} · {org.systemName}
                  </span>
                  <span className="text-[#0d7a8a] font-medium">{org.statusLabel}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* 3 BodyVista Layer Presets: 骨骼与体表 | 内部器官 | 全部系统 */}
        <div className="grid grid-cols-3 gap-1 bg-[#edf2f6] p-1 rounded-xl border border-[#dce5ec]">
          <button
            type="button"
            onClick={() => onApplyPreset('surface')}
            className={`py-1.5 px-1.5 rounded-lg inline-flex items-center justify-center gap-1 text-[11px] transition-colors whitespace-nowrap ${
              activePreset === 'surface'
                ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <PersonStanding className="w-3.5 h-3.5 shrink-0" />
            <span>骨骼与体表</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('internal')}
            className={`py-1.5 px-1.5 rounded-lg inline-flex items-center justify-center gap-1 text-[11px] transition-colors whitespace-nowrap ${
              activePreset === 'internal'
                ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <Scan className="w-3.5 h-3.5 shrink-0" />
            <span>内部器官</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('all')}
            className={`py-1.5 px-1.5 rounded-lg inline-flex items-center justify-center gap-1 text-[11px] transition-colors whitespace-nowrap ${
              activePreset === 'all'
                ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>全部系统</span>
          </button>
        </div>

        {/* Compact Single-Line 5-System Peeling Matrix */}
        <div className="space-y-1.5">
          {BODYVISTA_SYSTEM_ROWS.map((sys) => {
            const activeLevel = layers[sys.key];
            return (
              <div
                key={sys.key}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium whitespace-nowrap shrink-0">
                  {sys.icon === 'bone' && <Bone className="w-3.5 h-3.5 text-[#0d7a8a]" />}
                  {sys.icon === 'muscle' && <Dumbbell className="w-3.5 h-3.5 text-[#0d7a8a]" />}
                  {sys.icon === 'skin' && <Sparkles className="w-3.5 h-3.5 text-[#0d7a8a]" />}
                  {sys.icon === 'vascular' && <HeartPulse className="w-3.5 h-3.5 text-[#0d7a8a]" />}
                  {sys.icon === 'visceral' && <Activity className="w-3.5 h-3.5 text-[#0d7a8a]" />}
                  <span>{sys.label}</span>
                </span>

                <div
                  role="group"
                  aria-label={`${sys.label}显示模式`}
                  className="bg-[#edf2f6] rounded-lg p-0.5 grid grid-cols-4 gap-0.5 w-[166px] shrink-0"
                >
                  {LAYER_SEGMENT_LABELS.map((seg) => {
                    const isSelected = activeLevel === seg.level;
                    return (
                      <button
                        key={seg.level}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onChangeLayer(sys.key, seg.level)}
                        className={`py-1 rounded-md text-[11px] transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {seg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
