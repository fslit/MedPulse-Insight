import React from 'react';
import { Layers, RotateCcw, Scissors, Sparkles } from 'lucide-react';
import {
  BodyVistaAxis,
  BodyVistaLayerKey,
  BodyVistaLayerLevel,
} from '../utils/healthModel';

export type OrientationPreset = 'front' | 'back' | 'left' | 'right';

interface BodyVistaWorkbenchProps {
  open: boolean;
  layers: Record<BodyVistaLayerKey, BodyVistaLayerLevel>;
  onChangeLayer: (key: BodyVistaLayerKey, level: BodyVistaLayerLevel) => void;
  sectionAxis: BodyVistaAxis;
  onChangeSectionAxis: (axis: BodyVistaAxis) => void;
  sectionPercent: number;
  onChangeSectionPercent: (val: number) => void;
  explodePercent: number;
  onChangeExplodePercent: (val: number) => void;
  flowParticles: boolean;
  onToggleFlowParticles: () => void;
  dimSurrounding: boolean;
  onToggleDimSurrounding: () => void;
  onSelectOrientation: (preset: OrientationPreset) => void;
  onResetWorkbench: () => void;
}

const LAYER_ITEMS: ReadonlyArray<{ key: BodyVistaLayerKey; label: string }> = [
  { key: 'skin', label: '体表' },
  { key: 'muscular', label: '肌肉' },
  { key: 'skeletal', label: '骨骼' },
  { key: 'vascular', label: '血管' },
  { key: 'visceral', label: '内脏' },
];

const LEVEL_NAMES: ReadonlyArray<string> = ['隐藏', '轮廓', '半透明', '实体'];

const AXIS_ITEMS: ReadonlyArray<{ id: BodyVistaAxis; label: string }> = [
  { id: 'y', label: '横断 Y' },
  { id: 'x', label: '矢状 X' },
  { id: 'z', label: '冠状 Z' },
];

const ORIENTATION_ITEMS: ReadonlyArray<{ id: OrientationPreset; label: string }> = [
  { id: 'front', label: '前视' },
  { id: 'back', label: '后视' },
  { id: 'left', label: '左视' },
  { id: 'right', label: '右视' },
];

export const BodyVistaWorkbench: React.FC<BodyVistaWorkbenchProps> = ({
  open,
  layers,
  onChangeLayer,
  sectionAxis,
  onChangeSectionAxis,
  sectionPercent,
  onChangeSectionPercent,
  explodePercent,
  onChangeExplodePercent,
  flowParticles,
  onToggleFlowParticles,
  dimSurrounding,
  onToggleDimSurrounding,
  onSelectOrientation,
  onResetWorkbench,
}) => {
  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="BodyVista 三维解剖控制面板"
      className="relative z-20 bg-[#f8fafc] border-t border-[#dce5ec] px-3.5 py-3 space-y-2.5"
    >
      {/* Row 1: BodyVista 4-Step System Layer Peeling + Quick Orientation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0d7a8a] mr-1 whitespace-nowrap">
            <Layers className="w-3.5 h-3.5" />
            系统分层
          </span>

          {LAYER_ITEMS.map((item) => {
            const currentLevel = layers[item.key];
            return (
              <div
                key={item.key}
                className="inline-flex items-center gap-1 bg-white border border-[#dce5ec] rounded-lg px-2 py-1"
              >
                <span className="text-[11px] text-slate-700 font-medium whitespace-nowrap">
                  {item.label}
                </span>
                <div className="inline-flex items-center gap-0.5" role="group" aria-label={`${item.label}透明度层级`}>
                  {([0, 1, 2, 3] as const).map((lvl) => {
                    const isOn = currentLevel === lvl;
                    const isFilled = lvl <= currentLevel && currentLevel > 0;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        aria-pressed={isOn}
                        aria-label={`${item.label}设为${LEVEL_NAMES[lvl]}`}
                        onClick={() => onChangeLayer(item.key, lvl)}
                        className={`w-4 h-4 rounded text-[10px] font-num leading-none flex items-center justify-center transition-colors ${
                          isOn
                            ? 'bg-[#0d7a8a] text-white font-bold'
                            : isFilled
                            ? 'bg-[#e2f2f5] text-[#0d7a8a]'
                            : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Anatomical Upright View Presets */}
        <div className="inline-flex items-center gap-1 bg-[#edf2f6] border border-[#dce5ec] rounded-lg p-0.5">
          {ORIENTATION_ITEMS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelectOrientation(o.id)}
              className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 hover:text-[#0d7a8a] hover:bg-white transition-colors whitespace-nowrap"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Cross-Section Slicing (X/Y/Z) + Radial Explode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-center pt-1.5 border-t border-[#e2e8f0]">
        {/* Section Plane Controls */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 whitespace-nowrap shrink-0">
            <Scissors className="w-3.5 h-3.5 text-[#0d7a8a]" />
            剖切
          </span>

          <div className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-lg p-0.5 shrink-0">
            {AXIS_ITEMS.map((ax) => {
              const active = sectionAxis === ax.id;
              return (
                <button
                  key={ax.id}
                  type="button"
                  onClick={() => onChangeSectionAxis(ax.id)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white text-[#0d7a8a] font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ax.label}
                </button>
              );
            })}
          </div>

          <input
            id="bodyvista-section-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={sectionPercent}
            aria-label="解剖剖切深度百分比"
            onChange={(e) => onChangeSectionPercent(Number(e.target.value))}
            className="flex-1 min-w-[56px] accent-[#0d7a8a] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <span className="text-[11px] font-num font-semibold text-[#0d7a8a] w-9 text-right shrink-0">
            {sectionPercent}%
          </span>
        </div>

        {/* Radial Explode Controls */}
        <div className="flex items-center gap-2 min-w-0">
          <label
            htmlFor="bodyvista-explode-slider"
            className="text-[11px] font-semibold text-slate-700 whitespace-nowrap shrink-0"
          >
            结构拆解
          </label>
          <input
            id="bodyvista-explode-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={explodePercent}
            aria-label="器官结构拆解百分比"
            onChange={(e) => onChangeExplodePercent(Number(e.target.value))}
            className="flex-1 min-w-[56px] accent-[#0d7a8a] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <span className="text-[11px] font-num font-semibold text-[#0d7a8a] w-9 text-right shrink-0">
            {explodePercent}%
          </span>
        </div>
      </div>

      {/* Row 3: Physiological Flow + Surround Isolation + Reset + Attribution */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#e2e8f0]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            aria-pressed={flowParticles}
            onClick={onToggleFlowParticles}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 border transition-colors whitespace-nowrap ${
              flowParticles
                ? 'bg-[#e2f2f5] border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                : 'bg-white border-[#dce5ec] text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            生命律动
          </button>

          <button
            type="button"
            aria-pressed={dimSurrounding}
            onClick={onToggleDimSurrounding}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors whitespace-nowrap ${
              dimSurrounding
                ? 'bg-[#e2f2f5] border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                : 'bg-white border-[#dce5ec] text-slate-600 hover:text-slate-900'
            }`}
          >
            淡化周围
          </button>

          <button
            type="button"
            onClick={onResetWorkbench}
            aria-label="复位解剖剖切与图层参数"
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 bg-white hover:bg-[#eaf5f7] border border-[#dce5ec] text-slate-700 hover:text-[#0d7a8a] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            复位
          </button>
        </div>

        <span className="text-[11px] text-slate-500">
          三维解剖模型源自 BodyVista (BodyParts3D / Z-Anatomy)
        </span>
      </div>
    </div>
  );
};
