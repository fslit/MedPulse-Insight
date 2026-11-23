import { PatientCohortRecord } from './patientCohort';
import { RECOVERY_SUCCESS_CASES } from './recoveryCases';

export type ConsultationWorkbenchTabId =
  | 'trend_evolution'
  | 'problem_regimen'
  | 'reports_imaging'
  | 'own_nebula_report'
  | 'own_recovery_case';

export interface ConsultationWorkbenchTabItem {
  id: ConsultationWorkbenchTabId;
  stepLabel: string;
  title: string;
  subtitle: string;
  isPatientSpecific?: boolean;
}

/**
 * Resolves the clean, non-redundant step-by-step consultation tabs for a specific patient.
 * Enforces strict patient-data isolation ("仅显示本人关联报告"):
 * - Nebula 60-page D-value tab appears ONLY if `patient.hasNebulaExperienceReport === true`.
 * - Personal Recovery Case tab appears ONLY if `patient.id` has a personal case in `RECOVERY_SUCCESS_CASES`.
 */
export function resolvePatientConsultationTabs(
  patient: PatientCohortRecord
): ConsultationWorkbenchTabItem[] {
  const interventionCount = Math.max(
    0,
    patient.courses.filter((c) => c.courseNo > 0).length
  );

  const tabs: ConsultationWorkbenchTabItem[] = [
    {
      id: 'trend_evolution',
      stepLabel: '01',
      title: '趋势与跨期演进表',
      subtitle: '单指标达标轨迹 · 历次疗程横向总表',
    },
    {
      id: 'problem_regimen',
      stepLabel: '02',
      title: '多问题 × 药名品名方案',
      subtitle:
        interventionCount > 0
          ? `${interventionCount}期临床药名减量与营养品品名组方`
          : '首诊健康问题分组与基线建档',
    },
    {
      id: 'reports_imaging',
      stepLabel: '03',
      title: '历次报告单与影像归档',
      subtitle: '逐次检验时间线 · 八大系统分值 · 检查影像',
    },
  ];

  let nextIdx = 4;

  if (patient.hasNebulaExperienceReport) {
    tabs.push({
      id: 'own_nebula_report',
      stepLabel: `0${nextIdx}`,
      title: '本人60页体验报告解析',
      subtitle: '细胞能量D值跨疗程对照与食疗匹配',
      isPatientSpecific: true,
    });
    nextIdx += 1;
  }

  const hasOwnRecoveryCase = RECOVERY_SUCCESS_CASES.some(
    (c) => c.patientId === patient.id
  );
  if (hasOwnRecoveryCase) {
    tabs.push({
      id: 'own_recovery_case',
      stepLabel: `0${nextIdx}`,
      title: '本人阶段康复实拍',
      subtitle: '与当前疗程对齐的本人生活照与体感记录',
      isPatientSpecific: true,
    });
  }

  return tabs;
}

/**
 * Ensures that when switching between patients, an unavailable patient-specific tab
 * smoothly falls back to `'trend_evolution'` instead of leaving a dead/blank state.
 */
export function sanitizeActiveWorkbenchTab(
  currentTab: ConsultationWorkbenchTabId,
  availableTabs: ReadonlyArray<ConsultationWorkbenchTabItem>
): ConsultationWorkbenchTabId {
  if (availableTabs.some((t) => t.id === currentTab)) {
    return currentTab;
  }
  return 'trend_evolution';
}
