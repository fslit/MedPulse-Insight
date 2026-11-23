import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownUp,
  Building2,
  CalendarClock,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  UserCog,
  UserPlus,
  X,
} from 'lucide-react';
import { NavTabId } from '../utils/healthModel';
import { PatientProfile } from '../utils/clinicalWorkflow';
import {
  AttendingDoctorProfile,
  PatientCohortRecord,
  PatientRosterSummary,
  RosterDoctorScopeId,
  RosterSortId,
  RosterTimeRangeId,
  createNewPatientInCohort,
  filterAndSortPatientRoster,
} from '../utils/patientCohort';
import { getRecoveryCaseByPatientId } from '../utils/recoveryCases';
import { OrganIcon } from './OrganIcons';

interface PatientRosterViewProps {
  summaries: PatientRosterSummary[];
  currentDoctor: AttendingDoctorProfile;
  openCreateModalSignal?: number;
  onOpenDoctorModal: () => void;
  onSelectPatient: (patientId: string, initialTab?: NavTabId) => void;
  onCreatePatient: (newRecord: PatientCohortRecord, enterImmediately: boolean) => void;
  onOpenCasesShowcase?: () => void;
  onOpenNebulaDemo?: () => void;
}

const QUICK_SEARCH_TERMS: ReadonlyArray<string> = [
  '体验报告',
  '脂肪肝',
  '络活喜',
  '护肝菌',
  '马鹿骨',
];

const SORT_LABELS: Record<RosterSortId, string> = {
  updated_desc: '最近更新时间（最新优先）',
  updated_asc: '最近更新时间（最早优先）',
  intake_desc: '首诊建档日期（最新优先）',
  followup_asc: '下次复查日期（临近优先）',
};

export const PatientRosterView: React.FC<PatientRosterViewProps> = ({
  summaries,
  currentDoctor,
  openCreateModalSignal = 0,
  onOpenDoctorModal,
  onSelectPatient,
  onCreatePatient,
  onOpenCasesShowcase,
  onOpenNebulaDemo,
}) => {
  const [sortBy, setSortBy] = useState<RosterSortId>('updated_desc');
  const [timeRange, setTimeRange] = useState<RosterTimeRangeId>('all');
  const [doctorScope, setDoctorScope] = useState<RosterDoctorScopeId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // New Patient Intake Form State
  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<PatientProfile['gender']>('通用');
  const [age, setAge] = useState<string>('40');
  const [heightCm, setHeightCm] = useState<string>('168');
  const [weightKg, setWeightKg] = useState<string>('68.0');
  const [phone, setPhone] = useState<string>('138-0066-8820');
  const [chiefTagline, setChiefTagline] = useState<string>('临界高血压 · 轻度脂肪肝首诊干预');
  const [stageTitle, setStageTitle] = useState<string>('首疗程减盐控脂与靶向有氧期');
  const [cycleWeeks, setCycleWeeks] = useState<string>('12');
  const [systolicBp, setSystolicBp] = useState<string>('140');
  const [diastolicBp, setDiastolicBp] = useState<string>('90');
  const [liverFatPercent, setLiverFatPercent] = useState<string>('8.8');
  const [totalCholesterol, setTotalCholesterol] = useState<string>('5.7');
  const [fastingGlucose, setFastingGlucose] = useState<string>('5.3');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (openCreateModalSignal > 0) {
      setCreateOpen(true);
      setFormError(null);
    }
  }, [openCreateModalSignal]);

  // Allow pressing '/' anywhere outside form inputs to focus patient search immediately
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || createOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createOpen]);

  const filteredList = useMemo(
    () =>
      filterAndSortPatientRoster(summaries, {
        searchQuery,
        sortBy,
        timeRange,
        doctorScope,
        currentDoctorId: currentDoctor.id,
      }),
    [summaries, searchQuery, sortBy, timeRange, doctorScope, currentDoctor.id]
  );

  // Clinic & Attending Doctor Aggregate Metrics
  const totalCount = summaries.length;
  const myPatientsCount = summaries.filter((s) => s.attendingDoctorId === currentDoctor.id).length;
  const recent7dCount = useMemo(
    () => filterAndSortPatientRoster(summaries, { timeRange: '7d' }).length,
    [summaries]
  );
  const latestTimestamp = useMemo(() => {
    const sorted = filterAndSortPatientRoster(summaries, { sortBy: 'updated_desc' });
    return sorted[0]?.updatedAt ?? '2026-11-20';
  }, [summaries]);

  const avgAdherence =
    totalCount > 0
      ? Math.round(summaries.reduce((acc, s) => acc + s.adherencePercent, 0) / totalCount)
      : 0;
  const multiCoursePatients = summaries.filter((s) => s.cumulativeDelta > 0);
  const avgScoreGain =
    multiCoursePatients.length > 0
      ? (
          multiCoursePatients.reduce((acc, s) => acc + s.cumulativeDelta, 0) /
          multiCoursePatients.length
        ).toFixed(1)
      : '0.0';

  const hasActiveFilters =
    searchQuery.trim().length > 0 || timeRange !== 'all' || doctorScope !== 'all';

  const handleToggleTimeColumnSort = () => {
    setSortBy((prev) => (prev === 'updated_desc' ? 'updated_asc' : 'updated_desc'));
  };

  const handleResetSearchAndFilters = () => {
    setSearchQuery('');
    setTimeRange('all');
    setDoctorScope('all');
    setSortBy('updated_desc');
  };

  const handleFillDemoIntake = () => {
    setName('陆思远');
    setGender('通用');
    setAge('42');
    setHeightCm('172');
    setWeightKg('74.5');
    setPhone('139-1088-6521');
    setChiefTagline('体检新发轻度脂肪肝 · 血压临界偏高');
    setStageTitle('首疗程肝脏减脂与低钠饮食重建期');
    setCycleWeeks('12');
    setSystolicBp('139');
    setDiastolicBp('88');
    setLiverFatPercent('9.2');
    setTotalCholesterol('5.6');
    setFastingGlucose('5.4');
    setFormError(null);
  };

  const handleSubmitNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const { record, error } = createNewPatientInCohort({
      name,
      gender,
      age: Number(age),
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      phone,
      chiefTagline,
      stageTitle,
      cycleWeeks: Number(cycleWeeks),
      systolicBp: Number(systolicBp),
      diastolicBp: Number(diastolicBp),
      totalCholesterol: Number(totalCholesterol),
      liverFatPercent: Number(liverFatPercent),
      fastingGlucose: Number(fastingGlucose),
      attendingDoctorId: currentDoctor.id,
    });

    if (error || !record) {
      setFormError(error ?? '请检查建档填写项');
      return;
    }

    setFormError(null);
    setCreateOpen(false);
    setName('');
    onCreatePatient(record, true);
  };

  return (
    <div className="space-y-4" data-testid="patient-roster-view">
      {/* Logged-In Attending Doctor Identity & Cohort KPIs (Single-Elevation Surface, Zero Nested Cards) */}
      <section
        aria-label="当前登录主治医生工作台与患者队列总览"
        className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 pb-4 border-b border-[#edf2f6]">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#eaf5f7] border border-[#9fd0d9] text-[#0d7a8a] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                  {currentDoctor.clinicName}
                </h1>
                <span className="text-slate-300" aria-hidden="true">
                  |
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#0d7a8a] whitespace-nowrap inline-flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    坐诊医师：{currentDoctor.name} {currentDoctor.title}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={onOpenDoctorModal}
                  className="text-xs font-medium text-slate-500 hover:text-[#0d7a8a] underline underline-offset-2 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  <span>切换门诊与医师账号</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap font-num">
                <span className="inline-flex items-center gap-1 font-sans text-slate-700 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
                  <span>门诊地址：{currentDoctor.clinicAddress}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-sans text-slate-500">{currentDoctor.department}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">执业编号 {currentDoctor.licenseNo}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onOpenNebulaDemo && (
              <button
                type="button"
                onClick={onOpenNebulaDemo}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] hover:border-[#8ac6d1] text-slate-800 hover:text-[#0d7a8a] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <span>体验报告导入示范 (陈小真·60页)</span>
                <ChevronRight className="w-4 h-4 text-[#0d7a8a] shrink-0" />
              </button>
            )}
            {onOpenCasesShowcase && (
              <button
                type="button"
                onClick={onOpenCasesShowcase}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0d7a8a] hover:bg-[#096472] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>浏览康复成功案例实拍总库 (4例)</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Column Tabular Clinic KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x lg:divide-[#edf2f6]">
          <div className="lg:pr-5">
            <div className="text-xs text-slate-500">在管患者档案</div>
            <div className="flex items-baseline gap-1.5 mt-1 font-num">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                {totalCount}
              </span>
              <span className="text-xs text-slate-500">例建档</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-num">
              其中 {currentDoctor.name}医生直接主管 {myPatientsCount} 例
            </div>
          </div>

          <div className="lg:px-5">
            <div className="text-xs text-slate-500">近 7 日随访与检验更新</div>
            <div className="flex items-baseline gap-1.5 mt-1 font-num">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0d7a8a] leading-none">
                {recent7dCount}
              </span>
              <span className="text-xs text-slate-500">例活跃档案</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-num truncate">
              最新动态 {latestTimestamp}
            </div>
          </div>

          <div className="lg:px-5">
            <div className="text-xs text-slate-500">疗程处方平均依从率</div>
            <div className="flex items-baseline gap-1.5 mt-1 font-num">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 leading-none">
                {avgAdherence}%
              </span>
              <span className="text-xs text-slate-500">周打卡执行</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              标准非药物管理周期 8–12 周 / 疗程
            </div>
          </div>

          <div className="lg:pl-5">
            <div className="text-xs text-slate-500">多疗程平均健康提分</div>
            <div className="flex items-baseline gap-1.5 mt-1 font-num">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 leading-none">
                +{avgScoreGain}
              </span>
              <span className="text-xs text-slate-500">分 / 较初诊基线</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              选择患者即可进入按疗程三维对比大屏
            </div>
          </div>
        </div>
      </section>

      {/* Search-First & Time-Sorted Patient Data Roster */}
      <section
        aria-label="患者数据检索与时间排序列表"
        className="bg-white border border-[#dce5ec] rounded-2xl overflow-hidden"
      >
        {/* Prominent Search Bar + Doctor Scope + Time Window + Chronological Sort */}
        <div className="p-3.5 sm:px-5 sm:py-4 border-b border-[#edf2f6] space-y-2.5">
          <div className="flex flex-col xl:flex-row xl:items-center gap-2.5">
            {/* Wide Multi-Field Search Input */}
            <div className="relative flex-1 min-w-0">
              <label htmlFor="patient-roster-search" className="sr-only">
                搜索患者姓名、拼音首字母、手机号、档案号或干预方向
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                id="patient-roster-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入患者姓名 / 拼音首字母(如 cjg) / 手机号 / 档案号 / 脂肪肝、高血压...（按 / 键快速聚焦）"
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl pl-9 pr-16 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="清空患者搜索关键词"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-xs font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>清空</span>
                </button>
              ) : (
                <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-num text-slate-400 bg-white border border-[#dce5ec] rounded">
                  /
                </kbd>
              )}
            </div>

            {/* Attending Doctor Scope + Time Window + Chronological Time Sort */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <div
                role="group"
                aria-label="按主管医生范围查看"
                className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] p-0.5 rounded-xl shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setDoctorScope('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap font-num ${
                    doctorScope === 'all'
                      ? 'bg-white text-[#0d7a8a] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  科室全量 ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorScope('mine')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap font-num ${
                    doctorScope === 'mine'
                      ? 'bg-white text-[#0d7a8a] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  我主管的 ({myPatientsCount})
                </button>
              </div>

              <div className="inline-flex items-center gap-1.5 shrink-0">
                <CalendarClock className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" aria-hidden="true" />
                <label htmlFor="patient-time-range" className="sr-only">
                  按更新时间范围筛选
                </label>
                <select
                  id="patient-time-range"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as RosterTimeRangeId)}
                  className="bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0d7a8a]"
                >
                  <option value="all">时间范围：全部档案</option>
                  <option value="7d">时间范围：近 7 天更新</option>
                  <option value="30d">时间范围：近 30 天更新</option>
                </select>
              </div>

              <div className="inline-flex items-center gap-1.5 shrink-0">
                <ArrowDownUp className="w-3.5 h-3.5 text-[#0d7a8a] hidden sm:inline" aria-hidden="true" />
                <label htmlFor="patient-roster-sort" className="sr-only">
                  按时间维度排序患者列表
                </label>
                <select
                  id="patient-roster-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as RosterSortId)}
                  className="bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0d7a8a]"
                >
                  <option value="updated_desc">时间排序：最近更新（新 → 旧）</option>
                  <option value="updated_asc">时间排序：最近更新（旧 → 新）</option>
                  <option value="intake_desc">时间排序：首诊建档（新 → 旧）</option>
                  <option value="followup_asc">时间排序：下次复查（近 → 远）</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Search Keywords & Active Sort Status */}
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 whitespace-nowrap">快捷检索：</span>
              {QUICK_SEARCH_TERMS.map((term) => {
                const active = searchQuery.trim() === term;
                return (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setSearchQuery(active ? '' : term)}
                    className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#eaf5f7] text-[#0d7a8a] font-semibold border border-[#8ac6d1]'
                        : 'text-slate-600 hover:text-[#0d7a8a] hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    {term}
                  </button>
                );
              })}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetSearchAndFilters}
                  className="ml-1 text-[#0d7a8a] hover:underline font-medium whitespace-nowrap"
                >
                  重置全部条件
                </button>
              )}
            </div>

            <div className="text-slate-500 font-num whitespace-nowrap">
              共显示 <strong className="text-slate-800">{filteredList.length}</strong> / {totalCount} 位患者 ·{' '}
              <span>{SORT_LABELS[sortBy]}</span>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredList.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2.5">
            <p className="text-sm font-semibold text-slate-700">
              未检索到符合当前搜索词或时间范围的患者档案
            </p>
            <p className="text-xs text-slate-500">
              支持按姓名、拼音首字母（如 cjg）、手机号、档案编号或慢病方向搜索，您也可以重置条件查看全部档案
            </p>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResetSearchAndFilters}
                className="px-3.5 py-1.5 rounded-xl bg-[#0d7a8a] hover:bg-[#096472] text-white text-xs font-semibold"
              >
                清空检索条件查看全院档案
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Chronological Clinical Table (>= 1024px) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#edf2f6] bg-[#f8fafc] text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                    <th className="py-2.5 pl-4 pr-2.5">受检患者与主治医生</th>
                    <th className="py-2.5 px-2.5">
                      <button
                        type="button"
                        onClick={handleToggleTimeColumnSort}
                        className="inline-flex items-center gap-1 text-[#0d7a8a] hover:text-[#096472] font-bold"
                      >
                        <span>最近更新 / 首诊建档时间</span>
                        <ArrowDownUp className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-2.5">核心管理方向与靶器官</th>
                    <th className="py-2.5 px-2.5">当前疗程进度与指标变化</th>
                    <th className="py-2.5 px-2.5 text-right">初诊 → 当前评分</th>
                    <th className="py-2.5 pl-2.5 pr-4 text-right">诊室操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f6] text-xs">
                  {filteredList.map((pat) => {
                    const progressPct =
                      pat.cycleWeeks > 0
                        ? Math.min(100, Math.round((pat.elapsedWeeks / pat.cycleWeeks) * 100))
                        : 100;
                    const isMyPatient = pat.attendingDoctorId === currentDoctor.id;

                    return (
                      <tr
                        key={pat.id}
                        onClick={() => onSelectPatient(pat.id, 'report')}
                        className="hover:bg-[#f4f9fa] transition-colors cursor-pointer group"
                      >
                        {/* Col 1: Patient Identity & Attending Doctor Attribution */}
                        <td className="py-3 pl-4 pr-2.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#eaf5f7] border border-[#b5dce3] text-[#0d7a8a] font-bold text-sm flex items-center justify-center shrink-0">
                              {pat.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-sm font-bold text-slate-900 group-hover:text-[#0d7a8a] transition-colors">
                                  {pat.name}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-600 font-num">
                                  {pat.gender} · {pat.age}岁
                                </span>
                                {pat.hasNebulaExperienceReport && (
                                  <>
                                    <span className="text-slate-300" aria-hidden="true">
                                      ·
                                    </span>
                                    <span className="text-[11px] font-semibold text-[#0d7a8a]">
                                      含60页体验报告D值解析
                                    </span>
                                  </>
                                )}
                                {getRecoveryCaseByPatientId(pat.id) && (
                                  <>
                                    <span className="text-slate-300" aria-hidden="true">
                                      ·
                                    </span>
                                    <span className="text-[11px] font-semibold text-emerald-700">
                                      含康复实拍分享
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-num mt-0.5 whitespace-nowrap">
                                <span>{pat.archiveId}</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={
                                    isMyPatient
                                      ? 'text-[#0d7a8a] font-semibold font-sans'
                                      : 'text-slate-600 font-sans'
                                  }
                                >
                                  主治：{pat.attendingDoctorName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Col 2: Chronological Timestamps (Updated, Intake, Next Recheck) */}
                        <td className="py-3 px-2.5 align-middle font-num whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{pat.updatedAt}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            建档 {pat.intakeDate} · 复查 {pat.nextFollowupDate}
                          </div>
                        </td>

                        {/* Col 3: Multiple Health Problems & Regimen Drug/Product Names */}
                        <td className="py-3 px-2.5 align-middle max-w-[245px]">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-[#0d7a8a] font-num whitespace-nowrap">
                              {pat.healthIssuesCount}项问题
                            </span>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {pat.chiefTagline}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                            {pat.focusOrgans.map((orgId, i) => (
                              <React.Fragment key={orgId}>
                                {i > 0 && <span aria-hidden="true">·</span>}
                                <span className="inline-flex items-center gap-1 text-slate-700 whitespace-nowrap">
                                  <OrganIcon
                                    organId={orgId}
                                    className="w-3 h-3 text-[#0d7a8a] shrink-0"
                                  />
                                  <span>
                                    {orgId === 'heart'
                                      ? '心血管'
                                      : orgId === 'liver'
                                      ? '肝脏'
                                      : orgId === 'vascular'
                                      ? '血脂'
                                      : orgId === 'stomach'
                                      ? '胃窦'
                                      : orgId === 'bone'
                                      ? '骨关节'
                                      : orgId === 'lungs'
                                      ? '肺系'
                                      : orgId === 'brain'
                                      ? '脑神经'
                                      : orgId === 'kidneys'
                                      ? '肾脏'
                                      : '全身'}
                                  </span>
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {pat.activeRegimenSummary}
                          </div>
                        </td>

                        {/* Col 4: Active Treatment Course, Closed Courses & Biomarker Trajectory */}
                        <td className="py-3 px-2.5 align-middle min-w-[210px] max-w-[250px]">
                          <div className="flex items-center justify-between gap-2 text-xs whitespace-nowrap">
                            <span className="font-bold text-slate-900">
                              {pat.activeCourseLabel}
                              <span className="font-normal text-slate-500 font-num">
                                {' '}
                                /{pat.totalCoursesCount}期
                                {pat.closedCoursesCount > 0 ? `(结案${pat.closedCoursesCount})` : ''}
                              </span>
                            </span>
                            <span className="font-num text-[11px] text-slate-600">
                              {pat.elapsedWeeks}/{pat.cycleWeeks}周 · 依从{pat.adherencePercent}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#edf2f6] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pat.abnormalCount === 0 ? 'bg-emerald-500' : 'bg-[#0d7a8a]'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-500 font-num truncate mt-1">
                            {pat.primaryMetricDeltaText} · {pat.secondaryMetricDeltaText}
                          </div>
                        </td>

                        {/* Col 5: Baseline -> Current Health Score */}
                        <td className="py-3 px-2.5 align-middle text-right font-num whitespace-nowrap">
                          <div className="inline-flex items-baseline justify-end gap-1">
                            <span className="text-slate-400 text-xs">{pat.baselineScore}</span>
                            <span className="text-slate-300">→</span>
                            <strong className="text-base font-extrabold text-slate-900">
                              {pat.currentScore}
                            </strong>
                            <span className="text-[11px] text-slate-500">分</span>
                          </div>
                          <div
                            className={`text-[11px] font-semibold mt-0.5 ${
                              pat.cumulativeDelta > 0
                                ? 'text-emerald-600'
                                : 'text-[#0d7a8a]'
                            }`}
                          >
                            {pat.cumulativeDelta > 0
                              ? `累计 +${pat.cumulativeDelta} 分`
                              : '首疗程基线期'}
                          </div>
                        </td>

                        {/* Col 6: Actions */}
                        <td
                          className="py-3 pl-2.5 pr-4 align-middle text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectPatient(pat.id, 'protocol')}
                              className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-[#0d7a8a] hover:bg-[#eaf5f7] transition-colors whitespace-nowrap"
                            >
                              方案图谱
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectPatient(pat.id, 'report')}
                              aria-label={`进入 ${pat.name} 的三维疗程对比大屏`}
                              className="px-3 py-1.5 rounded-xl bg-[#0d7a8a] hover:bg-[#096472] text-white text-xs font-semibold inline-flex items-center gap-0.5 transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <span>三维疗程分析</span>
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Touch-Friendly Chronological Cards (< 1024px) */}
            <div className="lg:hidden divide-y divide-[#edf2f6]">
              {filteredList.map((pat) => {
                const progressPct =
                  pat.cycleWeeks > 0
                    ? Math.min(100, Math.round((pat.elapsedWeeks / pat.cycleWeeks) * 100))
                    : 100;

                return (
                  <div key={pat.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#eaf5f7] border border-[#b5dce3] text-[#0d7a8a] font-bold text-sm flex items-center justify-center shrink-0">
                          {pat.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm">
                            <strong className="font-bold text-slate-900 truncate">
                              {pat.name}
                            </strong>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-slate-600 font-num whitespace-nowrap">
                              {pat.gender} · {pat.age}岁
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-num truncate mt-0.5">
                            更新 {pat.updatedAt} · 主治：{pat.attendingDoctorName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-num shrink-0">
                        <div className="text-sm">
                          <span className="text-slate-400 text-xs">{pat.baselineScore}→</span>
                          <strong className="font-extrabold text-slate-900">
                            {pat.currentScore}分
                          </strong>
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600">
                          {pat.cumulativeDelta > 0
                            ? `累计 +${pat.cumulativeDelta}分`
                            : '首疗程基线期'}
                        </div>
                      </div>
                    </div>

                    {/* Course Progress & Chief Clinical Focus */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-num gap-2">
                        <span className="font-semibold text-slate-800 truncate">
                          {pat.activeCourseLabel} · {pat.chiefTagline}
                        </span>
                        <span className="text-slate-500 whitespace-nowrap shrink-0">
                          {pat.elapsedWeeks}/{pat.cycleWeeks}周 · 依从{pat.adherencePercent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#edf2f6] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0d7a8a]"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 font-num flex items-center justify-between pt-0.5">
                        <span>{pat.primaryMetricDeltaText}</span>
                        <span>建档 {pat.intakeDate}</span>
                      </div>
                    </div>

                    {/* 44px Touch Targets */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onSelectPatient(pat.id, 'protocol')}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#dce5ec] text-xs font-semibold text-slate-700 active:scale-[0.98]"
                      >
                        标准方案图谱
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectPatient(pat.id, 'report')}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0d7a8a] text-white text-xs font-semibold inline-flex items-center justify-center gap-1 active:scale-[0.98]"
                      >
                        <span>三维疗程分析</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* New Patient Quick Intake & Course 1 Initialization Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-patient-modal-title"
        >
          <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl border border-[#dce5ec] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[#edf2f6] flex items-center justify-between gap-3">
              <div>
                <h2 id="create-patient-modal-title" className="text-base font-bold text-slate-900">
                  新建患者三维健康档案并开启第 1 疗程
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  当前责任主治医生：{currentDoctor.name} {currentDoctor.title}（{currentDoctor.department}）
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="关闭新建患者弹窗"
                className="min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewPatient} className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">1. 基本人口学与首疗程设定</span>
                <button
                  type="button"
                  onClick={handleFillDemoIntake}
                  className="text-xs font-semibold text-[#0d7a8a] hover:text-[#096472] inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>一键填入首诊示例数据</span>
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="new-pat-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    患者姓名 *
                  </label>
                  <input
                    id="new-pat-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如：陆思远"
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-pat-gender"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    档案类型
                  </label>
                  <select
                    id="new-pat-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as PatientProfile['gender'])}
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  >
                    <option value="通用">通用标准</option>
                    <option value="女">女性</option>
                    <option value="男">男性</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-pat-age"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    年龄 (岁) *
                  </label>
                  <input
                    id="new-pat-age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-pat-height"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    身高 (cm) *
                  </label>
                  <input
                    id="new-pat-height"
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-pat-weight"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    基线体重 (kg) *
                  </label>
                  <input
                    id="new-pat-weight"
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-pat-weeks"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    首疗程周期 (周)
                  </label>
                  <select
                    id="new-pat-weeks"
                    value={cycleWeeks}
                    onChange={(e) => setCycleWeeks(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  >
                    <option value="8">8 周（强化短疗程）</option>
                    <option value="12">12 周（标准慢病疗程）</option>
                    <option value="16">16 周（深度巩固疗程）</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-pat-tagline"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    主诊断与重点管理方向
                  </label>
                  <input
                    id="new-pat-tagline"
                    type="text"
                    value={chiefTagline}
                    onChange={(e) => setChiefTagline(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-pat-stage"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    第 1 疗程阶段命名
                  </label>
                  <input
                    id="new-pat-stage"
                    type="text"
                    value={stageTitle}
                    onChange={(e) => setStageTitle(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#edf2f6] space-y-2.5">
                <div className="text-xs font-bold text-slate-800">2. 首诊基线核心检验指标</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label
                      htmlFor="new-pat-sbp"
                      className="block text-[11px] text-slate-600 mb-1"
                    >
                      收缩压 (mmHg)
                    </label>
                    <input
                      id="new-pat-sbp"
                      type="number"
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-2.5 py-1.5 text-xs font-num text-slate-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-pat-dbp"
                      className="block text-[11px] text-slate-600 mb-1"
                    >
                      舒张压 (mmHg)
                    </label>
                    <input
                      id="new-pat-dbp"
                      type="number"
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-2.5 py-1.5 text-xs font-num text-slate-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-pat-liver"
                      className="block text-[11px] text-slate-600 mb-1"
                    >
                      肝脂肪率 (%)
                    </label>
                    <input
                      id="new-pat-liver"
                      type="number"
                      step="0.1"
                      value={liverFatPercent}
                      onChange={(e) => setLiverFatPercent(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-2.5 py-1.5 text-xs font-num text-slate-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-pat-tc"
                      className="block text-[11px] text-slate-600 mb-1"
                    >
                      总胆固醇
                    </label>
                    <input
                      id="new-pat-tc"
                      type="number"
                      step="0.1"
                      value={totalCholesterol}
                      onChange={(e) => setTotalCholesterol(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-2.5 py-1.5 text-xs font-num text-slate-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-pat-fpg"
                      className="block text-[11px] text-slate-600 mb-1"
                    >
                      空腹血糖
                    </label>
                    <input
                      id="new-pat-fpg"
                      type="number"
                      step="0.1"
                      value={fastingGlucose}
                      onChange={(e) => setFastingGlucose(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-2.5 py-1.5 text-xs font-num text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#edf2f6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-[#dce5ec] text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0d7a8a] hover:bg-[#096472] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>建档并进入疗程三维对比大屏</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
