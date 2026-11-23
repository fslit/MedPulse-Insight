import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  ChevronDown,
  ChevronLeft,
  Layers,
  MapPin,
  Scan,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  ActionPlanItem,
  BodyVistaLayerKey,
  BodyVistaLayerLevel,
  NavTabId,
  ORGAN_ORDER,
  OrganId,
  StageMode,
  getDefaultLayersForMode,
} from './utils/healthModel';
import {
  CheckupReportBatch,
  ClinicalClosedLoopState,
  FollowupRecheckRecord,
  LabMetricsSnapshot,
  ManagedTaskItem,
  PatientProfile,
  PlanPublicationInfo,
  ProtocolTemplate,
  SymptomFeedbackItem,
  UserRole,
  WorkflowStepId,
  buildLongitudinalTrends,
  deriveClinicalEvaluation,
  getEffectiveLabMetrics,
} from './utils/clinicalWorkflow';
import {
  DefaultOrganProtocol,
  convertDefaultProtocolToManagedTask,
  matchDefaultProtocolsForPatient,
} from './utils/defaultProtocols';
import {
  CONSULTATION_TOPICS,
  ConsultationTopicId,
  buildDoctorConsultationBrief,
  computeCourseComparison,
} from './utils/clinicalComparison';
import {
  ATTENDING_DOCTORS,
  CohortStoreState,
  PatientCohortRecord,
  filterAndSortPatientRoster,
  getAttendingDoctorById,
  loadCohortStore,
  saveCohortStore,
  startNextTreatmentCourse,
  summarizePatientForRoster,
  syncClinicalStateIntoPatient,
} from './utils/patientCohort';
import { RECOVERY_SUCCESS_CASES } from './utils/recoveryCases';
import { Human3DStage } from './components/Human3DStage';
import { DetailSheetModal, ModalState } from './components/DetailSheetModal';
import { SecondaryViews } from './components/SecondaryViews';
import { WorkflowClosedLoopBar } from './components/WorkflowClosedLoopBar';
import { PatientIntakeAndExecution } from './components/PatientIntakeAndExecution';
import { DoctorClinicalWorkbench } from './components/DoctorClinicalWorkbench';
import { AnatomyPresetId, SystemComparisonRadar } from './components/SystemComparisonRadar';
import { BiomarkerComparisonPanel } from './components/BiomarkerComparisonPanel';
import { PatientRosterView } from './components/PatientRosterView';
import { CourseTimelineBar } from './components/CourseTimelineBar';
import { CourseRecoveryShowcase } from './components/CourseRecoveryShowcase';
import { ConsultationWorkbenchSection } from './components/ConsultationWorkbenchSection';
import { ConsultationWorkbenchTabId } from './utils/consultationWorkbench';
import {
  HealthIssueKey,
  IndicatorCourseTrajectory,
  IndicatorKey,
  buildPatientProblemCourseHierarchy,
} from './utils/problemCourseAnalytics';

const PATIENT_WORKSPACE_NAV: ReadonlyArray<{ id: NavTabId; label: string }> = [
  { id: 'roster', label: '患者档案' },
  { id: 'report', label: '疗程对比' },
  { id: 'cases', label: '康复案例' },
  { id: 'protocol', label: '方案图谱' },
  { id: 'profile', label: '系统画像' },
];

const MOBILE_PATIENT_TABS: ReadonlyArray<{
  id: NavTabId;
  label: string;
  icon: 'roster' | 'scan' | 'cases' | 'protocol' | 'profile';
}> = [
  { id: 'roster', label: '患者档案', icon: 'roster' },
  { id: 'report', label: '疗程对比', icon: 'scan' },
  { id: 'cases', label: '康复案例', icon: 'cases' },
  { id: 'protocol', label: '方案图谱', icon: 'protocol' },
  { id: 'profile', label: '系统画像', icon: 'profile' },
];

function resolveInitialPatientFromUrl(store: CohortStoreState): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const directPatient = params.get('patient');
  if (directPatient && store.patients.some((p) => p.id === directPatient)) {
    return directPatient;
  }
  if (params.get('autostart') === '1') {
    return store.patients[0]?.id ?? null;
  }
  return null;
}

export default function App() {
  const [cohortStore, setCohortStore] = useState<CohortStoreState>(() => loadCohortStore());
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(() =>
    resolveInitialPatientFromUrl(loadCohortStore())
  );
  const [activeNav, setActiveNav] = useState<NavTabId>(() =>
    resolveInitialPatientFromUrl(loadCohortStore()) ? 'report' : 'roster'
  );
  const [openCreateModalSignal, setOpenCreateModalSignal] = useState<number>(0);
  const [doctorModalOpen, setDoctorModalOpen] = useState<boolean>(false);
  const [presentationMode, setPresentationMode] = useState<boolean>(false);

  // Widescreen Doctor-Patient Course Comparison & Step-by-Step Workbench Controls
  const [activeTopic, setActiveTopic] = useState<ConsultationTopicId>('all');
  const [selectedIssueKey, setSelectedIssueKey] = useState<HealthIssueKey | 'all'>('all');
  const [selectedIndicatorKey, setSelectedIndicatorKey] = useState<IndicatorKey>('systolicBp');
  const [workbenchTab, setWorkbenchTab] =
    useState<ConsultationWorkbenchTabId>('trend_evolution');

  // 3D Stage & Layer Controls
  const [stageMode, setStageMode] = useState<StageMode>('atlas');
  const [layers, setLayers] = useState<Record<BodyVistaLayerKey, BodyVistaLayerLevel>>({
    skin: 1,
    muscular: 1,
    skeletal: 2,
    vascular: 3,
    visceral: 3,
  });
  const [activePreset, setActivePreset] = useState<AnatomyPresetId>('all');
  const [anatomyQuery, setAnatomyQuery] = useState<string>('');

  const [selectedOrgan, setSelectedOrgan] = useState<OrganId | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });

  const [followedOrgans, setFollowedOrgans] = useState<OrganId[]>(['heart', 'liver', 'vascular']);
  const [completedPlans, setCompletedPlans] = useState<ActionPlanItem['id'][]>([]);
  const [bookingDate, setBookingDate] = useState<string>('2027-02-19');
  const [bookingSubmitted, setBookingSubmitted] = useState<boolean>(false);

  useEffect(() => {
    saveCohortStore(cohortStore);
  }, [cohortStore]);

  // Warm the browser HTTP cache for the 3D BodyVista GLB while the clinician browses the Roster
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch('/models/bodyvista_anatomy.glb').catch(() => {});
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  const currentDoctor = useMemo(
    () => getAttendingDoctorById(cohortStore.currentDoctorId),
    [cohortStore.currentDoctorId]
  );
  const attendingDoctorSignOff = `${currentDoctor.name} ${currentDoctor.title} · ${currentDoctor.clinicName}`;

  // Real-time chronological summaries for the Patient Roster table & quick patient switcher
  const rosterSummaries = useMemo(() => {
    const raw = cohortStore.patients.map(summarizePatientForRoster);
    return filterAndSortPatientRoster(raw, { sortBy: 'updated_desc' });
  }, [cohortStore.patients]);

  // Active patient record (falls back to first chronologically updated patient only for internal memo safety)
  const activePatientRecord: PatientCohortRecord = useMemo(() => {
    if (selectedPatientId) {
      const found = cohortStore.patients.find((p) => p.id === selectedPatientId);
      if (found) return found;
    }
    return cohortStore.patients[0];
  }, [cohortStore.patients, selectedPatientId]);

  const clinicalState = activePatientRecord.clinicalState;
  const isRosterView = !selectedPatientId || activeNav === 'roster';

  const handleSwitchLoggedInDoctor = useCallback((doctorId: string) => {
    setCohortStore((prev) => ({
      ...prev,
      currentDoctorId: doctorId,
    }));
    setDoctorModalOpen(false);
  }, []);

  // Helper to update the currently selected patient's ClinicalClosedLoopState & sync into their active course
  const updateActivePatientClinicalState = useCallback(
    (updater: (prev: ClinicalClosedLoopState) => ClinicalClosedLoopState) => {
      const targetId = selectedPatientId ?? cohortStore.patients[0]?.id;
      if (!targetId) return;
      setCohortStore((prevStore) => ({
        ...prevStore,
        patients: prevStore.patients.map((pat) => {
          if (pat.id !== targetId) return pat;
          const nextClinical = updater(pat.clinicalState);
          return syncClinicalStateIntoPatient(pat, nextClinical);
        }),
      }));
    },
    [selectedPatientId, cohortStore.patients]
  );

  // Enter a specific patient's workspace from the Roster
  const handleSelectPatientFromRoster = useCallback(
    (patientId: string, initialTab: NavTabId = 'report') => {
      const target = cohortStore.patients.find((p) => p.id === patientId);
      setSelectedPatientId(patientId);
      setActiveNav(initialTab === 'roster' ? 'report' : initialTab);
      setSelectedOrgan(null);
      setActiveTopic('all');
      setSelectedIssueKey('all');
      setWorkbenchTab('trend_evolution');
      setModal({ type: 'closed' });
      if (target) {
        setFollowedOrgans(target.focusOrgans);
        setBookingDate(target.clinicalState.publication.nextFollowupDate || '2027-02-19');
        setBookingSubmitted(false);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [cohortStore.patients]
  );

  const handleBackToRoster = useCallback(() => {
    setPresentationMode(false);
    setSelectedOrgan(null);
    setModal({ type: 'closed' });
    setSelectedPatientId(null);
    setActiveNav('roster');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCreatePatient = useCallback(
    (newRecord: PatientCohortRecord, enterImmediately: boolean) => {
      setCohortStore((prev) => ({
        ...prev,
        patients: [newRecord, ...prev.patients],
      }));
      if (enterImmediately) {
        setSelectedPatientId(newRecord.id);
        setActiveNav('report');
        setSelectedOrgan(null);
        setActiveTopic('all');
        setWorkbenchTab('trend_evolution');
        setFollowedOrgans(newRecord.focusOrgans);
        setBookingDate(newRecord.clinicalState.publication.nextFollowupDate || '2027-02-19');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  // Course-to-Course Selection Handler
  const handleSelectCourses = useCallback(
    (activeCourseId: string, compareCourseId: string) => {
      const targetId = selectedPatientId ?? activePatientRecord.id;
      setCohortStore((prev) => ({
        ...prev,
        patients: prev.patients.map((pat) =>
          pat.id === targetId
            ? {
                ...pat,
                activeCourseId,
                compareCourseId,
              }
            : pat
        ),
      }));
    },
    [selectedPatientId, activePatientRecord.id]
  );

  // Sync inspected course on 3D Widescreen when clicking a course step in CourseRecoveryShowcase
  const handleSyncCourseFromShowcase = useCallback(
    (courseId: string) => {
      const baselineId = activePatientRecord.courses[0]?.id ?? courseId;
      const compareId = courseId === baselineId ? 'target_course_end' : baselineId;
      handleSelectCourses(courseId, compareId);
    },
    [activePatientRecord.courses, handleSelectCourses]
  );

  // Open a cured patient's exact course directly in the 3D Course Comparison Widescreen
  const handleOpenCasePatientIn3DWidescreen = useCallback(
    (patientId: string, courseId: string) => {
      const target = cohortStore.patients.find((p) => p.id === patientId);
      const baselineId = target?.courses[0]?.id ?? courseId;
      const compareId = courseId === baselineId ? 'target_course_end' : baselineId;

      setCohortStore((prev) => ({
        ...prev,
        patients: prev.patients.map((pat) =>
          pat.id === patientId
            ? {
                ...pat,
                activeCourseId: courseId,
                compareCourseId: compareId,
              }
            : pat
        ),
      }));
      setSelectedPatientId(patientId);
      setActiveNav('report');
      setSelectedOrgan(null);
      setActiveTopic('all');
      setModal({ type: 'closed' });
      if (target) {
        setFollowedOrgans(target.focusOrgans);
        setBookingDate(target.clinicalState.publication.nextFollowupDate || '2027-02-19');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [cohortStore.patients]
  );

  const handleOpenCasesShowcase = useCallback(() => {
    if (!selectedPatientId) {
      const defaultId =
        rosterSummaries.find((s) => s.id === 'pat-zhouyaqin')?.id ??
        rosterSummaries[0]?.id ??
        cohortStore.patients[0]?.id ??
        null;
      setSelectedPatientId(defaultId);
    }
    setPresentationMode(false);
    setModal({ type: 'closed' });
    setActiveNav('cases');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedPatientId, rosterSummaries, cohortStore.patients]);

  const handleOpenWorkbenchTab = useCallback((tabId: ConsultationWorkbenchTabId) => {
    setModal({ type: 'closed' });
    setWorkbenchTab(tabId);
    window.setTimeout(() => {
      document.getElementById('consultation-workbench-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  }, []);

  const handleOpenNebulaDemoPatient = useCallback(() => {
    const demoId = 'pat-chenxiaozhen';
    const target = cohortStore.patients.find((p) => p.id === demoId);
    setSelectedPatientId(demoId);
    setActiveNav('report');
    setSelectedOrgan('stomach');
    setActiveTopic('all');
    setSelectedIssueKey('all');
    setWorkbenchTab('own_nebula_report');
    setModal({ type: 'closed' });
    if (target) {
      setFollowedOrgans(target.focusOrgans);
      setBookingDate(target.clinicalState.publication.nextFollowupDate || '2026-12-16');
      setBookingSubmitted(false);
    }
    window.setTimeout(() => {
      document.getElementById('consultation-workbench-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, [cohortStore.patients]);

  const handleSyncNebulaStageCourseNo = useCallback(
    (courseNo: number) => {
      const matched = activePatientRecord.courses.find((c) => c.courseNo === courseNo);
      if (!matched) return;
      const baselineId = activePatientRecord.courses[0]?.id ?? matched.id;
      const compareId = courseNo === 0 ? 'target_course_end' : baselineId;
      handleSelectCourses(matched.id, compareId);
    },
    [activePatientRecord.courses, handleSelectCourses]
  );

  const handleStartNewCourse = useCallback(
    (input: {
      stageTitle: string;
      cycleWeeks: number;
      focusRegimenSummary: string;
      doctorCourseNote: string;
    }): string | null => {
      const { updatedPatient, error } = startNextTreatmentCourse(activePatientRecord, input);
      if (error) return error;
      setCohortStore((prev) => ({
        ...prev,
        patients: prev.patients.map((pat) =>
          pat.id === updatedPatient.id ? updatedPatient : pat
        ),
      }));
      setBookingDate(updatedPatient.clinicalState.publication.nextFollowupDate);
      return null;
    },
    [activePatientRecord]
  );

  // Course-Unit Quantitative Comparison & Active Course 3D Organ Evaluation
  const comparison = useMemo(
    () =>
      computeCourseComparison(
        activePatientRecord,
        activePatientRecord.activeCourseId,
        activePatientRecord.compareCourseId
      ),
    [activePatientRecord]
  );

  const evaluation = useMemo(() => {
    if (comparison.courseMeta?.activeEvaluation) {
      return comparison.courseMeta.activeEvaluation;
    }
    const latestCourse =
      activePatientRecord.courses[activePatientRecord.courses.length - 1];
    return deriveClinicalEvaluation(
      clinicalState.patientProfile,
      latestCourse.metrics,
      latestCourse.weightKg,
      clinicalState.draftOrPublishedTasks
    );
  }, [comparison.courseMeta, activePatientRecord.courses, clinicalState]);

  const talkingBrief = useMemo(
    () =>
      buildDoctorConsultationBrief(
        selectedOrgan,
        comparison,
        clinicalState.patientProfile,
        clinicalState.draftOrPublishedTasks
      ),
    [selectedOrgan, comparison, clinicalState.patientProfile, clinicalState.draftOrPublishedTasks]
  );

  const trendData = useMemo(() => buildLongitudinalTrends(clinicalState), [clinicalState]);

  // 6-Tier Clinical Analytics Hierarchy (1 Patient -> N Issues -> M Courses [Drug & Product Names] -> Indicators -> Independent Baselines -> Cross-Period Comparison)
  const problemCourseHierarchy = useMemo(
    () => buildPatientProblemCourseHierarchy(activePatientRecord),
    [activePatientRecord]
  );

  const activeIndicatorTrajectory: IndicatorCourseTrajectory | undefined = useMemo(
    () =>
      problemCourseHierarchy.allIndicators.find((ind) => ind.key === selectedIndicatorKey) ??
      problemCourseHierarchy.allIndicators[0],
    [problemCourseHierarchy.allIndicators, selectedIndicatorKey]
  );

  const matchedDefaultProtocols = useMemo(() => {
    const effective = getEffectiveLabMetrics(clinicalState);
    const contextText = `${clinicalState.patientProfile.medicalHistory} ${clinicalState.patientProfile.allergyHistory} ${activePatientRecord.chiefTagline}`;
    return matchDefaultProtocolsForPatient(effective.metrics, contextText);
  }, [clinicalState, activePatientRecord.chiefTagline]);

  // Live search matching organs or clinical metrics in the left BodyVista sidebar
  const matchingOrgans = useMemo(() => {
    const q = anatomyQuery.trim().toLowerCase();
    if (!q) return [];
    return ORGAN_ORDER.map((id) => evaluation.organRecords[id]).filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.systemName.toLowerCase().includes(q) ||
        org.statusLabel.toLowerCase().includes(q) ||
        org.metrics.some((m) => m.label.toLowerCase().includes(q))
    );
  }, [anatomyQuery, evaluation.organRecords]);

  // Clicking an organ or clinical row focuses 3D organ + reveals leader line & floating callout
  const handleSelectOrgan = useCallback(
    (organId: OrganId) => {
      setSelectedOrgan(organId);
      if (organId === 'heart') {
        setSelectedIndicatorKey('systolicBp');
      } else if (organId === 'liver') {
        setSelectedIndicatorKey('liverFatPercent');
      } else if (organId === 'vascular') {
        setSelectedIndicatorKey('totalCholesterol');
      } else if (organId === 'stomach') {
        setSelectedIndicatorKey('fastingGlucose');
      }
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        document.getElementById('human-3d-stage')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    },
    []
  );

  const handleSelectIssueKey = useCallback(
    (issueKey: HealthIssueKey | 'all', organId?: OrganId) => {
      setSelectedIssueKey(issueKey);
      if (issueKey === 'all') {
        setSelectedOrgan(null);
        return;
      }
      if (organId) {
        setSelectedOrgan(organId);
      }
      const matchedIssue = problemCourseHierarchy.issues.find((i) => i.key === issueKey);
      if (matchedIssue && matchedIssue.indicators[0]) {
        setSelectedIndicatorKey(matchedIssue.indicators[0].key);
      }
    },
    [problemCourseHierarchy.issues]
  );

  const handleSelectIndicatorFromMatrix = useCallback((ind: IndicatorCourseTrajectory) => {
    setSelectedIndicatorKey(ind.key);
    setSelectedOrgan(ind.linkedOrganId);
    setWorkbenchTab('trend_evolution');
    window.setTimeout(() => {
      document.getElementById('indicator-independent-trend-chart')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 50);
  }, []);

  const handleSelectConsultationTopic = useCallback((topicId: ConsultationTopicId) => {
    setActiveTopic(topicId);
    const found = CONSULTATION_TOPICS.find((t) => t.id === topicId);
    if (!found) return;
    setSelectedOrgan(found.organId);
    if (topicId === 'cardio_bp') setSelectedIndicatorKey('systolicBp');
    else if (topicId === 'liver_metabolic') setSelectedIndicatorKey('liverFatPercent');
    else if (topicId === 'lipid_vascular') setSelectedIndicatorKey('totalCholesterol');
    else if (topicId === 'gastric_digestive') setSelectedIndicatorKey('fastingGlucose');
  }, []);

  const handleOpenOrganDetail = useCallback((organId: OrganId) => {
    setSelectedOrgan(organId);
    setModal({ type: 'organ', organId });
  }, []);

  const handleLocateOrganFromSubView = useCallback((organId: OrganId) => {
    setActiveNav('report');
    setSelectedOrgan(organId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleResetSelection = useCallback(() => {
    setSelectedOrgan(null);
    setActiveTopic('all');
  }, []);

  const handleCloseModal = useCallback(() => {
    setModal({ type: 'closed' });
  }, []);

  const handleChangeStageMode = useCallback((mode: StageMode) => {
    setStageMode(mode);
    setLayers(getDefaultLayersForMode(mode));
  }, []);

  const handleChangeLayer = useCallback((key: BodyVistaLayerKey, level: BodyVistaLayerLevel) => {
    setLayers((prev) => ({ ...prev, [key]: level }));
  }, []);

  const handleApplyPreset = useCallback((preset: AnatomyPresetId) => {
    setActivePreset(preset);
    setStageMode('atlas');
    if (preset === 'surface') {
      setLayers({ skin: 2, muscular: 3, skeletal: 3, vascular: 0, visceral: 0 });
    } else if (preset === 'internal') {
      setLayers({ skin: 0, muscular: 0, skeletal: 1, vascular: 3, visceral: 3 });
    } else {
      setLayers({ skin: 1, muscular: 1, skeletal: 2, vascular: 3, visceral: 3 });
    }
  }, []);

  // Top-level navigation and 6-step closed-loop step routing
  const handleTopNavClick = useCallback(
    (tabId: NavTabId) => {
      if (tabId === 'roster') {
        handleBackToRoster();
        return;
      }
      // If currently on Roster and clinician clicks a patient-level nav tab, open the latest-updated patient
      if (!selectedPatientId) {
        const latestPatId = rosterSummaries[0]?.id ?? cohortStore.patients[0]?.id;
        if (latestPatId) {
          handleSelectPatientFromRoster(latestPatId, tabId);
        }
        return;
      }
      setModal((m) => (m.type === 'anatomy-systems' ? { type: 'closed' } : m));
      setActiveNav(tabId);
      if (tabId !== 'report') {
        setPresentationMode(false);
      }
      updateActivePatientClinicalState((prev) => {
        if (tabId === 'intake') return { ...prev, activeRole: 'patient', currentStep: 1 };
        if (tabId === 'review') return { ...prev, activeRole: 'doctor', currentStep: 2 };
        if (tabId === 'protocol') return { ...prev, activeRole: 'doctor', currentStep: 3 };
        if (tabId === 'followup') {
          return {
            ...prev,
            currentStep: prev.activeRole === 'doctor' ? 6 : 5,
          };
        }
        return prev;
      });
    },
    [
      handleBackToRoster,
      selectedPatientId,
      rosterSummaries,
      cohortStore.patients,
      handleSelectPatientFromRoster,
      updateActivePatientClinicalState,
    ]
  );

  const handleSelectWorkflowStep = useCallback(
    (step: WorkflowStepId) => {
      setPresentationMode(false);
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        currentStep: step,
        activeRole: step === 1 || step === 5 ? 'patient' : 'doctor',
      }));
      if (step === 1) setActiveNav('intake');
      else if (step === 2) setActiveNav('review');
      else if (step === 3 || step === 4) setActiveNav('protocol');
      else setActiveNav('followup');
    },
    [updateActivePatientClinicalState]
  );

  const handleSwitchRole = useCallback(
    (role: UserRole) => {
      updateActivePatientClinicalState((prev) => {
        const nextStep: WorkflowStepId =
          activeNav === 'followup'
            ? role === 'patient'
              ? 5
              : 6
            : role === 'patient'
            ? prev.currentStep === 1 || prev.currentStep === 5
              ? prev.currentStep
              : 5
            : prev.currentStep === 2 ||
              prev.currentStep === 3 ||
              prev.currentStep === 4 ||
              prev.currentStep === 6
            ? prev.currentStep
            : 2;
        return {
          ...prev,
          activeRole: role,
          currentStep: nextStep,
        };
      });
    },
    [activeNav, updateActivePatientClinicalState]
  );

  // Step 1–6 Clinical Handlers (all automatically sync back into the active patient's course!)
  const handleSaveProfile = useCallback(
    (profile: PatientProfile) => {
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        patientProfile: profile,
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleImportReport = useCallback(
    (report: CheckupReportBatch) => {
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        reports: [...prev.reports, report],
        activeReportId: report.id,
        followupRechecks: [],
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleVerifyReport = useCallback(
    (reportId: string, updatedMetrics: LabMetricsSnapshot, doctorNote: string) => {
      const verifiedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        activeReportId: reportId,
        reports: prev.reports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                verificationStatus: 'verified',
                verifiedBy: attendingDoctorSignOff,
                verifiedAt,
                doctorVerificationNote: doctorNote,
                metrics: updatedMetrics,
              }
            : r
        ),
      }));
    },
    [attendingDoctorSignOff, updateActivePatientClinicalState]
  );

  const handleAddTemplateTask = useCallback(
    (tpl: ProtocolTemplate) => {
      updateActivePatientClinicalState((prev) => {
        if (prev.draftOrPublishedTasks.some((t) => t.templateId === tpl.id)) {
          return prev;
        }
        const nextTask: ManagedTaskItem = {
          id: `task-${Date.now()}-${tpl.id}`,
          templateId: tpl.id,
          title: tpl.title,
          category: tpl.category,
          relatedOrgan: tpl.relatedOrgan,
          targetTag: tpl.targetTag,
          frequency: tpl.defaultFrequency,
          shortDesc: tpl.shortDesc,
          summary: tpl.summary,
          advice: tpl.advice,
          scoreGain: tpl.scoreGain,
          weeklyChecklist: [...tpl.weeklyChecklist],
          completedByPatient: false,
        };
        return {
          ...prev,
          currentStep: 3,
          draftOrPublishedTasks: [...prev.draftOrPublishedTasks, nextTask],
          publication: {
            ...prev.publication,
            status: 'draft',
          },
        };
      });
    },
    [updateActivePatientClinicalState]
  );

  const handleApplyDefaultProtocol = useCallback(
    (protocol: DefaultOrganProtocol) => {
      updateActivePatientClinicalState((prev) => {
        if (prev.draftOrPublishedTasks.some((t) => t.templateId === protocol.id)) {
          return prev;
        }
        const payload = convertDefaultProtocolToManagedTask(protocol);
        const nextTask: ManagedTaskItem = {
          ...payload,
          id: `task-def-${Date.now()}-${protocol.id}`,
          completedByPatient: false,
        };
        return {
          ...prev,
          draftOrPublishedTasks: [...prev.draftOrPublishedTasks, nextTask],
          publication: {
            ...prev.publication,
            status: 'draft',
          },
        };
      });
    },
    [updateActivePatientClinicalState]
  );

  const handleApplyBatchDefaultProtocols = useCallback(
    (protocols: ReadonlyArray<DefaultOrganProtocol>) => {
      if (protocols.length === 0) return;
      updateActivePatientClinicalState((prev) => {
        const existingTemplateIds = new Set(
          prev.draftOrPublishedTasks
            .map((t) => t.templateId)
            .filter((id): id is string => Boolean(id))
        );
        const additions: ManagedTaskItem[] = [];
        const baseTs = Date.now();
        protocols.forEach((protocol, idx) => {
          if (existingTemplateIds.has(protocol.id)) return;
          existingTemplateIds.add(protocol.id);
          const payload = convertDefaultProtocolToManagedTask(protocol);
          additions.push({
            ...payload,
            id: `task-def-${baseTs}-${idx}-${protocol.id}`,
            completedByPatient: false,
          });
        });
        if (additions.length === 0) return prev;
        return {
          ...prev,
          currentStep: 3,
          draftOrPublishedTasks: [...prev.draftOrPublishedTasks, ...additions],
          publication: {
            ...prev.publication,
            status: 'draft',
          },
        };
      });
    },
    [updateActivePatientClinicalState]
  );

  const handleAddCustomTask = useCallback(
    (taskInput: Omit<ManagedTaskItem, 'id' | 'completedByPatient'>) => {
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        currentStep: 3,
        draftOrPublishedTasks: [
          ...prev.draftOrPublishedTasks,
          {
            ...taskInput,
            id: `task-custom-${Date.now()}`,
            completedByPatient: false,
          },
        ],
        publication: {
          ...prev.publication,
          status: 'draft',
        },
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleRemoveTask = useCallback(
    (taskId: string) => {
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        draftOrPublishedTasks: prev.draftOrPublishedTasks.filter((t) => t.id !== taskId),
        publication: {
          ...prev.publication,
          status: 'draft',
        },
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleUpdateTaskFrequency = useCallback(
    (taskId: string, frequency: string) => {
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        draftOrPublishedTasks: prev.draftOrPublishedTasks.map((t) =>
          t.id === taskId ? { ...t, frequency } : t
        ),
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handlePublishPlan = useCallback(
    (info: Omit<PlanPublicationInfo, 'status' | 'publishedAt'>) => {
      const publishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      setFollowedOrgans(info.focusedOrgans);
      setBookingDate(info.nextFollowupDate);
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        currentStep: 4,
        publication: {
          ...info,
          status: 'published',
          publishedAt,
        },
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleToggleTaskCheckIn = useCallback(
    (taskId: string) => {
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        draftOrPublishedTasks: prev.draftOrPublishedTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                completedByPatient: !t.completedByPatient,
                completedAt: !t.completedByPatient ? nowStr : undefined,
              }
            : t
        ),
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleSubmitSymptomFeedback = useCallback(
    (feedback: Omit<SymptomFeedbackItem, 'id' | 'submittedAt' | 'status'>) => {
      const submittedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        symptomFeedbacks: [
          {
            ...feedback,
            id: `fb-${Date.now()}`,
            submittedAt,
            status: 'unread',
          },
          ...prev.symptomFeedbacks,
        ],
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleReplyFeedback = useCallback(
    (feedbackId: string, replyText: string) => {
      if (!replyText.trim()) return;
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        symptomFeedbacks: prev.symptomFeedbacks.map((fb) =>
          fb.id === feedbackId
            ? { ...fb, status: 'reviewed', doctorReply: replyText.trim() }
            : fb
        ),
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleRecordFollowupRecheck = useCallback(
    (
      recheckInput: Omit<FollowupRecheckRecord, 'id'>,
      nextFollowupDate: string,
      nextCadenceLabel: string
    ) => {
      setBookingDate(nextFollowupDate);
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        patientProfile: {
          ...prev.patientProfile,
          weightKg: recheckInput.weightKg,
        },
        followupRechecks: [
          ...prev.followupRechecks,
          {
            ...recheckInput,
            id: `rc-${Date.now()}`,
          },
        ],
        publication: {
          ...prev.publication,
          nextFollowupDate,
          followupCadenceLabel: nextCadenceLabel,
        },
      }));
    },
    [updateActivePatientClinicalState]
  );

  const handleToggleFollowOrgan = useCallback((organId: OrganId) => {
    setFollowedOrgans((prev) =>
      prev.includes(organId) ? prev.filter((id) => id !== organId) : [...prev, organId]
    );
  }, []);

  const handleTogglePlanComplete = useCallback((planId: ActionPlanItem['id']) => {
    setCompletedPlans((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
  }, []);

  const handleSubmitBooking = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!bookingDate) return;
      setBookingSubmitted(true);
      updateActivePatientClinicalState((prev) => ({
        ...prev,
        publication: {
          ...prev.publication,
          nextFollowupDate: bookingDate,
        },
      }));
    },
    [bookingDate, updateActivePatientClinicalState]
  );

  const visibleStructureCount = useMemo(() => {
    const weights: Record<BodyVistaLayerKey, number> = {
      skeletal: 820,
      muscular: 690,
      vascular: 640,
      visceral: 543,
      skin: 207,
    };
    let count = 0;
    (Object.keys(weights) as BodyVistaLayerKey[]).forEach((k) => {
      if (layers[k] > 0) count += weights[k];
    });
    return count;
  }, [layers]);

  const currentTopicConfig = useMemo(
    () => CONSULTATION_TOPICS.find((t) => t.id === activeTopic) ?? CONSULTATION_TOPICS[0],
    [activeTopic]
  );

  const mobilePageTitle = useMemo(() => {
    if (isRosterView) return '患者队列分析';
    if (activeNav === 'cases') return '康复成功案例实证';
    if (activeNav === 'protocol') return '系统标准方案图谱';
    if (activeNav === 'profile' || activeNav === 'risks') return '八大系统全息画像';
    if (activeNav === 'intake') return '建档与导报告';
    if (activeNav === 'review') return '核对与疗程史';
    if (activeNav === 'followup') return '打卡与复查';
    return `${clinicalState.patientProfile.name} · 疗程对比`;
  }, [isRosterView, activeNav, clinicalState.patientProfile.name]);

  const containerMaxWidth = presentationMode && !isRosterView ? 'max-w-[1680px]' : 'max-w-[1520px]';

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#f2f5f7] text-slate-900">
      {/* Top Bar: 44px Mini-Program header on mobile; Strict 3-Zone Clinical Top Bar on Desktop */}
      <header className="sticky top-0 z-40 h-11 md:h-14 bg-white/95 backdrop-blur-md border-b border-[#dce5ec]">
        {/* Mobile Navigation Bar (44px) */}
        <div className="md:hidden h-full px-3 flex items-center justify-between gap-2">
          <div className="w-24 flex items-center shrink-0">
            {!isRosterView ? (
              <button
                type="button"
                onClick={
                  activeNav !== 'report'
                    ? () => setActiveNav('report')
                    : handleBackToRoster
                }
                aria-label={activeNav !== 'report' ? '返回疗程对比大屏' : '返回患者列表'}
                className="min-h-[44px] pr-2 -ml-1 inline-flex items-center gap-0.5 text-xs font-semibold text-slate-700 active:scale-[0.97]"
              >
                <ChevronLeft className="w-4 h-4 text-[#0d7a8a]" />
                <span>{activeNav !== 'report' ? '对比屏' : '患者列表'}</span>
              </button>
            ) : (
              <span className="text-sm font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                健康<span className="text-[#0d7a8a]">4S</span>
              </span>
            )}
          </div>

          <span className="text-sm font-bold text-slate-900 truncate text-center">
            {mobilePageTitle}
          </span>

          <div className="w-28 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={() => setDoctorModalOpen(true)}
              aria-label={`当前登录主治医生：${currentDoctor.name} ${currentDoctor.title}`}
              className="min-h-[44px] pl-1 -mr-1 inline-flex items-center justify-end gap-1 text-xs font-semibold text-[#0d7a8a] whitespace-nowrap active:scale-[0.97]"
            >
              <span className="truncate max-w-[92px]">
                {currentDoctor.name} · {currentDoctor.title.slice(0, 2)}
              </span>
            </button>
          </div>
        </div>

        {/* Desktop Strict 3-Zone Top Bar Contract (56px, gap-8) */}
        <div
          className={`hidden md:flex ${containerMaxWidth} h-full mx-auto px-6 items-center justify-between gap-8 transition-all`}
        >
          {/* Zone 1: Single Text Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleBackToRoster();
            }}
            className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7a8a] rounded"
          >
            健康<span className="text-[#0d7a8a]">4S</span>
          </a>

          {/* Zone 2: 5 Concise Single-Line Clinical Workspace Navigation Links */}
          <nav aria-label="主导航" className="flex items-center h-full gap-1 text-sm">
            {PATIENT_WORKSPACE_NAV.map((item) => {
              const active = isRosterView ? item.id === 'roster' : activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTopNavClick(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`h-full px-4 inline-flex items-center transition-colors whitespace-nowrap shrink-0 border-b-[3px] ${
                    active
                      ? 'bg-[#eaf5f7]/65 text-[#0d7a8a] border-[#0d7a8a] font-bold'
                      : 'text-slate-700 hover:text-[#0d7a8a] hover:bg-slate-50 border-transparent font-medium'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Currently Logged-In Attending Doctor & Clinic Storefront Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setDoctorModalOpen(true)}
              aria-label={`当前系统登录主治医生：${currentDoctor.name} ${currentDoctor.title}（${currentDoctor.clinicName}）`}
              className="px-3 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] hover:border-[#8ac6d1] text-xs transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <span className="w-6 h-6 rounded-lg bg-[#0d7a8a] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentDoctor.name.slice(0, 1)}
              </span>
              <span className="font-bold text-slate-900">
                {currentDoctor.name} · {currentDoctor.title}
              </span>
              <span className="text-slate-300 hidden lg:inline" aria-hidden="true">
                |
              </span>
              <span className="text-[#0d7a8a] font-semibold hidden lg:inline">
                {currentDoctor.clinicShortName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <main
        className={`flex-1 ${containerMaxWidth} w-full mx-auto px-3 sm:px-6 pt-3 md:pt-4 ${
          isRosterView ? 'pb-10' : 'pb-20 md:pb-10'
        } transition-all`}
      >
        {/* =====================================================================
            STEP 0 / LANDING SCREEN: CLINIC PATIENT DATA ROSTER & COURSE OVERVIEW
           ===================================================================== */}
        {isRosterView && (
          <PatientRosterView
            summaries={rosterSummaries}
            currentDoctor={currentDoctor}
            openCreateModalSignal={openCreateModalSignal}
            onOpenDoctorModal={() => setDoctorModalOpen(true)}
            onSelectPatient={handleSelectPatientFromRoster}
            onCreatePatient={handleCreatePatient}
            onOpenCasesShowcase={handleOpenCasesShowcase}
            onOpenNebulaDemo={handleOpenNebulaDemoPatient}
          />
        )}

        {/* =====================================================================
            SELECTED PATIENT WORKSPACE: COURSE-UNIT 3D ANALYTICS, RECOVERY CASES & PROTOCOL ATLAS
           ===================================================================== */}
        {!isRosterView && (
          <>
            {/* Concise Analytical Subview Context Bar on Cases / Protocol Atlas / Digital Profile */}
            {(activeNav === 'cases' ||
              activeNav === 'protocol' ||
              activeNav === 'profile' ||
              activeNav === 'risks' ||
              activeNav === 'plans' ||
              activeNav === 'history') && (
              <div className="mb-3.5 bg-white border border-[#dce5ec] rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveNav('report')}
                    className="inline-flex items-center gap-1 font-semibold text-[#0d7a8a] hover:text-[#096472] transition-colors whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>返回三维疗程对比大屏</span>
                  </button>
                  <span className="text-slate-300" aria-hidden="true">
                    |
                  </span>
                  <span>
                    当前分析患者：<strong className="text-slate-900">{clinicalState.patientProfile.name}</strong>
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-num">
                    评估阶段：{comparison.courseMeta?.activeCourse.courseLabel ?? '最新疗程'}（健康分{' '}
                    <strong className="text-[#0d7a8a]">{evaluation.healthScore}分</strong>）
                  </span>
                  <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="hidden sm:inline">
                    主治审签：{currentDoctor.name} · {currentDoctor.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeNav !== 'cases' && (
                    <button
                      type="button"
                      onClick={() => setActiveNav('cases')}
                      className="px-3 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-xs font-semibold text-[#0d7a8a] inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>康复成功案例库</span>
                    </button>
                  )}
                  {activeNav !== 'protocol' && (
                    <button
                      type="button"
                      onClick={() => setActiveNav('protocol')}
                      className="px-3 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-xs font-semibold text-slate-700 hover:text-[#0d7a8a] inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <BookOpenCheck className="w-3.5 h-3.5 text-[#0d7a8a]" />
                      <span>标准方案图谱 (17项)</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Legacy Workflow Closed-Loop Bar only if directly routed to intake/review/followup */}
            {(activeNav === 'intake' || activeNav === 'review' || activeNav === 'followup') && (
              <WorkflowClosedLoopBar
                state={clinicalState}
                onSelectStep={handleSelectWorkflowStep}
                onSwitchRole={handleSwitchRole}
                onReturnTo3DOverview={() => setActiveNav('report')}
                isOn3DOverview={false}
              />
            )}

            {/* Full-Page Widescreen Recovery Success Cases Gallery & Course Matrix */}
            {activeNav === 'cases' && (
              <CourseRecoveryShowcase
                variant="full_page"
                activePatient={activePatientRecord}
                inspectedCourseId={
                  comparison.courseMeta?.activeCourse.id ?? activePatientRecord.activeCourseId
                }
                selectedOrgan={selectedOrgan}
                onSyncPatientCourse={handleSyncCourseFromShowcase}
                onSelectOrganIn3D={handleLocateOrganFromSubView}
                onOpenPatientIn3DWidescreen={handleOpenCasePatientIn3DWidescreen}
                onOpenProtocolAtlas={() => setActiveNav('protocol')}
              />
            )}

            {/* Step 1: Patient Profile Archiving & Checkup Report Import */}
            {activeNav === 'intake' && (
              <PatientIntakeAndExecution
                mode="intake"
                state={clinicalState}
                healthScore={evaluation.healthScore}
                projectedScore={evaluation.projectedScore}
                onSaveProfile={handleSaveProfile}
                onImportReport={handleImportReport}
                onToggleTaskCheckIn={handleToggleTaskCheckIn}
                onSubmitSymptomFeedback={handleSubmitSymptomFeedback}
                onLocateOrganIn3D={handleLocateOrganFromSubView}
                onAdvanceToStep={handleSelectWorkflowStep}
              />
            )}

            {/* Step 2: Doctor Data Verification & Longitudinal History Changes */}
            {activeNav === 'review' && (
              <DoctorClinicalWorkbench
                mode="review"
                state={clinicalState}
                trendData={trendData}
                attendingDoctorSignOff={attendingDoctorSignOff}
                onVerifyReport={handleVerifyReport}
                onAddTemplateTask={handleAddTemplateTask}
                onApplyDefaultProtocol={handleApplyDefaultProtocol}
                onApplyBatchDefaultProtocols={handleApplyBatchDefaultProtocols}
                onAddCustomTask={handleAddCustomTask}
                onRemoveTask={handleRemoveTask}
                onUpdateTaskFrequency={handleUpdateTaskFrequency}
                onPublishPlan={handlePublishPlan}
                onReplyFeedback={handleReplyFeedback}
                onRecordFollowupRecheck={handleRecordFollowupRecheck}
                onLocateOrganIn3D={handleLocateOrganFromSubView}
                onAdvanceToStep={handleSelectWorkflowStep}
              />
            )}

            {/* Pure Analytical 17-Item Clinic Default Organ Protocol Atlas & Dosing Schedule */}
            {activeNav === 'protocol' && (
              <DoctorClinicalWorkbench
                mode="protocol"
                readOnlyAnalytics={true}
                state={clinicalState}
                trendData={trendData}
                attendingDoctorSignOff={attendingDoctorSignOff}
                onVerifyReport={handleVerifyReport}
                onAddTemplateTask={handleAddTemplateTask}
                onApplyDefaultProtocol={handleApplyDefaultProtocol}
                onApplyBatchDefaultProtocols={handleApplyBatchDefaultProtocols}
                onAddCustomTask={handleAddCustomTask}
                onRemoveTask={handleRemoveTask}
                onUpdateTaskFrequency={handleUpdateTaskFrequency}
                onPublishPlan={handlePublishPlan}
                onReplyFeedback={handleReplyFeedback}
                onRecordFollowupRecheck={handleRecordFollowupRecheck}
                onLocateOrganIn3D={handleLocateOrganFromSubView}
                onAdvanceToStep={handleSelectWorkflowStep}
                onOpenCasesShowcase={() => setActiveNav('cases')}
              />
            )}

            {/* Step 5 & Step 6: Patient Check-in / Feedback & Doctor Follow-up Adjustment */}
            {activeNav === 'followup' && (
              <div className="space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 bg-white border border-[#dce5ec] rounded-2xl p-2 sm:px-3.5 sm:py-2.5 flex-wrap">
                  <span className="hidden sm:inline text-xs text-slate-600">
                    当前患者：{clinicalState.patientProfile.name} · 主治审签：{currentDoctor.name} {currentDoctor.title}
                  </span>
                  <div className="grid grid-cols-2 sm:inline-flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleSelectWorkflowStep(5)}
                      className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                        clinicalState.activeRole === 'patient'
                          ? 'bg-[#0d7a8a] text-white'
                          : 'bg-[#f8fafc] text-slate-600 hover:text-slate-900 border border-[#dce5ec]'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>05. 患者打卡反馈</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectWorkflowStep(6)}
                      className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                        clinicalState.activeRole === 'doctor'
                          ? 'bg-[#0d7a8a] text-white'
                          : 'bg-[#f8fafc] text-slate-600 hover:text-slate-900 border border-[#dce5ec]'
                      }`}
                    >
                      <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                      <span>06. 医生复查调方</span>
                    </button>
                  </div>
                </div>

                {clinicalState.activeRole === 'patient' ? (
                  <PatientIntakeAndExecution
                    mode="execution"
                    state={clinicalState}
                    healthScore={evaluation.healthScore}
                    projectedScore={evaluation.projectedScore}
                    onSaveProfile={handleSaveProfile}
                    onImportReport={handleImportReport}
                    onToggleTaskCheckIn={handleToggleTaskCheckIn}
                    onSubmitSymptomFeedback={handleSubmitSymptomFeedback}
                    onLocateOrganIn3D={handleLocateOrganFromSubView}
                    onAdvanceToStep={handleSelectWorkflowStep}
                  />
                ) : (
                  <DoctorClinicalWorkbench
                    mode="followup"
                    state={clinicalState}
                    trendData={trendData}
                    attendingDoctorSignOff={attendingDoctorSignOff}
                    onVerifyReport={handleVerifyReport}
                    onAddTemplateTask={handleAddTemplateTask}
                    onApplyDefaultProtocol={handleApplyDefaultProtocol}
                    onApplyBatchDefaultProtocols={handleApplyBatchDefaultProtocols}
                    onAddCustomTask={handleAddCustomTask}
                    onRemoveTask={handleRemoveTask}
                    onUpdateTaskFrequency={handleUpdateTaskFrequency}
                    onPublishPlan={handlePublishPlan}
                    onReplyFeedback={handleReplyFeedback}
                    onRecordFollowupRecheck={handleRecordFollowupRecheck}
                    onLocateOrganIn3D={handleLocateOrganFromSubView}
                    onAdvanceToStep={handleSelectWorkflowStep}
                  />
                )}
              </div>
            )}

            {/* Supporting Subviews (8-Organ Digital Profile / Risk Detail) */}
            {(activeNav === 'profile' ||
              activeNav === 'risks' ||
              activeNav === 'plans' ||
              activeNav === 'history') && (
              <SecondaryViews
                activeTab={activeNav}
                organRecords={evaluation.organRecords}
                riskPrompts={evaluation.riskPrompts}
                onLocateOrganIn3D={handleLocateOrganFromSubView}
                completedPlans={completedPlans}
                onTogglePlanComplete={handleTogglePlanComplete}
                projectedScore={evaluation.projectedScore}
              />
            )}

            {/* =====================================================================
                PATIENT COURSE-UNIT 3D DATA ANALYSIS & COMPARISON WIDESCREEN
               ===================================================================== */}
            <div className={activeNav === 'report' ? 'block space-y-4' : 'hidden'}>
              {/* 1. Unified Global Baseline & Course Comparison Controller */}
              <CourseTimelineBar
                patient={activePatientRecord}
                currentDoctor={currentDoctor}
                allSummaries={rosterSummaries}
                comparison={comparison}
                activeTopic={activeTopic}
                selectedOrgan={selectedOrgan}
                presentationMode={presentationMode}
                onBackToRoster={handleBackToRoster}
                onTogglePresentationMode={() => setPresentationMode((prev) => !prev)}
                onQuickSwitchPatient={(patId) => handleSelectPatientFromRoster(patId, 'report')}
                onSelectCourses={handleSelectCourses}
                onSelectTopic={handleSelectConsultationTopic}
                onStartNewCourse={handleStartNewCourse}
              />

              {/* 2. Core 3-Column Widescreen 3D Hero Stage + 7-Row Traffic-Light Biomarkers */}
              <section className="grid grid-cols-1 xl:grid-cols-[312px_minmax(0,1fr)_424px] gap-3.5 items-stretch">
                <SystemComparisonRadar
                  comparison={comparison}
                  selectedOrgan={selectedOrgan}
                  onSelectOrgan={handleSelectOrgan}
                  layers={layers}
                  onChangeLayer={handleChangeLayer}
                  activePreset={activePreset}
                  onApplyPreset={handleApplyPreset}
                  visibleStructureCount={visibleStructureCount}
                  anatomyQuery={anatomyQuery}
                  onChangeAnatomyQuery={setAnatomyQuery}
                  matchingOrgans={matchingOrgans}
                />

                {/* Center Column: Interactive Universal 3D BodyVista Stage */}
                <div className="flex flex-col">
                  <div className="hidden md:flex xl:hidden items-center justify-between mb-2">
                    <span className="text-xs text-slate-600 font-num">
                      疗程对比：{comparison.currentDate} vs {comparison.referenceLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModal({ type: 'anatomy-systems' })}
                      className="min-h-[36px] px-3 py-1 rounded-xl bg-white border border-[#dce5ec] text-xs font-semibold text-[#0d7a8a] inline-flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>解剖分层透视</span>
                    </button>
                  </div>

                  <Human3DStage
                    selectedOrgan={selectedOrgan}
                    organRecords={evaluation.organRecords}
                    stageMode={stageMode}
                    layers={layers}
                    onChangeLayer={handleChangeLayer}
                    paused={activeNav !== 'report'}
                    onChangeStageMode={handleChangeStageMode}
                    onSelectOrgan={handleSelectOrgan}
                    onOpenOrganDetail={handleOpenOrganDetail}
                    onResetSelection={handleResetSelection}
                    onOpenMobileSystemsSheet={() => setModal({ type: 'anatomy-systems' })}
                  />
                </div>

                {/* Right Column: All 7 Core Biomarkers with Minimalist Traffic-Light Progress Bars */}
                <BiomarkerComparisonPanel
                  comparison={comparison}
                  talkingBrief={talkingBrief}
                  selectedOrgan={selectedOrgan}
                  highlightedRowIds={currentTopicConfig.highlightedRowIds}
                  matchedDefaultProtocols={matchedDefaultProtocols}
                  onSelectOrgan={handleSelectOrgan}
                  onOpenOrganDetail={handleOpenOrganDetail}
                  onOpenProtocolCustomize={() => setActiveNav('protocol')}
                  onOpenAiSummary={() => setModal({ type: 'ai-summary' })}
                  onOpenCasesShowcase={handleOpenCasesShowcase}
                />
              </section>

              {/* 3. Step-by-Step Consultation Workbench (Replaces Multi-Section Vertical Overload & Enforces Patient-Only Isolation) */}
              <ConsultationWorkbenchSection
                patient={activePatientRecord}
                comparison={comparison}
                activeTab={workbenchTab}
                onChangeTab={setWorkbenchTab}
                selectedOrgan={selectedOrgan}
                selectedIssueKey={selectedIssueKey}
                selectedIndicatorKey={activeIndicatorTrajectory?.key ?? selectedIndicatorKey}
                onSelectOrgan={handleSelectOrgan}
                onSelectIssueKey={handleSelectIssueKey}
                onSelectIndicatorFromMatrix={handleSelectIndicatorFromMatrix}
                onSelectCourses={handleSelectCourses}
                onSyncCourseFromShowcase={handleSyncCourseFromShowcase}
                onSyncNebulaStageCourseNo={handleSyncNebulaStageCourseNo}
                onOpenPatientIn3DWidescreen={handleOpenCasePatientIn3DWidescreen}
                onOpenFullCasesPage={handleOpenCasesShowcase}
                onOpenProtocolAtlas={() => setActiveNav('protocol')}
                problemCourseHierarchy={problemCourseHierarchy}
              />
            </div>
          </>
        )}
      </main>

      {/* Fixed Mobile Bottom 5-Tab Bar inside a Selected Patient (56px height + 44px top bar = 100px <= 15% of 844px) */}
      {!isRosterView && (
        <nav
          aria-label="移动端底部主导航"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-[#dce5ec] grid grid-cols-5 items-stretch px-1"
        >
          {MOBILE_PATIENT_TABS.map((tab) => {
            const active =
              activeNav === tab.id ||
              (tab.id === 'profile' &&
                (activeNav === 'risks' || activeNav === 'plans' || activeNav === 'history')) ||
              (tab.id === 'report' &&
                (activeNav === 'intake' || activeNav === 'review' || activeNav === 'followup'));
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTopNavClick(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.95] ${
                  active
                    ? 'text-[#0d7a8a] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#0d7a8a]"
                  />
                )}
                {tab.icon === 'roster' && <Users className="w-5 h-5" />}
                {tab.icon === 'scan' && <Scan className="w-5 h-5" />}
                {tab.icon === 'cases' && <Award className="w-5 h-5" />}
                {tab.icon === 'protocol' && <BookOpenCheck className="w-5 h-5" />}
                {tab.icon === 'profile' && <Activity className="w-5 h-5" />}
                <span className="text-[10px] leading-tight tracking-tight whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Responsive Organ / Task / Summary / Booking / Anatomy-Systems Modal */}
      {!isRosterView && (
        <DetailSheetModal
          modal={modal}
          onClose={handleCloseModal}
          organRecords={evaluation.organRecords}
          healthScore={evaluation.healthScore}
          followedOrgans={followedOrgans}
          onToggleFollowOrgan={handleToggleFollowOrgan}
          managedTasks={clinicalState.draftOrPublishedTasks}
          onToggleTaskCheckIn={handleToggleTaskCheckIn}
          projectedScore={evaluation.projectedScore}
          bookingSubmitted={bookingSubmitted}
          bookingDate={bookingDate}
          onChangeBookingDate={setBookingDate}
          onSubmitBooking={handleSubmitBooking}
          layers={layers}
          onChangeLayer={handleChangeLayer}
          activePreset={activePreset}
          onApplyPreset={handleApplyPreset}
          onJumpToRecoveryCase={(organId) => {
            handleSelectOrgan(organId);
            const hasOwnCase = RECOVERY_SUCCESS_CASES.some(
              (c) => c.patientId === activePatientRecord.id
            );
            if (hasOwnCase) {
              handleOpenWorkbenchTab('own_recovery_case');
            } else {
              handleOpenCasesShowcase();
            }
          }}
        />
      )}

      {/* Logged-In Attending Doctor & Clinic Storefront Switcher Modal */}
      {doctorModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDoctorModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="attending-doctor-modal-title"
        >
          <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl border border-[#dce5ec] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#edf2f6] flex items-center justify-between gap-3">
              <div>
                <h2
                  id="attending-doctor-modal-title"
                  className="text-base font-bold text-slate-900"
                >
                  当前执业门诊门店与主治医师信息
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  大屏顶栏、检验核对与疗程处方均自动关联当前登录医师所属执业门诊名称与详细地址
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDoctorModalOpen(false)}
                aria-label="关闭主治医生信息窗口"
                className="min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Active Clinic Storefront & Doctor Summary */}
              <div className="pb-4 border-b border-[#edf2f6] flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#0d7a8a] text-white font-extrabold text-lg flex items-center justify-center shrink-0">
                  {currentDoctor.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-slate-900">
                      {currentDoctor.name}
                    </span>
                    <span className="text-xs font-semibold text-[#0d7a8a]">
                      {currentDoctor.title}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      电子执业审签已激活
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
                    <span>门诊名称：{currentDoctor.clinicName}</span>
                  </div>

                  <div className="text-xs text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0d7a8a] shrink-0" />
                    <span>详细地址：{currentDoctor.clinicAddress}</span>
                  </div>

                  <div className="text-xs text-slate-500 font-num">
                    {currentDoctor.department} · 执业编码 {currentDoctor.licenseNo} · 擅长：
                    <span className="font-sans">{currentDoctor.specialty}</span>
                  </div>
                </div>
              </div>

              {/* Switch Clinic Branch & Attending Doctor */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  切换执业门诊门店与坐诊主治医师账号
                </div>
                <div className="divide-y divide-[#edf2f6] border border-[#dce5ec] rounded-xl overflow-hidden">
                  {ATTENDING_DOCTORS.map((doc) => {
                    const isCurrent = doc.id === currentDoctor.id;
                    const managedCount = rosterSummaries.filter(
                      (p) => p.attendingDoctorId === doc.id
                    ).length;

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleSwitchLoggedInDoctor(doc.id)}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors ${
                          isCurrent ? 'bg-[#eaf5f7]/70' : 'bg-white hover:bg-[#f8fafc]'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="font-bold text-slate-900">
                              {doc.name} · {doc.title}
                            </span>
                            <span className="text-[#0d7a8a] font-semibold">{doc.clinicName}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            地址：{doc.clinicAddress}
                          </div>
                          <div className="text-[11px] text-slate-400 font-num">
                            执业编号 {doc.licenseNo} · 直接主管 {managedCount} 例患者
                          </div>
                        </div>

                        <span
                          className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                            isCurrent ? 'text-[#0d7a8a]' : 'text-slate-500'
                          }`}
                        >
                          {isCurrent ? '当前坐诊中' : '切换至此门诊'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
