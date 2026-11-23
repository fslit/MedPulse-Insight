import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  Camera,
  CheckCircle2,
  ChevronRight,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';
import { ORGAN_RECORDS, OrganId } from '../utils/healthModel';
import { PatientCohortRecord } from '../utils/patientCohort';
import {
  CourseExperienceNode,
  RECOVERY_SUCCESS_CASES,
  RecoverySuccessCase,
  filterRecoveryCases,
  resolveAlignedCaseForPatient,
} from '../utils/recoveryCases';
import { RECOVERY_PHOTO_URLS } from './recoveryCasePhotos';
import { OrganIcon } from './OrganIcons';

interface CourseRecoveryShowcaseProps {
  variant: 'embedded' | 'full_page';
  activePatient: PatientCohortRecord;
  inspectedCourseId: string;
  selectedOrgan: OrganId | null;
  onSyncPatientCourse?: (courseId: string) => void;
  onSelectOrganIn3D?: (organId: OrganId) => void;
  onOpenPatientIn3DWidescreen?: (patientId: string, courseId: string) => void;
  onOpenFullCasesPage?: () => void;
  onOpenProtocolAtlas?: () => void;
  ownCaseOnly?: boolean;
  embeddedFlat?: boolean;
}

const CASE_ORGAN_FILTERS: ReadonlyArray<{ id: OrganId | 'all'; label: string }> = [
  { id: 'all', label: '全部康复案例 (4)' },
  { id: 'liver', label: '肝脏 · 脂肪肝逆转' },
  { id: 'vascular', label: '血管 · 高胆固醇转绿' },
  { id: 'heart', label: '心血管 · 高血压降阶' },
  { id: 'stomach', label: '胃黏膜 · 反酸充血修复' },
];

export const CourseRecoveryShowcase: React.FC<CourseRecoveryShowcaseProps> = ({
  variant,
  activePatient,
  inspectedCourseId,
  selectedOrgan,
  onSyncPatientCourse,
  onSelectOrganIn3D,
  onOpenPatientIn3DWidescreen,
  onOpenFullCasesPage,
  onOpenProtocolAtlas,
  ownCaseOnly = false,
  embeddedFlat = false,
}) => {
  // Embedded mode state: allow switching between current patient's own course experience vs peer benchmark cases
  const [preferredBenchmarkId, setPreferredBenchmarkId] = useState<string | undefined>(
    undefined
  );
  const [forceBenchmarkMode, setForceBenchmarkMode] = useState<boolean>(false);
  const [localPeerCourseId, setLocalPeerCourseId] = useState<string | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});

  // Full-page mode state
  const [organFilter, setOrganFilter] = useState<OrganId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFullCaseId, setSelectedFullCaseId] = useState<string>(
    RECOVERY_SUCCESS_CASES[0].id
  );
  const [selectedFullCourseId, setSelectedFullCourseId] = useState<string>(
    RECOVERY_SUCCESS_CASES[0].courseNodes[
      RECOVERY_SUCCESS_CASES[0].courseNodes.length - 1
    ].courseId
  );

  // Reset peer overrides when switching patients on the widescreen
  useEffect(() => {
    setForceBenchmarkMode(false);
    setPreferredBenchmarkId(undefined);
    setLocalPeerCourseId(null);
  }, [activePatient.id]);

  // Reset local peer course override whenever the top CourseTimelineBar changes course or organ
  useEffect(() => {
    setLocalPeerCourseId(null);
  }, [inspectedCourseId, selectedOrgan]);

  const alignedResolution = useMemo(
    () =>
      resolveAlignedCaseForPatient(
        activePatient,
        inspectedCourseId,
        selectedOrgan,
        preferredBenchmarkId
      ),
    [activePatient, inspectedCourseId, selectedOrgan, preferredBenchmarkId]
  );

  // Filtered cases for Full Page view
  const filteredCases = useMemo(
    () => filterRecoveryCases(organFilter, searchQuery),
    [organFilter, searchQuery]
  );

  // Determine active case & course node depending on variant
  const displayContext = useMemo((): {
    activeCase: RecoverySuccessCase;
    activeNode: CourseExperienceNode;
    isPeerReference: boolean;
    hasOwnCase: boolean;
  } => {
    if (variant === 'full_page') {
      const foundCase =
        filteredCases.find((c) => c.id === selectedFullCaseId) ??
        filteredCases[0] ??
        RECOVERY_SUCCESS_CASES[0];
      const foundNode =
        foundCase.courseNodes.find((n) => n.courseId === selectedFullCourseId) ??
        foundCase.courseNodes[foundCase.courseNodes.length - 1];
      return {
        activeCase: foundCase,
        activeNode: foundNode,
        isPeerReference: foundCase.patientId !== activePatient.id,
        hasOwnCase: alignedResolution.mode === 'own_case',
      };
    }

    const hasOwnCase = alignedResolution.mode === 'own_case';
    if (hasOwnCase && (ownCaseOnly || !forceBenchmarkMode)) {
      return {
        activeCase: alignedResolution.activeCase,
        activeNode: alignedResolution.alignedNode,
        isPeerReference: false,
        hasOwnCase: true,
      };
    }

    // Peer benchmark mode inside embedded widescreen
    const peerPool = RECOVERY_SUCCESS_CASES.filter((c) => c.patientId !== activePatient.id);
    const chosenPeer =
      peerPool.find((c) => c.id === preferredBenchmarkId) ??
      (alignedResolution.mode === 'peer_benchmark'
        ? alignedResolution.activeCase
        : peerPool[0]);

    const chosenNode = localPeerCourseId
      ? chosenPeer.courseNodes.find((n) => n.courseId === localPeerCourseId) ??
        chosenPeer.courseNodes[chosenPeer.courseNodes.length - 1]
      : alignedResolution.mode === 'peer_benchmark' &&
        chosenPeer.id === alignedResolution.activeCase.id
      ? alignedResolution.alignedNode
      : chosenPeer.courseNodes[chosenPeer.courseNodes.length - 1];

    return {
      activeCase: chosenPeer,
      activeNode: chosenNode,
      isPeerReference: true,
      hasOwnCase,
    };
  }, [
    variant,
    filteredCases,
    selectedFullCaseId,
    selectedFullCourseId,
    activePatient.id,
    alignedResolution,
    forceBenchmarkMode,
    ownCaseOnly,
    preferredBenchmarkId,
    localPeerCourseId,
  ]);

  const { activeCase, activeNode, isPeerReference, hasOwnCase } = displayContext;
  const photoUrl = RECOVERY_PHOTO_URLS[activeCase.photoKey];
  const photoFailed = Boolean(failedPhotos[activeCase.id]);

  const handleClickCourseNode = (node: CourseExperienceNode) => {
    if (variant === 'full_page') {
      setSelectedFullCourseId(node.courseId);
      return;
    }
    if (!isPeerReference && onSyncPatientCourse) {
      onSyncPatientCourse(node.courseId);
    } else {
      setLocalPeerCourseId(node.courseId);
    }
  };

  return (
    <section
      id="course-recovery-showcase"
      data-testid={
        variant === 'full_page'
          ? 'recovery-cases-full-page'
          : 'widescreen-course-recovery-showcase'
      }
      aria-label="治疗后康复成功案例实拍与对应疗程体感数据分析"
      className="space-y-3.5 scroll-mt-16"
    >
      {/* Full-Page Top Analytical Summary Strip */}
      {variant === 'full_page' && (
        <div className="bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-[#edf2f6]">
            <div>
              <div className="text-xs font-semibold text-[#0d7a8a]">
                大屏临床实证分析 · 康复案例实拍与按疗程体感对照库
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">
                治疗后康复成功案例分享与各疗程体验数据全景对标
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                每一例康复患者的生活实拍照片、主观体感体验评分与客观医学检验均严格对齐至具体治疗疗程（初诊基线 → 第1疗程 → 第2/3疗程康复结案）。
              </p>
            </div>

            {onOpenProtocolAtlas && (
              <button
                type="button"
                onClick={onOpenProtocolAtlas}
                className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] hover:border-[#8ac6d1] text-xs font-semibold text-[#0d7a8a] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <span>对照 17 项系统默认治疗方案图谱</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4-Column Tabular Analytical Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x lg:divide-[#edf2f6]">
            <div className="lg:pr-5">
              <div className="text-xs text-slate-500">实证追踪标杆案例</div>
              <div className="flex items-baseline gap-1.5 mt-1 font-num">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                  4
                </span>
                <span className="text-xs text-slate-500">例全周期影像体感建档</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                覆盖脂肪肝 · 高胆固醇 · 高血压 · 胃黏膜
              </div>
            </div>

            <div className="lg:px-5">
              <div className="text-xs text-slate-500">2–3 疗程主观体感改善度</div>
              <div className="flex items-baseline gap-1.5 mt-1 font-num">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 leading-none">
                  +64%
                </span>
                <span className="text-xs text-slate-500">精力与深睡评分均值</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                餐后反酸、午后头晕与困倦清零验证
              </div>
            </div>

            <div className="lg:px-5">
              <div className="text-xs text-slate-500">结案案例核心指标转绿率</div>
              <div className="flex items-baseline gap-1.5 mt-1 font-num">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0d7a8a] leading-none">
                  100%
                </span>
                <span className="text-xs text-slate-500">非药物功能营养逆转</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 font-num">
                肝脂最低降至 4.3% · 血压最高降 20mmHg
              </div>
            </div>

            <div className="lg:pl-5">
              <div className="text-xs text-slate-500">标准验证单疗程跨度</div>
              <div className="flex items-baseline gap-1.5 mt-1 font-num">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                  15–90
                </span>
                <span className="text-xs text-slate-500">天 / 单疗程闭环</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                点击任一案例可直接切入其 3D 疗程对比大屏
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="pt-3 border-t border-[#edf2f6] flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
            <div
              role="group"
              aria-label="按康复靶向器官筛选案例"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
            >
              {CASE_ORGAN_FILTERS.map((f) => {
                const active = organFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setOrganFilter(f.id);
                      const nextList = filterRecoveryCases(f.id, searchQuery);
                      if (nextList.length > 0 && !nextList.some((c) => c.id === selectedFullCaseId)) {
                        const first = nextList[0];
                        setSelectedFullCaseId(first.id);
                        setSelectedFullCourseId(
                          first.courseNodes[first.courseNodes.length - 1].courseId
                        );
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#0d7a8a] text-white'
                        : 'bg-[#f8fafc] border border-[#dce5ec] text-slate-700 hover:border-[#8ac6d1]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full xl:w-80 shrink-0">
              <label htmlFor="recovery-case-search" className="sr-only">
                搜索康复案例姓名、症状或方案名称
              </label>
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="recovery-case-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="检索案例姓名 / 护肝菌 / 优康力 / 太空晶球..."
                className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="清空案例搜索"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Case Selector Strip */}
          {filteredCases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {filteredCases.map((c) => {
                const selected = c.id === activeCase.id;
                const finalNode = c.courseNodes[c.courseNodes.length - 1];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedFullCaseId(c.id);
                      setSelectedFullCourseId(finalNode.courseId);
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'bg-[#eaf5f7]/80 border-[#0d7a8a]'
                        : 'bg-[#f8fafc] border-[#dce5ec] hover:bg-white hover:border-[#8ac6d1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900 inline-flex items-center gap-1.5">
                        <OrganIcon organId={c.primaryOrgan} className="w-3.5 h-3.5 text-[#0d7a8a]" />
                        <span>{c.patientName}</span>
                        <span className="font-normal text-slate-500">· {c.genderAgeText}</span>
                      </span>
                      <span className="font-num font-bold text-emerald-700 whitespace-nowrap">
                        体感 {finalNode.experienceScore}分
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#0d7a8a] mt-1 truncate">
                      {c.outcomeBadge}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {c.curedSummaryTitle}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              未检索到匹配的康复案例，请点击清空筛选条件查看全部 4 例标杆档案。
            </div>
          )}
        </div>
      )}

      {/* Main Course-Aligned Photo + Experience Data + Lab Remission Widescreen Panel */}
      <div
        className={
          embeddedFlat
            ? 'p-4 sm:p-5 space-y-4'
            : 'bg-white border border-[#dce5ec] rounded-2xl p-4 sm:p-5 space-y-4'
        }
      >
        {/* Top Bar: Context Header + Benchmark Switcher + Course Alignment Stepper */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3.5 border-b border-[#edf2f6]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-bold text-[#0d7a8a] inline-flex items-center gap-1 whitespace-nowrap">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {variant === 'full_page'
                    ? `案例实证详情 · ${activeCase.patientName}`
                    : isPeerReference
                    ? '同方案康复成功案例对照（患者治好实拍 & 疗程体验对标）'
                    : '本患者治疗康复分享与对应疗程体感数据'}
                </span>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-500">
                {variant === 'full_page'
                  ? `${activeCase.genderAgeText} · ${activeCase.occupationTag} · ${activeCase.totalDurationText}`
                  : isPeerReference
                  ? `对照标杆：${activeCase.patientName}（${activeCase.genderAgeText} · ${activeCase.outcomeBadge}）`
                  : `${activeCase.occupationTag} · ${activeCase.outcomeBadge} · 与上方所选疗程实时同步`}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
              {activeCase.curedSummaryTitle}
            </h2>
          </div>

          {/* Right Controls: Own vs Peer Case Switcher (on embedded widescreen) + Full Case Library Link */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {variant === 'embedded' && (
              <>
                {!ownCaseOnly && hasOwnCase && (
                  <div
                    role="group"
                    aria-label="切换本患者体感记录或同科康复案例"
                    className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => setForceBenchmarkMode(false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        !forceBenchmarkMode
                          ? 'bg-white text-[#0d7a8a] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      本患者疗程实证
                    </button>
                    <button
                      type="button"
                      onClick={() => setForceBenchmarkMode(true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        forceBenchmarkMode
                          ? 'bg-white text-[#0d7a8a] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      对照其他治愈案例
                    </button>
                  </div>
                )}

                {!ownCaseOnly && isPeerReference && (
                  <div
                    role="group"
                    aria-label="切换同病种康复成功案例"
                    className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-0.5 overflow-x-auto no-scrollbar"
                  >
                    {RECOVERY_SUCCESS_CASES.filter(
                      (c) => c.patientId !== activePatient.id && c.id !== 'case-linxiao'
                    ).map((peer) => {
                      const active = peer.id === activeCase.id;
                      return (
                        <button
                          key={peer.id}
                          type="button"
                          onClick={() => {
                            setPreferredBenchmarkId(peer.id);
                            setLocalPeerCourseId(null);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                            active
                              ? 'bg-white text-[#0d7a8a] shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {peer.patientName} · {ORGAN_RECORDS[peer.primaryOrgan].name}康复
                        </button>
                      );
                    })}
                  </div>
                )}

                {onOpenFullCasesPage && (
                  <button
                    type="button"
                    onClick={onOpenFullCasesPage}
                    className="px-3 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-xs font-semibold text-[#0d7a8a] inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>全部康复案例库</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}

            {variant === 'full_page' && onOpenPatientIn3DWidescreen && (
              <button
                type="button"
                onClick={() =>
                  onOpenPatientIn3DWidescreen(activeCase.patientId, activeNode.courseId)
                }
                className="px-4 py-2 rounded-xl bg-[#0d7a8a] hover:bg-[#096472] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <span>载入该案例三维疗程对比大屏</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Course Alignment Track: Strictly aligns Photo, Experience Data & Lab Proof to Course 0 -> Course 1 -> Course 2/3 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-[#f8fafc] border border-[#e6eef3] rounded-xl px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-1">
              对齐疗程阶段：
            </span>
            {activeCase.courseNodes.map((node, idx) => {
              const selected = node.courseId === activeNode.courseId;
              return (
                <React.Fragment key={node.courseId}>
                  {idx > 0 && (
                    <ChevronRight
                      className="w-3.5 h-3.5 text-slate-300 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleClickCourseNode(node)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                      selected
                        ? 'bg-[#0d7a8a] text-white shadow-2xs'
                        : 'bg-white border border-[#dce5ec] text-slate-700 hover:border-[#8ac6d1]'
                    }`}
                  >
                    <span>{node.courseLabel}</span>
                    <span
                      className={`font-num text-[11px] ${
                        selected ? 'text-teal-100' : 'text-slate-400'
                      }`}
                    >
                      体感{node.experienceScore}分
                    </span>
                    {node.milestoneStatus === 'cured' && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          selected ? 'text-emerald-200' : 'text-emerald-600'
                        }`}
                      />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="text-xs text-slate-600 font-num whitespace-nowrap">
            当前展示节点：<strong className="text-slate-900">{activeNode.durationLabel}</strong> · 记录日期{' '}
            {activeNode.sharedDate}
          </div>
        </div>

        {/* 3-Column Widescreen Analytical Grid:
            Col 1: Patient Shared Recovery Photo & Regimen Context
            Col 2: Subjective Experience Metrics (4 Quantitative Bars) & Patient First-Person Sharing
            Col 3: Aligned Objective Lab Remission Proof & Attending Doctor Review */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1.15fr)_380px] gap-4 items-stretch">
          {/* Column 1: Patient Shared Photo */}
          <div className="flex flex-col justify-between border border-[#e6eef3] rounded-xl overflow-hidden bg-[#f8fafc]">
            <div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden">
              {!photoFailed ? (
                <img
                  src={photoUrl}
                  alt={`${activeCase.patientName} ${activeCase.photoLocationTag}`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedPhotos((prev) => ({ ...prev, [activeCase.id]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0f2937] via-[#134e5e] to-[#0d7a8a] p-5 flex flex-col justify-between text-white">
                  <div className="inline-flex items-center gap-1.5 text-xs text-teal-100">
                    <Camera className="w-4 h-4" />
                    <span>患者康复实拍归档影像</span>
                  </div>
                  <div>
                    <div className="text-base font-bold">{activeCase.patientName} · 康复生活打卡</div>
                    <div className="text-xs text-teal-100 mt-1">{activeCase.photoLocationTag}</div>
                  </div>
                </div>
              )}

              {/* Measured Scrim Overlay for Guaranteed >7:1 Contrast on Outdoor Daylight Photos */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-3.5 pt-12 pb-3 text-white">
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#8ee7f0] font-semibold drop-shadow-xs">
                  <span className="inline-flex items-center gap-1 truncate">
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{activeCase.photoLocationTag}</span>
                  </span>
                  <span className="font-num shrink-0 text-white/90">{activeNode.sharedDate}</span>
                </div>
                <div className="text-xs font-semibold text-white mt-0.5 line-clamp-1 drop-shadow-xs">
                  {activeNode.photoCaption}
                </div>
              </div>
            </div>

            <div className="p-3.5 space-y-1.5">
              <div className="text-[11px] text-slate-500">
                对应执行方案（系统默认方案矩阵对齐）
              </div>
              <div className="text-xs font-bold text-slate-900 leading-snug">
                {activeCase.appliedRegimenTitle}
              </div>
              <div className="text-[11px] text-slate-500 font-num">
                周期跨度：{activeCase.totalDurationText}
              </div>
            </div>
          </div>

          {/* Column 2: Course-Aligned Subjective Experience Metrics & Patient First-Person Sharing */}
          <div className="flex flex-col justify-between border border-[#e6eef3] rounded-xl p-4 space-y-3.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-[#0d7a8a]">
                    {activeNode.courseLabel} · 患者主观体验与穿戴监测数据
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                    {activeNode.milestoneTitle}
                  </h3>
                </div>
                <div className="text-right shrink-0 font-num">
                  <div className="text-[11px] text-slate-500">综合体感指数</div>
                  <div className="text-xl font-extrabold text-[#0d7a8a] leading-none mt-0.5">
                    {activeNode.experienceScore}
                    <span className="text-xs font-semibold text-slate-500 ml-0.5">/100</span>
                  </div>
                </div>
              </div>

              {/* 4 Tabular Experience Metric Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {activeNode.experienceMetrics.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#edf2f6] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-700 truncate">{m.label}</span>
                      <span
                        className={`font-num text-[11px] font-semibold whitespace-nowrap ${
                          activeNode.courseNo === 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {m.deltaBadge}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 font-num">
                      <span className="text-sm font-extrabold text-slate-900">
                        {m.currentText}
                      </span>
                      {activeNode.courseNo > 0 && (
                        <span className="text-[11px] text-slate-400">
                          初诊 {m.baselineText}
                        </span>
                      )}
                    </div>

                    <div className="h-1.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          activeNode.courseNo === 0
                            ? 'bg-amber-500'
                            : m.wellnessPercent >= 85
                            ? 'bg-emerald-500'
                            : 'bg-[#0d7a8a]'
                        }`}
                        style={{ width: `${m.wellnessPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient First-Person Experience Quote for this Exact Course */}
            <div className="pt-3 border-t border-[#edf2f6] space-y-1">
              <div className="text-xs font-bold text-slate-800">
                患者「{activeNode.courseLabel}」真实体感分享：
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                “{activeNode.patientQuote}”
              </p>
            </div>
          </div>

          {/* Column 3: Course-Aligned Objective Lab Proof & 3D Organ Linkage */}
          <div className="flex flex-col justify-between border border-[#e6eef3] rounded-xl p-4 space-y-3.5 bg-[#fbfdfe]">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-900">
                  同疗程客观医学检验印证（初诊 → {activeNode.courseLabel}）
                </div>
                {onSelectOrganIn3D && variant === 'embedded' && (
                  <button
                    type="button"
                    onClick={() => onSelectOrganIn3D(activeCase.primaryOrgan)}
                    className="text-xs font-semibold text-[#0d7a8a] hover:text-[#096472] inline-flex items-center gap-0.5 whitespace-nowrap"
                  >
                    <span>定位3D{ORGAN_RECORDS[activeCase.primaryOrgan].name}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#edf2f6] border border-[#e6eef3] rounded-xl bg-white px-3">
                {activeNode.labProofs.map((proof) => (
                  <div
                    key={proof.label}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 whitespace-nowrap">
                        {proof.label}
                      </div>
                      <div className="text-[11px] text-slate-400 font-num whitespace-nowrap">
                        参考 {proof.referenceRange}
                      </div>
                    </div>

                    <div className="text-right font-num shrink-0">
                      <div className="flex items-center justify-end gap-1">
                        {activeNode.courseNo > 0 && (
                          <>
                            <span className="text-[11px] text-slate-400">
                              {proof.baselineValue}
                            </span>
                            <span className="text-slate-300">→</span>
                          </>
                        )}
                        <strong
                          className={`font-bold ${
                            proof.achievedNormal ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {proof.courseValue}
                        </strong>
                      </div>
                      <div
                        className={`text-[10px] font-semibold ${
                          proof.achievedNormal ? 'text-emerald-600' : 'text-slate-500'
                        }`}
                      >
                        {proof.achievedNormal ? '已达标改善' : '阶段调控中'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attending Doctor Clinical Sign-Off & Action */}
            <div className="pt-3 border-t border-[#edf2f6] space-y-2">
              <div className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
                <Stethoscope className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0 mt-0.5" />
                <span>{activeCase.attendingDoctorComment}</span>
              </div>

              {variant === 'embedded' &&
                isPeerReference &&
                onOpenPatientIn3DWidescreen && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenPatientIn3DWidescreen(activeCase.patientId, activeNode.courseId)
                    }
                    className="w-full py-2 px-3 rounded-xl bg-[#eaf5f7] hover:bg-[#d7ecf0] border border-[#9fd0d9] text-xs font-semibold text-[#0d7a8a] inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <span>切入「{activeCase.patientName}」三维疗程对比大屏查看完整轨迹</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
