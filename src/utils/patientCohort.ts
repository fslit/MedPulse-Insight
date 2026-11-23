import { HealthSeverity, OrganId, TrendDataPoint } from './healthModel';
import {
  CheckupReportBatch,
  ClinicalClosedLoopState,
  LabMetricsSnapshot,
  PROTOCOL_LIBRARY,
  PatientProfile,
  computeBmi,
  createInitialClinicalState,
  deriveClinicalEvaluation,
  getEffectiveLabMetrics,
  validateLabMetricsInput,
  validatePatientProfileInput,
} from './clinicalWorkflow';
import {
  convertDefaultProtocolToManagedTask,
  getDefaultProtocolById,
  matchDefaultProtocolsForPatient,
} from './defaultProtocols';

export type CourseStatus = 'baseline' | 'completed' | 'active';

export type PatientPriorityStatus =
  | 'today_explain'
  | 'in_course'
  | 'achieved'
  | 'new_intake';

export type RosterTimeRangeId = 'all' | '7d' | '30d';

export type RosterDoctorScopeId = 'all' | 'mine';

export type RosterSortId =
  | 'updated_desc'
  | 'updated_asc'
  | 'intake_desc'
  | 'followup_asc';

export interface AttendingDoctorProfile {
  id: string;
  name: string;
  title: string;
  clinicName: string;
  clinicShortName: string;
  clinicAddress: string;
  department: string;
  licenseNo: string;
  clinicRoom: string;
  specialty: string;
  onDutyLabel: string;
}

export const ATTENDING_DOCTORS: ReadonlyArray<AttendingDoctorProfile> = [
  {
    id: 'doc-chen',
    name: '陈景明',
    title: '主任医师',
    clinicName: '如意象·健康4S慢病逆转门诊（静安南京西路旗舰店）',
    clinicShortName: '静安南京西路旗舰门诊',
    clinicAddress: '上海市静安区南京西路 1601 号越洋医疗广场 3F · 203 诊室',
    department: '全科与慢病逆转管理科',
    licenseNo: 'DR-310108',
    clinicRoom: '三维慢病评估 203 诊室',
    specialty: '高血压非药物降阶 · 脂肪肝分期逆转 · 多疗程代谢共管',
    onDutyLabel: '今日专家门诊在岗',
  },
  {
    id: 'doc-shen',
    name: '沈知夏',
    title: '副主任医师',
    clinicName: '如意象·健康4S代谢营养门诊（徐汇衡山路中心店）',
    clinicShortName: '徐汇衡山路中心门诊',
    clinicAddress: '上海市徐汇区衡山路 932 号太平洋健康大厦 5F · 205 诊室',
    department: '全科与慢病逆转管理科',
    licenseNo: 'DR-310216',
    clinicRoom: '代谢与营养干预 205 诊室',
    specialty: '高胆固醇调脂 · 胃肠黏膜修复 · 生活方式医学处方',
    onDutyLabel: '今日联合随访在岗',
  },
  {
    id: 'doc-lu',
    name: '陆怀瑾',
    title: '主任医师',
    clinicName: '如意象·健康4S心脑与微生态门诊（浦东世纪大道店）',
    clinicShortName: '浦东世纪大道门诊',
    clinicAddress: '上海市浦东新区世纪大道 1198 号世纪汇医养中心 6F · 308 诊室',
    department: '老年慢病与微生态医学科',
    licenseNo: 'DR-310329',
    clinicRoom: '微生态与骨代谢 308 诊室',
    specialty: '老年胃肠黏膜修复 · 骨质疏松营养 · 心脑血管共管',
    onDutyLabel: '今日特需门诊在岗',
  },
];

export interface TreatmentCourseRecord {
  id: string;
  /** 0 = 初诊建档基线, 1 = 第1疗程, 2 = 第2疗程, ... */
  courseNo: number;
  courseLabel: string;
  stageTitle: string;
  startDate: string;
  endDate: string;
  cycleWeeks: number;
  elapsedWeeks: number;
  status: CourseStatus;
  adherencePercent: number;
  focusRegimenSummary: string;
  keyPrescriptions: string[];
  doctorCourseNote: string;
  weightKg: number;
  metrics: LabMetricsSnapshot;
}

export interface PatientCohortRecord {
  id: string;
  attendingDoctorId: string;
  priorityStatus: PatientPriorityStatus;
  appointmentSlot?: string;
  chiefTagline: string;
  focusOrgans: OrganId[];
  courses: TreatmentCourseRecord[];
  /** Currently inspected course in the comparison widescreen (defaults to latest active/completed course) */
  activeCourseId: string;
  /** Baseline/previous course ID or 'target_course_end' for current course completion target */
  compareCourseId: string;
  hasNebulaExperienceReport?: boolean;
  clinicalState: ClinicalClosedLoopState;
}

export interface PatientRosterSummary {
  id: string;
  archiveId: string;
  name: string;
  pinyinInitials: string;
  gender: PatientProfile['gender'];
  age: number;
  phone: string;
  attendingDoctorId: string;
  attendingDoctorName: string;
  attendingDoctorTitle: string;
  chiefTagline: string;
  focusOrgans: OrganId[];
  totalCoursesCount: number;
  closedCoursesCount: number;
  healthIssuesCount: number;
  activeCourseLabel: string;
  activeStageTitle: string;
  activeRegimenSummary: string;
  allCoursesRegimenSearchText: string;
  cycleWeeks: number;
  elapsedWeeks: number;
  adherencePercent: number;
  baselineScore: number;
  currentScore: number;
  cumulativeDelta: number;
  prevCourseDelta: number;
  abnormalCount: number;
  unreadFeedbackCount: number;
  primaryMetricDeltaText: string;
  secondaryMetricDeltaText: string;
  overallSeverity: HealthSeverity;
  intakeDate: string;
  nextFollowupDate: string;
  updatedAt: string;
  hasNebulaExperienceReport: boolean;
}

export interface CohortStoreState {
  currentDoctorId: string;
  patients: PatientCohortRecord[];
}

const COHORT_STORAGE_KEY = 'health4s_patient_cohort_courses_v6';

function buildPatient1LinXiao(): PatientCohortRecord {
  const baseClinical = createInitialClinicalState();
  const courses: TreatmentCourseRecord[] = [
    {
      id: 'c0-baseline',
      courseNo: 0,
      courseLabel: '初诊基线',
      stageTitle: '建档全面筛查基线',
      startDate: '2026-06-15',
      endDate: '2026-06-15',
      cycleWeeks: 0,
      elapsedWeeks: 0,
      status: 'baseline',
      adherencePercent: 100,
      focusRegimenSummary: '入组初筛基线（未服药、未启动微生态与营养品干预）',
      keyPrescriptions: ['建立家庭早晚静息血压与空腹体重独立基线台账'],
      doctorCourseNote:
        '初诊检出 4 项健康问题：1级高血压（148/95 mmHg）、轻度脂肪肝（11.2%）、高胆固醇血症（TC 6.2）及胃窦黏膜轻度充血。',
      weightKg: 70.2,
      metrics: {
        systolicBp: 148,
        diastolicBp: 95,
        heartRate: 81,
        fastingGlucose: 5.5,
        totalCholesterol: 6.2,
        ldlCholesterol: 4.0,
        liverFatPercent: 11.2,
        gastricStatus: 'mild_congestion',
      },
    },
    {
      id: 'c1-course1',
      courseNo: 1,
      courseLabel: '第1疗程',
      stageTitle: '稳压护胃与代谢启动期',
      startDate: '2026-06-16',
      endDate: '2026-09-16',
      cycleWeeks: 12,
      elapsedWeeks: 12,
      status: 'completed',
      adherencePercent: 86,
      focusRegimenSummary:
        '药名：苯磺酸氨氯地平片(络活喜) 2.5mg + 多烯磷脂酰胆碱胶囊(易善复)｜品名：太空晶球益生菌 + 优康力',
      keyPrescriptions: [
        '药名：苯磺酸氨氯地平片（络活喜）2.5mg 晨服 + 多烯磷脂酰胆碱胶囊（易善复）2粒×3次/日',
        '品名：太空晶球益生菌（早空腹3条+晚饭后4条）+ 优康力（6勺代晚餐）',
        '生活方式：DASH 低钠限盐膳食（<5g/日）+ 每周 4 次快走有氧',
      ],
      doctorCourseNote:
        '第1疗程 12 周结案复评：体重下降 1.8 kg，肝脂肪率由 11.2% 降至 9.8%，血压降至 145/93 mmHg，进入第 2 疗程叠加护肝三联强化逆转。',
      weightKg: 68.4,
      metrics: {
        systolicBp: 145,
        diastolicBp: 93,
        heartRate: 78,
        fastingGlucose: 5.3,
        totalCholesterol: 6.0,
        ldlCholesterol: 3.8,
        liverFatPercent: 9.8,
        gastricStatus: 'mild_congestion',
      },
    },
    {
      id: 'c2-course2',
      courseNo: 2,
      courseLabel: '第2疗程',
      stageTitle: '肝脂逆转与血管弹性巩固期',
      startDate: '2026-09-17',
      endDate: '2026-12-17',
      cycleWeeks: 12,
      elapsedWeeks: 9,
      status: 'active',
      adherencePercent: 88,
      focusRegimenSummary:
        '药名：苯磺酸氨氯地平片 2.5mg + 辅酶Q10软胶囊｜品名：护肝菌 + 白胶囊 + 黑片 + 优康力',
      keyPrescriptions: [
        '药名：停用易善复，保留苯磺酸氨氯地平片 2.5mg/日 + 辅酶Q10软胶囊 100mg/日',
        '品名：护肝菌（晚饭后6条）+ 白胶囊（空腹4粒）+ 黑片（睡前6片）+ 优康力（6勺代晚餐）',
        '生活方式：DASH 低钠稳压膳食 + 每周 5 次靶心率有氧',
      ],
      doctorCourseNote:
        '第 2 疗程第 9 周阶段复测：血压进一步回落至 142/92 mmHg（较初诊累计 -6/-3），肝脂肪率降至 8.6%（累计 -2.6%），距 <5.0% 逆转线仅差最后冲刺。',
      weightKg: 66.5,
      metrics: {
        systolicBp: 142,
        diastolicBp: 92,
        heartRate: 76,
        fastingGlucose: 5.2,
        totalCholesterol: 5.8,
        ldlCholesterol: 3.7,
        liverFatPercent: 8.6,
        gastricStatus: 'mild_congestion',
      },
    },
  ];

  const liverDefaultTask = convertDefaultProtocolToManagedTask(
    getDefaultProtocolById('def-liver')!
  );
  const vascularDefaultTask = convertDefaultProtocolToManagedTask(
    getDefaultProtocolById('def-vascular')!
  );

  return {
    id: 'pat-linxiao',
    attendingDoctorId: 'doc-chen',
    priorityStatus: 'today_explain',
    appointmentSlot: '今日 14:30 复盘讲解',
    chiefTagline: '临界血压 · 轻度脂肪肝 · 高胆固醇',
    focusOrgans: ['heart', 'liver', 'vascular'],
    courses,
    activeCourseId: 'c2-course2',
    compareCourseId: 'c0-baseline',
    clinicalState: {
      ...baseClinical,
      patientProfile: {
        ...baseClinical.patientProfile,
        updatedAt: '2026-11-19 14:30',
      },
      draftOrPublishedTasks: [
        {
          ...liverDefaultTask,
          id: 'lx-def-liver',
          completedByPatient: false,
        },
        {
          ...vascularDefaultTask,
          id: 'lx-def-vascular',
          completedByPatient: false,
        },
        ...baseClinical.draftOrPublishedTasks.slice(0, 2),
      ],
    },
  };
}

function buildPatient2SuWanQing(): PatientCohortRecord {
  const reports: CheckupReportBatch[] = [
    {
      id: 'swq-rep-1',
      reportDate: '2026-05-20',
      monthLabel: '初诊5月',
      institution: '健康4S 数字化医学影像检验中心',
      packageName: '都市白领消化与血脂专项筛查',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-05-20 15:30',
      doctorVerificationNote: '初诊检出总胆固醇 6.3 mmol/L、LDL-C 4.1 mmol/L，电子胃镜示胃窦黏膜充血明显。',
      weightKg: 59.8,
      metrics: {
        systolicBp: 128,
        diastolicBp: 84,
        heartRate: 80,
        fastingGlucose: 5.1,
        totalCholesterol: 6.3,
        ldlCholesterol: 4.1,
        liverFatPercent: 6.4,
        gastricStatus: 'mild_congestion',
      },
    },
    {
      id: 'swq-rep-2',
      reportDate: '2026-08-22',
      monthLabel: '一疗程8月',
      institution: '健康4S 慢病管理随访门诊',
      packageName: '第1疗程12周血脂与消化复评',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-08-22 10:40',
      doctorVerificationNote: '第1疗程结案总胆固醇降至 5.6 mmol/L，肝脂肪率降至 5.3%，餐后反酸胀气明显减轻。',
      weightKg: 58.2,
      metrics: {
        systolicBp: 124,
        diastolicBp: 80,
        heartRate: 75,
        fastingGlucose: 5.0,
        totalCholesterol: 5.6,
        ldlCholesterol: 3.5,
        liverFatPercent: 5.3,
        gastricStatus: 'mild_congestion',
      },
    },
    {
      id: 'swq-rep-3',
      reportDate: '2026-11-18',
      monthLabel: '二疗程11月',
      institution: '健康4S 数字化医学影像检验中心',
      packageName: '第2疗程血脂达标与胃黏膜复评',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-11-18 16:05',
      doctorVerificationNote: '总胆固醇已降至 5.1 mmol/L 达标绿区，肝脂肪率 4.5% 完全逆转，胃黏膜状态恢复良好！',
      weightKg: 56.8,
      metrics: {
        systolicBp: 120,
        diastolicBp: 77,
        heartRate: 72,
        fastingGlucose: 4.9,
        totalCholesterol: 5.1,
        ldlCholesterol: 3.1,
        liverFatPercent: 4.5,
        gastricStatus: 'normal',
      },
    },
  ];

  const courses: TreatmentCourseRecord[] = [
    {
      id: 'swq-c0',
      courseNo: 0,
      courseLabel: '初诊基线',
      stageTitle: '血脂升高与胃窦充血初筛基线',
      startDate: '2026-05-20',
      endDate: '2026-05-20',
      cycleWeeks: 0,
      elapsedWeeks: 0,
      status: 'baseline',
      adherencePercent: 100,
      focusRegimenSummary: '入组前高频外卖咖啡、晚睡伴餐后上腹饱胀',
      keyPrescriptions: ['停用空腹冰美式，建立三餐节律与血脂基线档案'],
      doctorCourseNote: '高胆固醇血症（TC 6.3 / LDL-C 4.1）伴轻度肝脂沉积（6.4%）及胃窦黏膜充血。',
      weightKg: 59.8,
      metrics: reports[0].metrics,
    },
    {
      id: 'swq-c1',
      courseNo: 1,
      courseLabel: '第1疗程',
      stageTitle: '胃窦黏膜修复与调脂启动期',
      startDate: '2026-05-21',
      endDate: '2026-08-22',
      cycleWeeks: 12,
      elapsedWeeks: 12,
      status: 'completed',
      adherencePercent: 91,
      focusRegimenSummary:
        '药名：瑞巴派特片(膜固思达) + 铝碳酸镁咀嚼片(达喜)｜品名：太空晶球益生菌 + 优康力',
      keyPrescriptions: [
        '药名：瑞巴派特片（膜固思达）0.1g×3次/日 + 铝碳酸镁咀嚼片（按需护膜）',
        '品名：太空晶球益生菌（早空腹3条+晚餐后4条）+ 优康力（6勺+300ml温水代晚餐）',
      ],
      doctorCourseNote: '第1疗程结案：反酸消失停用达喜，TC 由 6.3 降至 5.6 mmol/L，进入第 2 疗程冲刺血脂全面转绿与睡眠节律巩固。',
      weightKg: 58.2,
      metrics: reports[1].metrics,
    },
    {
      id: 'swq-c2',
      courseNo: 2,
      courseLabel: '第2疗程',
      stageTitle: '血脂全面转绿与睡眠节律结案巩固期',
      startDate: '2026-08-23',
      endDate: '2026-11-22',
      cycleWeeks: 12,
      elapsedWeeks: 12,
      status: 'completed',
      adherencePercent: 94,
      focusRegimenSummary:
        '药名：胃药已停用 · 仅保留高纯度ω-3鱼油软胶囊｜品名：优康力 + 开心季菌 + 正固素 + 太空晶球益生菌',
      keyPrescriptions: [
        '药名：瑞巴派特片结案停药；保留高纯度ω-3鱼油乙酯软胶囊 1000mg 随餐调脂',
        '品名：优康力（6勺代晚餐）+ 开心季菌（睡前3条）+ 正固素（晚饭后2条）+ 太空晶球益生菌（维持量）',
      ],
      doctorCourseNote: '第 2 疗程圆满结案：TC 5.1、LDL-C 3.1、肝脂 4.5% 与胃镜黏膜全部恢复正常绿区！',
      weightKg: 56.8,
      metrics: reports[2].metrics,
    },
  ];

  return {
    id: 'pat-suwanqing',
    attendingDoctorId: 'doc-shen',
    priorityStatus: 'today_explain',
    appointmentSlot: '今日 15:15 结案讲解',
    chiefTagline: '高胆固醇调脂 · 胃黏膜修复 · 睡眠节律',
    focusOrgans: ['vascular', 'stomach', 'liver'],
    courses,
    activeCourseId: 'swq-c2',
    compareCourseId: 'swq-c0',
    clinicalState: {
      activeRole: 'doctor',
      currentStep: 2,
      patientProfile: {
        archiveId: 'H4S-20261118-021',
        name: '苏婉清',
        gender: '女',
        age: 35,
        heightCm: 164,
        weightKg: 56.8,
        phone: '139-0026-5180',
        medicalHistory: '互联网产品工作节奏快，既往总胆固醇偏高伴胃窦黏膜轻度充血',
        allergyHistory: '青霉素皮试可疑阳性，无食物过敏',
        updatedAt: '2026-11-18 16:10',
      },
      reports,
      activeReportId: 'swq-rep-3',
      draftOrPublishedTasks: [
        {
          id: 'swq-t1',
          templateId: 'tpl-omega-lipid',
          title: PROTOCOL_LIBRARY[2].title,
          category: 'lipid',
          relatedOrgan: 'vascular',
          targetTag: PROTOCOL_LIBRARY[2].targetTag,
          frequency: PROTOCOL_LIBRARY[2].defaultFrequency,
          shortDesc: PROTOCOL_LIBRARY[2].shortDesc,
          summary: PROTOCOL_LIBRARY[2].summary,
          advice: PROTOCOL_LIBRARY[2].advice,
          scoreGain: 2,
          weeklyChecklist: PROTOCOL_LIBRARY[2].weeklyChecklist,
          completedByPatient: true,
          completedAt: '2026-11-18 09:00',
        },
        {
          id: 'swq-t2',
          templateId: 'tpl-gastric-care',
          title: PROTOCOL_LIBRARY[3].title,
          category: 'digestive',
          relatedOrgan: 'stomach',
          targetTag: PROTOCOL_LIBRARY[3].targetTag,
          frequency: PROTOCOL_LIBRARY[3].defaultFrequency,
          shortDesc: PROTOCOL_LIBRARY[3].shortDesc,
          summary: PROTOCOL_LIBRARY[3].summary,
          advice: PROTOCOL_LIBRARY[3].advice,
          scoreGain: 1,
          weeklyChecklist: PROTOCOL_LIBRARY[3].weeklyChecklist,
          completedByPatient: true,
          completedAt: '2026-11-18 09:05',
        },
        {
          id: 'swq-t3',
          templateId: 'tpl-sleep-autonomic',
          title: PROTOCOL_LIBRARY[4].title,
          category: 'sleep',
          relatedOrgan: 'brain',
          targetTag: PROTOCOL_LIBRARY[4].targetTag,
          frequency: PROTOCOL_LIBRARY[4].defaultFrequency,
          shortDesc: PROTOCOL_LIBRARY[4].shortDesc,
          summary: PROTOCOL_LIBRARY[4].summary,
          advice: PROTOCOL_LIBRARY[4].advice,
          scoreGain: 2,
          weeklyChecklist: PROTOCOL_LIBRARY[4].weeklyChecklist,
          completedByPatient: false,
        },
      ],
      publication: {
        status: 'published',
        cycleWeeks: 12,
        nextFollowupDate: '2027-05-18',
        followupCadenceLabel: '第2疗程达标结案 · 转半年期常规随访',
        doctorMessage: '苏女士您好，经过两个疗程 23 周的规律调脂与护胃管理，您的总胆固醇与肝脂均已达标逆转！',
        publishedBy: '陈主任 · 全科与慢病管理科',
        publishedAt: '2026-11-18 16:30',
        focusedOrgans: ['vascular', 'stomach', 'liver'],
      },
      symptomFeedbacks: [],
      followupRechecks: [],
    },
  };
}

function buildPatient3ChenJianGuo(): PatientCohortRecord {
  const reports: CheckupReportBatch[] = [
    {
      id: 'cjg-rep-0',
      reportDate: '2026-03-10',
      monthLabel: '初诊3月',
      institution: '协和合作慢病筛查门诊',
      packageName: '中老年心脑血管与代谢综合评估',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-03-10 17:00',
      doctorVerificationNote: '初诊血压 156/98 mmHg，中度脂肪肝（MRI-PDFF 14.6%），BMI 27.5，启动三疗程阶梯式强化管理。',
      weightKg: 84.2,
      metrics: {
        systolicBp: 156,
        diastolicBp: 98,
        heartRate: 84,
        fastingGlucose: 6.3,
        totalCholesterol: 6.5,
        ldlCholesterol: 4.3,
        liverFatPercent: 14.6,
        gastricStatus: 'mild_congestion',
      },
    },
    {
      id: 'cjg-rep-1',
      reportDate: '2026-06-12',
      monthLabel: '一疗程6月',
      institution: '健康4S 慢病管理随访门诊',
      packageName: '第1疗程血压平稳与减重初评',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-06-12 11:20',
      doctorVerificationNote: '第1疗程减重 2.9 kg，血压由 156/98 回落至 146/92 mmHg，肝脂肪率降至 12.1%。',
      weightKg: 81.3,
      metrics: {
        systolicBp: 146,
        diastolicBp: 92,
        heartRate: 79,
        fastingGlucose: 5.9,
        totalCholesterol: 6.1,
        ldlCholesterol: 3.9,
        liverFatPercent: 12.1,
        gastricStatus: 'mild_congestion',
      },
    },
    {
      id: 'cjg-rep-2',
      reportDate: '2026-09-15',
      monthLabel: '二疗程9月',
      institution: '健康4S 慢病管理随访门诊',
      packageName: '第2疗程中度转轻度脂肪肝复评',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-09-15 14:50',
      doctorVerificationNote: '第2疗程再减重 2.5 kg，肝脂肪率跨入 9.8%（由中度转为轻度），空腹血糖回归 5.6 正常区间。',
      weightKg: 78.8,
      metrics: {
        systolicBp: 140,
        diastolicBp: 89,
        heartRate: 76,
        fastingGlucose: 5.6,
        totalCholesterol: 5.7,
        ldlCholesterol: 3.6,
        liverFatPercent: 9.8,
        gastricStatus: 'normal',
      },
    },
    {
      id: 'cjg-rep-3',
      reportDate: '2026-11-15',
      monthLabel: '三疗程11月',
      institution: '健康4S 数字化医学影像检验中心',
      packageName: '第3疗程中期心肝双轴深度评估',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-11-15 10:15',
      doctorVerificationNote: '第3疗程第8周：血压降至 136/86 mmHg（较初诊累计下降 20/12 mmHg！），肝脂降至 8.2%，改善显著。',
      weightKg: 77.1,
      metrics: {
        systolicBp: 136,
        diastolicBp: 86,
        heartRate: 74,
        fastingGlucose: 5.5,
        totalCholesterol: 5.5,
        ldlCholesterol: 3.5,
        liverFatPercent: 8.2,
        gastricStatus: 'normal',
      },
    },
  ];

  const courses: TreatmentCourseRecord[] = [
    {
      id: 'cjg-c0',
      courseNo: 0,
      courseLabel: '初诊基线',
      stageTitle: '二级临界高血压合并中度脂肪肝基线',
      startDate: '2026-03-10',
      endDate: '2026-03-10',
      cycleWeeks: 0,
      elapsedWeeks: 0,
      status: 'baseline',
      adherencePercent: 100,
      focusRegimenSummary: '入组前长期商务应酬高钠高脂饮食、缺乏有氧锻炼',
      keyPrescriptions: ['24小时动态血压评估与肝脏定量超声建档'],
      doctorCourseNote: '血压 156/98、肝脂 14.6%、空腹血糖 6.3 受损，制定三阶段 36 周系统逆转路线图。',
      weightKg: 84.2,
      metrics: reports[0].metrics,
    },
    {
      id: 'cjg-c1',
      courseNo: 1,
      courseLabel: '第1疗程',
      stageTitle: '二级高血压降压联用与护肝启动期',
      startDate: '2026-03-11',
      endDate: '2026-06-12',
      cycleWeeks: 12,
      elapsedWeeks: 12,
      status: 'completed',
      adherencePercent: 82,
      focusRegimenSummary:
        '药名：苯磺酸氨氯地平片(络活喜) 5mg + 瑞舒伐他汀钙片(可定) 5mg + 易善复｜品名：护肝菌 + 优康力',
      keyPrescriptions: [
        '药名：苯磺酸氨氯地平片（络活喜）5mg 晨服 + 瑞舒伐他汀钙片（可定）5mg 睡前 + 多烯磷脂酰胆碱胶囊（易善复）',
        '品名：护肝菌（晚餐后6条）+ 优康力（6勺+300ml温水代晚餐）',
        '生活方式：严格戒酒 + DASH 低钠限盐 + 低冲击功率骑行',
      ],
      doctorCourseNote: '第1疗程结案：收缩压下降 10 mmHg（156→146），肝脂降至 12.1%，体重减轻 2.9 kg。',
      weightKg: 81.3,
      metrics: reports[1].metrics,
    },
    {
      id: 'cjg-c2',
      courseNo: 2,
      courseLabel: '第2疗程',
      stageTitle: '中度脂肪肝降级与糖脂同调结案期',
      startDate: '2026-06-13',
      endDate: '2026-09-15',
      cycleWeeks: 12,
      elapsedWeeks: 12,
      status: 'completed',
      adherencePercent: 85,
      focusRegimenSummary:
        '药名：氨氯地平维持 5mg + 易善复停药 + 可定 5mg｜品名：护肝菌 + 白胶囊 + 黑片 + 太空晶球益生菌 + 优康力',
      keyPrescriptions: [
        '药名：停用易善复；保留苯磺酸氨氯地平片 5mg + 瑞舒伐他汀钙片 5mg',
        '品名：护肝菌（晚6条）+ 白胶囊（早空腹4粒）+ 黑片（睡前6片）+ 太空晶球益生菌（餐前2条×3次控糖护肠）+ 优康力',
      ],
      doctorCourseNote: '第2疗程结案：肝脂由 12.1% 降至 9.8% 脱离中度区间，空腹血糖由 6.3 回归 5.6 mmol/L 正常绿区！',
      weightKg: 78.8,
      metrics: reports[2].metrics,
    },
    {
      id: 'cjg-c3',
      courseNo: 3,
      courseLabel: '第3疗程',
      stageTitle: '西药减量降阶与心肝双轴冲刺期',
      startDate: '2026-09-16',
      endDate: '2026-12-16',
      cycleWeeks: 12,
      elapsedWeeks: 8,
      status: 'active',
      adherencePercent: 84,
      focusRegimenSummary:
        '药名：苯磺酸氨氯地平片减半至 2.5mg + 辅酶Q10软胶囊｜品名：优康力 + 护肝菌 + 白胶囊 + 黑片',
      keyPrescriptions: [
        '药名：苯磺酸氨氯地平片（络活喜）由 5mg 减半至 2.5mg/日；他汀改为隔日巩固 + 辅酶Q10软胶囊 100mg',
        '品名：优康力（6勺代晚餐保护血管内皮）+ 护肝菌 + 白胶囊 + 黑片（第2周期冲刺）',
      ],
      doctorCourseNote: '第3疗程第8周：氨氯地平减半后血压仍稳降至 136/86 mmHg（累计 -20/-12 mmHg），肝脂降至 8.2%！',
      weightKg: 77.1,
      metrics: reports[3].metrics,
    },
  ];

  return {
    id: 'pat-chenjianguo',
    attendingDoctorId: 'doc-chen',
    priorityStatus: 'in_course',
    appointmentSlot: '第3疗程 · 第8周执行中',
    chiefTagline: '高血压降阶 · 中度脂肪肝逆转 · 减重控糖',
    focusOrgans: ['heart', 'liver', 'vascular'],
    courses,
    activeCourseId: 'cjg-c3',
    compareCourseId: 'cjg-c0',
    clinicalState: {
      activeRole: 'doctor',
      currentStep: 6,
      patientProfile: {
        archiveId: 'H4S-20261115-009',
        name: '陈建国',
        gender: '男',
        age: 52,
        heightCm: 175,
        weightKg: 77.1,
        phone: '136-0088-3912',
        medicalHistory: '既往商务应酬较多，初诊检出高血压合并中度脂肪肝，已完成 2 个完整疗程',
        allergyHistory: '无已知药物过敏史',
        updatedAt: '2026-11-19 19:40',
      },
      reports,
      activeReportId: 'cjg-rep-3',
      draftOrPublishedTasks: [
        {
          id: 'cjg-t1',
          templateId: 'tpl-dash-bp',
          title: PROTOCOL_LIBRARY[0].title,
          category: 'cardio',
          relatedOrgan: 'heart',
          targetTag: PROTOCOL_LIBRARY[0].targetTag,
          frequency: PROTOCOL_LIBRARY[0].defaultFrequency,
          shortDesc: PROTOCOL_LIBRARY[0].shortDesc,
          summary: PROTOCOL_LIBRARY[0].summary,
          advice: PROTOCOL_LIBRARY[0].advice,
          scoreGain: 3,
          weeklyChecklist: PROTOCOL_LIBRARY[0].weeklyChecklist,
          completedByPatient: true,
          completedAt: '2026-11-17 08:15',
        },
        {
          id: 'cjg-t2',
          templateId: 'tpl-aerobic-liver',
          title: PROTOCOL_LIBRARY[1].title,
          category: 'liver',
          relatedOrgan: 'liver',
          targetTag: PROTOCOL_LIBRARY[1].targetTag,
          frequency: PROTOCOL_LIBRARY[1].defaultFrequency,
          shortDesc: PROTOCOL_LIBRARY[1].shortDesc,
          summary: PROTOCOL_LIBRARY[1].summary,
          advice: PROTOCOL_LIBRARY[1].advice,
          scoreGain: 3,
          weeklyChecklist: PROTOCOL_LIBRARY[1].weeklyChecklist,
          completedByPatient: false,
        },
      ],
      publication: {
        status: 'published',
        cycleWeeks: 12,
        nextFollowupDate: '2026-12-16',
        followupCadenceLabel: '第3疗程结案门诊复查（满12周）',
        doctorMessage: '陈先生，您前两个疗程累计减重超 7 公斤、收缩压降了 20 mmHg，是诊室标杆案例，第 3 疗程继续稳扎稳打！',
        publishedBy: '陈主任 · 全科与慢病管理科',
        publishedAt: '2026-09-16 15:00',
        focusedOrgans: ['heart', 'liver', 'vascular'],
      },
      symptomFeedbacks: [
        {
          id: 'cjg-fb-1',
          submittedAt: '2026-11-19 20:15',
          symptomCategory: '晚间快走后小腿轻微酸胀',
          severityLevel: 2,
          description: '本周把傍晚快走配速提高后，睡前小腿肚轻微酸胀，晨起自测血压 133/84 mmHg 很稳。',
          selfMeasuredBp: '133 / 84 mmHg',
          status: 'unread',
        },
      ],
      followupRechecks: [],
    },
  };
}

function buildPatient4ZhouYaQin(): PatientCohortRecord {
  const reports: CheckupReportBatch[] = [
    {
      id: 'zyq-rep-0',
      reportDate: '2026-05-08',
      monthLabel: '初诊5月',
      institution: '健康4S 数字化医学影像检验中心',
      packageName: '女性内分泌与肝脏代谢筛查包',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-05-08 14:20',
      doctorVerificationNote: '初诊肝脂肪含量 8.4%，血压临界 134/86 mmHg，总胆固醇 5.6 mmol/L。',
      weightKg: 63.6,
      metrics: {
        systolicBp: 134,
        diastolicBp: 86,
        heartRate: 76,
        fastingGlucose: 5.4,
        totalCholesterol: 5.6,
        ldlCholesterol: 3.5,
        liverFatPercent: 8.4,
        gastricStatus: 'normal',
      },
    },
    {
      id: 'zyq-rep-1',
      reportDate: '2026-08-10',
      monthLabel: '一疗程8月',
      institution: '健康4S 慢病管理随访门诊',
      packageName: '第1疗程代谢复评检验单',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-08-10 10:00',
      doctorVerificationNote: '第1疗程结案：肝脂肪率降至 5.8%，血压降至 126/81 mmHg 回归正常。',
      weightKg: 60.8,
      metrics: {
        systolicBp: 126,
        diastolicBp: 81,
        heartRate: 72,
        fastingGlucose: 5.1,
        totalCholesterol: 5.1,
        ldlCholesterol: 3.1,
        liverFatPercent: 5.8,
        gastricStatus: 'normal',
      },
    },
    {
      id: 'zyq-rep-2',
      reportDate: '2026-11-10',
      monthLabel: '二疗程11月',
      institution: '健康4S 数字化医学影像检验中心',
      packageName: '第2疗程全项逆转结案体检包',
      verificationStatus: 'verified',
      verifiedBy: '陈主任 · 全科与慢病管理科',
      verifiedAt: '2026-11-10 15:10',
      doctorVerificationNote: '两疗程圆满结案！肝脂肪率降至 4.3%（<5.0% 完全逆转），血压 122/78、TC 4.8 全项优良！',
      weightKg: 58.6,
      metrics: {
        systolicBp: 122,
        diastolicBp: 78,
        heartRate: 69,
        fastingGlucose: 4.9,
        totalCholesterol: 4.8,
        ldlCholesterol: 2.8,
        liverFatPercent: 4.3,
        gastricStatus: 'normal',
      },
    },
  ];

  const courses: TreatmentCourseRecord[] = [
    {
      id: 'zyq-c0',
      courseNo: 0,
      courseLabel: '初诊基线',
      stageTitle: '轻度脂肪肝伴临界血压基线',
      startDate: '2026-05-08',
      endDate: '2026-05-08',
      cycleWeeks: 0,
      elapsedWeeks: 0,
      status: 'baseline',
      adherencePercent: 100,
      focusRegimenSummary: '入组基线（BMI 24.5 超重临界，肝脂 8.4%）',
      keyPrescriptions: ['体成分与肝脏受控衰减参数定量建档'],
      doctorCourseNote: '典型代谢早期可逆人群，预计 2 个疗程可实现全指标归绿。',
      weightKg: 63.6,
      metrics: reports[0].metrics,
    },
    {
      id: 'zyq-c1',
      courseNo: 1,
      courseLabel: '第1疗程',
      stageTitle: '肝脂消退与临界血压归绿期',
      startDate: '2026-05-09',
      endDate: '2026-08-10',
      cycleWeeks: 12,
      elapsedWeeks: 12,
      status: 'completed',
      adherencePercent: 95,
      focusRegimenSummary:
        '药名：免降压西药 · 短期联用多烯磷脂酰胆碱胶囊(易善复)｜品名：护肝菌 + 白胶囊 + 黑片 + 优康力',
      keyPrescriptions: [
        '药名：免启动降压西药；短期联用多烯磷脂酰胆碱胶囊（易善复）护膜抗炎',
        '品名：护肝菌（晚餐后6条）+ 白胶囊（早空腹4粒）+ 黑片（睡前6片）+ 优康力（6勺代晚餐）',
      ],
      doctorCourseNote: '第1疗程结案：血压（126/81）与总胆固醇（5.1）率先归绿，停用易善复，肝脂肪率降至 5.8%。',
      weightKg: 60.8,
      metrics: reports[1].metrics,
    },
    {
      id: 'zyq-c2',
      courseNo: 2,
      courseLabel: '第2疗程',
      stageTitle: '脂肪肝完全逆转结案巩固期',
      startDate: '2026-08-11',
      endDate: '2026-11-10',
      cycleWeeks: 12,
      elapsedWeeks: 12,
      status: 'completed',
      adherencePercent: 96,
      focusRegimenSummary:
        '药名：全程零西药维持（天然水飞蓟宾巩固）｜品名：护肝菌 + 白胶囊 + 黑片 + 美龄鹿',
      keyPrescriptions: [
        '药名：全程零处方降压调脂西药维持，肝酶与代谢全项正常',
        '品名：护肝菌 + 白胶囊 + 黑片（完成第2个90天周期）+ 美龄鹿（1条+500ml温水提升线粒体代谢）',
      ],
      doctorCourseNote: '两疗程 24 周全部指标 100% 恢复理想绿区（肝脂 4.3% 完全脱帽），结案转年度随访！',
      weightKg: 58.6,
      metrics: reports[2].metrics,
    },
  ];

  return {
    id: 'pat-zhouyaqin',
    attendingDoctorId: 'doc-chen',
    priorityStatus: 'achieved',
    appointmentSlot: '已达标结案 · 年度随访',
    chiefTagline: '脂肪肝完全逆转 · 全项达标结案',
    focusOrgans: ['liver', 'heart'],
    courses,
    activeCourseId: 'zyq-c2',
    compareCourseId: 'zyq-c0',
    clinicalState: {
      activeRole: 'doctor',
      currentStep: 2,
      patientProfile: {
        archiveId: 'H4S-20261110-044',
        name: '周雅琴',
        gender: '女',
        age: 46,
        heightCm: 161,
        weightKg: 58.6,
        phone: '137-0052-9018',
        medicalHistory: '已完成 2 个疗程非药物生活方式干预，轻度脂肪肝与临界血压均已完全逆转',
        allergyHistory: '无已知过敏史',
        updatedAt: '2026-11-10 15:30',
      },
      reports,
      activeReportId: 'zyq-rep-2',
      draftOrPublishedTasks: [
        {
          id: 'zyq-t1',
          templateId: 'tpl-aerobic-liver',
          title: PROTOCOL_LIBRARY[1].title,
          category: 'liver',
          relatedOrgan: 'liver',
          targetTag: '维持期每周 3–4 次有氧防反弹',
          frequency: '每周 4 次 × 35 分钟',
          shortDesc: PROTOCOL_LIBRARY[1].shortDesc,
          summary: PROTOCOL_LIBRARY[1].summary,
          advice: PROTOCOL_LIBRARY[1].advice,
          scoreGain: 3,
          weeklyChecklist: PROTOCOL_LIBRARY[1].weeklyChecklist,
          completedByPatient: true,
          completedAt: '2026-11-09 18:30',
        },
      ],
      publication: {
        status: 'published',
        cycleWeeks: 24,
        nextFollowupDate: '2027-05-10',
        followupCadenceLabel: '结案维持期（每半年常规体检复评）',
        doctorMessage: '周女士恭喜您！两个疗程圆满达成全部逆转目标，目前八大系统评分均在优良绿区！',
        publishedBy: '陈主任 · 全科与慢病管理科',
        publishedAt: '2026-11-10 16:00',
        focusedOrgans: ['liver', 'heart'],
      },
      symptomFeedbacks: [],
      followupRechecks: [],
    },
  };
}

function buildPatient5ZhaoMingXuan(): PatientCohortRecord {
  const reports: CheckupReportBatch[] = [
    {
      id: 'zmx-rep-0',
      reportDate: '2026-11-20',
      monthLabel: '初诊11月',
      institution: '健康4S 数字化医学影像检验中心',
      packageName: '青年高压伏案心肝早筛体检包',
      verificationStatus: 'pending',
      doctorVerificationNote: '今日新导入初诊体检单，待诊室面对面讲解并签发第 1 疗程干预处方。',
      weightKg: 78.5,
      metrics: {
        systolicBp: 138,
        diastolicBp: 89,
        heartRate: 83,
        fastingGlucose: 5.4,
        totalCholesterol: 5.9,
        ldlCholesterol: 3.8,
        liverFatPercent: 10.4,
        gastricStatus: 'mild_congestion',
      },
    },
  ];

  const courses: TreatmentCourseRecord[] = [
    {
      id: 'zmx-c0',
      courseNo: 0,
      courseLabel: '初诊基线',
      stageTitle: '入组初筛基线（待签发首疗程）',
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      cycleWeeks: 0,
      elapsedWeeks: 0,
      status: 'baseline',
      adherencePercent: 100,
      focusRegimenSummary: '今日刚完成入组体检导入，待核对并开启第 1 疗程',
      keyPrescriptions: ['待医生讲解初诊报告并定制首疗程 12 周处方'],
      doctorCourseNote: '31 岁软件工程师，长期熬夜外卖，血压临界偏高（138/89）伴肝脂肪率 10.4%、高胆固醇 5.9。',
      weightKg: 78.5,
      metrics: reports[0].metrics,
    },
    {
      id: 'zmx-c1',
      courseNo: 1,
      courseLabel: '第1疗程',
      stageTitle: '首疗程减重控脂与作息重建期（第1周）',
      startDate: '2026-11-20',
      endDate: '2027-02-12',
      cycleWeeks: 12,
      elapsedWeeks: 1,
      status: 'active',
      adherencePercent: 60,
      focusRegimenSummary:
        '药名：水飞蓟宾胶囊(水林佳) + 瑞巴派特片｜品名：护肝菌 + 白胶囊 + 黑片 + 优康力 + 开心季菌',
      keyPrescriptions: [
        '药名：水飞蓟宾胶囊（水林佳）70mg×3次/日护肝 + 瑞巴派特片 0.1g 护胃黏膜（免启动降压西药）',
        '品名：护肝菌（晚6条）+ 白胶囊（早4粒）+ 黑片（睡前6片）+ 优康力（代晚餐）+ 开心季菌（睡前3条助眠）',
      ],
      doctorCourseNote: '建议以「对比结案目标」及同方案康复标杆案例向患者直观演示 90天/12周 预期逆转轨迹。',
      weightKg: 78.5,
      metrics: reports[0].metrics,
    },
  ];

  const zmxLiverDefault = convertDefaultProtocolToManagedTask(
    getDefaultProtocolById('def-liver')!
  );

  return {
    id: 'pat-zhaomingxuan',
    attendingDoctorId: 'doc-chen',
    priorityStatus: 'new_intake',
    appointmentSlot: '今日 16:00 首诊建档讲解',
    chiefTagline: '青年熬夜代谢综合征早期 · 待开启首疗程',
    focusOrgans: ['liver', 'vascular', 'heart'],
    courses,
    activeCourseId: 'zmx-c1',
    compareCourseId: 'target_course_end',
    clinicalState: {
      activeRole: 'doctor',
      currentStep: 3,
      patientProfile: {
        archiveId: 'H4S-20261120-062',
        name: '赵明轩',
        gender: '男',
        age: 31,
        heightCm: 178,
        weightKg: 78.5,
        phone: '135-0091-7743',
        medicalHistory: '软件研发长期熬夜久坐，今日首次建档导入体检报告',
        allergyHistory: '海鲜虾蟹轻度荨麻疹史（调脂宜选植物亚麻籽/深海鱼油提纯制剂）',
        updatedAt: '2026-11-20 11:05',
      },
      reports,
      activeReportId: 'zmx-rep-0',
      draftOrPublishedTasks: [
        {
          ...zmxLiverDefault,
          id: 'zmx-def-liver',
          completedByPatient: false,
        },
        {
          id: 'zmx-t1',
          templateId: 'tpl-aerobic-liver',
          title: PROTOCOL_LIBRARY[1].title,
          category: 'liver',
          relatedOrgan: 'liver',
          targetTag: PROTOCOL_LIBRARY[1].targetTag,
          frequency: PROTOCOL_LIBRARY[1].defaultFrequency,
          shortDesc: PROTOCOL_LIBRARY[1].shortDesc,
          summary: PROTOCOL_LIBRARY[1].summary,
          advice: PROTOCOL_LIBRARY[1].advice,
          scoreGain: 3,
          weeklyChecklist: PROTOCOL_LIBRARY[1].weeklyChecklist,
          completedByPatient: false,
        },
      ],
      publication: {
        status: 'draft',
        cycleWeeks: 12,
        nextFollowupDate: '2027-02-12',
        followupCadenceLabel: '首疗程 12 周门诊复查（第 4 周线上随访）',
        doctorMessage: '明轩您好，您非常年轻，轻度脂肪肝与临界血压在首疗程 12 周内完全可以通过运动和饮食逆转！',
        publishedBy: '陈主任 · 全科与慢病管理科',
        publishedAt: '2026-11-20 11:10',
        focusedOrgans: ['liver', 'vascular', 'heart'],
      },
      symptomFeedbacks: [],
      followupRechecks: [],
    },
  };
}

function buildPatient6ChenXiaoZhen(): PatientCohortRecord {
  const reports: CheckupReportBatch[] = [
    {
      id: 'cxz-rep-0',
      reportDate: '2026-08-23',
      monthLabel: '初诊8月(含YSY体验报告)',
      institution: '云尚云时代 NebulaByte YSY 联合健康4S检验中心',
      packageName: '60页全身细胞能量D值检测 + 老年消化骨代谢基线包',
      verificationStatus: 'verified',
      verifiedBy: '陈景明 主任医师 · 全科与慢病逆转管理科',
      verifiedAt: '2026-08-23 15:20',
      doctorVerificationNote:
        '已导入陈小真 60 页 NebulaByte YSY 体验报告（胃溃疡 D=11.038 E7、幽门 D=2.811 重、总胆管 D=3.169 重、脊椎软骨退变 D=11.434 E7），并与门诊胃窦内镜、骨密度双轨互证。',
      weightKg: 58.6,
      metrics: {
        systolicBp: 146,
        diastolicBp: 88,
        heartRate: 79,
        fastingGlucose: 5.9,
        totalCholesterol: 5.8,
        ldlCholesterol: 3.6,
        liverFatPercent: 7.8,
        gastricStatus: 'mild_congestion',
      },
    },
    {
      id: 'cxz-rep-1',
      reportDate: '2026-11-18',
      monthLabel: '第2疗程复测',
      institution: '云尚云时代 NebulaByte YSY 联合健康4S检验中心',
      packageName: '第2疗程细胞能量D值跨期复测 + 代谢评估',
      verificationStatus: 'verified',
      verifiedBy: '陈景明 主任医师 · 全科与慢病逆转管理科',
      verifiedAt: '2026-11-20 10:45',
      doctorVerificationNote:
        '跨2个疗程复测：胃前后壁6级黑色方块(■)清零，慢性胃溃疡 D值由 11.038 降至 2.180，幽门螺旋杆菌信号由 2.883 降至 0.340，血压稳降至 132/80 mmHg。',
      weightKg: 57.2,
      metrics: {
        systolicBp: 132,
        diastolicBp: 80,
        heartRate: 72,
        fastingGlucose: 5.2,
        totalCholesterol: 5.0,
        ldlCholesterol: 3.0,
        liverFatPercent: 5.1,
        gastricStatus: 'normal',
      },
    },
  ];

  const courses: TreatmentCourseRecord[] = [
    {
      id: 'cxz-c0',
      courseNo: 0,
      courseLabel: '初诊基线',
      stageTitle: 'NebulaByte YSY 60页体验报告导入基线',
      startDate: '2026-08-23',
      endDate: '2026-08-23',
      cycleWeeks: 0,
      elapsedWeeks: 0,
      status: 'baseline',
      adherencePercent: 100,
      focusRegimenSummary: '导入 2026/08/23 NebulaByte YSY 60页原件建立细胞能量与临床检验双基线',
      keyPrescriptions: ['49幅器官能量切面去重归并建档 + C13呼气与胃窦黏膜基线核对'],
      doctorCourseNote:
        '74岁女性，体验报告提示胃溃疡(D=11.038 E7)、肠炎(10.620 E7)、幽门/总胆管/心肌重度负荷及脊柱软骨退变(11.434 E7)，合并1级高血压(146/88)。',
      weightKg: 58.6,
      metrics: reports[0].metrics,
    },
    {
      id: 'cxz-c1',
      courseNo: 1,
      courseLabel: '第1疗程',
      stageTitle: '幽门胃肠微生态修复与软骨护心期',
      startDate: '2026-08-24',
      endDate: '2026-10-07',
      cycleWeeks: 6,
      elapsedWeeks: 6,
      status: 'completed',
      adherencePercent: 92,
      focusRegimenSummary:
        '药名：瑞巴派特片(膜固思达) + 达喜 + 辅酶Q10 + 骨化三醇｜品名：太空晶球益生菌 + 优康力 + 马鹿骨',
      keyPrescriptions: [
        '药名：瑞巴派特片（膜固思达）0.1g×3次/日 + 铝碳酸镁咀嚼片（达喜）按需 + 辅酶Q10 + 骨化三醇胶丸',
        '品名：太空晶球益生菌（早空腹7条+晚饭后7条）+ 优康力（6勺代晚餐）+ 马鹿骨（随餐3粒×3次/天）',
        'YSY低D值特配食疗：蒸黑枣(D=0.003) + 南瓜小米燕麦粥(D=0.010/0.017) + 熟香蕉润肠',
      ],
      doctorCourseNote:
        '第1疗程45天结案复测：胃溃疡 D值由 11.038 大幅回落至 4.620，反酸胃胀基本消失，血压回落至 138/84 mmHg。',
      weightKg: 57.8,
      metrics: {
        systolicBp: 138,
        diastolicBp: 84,
        heartRate: 75,
        fastingGlucose: 5.5,
        totalCholesterol: 5.4,
        ldlCholesterol: 3.3,
        liverFatPercent: 6.4,
        gastricStatus: 'mild_congestion',
      },
    },
    {
      id: 'cxz-c2',
      courseNo: 2,
      courseLabel: '第2疗程',
      stageTitle: '停抑酸药·胆系疏泄与骨神经巩固期',
      startDate: '2026-10-08',
      endDate: '2026-11-22',
      cycleWeeks: 6,
      elapsedWeeks: 5,
      status: 'active',
      adherencePercent: 94,
      focusRegimenSummary:
        '药名：达喜停药·瑞巴派特减半 + 辅酶Q10 + 骨化三醇｜品名：护肝菌 + 太空晶球益生菌 + 优康力 + 马鹿骨',
      keyPrescriptions: [
        '药名：铝碳酸镁停药、瑞巴派特片减半巩固 + 辅酶Q10软胶囊 + 骨化三醇胶丸（罗盖全）0.25μg/日',
        '品名：护肝菌（晚餐后6条疏胆总管）+ 太空晶球益生菌（餐前2条巩固）+ 优康力 + 马鹿骨（3粒×2次/天）',
      ],
      doctorCourseNote:
        '第2疗程第5周复测：胃前后壁6级黑色方块(■)全部清零，总胆管负荷由重度(3.169)降至中度(1.420)，总胆固醇降至 5.0 mmol/L 达标。',
      weightKg: 57.2,
      metrics: reports[1].metrics,
    },
  ];

  const stomachTask = convertDefaultProtocolToManagedTask(
    getDefaultProtocolById('def-gastric-mucosa')!
  );
  const boneTask = convertDefaultProtocolToManagedTask(
    getDefaultProtocolById('def-bone-joint')!
  );
  const liverTask = convertDefaultProtocolToManagedTask(
    getDefaultProtocolById('def-liver')!
  );

  return {
    id: 'pat-chenxiaozhen',
    attendingDoctorId: 'doc-chen',
    priorityStatus: 'today_explain',
    appointmentSlot: '今日 10:45 体验报告与第2疗程跨期复盘',
    chiefTagline: '胃窦幽门修复 · 胆系疏泄 · 老年软骨骨密（含60页体验报告）',
    focusOrgans: ['stomach', 'bone', 'liver', 'heart'],
    hasNebulaExperienceReport: true,
    courses,
    activeCourseId: 'cxz-c2',
    compareCourseId: 'cxz-c0',
    clinicalState: {
      activeRole: 'doctor',
      currentStep: 4,
      patientProfile: {
        archiveId: 'H4S-20260823-018',
        name: '陈小真',
        gender: '女',
        age: 74,
        heightCm: 158,
        weightKg: 57.2,
        phone: '137-0062-8823',
        medicalHistory:
          '2026/08/23 导入 NebulaByte YSY 60页全身细胞能量检测报告：慢性胃窦炎伴幽门负荷、胆汁排空迟缓、老年骨质疏松与1级临界高血压',
        allergyHistory: '生冷辛辣易诱发胃脘隐痛，无药物过敏史',
        updatedAt: '2026-11-20 10:45',
      },
      reports,
      activeReportId: 'cxz-rep-1',
      draftOrPublishedTasks: [
        { ...stomachTask, id: 'cxz-def-stomach', completedByPatient: true },
        { ...boneTask, id: 'cxz-def-bone', completedByPatient: true },
        { ...liverTask, id: 'cxz-def-liver', completedByPatient: false },
      ],
      publication: {
        status: 'published',
        cycleWeeks: 6,
        nextFollowupDate: '2026-11-28',
        followupCadenceLabel: '第2疗程结案细胞能量D值与门诊胃肠复评',
        doctorMessage:
          '陈阿姨您好，对比8月23日初检的体验报告，您胃壁和胆囊区的黑色高风险能量点已大幅消退，继续保持温热南瓜燕麦食谱与益生菌冲服！',
        publishedBy: '陈景明 主任医师 · 全科与慢病逆转管理科',
        publishedAt: '2026-11-20 10:45',
        focusedOrgans: ['stomach', 'bone', 'liver', 'heart'],
      },
      symptomFeedbacks: [],
      followupRechecks: [],
    },
  };
}

export function getAttendingDoctorById(doctorId?: string): AttendingDoctorProfile {
  return (
    ATTENDING_DOCTORS.find((d) => d.id === doctorId) ?? ATTENDING_DOCTORS[0]
  );
}

export function createInitialCohortStore(): CohortStoreState {
  return {
    currentDoctorId: 'doc-chen',
    patients: [
      buildPatient5ZhaoMingXuan(),
      buildPatient6ChenXiaoZhen(),
      buildPatient3ChenJianGuo(),
      buildPatient1LinXiao(),
      buildPatient2SuWanQing(),
      buildPatient4ZhouYaQin(),
    ],
  };
}

export function loadCohortStore(): CohortStoreState {
  if (typeof window === 'undefined') return createInitialCohortStore();
  try {
    const raw = window.localStorage.getItem(COHORT_STORAGE_KEY);
    if (!raw) return createInitialCohortStore();
    const parsed = JSON.parse(raw) as Partial<CohortStoreState>;
    if (!Array.isArray(parsed.patients) || parsed.patients.length === 0) {
      return createInitialCohortStore();
    }
    const normalizedPatients = parsed.patients.map((p) => ({
      ...p,
      attendingDoctorId: p.attendingDoctorId || 'doc-chen',
    }));
    return {
      currentDoctorId: parsed.currentDoctorId || 'doc-chen',
      patients: normalizedPatients,
    };
  } catch {
    return createInitialCohortStore();
  }
}

export function saveCohortStore(store: CohortStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COHORT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function getPriorityStatusLabel(status: PatientPriorityStatus): string {
  switch (status) {
    case 'today_explain':
      return '今日待讲解';
    case 'in_course':
      return '疗程执行中';
    case 'achieved':
      return '复查已达标';
    case 'new_intake':
      return '首诊待定方';
  }
}

/**
 * Synchronizes edits made inside `clinicalState` (profile edits, new imported report,
 * doctor verification, patient check-ins, or follow-up recheck) back onto the patient's active course.
 */
export function syncClinicalStateIntoPatient(
  patient: PatientCohortRecord,
  nextClinicalState: ClinicalClosedLoopState
): PatientCohortRecord {
  const effectiveLab = getEffectiveLabMetrics(nextClinicalState);
  const totalTasks = nextClinicalState.draftOrPublishedTasks.length;
  const completedTasks = nextClinicalState.draftOrPublishedTasks.filter(
    (t) => t.completedByPatient
  ).length;

  // Locate the latest course (highest courseNo) to keep live sync with latest checkup/recheck
  const maxCourseNo = Math.max(...patient.courses.map((c) => c.courseNo));
  const updatedCourses = patient.courses.map((course) => {
    if (course.courseNo !== maxCourseNo || course.courseNo === 0) {
      return course;
    }
    const adherenceBoost =
      totalTasks > 0
        ? Math.min(99, Math.round((course.adherencePercent * 0.7) + ((completedTasks / totalTasks) * 100 * 0.3)))
        : course.adherencePercent;

    return {
      ...course,
      cycleWeeks: nextClinicalState.publication.cycleWeeks || course.cycleWeeks,
      adherencePercent: completedTasks > 0 ? Math.max(course.adherencePercent, adherenceBoost) : course.adherencePercent,
      keyPrescriptions:
        totalTasks > 0
          ? nextClinicalState.draftOrPublishedTasks.map((t) => t.title)
          : course.keyPrescriptions,
      weightKg: effectiveLab.effectiveWeightKg,
      metrics: effectiveLab.metrics,
    };
  });

  // Auto-upgrade priorityStatus if all major metrics normalize
  const evalLatest = deriveClinicalEvaluation(
    nextClinicalState.patientProfile,
    effectiveLab.metrics,
    effectiveLab.effectiveWeightKg,
    nextClinicalState.draftOrPublishedTasks
  );
  const nextPriority: PatientPriorityStatus =
    evalLatest.riskPrompts.length === 0 && patient.priorityStatus !== 'new_intake'
      ? 'achieved'
      : patient.priorityStatus === 'new_intake' && nextClinicalState.publication.status === 'published'
      ? 'in_course'
      : patient.priorityStatus;

  return {
    ...patient,
    priorityStatus: nextPriority,
    courses: updatedCourses,
    clinicalState: nextClinicalState,
  };
}

/**
 * Starts a new Treatment Course (`开启下一疗程`) for a patient:
 * marks the current active course as `'completed'` and appends `第 N+1 疗程` as `'active'`.
 */
export function startNextTreatmentCourse(
  patient: PatientCohortRecord,
  input: {
    stageTitle: string;
    cycleWeeks: number;
    focusRegimenSummary: string;
    doctorCourseNote: string;
  }
): { updatedPatient: PatientCohortRecord; error: string | null } {
  if (!input.stageTitle.trim()) {
    return { updatedPatient: patient, error: '请填写新疗程阶段名称（如：巩固维持期）' };
  }
  if (!Number.isFinite(input.cycleWeeks) || input.cycleWeeks < 2 || input.cycleWeeks > 52) {
    return { updatedPatient: patient, error: '疗程周期需在 2–52 周合理范围内' };
  }

  const latestCourse = patient.courses[patient.courses.length - 1];
  const nextNo = latestCourse.courseNo + 1;
  const today = '2026-11-20';
  const endObj = new Date('2026-11-20T00:00:00Z');
  endObj.setUTCDate(endObj.getUTCDate() + input.cycleWeeks * 7);
  const endDate = endObj.toISOString().slice(0, 10);

  const prevActiveId = latestCourse.id;
  const newCourseId = `${patient.id}-c${nextNo}-${Date.now()}`;

  const closedCourses = patient.courses.map((c) =>
    c.status === 'active'
      ? { ...c, status: 'completed' as const, elapsedWeeks: c.cycleWeeks }
      : c
  );

  const newCourse: TreatmentCourseRecord = {
    id: newCourseId,
    courseNo: nextNo,
    courseLabel: `第${nextNo}疗程`,
    stageTitle: input.stageTitle.trim(),
    startDate: today,
    endDate,
    cycleWeeks: input.cycleWeeks,
    elapsedWeeks: 1,
    status: 'active',
    adherencePercent: 90,
    focusRegimenSummary:
      input.focusRegimenSummary.trim() ||
      '延续个性化非药物饮食运动处方并动态跟踪核心指标',
    keyPrescriptions:
      patient.clinicalState.draftOrPublishedTasks.length > 0
        ? patient.clinicalState.draftOrPublishedTasks.map((t) => t.title)
        : latestCourse.keyPrescriptions,
    doctorCourseNote:
      input.doctorCourseNote.trim() ||
      `基于${latestCourse.courseLabel}阶段成果开启第${nextNo}疗程强化管理。`,
    weightKg: latestCourse.weightKg,
    metrics: { ...latestCourse.metrics },
  };

  return {
    error: null,
    updatedPatient: {
      ...patient,
      priorityStatus: 'in_course',
      courses: [...closedCourses, newCourse],
      activeCourseId: newCourseId,
      compareCourseId: prevActiveId,
      clinicalState: {
        ...patient.clinicalState,
        publication: {
          ...patient.clinicalState.publication,
          cycleWeeks: input.cycleWeeks,
          nextFollowupDate: endDate,
        },
      },
    },
  };
}

/**
 * Validates and creates a brand-new patient in the clinic roster with Course 0 (Baseline) + Course 1 (Active).
 */
export function createNewPatientInCohort(input: {
  name: string;
  gender: PatientProfile['gender'];
  age: number;
  heightCm: number;
  weightKg: number;
  phone: string;
  chiefTagline: string;
  stageTitle: string;
  cycleWeeks: number;
  systolicBp: number;
  diastolicBp: number;
  totalCholesterol: number;
  liverFatPercent: number;
  fastingGlucose: number;
  attendingDoctorId?: string;
}): { record: PatientCohortRecord | null; error: string | null } {
  const profileErr = validatePatientProfileInput({
    name: input.name,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
  });
  if (profileErr) return { record: null, error: profileErr };

  const labErr = validateLabMetricsInput({
    reportDate: '2026-11-20',
    institution: '健康4S 数字化医学影像检验中心',
    systolicBp: input.systolicBp,
    diastolicBp: input.diastolicBp,
    totalCholesterol: input.totalCholesterol,
    liverFatPercent: input.liverFatPercent,
  });
  if (labErr) return { record: null, error: labErr };

  const doc = getAttendingDoctorById(input.attendingDoctorId);
  const docSignOff = `${doc.name} ${doc.title} · ${doc.department}`;

  const idSuffix = String(Math.floor(100 + Math.random() * 899));
  const archiveId = `H4S-20261120-${idSuffix}`;
  const patId = `pat-${Date.now()}`;

  const initMetrics: LabMetricsSnapshot = {
    systolicBp: Math.round(input.systolicBp),
    diastolicBp: Math.round(input.diastolicBp),
    heartRate: 76,
    fastingGlucose: Number(input.fastingGlucose.toFixed(1)),
    totalCholesterol: Number(input.totalCholesterol.toFixed(1)),
    ldlCholesterol: Number(Math.max(1.9, input.totalCholesterol * 0.63).toFixed(1)),
    liverFatPercent: Number(input.liverFatPercent.toFixed(1)),
    gastricStatus: 'normal',
  };

  const focusOrgans: OrganId[] = [];
  if (initMetrics.systolicBp >= 130 || initMetrics.diastolicBp >= 85) focusOrgans.push('heart');
  if (initMetrics.liverFatPercent >= 5.0) focusOrgans.push('liver');
  if (initMetrics.totalCholesterol >= 5.2) focusOrgans.push('vascular');
  if (focusOrgans.length === 0) focusOrgans.push('heart', 'liver');

  const cycleWeeks = Math.min(24, Math.max(2, Math.round(input.cycleWeeks || 12)));
  const endObj = new Date('2026-11-20T00:00:00Z');
  endObj.setUTCDate(endObj.getUTCDate() + cycleWeeks * 7);
  const endDate = endObj.toISOString().slice(0, 10);

  const reportId = `${patId}-rep-0`;
  const c0Id = `${patId}-c0`;
  const c1Id = `${patId}-c1`;

  const tagline =
    input.chiefTagline.trim() ||
    (focusOrgans.includes('liver') && focusOrgans.includes('heart')
      ? '血压与肝脏代谢首诊管理'
      : '个体化全科健康管理');

  const autoMatchedDefaults = matchDefaultProtocolsForPatient(initMetrics, tagline);
  const primaryDefaultTask = autoMatchedDefaults[0]
    ? convertDefaultProtocolToManagedTask(autoMatchedDefaults[0].protocol)
    : null;

  const record: PatientCohortRecord = {
    id: patId,
    attendingDoctorId: doc.id,
    priorityStatus: 'today_explain',
    appointmentSlot: '今日新建首诊讲解',
    chiefTagline: tagline,
    focusOrgans,
    activeCourseId: c1Id,
    compareCourseId: 'target_course_end',
    courses: [
      {
        id: c0Id,
        courseNo: 0,
        courseLabel: '初诊基线',
        stageTitle: '入组首诊体检基线',
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        cycleWeeks: 0,
        elapsedWeeks: 0,
        status: 'baseline',
        adherencePercent: 100,
        focusRegimenSummary: '新入组首诊建档基线数据',
        keyPrescriptions: ['首诊三维体检数据建模与风险分层'],
        doctorCourseNote: '今日新建患者档案并导入基线检验指标。',
        weightKg: input.weightKg,
        metrics: initMetrics,
      },
      {
        id: c1Id,
        courseNo: 1,
        courseLabel: '第1疗程',
        stageTitle: input.stageTitle.trim() || '首疗程系统默认恢复与生活方式干预期',
        startDate: '2026-11-20',
        endDate,
        cycleWeeks,
        elapsedWeeks: 1,
        status: 'active',
        adherencePercent: 100,
        focusRegimenSummary: primaryDefaultTask
          ? `${primaryDefaultTask.title} + DASH 稳压控脂膳食`
          : 'DASH 稳压控脂膳食 + 靶向有氧运动处方',
        keyPrescriptions: primaryDefaultTask
          ? [primaryDefaultTask.title, PROTOCOL_LIBRARY[0].title]
          : [PROTOCOL_LIBRARY[0].title, PROTOCOL_LIBRARY[1].title],
        doctorCourseNote: `首疗程（${cycleWeeks}周）已启动，已自动匹配受损器官系统默认治疗方案。`,
        weightKg: input.weightKg,
        metrics: initMetrics,
      },
    ],
    clinicalState: {
      activeRole: 'doctor',
      currentStep: 2,
      patientProfile: {
        archiveId,
        name: input.name.trim(),
        gender: input.gender,
        age: Math.round(input.age),
        heightCm: Math.round(input.heightCm),
        weightKg: Number(input.weightKg.toFixed(1)),
        phone: input.phone.trim() || '138-0000-0000',
        medicalHistory: tagline,
        allergyHistory: '无已知药物及食物过敏史',
        updatedAt: '2026-11-20 14:00',
      },
      reports: [
        {
          id: reportId,
          reportDate: '2026-11-20',
          monthLabel: '初诊11月',
          institution: '健康4S 数字化医学影像检验中心',
          packageName: '入组全身体检与代谢定量筛查',
          verificationStatus: 'verified',
          verifiedBy: docSignOff,
          verifiedAt: '2026-11-20 21:00',
          doctorVerificationNote: '已完成首诊建档与基线指标核对。',
          weightKg: Number(input.weightKg.toFixed(1)),
          metrics: initMetrics,
        },
      ],
      activeReportId: reportId,
      draftOrPublishedTasks: [
        ...(primaryDefaultTask
          ? [
              {
                ...primaryDefaultTask,
                id: `${patId}-def-0`,
                completedByPatient: false,
              },
            ]
          : []),
        {
          id: `${patId}-t1`,
          templateId: 'tpl-dash-bp',
          title: PROTOCOL_LIBRARY[0].title,
          category: 'cardio',
          relatedOrgan: 'heart',
          targetTag: PROTOCOL_LIBRARY[0].targetTag,
          frequency: PROTOCOL_LIBRARY[0].defaultFrequency,
          shortDesc: PROTOCOL_LIBRARY[0].shortDesc,
          summary: PROTOCOL_LIBRARY[0].summary,
          advice: PROTOCOL_LIBRARY[0].advice,
          scoreGain: 3,
          weeklyChecklist: PROTOCOL_LIBRARY[0].weeklyChecklist,
          completedByPatient: false,
        },
      ],
      publication: {
        status: 'published',
        cycleWeeks,
        nextFollowupDate: endDate,
        followupCadenceLabel: `第1疗程（${cycleWeeks}周）闭环随访`,
        doctorMessage: `${input.name.trim()}您好，已为您建立三维健康档案并开启第 1 疗程个性化管理方案。`,
        publishedBy: docSignOff,
        publishedAt: '2026-11-20 21:05',
        focusedOrgans: focusOrgans,
      },
      symptomFeedbacks: [],
      followupRechecks: [],
    },
  };

  return { record, error: null };
}

const PINYIN_CHAR_MAP: Record<string, string> = {
  林: 'l',
  晓: 'x',
  苏: 's',
  婉: 'w',
  清: 'q',
  陈: 'c',
  建: 'j',
  国: 'g',
  周: 'z',
  雅: 'y',
  琴: 'q',
  赵: 'z',
  明: 'm',
  轩: 'x',
  陆: 'l',
  思: 's',
  远: 'y',
  王: 'w',
  静: 'j',
  怡: 'y',
  李: 'l',
  张: 'z',
  刘: 'l',
  杨: 'y',
  黄: 'h',
  吴: 'w',
  徐: 'x',
  孙: 's',
  胡: 'h',
  朱: 'z',
  高: 'g',
  何: 'h',
  郭: 'g',
  马: 'm',
  罗: 'l',
  沈: 's',
  知: 'z',
  夏: 'x',
  小: 'x',
  真: 'z',
};

export function derivePinyinInitials(name: string): string {
  return Array.from(name.trim())
    .map((ch) => PINYIN_CHAR_MAP[ch] ?? ch.toLowerCase())
    .join('');
}

function resolveLatestPatientTimestamp(patient: PatientCohortRecord): string {
  const candidates: string[] = [patient.clinicalState.patientProfile.updatedAt];
  if (patient.clinicalState.publication.publishedAt) {
    candidates.push(patient.clinicalState.publication.publishedAt);
  }
  for (const r of patient.clinicalState.reports) {
    if (r.verifiedAt) candidates.push(r.verifiedAt);
    else if (r.reportDate) candidates.push(`${r.reportDate} 09:00`);
  }
  for (const fb of patient.clinicalState.symptomFeedbacks) {
    if (fb.submittedAt) candidates.push(fb.submittedAt);
  }
  for (const rc of patient.clinicalState.followupRechecks) {
    if (rc.recheckDate) candidates.push(`${rc.recheckDate} 16:00`);
  }
  return candidates.filter(Boolean).sort((a, b) => b.localeCompare(a))[0] ?? '2026-11-20 09:00';
}

/**
 * Computes a deterministic, real-time roster summary row for a patient across their treatment courses.
 */
export function summarizePatientForRoster(patient: PatientCohortRecord): PatientRosterSummary {
  const profile = patient.clinicalState.patientProfile;
  const doc = getAttendingDoctorById(patient.attendingDoctorId);
  const baselineCourse = patient.courses[0];
  const latestCourse = patient.courses[patient.courses.length - 1];
  const prevCourse =
    patient.courses.length >= 2
      ? patient.courses[patient.courses.length - 2]
      : baselineCourse;

  const baseEval = deriveClinicalEvaluation(
    profile,
    baselineCourse.metrics,
    baselineCourse.weightKg,
    []
  );
  const curEval = deriveClinicalEvaluation(
    profile,
    latestCourse.metrics,
    latestCourse.weightKg,
    patient.clinicalState.draftOrPublishedTasks
  );
  const prevEval = deriveClinicalEvaluation(
    profile,
    prevCourse.metrics,
    prevCourse.weightKg,
    []
  );

  const unreadFeedbackCount = patient.clinicalState.symptomFeedbacks.filter(
    (fb) => fb.status === 'unread'
  ).length;

  // Count abnormal out of the 7 core biomarkers
  const curBmi = computeBmi(latestCourse.weightKg, profile.heightCm);
  const m = latestCourse.metrics;
  let abnormalCount = 0;
  if (m.systolicBp >= 130) abnormalCount += 1;
  if (m.diastolicBp >= 85) abnormalCount += 1;
  if (m.liverFatPercent >= 5.0) abnormalCount += 1;
  if (m.totalCholesterol >= 5.2) abnormalCount += 1;
  if (m.ldlCholesterol >= 3.4) abnormalCount += 1;
  if (m.fastingGlucose >= 6.1) abnormalCount += 1;
  if (curBmi >= 24.0) abnormalCount += 1;

  const overallSeverity: HealthSeverity =
    curEval.alertCount > 0 ? 'alert' : abnormalCount > 0 ? 'caution' : 'normal';

  const bM = baselineCourse.metrics;
  const primaryMetricDeltaText =
    bM.systolicBp !== m.systolicBp
      ? `血压 ${bM.systolicBp}/${bM.diastolicBp} → ${m.systolicBp}/${m.diastolicBp}`
      : `血压 ${m.systolicBp}/${m.diastolicBp} mmHg`;

  const secondaryMetricDeltaText =
    Math.abs(bM.liverFatPercent - m.liverFatPercent) >= 0.2
      ? `肝脂 ${bM.liverFatPercent.toFixed(1)}% → ${m.liverFatPercent.toFixed(1)}%`
      : `TC ${bM.totalCholesterol.toFixed(1)} → ${m.totalCholesterol.toFixed(1)}`;

  const totalInterventionCourses = patient.courses.filter((c) => c.courseNo > 0).length;
  const closedCoursesCount = patient.courses.filter(
    (c) => c.courseNo > 0 && c.status === 'completed'
  ).length;

  let healthIssuesCount = 0;
  if (bM.systolicBp >= 130 || bM.diastolicBp >= 84 || patient.focusOrgans.includes('heart')) {
    healthIssuesCount += 1;
  }
  if (bM.liverFatPercent >= 5.0 || patient.focusOrgans.includes('liver')) {
    healthIssuesCount += 1;
  }
  if (
    bM.totalCholesterol >= 5.2 ||
    bM.ldlCholesterol >= 3.4 ||
    patient.focusOrgans.includes('vascular')
  ) {
    healthIssuesCount += 1;
  }
  if (
    bM.gastricStatus === 'mild_congestion' ||
    bM.fastingGlucose >= 5.8 ||
    patient.focusOrgans.includes('stomach')
  ) {
    healthIssuesCount += 1;
  }
  healthIssuesCount = Math.max(1, healthIssuesCount);

  const allCoursesRegimenSearchText = patient.courses
    .map((c) => `${c.focusRegimenSummary} ${c.keyPrescriptions.join(' ')}`)
    .join(' ');

  return {
    id: patient.id,
    archiveId: profile.archiveId,
    name: profile.name,
    pinyinInitials: derivePinyinInitials(profile.name),
    gender: profile.gender,
    age: profile.age,
    phone: profile.phone,
    attendingDoctorId: doc.id,
    attendingDoctorName: doc.name,
    attendingDoctorTitle: doc.title,
    chiefTagline: patient.chiefTagline,
    focusOrgans: patient.focusOrgans,
    totalCoursesCount: totalInterventionCourses,
    closedCoursesCount,
    healthIssuesCount,
    activeCourseLabel: latestCourse.courseLabel,
    activeStageTitle: latestCourse.stageTitle,
    activeRegimenSummary: latestCourse.focusRegimenSummary,
    allCoursesRegimenSearchText,
    cycleWeeks: latestCourse.cycleWeeks,
    elapsedWeeks: latestCourse.elapsedWeeks,
    adherencePercent: latestCourse.adherencePercent,
    baselineScore: baseEval.healthScore,
    currentScore: curEval.healthScore,
    cumulativeDelta: curEval.healthScore - baseEval.healthScore,
    prevCourseDelta: curEval.healthScore - prevEval.healthScore,
    abnormalCount,
    unreadFeedbackCount,
    primaryMetricDeltaText,
    secondaryMetricDeltaText,
    overallSeverity,
    intakeDate: baselineCourse.startDate,
    nextFollowupDate: patient.clinicalState.publication.nextFollowupDate || latestCourse.endDate,
    updatedAt: resolveLatestPatientTimestamp(patient),
    hasNebulaExperienceReport: Boolean(patient.hasNebulaExperienceReport),
  };
}

export interface RosterQueryOptions {
  searchQuery?: string;
  sortBy?: RosterSortId;
  timeRange?: RosterTimeRangeId;
  doctorScope?: RosterDoctorScopeId;
  currentDoctorId?: string;
  referenceDateStr?: string;
}

export function filterAndSortPatientRoster(
  summaries: ReadonlyArray<PatientRosterSummary>,
  options: RosterQueryOptions = {}
): PatientRosterSummary[] {
  const {
    searchQuery = '',
    sortBy = 'updated_desc',
    timeRange = 'all',
    doctorScope = 'all',
    currentDoctorId = 'doc-chen',
    referenceDateStr = '2026-11-20',
  } = options;

  const q = searchQuery.trim().toLowerCase();
  const cleanPhoneQ = q.replace(/-/g, '');
  const refMs = Date.parse(`${referenceDateStr}T23:59:59Z`);

  const filtered = summaries.filter((item) => {
    if (doctorScope === 'mine' && item.attendingDoctorId !== currentDoctorId) {
      return false;
    }

    if (timeRange !== 'all' && Number.isFinite(refMs)) {
      const itemDatePart = item.updatedAt.slice(0, 10);
      const itemMs = Date.parse(`${itemDatePart}T12:00:00Z`);
      if (Number.isFinite(itemMs)) {
        const diffDays = (refMs - itemMs) / (1000 * 60 * 60 * 24);
        if (timeRange === '7d' && diffDays > 7) return false;
        if (timeRange === '30d' && diffDays > 30) return false;
      }
    }

    if (!q) return true;

    const organKeywords = item.focusOrgans
      .map((org) =>
        org === 'heart'
          ? '心脏 心血管 血压'
          : org === 'liver'
          ? '肝脏 脂肪肝 肝脂'
          : org === 'vascular'
          ? '血管 血脂 胆固醇'
          : org === 'stomach'
          ? '胃 消化 胃窦 胃黏膜'
          : ''
      )
      .join(' ');

    const phoneClean = item.phone.replace(/-/g, '').toLowerCase();

    const nebulaKeywords = item.hasNebulaExperienceReport
      ? '体验报告 nebulabyte ysy 细胞能量 d值 60页 马鹿骨 骨质疏松 幽门'
      : '';

    return (
      item.name.toLowerCase().includes(q) ||
      item.pinyinInitials.includes(q) ||
      item.archiveId.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      (cleanPhoneQ.length >= 2 && phoneClean.includes(cleanPhoneQ)) ||
      item.chiefTagline.toLowerCase().includes(q) ||
      item.activeCourseLabel.toLowerCase().includes(q) ||
      item.activeStageTitle.toLowerCase().includes(q) ||
      item.activeRegimenSummary.toLowerCase().includes(q) ||
      item.allCoursesRegimenSearchText.toLowerCase().includes(q) ||
      item.attendingDoctorName.toLowerCase().includes(q) ||
      organKeywords.includes(q) ||
      nebulaKeywords.includes(q)
    );
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'updated_asc') {
      return a.updatedAt.localeCompare(b.updatedAt);
    }
    if (sortBy === 'intake_desc') {
      const intakeCmp = b.intakeDate.localeCompare(a.intakeDate);
      return intakeCmp !== 0 ? intakeCmp : b.updatedAt.localeCompare(a.updatedAt);
    }
    if (sortBy === 'followup_asc') {
      const nextCmp = a.nextFollowupDate.localeCompare(b.nextFollowupDate);
      return nextCmp !== 0 ? nextCmp : b.updatedAt.localeCompare(a.updatedAt);
    }
    // Default: 'updated_desc' (strictly newest timestamp first)
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/**
 * Builds longitudinal course-by-course TrendDataPoint series (including liverFatPercent on each course)
 * so the widescreen trajectory chart displays clear treatment-course milestones!
 */
export interface CourseTrendPoint extends TrendDataPoint {
  courseId: string;
  courseLabel: string;
  stageTitle: string;
  liverFat: number;
  adherencePercent: number;
  isProjected?: boolean;
}

export function buildCourseTrendSeries(
  patient: PatientCohortRecord,
  includeTargetNode = true
): CourseTrendPoint[] {
  const profile = patient.clinicalState.patientProfile;
  const rows: CourseTrendPoint[] = patient.courses.map((c) => {
    const ev = deriveClinicalEvaluation(profile, c.metrics, c.weightKg, []);
    return {
      courseId: c.id,
      courseLabel: c.courseLabel,
      stageTitle: c.stageTitle,
      month: c.courseNo === 0 ? '初诊基线' : `${c.courseLabel}${c.status === 'active' ? '(当前)' : '(结案)'}`,
      systolicBp: c.metrics.systolicBp,
      diastolicBp: c.metrics.diastolicBp,
      cholesterol: c.metrics.totalCholesterol,
      weightKg: c.weightKg,
      healthScore: ev.healthScore,
      liverFat: c.metrics.liverFatPercent,
      adherencePercent: c.adherencePercent,
      isProjected: false,
    };
  });

  if (includeTargetNode && rows.length > 0) {
    const last = rows[rows.length - 1];
    const heightM = Math.max(0.5, profile.heightCm / 100);
    const idealWeight = Number(Math.min(last.weightKg, 22.2 * heightM * heightM).toFixed(1));
    rows.push({
      courseId: 'target_course_end',
      courseLabel: '疗程目标',
      stageTitle: '本疗程结案理想靶值',
      month: '结案目标',
      systolicBp: Math.min(last.systolicBp, 126),
      diastolicBp: Math.min(last.diastolicBp, 80),
      cholesterol: Math.min(last.cholesterol, 4.9),
      weightKg: idealWeight,
      healthScore: Math.min(96, Math.max(92, last.healthScore + 5)),
      liverFat: Math.min(last.liverFat, 4.6),
      adherencePercent: 95,
      isProjected: true,
    });
  }

  return rows;
}
