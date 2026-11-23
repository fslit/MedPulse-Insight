import React, { useEffect } from 'react';
import {
  Activity,
  Bone,
  BookmarkCheck,
  BookmarkPlus,
  Calendar,
  Check,
  Dumbbell,
  FileCheck2,
  HeartPulse,
  Layers,
  PersonStanding,
  Scan,
  Sparkles,
  X,
} from 'lucide-react';
import {
  BodyVistaLayerKey,
  BodyVistaLayerLevel,
  ORGAN_RECORDS,
  OrganId,
  OrganRecord,
} from '../utils/healthModel';
import { ManagedTaskItem } from '../utils/clinicalWorkflow';
import {
  DefaultOrganProtocol,
  getDefaultProtocolsForOrgan,
} from '../utils/defaultProtocols';
import { OrganIcon } from './OrganIcons';

export type ModalState =
  | { type: 'closed' }
  | { type: 'organ'; organId: OrganId }
  | { type: 'task'; taskId: string }
  | { type: 'ai-summary' }
  | { type: 'booking' }
  | { type: 'anatomy-systems' };

interface DetailSheetModalProps {
  modal: ModalState;
  onClose: () => void;
  organRecords?: Record<OrganId, OrganRecord>;
  healthScore?: number;
  followedOrgans: OrganId[];
  onToggleFollowOrgan: (organId: OrganId) => void;
  managedTasks: ManagedTaskItem[];
  onToggleTaskCheckIn: (taskId: string) => void;
  projectedScore: number;
  bookingSubmitted: boolean;
  bookingDate: string;
  onChangeBookingDate: (date: string) => void;
  onSubmitBooking: (e: React.FormEvent) => void;
  layers?: Record<BodyVistaLayerKey, BodyVistaLayerLevel>;
  onChangeLayer?: (key: BodyVistaLayerKey, level: BodyVistaLayerLevel) => void;
  activePreset?: 'surface' | 'internal' | 'all';
  onApplyPreset?: (preset: 'surface' | 'internal' | 'all') => void;
  onApplyDefaultProtocol?: (protocol: DefaultOrganProtocol) => void;
  onJumpToRecoveryCase?: (organId: OrganId) => void;
}

const SYSTEM_SHEET_ROWS: ReadonlyArray<{
  key: BodyVistaLayerKey;
  label: string;
  icon: 'bone' | 'muscle' | 'skin' | 'vascular' | 'visceral';
}> = [
  { key: 'skeletal', label: '骨与关节', icon: 'bone' },
  { key: 'muscular', label: '肌肉系统', icon: 'muscle' },
  { key: 'skin', label: '体表与皮肤', icon: 'skin' },
  { key: 'vascular', label: '心血管系统', icon: 'vascular' },
  { key: 'visceral', label: '内脏与消化', icon: 'visceral' },
];

const LEVEL_SEGMENTS: ReadonlyArray<{ level: BodyVistaLayerLevel; label: string }> = [
  { level: 0, label: '隐藏' },
  { level: 1, label: '轮廓' },
  { level: 2, label: '半透明' },
  { level: 3, label: '实体' },
];

export const DetailSheetModal: React.FC<DetailSheetModalProps> = ({
  modal,
  onClose,
  organRecords = ORGAN_RECORDS,
  healthScore = 86,
  followedOrgans,
  onToggleFollowOrgan,
  managedTasks,
  onToggleTaskCheckIn,
  projectedScore,
  bookingSubmitted,
  bookingDate,
  onChangeBookingDate,
  onSubmitBooking,
  layers,
  onChangeLayer,
  activePreset = 'all',
  onApplyPreset,
  onApplyDefaultProtocol,
  onJumpToRecoveryCase,
}) => {
  useEffect(() => {
    if (modal.type === 'closed') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal.type, onClose]);

  if (modal.type === 'closed') return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-sheet-title"
    >
      <div className="w-full md:max-w-lg bg-white border-t md:border border-[#dce5ec] rounded-t-3xl md:rounded-2xl px-4 pt-2.5 pb-6 sm:p-6 shadow-2xl max-h-[86vh] overflow-y-auto text-slate-900">
        {/* Mini-Program Bottom Sheet Drag Handle Affordance */}
        <div
          className="md:hidden w-10 h-1.5 rounded-full bg-slate-300 mx-auto my-2"
          aria-hidden="true"
        />

        {modal.type === 'anatomy-systems' && layers && onChangeLayer && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div>
                <h3 id="detail-sheet-title" className="text-base sm:text-lg font-bold text-slate-900">
                  人体解剖系统分层控制
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  切换骨骼、肌肉、血管与内脏透明度，实时查看三维内部结构
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭解剖系统抽屉"
                className="min-w-[44px] min-h-[44px] -mr-1.5 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {onApplyPreset && (
              <div className="grid grid-cols-3 gap-2 pb-3.5 mb-3.5 border-b border-[#e8eef3]">
                <button
                  type="button"
                  onClick={() => onApplyPreset('surface')}
                  className={`min-h-[52px] px-2 py-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs transition-all active:scale-[0.98] ${
                    activePreset === 'surface'
                      ? 'bg-[#eaf5f7] text-[#0d7a8a] font-bold border border-[#9fd0d9]'
                      : 'bg-[#f8fafc] text-slate-700 border border-[#dce5ec]'
                  }`}
                >
                  <PersonStanding className="w-4 h-4 text-[#0d7a8a]" />
                  <span>骨骼与体表</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApplyPreset('internal')}
                  className={`min-h-[52px] px-2 py-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs transition-all active:scale-[0.98] ${
                    activePreset === 'internal'
                      ? 'bg-[#eaf5f7] text-[#0d7a8a] font-bold border border-[#9fd0d9]'
                      : 'bg-[#f8fafc] text-slate-700 border border-[#dce5ec]'
                  }`}
                >
                  <Scan className="w-4 h-4 text-[#0d7a8a]" />
                  <span>内部器官</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApplyPreset('all')}
                  className={`min-h-[52px] px-2 py-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs transition-all active:scale-[0.98] ${
                    activePreset === 'all'
                      ? 'bg-[#eaf5f7] text-[#0d7a8a] font-bold border border-[#9fd0d9]'
                      : 'bg-[#f8fafc] text-slate-700 border border-[#dce5ec]'
                  }`}
                >
                  <Layers className="w-4 h-4 text-[#0d7a8a]" />
                  <span>全部系统</span>
                </button>
              </div>
            )}

            <div className="space-y-3 mb-5">
              {SYSTEM_SHEET_ROWS.map((sys) => {
                const activeLevel = layers[sys.key];
                return (
                  <div key={sys.key} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      {sys.icon === 'bone' && <Bone className="w-4 h-4 text-[#0d7a8a]" />}
                      {sys.icon === 'muscle' && <Dumbbell className="w-4 h-4 text-[#0d7a8a]" />}
                      {sys.icon === 'skin' && <Sparkles className="w-4 h-4 text-[#0d7a8a]" />}
                      {sys.icon === 'vascular' && <HeartPulse className="w-4 h-4 text-[#0d7a8a]" />}
                      {sys.icon === 'visceral' && <Activity className="w-4 h-4 text-[#0d7a8a]" />}
                      <span>{sys.label}</span>
                    </div>

                    <div
                      role="group"
                      aria-label={`${sys.label}显示层级`}
                      className="bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-1 grid grid-cols-4 gap-1"
                    >
                      {LEVEL_SEGMENTS.map((seg) => {
                        const selected = activeLevel === seg.level;
                        return (
                          <button
                            key={seg.level}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onChangeLayer(sys.key, seg.level)}
                            className={`min-h-[38px] rounded-lg text-xs transition-all active:scale-[0.97] whitespace-nowrap ${
                              selected
                                ? 'bg-white text-[#0d7a8a] font-bold border border-[#cfe0e6] shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 border border-transparent'
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

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] px-4 rounded-xl text-sm font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white active:scale-[0.98] transition-all"
            >
              完成并返回 3D 解剖视图
            </button>
          </div>
        )}

        {modal.type === 'organ' && (() => {
          const organ = organRecords[modal.organId];
          const isFollowed = followedOrgans.includes(organ.id);
          const statusColor =
            organ.severity === 'alert'
              ? 'text-red-600'
              : organ.severity === 'caution'
              ? 'text-amber-700'
              : 'text-emerald-700';

          return (
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                      organ.severity === 'alert'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : organ.severity === 'caution'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-[#eaf5f7] border-[#b5dce3] text-[#0d7a8a]'
                    }`}
                  >
                    <OrganIcon organId={organ.id} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 id="detail-sheet-title" className="text-lg font-bold text-slate-900">
                      {organ.name}专项评估
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{organ.systemName}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${statusColor}`}>{organ.statusLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-num text-slate-800 font-semibold">{organ.score} 分</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭详情弹窗"
                  className="min-w-[44px] min-h-[44px] -mr-1.5 -mt-1 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mb-4">{organ.summary}</p>

              {/* Clinical Key-Value Metrics */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {organ.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="bg-[#f8fafc] border border-[#dce5ec] rounded-2xl p-3"
                  >
                    <span className="block text-xs text-slate-500">{m.label}</span>
                    <strong
                      className={`block text-sm font-bold font-num mt-1 ${
                        m.abnormal ? 'text-amber-700' : 'text-slate-900'
                      }`}
                    >
                      {m.value}
                    </strong>
                    <span className="block text-[11px] text-slate-500 font-num mt-0.5">
                      参考值 {m.reference}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actionable Medical Advice */}
              <div className="bg-[#eaf5f7] border border-[#b5dce3] rounded-2xl p-3.5 text-xs text-slate-800 leading-relaxed mb-3.5">
                <strong className="text-[#0d7a8a] font-semibold">健康干预建议：</strong>
                {organ.advice}
              </div>

              {/* Matched Clinic Default Organ Recovery Protocol */}
              {(() => {
                const organProtocols = getDefaultProtocolsForOrgan(organ.id);
                const primaryProto = organProtocols[0];
                if (!primaryProto) return null;
                const alreadyAdded = managedTasks.some(
                  (t) => t.templateId === primaryProto.id
                );

                return (
                  <div className="bg-[#f8fafc] border border-[#dce5ec] rounded-2xl p-3.5 space-y-2 text-xs mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        系统默认功能恢复方案 · {primaryProto.organTitle.split('（')[0]}
                      </span>
                      <span className="font-num text-[#0d7a8a] font-semibold whitespace-nowrap">
                        {primaryProto.courseDays}天/疗程 · {primaryProto.recommendedCoursesLabel}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      <strong className="text-amber-700 font-semibold">症状与痛点：</strong>
                      {primaryProto.painPoints}
                    </p>
                    <p className="text-slate-800 leading-relaxed font-num">
                      <strong className="text-[#0d7a8a] font-semibold font-sans">默认组方：</strong>
                      {primaryProto.recoverySchemeText}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-emerald-700 font-medium truncate">
                        解决点：{primaryProto.resolutionPoints}
                      </span>
                      {onJumpToRecoveryCase ? (
                        <button
                          type="button"
                          onClick={() => onJumpToRecoveryCase(organ.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors bg-[#0d7a8a] hover:bg-[#096472] text-white"
                        >
                          对照对应疗程康复案例
                        </button>
                      ) : (
                        onApplyDefaultProtocol && (
                          <button
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => onApplyDefaultProtocol(primaryProto)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                              alreadyAdded
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default'
                                : 'bg-[#0d7a8a] hover:bg-[#096472] text-white'
                            }`}
                          >
                            {alreadyAdded ? '已纳入本疗程' : '套用该默认方案'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleFollowOrgan(organ.id)}
                  className={`flex-1 min-h-[48px] px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap ${
                    isFollowed
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                      : 'bg-[#0d7a8a] hover:bg-[#096472] text-white'
                  }`}
                >
                  {isFollowed ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      已加入重点随访
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" />
                      加入复查重点随访
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] px-5 rounded-xl text-sm font-medium bg-[#f8fafc] hover:bg-slate-100 border border-[#dce5ec] text-slate-700 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  完成
                </button>
              </div>
            </div>
          );
        })()}

        {modal.type === 'task' && (() => {
          const plan =
            managedTasks.find((p) => p.id === modal.taskId) ?? managedTasks[0];
          if (!plan) return null;
          const isCompleted = plan.completedByPatient;

          return (
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 id="detail-sheet-title" className="text-lg font-bold text-slate-900">
                    {plan.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    <span className="text-[#0d7a8a] font-semibold">{plan.frequency}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-medium">{plan.targetTag}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-num">预计提升 +{plan.scoreGain} 分</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭方案弹窗"
                  className="min-w-[44px] min-h-[44px] -mr-1.5 -mt-1 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mb-4">{plan.summary}</p>

              <div className="bg-[#f8fafc] border border-[#dce5ec] rounded-2xl p-3.5 mb-4">
                <div className="text-xs font-semibold text-slate-800 mb-2.5">每周执行核对清单</div>
                <ul className="space-y-2 text-xs text-slate-700">
                  {plan.weeklyChecklist.map((step) => (
                    <li key={step} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#eaf5f7] border border-[#b5dce3] rounded-2xl p-3.5 text-xs text-slate-800 leading-relaxed mb-4">
                <strong className="text-[#0d7a8a] font-semibold">执行注意事项：</strong>
                {plan.advice}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleTaskCheckIn(plan.id)}
                  className={`flex-1 min-h-[48px] px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap ${
                    isCompleted
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                      : 'bg-[#0d7a8a] hover:bg-[#096472] text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {isCompleted ? '今日已打卡（点击取消）' : '立即打卡并测算改善分'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] px-5 rounded-xl text-sm font-medium bg-[#f8fafc] hover:bg-slate-100 border border-[#dce5ec] text-slate-700 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  关闭
                </button>
              </div>
            </div>
          );
        })()}

        {modal.type === 'ai-summary' && (
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#eaf5f7] border border-[#b5dce3] flex items-center justify-center text-[#0d7a8a] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="detail-sheet-title" className="text-lg font-bold text-slate-900">
                    全身健康综合深度解读
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-num">
                    <span>当前评分 {healthScore} 分</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-semibold">干预目标 {projectedScore} 分</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="关闭综合解读弹窗"
                className="min-w-[44px] min-h-[44px] -mr-1.5 -mt-1 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              本次体检共覆盖 27 项核心临床指标，整体健康指数较半年前提升 6 分。需要重点协同干预的是“心脑血管与肝脏脂质代谢轴”：诊室血压处于 1 级高血压临界（142/92 mmHg），伴随总胆固醇偏高（5.8 mmol/L）及轻度脂肪肝（8.6%）。
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-[#f8fafc] border border-[#dce5ec] rounded-2xl p-3">
                <span className="block text-xs text-slate-500">核心干预靶点</span>
                <strong className="block text-sm font-bold text-amber-700 mt-1">控血压 · 降血脂</strong>
              </div>
              <div className="bg-[#f8fafc] border border-[#dce5ec] rounded-2xl p-3">
                <span className="block text-xs text-slate-500">12 周体重目标</span>
                <strong className="block text-sm font-bold font-num text-slate-900 mt-1">
                  76.2 → 72.5 kg
                </strong>
              </div>
              <div className="bg-[#f8fafc] border border-[#dce5ec] rounded-2xl p-3">
                <span className="block text-xs text-slate-500">建议复查窗口</span>
                <strong className="block text-sm font-bold font-num text-slate-900 mt-1">
                  2027-02-19
                </strong>
              </div>
              <div className="bg-[#f8fafc] border border-[#dce5ec] rounded-2xl p-3">
                <span className="block text-xs text-slate-500">预期逆转概率</span>
                <strong className="block text-sm font-bold font-num text-emerald-700 mt-1">
                  轻度脂肪肝 ≥ 85%
                </strong>
              </div>
            </div>

            <div className="bg-[#eaf5f7] border border-[#b5dce3] rounded-2xl p-3.5 text-xs text-slate-800 leading-relaxed mb-4">
              <strong className="text-[#0d7a8a] font-semibold">联合改善路径：</strong>
              坚持“每日限盐 &lt; 5g + 粗粮替代 1/3 主食 + 每周 5 次 30 分钟中等强度有氧运动”，无需药物即可在 12 周内显著降低肝脏脂肪含量并回落收缩压 6–10 mmHg。
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] px-4 rounded-xl text-sm font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white active:scale-[0.98] transition-all"
            >
              我已了解，返回三维档案
            </button>
          </div>
        )}

        {modal.type === 'booking' && (
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#eaf5f7] border border-[#b5dce3] flex items-center justify-center text-[#0d7a8a] shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="detail-sheet-title" className="text-lg font-bold text-slate-900">
                    复查预约与报告归档
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    已关联 {followedOrgans.length} 项重点随访器官指标
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭预约弹窗"
                className="min-w-[44px] min-h-[44px] -mr-1.5 -mt-1 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmitBooking} className="space-y-4">
              <div>
                <label htmlFor="booking-date-input" className="block text-xs font-medium text-slate-700 mb-1.5">
                  期望复查日期（血脂四项 + 肝脏超声 + 动态血压）
                </label>
                <input
                  id="booking-date-input"
                  type="date"
                  required
                  min="2026-11-20"
                  value={bookingDate}
                  onChange={(e) => onChangeBookingDate(e.target.value)}
                  className="w-full min-h-[46px] bg-white border border-[#dce5ec] rounded-xl px-3.5 py-2.5 text-sm font-num text-slate-900 focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>

              <div className="bg-[#f8fafc] border border-[#dce5ec] rounded-2xl p-3.5 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 mb-1.5">已选随访专项：</div>
                <p className="text-slate-600 leading-relaxed">
                  {followedOrgans.length > 0
                    ? followedOrgans.map((id) => organRecords[id].name).join('、')
                    : '尚未手动添加（默认包含心脏血压、肝脏代谢、血管血脂三项复查）'}
                </p>
              </div>

              {bookingSubmitted && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-2xl p-3 text-xs text-emerald-800">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    已登记 <strong className="font-num">{bookingDate}</strong> 复查提醒，并生成结构化体检摘要。
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] px-4 rounded-xl text-sm font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  {bookingSubmitted ? '更新复查日期' : '确认预约复查提醒'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] px-5 rounded-xl text-sm font-medium bg-[#f8fafc] hover:bg-slate-100 border border-[#dce5ec] text-slate-700 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  关闭
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
