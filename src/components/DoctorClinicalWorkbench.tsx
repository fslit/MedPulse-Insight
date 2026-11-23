import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  LayoutGrid,
  Plus,
  Search,
  Send,
  Sparkles,
  Stethoscope,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { ORGAN_ORDER, ORGAN_RECORDS, OrganId, TrendDataPoint } from '../utils/healthModel';
import {
  CheckupReportBatch,
  ClinicalClosedLoopState,
  FollowupRecheckRecord,
  LabMetricsSnapshot,
  ManagedTaskItem,
  PROTOCOL_CATEGORY_LABELS,
  PROTOCOL_LIBRARY,
  PlanPublicationInfo,
  ProtocolCategory,
  ProtocolTemplate,
  filterProtocolTemplates,
  getEffectiveLabMetrics,
  validateCustomTaskInput,
  validateFollowupRecheckInput,
} from '../utils/clinicalWorkflow';
import {
  COURSE_CYCLE_PRESETS,
  DEFAULT_PROTOCOL_GROUP_LABELS,
  DEFAULT_PROTOCOL_REFERENCE_SHEETS,
  DefaultOrganProtocol,
  DefaultProtocolGroup,
  ReferenceSheetId,
  SYSTEM_DEFAULT_PROTOCOLS,
  buildDailyDosingScheduleFromTasks,
  filterDefaultProtocols,
  matchDefaultProtocolsForPatient,
} from '../utils/defaultProtocols';
import { HealthTrendChart } from './HealthTrendChart';

interface DoctorClinicalWorkbenchProps {
  mode: 'review' | 'protocol' | 'followup';
  state: ClinicalClosedLoopState;
  trendData: TrendDataPoint[];
  onVerifyReport: (
    reportId: string,
    updatedMetrics: LabMetricsSnapshot,
    doctorNote: string
  ) => void;
  onAddTemplateTask: (tpl: ProtocolTemplate) => void;
  onApplyDefaultProtocol: (protocol: DefaultOrganProtocol) => void;
  onApplyBatchDefaultProtocols: (protocols: ReadonlyArray<DefaultOrganProtocol>) => void;
  onAddCustomTask: (task: Omit<ManagedTaskItem, 'id' | 'completedByPatient'>) => void;
  onRemoveTask: (taskId: string) => void;
  onUpdateTaskFrequency: (taskId: string, frequency: string) => void;
  onPublishPlan: (info: Omit<PlanPublicationInfo, 'status' | 'publishedAt'>) => void;
  onReplyFeedback: (feedbackId: string, replyText: string) => void;
  onRecordFollowupRecheck: (
    recheck: Omit<FollowupRecheckRecord, 'id'>,
    nextFollowupDate: string,
    nextCadenceLabel: string
  ) => void;
  onLocateOrganIn3D: (organId: OrganId) => void;
  onAdvanceToStep: (step: 3 | 5) => void;
  attendingDoctorSignOff?: string;
  readOnlyAnalytics?: boolean;
  onOpenCasesShowcase?: () => void;
}

export const DoctorClinicalWorkbench: React.FC<DoctorClinicalWorkbenchProps> = ({
  mode,
  state,
  trendData,
  attendingDoctorSignOff = '陈景明 主任医师 · 全科与慢病逆转管理科',
  onVerifyReport,
  onAddTemplateTask,
  onApplyDefaultProtocol,
  onApplyBatchDefaultProtocols,
  onAddCustomTask,
  onRemoveTask,
  onUpdateTaskFrequency,
  onPublishPlan,
  onReplyFeedback,
  onRecordFollowupRecheck,
  onLocateOrganIn3D,
  onAdvanceToStep,
  readOnlyAnalytics = false,
  onOpenCasesShowcase,
}) => {
  // Mobile Mini-Program Sub-Tab Switchers (desktop lg: displays both columns side-by-side)
  const [reviewTab, setReviewTab] = useState<'verify' | 'history'>('verify');
  const [protocolTab, setProtocolTab] = useState<'library' | 'publish'>('library');
  const [followupTab, setFollowupTab] = useState<'feedback' | 'recheck'>('feedback');

  // --- Step 2: Doctor Review & Verification State ---
  const activeReport: CheckupReportBatch =
    state.reports.find((r) => r.id === state.activeReportId) ??
    state.reports[state.reports.length - 1];

  const [selectedReportId, setSelectedReportId] = useState(activeReport.id);
  const currentReviewReport =
    state.reports.find((r) => r.id === selectedReportId) ?? activeReport;

  const [editSbp, setEditSbp] = useState(String(currentReviewReport.metrics.systolicBp));
  const [editDbp, setEditDbp] = useState(String(currentReviewReport.metrics.diastolicBp));
  const [editHr, setEditHr] = useState(String(currentReviewReport.metrics.heartRate));
  const [editGlu, setEditGlu] = useState(String(currentReviewReport.metrics.fastingGlucose));
  const [editTc, setEditTc] = useState(String(currentReviewReport.metrics.totalCholesterol));
  const [editLdl, setEditLdl] = useState(String(currentReviewReport.metrics.ldlCholesterol));
  const [editLfat, setEditLfat] = useState(String(currentReviewReport.metrics.liverFatPercent));
  const [doctorNote, setDoctorNote] = useState(
    currentReviewReport.doctorVerificationNote ||
      '已复核原始检验单与影像测量值，心肺肾指标良好，血压、总胆固醇与肝脂肪含量轻度偏高，进入个性化方案制定。'
  );
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  // --- Step 3 & 4: System Default Protocol Matrix + Lifestyle Library + Publish State ---
  const [librarySource, setLibrarySource] = useState<'default_matrix' | 'lifestyle'>('default_matrix');
  const [defaultGroupFilter, setDefaultGroupFilter] = useState<DefaultProtocolGroup>('all');
  const [defaultViewStyle, setDefaultViewStyle] = useState<'cards' | 'matrix'>('cards');
  const [sheetModalOpen, setSheetModalOpen] = useState<boolean>(false);
  const [activeSheetId, setActiveSheetId] = useState<ReferenceSheetId>('sheet-visceral');
  const [sheetImgError, setSheetImgError] = useState<boolean>(false);

  const [catFilter, setCatFilter] = useState<'all' | ProtocolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customOrgan, setCustomOrgan] = useState<OrganId>('heart');
  const [customTarget, setCustomTarget] = useState('');
  const [customFreq, setCustomFreq] = useState('每日执行');
  const [customSummary, setCustomSummary] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const [cycleWeeks, setCycleWeeks] = useState(state.publication.cycleWeeks);
  const [nextFollowupDate, setNextFollowupDate] = useState(state.publication.nextFollowupDate);
  const [doctorMessage, setDoctorMessage] = useState(state.publication.doctorMessage);
  const [focusedOrgans, setFocusedOrgans] = useState<OrganId[]>(state.publication.focusedOrgans);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  // --- Step 6: Doctor Feedback Reply + Follow-up Recheck Entry State ---
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [recheckDate, setRecheckDate] = useState('2027-02-19');
  const [recheckMonthLabel, setRecheckMonthLabel] = useState('2月复查');
  const [recheckSbp, setRecheckSbp] = useState('126');
  const [recheckDbp, setRecheckDbp] = useState('80');
  const [recheckTc, setRecheckTc] = useState('4.9');
  const [recheckLfat, setRecheckLfat] = useState('4.6');
  const [recheckWeight, setRecheckWeight] = useState('73.0');
  const [recheckNote, setRecheckNote] = useState(
    '经 12 周低钠饮食与有氧运动干预，诊室血压回落至 126/80 mmHg，肝脂肪含量降至 4.6% 实现逆转，转入巩固随访期。'
  );
  const [nextPlanDate, setNextPlanDate] = useState('2027-08-19');
  const [nextCadenceLabel, setNextCadenceLabel] = useState('24 周巩固维持期随访（每两周自测血压）');
  const [recheckError, setRecheckError] = useState<string | null>(null);
  const [recheckSavedNotice, setRecheckSavedNotice] = useState<string | null>(null);

  const handleSelectReportForReview = (repId: string) => {
    setSelectedReportId(repId);
    const found = state.reports.find((r) => r.id === repId);
    if (!found) return;
    setEditSbp(String(found.metrics.systolicBp));
    setEditDbp(String(found.metrics.diastolicBp));
    setEditHr(String(found.metrics.heartRate));
    setEditGlu(String(found.metrics.fastingGlucose));
    setEditTc(String(found.metrics.totalCholesterol));
    setEditLdl(String(found.metrics.ldlCholesterol));
    setEditLfat(String(found.metrics.liverFatPercent));
    setDoctorNote(
      found.doctorVerificationNote ||
        '已核对检验与影像原始记录，数值准确无误，建议转入生活方式干预方案组方。'
    );
    setVerifyNotice(null);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerifyReport(
      currentReviewReport.id,
      {
        ...currentReviewReport.metrics,
        systolicBp: Number(editSbp) || currentReviewReport.metrics.systolicBp,
        diastolicBp: Number(editDbp) || currentReviewReport.metrics.diastolicBp,
        heartRate: Number(editHr) || currentReviewReport.metrics.heartRate,
        fastingGlucose: Number(editGlu) || currentReviewReport.metrics.fastingGlucose,
        totalCholesterol: Number(editTc) || currentReviewReport.metrics.totalCholesterol,
        ldlCholesterol: Number(editLdl) || currentReviewReport.metrics.ldlCholesterol,
        liverFatPercent: Number(editLfat) || currentReviewReport.metrics.liverFatPercent,
      },
      doctorNote.trim()
    );
    setVerifyNotice('已完成检验指标核对并签发归档，三维器官评估模型已同步更新。');
  };

  const handleCreateCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateCustomTaskInput({
      title: customTitle,
      targetTag: customTarget,
      frequency: customFreq,
      summary: customSummary,
    });
    if (err) {
      setCustomError(err);
      return;
    }
    setCustomError(null);
    onAddCustomTask({
      title: customTitle.trim(),
      category: 'cardio',
      relatedOrgan: customOrgan,
      targetTag: customTarget.trim(),
      frequency: customFreq.trim(),
      shortDesc: customSummary.trim().slice(0, 36),
      summary: customSummary.trim(),
      advice: '请结合自身体能循序渐进执行，如有不适及时在患者端提交症状反馈。',
      scoreGain: 2,
      weeklyChecklist: [
        `按「${customFreq.trim()}」执行：${customTitle.trim()}`,
        `阶段控制目标：${customTarget.trim()}`,
      ],
    });
    setCustomTitle('');
    setCustomTarget('');
    setCustomSummary('');
    setShowCustomForm(false);
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.draftOrPublishedTasks.length === 0) return;
    onPublishPlan({
      cycleWeeks,
      nextFollowupDate,
      followupCadenceLabel: `${cycleWeeks} 周个性化管理闭环（复查日 ${nextFollowupDate}）`,
      doctorMessage: doctorMessage.trim(),
      publishedBy: attendingDoctorSignOff,
      focusedOrgans,
    });
    setPublishNotice(
      `已确认并正式发布 ${state.draftOrPublishedTasks.length} 项管理任务至患者端（${state.patientProfile.name}）。`
    );
  };

  const handleToggleFocusedOrgan = (id: OrganId) => {
    setFocusedOrgans((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRecheckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sys = Number(recheckSbp);
    const dia = Number(recheckDbp);
    const tc = Number(recheckTc);
    const lfat = Number(recheckLfat);
    const wt = Number(recheckWeight);

    const err = validateFollowupRecheckInput({
      recheckDate,
      systolicBp: sys,
      diastolicBp: dia,
      totalCholesterol: tc,
      liverFatPercent: lfat,
      weightKg: wt,
    });
    if (err) {
      setRecheckError(err);
      setRecheckSavedNotice(null);
      return;
    }

    setRecheckError(null);
    onRecordFollowupRecheck(
      {
        recheckDate,
        monthLabel: recheckMonthLabel.trim() || '复查',
        systolicBp: sys,
        diastolicBp: dia,
        totalCholesterol: tc,
        liverFatPercent: lfat,
        weightKg: wt,
        doctorAdjustmentNote: recheckNote.trim(),
      },
      nextPlanDate,
      nextCadenceLabel
    );
    setRecheckSavedNotice(
      '复查数据已补录归档，新的随访计划已同步下发；患者综合健康分、历史趋势曲线与 3D 器官状态均已实时更新。'
    );
  };

  // ==================== STEP 2: DOCTOR DATA REVIEW & HISTORY ====================
  if (mode === 'review') {
    const prevPoint = trendData.length >= 2 ? trendData[trendData.length - 2] : trendData[0];
    const latestPoint = trendData[trendData.length - 1];

    return (
      <section className="space-y-3.5 sm:space-y-4">
        <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-num text-[#0d7a8a] font-semibold">
              环节 02 · 医生工作台
            </div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
              医生核对检验数据与查看历史变化
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              复核患者导入的检验数值准确性，纵向比对近半年血压、血脂与体重演变轨迹，签发临床审核意见。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAdvanceToStep(3)}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] whitespace-nowrap shrink-0 w-full sm:w-auto"
          >
            <span>核对完成，前往查阅方案库</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Mini-Program Sub-Tab Switcher */}
        <div
          role="tablist"
          aria-label="数据复核与历史变化切换"
          className="lg:hidden bg-[#e8eef3] border border-[#dce5ec] rounded-xl p-1 grid grid-cols-2 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={reviewTab === 'verify'}
            onClick={() => setReviewTab('verify')}
            className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
              reviewTab === 'verify'
                ? 'bg-white text-[#0d7a8a] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            异常指标复核
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={reviewTab === 'history'}
            onClick={() => setReviewTab('history')}
            className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
              reviewTab === 'history'
                ? 'bg-white text-[#0d7a8a] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            历次趋势台账 ({trendData.length}期)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_1fr] gap-4 items-start">
          {/* Left: Doctor Data Verification Form */}
          <form
            onSubmit={handleVerifySubmit}
            className={`${
              reviewTab === 'verify' ? 'block' : 'hidden lg:block'
            } bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#e8eef3] flex-wrap">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#0d7a8a]" />
                <h3 className="text-base font-bold text-slate-900">检查报告异常项复核台</h3>
              </div>

              <select
                aria-label="选择待核对报告批次"
                value={currentReviewReport.id}
                onChange={(e) => handleSelectReportForReview(e.target.value)}
                className="bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#0d7a8a]"
              >
                {state.reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reportDate} · {r.verificationStatus === 'verified' ? '已核对' : '待核对'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="ver-sbp" className="block text-[11px] text-slate-500 mb-1">
                  收缩压 (参考 &lt;130)
                </label>
                <input
                  id="ver-sbp"
                  type="number"
                  value={editSbp}
                  onChange={(e) => setEditSbp(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-amber-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="ver-dbp" className="block text-[11px] text-slate-500 mb-1">
                  舒张压 (参考 &lt;85)
                </label>
                <input
                  id="ver-dbp"
                  type="number"
                  value={editDbp}
                  onChange={(e) => setEditDbp(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-amber-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="ver-hr" className="block text-[11px] text-slate-500 mb-1">
                  静息心率 (60–100)
                </label>
                <input
                  id="ver-hr"
                  type="number"
                  value={editHr}
                  onChange={(e) => setEditHr(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="ver-tc" className="block text-[11px] text-slate-500 mb-1">
                  总胆固醇 (&lt;5.2 mmol/L)
                </label>
                <input
                  id="ver-tc"
                  type="number"
                  step="0.1"
                  value={editTc}
                  onChange={(e) => setEditTc(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-amber-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="ver-ldl" className="block text-[11px] text-slate-500 mb-1">
                  LDL-C (&lt;3.4 mmol/L)
                </label>
                <input
                  id="ver-ldl"
                  type="number"
                  step="0.1"
                  value={editLdl}
                  onChange={(e) => setEditLdl(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-amber-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="ver-lfat" className="block text-[11px] text-slate-500 mb-1">
                  肝脂肪含量 (&lt;5.0%)
                </label>
                <input
                  id="ver-lfat"
                  type="number"
                  step="0.1"
                  value={editLfat}
                  onChange={(e) => setEditLfat(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-amber-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ver-note" className="block text-xs font-medium text-slate-700 mb-1">
                主治医生核对批注与临床研判
              </label>
              <textarea
                id="ver-note"
                rows={3}
                value={doctorNote}
                onChange={(e) => setDoctorNote(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>

            {verifyNotice && (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {verifyNotice}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onLocateOrganIn3D('heart')}
                  className="min-h-[38px] px-1.5 text-[#0d7a8a] hover:text-[#096472] font-semibold inline-flex items-center gap-0.5"
                >
                  <span>定位3D心脏</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => onLocateOrganIn3D('liver')}
                  className="min-h-[38px] px-1.5 text-[#0d7a8a] hover:text-[#096472] font-semibold inline-flex items-center gap-0.5"
                >
                  <span>定位3D肝脏</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="submit"
                className="min-h-[46px] w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                <span>确认核对无误并签发归档</span>
              </button>
            </div>
          </form>

          {/* Right: Longitudinal History Changes + Trend Chart */}
          <div className={`${reviewTab === 'history' ? 'block' : 'hidden lg:block'} space-y-4`}>
            <HealthTrendChart data={trendData} />

            <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-slate-900">多期随访指标纵向变化台账</h3>
                <span className="text-xs text-slate-500 font-num">
                  近期收缩压变化{' '}
                  <strong className="text-slate-800">
                    {latestPoint.systolicBp - prevPoint.systolicBp >= 0 ? '+' : ''}
                    {latestPoint.systolicBp - prevPoint.systolicBp} mmHg
                  </strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#dce5ec] text-slate-500">
                      <th className="py-2 px-2 font-medium">期次</th>
                      <th className="py-2 px-2 font-medium text-right">血压 (mmHg)</th>
                      <th className="py-2 px-2 font-medium text-right">总胆固醇</th>
                      <th className="py-2 px-2 font-medium text-right">体重 (kg)</th>
                      <th className="py-2 px-2 font-medium text-right">健康分</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8eef3] font-num">
                    {trendData.map((row, idx) => (
                      <tr
                        key={`${row.month}-${idx}`}
                        className={idx === trendData.length - 1 ? 'bg-[#eaf5f7]/60' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2 px-2 font-sans font-semibold text-slate-900">
                          {row.month}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-medium ${
                            row.systolicBp >= 140 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {row.systolicBp}/{row.diastolicBp}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-medium ${
                            row.cholesterol >= 5.2 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {row.cholesterol.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-800">
                          {row.weightKg.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-700">
                          {row.healthScore}分
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ==================== STEP 3 & 4: PROTOCOL LIBRARY + CREATE & PUBLISH PLAN ====================
  if (mode === 'protocol') {
    const effectiveLab = getEffectiveLabMetrics(state);
    const matchedDefaults = matchDefaultProtocolsForPatient(
      effectiveLab.metrics,
      `${state.patientProfile.medicalHistory} ${state.patientProfile.allergyHistory}`
    );

    const filteredDefaults = filterDefaultProtocols(
      SYSTEM_DEFAULT_PROTOCOLS,
      defaultGroupFilter,
      searchQuery
    );
    const filteredTemplates = filterProtocolTemplates(PROTOCOL_LIBRARY, catFilter, searchQuery);
    const addedTemplateIds = new Set(
      state.draftOrPublishedTasks.map((t) => t.templateId).filter(Boolean)
    );

    const unaddedMatchedProtocols = matchedDefaults
      .map((m) => m.protocol)
      .filter((p) => !addedTemplateIds.has(p.id));

    const dailySchedule = buildDailyDosingScheduleFromTasks(state.draftOrPublishedTasks);
    const activeReferenceSheet =
      DEFAULT_PROTOCOL_REFERENCE_SHEETS.find((s) => s.id === activeSheetId) ??
      DEFAULT_PROTOCOL_REFERENCE_SHEETS[0];

    return (
      <section className="space-y-3.5 sm:space-y-4">
        <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-num text-[#0d7a8a] font-semibold">
              {readOnlyAnalytics
                ? '标准方案对照分析 · 17项受损器官功能恢复矩阵与分时医嘱'
                : '环节 03 & 04 · 系统默认治疗方案匹配与个性化下发'}
            </div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
              {readOnlyAnalytics
                ? '全院受损器官系统默认治疗方案图谱（17项标准矩阵）'
                : '受损器官默认治疗方案库（17项标准矩阵）与任务发布'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              基于患者异常指标自动匹配受损器官默认功能恢复方案，自动解析多靶点一日分时服用时刻表（含 ≤37℃ 温水与优康力代餐去重医嘱）。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSheetImgError(false);
                setSheetModalOpen(true);
              }}
              className="min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-slate-700 hover:text-[#0d7a8a] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0d7a8a]" />
              <span>原版标准方案总表 (3张)</span>
            </button>

            {readOnlyAnalytics && onOpenCasesShowcase ? (
              <button
                type="button"
                onClick={onOpenCasesShowcase}
                className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] whitespace-nowrap"
              >
                <span>对照同方案康复成功案例</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAdvanceToStep(5)}
                className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] whitespace-nowrap"
              >
                <span>前往患者端查看打卡单</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Auto-Matched Patient Abnormal Organ Default Protocols Strip */}
        <div className="bg-white border border-[#dce5ec] rounded-2xl p-3.5 sm:px-5 sm:py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-[#0d7a8a] shrink-0" />
              <span className="font-bold text-slate-900">
                当前患者异常指标智能匹配默认方案（{matchedDefaults.length} 项靶向器官）
              </span>
              <span className="text-slate-400 hidden sm:inline">·</span>
              <span className="text-slate-500 font-num hidden sm:inline">
                依据 {effectiveLab.sourceTitle}
              </span>
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-x-2 gap-y-1 flex-wrap font-num">
              {matchedDefaults.map((item, idx) => {
                const added = addedTemplateIds.has(item.protocol.id);
                return (
                  <React.Fragment key={item.protocol.id}>
                    {idx > 0 && (
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (readOnlyAnalytics) {
                          onLocateOrganIn3D(item.protocol.linkedOrganId);
                        } else if (!added) {
                          onApplyDefaultProtocol(item.protocol);
                        }
                      }}
                      className={`text-left transition-colors ${
                        added
                          ? 'text-emerald-700 font-semibold'
                          : 'text-[#0d7a8a] hover:underline font-semibold'
                      }`}
                    >
                      {item.protocol.organTitle.split('（')[0]}（{item.protocol.courseDays}天/疗程 ·{' '}
                      {item.protocol.recommendedCoursesLabel}）
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {!readOnlyAnalytics && (
            <button
              type="button"
              disabled={unaddedMatchedProtocols.length === 0}
              onClick={() => onApplyBatchDefaultProtocols(unaddedMatchedProtocols)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                unaddedMatchedProtocols.length === 0
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default'
                  : 'bg-[#eaf5f7] hover:bg-[#d8ecf0] border border-[#9fd0d9] text-[#0d7a8a]'
              }`}
            >
              {unaddedMatchedProtocols.length === 0 ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>匹配默认方案已全部载入</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>一键载入其余 {unaddedMatchedProtocols.length} 项匹配方案</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Mobile Mini-Program Sub-Tab Switcher for Step 3 Library vs Step 4 Publish */}
        <div
          role="tablist"
          aria-label="方案库与任务发布切换"
          className="lg:hidden bg-[#e8eef3] border border-[#dce5ec] rounded-xl p-1 grid grid-cols-2 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={protocolTab === 'library'}
            onClick={() => setProtocolTab('library')}
            className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
              protocolTab === 'library'
                ? 'bg-white text-[#0d7a8a] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            03. 默认与循证方案库
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={protocolTab === 'publish'}
            onClick={() => setProtocolTab('publish')}
            className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
              protocolTab === 'publish'
                ? 'bg-white text-[#0d7a8a] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            04. 分时医嘱与发布 ({state.draftOrPublishedTasks.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.22fr_1fr] gap-4 items-start">
          {/* Left: Step 3 Clinic Default Protocol Matrix (17 items) + Lifestyle Prescriptions + Custom Builder */}
          <div
            className={`${
              protocolTab === 'library' ? 'block' : 'hidden lg:block'
            } bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-3.5`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#e8eef3] flex-wrap">
              <div
                role="group"
                aria-label="方案库类型切换"
                className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setLibrarySource('default_matrix')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                    librarySource === 'default_matrix'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  系统默认方案矩阵 (17项)
                </button>
                <button
                  type="button"
                  onClick={() => setLibrarySource('lifestyle')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                    librarySource === 'lifestyle'
                      ? 'bg-white text-[#0d7a8a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  生活方式处方 (6项)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {librarySource === 'default_matrix' && (
                  <div
                    role="group"
                    aria-label="默认方案展示视图切换"
                    className="hidden sm:inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-lg p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => setDefaultViewStyle('cards')}
                      className={`px-2 py-1 rounded-md text-xs inline-flex items-center gap-1 whitespace-nowrap ${
                        defaultViewStyle === 'cards'
                          ? 'bg-white text-[#0d7a8a] font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>卡片</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultViewStyle('matrix')}
                      className={`px-2 py-1 rounded-md text-xs inline-flex items-center gap-1 whitespace-nowrap ${
                        defaultViewStyle === 'matrix'
                          ? 'bg-white text-[#0d7a8a] font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      <span>四列标准表</span>
                    </button>
                  </div>
                )}

                {!readOnlyAnalytics && (
                  <button
                    type="button"
                    onClick={() => setShowCustomForm((prev) => !prev)}
                    className="min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#eaf5f7] hover:bg-[#d8ecf0] border border-[#b5dce3] text-[#0d7a8a] inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showCustomForm ? '收起自定义' : '新建自定义'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Optional Custom Task Creation Form */}
            {showCustomForm && (
              <form
                onSubmit={handleCreateCustomTask}
                noValidate
                className="bg-[#f8fafc] border border-[#b5dce3] rounded-xl p-4 space-y-3"
              >
                <div className="text-xs font-bold text-[#0d7a8a]">创建患者专属自定义干预任务</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="cust-title" className="block text-[11px] text-slate-600 mb-1">
                      任务名称 *
                    </label>
                    <input
                      id="cust-title"
                      type="text"
                      placeholder="如：晚间快走与颈肩拉伸"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-white border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d7a8a]"
                    />
                  </div>
                  <div>
                    <label htmlFor="cust-organ" className="block text-[11px] text-slate-600 mb-1">
                      关联靶器官
                    </label>
                    <select
                      id="cust-organ"
                      value={customOrgan}
                      onChange={(e) => setCustomOrgan(e.target.value as OrganId)}
                      className="w-full bg-white border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d7a8a]"
                    >
                      {ORGAN_ORDER.map((id) => (
                        <option key={id} value={id}>
                          {ORGAN_RECORDS[id].name} ({ORGAN_RECORDS[id].systemName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="cust-target" className="block text-[11px] text-slate-600 mb-1">
                      量化控制目标 *
                    </label>
                    <input
                      id="cust-target"
                      type="text"
                      placeholder="如：腰围减少 3cm · 缓解颈部紧绷"
                      value={customTarget}
                      onChange={(e) => setCustomTarget(e.target.value)}
                      className="w-full bg-white border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d7a8a]"
                    />
                  </div>
                  <div>
                    <label htmlFor="cust-freq" className="block text-[11px] text-slate-600 mb-1">
                      执行频次 *
                    </label>
                    <input
                      id="cust-freq"
                      type="text"
                      value={customFreq}
                      onChange={(e) => setCustomFreq(e.target.value)}
                      className="w-full bg-white border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d7a8a]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="cust-summary" className="block text-[11px] text-slate-600 mb-1">
                    具体执行处方说明 *
                  </label>
                  <textarea
                    id="cust-summary"
                    rows={2}
                    placeholder="填写运动强度、饮食配比或监测要求..."
                    value={customSummary}
                    onChange={(e) => setCustomSummary(e.target.value)}
                    className="w-full bg-white border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d7a8a]"
                  />
                </div>
                {customError && (
                  <p role="alert" className="text-xs text-red-700 font-medium">
                    {customError}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white transition-colors"
                >
                  加入患者个性化方案清单
                </button>
              </form>
            )}

            {/* Search & Category Filter */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  aria-label="搜索临床方案库"
                  placeholder={
                    librarySource === 'default_matrix'
                      ? '搜索受损器官、痛点症状或菌株产品（如：脂肪肝、优康力、太空晶球、青酸玲菌、失眠）...'
                      : '搜索生活方式处方（如：限盐、有氧、Omega-3）...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>

              {librarySource === 'default_matrix' ? (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {(Object.keys(DEFAULT_PROTOCOL_GROUP_LABELS) as DefaultProtocolGroup[]).map(
                    (grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setDefaultGroupFilter(grp)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          defaultGroupFilter === grp
                            ? 'bg-[#0d7a8a] text-white font-semibold'
                            : 'bg-[#f8fafc] text-slate-600 hover:text-slate-900 border border-[#dce5ec]'
                        }`}
                      >
                        {DEFAULT_PROTOCOL_GROUP_LABELS[grp]}
                      </button>
                    )
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {(Object.keys(PROTOCOL_CATEGORY_LABELS) as Array<'all' | ProtocolCategory>).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCatFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          catFilter === cat
                            ? 'bg-[#0d7a8a] text-white font-semibold'
                            : 'bg-[#f8fafc] text-slate-600 hover:text-slate-900 border border-[#dce5ec]'
                        }`}
                      >
                        {PROTOCOL_CATEGORY_LABELS[cat]}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Library Content: 17-Item System Default Organ Protocol Matrix vs 6-Item Lifestyle Library */}
            {librarySource === 'default_matrix' ? (
              filteredDefaults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  未匹配到对应的受损器官默认方案，请清空搜索词或切换上方分组。
                </div>
              ) : defaultViewStyle === 'matrix' ? (
                /* 4-Column Standard Clinical Matrix Table matching the user's reference sheets */
                <div className="overflow-x-auto max-h-[540px] overflow-y-auto border border-[#dce5ec] rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-[#eef5f0] border-b border-[#dce5ec] text-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 font-bold w-[138px]">受损器官</th>
                        <th className="py-2.5 px-3 font-bold w-[180px]">症状与危害痛点</th>
                        <th className="py-2.5 px-3 font-bold">功能恢复方案（分时剂量与疗程）</th>
                        <th className="py-2.5 px-3 font-bold w-[155px]">对应解决点 &amp; 选用</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8eef3] bg-white">
                      {filteredDefaults.map((proto) => {
                        const alreadyAdded = addedTemplateIds.has(proto.id);
                        const isMatched = matchedDefaults.some(
                          (m) => m.protocol.id === proto.id
                        );
                        return (
                          <tr
                            key={proto.id}
                            className={isMatched ? 'bg-[#eaf5f7]/35 hover:bg-[#eaf5f7]/60' : 'hover:bg-slate-50'}
                          >
                            <td className="py-2.5 px-3 align-top font-bold text-slate-900">
                              <div>{proto.organTitle}</div>
                              <div className="text-[11px] font-num text-[#0d7a8a] font-semibold mt-1">
                                {proto.courseDays}天/疗程 · {proto.recommendedCoursesLabel}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-top text-slate-600 leading-relaxed">
                              {proto.painPoints}
                            </td>
                            <td className="py-2.5 px-3 align-top text-slate-800 leading-relaxed font-num">
                              {proto.recoverySchemeText}
                            </td>
                            <td className="py-2.5 px-3 align-top space-y-2">
                              <div className="text-emerald-800 leading-snug">
                                {proto.resolutionPoints}
                              </div>
                              {readOnlyAnalytics ? (
                                <button
                                  type="button"
                                  onClick={() => onLocateOrganIn3D(proto.linkedOrganId)}
                                  className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-[#eaf5f7] hover:bg-[#d8ecf0] text-[#0d7a8a] transition-colors whitespace-nowrap"
                                >
                                  联动3D器官分析
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={alreadyAdded}
                                  onClick={() => onApplyDefaultProtocol(proto)}
                                  className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                                    alreadyAdded
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                      : 'bg-[#0d7a8a] hover:bg-[#096472] text-white'
                                  }`}
                                >
                                  {alreadyAdded ? '已纳入方案' : '套用此方案'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Structured Scannable Clinical Cards View */
                <div className="divide-y divide-[#e8eef3] max-h-[540px] overflow-y-auto pr-1">
                  {filteredDefaults.map((proto) => {
                    const alreadyAdded = addedTemplateIds.has(proto.id);
                    const matchedInfo = matchedDefaults.find(
                      (m) => m.protocol.id === proto.id
                    );

                    return (
                      <div
                        key={proto.id}
                        className={`py-3.5 first:pt-1 last:pb-1 space-y-1.5 ${
                          matchedInfo ? 'bg-[#eaf5f7]/30 -mx-2 px-2 rounded-xl' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="font-bold text-slate-900">
                                {proto.organTitle}
                              </span>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-num font-semibold text-[#0d7a8a] whitespace-nowrap">
                                {proto.courseDays}天为1疗程 · {proto.recommendedCoursesLabel}
                              </span>
                              {matchedInfo && (
                                <>
                                  <span className="text-slate-300" aria-hidden="true">
                                    ·
                                  </span>
                                  <span className="text-amber-700 font-semibold whitespace-nowrap">
                                    当前患者异常匹配
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {readOnlyAnalytics ? (
                            <button
                              type="button"
                              onClick={() => onLocateOrganIn3D(proto.linkedOrganId)}
                              className="min-h-[34px] px-3 py-1 rounded-xl text-xs font-semibold bg-[#eaf5f7] hover:bg-[#d8ecf0] text-[#0d7a8a] whitespace-nowrap shrink-0 transition-colors"
                            >
                              联动3D器官
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={alreadyAdded}
                              onClick={() => onApplyDefaultProtocol(proto)}
                              className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-[0.97] ${
                                alreadyAdded
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                  : 'bg-[#0d7a8a] hover:bg-[#096472] text-white'
                              }`}
                            >
                              {alreadyAdded ? '已选用' : '套用默认方案'}
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          <strong className="text-slate-700 font-semibold">症状与痛点：</strong>
                          {proto.painPoints}
                        </p>
                        <p className="text-xs text-slate-900 leading-relaxed font-num">
                          <strong className="text-[#0d7a8a] font-semibold font-sans">
                            功能恢复方案：
                          </strong>
                          {proto.recoverySchemeText}
                        </p>
                        <div className="flex items-center justify-between gap-2 text-xs text-emerald-800">
                          <span>
                            <strong className="font-semibold">对应解决点：</strong>
                            {proto.resolutionPoints}
                          </span>
                          <button
                            type="button"
                            onClick={() => onLocateOrganIn3D(proto.linkedOrganId)}
                            className="text-[11px] text-[#0d7a8a] hover:underline whitespace-nowrap shrink-0 inline-flex items-center gap-0.5"
                          >
                            <span>3D定位</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Lifestyle Evidence-Based Templates */
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    未匹配到对应生活方式模板，可点击上方「新建自定义」创建。
                  </div>
                ) : (
                  filteredTemplates.map((tpl) => {
                    const alreadyAdded = addedTemplateIds.has(tpl.id);
                    return (
                      <div
                        key={tpl.id}
                        className="bg-[#f8fafc] border border-[#dce5ec] rounded-xl p-3.5 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-slate-900">{tpl.title}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-[#0d7a8a] font-medium">{tpl.categoryLabel}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{tpl.shortDesc}</p>
                          <div className="text-[11px] text-slate-500 font-num">
                            {tpl.defaultFrequency} · {tpl.targetTag} · 预期 +{tpl.scoreGain}分
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => onAddTemplateTask(tpl)}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-[0.97] ${
                            alreadyAdded
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                              : 'bg-[#0d7a8a] hover:bg-[#096472] text-white'
                          }`}
                        >
                          {alreadyAdded ? '已选用' : '选用处方'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Mobile Mini-Program Prescription Cart Bar: 1-tap handoff to Step 04 Publish */}
            <div className="lg:hidden pt-3 border-t border-[#e8eef3] flex items-center justify-between gap-3">
              <span className="text-xs text-slate-600">
                已选 <strong className="font-num text-[#0d7a8a]">{state.draftOrPublishedTasks.length}</strong> 项干预任务
              </span>
              <button
                type="button"
                onClick={() => setProtocolTab('publish')}
                className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white inline-flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>查看分时医嘱与发布</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Step 4 Synthesized Daily Dosing Timetable + Analytical Regimen Breakdown */}
          <form
            onSubmit={handlePublishSubmit}
            className={`${
              protocolTab === 'publish' ? 'block' : 'hidden lg:block'
            } bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#e8eef3]">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-[#0d7a8a]" />
                <h3 className="text-base font-bold text-slate-900">
                  {readOnlyAnalytics
                    ? `当前患者疗程方案解析与分时时刻表 (${state.draftOrPublishedTasks.length}项)`
                    : `个性化方案确认与任务发布 (${state.draftOrPublishedTasks.length}项)`}
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#0d7a8a]">
                {readOnlyAnalytics
                  ? `周期 ${state.publication.cycleWeeks} 周`
                  : state.publication.status === 'published'
                  ? '已发布生效'
                  : '草稿待确认发布'}
              </span>
            </div>

            {/* Auto-Synthesized 1-Day Chronological Dosing Timetable (Deduplicating Shared Products) */}
            {dailySchedule.slots.length > 0 && (
              <div
                data-testid="synthesized-dosing-schedule"
                className="bg-[#f8fafc] border border-[#dce5ec] rounded-xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Clock className="w-3.5 h-3.5 text-[#0d7a8a]" />
                    <span>一日分时服用时刻表（自动合并 {dailySchedule.protocolCount} 项默认方案）</span>
                  </div>
                  <span className="text-[11px] font-num text-[#0d7a8a] font-semibold whitespace-nowrap">
                    建议周期 {dailySchedule.recommendedMaxCourseDays} 天
                  </span>
                </div>

                <div className="divide-y divide-[#e8eef3] text-xs">
                  {dailySchedule.slots.map((slot) => (
                    <div key={slot.slot} className="py-1.5 first:pt-0 last:pb-0 flex items-start gap-2.5">
                      <span className="w-28 shrink-0 font-num font-semibold text-[#0d7a8a]">
                        {slot.slotLabel}
                      </span>
                      <div className="flex-1 space-y-1 min-w-0">
                        {slot.entries.map((entry) => (
                          <div key={entry.productName} className="text-slate-800 leading-snug">
                            <strong className="font-bold text-slate-900">{entry.productName}</strong>
                            <span className="font-num ml-1">{entry.dosageSummary}</span>
                            <span className="text-slate-500 ml-1">（{entry.methodNote}）</span>
                            {entry.isSharedAcrossOrgans && (
                              <span className="text-emerald-700 font-semibold ml-1">
                                · 多靶点共用({entry.sourceOrgans.join('/')})不叠加
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {dailySchedule.safetyReminders.length > 0 && (
                  <div className="pt-2 border-t border-[#e8eef3] text-[11px] text-amber-800 space-y-0.5">
                    {dailySchedule.safetyReminders.map((rem) => (
                      <p key={rem}>注：{rem}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Tasks List */}
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {state.draftOrPublishedTasks.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 bg-[#f8fafc] rounded-xl border border-[#dce5ec]">
                  暂无当前疗程关联方案记录。
                </div>
              ) : (
                state.draftOrPublishedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-[#f8fafc] border border-[#dce5ec] rounded-xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {task.title}
                      </span>
                      {readOnlyAnalytics ? (
                        <span className="text-[11px] font-num font-semibold text-[#0d7a8a] shrink-0">
                          {task.frequency}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemoveTask(task.id)}
                          aria-label={`移除任务 ${task.title}`}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {readOnlyAnalytics ? (
                      <p className="text-xs text-slate-600 leading-relaxed">{task.shortDesc}</p>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 shrink-0">疗程频次：</span>
                        <input
                          type="text"
                          aria-label={`${task.title}执行频次`}
                          value={task.frequency}
                          onChange={(e) => onUpdateTaskFrequency(task.id, e.target.value)}
                          className="flex-1 bg-white border border-[#dce5ec] rounded-lg px-2 py-1 text-xs font-num text-[#0d7a8a] font-medium focus:outline-none focus:border-[#0d7a8a]"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {readOnlyAnalytics ? (
              <div className="pt-3 border-t border-[#e8eef3] space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between font-num">
                  <span>计划复查节点：{state.publication.nextFollowupDate}</span>
                  <span>主治审签：{state.publication.publishedBy}</span>
                </div>
                <p className="text-slate-700 leading-relaxed bg-[#f8fafc] border border-[#edf2f6] rounded-xl p-3">
                  <strong className="text-slate-900">阶段讲解医嘱：</strong>
                  {state.publication.doctorMessage}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e8eef3]">
                  <div>
                    <label htmlFor="pub-cycle" className="block text-xs font-medium text-slate-700 mb-1">
                      标准单疗程天数 / 管理周期
                    </label>
                    <select
                      id="pub-cycle"
                      value={cycleWeeks}
                      onChange={(e) => setCycleWeeks(Number(e.target.value))}
                      className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                    >
                      {COURSE_CYCLE_PRESETS.map((opt) => (
                        <option key={opt.cycleWeeks} value={opt.cycleWeeks}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pub-date" className="block text-xs font-medium text-slate-700 mb-1">
                      约定复查日期
                    </label>
                    <input
                      id="pub-date"
                      type="date"
                      value={nextFollowupDate}
                      onChange={(e) => setNextFollowupDate(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-700 mb-1.5">重点随访监测器官</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ORGAN_ORDER.map((id) => {
                      const selected = focusedOrgans.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleToggleFocusedOrgan(id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-[#eaf5f7] border-[#0d7a8a] text-[#0d7a8a] font-semibold'
                              : 'bg-[#f8fafc] border-[#dce5ec] text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {ORGAN_RECORDS[id].name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="pub-msg" className="block text-xs font-medium text-slate-700 mb-1">
                    下发患者端医嘱寄语
                  </label>
                  <textarea
                    id="pub-msg"
                    rows={2}
                    value={doctorMessage}
                    onChange={(e) => setDoctorMessage(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  />
                </div>

                {publishNotice && (
                  <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    {publishNotice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state.draftOrPublishedTasks.length === 0}
                  className="w-full min-h-[48px] py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#0d7a8a] hover:bg-[#096472] disabled:opacity-50 text-white transition-all active:scale-[0.98]"
                >
                  确认并正式发布管理任务
                </button>
              </>
            )}
          </form>
        </div>

        {/* Original Clinic Default Treatment Protocol Reference Sheets Modal */}
        {sheetModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSheetModalOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reference-sheet-modal-title"
          >
            <div className="w-full max-w-5xl bg-white rounded-2xl border border-[#dce5ec] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-5 py-3.5 border-b border-[#edf2f6] flex items-center justify-between gap-3">
                <div>
                  <h3 id="reference-sheet-modal-title" className="text-base font-bold text-slate-900">
                    全院系统默认治疗方案原版标准对照表
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    全部 17 项受损器官恢复方案已完整数字化结构入库，支持与原始标准表逐行核验
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetModalOpen(false)}
                  aria-label="关闭原版方案表弹窗"
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 py-2.5 bg-[#f8fafc] border-b border-[#edf2f6] flex items-center gap-2 overflow-x-auto no-scrollbar">
                {DEFAULT_PROTOCOL_REFERENCE_SHEETS.map((sheet) => {
                  const active = sheet.id === activeSheetId;
                  return (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => {
                        setSheetImgError(false);
                        setActiveSheetId(sheet.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#0d7a8a] border-[#0d7a8a] text-white'
                          : 'bg-white border-[#dce5ec] text-slate-700 hover:text-[#0d7a8a]'
                      }`}
                    >
                      {sheet.title}（{sheet.subtitle}）
                    </button>
                  );
                })}
              </div>

              <div className="p-4 overflow-y-auto flex-1 bg-[#f2f5f7] flex items-center justify-center">
                {!sheetImgError ? (
                  <img
                    src={activeReferenceSheet.imageUrl}
                    alt={`${activeReferenceSheet.title}：涵盖${activeReferenceSheet.coveredOrgans}`}
                    referrerPolicy="no-referrer"
                    onError={() => setSheetImgError(true)}
                    className="max-w-full h-auto rounded-xl border border-[#dce5ec] bg-white shadow-sm"
                  />
                ) : (
                  <div className="p-8 text-center bg-white rounded-xl border border-[#dce5ec] text-xs text-slate-600">
                    {activeReferenceSheet.title}（涵盖：{activeReferenceSheet.coveredOrgans}）已完整载入系统结构化方案表，可切换至「四列标准表」直接查阅。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ==================== STEP 6: REVIEW FEEDBACK + RECORD RECHECK + ADJUST PLAN ====================
  const completedTasks = state.draftOrPublishedTasks.filter((t) => t.completedByPatient).length;

  return (
    <section className="space-y-3.5 sm:space-y-4">
      <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-num text-[#0d7a8a] font-semibold">
            环节 06 · 医生随访评估与计划动态调整
          </div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
            查看患者反馈、补录复查数据并调整随访计划
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            审阅患者打卡依从性与主观症状，补录门诊复查指标后自动重算全身健康分与三维器官风险等级。
          </p>
        </div>

        <div className="text-xs text-slate-600 font-num">
          患者打卡进度{' '}
          <strong className="text-emerald-700">
            {completedTasks}/{state.draftOrPublishedTasks.length}
          </strong>{' '}
          · 已补录复查{' '}
          <strong className="text-[#0d7a8a]">{state.followupRechecks.length}</strong> 次
        </div>
      </div>

      {/* Mobile Mini-Program Sub-Tab Switcher */}
      <div
        role="tablist"
        aria-label="患者反馈与补录复查切换"
        className="lg:hidden bg-[#e8eef3] border border-[#dce5ec] rounded-xl p-1 grid grid-cols-2 gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={followupTab === 'feedback'}
          onClick={() => setFollowupTab('feedback')}
          className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
            followupTab === 'feedback'
              ? 'bg-white text-[#0d7a8a] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          患者反馈审阅 ({state.symptomFeedbacks.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={followupTab === 'recheck'}
          onClick={() => setFollowupTab('recheck')}
          className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
            followupTab === 'recheck'
              ? 'bg-white text-[#0d7a8a] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          补录复查调随访
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4 items-start">
        {/* Left: Patient Feedback Triage */}
        <div
          className={`${
            followupTab === 'feedback' ? 'block' : 'hidden lg:block'
          } bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4`}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[#e8eef3]">
            <Stethoscope className="w-4 h-4 text-[#0d7a8a]" />
            <h3 className="text-base font-bold text-slate-900">
              患者打卡依从与症状反馈审阅 ({state.symptomFeedbacks.length})
            </h3>
          </div>

          <div className="space-y-3">
            {state.symptomFeedbacks.map((fb) => {
              const draftText =
                replyDrafts[fb.id] ??
                '已审阅您的反馈：午后轻微颈部紧绷与久坐及血压轻度波动有关，建议每坐 50 分钟起身舒展颈肩并复测血压，继续保持低钠饮食。';
              return (
                <div
                  key={fb.id}
                  className="bg-[#f8fafc] border border-[#dce5ec] rounded-xl p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      {fb.symptomCategory} · {fb.severityLevel}级
                    </span>
                    <span
                      className={`font-semibold ${
                        fb.status === 'reviewed' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {fb.status === 'reviewed' ? '已回复处理' : '新反馈待处理'}
                    </span>
                  </div>
                  <div className="text-slate-500 font-num">
                    提交时间：{fb.submittedAt}
                    {fb.selfMeasuredBp ? ` · 自测血压 ${fb.selfMeasuredBp}` : ''}
                  </div>
                  <p className="text-slate-700 leading-relaxed">{fb.description}</p>

                  {fb.doctorReply ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-emerald-900">
                      <strong>我的临床回复：</strong>
                      {fb.doctorReply}
                    </div>
                  ) : (
                    <div className="pt-1.5 space-y-2">
                      <textarea
                        rows={2}
                        aria-label={`回复反馈 ${fb.symptomCategory}`}
                        value={draftText}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [fb.id]: e.target.value }))
                        }
                        className="w-full bg-white border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d7a8a]"
                      />
                      <button
                        type="button"
                        onClick={() => onReplyFeedback(fb.id, draftText)}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white transition-all active:scale-[0.98]"
                      >
                        发送指导回复并标记已阅
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Supplemental Recheck Data Entry & Follow-up Plan Adjustment */}
        <form
          onSubmit={handleRecheckSubmit}
          noValidate
          className={`${
            followupTab === 'recheck' ? 'block' : 'hidden lg:block'
          } bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4`}
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#e8eef3] flex-wrap">
            <h3 className="text-base font-bold text-slate-900">
              补录复查数据与调整随访计划
            </h3>
            <span className="text-xs text-[#0d7a8a] font-medium">提交后实时驱动 3D 器官逆转评估</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="rc-date" className="block text-[11px] text-slate-500 mb-1">
                复查日期 *
              </label>
              <input
                id="rc-date"
                type="date"
                value={recheckDate}
                onChange={(e) => setRecheckDate(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>
            <div>
              <label htmlFor="rc-label" className="block text-[11px] text-slate-500 mb-1">
                趋势图节点简称
              </label>
              <input
                id="rc-label"
                type="text"
                value={recheckMonthLabel}
                onChange={(e) => setRecheckMonthLabel(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>
            <div>
              <label htmlFor="rc-wt" className="block text-[11px] text-slate-500 mb-1">
                复查体重 (kg)
              </label>
              <input
                id="rc-wt"
                type="number"
                step="0.1"
                value={recheckWeight}
                onChange={(e) => setRecheckWeight(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label htmlFor="rc-sbp" className="block text-[11px] text-slate-500 mb-1">
                复查收缩压
              </label>
              <input
                id="rc-sbp"
                type="number"
                value={recheckSbp}
                onChange={(e) => setRecheckSbp(e.target.value)}
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-emerald-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>
            <div>
              <label htmlFor="rc-dbp" className="block text-[11px] text-slate-500 mb-1">
                复查舒张压
              </label>
              <input
                id="rc-dbp"
                type="number"
                value={recheckDbp}
                onChange={(e) => setRecheckDbp(e.target.value)}
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-emerald-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>
            <div>
              <label htmlFor="rc-tc" className="block text-[11px] text-slate-500 mb-1">
                复查胆固醇
              </label>
              <input
                id="rc-tc"
                type="number"
                step="0.1"
                value={recheckTc}
                onChange={(e) => setRecheckTc(e.target.value)}
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-emerald-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>
            <div>
              <label htmlFor="rc-lfat" className="block text-[11px] text-slate-500 mb-1">
                复查肝脂肪 (%)
              </label>
              <input
                id="rc-lfat"
                type="number"
                step="0.1"
                value={recheckLfat}
                onChange={(e) => setRecheckLfat(e.target.value)}
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-sm font-num font-semibold text-emerald-800 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e8eef3]">
            <div>
              <label htmlFor="next-cadence" className="block text-xs font-medium text-slate-700 mb-1">
                调整下一阶段随访频次
              </label>
              <select
                id="next-cadence"
                value={nextCadenceLabel}
                onChange={(e) => setNextCadenceLabel(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              >
                <option value="4 周加密强化随访（每周门诊/线上复评）">
                  4 周加密强化随访（指标仍偏高时选用）
                </option>
                <option value="12 周常规闭环随访（每周家庭自测血压上传）">
                  12 周常规闭环随访（稳步改善期）
                </option>
                <option value="24 周巩固维持期随访（每两周自测血压）">
                  24 周巩固维持期随访（指标达标逆转后）
                </option>
              </select>
            </div>
            <div>
              <label htmlFor="next-plan-date" className="block text-xs font-medium text-slate-700 mb-1">
                新设下次复查预约日
              </label>
              <input
                id="next-plan-date"
                type="date"
                value={nextPlanDate}
                onChange={(e) => setNextPlanDate(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rc-note" className="block text-xs font-medium text-slate-700 mb-1">
              复查对比结论与随访调整医嘱
            </label>
            <textarea
              id="rc-note"
              rows={2}
              value={recheckNote}
              onChange={(e) => setRecheckNote(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
            />
          </div>

          {recheckError && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {recheckError}
            </p>
          )}
          {recheckSavedNotice && (
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              {recheckSavedNotice}
            </p>
          )}

          <button
            type="submit"
            className="w-full min-h-[48px] py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white transition-all active:scale-[0.98]"
          >
            保存补录复查数据并更新随访计划
          </button>

          {state.followupRechecks.length > 0 && (
            <div className="pt-2 border-t border-[#e8eef3] space-y-1.5 text-xs">
              <div className="font-semibold text-slate-800">已补录复查记录</div>
              {state.followupRechecks.map((rc) => (
                <div
                  key={rc.id}
                  className="flex items-center justify-between gap-2 text-slate-600 py-1"
                >
                  <span className="font-num">
                    {rc.recheckDate} · 血压 {rc.systolicBp}/{rc.diastolicBp} · 胆固醇 {rc.totalCholesterol} · 肝脂 {rc.liverFatPercent}%
                  </span>
                  <span className="text-emerald-700 font-semibold shrink-0">已入档</span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </section>
  );
};
