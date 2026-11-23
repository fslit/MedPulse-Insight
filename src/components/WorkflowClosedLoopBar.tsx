import React from 'react';
import { ArrowLeft, CheckCircle2, Stethoscope, UserCheck } from 'lucide-react';
import {
  ClinicalClosedLoopState,
  UserRole,
  WorkflowStepId,
} from '../utils/clinicalWorkflow';

interface WorkflowClosedLoopBarProps {
  state: ClinicalClosedLoopState;
  onSelectStep: (step: WorkflowStepId) => void;
  onSwitchRole: (role: UserRole) => void;
  onReturnTo3DOverview: () => void;
  isOn3DOverview: boolean;
}

const STEP_META: ReadonlyArray<{
  step: WorkflowStepId;
  code: string;
  title: string;
  subtitle: string;
  actor: UserRole;
  actorLabel: string;
}> = [
  {
    step: 1,
    code: '01',
    title: '患者建档导报告',
    subtitle: '建档 · 导检验单',
    actor: 'patient',
    actorLabel: '患',
  },
  {
    step: 2,
    code: '02',
    title: '核对数据看历史',
    subtitle: '复核 · 纵向趋势',
    actor: 'doctor',
    actorLabel: '医',
  },
  {
    step: 3,
    code: '03',
    title: '查阅方案库定制',
    subtitle: '循证库 · 个性组方',
    actor: 'doctor',
    actorLabel: '医',
  },
  {
    step: 4,
    code: '04',
    title: '确认发布任务',
    subtitle: '定周期 · 发处方',
    actor: 'doctor',
    actorLabel: '医',
  },
  {
    step: 5,
    code: '05',
    title: '执行打卡提反馈',
    subtitle: '打卡 · 症状上报',
    actor: 'patient',
    actorLabel: '患',
  },
  {
    step: 6,
    code: '06',
    title: '看反馈补复查',
    subtitle: '答疑 · 调随访计划',
    actor: 'doctor',
    actorLabel: '医',
  },
];

export const WorkflowClosedLoopBar: React.FC<WorkflowClosedLoopBarProps> = ({
  state,
  onSelectStep,
  onSwitchRole,
  onReturnTo3DOverview,
  isOn3DOverview,
}) => {
  const pendingReportsCount = state.reports.filter(
    (r) => r.verificationStatus === 'pending'
  ).length;
  const unreadFeedbackCount = state.symptomFeedbacks.filter(
    (f) => f.status === 'unread'
  ).length;
  const completedTaskCount = state.draftOrPublishedTasks.filter(
    (t) => t.completedByPatient
  ).length;

  const getStepStatusText = (step: WorkflowStepId): { text: string; highlight?: boolean } => {
    switch (step) {
      case 1:
        return { text: `已导${state.reports.length}份` };
      case 2:
        return pendingReportsCount > 0
          ? { text: `${pendingReportsCount}份待核`, highlight: true }
          : { text: '已核对' };
      case 3:
        return { text: `已选${state.draftOrPublishedTasks.length}项` };
      case 4:
        return state.publication.status === 'published'
          ? { text: '已发布' }
          : { text: '待发布', highlight: true };
      case 5:
        return {
          text: `打卡${completedTaskCount}/${state.draftOrPublishedTasks.length}`,
        };
      case 6:
        return unreadFeedbackCount > 0
          ? { text: `${unreadFeedbackCount}条待阅`, highlight: true }
          : state.followupRechecks.length > 0
          ? { text: `复查${state.followupRechecks.length}次` }
          : { text: '随访中' };
    }
  };

  return (
    <section
      aria-label="医患协同六步闭环工作流"
      className="mb-3 sm:mb-4 bg-white border border-[#dce5ec] rounded-2xl p-2.5 sm:p-3.5"
    >
      {/* Compact Mini-Program Identity & Role Capsule Row */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#e8eef3] flex-wrap">
        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="font-bold text-slate-900 whitespace-nowrap">
            {state.patientProfile.name} ({state.patientProfile.age}岁)
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-slate-500 truncate">
            全周期医患闭环
            <span className="hidden sm:inline font-num"> · 档案 {state.patientProfile.archiveId}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isOn3DOverview && (
            <button
              type="button"
              onClick={onReturnTo3DOverview}
              className="hidden sm:inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#eaf5f7] hover:bg-[#d8ecf0] border border-[#b5dce3] text-[#0d7a8a] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>3D总览</span>
            </button>
          )}

          <div
            role="group"
            aria-label="切换医患业务视角"
            className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5"
          >
            <button
              type="button"
              aria-pressed={state.activeRole === 'patient'}
              onClick={() => onSwitchRole('patient')}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all active:scale-[0.98] whitespace-nowrap shrink-0 ${
                state.activeRole === 'patient'
                  ? 'bg-white text-[#0d7a8a] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>患者端</span>
            </button>
            <button
              type="button"
              aria-pressed={state.activeRole === 'doctor'}
              onClick={() => onSwitchRole('doctor')}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all active:scale-[0.98] whitespace-nowrap shrink-0 ${
                state.activeRole === 'doctor'
                  ? 'bg-[#0d7a8a] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>医生端</span>
            </button>
          </div>
        </div>
      </div>

      {/* Single-Row Swipeable 6-Step Mini-Program Stepper on Mobile -> 6-Column Grid on XL Desktop */}
      <div className="flex xl:grid xl:grid-cols-6 gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-0.5 px-0.5">
        {STEP_META.map((item) => {
          const isActive = !isOn3DOverview && state.currentStep === item.step;
          const statusInfo = getStepStatusText(item.step);

          return (
            <button
              key={item.step}
              type="button"
              onClick={() => onSelectStep(item.step)}
              className={`min-w-[138px] sm:min-w-[152px] xl:min-w-0 min-h-[56px] shrink-0 snap-start p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] flex flex-col justify-between gap-1 overflow-hidden ${
                isActive
                  ? 'bg-[#eaf5f7] border-[#0d7a8a] text-slate-900'
                  : 'bg-[#f8fafc] border-[#dce5ec] hover:border-[#8ac6d1] hover:bg-white text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full min-w-0">
                <span className="text-[11px] font-num font-bold text-[#0d7a8a] whitespace-nowrap shrink-0">
                  {item.code}·{item.actorLabel}
                </span>
                {statusInfo.highlight ? (
                  <span className="text-[11px] font-semibold text-amber-700 truncate">
                    {statusInfo.text}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-700 min-w-0">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{statusInfo.text}</span>
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                <div className="text-[10px] text-slate-500 truncate hidden sm:block mt-0.5">
                  {item.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
