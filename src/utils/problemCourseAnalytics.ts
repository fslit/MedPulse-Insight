import { OrganId } from './healthModel';
import { TrendFocusMetric } from './clinicalComparison';
import { computeBmi } from './clinicalWorkflow';
import { CourseStatus, PatientCohortRecord, TreatmentCourseRecord } from './patientCohort';

export type HealthIssueKey =
  | 'issue-bp-cardio'
  | 'issue-fatty-liver'
  | 'issue-dyslipidemia'
  | 'issue-glycemic-gastric';

export type IndicatorKey =
  | 'systolicBp'
  | 'diastolicBp'
  | 'heartRate'
  | 'liverFatPercent'
  | 'serumAlt'
  | 'bmi'
  | 'totalCholesterol'
  | 'ldlCholesterol'
  | 'fastingGlucose'
  | 'gastricMucosaScore';

export interface RegimenAgentItem {
  id: string;
  /** 'drug' = 临床药品药名 (通用名/商品名), 'product' = 功能营养与微生态产品品名 */
  kind: 'drug' | 'product';
  name: string;
  dosageSpec: string;
  targetIssueKey: HealthIssueKey;
  changeTag?: string;
}

export interface CourseRegimenBreakdown {
  courseId: string;
  courseNo: number;
  courseLabel: string;
  stageTitle: string;
  startDate: string;
  endDate: string;
  status: CourseStatus;
  statusText: string;
  cycleWeeks: number;
  elapsedWeeks: number;
  adherencePercent: number;
  drugItems: RegimenAgentItem[];
  productItems: RegimenAgentItem[];
  regimenEvolutionNote: string;
}

export interface IndicatorCoursePoint {
  courseId: string;
  courseNo: number;
  courseLabel: string;
  date: string;
  status: CourseStatus;
  value: number;
  formatted: string;
  isNormal: boolean;
  deltaFromBaseline: number;
  deltaPercentFromBaseline: number;
  deltaFromPrevCourse: number;
}

export interface IndicatorIndependentBaseline {
  courseId: string;
  date: string;
  value: number;
  formatted: string;
  isAbnormal: boolean;
  deviationText: string;
}

export interface IndicatorCourseTrajectory {
  key: IndicatorKey;
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  issueKey: HealthIssueKey;
  issueShortTitle: string;
  linkedOrganId: OrganId;
  trendFocusMetric: TrendFocusMetric;
  referenceLabel: string;
  safeMin: number;
  safeMax: number;
  independentBaseline: IndicatorIndependentBaseline;
  coursePoints: IndicatorCoursePoint[];
  projectedTarget: {
    value: number;
    formatted: string;
  };
}

export type HealthIssueStatus =
  | 'cured_closed'
  | 'stepdown_remission'
  | 'improving'
  | 'baseline_active';

export interface PatientHealthIssue {
  key: HealthIssueKey;
  indexNo: number;
  title: string;
  shortTitle: string;
  organId: OrganId;
  organName: string;
  status: HealthIssueStatus;
  statusLabel: string;
  baselineSummary: string;
  latestSummary: string;
  associatedDrugNames: string[];
  associatedProductNames: string[];
  indicators: IndicatorCourseTrajectory[];
}

export interface PatientProblemCourseHierarchy {
  patientId: string;
  patientName: string;
  totalIssuesCount: number;
  abnormalIssuesAtBaselineCount: number;
  resolvedIssuesCount: number;
  totalInterventionCoursesCount: number;
  closedCoursesCount: number;
  allDrugNamesAcrossCourses: string[];
  allProductNamesAcrossCourses: string[];
  courseRegimens: CourseRegimenBreakdown[];
  issues: PatientHealthIssue[];
  allIndicators: IndicatorCourseTrajectory[];
  defaultCrossFromCourseId: string;
  defaultCrossToCourseId: string;
}

export interface CrossPeriodIndicatorDeltaRow {
  indicator: IndicatorCourseTrajectory;
  fromValue: number;
  fromFormatted: string;
  fromIsNormal: boolean;
  toValue: number;
  toFormatted: string;
  toIsNormal: boolean;
  deltaAbs: number;
  deltaFormatted: string;
  deltaPercent: number;
  improved: boolean;
  newlyNormalized: boolean;
}

export interface CrossPeriodCourseComparison {
  fromCourse: CourseRegimenBreakdown;
  toCourse: CourseRegimenBreakdown;
  isSimulatedTargetEnd: boolean;
  spanSummaryLabel: string;
  regimenTransitionSummary: string;
  rows: CrossPeriodIndicatorDeltaRow[];
  improvedCount: number;
  normalizedCount: number;
  abnormalAtFromCount: number;
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function formatNum(val: number, decimals: number): string {
  return val.toFixed(decimals);
}

/**
 * Deterministic derivation of serum ALT (U/L, ref < 40) from liver fat MRI-PDFF %,
 * ensuring every course has a physiologically coherent hepatic enzyme indicator alongside liver fat %.
 */
export function deriveCourseSerumAlt(course: TreatmentCourseRecord): number {
  const lf = course.metrics.liverFatPercent;
  if (lf <= 4.8) return Math.round(16 + lf * 1.4);
  return Math.round(14 + lf * 3.3);
}

/**
 * Deterministic derivation of endoscopic gastric mucosa hyperemia score (0.5 - 2.5, normal <= 1.0)
 * from gastricStatus & course progression.
 */
export function deriveCourseGastricScore(
  course: TreatmentCourseRecord,
  totalCourses: number
): number {
  if (course.metrics.gastricStatus === 'normal') {
    return course.courseNo >= 2 ? 0.7 : 0.9;
  }
  if (course.courseNo === 0) return 2.2;
  const progress = Math.min(1, course.courseNo / Math.max(2, totalCourses - 1));
  return roundTo(Math.max(1.1, 2.2 - progress * 0.8), 1);
}

/**
 * Builds structured clinical medication (`药名`) and functional product (`产品品名`) breakdown
 * for each course of a patient. Uses explicit curated clinical regimens for the 5 cohort archetypes
 * and falls back deterministically for any custom record.
 */
function buildCourseRegimenForPatient(
  patient: PatientCohortRecord,
  course: TreatmentCourseRecord
): Omit<CourseRegimenBreakdown, 'statusText'> {
  const base = {
    courseId: course.id,
    courseNo: course.courseNo,
    courseLabel: course.courseLabel,
    stageTitle: course.stageTitle,
    startDate: course.startDate,
    endDate: course.endDate,
    status: course.status,
    cycleWeeks: course.cycleWeeks,
    elapsedWeeks: course.elapsedWeeks,
    adherencePercent: course.adherencePercent,
  };

  if (course.courseNo === 0) {
    return {
      ...base,
      drugItems: [],
      productItems: [],
      regimenEvolutionNote: '初诊建档采集各指标独立基线，尚未启动处方药与微生态营养产品干预',
    };
  }

  // 1. 陈建国 (4 issues, 3 courses: 2 closed + 1 active drug step-down)
  if (patient.id === 'pat-chenjianguo') {
    if (course.courseNo === 1) {
      return {
        ...base,
        drugItems: [
          {
            id: 'cjg-c1-d1',
            kind: 'drug',
            name: '苯磺酸氨氯地平片（络活喜）',
            dosageSpec: '5mg 晨服1片/日',
            targetIssueKey: 'issue-bp-cardio',
            changeTag: '首期启用',
          },
          {
            id: 'cjg-c1-d2',
            kind: 'drug',
            name: '瑞舒伐他汀钙片（可定）',
            dosageSpec: '5mg 睡前1片/日',
            targetIssueKey: 'issue-dyslipidemia',
            changeTag: '首期启用',
          },
          {
            id: 'cjg-c1-d3',
            kind: 'drug',
            name: '多烯磷脂酰胆碱胶囊（易善复）',
            dosageSpec: '456mg×2粒 每日3次随餐',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '短期护膜',
          },
        ],
        productItems: [
          {
            id: 'cjg-c1-p1',
            kind: 'product',
            name: '护肝菌',
            dosageSpec: '晚餐后6条（≤37℃温水冲服）',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '核心微生态',
          },
          {
            id: 'cjg-c1-p2',
            kind: 'product',
            name: '优康力',
            dosageSpec: '6勺+300ml温水代晚餐',
            targetIssueKey: 'issue-bp-cardio',
            changeTag: '血管内皮养护',
          },
        ],
        regimenEvolutionNote: '第1疗程启动西药稳压调脂联合护肝菌、优康力，快速度过二级高血压高危期',
      };
    }
    if (course.courseNo === 2) {
      return {
        ...base,
        drugItems: [
          {
            id: 'cjg-c2-d1',
            kind: 'drug',
            name: '苯磺酸氨氯地平片（络活喜）',
            dosageSpec: '5mg 晨服1片/日（稳压维持）',
            targetIssueKey: 'issue-bp-cardio',
            changeTag: '维持剂量',
          },
          {
            id: 'cjg-c2-d2',
            kind: 'drug',
            name: '瑞舒伐他汀钙片（可定）',
            dosageSpec: '5mg 睡前1片/日',
            targetIssueKey: 'issue-dyslipidemia',
            changeTag: '维持剂量',
          },
          {
            id: 'cjg-c2-d3',
            kind: 'drug',
            name: '多烯磷脂酰胆碱胶囊（易善复）',
            dosageSpec: '转氨酶下降后按计划停药',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '结案停药',
          },
        ],
        productItems: [
          {
            id: 'cjg-c2-p1',
            kind: 'product',
            name: '护肝菌',
            dosageSpec: '晚餐后6条（≤37℃温水）',
            targetIssueKey: 'issue-fatty-liver',
          },
          {
            id: 'cjg-c2-p2',
            kind: 'product',
            name: '白胶囊',
            dosageSpec: '早空腹4粒',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '新增强化',
          },
          {
            id: 'cjg-c2-p3',
            kind: 'product',
            name: '黑片',
            dosageSpec: '睡前2小时6片',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '新增强化',
          },
          {
            id: 'cjg-c2-p4',
            kind: 'product',
            name: '太空晶球益生菌',
            dosageSpec: '餐前2条×3次/日',
            targetIssueKey: 'issue-glycemic-gastric',
            changeTag: '控糖修黏膜',
          },
          {
            id: 'cjg-c2-p5',
            kind: 'product',
            name: '优康力',
            dosageSpec: '6勺+300ml温水代晚餐',
            targetIssueKey: 'issue-dyslipidemia',
          },
        ],
        regimenEvolutionNote: '第2疗程停用易善复，升级护肝三联（护肝菌+白胶囊+黑片）并加太空晶球益生菌，血糖与胃黏膜率先结案归绿',
      };
    }
    return {
      ...base,
      drugItems: [
        {
          id: 'cjg-c3-d1',
          kind: 'drug',
          name: '苯磺酸氨氯地平片（络活喜）',
          dosageSpec: '减半至 2.5mg（半片/晨服）',
          targetIssueKey: 'issue-bp-cardio',
          changeTag: '西药减半',
        },
        {
          id: 'cjg-c3-d2',
          kind: 'drug',
          name: '瑞舒伐他汀钙片（可定）',
          dosageSpec: '5mg 改为隔日1次巩固',
          targetIssueKey: 'issue-dyslipidemia',
          changeTag: '频次降阶',
        },
        {
          id: 'cjg-c3-d3',
          kind: 'drug',
          name: '辅酶Q10软胶囊（能气朗）',
          dosageSpec: '10mg×3次/日心肌营养支持',
          targetIssueKey: 'issue-bp-cardio',
          changeTag: '护心协同',
        },
      ],
      productItems: [
        {
          id: 'cjg-c3-p1',
          kind: 'product',
          name: '优康力',
          dosageSpec: '6勺+300ml温水代晚餐',
          targetIssueKey: 'issue-bp-cardio',
          changeTag: '稳斑块核心',
        },
        {
          id: 'cjg-c3-p2',
          kind: 'product',
          name: '护肝菌',
          dosageSpec: '晚餐后6条（第2周期巩固）',
          targetIssueKey: 'issue-fatty-liver',
        },
        {
          id: 'cjg-c3-p3',
          kind: 'product',
          name: '白胶囊',
          dosageSpec: '早空腹4粒',
          targetIssueKey: 'issue-fatty-liver',
        },
        {
          id: 'cjg-c3-p4',
          kind: 'product',
          name: '黑片',
          dosageSpec: '睡前2小时6片',
          targetIssueKey: 'issue-fatty-liver',
        },
      ],
      regimenEvolutionNote: '第2疗程结案达标后开启第3疗程：络活喜成功减半至 2.5mg、可定改为隔日，依托优康力与护肝三联稳态冲刺',
    };
  }

  // 2. 周雅琴 (3 issues, 2 closed courses, 100% cured)
  if (patient.id === 'pat-zhouyaqin') {
    if (course.courseNo === 1) {
      return {
        ...base,
        drugItems: [
          {
            id: 'zyq-c1-d1',
            kind: 'drug',
            name: '多烯磷脂酰胆碱胶囊（易善复）',
            dosageSpec: '456mg×2粒 每日3次（首月短期护肝膜）',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '短期辅助',
          },
        ],
        productItems: [
          {
            id: 'zyq-c1-p1',
            kind: 'product',
            name: '护肝菌',
            dosageSpec: '晚餐后6条（≤37℃温水冲服）',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '核心组方',
          },
          {
            id: 'zyq-c1-p2',
            kind: 'product',
            name: '白胶囊',
            dosageSpec: '早空腹4粒',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '核心组方',
          },
          {
            id: 'zyq-c1-p3',
            kind: 'product',
            name: '黑片',
            dosageSpec: '睡前2小时6片',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '核心组方',
          },
          {
            id: 'zyq-c1-p4',
            kind: 'product',
            name: '优康力',
            dosageSpec: '6勺+300ml温水代晚餐',
            targetIssueKey: 'issue-bp-cardio',
            changeTag: '稳压调脂',
          },
        ],
        regimenEvolutionNote: '免启动降压西药，以护肝菌+白胶囊+黑片联合优康力，首疗程结案血压与血脂率先转绿',
      };
    }
    return {
      ...base,
      drugItems: [
        {
          id: 'zyq-c2-d1',
          kind: 'drug',
          name: '多烯磷脂酰胆碱胶囊（易善复）',
          dosageSpec: '第1疗程结案后已停用（全程零西药巩固）',
          targetIssueKey: 'issue-fatty-liver',
          changeTag: '达标停药',
        },
      ],
      productItems: [
        {
          id: 'zyq-c2-p1',
          kind: 'product',
          name: '护肝菌',
          dosageSpec: '晚餐后6条（完成第2周期脱帽）',
          targetIssueKey: 'issue-fatty-liver',
        },
        {
          id: 'zyq-c2-p2',
          kind: 'product',
          name: '白胶囊',
          dosageSpec: '早空腹4粒',
          targetIssueKey: 'issue-fatty-liver',
        },
        {
          id: 'zyq-c2-p3',
          kind: 'product',
          name: '黑片',
          dosageSpec: '睡前2小时6片',
          targetIssueKey: 'issue-fatty-liver',
        },
        {
          id: 'zyq-c2-p4',
          kind: 'product',
          name: '美龄鹿',
          dosageSpec: '1条+500ml温水（半小时内饮完）',
          targetIssueKey: 'issue-dyslipidemia',
          changeTag: '线粒体抗衰巩固',
        },
      ],
      regimenEvolutionNote: '第2疗程零西药完成护肝三联第2周期并升级美龄鹿，肝脂 4.3% 彻底脱帽结案',
    };
  }

  // 3. 苏婉清 (3 issues, 2 closed courses)
  if (patient.id === 'pat-suwanqing') {
    if (course.courseNo === 1) {
      return {
        ...base,
        drugItems: [
          {
            id: 'swq-c1-d1',
            kind: 'drug',
            name: '瑞巴派特片（膜固思达）',
            dosageSpec: '0.1g 每日3次餐前护胃黏膜',
            targetIssueKey: 'issue-glycemic-gastric',
            changeTag: '黏膜保护',
          },
          {
            id: 'swq-c1-d2',
            kind: 'drug',
            name: '铝碳酸镁咀嚼片（达喜）',
            dosageSpec: '0.5g 餐后反酸时按需嚼服',
            targetIssueKey: 'issue-glycemic-gastric',
            changeTag: '按需抑酸',
          },
        ],
        productItems: [
          {
            id: 'swq-c1-p1',
            kind: 'product',
            name: '太空晶球益生菌',
            dosageSpec: '早空腹3条 + 晚餐后4条（≤37℃温水）',
            targetIssueKey: 'issue-glycemic-gastric',
            changeTag: '胃黏膜核心',
          },
          {
            id: 'swq-c1-p2',
            kind: 'product',
            name: '优康力',
            dosageSpec: '6勺+300ml温水代晚餐',
            targetIssueKey: 'issue-dyslipidemia',
            changeTag: '减少胆固醇吸收',
          },
        ],
        regimenEvolutionNote: '第1疗程膜固思达配合太空晶球益生菌快速消除胃窦充血反酸，优康力同步下调总胆固醇',
      };
    }
    return {
      ...base,
      drugItems: [
        {
          id: 'swq-c2-d1',
          kind: 'drug',
          name: '瑞巴派特片 / 铝碳酸镁片',
          dosageSpec: '反酸消失后第2疗程全面停用胃药',
          targetIssueKey: 'issue-glycemic-gastric',
          changeTag: '达标停药',
        },
        {
          id: 'swq-c2-d2',
          kind: 'drug',
          name: '高纯度ω-3鱼油乙酯软胶囊',
          dosageSpec: '1000mg 随午餐1粒协同调脂',
          targetIssueKey: 'issue-dyslipidemia',
          changeTag: '温和协同',
        },
      ],
      productItems: [
        {
          id: 'swq-c2-p1',
          kind: 'product',
          name: '优康力',
          dosageSpec: '6勺+300ml温水代晚餐',
          targetIssueKey: 'issue-dyslipidemia',
        },
        {
          id: 'swq-c2-p2',
          kind: 'product',
          name: '太空晶球益生菌',
          dosageSpec: '早空腹2条巩固胃肠屏障',
          targetIssueKey: 'issue-glycemic-gastric',
          changeTag: '减量巩固',
        },
        {
          id: 'swq-c2-p3',
          kind: 'product',
          name: '开心季菌',
          dosageSpec: '睡前3条（≤37℃温水）',
          targetIssueKey: 'issue-fatty-liver',
          changeTag: '深睡脑肠轴',
        },
        {
          id: 'swq-c2-p4',
          kind: 'product',
          name: '正固素',
          dosageSpec: '晚饭后2条直接服用',
          targetIssueKey: 'issue-fatty-liver',
          changeTag: '节律修复',
        },
      ],
      regimenEvolutionNote: '第2疗程停用全部护胃西药，叠加开心季菌+正固素修复睡眠节律，TC 5.1 与胃黏膜双双结案转绿',
    };
  }

  // 4. 林晓 (4 issues, Course 1 closed + Course 2 active)
  if (patient.id === 'pat-linxiao') {
    if (course.courseNo === 1) {
      return {
        ...base,
        drugItems: [
          {
            id: 'lx-c1-d1',
            kind: 'drug',
            name: '苯磺酸氨氯地平片（络活喜）',
            dosageSpec: '2.5mg 晨服半片温和稳压',
            targetIssueKey: 'issue-bp-cardio',
            changeTag: '低剂量启动',
          },
          {
            id: 'lx-c1-d2',
            kind: 'drug',
            name: '多烯磷脂酰胆碱胶囊（易善复）',
            dosageSpec: '456mg×2粒 每日3次',
            targetIssueKey: 'issue-fatty-liver',
            changeTag: '首期护肝',
          },
        ],
        productItems: [
          {
            id: 'lx-c1-p1',
            kind: 'product',
            name: '太空晶球益生菌',
            dosageSpec: '早空腹3条 + 晚餐后4条',
            targetIssueKey: 'issue-glycemic-gastric',
            changeTag: '护胃定植',
          },
          {
            id: 'lx-c1-p2',
            kind: 'product',
            name: '优康力',
            dosageSpec: '6勺+300ml温水代晚餐',
            targetIssueKey: 'issue-dyslipidemia',
            changeTag: '控脂稳压',
          },
        ],
        regimenEvolutionNote: '第1疗程低剂量络活喜配合太空晶球益生菌与优康力，平稳启动减重与护胃',
      };
    }
    return {
      ...base,
      drugItems: [
        {
          id: 'lx-c2-d1',
          kind: 'drug',
          name: '苯磺酸氨氯地平片（络活喜）',
          dosageSpec: '2.5mg 晨服半片维持（待结案评估停药）',
          targetIssueKey: 'issue-bp-cardio',
        },
        {
          id: 'lx-c2-d2',
          kind: 'drug',
          name: '辅酶Q10软胶囊',
          dosageSpec: '100mg 随早餐1粒',
          targetIssueKey: 'issue-bp-cardio',
          changeTag: '替代易善复',
        },
      ],
      productItems: [
        {
          id: 'lx-c2-p1',
          kind: 'product',
          name: '护肝菌',
          dosageSpec: '晚餐后6条（≤37℃温水）',
          targetIssueKey: 'issue-fatty-liver',
          changeTag: '升级强化',
        },
        {
          id: 'lx-c2-p2',
          kind: 'product',
          name: '白胶囊',
          dosageSpec: '早空腹4粒',
          targetIssueKey: 'issue-fatty-liver',
          changeTag: '升级强化',
        },
        {
          id: 'lx-c2-p3',
          kind: 'product',
          name: '黑片',
          dosageSpec: '睡前2小时6片',
          targetIssueKey: 'issue-fatty-liver',
          changeTag: '升级强化',
        },
        {
          id: 'lx-c2-p4',
          kind: 'product',
          name: '优康力',
          dosageSpec: '6勺+300ml温水代晚餐',
          targetIssueKey: 'issue-dyslipidemia',
        },
      ],
      regimenEvolutionNote: '第1疗程结案后停用易善复，升级护肝菌+白胶囊+黑片三联强化减肝脂',
    };
  }

  // 5. 陈小真 (74岁，NebulaByte YSY 60页体验报告导入标杆：胃窦幽门+胆系+骨关节+心血管共管)
  if (patient.id === 'pat-chenxiaozhen') {
    if (course.courseNo === 1) {
      return {
        ...base,
        drugItems: [
          {
            id: 'cxz-c1-d1',
            kind: 'drug',
            name: '瑞巴派特片（膜固思达）',
            dosageSpec: '0.1g 每日3次餐前修复胃溃疡面',
            targetIssueKey: 'issue-glycemic-gastric',
            changeTag: '首期启用',
          },
          {
            id: 'cxz-c1-d2',
            kind: 'drug',
            name: '铝碳酸镁咀嚼片（达喜）',
            dosageSpec: '0.5g 胃胀反酸时按需嚼服护幽门',
            targetIssueKey: 'issue-glycemic-gastric',
            changeTag: '按需护膜',
          },
          {
            id: 'cxz-c1-d3',
            kind: 'drug',
            name: '辅酶Q10软胶囊（能气朗）',
            dosageSpec: '10mg 每日3次改善左心房心肌供能',
            targetIssueKey: 'issue-bp-cardio',
            changeTag: '护心供能',
          },
          {
            id: 'cxz-c1-d4',
            kind: 'drug',
            name: '骨化三醇胶丸（罗盖全）',
            dosageSpec: '0.25μg 随早餐1粒促肠钙入骨',
            targetIssueKey: 'issue-dyslipidemia',
            changeTag: '抗骨松启动',
          },
        ],
        productItems: [
          {
            id: 'cxz-c1-p1',
            kind: 'product',
            name: '太空晶球益生菌',
            dosageSpec: '幽门强化量：早空腹7条 + 晚餐后7条（≤37℃温水）',
            targetIssueKey: 'issue-glycemic-gastric',
            changeTag: '拮抗幽门菌',
          },
          {
            id: 'cxz-c1-p2',
            kind: 'product',
            name: '优康力',
            dosageSpec: '6勺+300ml温水代晚餐小口慢饮',
            targetIssueKey: 'issue-bp-cardio',
            changeTag: '护内皮修肠障',
          },
          {
            id: 'cxz-c1-p3',
            kind: 'product',
            name: '马鹿骨',
            dosageSpec: '随餐3粒 × 3次/天（靶向软骨与腰髋骨密）',
            targetIssueKey: 'issue-dyslipidemia',
            changeTag: '软骨靶向',
          },
        ],
        regimenEvolutionNote:
          '对标 YSY 报告胃溃疡(E7 11.038)与软骨退变(E7 11.434)，启动膜固思达+太空晶球益生菌+马鹿骨+优康力联合南瓜黑枣低D值食疗',
      };
    }
    return {
      ...base,
      drugItems: [
        {
          id: 'cxz-c2-d1',
          kind: 'drug',
          name: '铝碳酸镁咀嚼片（达喜）',
          dosageSpec: '反酸消失后第2疗程按计划停用',
          targetIssueKey: 'issue-glycemic-gastric',
          changeTag: '结案停药',
        },
        {
          id: 'cxz-c2-d2',
          kind: 'drug',
          name: '瑞巴派特片（膜固思达）',
          dosageSpec: '0.1g 减为早晚各1片巩固黏膜',
          targetIssueKey: 'issue-glycemic-gastric',
          changeTag: '西药减半',
        },
        {
          id: 'cxz-c2-d3',
          kind: 'drug',
          name: '辅酶Q10软胶囊 + 骨化三醇胶丸',
          dosageSpec: '常规剂量维持护心肌与骨代谢',
          targetIssueKey: 'issue-bp-cardio',
          changeTag: '稳态维持',
        },
      ],
      productItems: [
        {
          id: 'cxz-c2-p1',
          kind: 'product',
          name: '护肝菌',
          dosageSpec: '晚餐后6条（疏解胆囊与总胆管重度负荷）',
          targetIssueKey: 'issue-fatty-liver',
          changeTag: '新增疏胆护肝',
        },
        {
          id: 'cxz-c2-p2',
          kind: 'product',
          name: '太空晶球益生菌',
          dosageSpec: '降阶巩固：每餐前2条 × 3次/天',
          targetIssueKey: 'issue-glycemic-gastric',
          changeTag: '减量巩固',
        },
        {
          id: 'cxz-c2-p3',
          kind: 'product',
          name: '优康力',
          dosageSpec: '6勺+300ml温水代晚餐',
          targetIssueKey: 'issue-dyslipidemia',
        },
        {
          id: 'cxz-c2-p4',
          kind: 'product',
          name: '马鹿骨',
          dosageSpec: '第2月降阶：随餐3粒 × 2次/天',
          targetIssueKey: 'issue-dyslipidemia',
          changeTag: '标准降频',
        },
      ],
      regimenEvolutionNote:
        '第1疗程结案胃溃疡D值大降后停用达喜、瑞巴派特减半，新增护肝菌疏解总胆管负荷，胃壁6级黑块在第2疗程复测清零',
    };
  }

  // 6. 赵明轩 & Generic Fallback
  return {
    ...base,
    drugItems: [
      {
        id: `${course.id}-d1`,
        kind: 'drug',
        name: '水飞蓟宾胶囊（水林佳）',
        dosageSpec: '70mg×2粒 每日3次护肝细胞膜',
        targetIssueKey: 'issue-fatty-liver',
        changeTag: '首疗程启用',
      },
      {
        id: `${course.id}-d2`,
        kind: 'drug',
        name: '瑞巴派特片（膜固思达）',
        dosageSpec: '0.1g 每日3次餐前护胃黏膜',
        targetIssueKey: 'issue-glycemic-gastric',
        changeTag: '黏膜修复',
      },
    ],
    productItems: [
      {
        id: `${course.id}-p1`,
        kind: 'product',
        name: '护肝菌',
        dosageSpec: '晚餐后6条（≤37℃温水冲服）',
        targetIssueKey: 'issue-fatty-liver',
        changeTag: '核心组方',
      },
      {
        id: `${course.id}-p2`,
        kind: 'product',
        name: '白胶囊',
        dosageSpec: '早空腹4粒',
        targetIssueKey: 'issue-fatty-liver',
        changeTag: '核心组方',
      },
      {
        id: `${course.id}-p3`,
        kind: 'product',
        name: '黑片',
        dosageSpec: '睡前2小时6片',
        targetIssueKey: 'issue-fatty-liver',
        changeTag: '核心组方',
      },
      {
        id: `${course.id}-p4`,
        kind: 'product',
        name: '优康力',
        dosageSpec: '6勺+300ml温水代晚餐',
        targetIssueKey: 'issue-dyslipidemia',
        changeTag: '调脂护血管',
      },
      {
        id: `${course.id}-p5`,
        kind: 'product',
        name: '开心季菌',
        dosageSpec: '睡前3条（≤37℃温水）',
        targetIssueKey: 'issue-bp-cardio',
        changeTag: '修复熬夜节律',
      },
    ],
    regimenEvolutionNote: '青年首疗程免启动降压西药，以水林佳+护肝三联+优康力+开心季菌协同逆转心肝胃代谢',
  };
}

interface IndicatorMetaSpec {
  key: IndicatorKey;
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  issueKey: HealthIssueKey;
  issueShortTitle: string;
  linkedOrganId: OrganId;
  trendFocusMetric: TrendFocusMetric;
  referenceLabel: string;
  safeMin: number;
  safeMax: number;
  targetIdealValue: number;
  extract: (
    course: TreatmentCourseRecord,
    heightCm: number,
    totalCourses: number
  ) => number;
}

const INDICATOR_SPECS: ReadonlyArray<IndicatorMetaSpec> = [
  {
    key: 'systolicBp',
    label: '收缩压 (SBP)',
    shortLabel: '收缩压',
    unit: 'mmHg',
    decimals: 0,
    issueKey: 'issue-bp-cardio',
    issueShortTitle: '血压与心血管负荷',
    linkedOrganId: 'heart',
    trendFocusMetric: 'bp',
    referenceLabel: '90–129 mmHg',
    safeMin: 90,
    safeMax: 129,
    targetIdealValue: 124,
    extract: (c) => c.metrics.systolicBp,
  },
  {
    key: 'diastolicBp',
    label: '舒张压 (DBP)',
    shortLabel: '舒张压',
    unit: 'mmHg',
    decimals: 0,
    issueKey: 'issue-bp-cardio',
    issueShortTitle: '血压与心血管负荷',
    linkedOrganId: 'heart',
    trendFocusMetric: 'bp',
    referenceLabel: '60–84 mmHg',
    safeMin: 60,
    safeMax: 84,
    targetIdealValue: 79,
    extract: (c) => c.metrics.diastolicBp,
  },
  {
    key: 'heartRate',
    label: '静息心率 (HR)',
    shortLabel: '静息心率',
    unit: '次/分',
    decimals: 0,
    issueKey: 'issue-bp-cardio',
    issueShortTitle: '血压与心血管负荷',
    linkedOrganId: 'heart',
    trendFocusMetric: 'bp',
    referenceLabel: '60–78 次/分',
    safeMin: 60,
    safeMax: 78,
    targetIdealValue: 70,
    extract: (c) => c.metrics.heartRate,
  },
  {
    key: 'liverFatPercent',
    label: '肝脂肪率 (MRI-PDFF)',
    shortLabel: '肝脂肪率',
    unit: '%',
    decimals: 1,
    issueKey: 'issue-fatty-liver',
    issueShortTitle: '脂肪肝与肝细胞代谢',
    linkedOrganId: 'liver',
    trendFocusMetric: 'liver',
    referenceLabel: '< 5.0%',
    safeMin: 1.5,
    safeMax: 4.9,
    targetIdealValue: 4.5,
    extract: (c) => c.metrics.liverFatPercent,
  },
  {
    key: 'serumAlt',
    label: '谷丙转氨酶 (ALT)',
    shortLabel: '转氨酶 ALT',
    unit: 'U/L',
    decimals: 0,
    issueKey: 'issue-fatty-liver',
    issueShortTitle: '脂肪肝与肝细胞代谢',
    linkedOrganId: 'liver',
    trendFocusMetric: 'liver',
    referenceLabel: '< 40 U/L',
    safeMin: 8,
    safeMax: 39,
    targetIdealValue: 22,
    extract: (c) => deriveCourseSerumAlt(c),
  },
  {
    key: 'bmi',
    label: '体重指数 (BMI)',
    shortLabel: 'BMI 指数',
    unit: 'kg/m²',
    decimals: 1,
    issueKey: 'issue-fatty-liver',
    issueShortTitle: '脂肪肝与肝细胞代谢',
    linkedOrganId: 'liver',
    trendFocusMetric: 'weight_score',
    referenceLabel: '18.5–23.9',
    safeMin: 18.5,
    safeMax: 23.9,
    targetIdealValue: 22.4,
    extract: (c, heightCm) => computeBmi(c.weightKg, heightCm),
  },
  {
    key: 'totalCholesterol',
    label: '总胆固醇 (TC)',
    shortLabel: '总胆固醇',
    unit: 'mmol/L',
    decimals: 1,
    issueKey: 'issue-dyslipidemia',
    issueShortTitle: '高胆固醇与血管斑块防控',
    linkedOrganId: 'vascular',
    trendFocusMetric: 'lipid',
    referenceLabel: '< 5.2 mmol/L',
    safeMin: 3.1,
    safeMax: 5.1,
    targetIdealValue: 4.8,
    extract: (c) => c.metrics.totalCholesterol,
  },
  {
    key: 'ldlCholesterol',
    label: '低密度脂蛋白 (LDL-C)',
    shortLabel: 'LDL-C',
    unit: 'mmol/L',
    decimals: 1,
    issueKey: 'issue-dyslipidemia',
    issueShortTitle: '高胆固醇与血管斑块防控',
    linkedOrganId: 'vascular',
    trendFocusMetric: 'lipid',
    referenceLabel: '< 3.4 mmol/L',
    safeMin: 1.5,
    safeMax: 3.3,
    targetIdealValue: 2.9,
    extract: (c) => c.metrics.ldlCholesterol,
  },
  {
    key: 'fastingGlucose',
    label: '空腹血糖 (FPG)',
    shortLabel: '空腹血糖',
    unit: 'mmol/L',
    decimals: 1,
    issueKey: 'issue-glycemic-gastric',
    issueShortTitle: '胃肠黏膜与糖代谢节律',
    linkedOrganId: 'stomach',
    trendFocusMetric: 'lipid',
    referenceLabel: '3.9–6.1 mmol/L',
    safeMin: 3.9,
    safeMax: 6.0,
    targetIdealValue: 5.0,
    extract: (c) => c.metrics.fastingGlucose,
  },
  {
    key: 'gastricMucosaScore',
    label: '胃窦黏膜充血内镜指数',
    shortLabel: '胃黏膜指数',
    unit: '级',
    decimals: 1,
    issueKey: 'issue-glycemic-gastric',
    issueShortTitle: '胃肠黏膜与糖代谢节律',
    linkedOrganId: 'stomach',
    trendFocusMetric: 'weight_score',
    referenceLabel: '≤ 1.0 级(光滑)',
    safeMin: 0.5,
    safeMax: 1.0,
    targetIdealValue: 0.8,
    extract: (c, _h, total) => deriveCourseGastricScore(c, total),
  },
];

/**
 * Builds the complete 6-level clinical data model for any patient:
 * 一名患者 → 多个健康问题 → 多个疗程（含药名与产品品名）→ 每疗程一组指标 → 每指标独立基线与动态趋势 → 疗程结案跨期对比基准
 */
export function buildPatientProblemCourseHierarchy(
  patient: PatientCohortRecord
): PatientProblemCourseHierarchy {
  const heightCm = patient.clinicalState.patientProfile.heightCm;
  const totalCourses = patient.courses.length;
  const baselineCourse = patient.courses[0];

  // 1. Course Regimens with explicit Drug Names & Product Brand Names
  const courseRegimens: CourseRegimenBreakdown[] = patient.courses.map((c) => {
    const raw = buildCourseRegimenForPatient(patient, c);
    const statusText =
      c.status === 'baseline'
        ? '独立基线采集'
        : c.status === 'completed'
        ? `已结案（满${c.cycleWeeks}周）`
        : `执行中（${c.elapsedWeeks}/${c.cycleWeeks}周）`;
    return {
      ...raw,
      statusText,
    };
  });

  const drugSet = new Set<string>();
  const productSet = new Set<string>();
  courseRegimens.forEach((cr) => {
    cr.drugItems.forEach((d) => {
      if (!d.name.includes('停用')) {
        drugSet.add(d.name);
      }
    });
    cr.productItems.forEach((p) => productSet.add(p.name));
  });

  // 2. Build all 10 Indicator Course Trajectories with Independent Baselines
  const allIndicators: IndicatorCourseTrajectory[] = INDICATOR_SPECS.map((spec) => {
    const baseVal = spec.extract(baselineCourse, heightCm, totalCourses);
    const baseFormatted = formatNum(baseVal, spec.decimals);
    const baseNormal = baseVal >= spec.safeMin && baseVal <= spec.safeMax;
    const excess = roundTo(baseVal - spec.safeMax, spec.decimals);
    const deviationText = baseNormal
      ? '基线处于正常靶区'
      : excess > 0
      ? `较上限超标 +${formatNum(excess, spec.decimals)}${spec.unit}`
      : `低于参考下限`;

    const coursePoints: IndicatorCoursePoint[] = patient.courses.map((c, idx) => {
      const val = spec.extract(c, heightCm, totalCourses);
      const prevVal =
        idx > 0 ? spec.extract(patient.courses[idx - 1], heightCm, totalCourses) : val;
      const deltaBase = roundTo(val - baseVal, spec.decimals);
      const deltaPct =
        baseVal !== 0 ? roundTo(((val - baseVal) / baseVal) * 100, 1) : 0;
      const deltaPrev = roundTo(val - prevVal, spec.decimals);
      const isNormal = val >= spec.safeMin && val <= spec.safeMax;

      return {
        courseId: c.id,
        courseNo: c.courseNo,
        courseLabel: c.courseLabel,
        date: c.endDate || c.startDate,
        status: c.status,
        value: val,
        formatted: formatNum(val, spec.decimals),
        isNormal,
        deltaFromBaseline: deltaBase,
        deltaPercentFromBaseline: deltaPct,
        deltaFromPrevCourse: deltaPrev,
      };
    });

    const latestVal = coursePoints[coursePoints.length - 1]?.value ?? baseVal;
    const projVal =
      latestVal <= spec.safeMax
        ? roundTo(Math.min(latestVal, spec.targetIdealValue), spec.decimals)
        : spec.targetIdealValue;

    return {
      key: spec.key,
      label: spec.label,
      shortLabel: spec.shortLabel,
      unit: spec.unit,
      decimals: spec.decimals,
      issueKey: spec.issueKey,
      issueShortTitle: spec.issueShortTitle,
      linkedOrganId: spec.linkedOrganId,
      trendFocusMetric: spec.trendFocusMetric,
      referenceLabel: spec.referenceLabel,
      safeMin: spec.safeMin,
      safeMax: spec.safeMax,
      independentBaseline: {
        courseId: baselineCourse.id,
        date: baselineCourse.startDate,
        value: baseVal,
        formatted: `${baseFormatted}${spec.unit ? ` ${spec.unit}` : ''}`,
        isAbnormal: !baseNormal,
        deviationText,
      },
      coursePoints,
      projectedTarget: {
        value: projVal,
        formatted: formatNum(projVal, spec.decimals),
      },
    };
  });

  // 3. Group into Patient's Multiple Health Issues (filter to clinically relevant issues for this patient, always 3–4 issues)
  const issueConfigs: Array<{
    key: HealthIssueKey;
    organId: OrganId;
    organName: string;
    buildTitle: (b: TreatmentCourseRecord) => string;
    shortTitle: string;
    shouldInclude: (b: TreatmentCourseRecord, p: PatientCohortRecord) => boolean;
  }> = [
    {
      key: 'issue-bp-cardio',
      organId: 'heart',
      organName: '心脏与血管内皮',
      shortTitle: '血压与心血管负荷',
      buildTitle: (b) =>
        b.metrics.systolicBp >= 150
          ? `2级高血压伴血管阻力升高（初诊 ${b.metrics.systolicBp}/${b.metrics.diastolicBp} mmHg）`
          : b.metrics.systolicBp >= 140
          ? `1级高血压伴交感心率偏快（初诊 ${b.metrics.systolicBp}/${b.metrics.diastolicBp} mmHg）`
          : b.metrics.systolicBp >= 130 || b.metrics.diastolicBp >= 85
          ? `临界血压偏高与血管弹性管理（初诊 ${b.metrics.systolicBp}/${b.metrics.diastolicBp} mmHg）`
          : `心血管稳态与睡眠交感节律共管（初诊 ${b.metrics.systolicBp}/${b.metrics.diastolicBp} mmHg）`,
      shouldInclude: (b, p) =>
        b.metrics.systolicBp >= 130 ||
        b.metrics.diastolicBp >= 84 ||
        p.focusOrgans.includes('heart'),
    },
    {
      key: 'issue-fatty-liver',
      organId: 'liver',
      organName: '肝脏脂质代谢',
      shortTitle: '脂肪肝与肝酶代谢',
      buildTitle: (b) =>
        b.metrics.liverFatPercent >= 12
          ? `中度非酒精性脂肪肝伴转氨酶升高（初诊肝脂 ${b.metrics.liverFatPercent.toFixed(1)}%）`
          : `轻度脂肪肝伴体脂代谢异常（初诊肝脂 ${b.metrics.liverFatPercent.toFixed(1)}%）`,
      shouldInclude: (b, p) =>
        b.metrics.liverFatPercent >= 5.0 || p.focusOrgans.includes('liver'),
    },
    {
      key: 'issue-dyslipidemia',
      organId: 'vascular',
      organName: '全身动脉血管',
      shortTitle: '高胆固醇与血脂异常',
      buildTitle: (b) =>
        `高胆固醇血症与低密度脂蛋白偏高（初诊 TC ${b.metrics.totalCholesterol.toFixed(1)} / LDL ${b.metrics.ldlCholesterol.toFixed(1)}）`,
      shouldInclude: (b, p) =>
        b.metrics.totalCholesterol >= 5.2 ||
        b.metrics.ldlCholesterol >= 3.4 ||
        p.focusOrgans.includes('vascular'),
    },
    {
      key: 'issue-glycemic-gastric',
      organId: 'stomach',
      organName: '胃肠道与胰岛代谢',
      shortTitle: '胃窦黏膜与糖代谢',
      buildTitle: (b) =>
        b.metrics.fastingGlucose >= 6.0 && b.metrics.gastricStatus === 'mild_congestion'
          ? `空腹血糖受损（${b.metrics.fastingGlucose.toFixed(1)}）合并胃窦黏膜充血`
          : b.metrics.gastricStatus === 'mild_congestion'
          ? `慢性浅表性胃窦黏膜充血伴餐后反酸`
          : `餐后糖代谢与消化道微生态屏障维护`,
      shouldInclude: (b, p) =>
        b.metrics.gastricStatus === 'mild_congestion' ||
        b.metrics.fastingGlucose >= 5.8 ||
        p.focusOrgans.includes('stomach'),
    },
  ];

  const includedConfigs = issueConfigs.filter((cfg) =>
    cfg.shouldInclude(baselineCourse, patient)
  );

  const closedCourses = patient.courses.filter((c) => c.status === 'completed');
  const hasClosedCourse = closedCourses.length > 0;
  const latestCourse = patient.courses[patient.courses.length - 1];

  const issues: PatientHealthIssue[] = includedConfigs.map((cfg, idx) => {
    const issueIndicators = allIndicators.filter((ind) => ind.issueKey === cfg.key);
    const hadBaselineAbnormal = issueIndicators.some((i) => i.independentBaseline.isAbnormal);
    const allLatestNormal = issueIndicators.every(
      (i) => i.coursePoints[i.coursePoints.length - 1]?.isNormal
    );
    const anyImproved = issueIndicators.some((i) => {
      const last = i.coursePoints[i.coursePoints.length - 1];
      return last && last.deltaFromBaseline < 0;
    });

    let status: HealthIssueStatus = 'baseline_active';
    let statusLabel = '首疗程干预启动';
    if (allLatestNormal && (hasClosedCourse || latestCourse.courseNo >= 2)) {
      status = 'cured_closed';
      statusLabel = '已达标逆转结案';
    } else if (patient.id === 'pat-chenjianguo' && cfg.key === 'issue-bp-cardio') {
      status = 'stepdown_remission';
      statusLabel = '结案减药稳态中';
    } else if (anyImproved) {
      status = 'improving';
      statusLabel = '跨疗程持续改善';
    } else if (!hadBaselineAbnormal) {
      status = 'cured_closed';
      statusLabel = '稳态达标维持';
    }

    const issueDrugs = new Set<string>();
    const issueProducts = new Set<string>();
    courseRegimens.forEach((cr) => {
      cr.drugItems
        .filter((d) => d.targetIssueKey === cfg.key && !d.name.includes('停用'))
        .forEach((d) => issueDrugs.add(d.name));
      cr.productItems
        .filter((p) => p.targetIssueKey === cfg.key)
        .forEach((p) => issueProducts.add(p.name));
    });

    const primaryInd = issueIndicators[0];
    const basePt = primaryInd.coursePoints[0];
    const lastPt = primaryInd.coursePoints[primaryInd.coursePoints.length - 1];

    return {
      key: cfg.key,
      indexNo: idx + 1,
      title: cfg.buildTitle(baselineCourse),
      shortTitle: cfg.shortTitle,
      organId: cfg.organId,
      organName: cfg.organName,
      status,
      statusLabel,
      baselineSummary: `${primaryInd.shortLabel}初诊基线 ${basePt.formatted}${primaryInd.unit}`,
      latestSummary: `${lastPt.courseLabel} ${lastPt.formatted}${primaryInd.unit}`,
      associatedDrugNames: Array.from(issueDrugs),
      associatedProductNames: Array.from(issueProducts),
      indicators: issueIndicators,
    };
  });

  // Active indicators scoped to this patient's included Health Issues
  const includedIssueKeys = new Set(issues.map((i) => i.key));
  const scopedIndicators = allIndicators.filter((ind) => includedIssueKeys.has(ind.issueKey));

  // Choose smart default Cross-Period Comparison pair prioritizing Completed (结案) Courses!
  let defaultCrossFromCourseId = baselineCourse.id;
  let defaultCrossToCourseId = latestCourse.id;
  if (closedCourses.length >= 2) {
    // e.g. Chen Jianguo / Zhou Yaqin / Su Wanqing have >=2 completed courses:
    // default from = baseline (or C1), default to = latest completed course!
    defaultCrossFromCourseId = baselineCourse.id;
    defaultCrossToCourseId = closedCourses[closedCourses.length - 1].id;
  } else if (closedCourses.length === 1) {
    // e.g. Lin Xiao has C1 completed and C2 active: default baseline -> C1 completed (or C1 -> C2)
    defaultCrossFromCourseId = baselineCourse.id;
    defaultCrossToCourseId = closedCourses[0].id;
  } else {
    // New intake (Zhao Mingxuan): compare baseline -> simulated C1 target completion
    defaultCrossFromCourseId = baselineCourse.id;
    defaultCrossToCourseId = 'target_course_end';
  }

  return {
    patientId: patient.id,
    patientName: patient.clinicalState.patientProfile.name,
    totalIssuesCount: issues.length,
    abnormalIssuesAtBaselineCount: issues.filter((iss) =>
      iss.indicators.some((i) => i.independentBaseline.isAbnormal)
    ).length,
    resolvedIssuesCount: issues.filter((iss) => iss.status === 'cured_closed').length,
    totalInterventionCoursesCount: Math.max(0, patient.courses.length - 1),
    closedCoursesCount: closedCourses.length,
    allDrugNamesAcrossCourses: Array.from(drugSet),
    allProductNamesAcrossCourses: Array.from(productSet),
    courseRegimens,
    issues,
    allIndicators: scopedIndicators,
    defaultCrossFromCourseId,
    defaultCrossToCourseId,
  };
}

/**
 * Computes Post-Course Completion Cross-Period Comparison (`疗程结案后跨期对比`)
 * across any two course checkpoints (or `'target_course_end'` when no course has closed yet),
 * optionally filtered to a single Health Issue.
 */
export function computeCrossPeriodCourseComparison(
  hierarchy: PatientProblemCourseHierarchy,
  fromCourseId: string,
  toCourseId: string,
  issueFilter: HealthIssueKey | 'all' = 'all'
): CrossPeriodCourseComparison {
  const fromCourse =
    hierarchy.courseRegimens.find((c) => c.courseId === fromCourseId) ??
    hierarchy.courseRegimens[0];

  const isSimulatedTargetEnd = toCourseId === 'target_course_end';
  const latestRegimen = hierarchy.courseRegimens[hierarchy.courseRegimens.length - 1];

  const toCourse: CourseRegimenBreakdown = isSimulatedTargetEnd
    ? {
        ...latestRegimen,
        courseId: 'target_course_end',
        courseLabel: `${latestRegimen.courseLabel}结案靶值`,
        stageTitle: '预期满疗程结案达标态',
        status: 'completed',
        statusText: `预期结案靶值（满${latestRegimen.cycleWeeks}周）`,
      }
    : hierarchy.courseRegimens.find((c) => c.courseId === toCourseId) ?? latestRegimen;

  const targetIndicators =
    issueFilter === 'all'
      ? hierarchy.allIndicators
      : hierarchy.allIndicators.filter((i) => i.issueKey === issueFilter);

  const rows: CrossPeriodIndicatorDeltaRow[] = targetIndicators.map((ind) => {
    const fromPt =
      ind.coursePoints.find((p) => p.courseId === fromCourse.courseId) ?? ind.coursePoints[0];
    const toVal = isSimulatedTargetEnd
      ? ind.projectedTarget.value
      : (ind.coursePoints.find((p) => p.courseId === toCourse.courseId) ??
          ind.coursePoints[ind.coursePoints.length - 1]
        ).value;

    const toFormatted = formatNum(toVal, ind.decimals);
    const toIsNormal = toVal >= ind.safeMin && toVal <= ind.safeMax;
    const deltaAbs = roundTo(toVal - fromPt.value, ind.decimals);
    const deltaPercent =
      fromPt.value !== 0 ? roundTo(((toVal - fromPt.value) / fromPt.value) * 100, 1) : 0;

    // For all upper-bounded metabolic/BP/inflammatory metrics, reduction toward safe band is improvement
    const improved = deltaAbs < 0 || (fromPt.isNormal && toIsNormal);
    const newlyNormalized = !fromPt.isNormal && toIsNormal;
    const sign = deltaAbs > 0 ? '+' : '';

    return {
      indicator: ind,
      fromValue: fromPt.value,
      fromFormatted: fromPt.formatted,
      fromIsNormal: fromPt.isNormal,
      toValue: toVal,
      toFormatted,
      toIsNormal,
      deltaAbs,
      deltaFormatted: `${sign}${formatNum(deltaAbs, ind.decimals)}`,
      deltaPercent,
      improved,
      newlyNormalized,
    };
  });

  const fromDrugsText =
    fromCourse.drugItems.length > 0
      ? fromCourse.drugItems.map((d) => d.name.split('（')[0]).join(' + ')
      : '未用处方药';
  const toDrugsText =
    toCourse.drugItems.length > 0
      ? toCourse.drugItems
          .map((d) => `${d.name.split('（')[0]}${d.changeTag ? `[${d.changeTag}]` : ''}`)
          .join(' + ')
      : '零西药维持';
  const toProductsText =
    toCourse.productItems.length > 0
      ? toCourse.productItems.map((p) => p.name).join(' + ')
      : '常规膳食';

  const regimenTransitionSummary = `跨期方案演进：由「${fromCourse.courseLabel}：${fromDrugsText}」演进至「${toCourse.courseLabel}：${toDrugsText} ｜ 联用品名：${toProductsText}」`;

  return {
    fromCourse,
    toCourse,
    isSimulatedTargetEnd,
    spanSummaryLabel: `${fromCourse.courseLabel}（${fromCourse.endDate}） → ${toCourse.courseLabel}（${toCourse.endDate}）`,
    regimenTransitionSummary,
    rows,
    improvedCount: rows.filter((r) => r.deltaAbs < 0).length,
    normalizedCount: rows.filter((r) => r.newlyNormalized).length,
    abnormalAtFromCount: rows.filter((r) => !r.fromIsNormal).length,
  };
}
