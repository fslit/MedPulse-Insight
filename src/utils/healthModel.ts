export type OrganId =
  | 'brain'
  | 'lungs'
  | 'heart'
  | 'liver'
  | 'stomach'
  | 'kidneys'
  | 'bone'
  | 'vascular';

export type StageMode = 'overview' | 'atlas' | 'systems' | 'xray';

export type BodyVistaAxis = 'y' | 'x' | 'z';

export type BodyVistaLayerKey = 'skin' | 'muscular' | 'skeletal' | 'vascular' | 'visceral';

export type BodyVistaLayerLevel = 0 | 1 | 2 | 3;

export type NavTabId =
  | 'roster'
  | 'report'
  | 'cases'
  | 'intake'
  | 'review'
  | 'protocol'
  | 'followup'
  | 'profile'
  | 'risks'
  | 'plans'
  | 'history';

export type HealthSeverity = 'normal' | 'caution' | 'alert';

export interface OrganMetric {
  label: string;
  value: string;
  reference: string;
  abnormal?: boolean;
}

export interface OrganRecord {
  id: OrganId;
  name: string;
  systemName: string;
  statusLabel: string;
  severity: HealthSeverity;
  score: number;
  side: 'left' | 'right';
  /** Vertical slot index (0..3) on its side to guarantee zero card overlap on desktop */
  slotIndex: number;
  /** 3D position inside humanGroup */
  pos: [number, number, number];
  /** Camera focus offset relative to organ */
  camOffset: [number, number, number];
  summary: string;
  advice: string;
  metrics: OrganMetric[];
}

export interface VitalSignItem {
  id: string;
  label: string;
  value: string;
  unit: string;
  statusText: string;
  severity: HealthSeverity;
  relatedOrgan: OrganId;
  referenceRange: string;
}

export interface RiskPromptItem {
  id: string;
  title: string;
  metricSummary: string;
  severity: 'caution' | 'alert';
  organId: OrganId;
  mechanism: string;
  targetGoal: string;
}

export interface ActionPlanItem {
  id: 'exercise' | 'diet' | 'sleep' | 'followup';
  title: string;
  shortDesc: string;
  targetTag: string;
  summary: string;
  advice: string;
  scoreGain: number;
  weeklyChecklist: string[];
}

export interface TrendDataPoint {
  month: string;
  systolicBp: number;
  diastolicBp: number;
  cholesterol: number;
  weightKg: number;
  healthScore: number;
}

export interface MedicalImagingItem {
  id: 'liver-us' | 'gastroscopy' | 'colonoscopy';
  title: string;
  modality: string;
  statusLabel: string;
  severity: HealthSeverity;
  finding: string;
  aiConfidence: string;
  organId: OrganId;
}

export const BASE_HEALTH_SCORE = 86;
export const PREVIOUS_HEALTH_SCORE = 80;
export const REPORT_DATE = '2026-11-19';

export const ORGAN_RECORDS: Record<OrganId, OrganRecord> = {
  lungs: {
    id: 'lungs',
    name: '肺部',
    systemName: '呼吸系统',
    statusLabel: '正常',
    severity: 'normal',
    score: 92,
    side: 'left',
    slotIndex: 0,
    pos: [-0.095, 1.01, 0.03],
    camOffset: [-0.22, 0.06, 2.35],
    summary: '低剂量螺旋 CT 显示双肺纹理清晰，未见实性或磨玻璃结节；肺通气与弥散功能优异。',
    advice: '继续保持良好的有氧呼吸耐力，秋冬季空气质量较差时建议佩戴防护口罩。',
    metrics: [
      { label: '用力肺活量 FVC', value: '4.12 L', reference: '3.50–4.80 L' },
      { label: '第一秒率 FEV1/FVC', value: '84.5 %', reference: '≥ 70 %' },
      { label: '静息血氧饱和度', value: '99 %', reference: '95–100 %' },
      { label: '胸部低剂量 CT', value: '未见结节影', reference: '双肺清亮' },
    ],
  },
  liver: {
    id: 'liver',
    name: '肝脏',
    systemName: '肝脏代谢',
    statusLabel: '轻度关注',
    severity: 'caution',
    score: 80,
    side: 'left',
    slotIndex: 1,
    pos: [-0.065, 0.735, 0.035],
    camOffset: [-0.24, 0.02, 2.25],
    summary: '肝脏形态包膜完整，受控衰减参数提示轻度脂肪浸润（肝脂肪含量 8.6%），肝酶指标目前正常。',
    advice: '严格戒酒及含糖果味饮料，将精制白米面替换 1/3 为燕麦糙米，减重 3–4 kg 可显著逆转肝脂肪沉积。',
    metrics: [
      { label: '肝脂肪含量 MRI-PDFF', value: '8.6 %', reference: '< 5.0 %', abnormal: true },
      { label: '谷丙转氨酶 ALT', value: '32 U/L', reference: '9–50 U/L' },
      { label: '谷草转氨酶 AST', value: '26 U/L', reference: '15–40 U/L' },
      { label: '肝脏硬度值 LSM', value: '5.1 kPa', reference: '< 7.0 kPa' },
    ],
  },
  kidneys: {
    id: 'kidneys',
    name: '肾脏',
    systemName: '泌尿系统',
    statusLabel: '正常',
    severity: 'normal',
    score: 90,
    side: 'left',
    slotIndex: 2,
    pos: [-0.075, 0.602, -0.055],
    camOffset: [-0.28, 0.0, 2.3],
    summary: '双肾轮廓规则、皮髓质分界清晰，估算肾小球滤过率（eGFR）充足，尿微量白蛋白阴性。',
    advice: '全天均匀饮用温白开水 1600–2000 mL，避免憋尿及非必要使用肾毒性止痛药。',
    metrics: [
      { label: '血肌酐 Scr', value: '74 μmol/L', reference: '57–97 μmol/L' },
      { label: '肾小球滤过率 eGFR', value: '104 mL/min', reference: '≥ 90 mL/min' },
      { label: '血尿酸 UA', value: '368 μmol/L', reference: '208–428 μmol/L' },
      { label: '尿微量白蛋白', value: '8.2 mg/L', reference: '< 20 mg/L' },
    ],
  },
  vascular: {
    id: 'vascular',
    name: '血管',
    systemName: '血脂与外周血管',
    statusLabel: '轻度风险',
    severity: 'caution',
    score: 79,
    side: 'left',
    slotIndex: 3,
    pos: [-0.119, -0.141, -0.045],
    camOffset: [-0.24, -0.04, 2.45],
    summary: '总胆固醇 5.8 mmol/L、低密度脂蛋白 3.7 mmol/L 偏高，踝臂指数正常但外周血管阻力轻度上升。',
    advice: '每周摄入深海鱼类 2 次补充 Omega-3，严格控制动物内脏、酥皮糕点与油炸外卖，3 个月后复查血脂四项。',
    metrics: [
      { label: '总胆固醇 TC', value: '5.8 mmol/L', reference: '< 5.2 mmol/L', abnormal: true },
      { label: '低密度脂蛋白 LDL-C', value: '3.7 mmol/L', reference: '< 3.4 mmol/L', abnormal: true },
      { label: '甘油三酯 TG', value: '1.68 mmol/L', reference: '< 1.70 mmol/L' },
      { label: '脉搏波传导速度', value: '1380 cm/s', reference: '< 1400 cm/s' },
    ],
  },
  brain: {
    id: 'brain',
    name: '大脑',
    systemName: '神经与脑血管',
    statusLabel: '正常',
    severity: 'normal',
    score: 94,
    side: 'right',
    slotIndex: 0,
    pos: [0.025, 1.56, -0.04],
    camOffset: [0.16, 0.12, 2.3],
    summary: '双侧大脑中动脉血流速度对称，脑血管弹性及神经反射评估均处于理想区间，深睡眠节律稳定。',
    advice: '保持规律作息与每日 7–8 小时充足睡眠，连续伏案 60 分钟建议起身活动颈肩。',
    metrics: [
      { label: '脑血流速度', value: '62 cm/s', reference: '50–80 cm/s' },
      { label: '颈动脉阻力指数', value: '0.62 RI', reference: '< 0.75 RI' },
      { label: '深睡眠占比', value: '24 %', reference: '20–30 %' },
      { label: '系统评分', value: '94 分', reference: '≥ 85 分' },
    ],
  },
  heart: {
    id: 'heart',
    name: '心脏',
    systemName: '心血管系统',
    statusLabel: '需关注',
    severity: 'alert',
    score: 78,
    side: 'right',
    slotIndex: 1,
    pos: [0.045, 0.919, 0.025],
    camOffset: [0.22, 0.05, 2.2],
    summary: '静息心率 76 次/分（窦性心律），但诊室血压 142/92 mmHg 处于 1 级高血压临界，左室后负荷轻度增加。',
    advice: '每日严格限盐 < 5g，早晚固定时间测量家庭血压并记录，每周累计完成 150 分钟快走或骑行。',
    metrics: [
      { label: '收缩压 / 舒张压', value: '142 / 92 mmHg', reference: '< 130/85 mmHg', abnormal: true },
      { label: '静息心率', value: '76 次/分', reference: '60–100 次/分' },
      { label: '心电图节律', value: '正常窦性', reference: '窦性心律' },
      { label: '同型半胱氨酸', value: '11.4 μmol/L', reference: '< 15 μmol/L' },
    ],
  },
  stomach: {
    id: 'stomach',
    name: '胃部',
    systemName: '消化系统',
    statusLabel: '轻度充血',
    severity: 'normal',
    score: 88,
    side: 'right',
    slotIndex: 2,
    pos: [0.055, 0.665, 0.035],
    camOffset: [0.22, 0.02, 2.25],
    summary: '胃肠动力正常，C13 幽门螺杆菌呼气试验阴性；无痛胃镜提示胃窦黏膜轻度充血，未见溃疡或息肉。',
    advice: '三餐定时定量、细嚼慢咽，减少浓茶咖啡及过烫辛辣饮食，睡前 2 小时避免进食。',
    metrics: [
      { label: '幽门螺杆菌 C13', value: '阴性 (2.1)', reference: '0–4.0 DOB' },
      { label: '胃蛋白酶原比值', value: '6.8 PGR', reference: '> 3.0 PGR' },
      { label: '胃镜黏膜评估', value: '轻度浅表充血', reference: '黏膜光滑' },
      { label: '肠镜筛查结果', value: '未见异常', reference: '正常肠腔' },
    ],
  },
  bone: {
    id: 'bone',
    name: '骨骼',
    systemName: '骨骼关节',
    statusLabel: '正常',
    severity: 'normal',
    score: 87,
    side: 'right',
    slotIndex: 3,
    pos: [0.168, -0.574, -0.06],
    camOffset: [0.24, -0.05, 2.5],
    summary: '双能 X 线骨密度 T 值为 +0.4，钙磷代谢均衡，腰椎与双膝关节间隙清晰，未见骨质增生。',
    advice: '每周进行 2 次抗阻力量训练强健下肢肌群，日间适度晒太阳 15–20 分钟促进维生素 D 合成。',
    metrics: [
      { label: '骨密度 T 值', value: '+0.4 SD', reference: '≥ -1.0 SD' },
      { label: '血清总钙', value: '2.35 mmol/L', reference: '2.11–2.52 mmol/L' },
      { label: '25-羟维生素D', value: '34.2 ng/mL', reference: '30–100 ng/mL' },
      { label: '关节间隙评估', value: '对称正常', reference: '无狭窄' },
    ],
  },
};

export const ORGAN_ORDER: OrganId[] = [
  'brain',
  'lungs',
  'heart',
  'liver',
  'stomach',
  'kidneys',
  'bone',
  'vascular',
];

export const SYSTEM_SCORES_ORDER: OrganId[] = [
  'heart',
  'lungs',
  'stomach',
  'liver',
  'kidneys',
  'bone',
];

export const VITAL_SIGNS: VitalSignItem[] = [
  {
    id: 'bp',
    label: '血压',
    value: '142 / 92',
    unit: 'mmHg',
    statusText: '偏高',
    severity: 'alert',
    relatedOrgan: 'heart',
    referenceRange: '90–129 / 60–84 mmHg',
  },
  {
    id: 'hr',
    label: '心率',
    value: '76',
    unit: '次/分',
    statusText: '正常',
    severity: 'normal',
    relatedOrgan: 'heart',
    referenceRange: '60–100 次/分',
  },
  {
    id: 'glu',
    label: '空腹血糖',
    value: '5.2',
    unit: 'mmol/L',
    statusText: '正常',
    severity: 'normal',
    relatedOrgan: 'liver',
    referenceRange: '3.9–6.1 mmol/L',
  },
  {
    id: 'tc',
    label: '总胆固醇',
    value: '5.8',
    unit: 'mmol/L',
    statusText: '偏高',
    severity: 'alert',
    relatedOrgan: 'vascular',
    referenceRange: '< 5.2 mmol/L',
  },
  {
    id: 'bmi',
    label: 'BMI 指数',
    value: '24.6',
    unit: 'kg/m²',
    statusText: '超重临界',
    severity: 'caution',
    relatedOrgan: 'liver',
    referenceRange: '18.5–23.9 kg/m²',
  },
];

export const RISK_PROMPTS: RiskPromptItem[] = [
  {
    id: 'risk-bp',
    title: '血压偏高',
    metricSummary: '142 / 92 mmHg',
    severity: 'alert',
    organId: 'heart',
    mechanism: '交感神经张力偏高合并钠盐摄入偏多，导致外周小动脉阻力上升。',
    targetGoal: '家庭自测血压稳定于 < 130 / 80 mmHg',
  },
  {
    id: 'risk-liver',
    title: '脂肪肝（轻度）',
    metricSummary: '肝脂肪含量 8.6%',
    severity: 'caution',
    organId: 'liver',
    mechanism: '内脏脂肪堆积与精制碳水过剩，引起肝细胞内甘油三酯轻度沉积。',
    targetGoal: '12 周肝脂肪含量降至 < 5.0%',
  },
  {
    id: 'risk-lipid',
    title: '血脂偏高',
    metricSummary: '总胆固醇 5.8 mmol/L',
    severity: 'caution',
    organId: 'vascular',
    mechanism: '低密度脂蛋白胆固醇清除率减缓，长期可增加动脉壁脂质沉积风险。',
    targetGoal: '总胆固醇 < 5.2 mmol/L，LDL-C < 3.4 mmol/L',
  },
];

export const MEDICAL_IMAGING_ITEMS: MedicalImagingItem[] = [
  {
    id: 'liver-us',
    title: '肝脏 (超声)',
    modality: '彩色多普勒超声',
    statusLabel: '轻度回声增强',
    severity: 'caution',
    finding: '肝脏形态正常，实质见细密点状轻度回声增强，肝内胆管无扩张。',
    aiConfidence: '98.4%',
    organId: 'liver',
  },
  {
    id: 'gastroscopy',
    title: '胃镜',
    modality: '高清电子胃镜',
    statusLabel: '轻度炎症',
    severity: 'caution',
    finding: '胃窦部黏膜见散在条状轻度充血水肿，蠕动良好，幽门开闭正常。',
    aiConfidence: '97.8%',
    organId: 'stomach',
  },
  {
    id: 'colonoscopy',
    title: '肠镜',
    modality: '高清结肠内镜',
    statusLabel: '正常',
    severity: 'normal',
    finding: '回盲瓣至直肠黏膜光滑柔软，血管纹理清晰，未见息肉或溃疡病灶。',
    aiConfidence: '99.1%',
    organId: 'kidneys',
  },
];

export const TREND_6M_DATA: TrendDataPoint[] = [
  { month: '6月', systolicBp: 145, diastolicBp: 94, cholesterol: 6.1, weightKg: 78.2, healthScore: 79 },
  { month: '7月', systolicBp: 138, diastolicBp: 89, cholesterol: 5.9, weightKg: 77.4, healthScore: 81 },
  { month: '8月', systolicBp: 135, diastolicBp: 88, cholesterol: 5.8, weightKg: 76.9, healthScore: 83 },
  { month: '9月', systolicBp: 139, diastolicBp: 90, cholesterol: 5.9, weightKg: 76.5, healthScore: 82 },
  { month: '10月', systolicBp: 141, diastolicBp: 91, cholesterol: 5.7, weightKg: 76.0, healthScore: 85 },
  { month: '11月', systolicBp: 142, diastolicBp: 92, cholesterol: 5.8, weightKg: 76.2, healthScore: 86 },
];

export const ACTION_PLANS: ActionPlanItem[] = [
  {
    id: 'exercise',
    title: '运动建议',
    shortDesc: '每周 ≥ 150 分钟中等强度运动',
    targetTag: '心率区间 115–135 次/分',
    summary: '建议每周执行 5 次中等强度有氧训练（快走、慢跑、骑行或游泳），每次 30–40 分钟，配合每周 2 次下肢抗阻训练。',
    advice: '避免清晨起床后空腹剧烈运动，建议在傍晚 17:00–19:30 心血管适应性最佳时段运动。',
    scoreGain: 3,
    weeklyChecklist: [
      '完成 5 次 × 30 分钟中等强度快走或慢跑',
      '运动心率维持在 115–135 次/分燃脂降压区间',
      '每坐满 60 分钟起身活动拉伸 3 分钟',
    ],
  },
  {
    id: 'diet',
    title: '饮食建议',
    shortDesc: '控制油脂、减少高盐高糖摄入',
    targetTag: '每日限盐 < 5g · DASH 膳食',
    summary: '采用得舒（DASH）与地中海融合饮食：每日食盐 < 5g，烹调油 ≤ 25g，主食 1/3 替换为燕麦、糙米或杂豆。',
    advice: '戒除含糖茶饮与宵夜，每周食用深海鱼 2 次，每日保证 500g 深色绿叶蔬菜以补充钾镁离子。',
    scoreGain: 3,
    weeklyChecklist: [
      '每日钠盐摄入控制在 5g 以内，避开腌制与重油外卖',
      '晚餐主食减半并替换为全谷物杂粮',
      '零含糖饮料、零酒精摄入',
    ],
  },
  {
    id: 'sleep',
    title: '作息建议',
    shortDesc: '保证 7~8 小时高质量睡眠',
    targetTag: '23:00 前入睡 · 稳压护肝',
    summary: '夜间睡眠不足会持续激活交感神经并升高清晨血压。建议固定 23:00 前入睡，确保 7–8 小时连续睡眠。',
    advice: '睡前 45 分钟关闭强蓝光电子屏，可配合 5 分钟腹式慢呼吸（4秒吸气-6秒呼气）辅助降压。',
    scoreGain: 2,
    weeklyChecklist: [
      '23:00 前上床入睡，起床时间波动不超过 30 分钟',
      '睡前执行 5 分钟慢速腹式呼吸放松',
      '午间小憩控制在 20 分钟以内',
    ],
  },
  {
    id: 'followup',
    title: '复查计划',
    shortDesc: '3个月后复查血压、血脂、肝功能',
    targetTag: '节点：2027-02-19',
    summary: '针对本次检出的 3 项关注/风险项，建立 12 周动态随访节点，评估生活方式干预后的逆转成效。',
    advice: '复查前 3 天保持日常饮食，检查当日空腹 10–12 小时抽血检验血脂四项与肝功能。',
    scoreGain: 1,
    weeklyChecklist: [
      '每周至少 3 天早晚测量并记录家庭自测血压',
      '预约 2027 年 2 月血脂四项与肝脏受控衰减超声',
      '满 6 个月跟进消化内科胃镜随访建议',
    ],
  },
];

/**
 * Pure calculation utilities (unit-tested via node:test)
 */
export function calculateProjectedScore(
  baseScore: number,
  completedPlanIds: ReadonlyArray<ActionPlanItem['id']>
): number {
  const uniqueIds = new Set(completedPlanIds);
  let bonus = 0;
  for (const plan of ACTION_PLANS) {
    if (uniqueIds.has(plan.id)) {
      bonus += plan.scoreGain;
    }
  }
  return Math.min(99, Math.max(0, baseScore + bonus));
}

export function getHealthGradeInfo(score: number): {
  grade: '优秀' | '良好' | '一般' | '需改善';
  segmentIndex: 0 | 1 | 2 | 3;
  pointerPercent: number;
} {
  const clamped = Math.min(100, Math.max(0, score));
  if (clamped >= 90) {
    return { grade: '优秀', segmentIndex: 3, pointerPercent: Math.min(96, 78 + ((clamped - 90) / 10) * 18) };
  }
  if (clamped >= 80) {
    return { grade: '良好', segmentIndex: 3, pointerPercent: 76 + ((clamped - 80) / 10) * 14 };
  }
  if (clamped >= 65) {
    return { grade: '一般', segmentIndex: 2, pointerPercent: 52 + ((clamped - 65) / 15) * 20 };
  }
  return { grade: '需改善', segmentIndex: 0, pointerPercent: Math.max(8, (clamped / 65) * 45) };
}

export function filterOrgansBySeverity(
  filter: 'all' | 'attention'
): OrganRecord[] {
  const list = ORGAN_ORDER.map((id) => ORGAN_RECORDS[id]);
  if (filter === 'attention') {
    return list.filter((item) => item.severity !== 'normal');
  }
  return list;
}

export function isTapGesture(
  downX: number,
  downY: number,
  upX: number,
  upY: number,
  maxDistancePx = 6
): boolean {
  const dist = Math.hypot(upX - downX, upY - downY);
  return dist <= maxDistancePx;
}

export function getStageMaterialPreset(mode: StageMode): {
  shellOpacity: number;
  muscularOpacity: number;
  wireOpacity: number;
  skeletonOpacity: number;
  vascularOpacity: number;
  visceralOpacity: number;
  isAtlasPbr: boolean;
} {
  switch (mode) {
    case 'overview':
      return {
        shellOpacity: 0.44,
        muscularOpacity: 0.0,
        wireOpacity: 0.05,
        skeletonOpacity: 0.22,
        vascularOpacity: 0.34,
        visceralOpacity: 0.12,
        isAtlasPbr: false,
      };
    case 'atlas':
      return {
        shellOpacity: 0.16,
        muscularOpacity: 0.26,
        wireOpacity: 0.0,
        skeletonOpacity: 0.94,
        vascularOpacity: 0.92,
        visceralOpacity: 0.72,
        isAtlasPbr: true,
      };
    case 'systems':
      return {
        shellOpacity: 0.14,
        muscularOpacity: 0.18,
        wireOpacity: 0.08,
        skeletonOpacity: 0.56,
        vascularOpacity: 0.78,
        visceralOpacity: 0.44,
        isAtlasPbr: false,
      };
    case 'xray':
      return {
        shellOpacity: 0.08,
        muscularOpacity: 0.0,
        wireOpacity: 0.15,
        skeletonOpacity: 0.86,
        vascularOpacity: 0.92,
        visceralOpacity: 0.24,
        isAtlasPbr: false,
      };
  }
}

export function getDefaultLayersForMode(
  mode: StageMode
): Record<BodyVistaLayerKey, BodyVistaLayerLevel> {
  switch (mode) {
    case 'overview':
      return { skin: 2, muscular: 0, skeletal: 1, vascular: 2, visceral: 3 };
    case 'atlas':
      return { skin: 1, muscular: 2, skeletal: 3, vascular: 3, visceral: 3 };
    case 'systems':
      return { skin: 1, muscular: 1, skeletal: 2, vascular: 3, visceral: 3 };
    case 'xray':
      return { skin: 1, muscular: 0, skeletal: 3, vascular: 3, visceral: 3 };
  }
}

export function layerLevelToOpacity(
  key: BodyVistaLayerKey,
  level: BodyVistaLayerLevel,
  mode: StageMode
): number {
  if (level === 0) return 0;
  if (key === 'skin') {
    if (level === 1) return mode === 'xray' ? 0.07 : 0.14;
    if (level === 2) return 0.42;
    return 0.78;
  }
  if (key === 'muscular') {
    return [0, 0.14, 0.34, 0.86][level];
  }
  return [0, 0.16, 0.52, 0.94][level];
}

/**
 * Mirrors BodyVista's updateSection() local clipping plane constant calculation.
 * Returns null when sectionPercent <= 0 (clipping disabled).
 */
export function computeClippingPlaneConstant(
  percent: number,
  minBound: number,
  maxBound: number
): number | null {
  const clamped = Math.min(100, Math.max(0, percent));
  if (clamped <= 0) return null;
  const start = maxBound + 0.02;
  const end = minBound - 0.02;
  return start + (end - start) * (clamped / 100);
}

/**
 * Mirrors BodyVista's radial anatomical explode displacement around torso core.
 */
export function computeExplodeOffset(
  basePos: readonly [number, number, number],
  explodePercent: number
): [number, number, number] {
  const t = Math.min(100, Math.max(0, explodePercent)) / 100;
  if (t <= 0) return [0, 0, 0];
  const [bx, by, bz] = basePos;
  const radialX = Math.abs(bx) < 0.02 ? 0 : Math.sign(bx) * (0.09 + Math.abs(bx) * 1.35);
  const verticalY = (by - 0.55) * 0.24;
  const depthZ = (bz + 0.03) * 1.45;
  return [radialX * t, verticalY * t, depthZ * t];
}

