import React, { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { MEDICAL_IMAGING_ITEMS, MedicalImagingItem, OrganId } from '../utils/healthModel';

interface MedicalImagingSectionProps {
  onSelectOrgan: (organId: OrganId) => void;
  embedded?: boolean;
}

function drawImagingCanvas(canvas: HTMLCanvasElement, type: MedicalImagingItem['id']) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  let seed = type === 'liver-us' ? 42 : type === 'gastroscopy' ? 137 : 293;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  if (type === 'liver-us') {
    ctx.fillStyle = '#091422';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 8);
    ctx.arc(w * 0.5, 8, h * 0.94, Math.PI * 0.22, Math.PI * 0.78);
    ctx.closePath();
    ctx.clip();

    const grad = ctx.createRadialGradient(w * 0.48, h * 0.45, 10, w * 0.5, h * 0.52, w * 0.55);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.32, '#0284c7');
    grad.addColorStop(0.75, '#0f2c4c');
    grad.addColorStop(1, '#091422');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(6, 18, 36, 0.72)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.34, h * 0.62);
    ctx.quadraticCurveTo(w * 0.48, h * 0.48, w * 0.66, h * 0.56);
    ctx.stroke();

    for (let i = 0; i < 110; i++) {
      const x = w * 0.18 + rand() * w * 0.64;
      const y = h * 0.18 + rand() * h * 0.72;
      const r = 0.7 + rand() * 1.6;
      ctx.fillStyle = rand() > 0.35 ? 'rgba(186, 230, 253, 0.55)' : 'rgba(253, 224, 71, 0.55)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 8);
    ctx.arc(w * 0.5, 8, h * 0.94, Math.PI * 0.22, Math.PI * 0.78);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'gastroscopy') {
    ctx.fillStyle = '#120a10';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(18, 8, w - 36, h - 16, 24);
    ctx.clip();

    const grad = ctx.createRadialGradient(w * 0.58, h * 0.42, 8, w * 0.5, h * 0.5, w * 0.48);
    grad.addColorStop(0, '#1f080d');
    grad.addColorStop(0.24, '#7f1d1d');
    grad.addColorStop(0.62, '#dc2626');
    grad.addColorStop(0.88, '#f87171');
    grad.addColorStop(1, '#450a0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(254, 202, 202, 0.34)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(28, 22 + i * 21);
      ctx.bezierCurveTo(w * 0.36, 12 + i * 20, w * 0.64, 34 + i * 18, w - 28, 20 + i * 21);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(w * 0.34, h * 0.46, 56, 34);
    ctx.restore();
  } else {
    ctx.fillStyle = '#120a10';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(18, 8, w - 36, h - 16, 24);
    ctx.clip();

    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 6, w * 0.5, h * 0.5, w * 0.46);
    grad.addColorStop(0, '#1a0608');
    grad.addColorStop(0.32, '#881337');
    grad.addColorStop(0.68, '#e11d48');
    grad.addColorStop(0.92, '#fb7185');
    grad.addColorStop(1, '#4c0519');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(254, 205, 211, 0.28)';
    ctx.lineWidth = 2.5;
    [18, 32, 48, 66].forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.5, r * 1.15, r * 0.88, 0.12, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }
}

export const MedicalImagingSection: React.FC<MedicalImagingSectionProps> = ({
  onSelectOrgan,
  embedded = false,
}) => {
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    MEDICAL_IMAGING_ITEMS.forEach((item) => {
      const el = canvasRefs.current[item.id];
      if (el) drawImagingCanvas(el, item.id);
    });
  }, []);

  const gridMarkup = (
    <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 sm:pb-0">
      {MEDICAL_IMAGING_ITEMS.map((item) => {
        const isWarn = item.severity !== 'normal';
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectOrgan(item.organId)}
            aria-label={`查看 ${item.title} 影像关联器官详情`}
            className="group text-left min-w-[208px] sm:min-w-0 shrink-0 snap-start bg-[#f8fafc] border border-[#dce5ec] hover:border-[#0d7a8a] hover:bg-white rounded-xl overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7a8a]"
          >
            <div className="relative h-28 bg-[#091422] overflow-hidden border-b border-[#dce5ec]">
              <canvas
                ref={(el) => {
                  canvasRefs.current[item.id] = el;
                }}
                width={240}
                height={124}
                className="w-full h-full block object-cover"
              />
              <span className="absolute bottom-1.5 right-2 text-[10px] font-num text-white/95 bg-slate-900/75 px-1.5 py-0.5 rounded">
                置信度 {item.aiConfidence}
              </span>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-900 group-hover:text-[#0d7a8a] transition-colors whitespace-nowrap">
                  {item.title}
                </span>
                <span
                  className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                    isWarn ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {item.statusLabel}
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.finding}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>{item.modality}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0d7a8a] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  if (embedded) {
    return gridMarkup;
  }

  return (
    <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4 mb-3.5">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <h2 className="text-base font-bold text-slate-900">关键检查影像</h2>
          <span className="text-xs text-slate-500">点击卡片可在 3D 人体唤出关联器官引线</span>
        </div>
        <span className="text-xs text-slate-500 font-num whitespace-nowrap shrink-0">3 份归档</span>
      </div>
      {gridMarkup}
    </div>
  );
};
