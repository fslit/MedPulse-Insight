import {
  HealthSeverity,
  ORGAN_ORDER,
  ORGAN_RECORDS,
  OrganId,
  OrganRecord,
  RiskPromptItem,
  TREND_6M_DATA,
  TrendDataPoint,
  VitalSignItem,
} from './healthModel';

export type UserRole = 'patient' | 'doctor';

export type WorkflowStepId = 1 | 2 | 3 | 4 | 5 | 6;

export interface PatientProfile {
  archiveId: string;
  name: string;
  gender: '通用' | '女' | '男';
  age: number;
  heightCm: number;
  weightKg: number;
  phone: string;
  medicalHistory: string;
  allergyHistory: string;
  updatedAt: string;
}

export interface LabMetricsSnapshot {
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  fastingGlucose: number;
  totalCholesterol: number;
  ldlCholesterol: number;
  liverFatPercent: number;
  gastricStatus: 'normal' | 'mild_congestion';
}

export interface CheckupReportBatch {
  id: string;
  reportDate: string;
  monthLabel: string;
  institution: string;
  packageName: string;
  verificationStatus: 'pending' | 'verified';
  verifiedBy?: string;
  verifiedAt?: string;
  doctorVerificationNote: string;
  weightKg?: number;
  metrics: LabMetricsSnapshot;
}

export type ProtocolCategory =
  | 'cardio'
  | 'liver'
  | 'lipid'
  | 'digestive'
  | 'sleep'
  | 'followup';

export interface ProtocolTemplate {
  id: string;
  title: string;
  category: ProtocolCategory;
  categoryLabel: string;
  relatedOrgan: OrganId;
  targetTag: string;
  defaultFrequency: string;
  shortDesc: string;
  summary: string;
  advice: string;
  scoreGain: number;
  weeklyChecklist: string[];
}

export interface ManagedTaskItem {
  id: string;
  templateId?: string;
  title: string;
  category: ProtocolCategory;
  relatedOrgan: OrganId;
  targetTag: string;
  frequency: string;
  shortDesc: string;
  summary: string;
  advice: string;
  scoreGain: number;
  weeklyChecklist: string[];
  completedByPatient: boolean;
  completedAt?: string;
}

export interface PlanPublicationInfo {
  status: 'draft' | 'published';
  cycleWeeks: number;
  nextFollowupDate: string;
  followupCadenceLabel: string;
  doctorMessage: string;
  publishedBy: string;
  publishedAt: string;
  focusedOrgans: OrganId[];
}

export interface SymptomFeedbackItem {
  id: string;
  submittedAt: string;
  symptomCategory: string;
  severityLevel: 1 | 2 | 3 | 4 | 5;
  description: string;
  selfMeasuredBp?: string;
  status: 'unread' | 'reviewed';
  doctorReply?: string;
}

export interface FollowupRecheckRecord {
  id: string;
  recheckDate: string;
  monthLabel: string;
  systolicBp: number;
  diastolicBp: number;
  totalCholesterol: number;
  liverFatPercent: number;
  weightKg: number;
  doctorAdjustmentNote: string;
}

export interface ClinicalClosedLoopState {
  activeRole: UserRole;
  currentStep: WorkflowStepId;
  patientProfile: PatientProfile;
  reports: CheckupReportBatch[];
  activeReportId: string;
  draftOrPublishedTasks: ManagedTaskItem[];
  publication: PlanPublicationInfo;
  symptomFeedbacks: SymptomFeedbackItem[];
  followupRechecks: FollowupRecheckRecord[];
}

export const PROTOCOL_CATEGORY_LABELS: Record<'all' | ProtocolCategory, string> = {
  all: '全部方案',
  cardio: '心血管稳压',
  liver: '护肝减脂',
  lipid: '血脂代谢',
  digestive: '消化养护',
  sleep: '睡眠减压',
  followup: '复查监测',
};

export const PROTOCOL_LIBRARY: ProtocolTemplate[] = [
  {
    id: 'tpl-dash-bp',
    title: 'DASH 低钠稳压膳食方案',
    category: 'cardio',
    categoryLabel: '心血管稳压',
    relatedOrgan: 'heart',
    targetTag: '每日限盐 < 5g · 血压目标 < 130/80',
    defaultFrequency: '每日三餐执行',
    shortDesc: '严格限盐补钾，降低外周血管阻力与左室后负荷',
    summary: '采用得舒（DASH）循证降压饮食：每日食盐严格控制在 5g 以内，烹调油 ≤ 25g，每日摄入 500g 深色绿叶蔬菜与低糖水果补充钾镁离子。',
    advice: '避开腌制卤味、浓汤底料与隐形高钠外卖酱汁，使用限盐勺定量烹饪。',
    scoreGain: 3,
    weeklyChecklist: [
      '每日钠盐摄入 < 5g，零腌制重油外卖',
      '每日摄入 ≥ 500g 菠菜、西蓝花、芹菜等富钾蔬菜',
      '早晚固定时间测量家庭静息血压并记录',
    ],
  },
  {
    id: 'tpl-aerobic-liver',
    title: '12周轻度脂肪肝逆转有氧处方',
    category: 'liver',
    categoryLabel: '护肝减脂',
    relatedOrgan: 'liver',
    targetTag: '心率 115–135 次/分 · 肝脂目标 < 5%',
    defaultFrequency: '每周 5 次 × 35 分钟',
    shortDesc: '中等强度有氧结合下肢抗阻，加速肝脏内源性脂肪消耗',
    summary: '每周完成 5 次中等强度有氧运动（快走、慢跑、功率骑行或游泳），每次 35 分钟，配合每周 2 次自重深蹲/靠墙静蹲抗阻训练。',
    advice: '避免晨起空腹剧烈冲刺，建议在傍晚 17:00–19:30 心血管适应性最佳时段运动。',
    scoreGain: 3,
    weeklyChecklist: [
      '完成 5 次 ≥ 30 分钟中等强度有氧训练',
      '运动心率稳定维持在 115–135 次/分靶心率区间',
      '戒除一切含果葡糖浆饮料及酒精饮品',
    ],
  },
  {
    id: 'tpl-omega-lipid',
    title: 'Omega-3 与植物甾醇调脂方案',
    category: 'lipid',
    categoryLabel: '血脂代谢',
    relatedOrgan: 'vascular',
    targetTag: 'TC < 5.2 · LDL-C < 3.4 mmol/L',
    defaultFrequency: '每周 2 次深海鱼 + 全谷替代',
    shortDesc: '减少饱和脂肪摄入，提升低密度脂蛋白受体清除效率',
    summary: '每周安排 2 次清蒸三文鱼、青花鱼或鲈鱼补充天然 Omega-3，将精白米面主食替换 1/3 为燕麦、糙米及杂豆以增加可溶性膳食纤维。',
    advice: '严格控制动物内脏、猪牛肥肉、黄油酥皮糕点与反式脂肪酸摄入。',
    scoreGain: 2,
    weeklyChecklist: [
      '主食 1/3 替换为燕麦、藜麦或糙米杂豆饭',
      '每周摄入 2 次深海鱼类，零油炸宵夜',
      '每日保证 1600–2000 mL 温水促进代谢循环',
    ],
  },
  {
    id: 'tpl-gastric-care',
    title: '胃窦黏膜温和修复饮食方案',
    category: 'digestive',
    categoryLabel: '消化养护',
    relatedOrgan: 'stomach',
    targetTag: '定时定量 · 减轻胃窦黏膜充血',
    defaultFrequency: '每日规律三餐',
    shortDesc: '避免过烫辛辣浓茶刺激，保护胃黏膜屏障修复',
    summary: '针对胃镜提示的胃窦黏膜轻度充血，实行三餐定时定量、七分饱原则，每口食物细嚼慢咽 15–20 次，减轻胃窦机械与胃酸刺激。',
    advice: '空腹不饮浓咖啡与浓茶，食物温度不超过 55℃，睡前 2.5 小时禁食。',
    scoreGain: 1,
    weeklyChecklist: [
      '三餐固定时段进食，晚餐不晚于 19:30',
      '减少辣椒、冰饮、浓咖啡及熏烤刺激性食物',
      '餐后慢走 15 分钟促进胃排空，避免餐后平卧',
    ],
  },
  {
    id: 'tpl-sleep-autonomic',
    title: '交感神经减压与节律睡眠方案',
    category: 'sleep',
    categoryLabel: '睡眠减压',
    relatedOrgan: 'brain',
    targetTag: '23:00 前入睡 · 7.5h 连续睡眠',
    defaultFrequency: '每晚睡前执行',
    shortDesc: '通过慢速腹式呼吸下调夜间交感张力，平抑晨峰血压',
    summary: '固定 23:00 前熄灯入睡，睡前执行 5 分钟 4-6 节律慢速腹式呼吸（吸气 4 秒、呼气 6 秒），改善迷走神经张力与深睡眠占比。',
    advice: '睡前 45 分钟远离高亮度电子屏幕，卧室温度保持在 20–23℃ 安静环境。',
    scoreGain: 2,
    weeklyChecklist: [
      '23:00 前入睡，连续睡眠时长达 7–8 小时',
      '每晚睡前完成 5 分钟慢速腹式呼吸放松',
      '日间连续伏案 60 分钟起身活动颈肩 3 分钟',
    ],
  },
  {
    id: 'tpl-followup-panel',
    title: '12周血压血脂与肝超声复查计划',
    category: 'followup',
    categoryLabel: '复查监测',
    relatedOrgan: 'heart',
    targetTag: '复查节点 · 动态闭环随访',
    defaultFrequency: '每周家庭自测 + 12周门诊复查',
    shortDesc: '跟踪血压、血脂四项及肝脏受控衰减参数逆转幅度',
    summary: '建立家庭自测与门诊检验双轨随访：每周至少 3 天记录早晚血压与晨起空腹体重，满 12 周复查空腹血脂四项、肝功能及肝脏定量超声。',
    advice: '复查前 3 天保持日常饮食，检查当日空腹 10–12 小时采血。',
    scoreGain: 1,
    weeklyChecklist: [
      '每周至少 3 天上传晨起与睡前家庭自测血压',
      '每周日晨起空腹测量体重与腰围变化',
      '按预约节点完成血脂四项与肝脏超声复查',
    ],
  },
];

export const REPORT_IMPORT_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  institution: string;
  packageName: string;
  reportDate: string;
  monthLabel: string;
  metrics: LabMetricsSnapshot;
}> = [
  {
    id: 'preset-metabolic-202611',
    label: '2026-11 年度深度体检包（血压临界 + 轻度脂肪肝 + 胆固醇偏高）',
    institution: '健康4S 数字化医学影像检验中心',
    packageName: '全身体检 + 肝脏定量超声 + 无痛胃肠镜',
    reportDate: '2026-11-19',
    monthLabel: '11月',
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
  {
    id: 'preset-cardio-stress',
    label: '高压伏案人群专项筛查包（血压明显升高 + 血脂波动）',
    institution: '协和合作慢病筛查门诊',
    packageName: '心脑血管与内分泌专项检验报告',
    reportDate: '2026-11-20',
    monthLabel: '11月复筛',
    metrics: {
      systolicBp: 148,
      diastolicBp: 95,
      heartRate: 82,
      fastingGlucose: 5.6,
      totalCholesterol: 6.1,
      ldlCholesterol: 3.9,
      liverFatPercent: 9.4,
      gastricStatus: 'mild_congestion',
    },
  },
  {
    id: 'preset-improved-check',
    label: '阶段减重干预后体检包（各项代谢指标趋于改善）',
    institution: '健康4S 慢病管理随访门诊',
    packageName: '心肝代谢复评检验单',
    reportDate: '2026-11-20',
    monthLabel: '11月复评',
    metrics: {
      systolicBp: 128,
      diastolicBp: 82,
      heartRate: 71,
      fastingGlucose: 5.0,
      totalCholesterol: 4.9,
      ldlCholesterol: 3.0,
      liverFatPercent: 4.7,
      gastricStatus: 'normal',
    },
  },
];

export const PATIENT_PROFILE_PRESETS: ReadonlyArray<{
  id: string;
  badge: string;
  profile: Omit<PatientProfile, 'archiveId' | 'updatedAt'>;
}> = [
  {
    id: 'preset-universal',
    badge: '通用标准 (林晓)',
    profile: {
      name: '林晓',
      gender: '通用',
      age: 38,
      heightCm: 168,
      weightKg: 66.5,
      phone: '138-0013-8620',
      medicalHistory: '近 1 年久坐伏案较多，体检曾提示临界血压与轻度脂肪肝倾向',
      allergyHistory: '无已知药物及食物过敏史',
    },
  },
  {
    id: 'preset-female',
    badge: '女性档案 (林女士)',
    profile: {
      name: '林女士',
      gender: '女',
      age: 36,
      heightCm: 164,
      weightKg: 57.5,
      phone: '139-0026-5180',
      medicalHistory: '工作节奏较快、偶有晚睡，近期关注血脂代谢与胃黏膜温和养护',
      allergyHistory: '无已知药物及食物过敏史',
    },
  },
  {
    id: 'preset-male',
    badge: '男性档案 (李先生)',
    profile: {
      name: '李先生',
      gender: '男',
      age: 38,
      heightCm: 176,
      weightKg: 76.2,
      phone: '138-0013-8620',
      medicalHistory: '近 1 年久坐伏案较多，体检曾提示临界血压与轻度脂肪肝倾向',
      allergyHistory: '无已知药物及食物过敏史',
    },
  },
];

const STORAGE_KEY = 'health4s_clinical_closed_loop_v3';

export function createInitialClinicalState(): ClinicalClosedLoopState {
  return {
    activeRole: 'doctor',
    currentStep: 2,
    patientProfile: {
      archiveId: 'H4S-20261119-038',
      name: '林晓',
      gender: '通用',
      age: 38,
      heightCm: 168,
      weightKg: 66.5,
      phone: '138-0013-8620',
      medicalHistory: '近 1 年久坐伏案较多，体检曾提示临界血压与轻度脂肪肝倾向',
      allergyHistory: '无已知药物及食物过敏史',
      updatedAt: '2026-11-19 09:20',
    },
    reports: [
      {
        id: 'rep-20260615',
        reportDate: '2026-06-15',
        monthLabel: '6月',
        institution: '健康4S 数字化医学影像检验中心',
        packageName: '初诊基线全面体检报告',
        verificationStatus: 'verified',
        verifiedBy: '陈主任 · 全科与慢病管理科',
        verifiedAt: '2026-06-15 16:20',
        doctorVerificationNote:
          '初诊基线提示血压 148/95 mmHg、总胆固醇 6.2 mmol/L、肝脂肪含量 11.2%，启动首轮减盐控脂与有氧运动干预。',
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
        id: 'rep-20260916',
        reportDate: '2026-09-16',
        monthLabel: '9月',
        institution: '健康4S 慢病管理随访门诊',
        packageName: '季度阶段干预复评检验单',
        verificationStatus: 'verified',
        verifiedBy: '陈主任 · 全科与慢病管理科',
        verifiedAt: '2026-09-16 11:05',
        doctorVerificationNote:
          '干预 3 个月后体重下降 1.8 kg，肝脂肪含量由 11.2% 降至 9.8%，血压回落至 145/93 mmHg，仍需强化钠盐控制。',
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
        id: 'rep-20261119',
        reportDate: '2026-11-19',
        monthLabel: '11月',
        institution: '健康4S 数字化医学影像检验中心',
        packageName: '年度全身深度体检报告（含超声/胃肠镜）',
        verificationStatus: 'verified',
        verifiedBy: '陈主任 · 全科与慢病管理科',
        verifiedAt: '2026-11-19 14:10',
        doctorVerificationNote:
          '已核对诊室二次复测血压 142/92 mmHg 属实，较 6 月基线累计下降 6/3 mmHg，肝脂肪含量降至 8.6%，建议继续巩固 12 周非药物生活方式闭环管理。',
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
    ],
    activeReportId: 'rep-20261119',
    draftOrPublishedTasks: [
      {
        id: 'task-1',
        templateId: 'tpl-dash-bp',
        title: 'DASH 低钠稳压膳食方案',
        category: 'cardio',
        relatedOrgan: 'heart',
        targetTag: '每日限盐 < 5g · 血压目标 < 130/80',
        frequency: '每日三餐执行',
        shortDesc: '控制钠盐与油脂摄入，减轻血管外周阻力',
        summary: PROTOCOL_LIBRARY[0].summary,
        advice: PROTOCOL_LIBRARY[0].advice,
        scoreGain: 3,
        weeklyChecklist: PROTOCOL_LIBRARY[0].weeklyChecklist,
        completedByPatient: false,
      },
      {
        id: 'task-2',
        templateId: 'tpl-aerobic-liver',
        title: '12周轻度脂肪肝逆转有氧处方',
        category: 'liver',
        relatedOrgan: 'liver',
        targetTag: '每周 ≥ 150 分钟中等强度有氧',
        frequency: '每周 5 次 × 35 分钟',
        shortDesc: '中等强度快走/骑行，加速肝脏脂肪代谢逆转',
        summary: PROTOCOL_LIBRARY[1].summary,
        advice: PROTOCOL_LIBRARY[1].advice,
        scoreGain: 3,
        weeklyChecklist: PROTOCOL_LIBRARY[1].weeklyChecklist,
        completedByPatient: false,
      },
      {
        id: 'task-3',
        templateId: 'tpl-sleep-autonomic',
        title: '交感神经减压与节律睡眠方案',
        category: 'sleep',
        relatedOrgan: 'brain',
        targetTag: '23:00 前入睡 · 7.5h 连续睡眠',
        frequency: '每晚睡前执行',
        shortDesc: '保证 7~8 小时睡眠与腹式呼吸放松，平抑晨峰血压',
        summary: PROTOCOL_LIBRARY[4].summary,
        advice: PROTOCOL_LIBRARY[4].advice,
        scoreGain: 2,
        weeklyChecklist: PROTOCOL_LIBRARY[4].weeklyChecklist,
        completedByPatient: false,
      },
      {
        id: 'task-4',
        templateId: 'tpl-followup-panel',
        title: '12周血压血脂与肝超声复查计划',
        category: 'followup',
        relatedOrgan: 'vascular',
        targetTag: '复查节点：2027-02-19',
        frequency: '每周自测 + 12周门诊复查',
        shortDesc: '3个月后复查血压、血脂四项与肝脏定量超声',
        summary: PROTOCOL_LIBRARY[5].summary,
        advice: PROTOCOL_LIBRARY[5].advice,
        scoreGain: 1,
        weeklyChecklist: PROTOCOL_LIBRARY[5].weeklyChecklist,
        completedByPatient: false,
      },
    ],
    publication: {
      status: 'published',
      cycleWeeks: 12,
      nextFollowupDate: '2027-02-19',
      followupCadenceLabel: '12 周常规闭环随访（每周家庭自测血压上传）',
      doctorMessage:
        '林晓您好，您的心肺储备与肾功能基础很好，目前处于高血压 1 级临界与轻度脂肪肝可逆窗口期，请按以下 4 项管理任务规律打卡，有不适随时提交症状反馈。',
      publishedBy: '陈主任 · 全科与慢病管理科',
      publishedAt: '2026-11-19 15:00',
      focusedOrgans: ['heart', 'liver', 'vascular'],
    },
    symptomFeedbacks: [
      {
        id: 'fb-init-1',
        submittedAt: '2026-11-20 08:30',
        symptomCategory: '偶发午后颈部紧绷',
        severityLevel: 2,
        description: '按低盐饮食执行第 2 天，下午连续开会 2 小时后感觉后颈轻微发紧，休息 15 分钟后缓解。',
        selfMeasuredBp: '138 / 89 mmHg',
        status: 'unread',
      },
    ],
    followupRechecks: [],
  };
}

export function loadClinicalState(): ClinicalClosedLoopState {
  if (typeof window === 'undefined') return createInitialClinicalState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialClinicalState();
    const parsed = JSON.parse(raw) as Partial<ClinicalClosedLoopState>;
    if (!parsed.patientProfile || !Array.isArray(parsed.reports) || parsed.reports.length === 0) {
      return createInitialClinicalState();
    }
    return {
      ...createInitialClinicalState(),
      ...parsed,
    };
  } catch {
    return createInitialClinicalState();
  }
}

export function saveClinicalState(state: ClinicalClosedLoopState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function computeBmi(weightKg: number, heightCm: number): number {
  const hMeters = Math.max(0.5, heightCm / 100);
  return Number((weightKg / (hMeters * hMeters)).toFixed(1));
}

export function getEffectiveLabMetrics(state: ClinicalClosedLoopState): {
  metrics: LabMetricsSnapshot;
  effectiveWeightKg: number;
  effectiveDate: string;
  sourceTitle: string;
} {
  const activeReport =
    state.reports.find((r) => r.id === state.activeReportId) ??
    state.reports[state.reports.length - 1];

  const latestRecheck =
    state.followupRechecks.length > 0
      ? state.followupRechecks[state.followupRechecks.length - 1]
      : null;

  if (latestRecheck) {
    return {
      metrics: {
        ...activeReport.metrics,
        systolicBp: latestRecheck.systolicBp,
        diastolicBp: latestRecheck.diastolicBp,
        totalCholesterol: latestRecheck.totalCholesterol,
        ldlCholesterol: Number(Math.max(1.8, latestRecheck.totalCholesterol * 0.62).toFixed(1)),
        liverFatPercent: latestRecheck.liverFatPercent,
      },
      effectiveWeightKg: latestRecheck.weightKg,
      effectiveDate: latestRecheck.recheckDate,
      sourceTitle: `复查数据 (${latestRecheck.recheckDate})`,
    };
  }

  return {
    metrics: activeReport.metrics,
    effectiveWeightKg: activeReport.weightKg ?? state.patientProfile.weightKg,
    effectiveDate: activeReport.reportDate,
    sourceTitle: `${activeReport.reportDate} 体检报告`,
  };
}

export interface DerivedClinicalEvaluation {
  healthScore: number;
  projectedScore: number;
  bmi: number;
  vitalSigns: VitalSignItem[];
  organRecords: Record<OrganId, OrganRecord>;
  riskPrompts: RiskPromptItem[];
  normalCount: number;
  cautionCount: number;
  alertCount: number;
}

export function deriveClinicalEvaluation(
  profile: PatientProfile,
  metrics: LabMetricsSnapshot,
  effectiveWeightKg: number,
  tasks: ReadonlyArray<ManagedTaskItem>
): DerivedClinicalEvaluation {
  const bmi = computeBmi(effectiveWeightKg, profile.heightCm);

  // Evaluate Heart / Blood Pressure
  const bpAlert = metrics.systolicBp >= 140 || metrics.diastolicBp >= 90;
  const bpCaution = !bpAlert && (metrics.systolicBp >= 130 || metrics.diastolicBp >= 85);
  const heartSeverity: HealthSeverity = bpAlert ? 'alert' : bpCaution ? 'caution' : 'normal';
  const heartScore = bpAlert
    ? Math.max(66, Math.round(84 - (metrics.systolicBp - 136) * 0.9))
    : bpCaution
    ? 85
    : 92;

  // Evaluate Liver / Steatosis
  const liverAlert = metrics.liverFatPercent >= 12.0;
  const liverCaution = !liverAlert && metrics.liverFatPercent >= 5.0;
  const liverSeverity: HealthSeverity = liverAlert ? 'alert' : liverCaution ? 'caution' : 'normal';
  const liverScore = liverAlert
    ? 70
    : liverCaution
    ? Math.max(76, Math.round(88 - (metrics.liverFatPercent - 5.0) * 2.2))
    : 91;

  // Evaluate Vascular / Lipids
  const lipidAlert = metrics.totalCholesterol >= 6.2 || metrics.ldlCholesterol >= 4.1;
  const lipidCaution =
    !lipidAlert && (metrics.totalCholesterol >= 5.2 || metrics.ldlCholesterol >= 3.4);
  const vascSeverity: HealthSeverity = lipidAlert
    ? 'alert'
    : lipidCaution
    ? 'caution'
    : 'normal';
  const vascScore = lipidAlert
    ? 72
    : lipidCaution
    ? Math.max(77, Math.round(87 - (metrics.totalCholesterol - 5.0) * 10))
    : 90;

  // Evaluate Glucose
  const gluCaution = metrics.fastingGlucose >= 6.1;

  // Evaluate BMI
  const bmiSeverity: HealthSeverity =
    bmi >= 28 ? 'alert' : bmi >= 24 ? 'caution' : 'normal';

  // Clone and enrich organ records dynamically
  const organRecords: Record<OrganId, OrganRecord> = {
    ...ORGAN_RECORDS,
    heart: {
      ...ORGAN_RECORDS.heart,
      severity: heartSeverity,
      score: heartScore,
      statusLabel:
        heartSeverity === 'alert'
          ? '需关注'
          : heartSeverity === 'caution'
          ? '临界偏高'
          : '血压达标',
      summary:
        heartSeverity === 'normal'
          ? `静息心率 ${metrics.heartRate} 次/分（窦性心律），当前血压 ${metrics.systolicBp}/${metrics.diastolicBp} mmHg 已稳定回落至理想控制区间。`
          : `静息心率 ${metrics.heartRate} 次/分（窦性心律），血压 ${metrics.systolicBp}/${metrics.diastolicBp} mmHg 偏高，左室后负荷增加，需坚持限盐与有氧管理。`,
      metrics: [
        {
          label: '收缩压 / 舒张压',
          value: `${metrics.systolicBp} / ${metrics.diastolicBp} mmHg`,
          reference: '< 130/85 mmHg',
          abnormal: heartSeverity !== 'normal',
        },
        {
          label: '静息心率',
          value: `${metrics.heartRate} 次/分`,
          reference: '60–100 次/分',
          abnormal: metrics.heartRate > 100 || metrics.heartRate < 55,
        },
        ORGAN_RECORDS.heart.metrics[2],
        ORGAN_RECORDS.heart.metrics[3],
      ],
    },
    liver: {
      ...ORGAN_RECORDS.liver,
      severity: liverSeverity,
      score: liverScore,
      statusLabel:
        liverSeverity === 'alert'
          ? '中度脂肪浸润'
          : liverSeverity === 'caution'
          ? '轻度关注'
          : '代谢正常',
      summary:
        liverSeverity === 'normal'
          ? `肝脏受控衰减参数显示肝脂肪含量已降至 ${metrics.liverFatPercent.toFixed(1)}%（正常阈值 < 5.0%），脂肪浸润已实现逆转。`
          : `肝脏包膜完整，定量超声提示肝脂肪含量 ${metrics.liverFatPercent.toFixed(1)}%（高于 < 5.0% 参考上限），建议持续有氧减脂与控糖。`,
      metrics: [
        {
          label: '肝脂肪含量 MRI-PDFF',
          value: `${metrics.liverFatPercent.toFixed(1)} %`,
          reference: '< 5.0 %',
          abnormal: liverSeverity !== 'normal',
        },
        ORGAN_RECORDS.liver.metrics[1],
        ORGAN_RECORDS.liver.metrics[2],
        ORGAN_RECORDS.liver.metrics[3],
      ],
    },
    vascular: {
      ...ORGAN_RECORDS.vascular,
      severity: vascSeverity,
      score: vascScore,
      statusLabel:
        vascSeverity === 'alert'
          ? '高脂风险'
          : vascSeverity === 'caution'
          ? '轻度风险'
          : '血脂正常',
      summary:
        vascSeverity === 'normal'
          ? `总胆固醇 ${metrics.totalCholesterol.toFixed(1)} mmol/L、低密度脂蛋白 ${metrics.ldlCholesterol.toFixed(1)} mmol/L 均已恢复理想水平。`
          : `总胆固醇 ${metrics.totalCholesterol.toFixed(1)} mmol/L、低密度脂蛋白 ${metrics.ldlCholesterol.toFixed(1)} mmol/L 偏高，需控制饱和脂肪摄入并定期随访。`,
      metrics: [
        {
          label: '总胆固醇 TC',
          value: `${metrics.totalCholesterol.toFixed(1)} mmol/L`,
          reference: '< 5.2 mmol/L',
          abnormal: metrics.totalCholesterol >= 5.2,
        },
        {
          label: '低密度脂蛋白 LDL-C',
          value: `${metrics.ldlCholesterol.toFixed(1)} mmol/L`,
          reference: '< 3.4 mmol/L',
          abnormal: metrics.ldlCholesterol >= 3.4,
        },
        ORGAN_RECORDS.vascular.metrics[2],
        ORGAN_RECORDS.vascular.metrics[3],
      ],
    },
    stomach: {
      ...ORGAN_RECORDS.stomach,
      statusLabel: metrics.gastricStatus === 'mild_congestion' ? '轻度充血' : '正常',
      score: metrics.gastricStatus === 'mild_congestion' ? 88 : 93,
    },
  };

  // Overall weighted clinical score across all 8 organs (calibrated so initial baseline = 86)
  const avgOrganScore =
    ORGAN_ORDER.reduce((acc, id) => acc + organRecords[id].score, 0) / ORGAN_ORDER.length;
  const healthScore = Math.min(98, Math.max(55, Math.round(avgOrganScore)));

  const completedGain = tasks
    .filter((t) => t.completedByPatient)
    .reduce((sum, t) => sum + t.scoreGain, 0);
  const projectedScore = Math.min(99, healthScore + completedGain);

  const vitalSigns: VitalSignItem[] = [
    {
      id: 'bp',
      label: '血压',
      value: `${metrics.systolicBp} / ${metrics.diastolicBp}`,
      unit: 'mmHg',
      statusText:
        heartSeverity === 'alert'
          ? '偏高'
          : heartSeverity === 'caution'
          ? '临界'
          : '达标',
      severity: heartSeverity,
      relatedOrgan: 'heart',
      referenceRange: '90–129 / 60–84 mmHg',
    },
    {
      id: 'hr',
      label: '心率',
      value: `${metrics.heartRate}`,
      unit: '次/分',
      statusText: metrics.heartRate > 100 ? '偏快' : '正常',
      severity: metrics.heartRate > 100 ? 'caution' : 'normal',
      relatedOrgan: 'heart',
      referenceRange: '60–100 次/分',
    },
    {
      id: 'glu',
      label: '空腹血糖',
      value: metrics.fastingGlucose.toFixed(1),
      unit: 'mmol/L',
      statusText: gluCaution ? '偏高' : '正常',
      severity: gluCaution ? 'caution' : 'normal',
      relatedOrgan: 'liver',
      referenceRange: '3.9–6.1 mmol/L',
    },
    {
      id: 'tc',
      label: '总胆固醇',
      value: metrics.totalCholesterol.toFixed(1),
      unit: 'mmol/L',
      statusText:
        metrics.totalCholesterol >= 5.2 ? '偏高' : '正常',
      severity:
        metrics.totalCholesterol >= 5.8
          ? 'alert'
          : metrics.totalCholesterol >= 5.2
          ? 'caution'
          : 'normal',
      relatedOrgan: 'vascular',
      referenceRange: '< 5.2 mmol/L',
    },
    {
      id: 'bmi',
      label: 'BMI 指数',
      value: bmi.toFixed(1),
      unit: 'kg/m²',
      statusText:
        bmi >= 28 ? '肥胖' : bmi >= 24 ? '超重临界' : '标准',
      severity: bmiSeverity,
      relatedOrgan: 'liver',
      referenceRange: '18.5–23.9 kg/m²',
    },
  ];

  const riskPrompts: RiskPromptItem[] = [];
  if (heartSeverity !== 'normal') {
    riskPrompts.push({
      id: 'risk-bp',
      title: '血压偏高',
      metricSummary: `${metrics.systolicBp} / ${metrics.diastolicBp} mmHg`,
      severity: heartSeverity === 'alert' ? 'alert' : 'caution',
      organId: 'heart',
      mechanism: '交感神经张力偏高合并钠盐摄入偏多，导致外周小动脉阻力上升。',
      targetGoal: '家庭自测血压稳定于 < 130 / 80 mmHg',
    });
  }
  if (liverSeverity !== 'normal') {
    riskPrompts.push({
      id: 'risk-liver',
      title: '脂肪肝（轻度）',
      metricSummary: `肝脂肪含量 ${metrics.liverFatPercent.toFixed(1)}%`,
      severity: liverSeverity === 'alert' ? 'alert' : 'caution',
      organId: 'liver',
      mechanism: '内脏脂肪堆积与精制碳水过剩，引起肝细胞内甘油三酯沉积。',
      targetGoal: '12 周肝脂肪含量降至 < 5.0%',
    });
  }
  if (vascSeverity !== 'normal') {
    riskPrompts.push({
      id: 'risk-lipid',
      title: '血脂偏高',
      metricSummary: `总胆固醇 ${metrics.totalCholesterol.toFixed(1)} mmol/L`,
      severity: vascSeverity === 'alert' ? 'alert' : 'caution',
      organId: 'vascular',
      mechanism: '低密度脂蛋白清除减缓，长期可增加动脉壁脂质沉积风险。',
      targetGoal: '总胆固醇 < 5.2 mmol/L，LDL-C < 3.4 mmol/L',
    });
  }

  const alertCount = riskPrompts.filter((r) => r.severity === 'alert').length;
  const cautionCount = riskPrompts.length;
  const normalCount = Math.max(18, 27 - cautionCount - alertCount);

  return {
    healthScore,
    projectedScore,
    bmi,
    vitalSigns,
    organRecords,
    riskPrompts,
    normalCount,
    cautionCount,
    alertCount,
  };
}

export function buildLongitudinalTrends(
  state: ClinicalClosedLoopState
): TrendDataPoint[] {
  const base = TREND_6M_DATA.slice(0, 5); // 6月..10月
  const points: TrendDataPoint[] = [...base];

  for (const rep of state.reports) {
    const repWeight = rep.weightKg ?? state.patientProfile.weightKg;
    const evalRep = deriveClinicalEvaluation(
      state.patientProfile,
      rep.metrics,
      repWeight,
      []
    );
    const existingIdx = points.findIndex((p) => p.month === rep.monthLabel);
    const item: TrendDataPoint = {
      month: rep.monthLabel,
      systolicBp: rep.metrics.systolicBp,
      diastolicBp: rep.metrics.diastolicBp,
      cholesterol: rep.metrics.totalCholesterol,
      weightKg: repWeight,
      healthScore: evalRep.healthScore,
    };
    if (existingIdx >= 0) {
      points[existingIdx] = item;
    } else {
      points.push(item);
    }
  }

  for (const rc of state.followupRechecks) {
    const mergedMetrics: LabMetricsSnapshot = {
      systolicBp: rc.systolicBp,
      diastolicBp: rc.diastolicBp,
      heartRate: 72,
      fastingGlucose: 5.1,
      totalCholesterol: rc.totalCholesterol,
      ldlCholesterol: Number((rc.totalCholesterol * 0.62).toFixed(1)),
      liverFatPercent: rc.liverFatPercent,
      gastricStatus: 'normal',
    };
    const evalRc = deriveClinicalEvaluation(
      state.patientProfile,
      mergedMetrics,
      rc.weightKg,
      []
    );
    points.push({
      month: rc.monthLabel,
      systolicBp: rc.systolicBp,
      diastolicBp: rc.diastolicBp,
      cholesterol: rc.totalCholesterol,
      weightKg: rc.weightKg,
      healthScore: evalRc.healthScore,
    });
  }

  return points;
}

export function filterProtocolTemplates(
  templates: ReadonlyArray<ProtocolTemplate>,
  category: 'all' | ProtocolCategory,
  searchQuery: string
): ProtocolTemplate[] {
  const q = searchQuery.trim().toLowerCase();
  return templates.filter((tpl) => {
    const catOk = category === 'all' || tpl.category === category;
    if (!catOk) return false;
    if (!q) return true;
    return (
      tpl.title.toLowerCase().includes(q) ||
      tpl.shortDesc.toLowerCase().includes(q) ||
      tpl.targetTag.toLowerCase().includes(q) ||
      tpl.categoryLabel.toLowerCase().includes(q)
    );
  });
}

export function validatePatientProfileInput(input: {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
}): string | null {
  if (!input.name.trim()) return '请填写受检患者姓名';
  if (!Number.isFinite(input.age) || input.age < 1 || input.age > 120) {
    return '年龄需在 1–120 岁合理范围内';
  }
  if (!Number.isFinite(input.heightCm) || input.heightCm < 80 || input.heightCm > 240) {
    return '身高需在 80–240 cm 合理范围内';
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg < 20 || input.weightKg > 260) {
    return '体重需在 20–260 kg 合理范围内';
  }
  return null;
}

export function validateLabMetricsInput(input: {
  reportDate: string;
  institution: string;
  systolicBp: number;
  diastolicBp: number;
  totalCholesterol: number;
  liverFatPercent: number;
}): string | null {
  if (!input.reportDate.trim()) return '请选择检查报告日期';
  if (!input.institution.trim()) return '请填写体检或医疗机构名称';
  if (input.systolicBp < 70 || input.systolicBp > 240 || input.diastolicBp < 40 || input.diastolicBp > 150) {
    return '请填写生理合理范围内的收缩压 (70–240) 与舒张压 (40–150)';
  }
  if (input.systolicBp <= input.diastolicBp) {
    return '收缩压必须高于舒张压';
  }
  if (input.totalCholesterol < 1.5 || input.totalCholesterol > 15) {
    return '总胆固醇需在 1.5–15.0 mmol/L 范围内';
  }
  if (input.liverFatPercent < 0.5 || input.liverFatPercent > 50) {
    return '肝脂肪含量需在 0.5%–50% 范围内';
  }
  return null;
}

export function validateCustomTaskInput(input: {
  title: string;
  targetTag: string;
  frequency: string;
  summary: string;
}): string | null {
  if (!input.title.trim()) return '请填写个性化干预任务名称';
  if (!input.targetTag.trim()) return '请填写量化控制目标（如：血压 < 130/80）';
  if (!input.frequency.trim()) return '请填写执行频次（如：每周 5 次）';
  if (!input.summary.trim()) return '请填写具体干预执行说明';
  return null;
}

export function validateSymptomFeedbackInput(input: {
  symptomCategory: string;
  description: string;
}): string | null {
  if (!input.symptomCategory.trim()) return '请选择症状或执行感受类别';
  if (input.description.trim().length < 4) return '请填写至少 4 个字的症状或执行反馈详情';
  return null;
}

export function validateFollowupRecheckInput(input: {
  recheckDate: string;
  systolicBp: number;
  diastolicBp: number;
  totalCholesterol: number;
  liverFatPercent: number;
  weightKg: number;
}): string | null {
  if (!input.recheckDate.trim()) return '请选择复查日期';
  if (input.systolicBp < 70 || input.systolicBp > 240 || input.diastolicBp < 40 || input.diastolicBp > 150) {
    return '复查血压数值超出合理生理范围';
  }
  if (input.systolicBp <= input.diastolicBp) {
    return '复查收缩压需大于舒张压';
  }
  if (input.totalCholesterol < 1.5 || input.totalCholesterol > 15) {
    return '复查总胆固醇数值需在 1.5–15.0 mmol/L 之间';
  }
  if (input.liverFatPercent < 0.5 || input.liverFatPercent > 50) {
    return '复查肝脂肪含量需在 0.5%–50% 之间';
  }
  if (input.weightKg < 20 || input.weightKg > 260) {
    return '复查体重需在 20–260 kg 之间';
  }
  return null;
}
