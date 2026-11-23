import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  FilePlus2,
  MessageSquarePlus,
  Upload,
  UserPlus,
} from 'lucide-react';
import { OrganId } from '../utils/healthModel';
import {
  CheckupReportBatch,
  ClinicalClosedLoopState,
  LabMetricsSnapshot,
  PATIENT_PROFILE_PRESETS,
  PatientProfile,
  REPORT_IMPORT_PRESETS,
  SymptomFeedbackItem,
  computeBmi,
  validateLabMetricsInput,
  validatePatientProfileInput,
  validateSymptomFeedbackInput,
} from '../utils/clinicalWorkflow';
import { buildDailyDosingScheduleFromTasks } from '../utils/defaultProtocols';
import { OrganIcon } from './OrganIcons';

interface PatientIntakeAndExecutionProps {
  mode: 'intake' | 'execution';
  state: ClinicalClosedLoopState;
  healthScore: number;
  projectedScore: number;
  onSaveProfile: (profile: PatientProfile) => void;
  onImportReport: (report: CheckupReportBatch) => void;
  onToggleTaskCheckIn: (taskId: string) => void;
  onSubmitSymptomFeedback: (
    feedback: Omit<SymptomFeedbackItem, 'id' | 'submittedAt' | 'status'>
  ) => void;
  onLocateOrganIn3D: (organId: OrganId) => void;
  onAdvanceToStep: (step: 2 | 6) => void;
}

const SYMPTOM_OPTIONS = [
  '执行顺利，无明显不适',
  '偶发午后头晕或后颈紧绷',
  '餐后轻度腹胀或反酸',
  '有氧运动后轻微肌肉酸痛',
  '睡眠改善明显，晨起精神好转',
];

export const PatientIntakeAndExecution: React.FC<PatientIntakeAndExecutionProps> = ({
  mode,
  state,
  healthScore,
  projectedScore,
  onSaveProfile,
  onImportReport,
  onToggleTaskCheckIn,
  onSubmitSymptomFeedback,
  onLocateOrganIn3D,
  onAdvanceToStep,
}) => {
  // Mobile Mini-Program Sub-Tab Switchers (reduces long vertical scroll on 390px phones; desktop shows both columns)
  const [intakeTab, setIntakeTab] = useState<'import' | 'profile'>('import');
  const [execTab, setExecTab] = useState<'checkin' | 'feedback'>('checkin');

  // --- Step 1: Patient Profile Form State ---
  const [name, setName] = useState(state.patientProfile.name);
  const [gender, setGender] = useState<PatientProfile['gender']>(state.patientProfile.gender);
  const [age, setAge] = useState(String(state.patientProfile.age));
  const [heightCm, setHeightCm] = useState(String(state.patientProfile.heightCm));
  const [weightKg, setWeightKg] = useState(String(state.patientProfile.weightKg));
  const [phone, setPhone] = useState(state.patientProfile.phone);
  const [medicalHistory, setMedicalHistory] = useState(state.patientProfile.medicalHistory);
  const [allergyHistory, setAllergyHistory] = useState(state.patientProfile.allergyHistory);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSavedNotice, setProfileSavedNotice] = useState<string | null>(null);

  // --- Step 1: Report Import State ---
  const [selectedPresetId, setSelectedPresetId] = useState(REPORT_IMPORT_PRESETS[0].id);
  const [reportDate, setReportDate] = useState('2026-11-20');
  const [institution, setInstitution] = useState('健康4S 数字化医学影像检验中心');
  const [packageName, setPackageName] = useState('心肝代谢专项检验与超声报告');
  const [systolicBp, setSystolicBp] = useState('142');
  const [diastolicBp, setDiastolicBp] = useState('92');
  const [heartRate, setHeartRate] = useState('76');
  const [fastingGlucose, setFastingGlucose] = useState('5.2');
  const [totalCholesterol, setTotalCholesterol] = useState('5.8');
  const [ldlCholesterol, setLdlCholesterol] = useState('3.7');
  const [liverFatPercent, setLiverFatPercent] = useState('8.6');
  const [gastricStatus, setGastricStatus] = useState<'normal' | 'mild_congestion'>('mild_congestion');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessNotice, setImportSuccessNotice] = useState<string | null>(null);

  // --- Step 5: Symptom Feedback State ---
  const [symptomCategory, setSymptomCategory] = useState(SYMPTOM_OPTIONS[1]);
  const [severityLevel, setSeverityLevel] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [selfMeasuredBp, setSelfMeasuredBp] = useState('134 / 86 mmHg');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSavedNotice, setFeedbackSavedNotice] = useState<string | null>(null);

  const livePreviewBmi = computeBmi(Number(weightKg) || 66.5, Number(heightCm) || 168);

  const handleApplyProfilePreset = (presetId: string) => {
    const found = PATIENT_PROFILE_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    const p = found.profile;
    setName(p.name);
    setGender(p.gender);
    setAge(String(p.age));
    setHeightCm(String(p.heightCm));
    setWeightKg(String(p.weightKg));
    setPhone(p.phone);
    setMedicalHistory(p.medicalHistory);
    setAllergyHistory(p.allergyHistory);
    setProfileError(null);
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    onSaveProfile({
      ...state.patientProfile,
      ...p,
      updatedAt: nowStr,
    });
    setProfileSavedNotice(
      `已切换至「${found.badge}」（BMI ${computeBmi(p.weightKg, p.heightCm)} kg/m²），通用三维人体模型已同步适配。`
    );
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = REPORT_IMPORT_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setReportDate(found.reportDate);
    setInstitution(found.institution);
    setPackageName(found.packageName);
    setSystolicBp(String(found.metrics.systolicBp));
    setDiastolicBp(String(found.metrics.diastolicBp));
    setHeartRate(String(found.metrics.heartRate));
    setFastingGlucose(String(found.metrics.fastingGlucose));
    setTotalCholesterol(String(found.metrics.totalCholesterol));
    setLdlCholesterol(String(found.metrics.ldlCholesterol));
    setLiverFatPercent(String(found.metrics.liverFatPercent));
    setGastricStatus(found.metrics.gastricStatus);
    setImportError(null);
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<LabMetricsSnapshot> & {
          institution?: string;
          reportDate?: string;
          packageName?: string;
        };
        if (parsed.reportDate) setReportDate(parsed.reportDate);
        if (parsed.institution) setInstitution(parsed.institution);
        if (parsed.packageName) setPackageName(parsed.packageName);
        if (parsed.systolicBp) setSystolicBp(String(parsed.systolicBp));
        if (parsed.diastolicBp) setDiastolicBp(String(parsed.diastolicBp));
        if (parsed.heartRate) setHeartRate(String(parsed.heartRate));
        if (parsed.fastingGlucose) setFastingGlucose(String(parsed.fastingGlucose));
        if (parsed.totalCholesterol) setTotalCholesterol(String(parsed.totalCholesterol));
        if (parsed.ldlCholesterol) setLdlCholesterol(String(parsed.ldlCholesterol));
        if (parsed.liverFatPercent) setLiverFatPercent(String(parsed.liverFatPercent));
        setImportError(null);
        setImportSuccessNotice(`已解析本地文件「${file.name}」，请确认下方指标后点击导入。`);
      } catch {
        setImportError('文件格式解析失败，请上传合法的 JSON 检验单或直接在下方填写数值。');
      }
    };
    reader.readAsText(file);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAge = Number(age);
    const numH = Number(heightCm);
    const numW = Number(weightKg);
    const err = validatePatientProfileInput({
      name,
      age: numAge,
      heightCm: numH,
      weightKg: numW,
    });
    if (err) {
      setProfileError(err);
      setProfileSavedNotice(null);
      return;
    }
    setProfileError(null);
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    onSaveProfile({
      ...state.patientProfile,
      name: name.trim(),
      gender,
      age: numAge,
      heightCm: numH,
      weightKg: numW,
      phone: phone.trim() || state.patientProfile.phone,
      medicalHistory: medicalHistory.trim(),
      allergyHistory: allergyHistory.trim(),
      updatedAt: nowStr,
    });
    setProfileSavedNotice(`档案已保存更新（BMI ${computeBmi(numW, numH)} kg/m²），已实时同步至三维评估模型。`);
  };

  const handleReportImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sys = Number(systolicBp);
    const dia = Number(diastolicBp);
    const hr = Number(heartRate) || 75;
    const glu = Number(fastingGlucose) || 5.2;
    const tc = Number(totalCholesterol);
    const ldl = Number(ldlCholesterol) || Number((tc * 0.62).toFixed(1));
    const lfat = Number(liverFatPercent);

    const err = validateLabMetricsInput({
      reportDate,
      institution,
      systolicBp: sys,
      diastolicBp: dia,
      totalCholesterol: tc,
      liverFatPercent: lfat,
    });
    if (err) {
      setImportError(err);
      setImportSuccessNotice(null);
      return;
    }

    setImportError(null);
    const monthNum = Number(reportDate.split('-')[1]) || 11;
    const newReport: CheckupReportBatch = {
      id: `rep-${Date.now()}`,
      reportDate,
      monthLabel: `${monthNum}月新导`,
      institution: institution.trim(),
      packageName: packageName.trim() || '门诊检验与影像报告',
      verificationStatus: 'pending',
      doctorVerificationNote: '',
      metrics: {
        systolicBp: sys,
        diastolicBp: dia,
        heartRate: hr,
        fastingGlucose: glu,
        totalCholesterol: tc,
        ldlCholesterol: ldl,
        liverFatPercent: lfat,
        gastricStatus,
      },
    };
    onImportReport(newReport);
    setImportSuccessNotice('检查报告已成功导入（状态：待医生核对），三维器官风险与体征数据已同步刷新。');
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateSymptomFeedbackInput({
      symptomCategory,
      description: feedbackDesc,
    });
    if (err) {
      setFeedbackError(err);
      setFeedbackSavedNotice(null);
      return;
    }
    setFeedbackError(null);
    onSubmitSymptomFeedback({
      symptomCategory,
      severityLevel,
      description: feedbackDesc.trim(),
      selfMeasuredBp: selfMeasuredBp.trim() || undefined,
    });
    setFeedbackDesc('');
    setFeedbackSavedNotice('症状与执行反馈已提交至主治医生工作台，医生将在随访环节审阅并调整方案。');
  };

  if (mode === 'intake') {
    return (
      <section className="space-y-3.5 sm:space-y-4">
        {/* Step 1 Header */}
        <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-num text-[#0d7a8a] font-semibold">
              环节 01 · 患者端业务场景
            </div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
              患者健康建档与导入检查报告
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              建立个人基础体征与既往史档案，导入最新体检/门诊检验数据，自动映射至三维人体解剖器官并推送医生核对。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAdvanceToStep(2)}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] whitespace-nowrap shrink-0 w-full sm:w-auto"
          >
            <span>进入下一步：医生核对数据</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Mini-Program 2-Segment Sub-Tab Switcher */}
        <div
          role="tablist"
          aria-label="建档与导入切换"
          className="lg:hidden bg-[#e8eef3] border border-[#dce5ec] rounded-xl p-1 grid grid-cols-2 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={intakeTab === 'import'}
            onClick={() => setIntakeTab('import')}
            className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
              intakeTab === 'import'
                ? 'bg-white text-[#0d7a8a] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            导入检查报告 ({state.reports.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={intakeTab === 'profile'}
            onClick={() => setIntakeTab('profile')}
            className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
              intakeTab === 'profile'
                ? 'bg-white text-[#0d7a8a] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            个人健康档案
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Left: Patient Archive Form */}
          <form
            onSubmit={handleProfileSubmit}
            noValidate
            className={`${
              intakeTab === 'profile' ? 'block' : 'hidden lg:block'
            } bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#e8eef3]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#0d7a8a]" />
                <h3 className="text-base font-bold text-slate-900">个人健康档案建档</h3>
              </div>
              <span className="text-xs font-num text-slate-500">
                编号 {state.patientProfile.archiveId} · 实时 BMI {livePreviewBmi}
              </span>
            </div>

            {/* One-tap Universal / Female / Male Sample Profile Switcher */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-medium text-slate-500">
                快速切换受检人档案（通用三维人体模型男女皆宜）
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {PATIENT_PROFILE_PRESETS.map((preset) => {
                  const isCurrent =
                    name === preset.profile.name && gender === preset.profile.gender;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyProfilePreset(preset.id)}
                      className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap truncate ${
                        isCurrent
                          ? 'bg-[#eaf5f7] border-[#0d7a8a] text-[#0d7a8a]'
                          : 'bg-[#f8fafc] border-[#dce5ec] text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {preset.badge}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="pt-name" className="block text-xs font-medium text-slate-700 mb-1">
                  患者姓名 *
                </label>
                <input
                  id="pt-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>

              <div>
                <label htmlFor="pt-gender" className="block text-xs font-medium text-slate-700 mb-1">
                  性别 / 体型模式
                </label>
                <select
                  id="pt-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as PatientProfile['gender'])}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                >
                  <option value="通用">通用（男女皆宜）</option>
                  <option value="女">女</option>
                  <option value="男">男</option>
                </select>
              </div>

              <div>
                <label htmlFor="pt-age" className="block text-xs font-medium text-slate-700 mb-1">
                  年龄 (岁) *
                </label>
                <input
                  id="pt-age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="pt-height" className="block text-xs font-medium text-slate-700 mb-1">
                  身高 (cm) *
                </label>
                <input
                  id="pt-height"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>

              <div>
                <label htmlFor="pt-weight" className="block text-xs font-medium text-slate-700 mb-1">
                  体重 (kg) *
                </label>
                <input
                  id="pt-weight"
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>

              <div>
                <label htmlFor="pt-phone" className="block text-xs font-medium text-slate-700 mb-1">
                  随访联系电话
                </label>
                <input
                  id="pt-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pt-history" className="block text-xs font-medium text-slate-700 mb-1">
                既往病史与生活作息特征
              </label>
              <textarea
                id="pt-history"
                rows={2}
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>

            <div>
              <label htmlFor="pt-allergy" className="block text-xs font-medium text-slate-700 mb-1">
                药物及食物过敏史
              </label>
              <input
                id="pt-allergy"
                type="text"
                value={allergyHistory}
                onChange={(e) => setAllergyHistory(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>

            {profileError && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {profileError}
              </p>
            )}
            {profileSavedNotice && (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {profileSavedNotice}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white transition-all active:scale-[0.98]"
            >
              保存并更新患者档案
            </button>
          </form>

          {/* Right: Checkup Report Importer */}
          <form
            onSubmit={handleReportImportSubmit}
            noValidate
            className={`${
              intakeTab === 'import' ? 'block' : 'hidden lg:block'
            } bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#e8eef3] flex-wrap">
              <div className="flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-[#0d7a8a]" />
                <h3 className="text-base font-bold text-slate-900">导入检查报告数据</h3>
              </div>

              <label className="cursor-pointer min-h-[38px] inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d7a8a] hover:bg-[#eaf5f7] bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>上传 JSON 报告单</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Quick Template Loader */}
            <div>
              <label htmlFor="report-preset-select" className="block text-xs font-medium text-slate-700 mb-1">
                快速载入医院检验报告模板（支持一键解析填入）
              </label>
              <select
                id="report-preset-select"
                value={selectedPresetId}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              >
                {REPORT_IMPORT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="rep-date" className="block text-xs font-medium text-slate-700 mb-1">
                  检查日期 *
                </label>
                <input
                  id="rep-date"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="rep-inst" className="block text-xs font-medium text-slate-700 mb-1">
                  体检/检验医疗机构 *
                </label>
                <input
                  id="rep-inst"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label htmlFor="rep-sbp" className="block text-[11px] text-slate-500 mb-1">
                  收缩压 (mmHg)
                </label>
                <input
                  id="rep-sbp"
                  type="number"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="rep-dbp" className="block text-[11px] text-slate-500 mb-1">
                  舒张压 (mmHg)
                </label>
                <input
                  id="rep-dbp"
                  type="number"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="rep-tc" className="block text-[11px] text-slate-500 mb-1">
                  总胆固醇 (mmol/L)
                </label>
                <input
                  id="rep-tc"
                  type="number"
                  step="0.1"
                  value={totalCholesterol}
                  onChange={(e) => setTotalCholesterol(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="rep-lfat" className="block text-[11px] text-slate-500 mb-1">
                  肝脂肪含量 (%)
                </label>
                <input
                  id="rep-lfat"
                  type="number"
                  step="0.1"
                  value={liverFatPercent}
                  onChange={(e) => setLiverFatPercent(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="rep-hr" className="block text-[11px] text-slate-500 mb-1">
                  心率 (次/分)
                </label>
                <input
                  id="rep-hr"
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="rep-glu" className="block text-[11px] text-slate-500 mb-1">
                  空腹血糖 (mmol/L)
                </label>
                <input
                  id="rep-glu"
                  type="number"
                  step="0.1"
                  value={fastingGlucose}
                  onChange={(e) => setFastingGlucose(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2.5 py-1.5 text-sm font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
              <div>
                <label htmlFor="rep-gastric" className="block text-[11px] text-slate-500 mb-1">
                  胃镜黏膜评估
                </label>
                <select
                  id="rep-gastric"
                  value={gastricStatus}
                  onChange={(e) => setGastricStatus(e.target.value as 'normal' | 'mild_congestion')}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                >
                  <option value="mild_congestion">轻度浅表充血</option>
                  <option value="normal">黏膜光滑正常</option>
                </select>
              </div>
            </div>

            {importError && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {importError}
              </p>
            )}
            {importSuccessNotice && (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {importSuccessNotice}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white transition-all active:scale-[0.98]"
            >
              导入检查报告并推送医生核对
            </button>

            {/* Imported Report History Summary */}
            <div className="pt-2 border-t border-[#e8eef3] space-y-1.5">
              <div className="text-xs font-semibold text-slate-800">
                已归档检查报告 ({state.reports.length})
              </div>
              {state.reports.map((rep) => (
                <div
                  key={rep.id}
                  className="flex items-center justify-between gap-2 text-xs py-1.5 text-slate-600"
                >
                  <span className="truncate">
                    <strong className="font-num text-slate-900">{rep.reportDate}</strong> · {rep.packageName}
                  </span>
                  <span
                    className={`shrink-0 font-semibold ${
                      rep.verificationStatus === 'verified' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {rep.verificationStatus === 'verified' ? '医生已核对' : '待医生核对'}
                  </span>
                </div>
              ))}
            </div>
          </form>
        </div>
      </section>
    );
  }

  // --- Mode === 'execution': Step 5 (Patient Views Plan, Executes Check-ins & Submits Symptom Feedback) ---
  const completedCount = state.draftOrPublishedTasks.filter((t) => t.completedByPatient).length;
  const totalTasks = state.draftOrPublishedTasks.length;
  const adherencePercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const patientDailySchedule = buildDailyDosingScheduleFromTasks(state.draftOrPublishedTasks);

  return (
    <section className="space-y-3.5 sm:space-y-4">
      {/* Step 5 Header */}
      <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-num text-[#0d7a8a] font-semibold">
            环节 05 · 患者端执行与反馈
          </div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
            查看个性化方案、执行打卡并提交症状反馈
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            主治医生签发周期：{state.publication.cycleWeeks} 周 · 下次复查节点{' '}
            <strong className="font-num text-slate-800">{state.publication.nextFollowupDate}</strong> ·
            当前打卡依从率 <strong className="font-num text-emerald-700">{adherencePercent}%</strong>
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
          <div className="text-xs text-slate-600 font-num">
            当前评分 <strong className="text-slate-900 text-base">{healthScore}</strong> 分 → 预期可达{' '}
            <strong className="text-emerald-700 text-base">{projectedScore}</strong> 分
          </div>
          <button
            type="button"
            onClick={() => onAdvanceToStep(6)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white inline-flex items-center gap-1.5 transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <span>切换至医生审阅反馈</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Physician Message Banner */}
      <div className="bg-[#eaf5f7] border border-[#b5dce3] rounded-2xl p-3.5 sm:p-4 text-xs text-slate-800 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <strong className="text-[#0d7a8a] font-semibold">
            {state.publication.publishedBy} 医嘱寄语：
          </strong>
          {state.publication.doctorMessage}
        </div>
        <span className="text-[11px] font-num text-slate-600 whitespace-nowrap shrink-0">
          状态：{state.publication.status === 'published' ? '正式发布执行中' : '医生修订草稿中'}
        </span>
      </div>

      {/* Mobile Mini-Program 2-Segment Sub-Tab Switcher */}
      <div
        role="tablist"
        aria-label="打卡与症状反馈切换"
        className="lg:hidden bg-[#e8eef3] border border-[#dce5ec] rounded-xl p-1 grid grid-cols-2 gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={execTab === 'checkin'}
          onClick={() => setExecTab('checkin')}
          className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
            execTab === 'checkin'
              ? 'bg-white text-[#0d7a8a] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          今日打卡 ({completedCount}/{totalTasks})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={execTab === 'feedback'}
          onClick={() => setExecTab('feedback')}
          className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
            execTab === 'feedback'
              ? 'bg-white text-[#0d7a8a] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          症状反馈 ({state.symptomFeedbacks.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 items-start">
        {/* Left: Synthesized Daily Dosing Guide + Published Tasks & Daily Check-in */}
        <div className={`${execTab === 'checkin' ? 'block' : 'hidden lg:block'} space-y-3`}>
          {patientDailySchedule.slots.length > 0 && (
            <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#edf2f6]">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Clock className="w-4 h-4 text-[#0d7a8a]" />
                  <span>今日分时服用时刻表（功能营养与益生菌医嘱）</span>
                </div>
                <span className="text-xs font-num text-[#0d7a8a] font-semibold whitespace-nowrap">
                  已整合 {patientDailySchedule.protocolCount} 项默认恢复方案
                </span>
              </div>

              <div className="divide-y divide-[#edf2f6] text-xs">
                {patientDailySchedule.slots.map((slot) => (
                  <div key={slot.slot} className="py-2 first:pt-0 last:pb-0 flex items-start gap-3">
                    <span className="w-28 shrink-0 font-num font-bold text-[#0d7a8a]">
                      {slot.slotLabel}
                    </span>
                    <div className="flex-1 space-y-1 min-w-0">
                      {slot.entries.map((entry) => (
                        <div key={entry.productName} className="text-slate-800 leading-relaxed">
                          <strong className="font-bold text-slate-900">{entry.productName}</strong>
                          <span className="font-num ml-1.5">{entry.dosageSummary}</span>
                          <span className="text-slate-500 ml-1">· {entry.methodNote}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {patientDailySchedule.safetyReminders.length > 0 && (
                <div className="pt-2 border-t border-[#edf2f6] text-[11px] text-amber-800 space-y-0.5">
                  {patientDailySchedule.safetyReminders.map((rem) => (
                    <p key={rem}>温馨提醒：{rem}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {state.draftOrPublishedTasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-2xl p-4 sm:p-5 border transition-colors ${
                task.completedByPatient
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-white border-[#dce5ec]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-[#eaf5f7] text-[#0d7a8a] flex items-center justify-center shrink-0">
                    <OrganIcon organId={task.relatedOrgan} className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {task.title}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="text-[#0d7a8a] font-medium">{task.frequency}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.targetTag}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleTaskCheckIn(task.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-[0.97] whitespace-nowrap shrink-0 ${
                    task.completedByPatient
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0d7a8a] hover:bg-[#096472] text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {task.completedByPatient ? '今日已打卡' : `完成打卡 (+${task.scoreGain}分)`}
                  </span>
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-2.5">{task.summary}</p>

              <ul className="space-y-1.5 text-xs text-slate-600 mb-3">
                {task.weeklyChecklist.map((chk) => (
                  <li key={chk} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{chk}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-2 border-t border-[#e8eef3] text-xs">
                <span className="text-slate-500 font-num">
                  {task.completedAt ? `打卡时间：${task.completedAt}` : '待今日执行打卡'}
                </span>
                <button
                  type="button"
                  onClick={() => onLocateOrganIn3D(task.relatedOrgan)}
                  className="min-h-[38px] px-2 -mr-2 text-[#0d7a8a] hover:text-[#096472] inline-flex items-center gap-1 font-semibold"
                >
                  <span>查看关联 3D 器官</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Submit Symptom Feedback + Feedback History */}
        <div className={`${execTab === 'feedback' ? 'block' : 'hidden lg:block'} space-y-4`}>
          <form
            onSubmit={handleFeedbackSubmit}
            noValidate
            className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#e8eef3]">
              <MessageSquarePlus className="w-4 h-4 text-[#0d7a8a]" />
              <h3 className="text-base font-bold text-slate-900">提交症状与执行反馈</h3>
            </div>

            <div>
              <label htmlFor="fb-category" className="block text-xs font-medium text-slate-700 mb-1">
                当前症状或执行感受类别
              </label>
              <select
                id="fb-category"
                value={symptomCategory}
                onChange={(e) => setSymptomCategory(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              >
                {SYMPTOM_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1">主观不适程度 (1–5级)</span>
                <div className="inline-flex items-center gap-1 bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-1 w-full justify-between">
                  {([1, 2, 3, 4, 5] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverityLevel(lvl)}
                      className={`flex-1 min-h-[38px] py-1 rounded-lg text-xs font-num font-semibold transition-colors ${
                        severityLevel === lvl
                          ? 'bg-white text-[#0d7a8a] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl}级
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="fb-bp" className="block text-xs font-medium text-slate-700 mb-1">
                  家庭自测血压 (选填)
                </label>
                <input
                  id="fb-bp"
                  type="text"
                  placeholder="如 134 / 86 mmHg"
                  value={selfMeasuredBp}
                  onChange={(e) => setSelfMeasuredBp(e.target.value)}
                  className="w-full min-h-[44px] bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fb-desc" className="block text-xs font-medium text-slate-700 mb-1">
                症状细节与方案执行感受说明 *
              </label>
              <textarea
                id="fb-desc"
                rows={3}
                placeholder="请描述执行饮食/运动方案后的身体感受、不适持续时间或疑问..."
                value={feedbackDesc}
                onChange={(e) => setFeedbackDesc(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
            </div>

            {feedbackError && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {feedbackError}
              </p>
            )}
            {feedbackSavedNotice && (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {feedbackSavedNotice}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white transition-all active:scale-[0.98]"
            >
              提交症状反馈给主治医生
            </button>
          </form>

          {/* Submitted Feedbacks & Doctor Replies */}
          <div className="bg-white border border-[#dce5ec] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              我的反馈与医生随访回复 ({state.symptomFeedbacks.length})
            </h3>
            <div className="divide-y divide-[#e8eef3]">
              {state.symptomFeedbacks.map((fb) => (
                <div key={fb.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {fb.symptomCategory} · 不适 {fb.severityLevel}级
                    </span>
                    <span className="font-num text-slate-500">{fb.submittedAt}</span>
                  </div>
                  {fb.selfMeasuredBp && (
                    <div className="text-slate-500 font-num">自测血压：{fb.selfMeasuredBp}</div>
                  )}
                  <p className="text-slate-600 leading-relaxed">{fb.description}</p>
                  {fb.doctorReply ? (
                    <div className="bg-[#eaf5f7] border border-[#b5dce3] rounded-xl p-2.5 text-slate-800 mt-1">
                      <strong className="text-[#0d7a8a]">医生回复：</strong>
                      {fb.doctorReply}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 font-medium">状态：待主治医生审阅回复</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
