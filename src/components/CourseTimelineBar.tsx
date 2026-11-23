import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Flag,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  Target,
  X,
} from 'lucide-react';
import { OrganId } from '../utils/healthModel';
import {
  CONSULTATION_TOPICS,
  ClinicalComparisonResult,
  ConsultationTopicId,
} from '../utils/clinicalComparison';
import { computeBmi, deriveClinicalEvaluation } from '../utils/clinicalWorkflow';
import {
  AttendingDoctorProfile,
  PatientCohortRecord,
  PatientRosterSummary,
  getAttendingDoctorById,
} from '../utils/patientCohort';
import { buildPatientTimelineAndBaselines } from '../utils/courseTimelineBaseline';
import { COURSE_CYCLE_PRESETS } from '../utils/defaultProtocols';

interface CourseTimelineBarProps {
  patient: PatientCohortRecord;
  currentDoctor: AttendingDoctorProfile;
  allSummaries: PatientRosterSummary[];
  comparison: ClinicalComparisonResult;
  activeTopic: ConsultationTopicId;
  selectedOrgan: OrganId | null;
  presentationMode: boolean;
  onBackToRoster: () => void;
  onTogglePresentationMode: () => void;
  onQuickSwitchPatient: (patientId: string) => void;
  onSelectCourses: (activeCourseId: string, compareCourseId: string) => void;
  onSelectTopic: (topicId: ConsultationTopicId) => void;
  onStartNewCourse: (input: {
    stageTitle: string;
    cycleWeeks: number;
    focusRegimenSummary: string;
    doctorCourseNote: string;
  }) => string | null;
}

export const CourseTimelineBar: React.FC<CourseTimelineBarProps> = ({
  patient,
  currentDoctor,
  allSummaries,
  comparison,
  activeTopic,
  selectedOrgan,
  presentationMode,
  onBackToRoster,
  onTogglePresentationMode,
  onQuickSwitchPatient,
  onSelectCourses,
  onSelectTopic,
  onStartNewCourse,
}) => {
  const [newCourseOpen, setNewCourseOpen] = useState<boolean>(false);
  const [stageTitle, setStageTitle] = useState<string>('指标全面归绿巩固维持期');
  const [cycleWeeks, setCycleWeeks] = useState<string>('12');
  const [focusRegimenSummary, setFocusRegimenSummary] = useState<string>(
    '低钠高纤自主膳食 + 每周 4 次靶心率有氧运动防反弹'
  );
  const [doctorCourseNote, setDoctorCourseNote] = useState<string>('');
  const [courseErr, setCourseErr] = useState<string | null>(null);

  const profile = patient.clinicalState.patientProfile;
  const patientDoctor = getAttendingDoctorById(patient.attendingDoctorId);
  const activeCourse =
    comparison.courseMeta?.activeCourse ?? patient.courses[patient.courses.length - 1];
  const liveBmi = computeBmi(activeCourse.weightKg, profile.heightCm);

  const baselineBundle = useMemo(
    () => buildPatientTimelineAndBaselines(patient),
    [patient]
  );

  const latestCourse = patient.courses[patient.courses.length - 1];
  const interventionCourses = useMemo(
    () =>
      patient.courses.length > 1
        ? patient.courses.filter((c) => c.courseNo > 0)
        : patient.courses,
    [patient.courses]
  );

  const isVsTarget = patient.compareCourseId === 'target_course_end';

  const courseScores = useMemo(() => {
    const map: Record<string, number> = {};
    patient.courses.forEach((c) => {
      const ev = deriveClinicalEvaluation(profile, c.metrics, c.weightKg, []);
      map[c.id] = ev.healthScore;
    });
    return map;
  }, [patient.courses, profile]);

  const handleConfirmNewCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onStartNewCourse({
      stageTitle,
      cycleWeeks: Number(cycleWeeks),
      focusRegimenSummary,
      doctorCourseNote,
    });
    if (err) {
      setCourseErr(err);
      return;
    }
    setCourseErr(null);
    setNewCourseOpen(false);
  };

  return (
    <section
      aria-label="全局唯一基线与疗程对比总控栏"
      className="bg-white border border-[#dce5ec] rounded-2xl px-3.5 sm:px-5 py-2.5 space-y-2"
    >
      {/* Row 1: Patient Identity + Fast Patient Switcher | Clinic Storefront & Attending Doctor Attribution */}
      <div className="pb-2 border-b border-[#edf2f6] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap min-w-0 shrink-0">
          <button
            type="button"
            onClick={onBackToRoster}
            className="px-2.5 py-1 rounded-lg bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-xs font-semibold text-slate-700 hover:text-[#0d7a8a] inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#0d7a8a]" />
            <span>患者列表</span>
          </button>

          <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            {profile.name} · 疗程对比
          </h1>

          <div className="flex items-center gap-1 text-xs text-slate-500 font-num whitespace-nowrap shrink-0">
            <span>{profile.gender}</span>
            <span aria-hidden="true">·</span>
            <span>{profile.age}岁</span>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline">BMI {liveBmi}</span>
          </div>

          <label htmlFor="quick-patient-switcher" className="sr-only">
            快速切换在管患者
          </label>
          <select
            id="quick-patient-switcher"
            value={patient.id}
            onChange={(e) => onQuickSwitchPatient(e.target.value)}
            className="bg-[#f8fafc] border border-[#dce5ec] rounded-lg px-2 py-1 text-xs font-semibold text-[#0d7a8a] focus:outline-none focus:border-[#0d7a8a] max-w-[190px] truncate shrink-0"
          >
            {allSummaries.map((p) => (
              <option key={p.id} value={p.id}>
                切换患者：{p.name}（{p.activeCourseLabel} · {p.currentScore}分）
              </option>
            ))}
          </select>
        </div>

        {/* Clinic Storefront Name, Street Address & Attending Doctor */}
        <div className="flex items-center justify-between xl:justify-end gap-2 min-w-0 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 min-w-0 flex-wrap xl:flex-nowrap">
            <span className="inline-flex items-center gap-1 font-bold text-slate-800 whitespace-nowrap shrink-0">
              <Building2 className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
              <span>{currentDoctor.clinicName}</span>
            </span>
            <span className="text-slate-300 hidden md:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-slate-500 truncate min-w-0">
              <MapPin className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
              <span className="truncate">{currentDoctor.clinicAddress}</span>
            </span>
            <span className="text-slate-300 shrink-0" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-500 whitespace-nowrap shrink-0">
              医师：<strong className="text-slate-800">{currentDoctor.name}</strong>
              {patientDoctor.id !== currentDoctor.id ? `（主管：${patientDoctor.name}）` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={onTogglePresentationMode}
            className="hidden md:inline-flex px-2.5 py-1 rounded-lg border border-[#dce5ec] bg-[#f8fafc] hover:bg-slate-100 text-xs font-semibold text-slate-700 items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            {presentationMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#0d7a8a]" />
                <span>退出宽屏</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#0d7a8a]" />
                <span>宽屏讲解</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Row 2: FULL-WIDTH UNIFIED BASELINE (B001/B002/Target) ══▶ EVALUATED COURSE CONTROLLER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        {/* ① Lock Reference Baseline */}
        <div
          role="group"
          aria-label="选择对比基准线"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
        >
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 whitespace-nowrap mr-0.5">
            <Flag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>① 对比基准：</span>
          </span>

          {baselineBundle.baselinePackagesAsc.map((pkg) => {
            const isLocked = !isVsTarget && patient.compareCourseId === pkg.linkedCourseId;
            const labelText =
              pkg.targetCourseNo === 1
                ? `${pkg.code} · 首诊基线`
                : `${pkg.code} · ${pkg.targetCourseNo}期起点`;
            return (
              <button
                key={pkg.code}
                type="button"
                data-testid={`baseline-pkg-${pkg.code}`}
                aria-pressed={isLocked}
                onClick={() => {
                  const nextActive =
                    activeCourse.id === pkg.linkedCourseId && patient.courses.length > 1
                      ? latestCourse.id
                      : activeCourse.id;
                  onSelectCourses(nextActive, pkg.linkedCourseId);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                  isLocked
                    ? 'bg-[#fffbeb] border-amber-500 text-amber-950 font-extrabold'
                    : 'bg-[#f8fafc] hover:bg-amber-50/50 border-[#e2e8f0] text-slate-700 font-semibold'
                }`}
              >
                <span>{labelText}</span>
                <span className="font-num text-[11px] text-slate-500">{pkg.healthScore}分</span>
              </button>
            );
          })}

          <button
            type="button"
            data-testid="baseline-pkg-target"
            aria-pressed={isVsTarget}
            onClick={() => onSelectCourses(activeCourse.id, 'target_course_end')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
              isVsTarget
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold'
                : 'bg-[#f8fafc] hover:bg-emerald-50/50 border-dashed border-emerald-300 text-emerald-800 font-semibold'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>结案靶值</span>
          </button>
        </div>

        <ArrowRight
          className="hidden xl:block w-4 h-4 text-slate-300 shrink-0"
          aria-hidden="true"
        />

        {/* ② Select Evaluated Treatment Course (All Courses Visible Side-by-Side) */}
        <div
          role="group"
          aria-label="选择当前评估疗程"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-0.5">
            ② 评估疗程：
          </span>

          {interventionCourses.map((course, idx) => {
            const isInspected = activeCourse.id === course.id;
            const score = courseScores[course.id] ?? 86;
            const subDate =
              course.courseNo === 0
                ? '首诊基线期'
                : course.status === 'completed'
                ? '已结案'
                : `${course.elapsedWeeks}/${course.cycleWeeks}周`;

            return (
              <React.Fragment key={course.id}>
                {idx > 0 && (
                  <ChevronRight
                    className="w-3.5 h-3.5 text-slate-300 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  aria-pressed={isInspected}
                  onClick={() => {
                    const nextCompare =
                      patient.compareCourseId === course.id
                        ? patient.courses[0].id
                        : patient.compareCourseId;
                    onSelectCourses(course.id, nextCompare);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    isInspected
                      ? 'bg-[#0d7a8a] border-[#0d7a8a] text-white font-extrabold'
                      : 'bg-[#f8fafc] hover:border-[#8ac6d1] border-[#e2e8f0] text-slate-700 font-semibold'
                  }`}
                >
                  <span>{course.courseLabel}</span>
                  <span
                    className={`font-num text-[11px] ${
                      isInspected ? 'text-cyan-100' : 'text-slate-500'
                    }`}
                  >
                    {score}分 · {subDate}
                  </span>
                  {course.status === 'completed' && course.courseNo > 0 && (
                    <CheckCircle2
                      className={`w-3 h-3 shrink-0 ${
                        isInspected ? 'text-emerald-200' : 'text-emerald-600'
                      }`}
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setCourseErr(null);
              setNewCourseOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-dashed border-[#9ccbd4] hover:border-[#0d7a8a] bg-[#f8fafc] hover:bg-[#eaf5f7] text-xs font-semibold text-[#0d7a8a] inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新启第{latestCourse.courseNo + 1}疗程</span>
          </button>
        </div>
      </div>

      {/* Row 3: Lightweight Organ Focus Filter + Current Comparison Summary */}
      <div className="pt-2 border-t border-[#edf2f6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div
          role="group"
          aria-label="诊室讲解聚焦部位"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
        >
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap mr-1">
            讲解聚焦：
          </span>
          {CONSULTATION_TOPICS.map((topic) => {
            const isActive =
              activeTopic === topic.id &&
              (topic.organId === null
                ? selectedOrgan === null
                : selectedOrgan === topic.organId);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onSelectTopic(topic.id)}
                className={`px-2.5 py-0.5 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 border ${
                  isActive
                    ? 'bg-[#eaf5f7] border-[#0d7a8a] text-[#0d7a8a] font-bold'
                    : 'bg-white border-[#e2e8f0] text-slate-600 hover:border-[#8ac6d1] hover:text-[#0d7a8a] font-medium'
                }`}
              >
                {topic.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-num whitespace-nowrap truncate">
          当前口径：
          <strong className="text-amber-800 font-sans mx-1">{comparison.referenceLabel}</strong>
          <span aria-hidden="true">→</span>
          <strong className="text-[#0d7a8a] font-sans ml-1">{activeCourse.courseLabel}</strong>
          <span className="hidden md:inline text-slate-400 font-sans ml-1.5">
            · {activeCourse.stageTitle}
          </span>
        </div>
      </div>

      {/* Modal: Start Next Treatment Course */}
      {newCourseOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewCourseOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-next-course-title"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-[#dce5ec] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#edf2f6] flex items-center justify-between">
              <div>
                <h2 id="start-next-course-title" className="text-base font-bold text-slate-900">
                  结案当前阶段并开启第 {latestCourse.courseNo + 1} 疗程
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  系统将自动归档「{latestCourse.courseLabel}」指标作为对照基准，并创建新一期管理疗程
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewCourseOpen(false)}
                aria-label="关闭新疗程弹窗"
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmNewCourse} className="p-5 space-y-3.5">
              {courseErr && (
                <div
                  role="alert"
                  className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{courseErr}</span>
                </div>
              )}

              <div>
                <label htmlFor="next-course-title" className="block text-xs font-medium text-slate-700 mb-1">
                  新疗程阶段目标名称 *
                </label>
                <input
                  id="next-course-title"
                  type="text"
                  value={stageTitle}
                  onChange={(e) => setStageTitle(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>

              <div>
                <label htmlFor="next-course-weeks" className="block text-xs font-medium text-slate-700 mb-1">
                  新疗程标准天数 / 周次周期
                </label>
                <select
                  id="next-course-weeks"
                  value={cycleWeeks}
                  onChange={(e) => setCycleWeeks(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs font-num text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                >
                  {COURSE_CYCLE_PRESETS.map((opt) => (
                    <option key={opt.cycleWeeks} value={String(opt.cycleWeeks)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="next-course-regimen" className="block text-xs font-medium text-slate-700 mb-1">
                  核心方案组合摘要
                </label>
                <input
                  id="next-course-regimen"
                  type="text"
                  value={focusRegimenSummary}
                  onChange={(e) => setFocusRegimenSummary(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>

              <div>
                <label htmlFor="next-course-note" className="block text-xs font-medium text-slate-700 mb-1">
                  主治医生阶段医嘱备注
                </label>
                <textarea
                  id="next-course-note"
                  rows={2}
                  value={doctorCourseNote}
                  onChange={(e) => setDoctorCourseNote(e.target.value)}
                  placeholder="选填：记录开启新疗程的调整依据..."
                  className="w-full bg-[#f8fafc] border border-[#dce5ec] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0d7a8a]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewCourseOpen(false)}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl border border-[#dce5ec] text-xs font-semibold text-slate-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0d7a8a] hover:bg-[#096472] text-white text-xs font-semibold"
                >
                  确认开启第 {latestCourse.courseNo + 1} 疗程
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
