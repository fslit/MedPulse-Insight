import { HealthSeverity, OrganId } from './healthModel';

export type NebulaCategoryTab = 'pathology' | 'organ_load' | 'microbe' | 'food_mineral';

export type PathologyGradeCode = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6-E7';

export type OrganLoadDegree = '正常' | '轻' | '中' | '重';

export type MicrobeStateLabel = '无' | '少量' | '存在' | '明显存在' | '超标';

export interface CellEnergyLevelSpec {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  code: string;
  shapeName: 'hex_light' | 'hex_bright' | 'tri_up' | 'tri_down' | 'diamond' | 'square_black';
  label: string;
  shortLabel: string;
  clinicalMeaning: string;
  fillHex: string;
  strokeHex: string;
  isAbnormalFocus: boolean;
}

/**
 * Official 6-tier cellular energy activity symbols from NebulaByte YSY Report Pages 3–15.
 */
export const CELL_ENERGY_LEVELS: ReadonlyArray<CellEnergyLevelSpec> = [
  {
    level: 1,
    code: '1级',
    shapeName: 'hex_light',
    label: '低能耗、高效能细胞（或潜伏代偿）',
    shortLabel: '1级 潜伏/高效',
    clinicalMeaning: '静息低代谢或早期功能代偿状态',
    fillHex: '#fef9c3',
    strokeHex: '#52525b',
    isAbnormalFocus: false,
  },
  {
    level: 2,
    code: '2级',
    shapeName: 'hex_bright',
    label: '最佳活性状态的细胞',
    shortLabel: '2级 最佳活性',
    clinicalMeaning: '线粒体供能充沛，组织稳态优良',
    fillHex: '#facc15',
    strokeHex: '#b45309',
    isAbnormalFocus: false,
  },
  {
    level: 3,
    code: '3级',
    shapeName: 'tri_up',
    label: '功能特性和年龄相吻合的细胞',
    shortLabel: '3级 年龄吻合',
    clinicalMeaning: '与受检者生理年龄匹配的常态细胞',
    fillHex: '#fb923c',
    strokeHex: '#9a3412',
    isAbnormalFocus: false,
  },
  {
    level: 4,
    code: '4级',
    shapeName: 'tri_down',
    label: '活性下降，亚健康状态的细胞',
    shortLabel: '4级 活性下降',
    clinicalMeaning: '能量代谢减退、微循环灌注偏低',
    fillHex: '#2563eb',
    strokeHex: '#dc2626',
    isAbnormalFocus: false,
  },
  {
    level: 5,
    code: '5级',
    shapeName: 'diamond',
    label: '活性差，功能轻微异常的细胞',
    shortLabel: '5级 轻微异常',
    clinicalMeaning: '细胞膜电位失衡、黏膜或间质受累',
    fillHex: '#18181b',
    strokeHex: '#06b6d4',
    isAbnormalFocus: true,
  },
  {
    level: 6,
    code: '6级',
    shapeName: 'square_black',
    label: '活性极差，功能异常的细胞',
    shortLabel: '6级 高熵异常(黑块)',
    clinicalMeaning: '高熵值能量耗竭灶，需优先靶向修复与医学复核',
    fillHex: '#09090b',
    strokeHex: '#f8fafc',
    isAbnormalFocus: true,
  },
];

/**
 * Official Page 16 Pathology Morphology D-value Grading (Forward Risk Scale: Higher D = Higher Risk).
 */
export function classifyPathologyDValue(dValue: number): {
  grade: PathologyGradeCode;
  attentionLabel: '低关注' | '中等关注' | '中高关注' | '高关注';
  severity: HealthSeverity;
} {
  if (dValue < 0.425) {
    return { grade: 'E1', attentionLabel: '低关注', severity: 'normal' };
  }
  if (dValue <= 0.759) {
    return { grade: 'E2', attentionLabel: '低关注', severity: 'normal' };
  }
  if (dValue <= 2.0) {
    return { grade: 'E3', attentionLabel: '低关注', severity: 'normal' };
  }
  if (dValue <= 3.99) {
    return { grade: 'E4', attentionLabel: '中等关注', severity: 'caution' };
  }
  if (dValue <= 5.0) {
    return { grade: 'E5', attentionLabel: '中高关注', severity: 'caution' };
  }
  return { grade: 'E6-E7', attentionLabel: '高关注', severity: 'alert' };
}

/**
 * Official Page 16 Organ/Tissue Load D-value Grading (Forward Risk Scale: Higher D = Heavier Load).
 */
export function classifyOrganTissueDValue(dValue: number): {
  degree: OrganLoadDegree;
  degreeBadge: string;
  severity: HealthSeverity;
} {
  if (dValue < 1.0) {
    return { degree: '正常', degreeBadge: '稳态 (<1.0)', severity: 'normal' };
  }
  if (dValue <= 1.2) {
    return { degree: '轻', degreeBadge: '轻度负荷', severity: 'normal' };
  }
  if (dValue <= 2.0) {
    return { degree: '中', degreeBadge: '中度负荷', severity: 'caution' };
  }
  return { degree: '重', degreeBadge: '重度负荷', severity: 'alert' };
}

/**
 * Official Page 16 Microorganisms & Helminths D-value Grading (Forward Scale: >2.0 = 超标).
 */
export function classifyMicrobeDValue(dValue: number): {
  stateLabel: MicrobeStateLabel;
  severity: HealthSeverity;
} {
  if (dValue < 0.1) {
    return { stateLabel: '无', severity: 'normal' };
  }
  if (dValue <= 0.425) {
    return { stateLabel: '少量', severity: 'normal' };
  }
  if (dValue <= 0.759) {
    return { stateLabel: '存在', severity: 'normal' };
  }
  if (dValue <= 2.0) {
    return { stateLabel: '明显存在', severity: 'caution' };
  }
  return { stateLabel: '超标', severity: 'alert' };
}

/**
 * Official Page 60 Food Therapy D-value Grading (Reverse Compatibility Scale: Lower D = More Suitable!).
 */
export function classifyFoodTherapyDValue(dValue: number): {
  suitabilityLabel: string;
  tier: 'top' | 'recommended' | 'moderate';
} {
  if (dValue <= 0.015) {
    return { suitabilityLabel: '极高契合 · 每日优选', tier: 'top' };
  }
  if (dValue <= 0.035) {
    return { suitabilityLabel: '高契合 · 轮换摄入', tier: 'recommended' };
  }
  return { suitabilityLabel: '温和适配', tier: 'moderate' };
}

export interface NebulaScanStagePoint {
  courseNo: number;
  stageLabel: string;
  scanDate: string;
  dValue: number;
}

export interface EnergyScatterNode {
  x: number;
  y: number;
  baselineLevel: 1 | 2 | 3 | 4 | 5 | 6;
  course1Level: 1 | 2 | 3 | 4 | 5 | 6;
  course2Level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface OrganEnergyCluster {
  id: string;
  title: string;
  shortTitle: string;
  organId: OrganId;
  organLabel: string;
  pdfPages: string;
  sliceNames: string[];
  summaryNote: string;
  /** Counts of [L1, L2, L3, L4, L5, L6] points across scan stages */
  stageDistributions: {
    courseNo: number;
    stageLabel: string;
    counts: [number, number, number, number, number, number];
  }[];
  scatterPreviewNodes: EnergyScatterNode[];
}

export interface DeduplicatedPathologyItem {
  id: string;
  name: string;
  organId: OrganId;
  organLabel: string;
  mergedSlicesCount: number;
  peakSliceName: string;
  pdfPages: string;
  clinicalInterpretation: string;
  matchedDrugNames: string[];
  matchedProductNames: string[];
  coursePoints: NebulaScanStagePoint[];
}

export interface DeduplicatedOrganLoadItem {
  id: string;
  tissueName: string;
  organId: OrganId;
  organLabel: string;
  mergedSlicesCount: number;
  peakSliceName: string;
  pdfPages: string;
  functionalNote: string;
  matchedProductNames: string[];
  coursePoints: NebulaScanStagePoint[];
}

export interface DeduplicatedMicrobeItem {
  id: string;
  agentName: string;
  ecologicalNiche: string;
  organId: OrganId;
  mergedSlicesCount: number;
  pdfPages: string;
  clinicalVerificationTip: string;
  matchedProductNames: string[];
  coursePoints: NebulaScanStagePoint[];
}

export interface FoodTherapyRecommendation {
  name: string;
  dValue: number;
  targetBenefit: string;
  elderlyMealTip: string;
}

export interface MineralResonanceItem {
  name: string;
  dValue: number;
  note: string;
}

export interface NebulaImportArchitectureRule {
  stepNo: string;
  title: string;
  rawPainPoint: string;
  transformedPresentation: string;
}

export interface NebulaImportedReport {
  reportId: string;
  patientId: string;
  patientName: string;
  gender: '女' | '男' | '通用';
  age: number;
  baselineScanDate: string;
  deviceSystemName: string;
  rawPdfPath: string;
  rawPagesCount: number;
  rawEnergySlicesCount: number;
  rawTableRowsCount: number;
  mergedFocusClustersCount: number;
  complianceDisclaimer: string;
  scanStages: ReadonlyArray<{
    courseNo: number;
    stageLabel: string;
    scanDate: string;
    regimenHeadline: string;
  }>;
  organEnergyClusters: OrganEnergyCluster[];
  pathologyItems: DeduplicatedPathologyItem[];
  organLoadItems: DeduplicatedOrganLoadItem[];
  microbeItems: DeduplicatedMicrobeItem[];
  foodTherapyItems: FoodTherapyRecommendation[];
  mineralItems: MineralResonanceItem[];
  architectureRules: NebulaImportArchitectureRule[];
}

/**
 * Exact structured extraction & longitudinal course re-scan trajectory for
 * 陈小真 (女 · 74岁 · 2026/08/23 NebulaByte YSY 60-page PDF `/assets/aistudio/___20260823_121427____7df06df2.pdf`).
 */
export const CHEN_XIAOZHEN_NEBULA_REPORT: NebulaImportedReport = {
  reportId: 'YSY-20260823-121427',
  patientId: 'pat-chenxiaozhen',
  patientName: '陈小真',
  gender: '女',
  age: 74,
  baselineScanDate: '2026-08-23',
  deviceSystemName: '云尚云时代 · AI数智智康 NebulaByte YSY 生命科学检测仪',
  rawPdfPath: '/assets/aistudio/___20260823_121427____7df06df2.pdf',
  rawPagesCount: 60,
  rawEnergySlicesCount: 49,
  rawTableRowsCount: 142,
  mergedFocusClustersCount: 5,
  complianceDisclaimer:
    '合规边界（源自原报告第2页声明）：NebulaByte YSY 属生命科学电子评估设备（非临床医疗诊断证明），大屏将其作为「细胞能量预警与干预前后跨期复测对比轨」，与门诊医学检验（胃镜/呼气试验/生化骨密）双轨互证讲解。',
  scanStages: [
    {
      courseNo: 0,
      stageLabel: '初检独立基线（原件导入）',
      scanDate: '2026-08-23',
      regimenHeadline: '原版 60 页 PDF 首检基线（尚未启动药物、益生菌与食疗干预）',
    },
    {
      courseNo: 1,
      stageLabel: '第1疗程结案复测（45天）',
      scanDate: '2026-10-07',
      regimenHeadline:
        '药名：瑞巴派特片(膜固思达)+达喜+辅酶Q10+骨化三醇｜品名：太空晶球益生菌+优康力+马鹿骨',
    },
    {
      courseNo: 2,
      stageLabel: '第2疗程跨期复测（第6周）',
      scanDate: '2026-11-18',
      regimenHeadline:
        '药名：达喜停药·瑞巴派特减半+辅酶Q10+骨化三醇｜品名：护肝菌+太空晶球益生菌+优康力+马鹿骨',
    },
  ],
  organEnergyClusters: [
    {
      id: 'cluster-gastro',
      title: '胃前后壁 · 幽门与小肠黏膜切面簇',
      shortTitle: '胃肠与幽门',
      organId: 'stomach',
      organLabel: '胃部/消化道',
      pdfPages: '第 4–5 页、第 18–25 页',
      sliceNames: ['胃部後壁', '胃部前壁', '腹部第一腰椎截面', '小肠', '直肠'],
      summaryNote:
        '初检胃后壁与前壁小弯、幽门区密集出现 16 处 6级黑色方块(■)与 11 处 5级菱形(◆)，2个疗程护膜与太空晶球益生菌定植后 6级黑块清零。',
      stageDistributions: [
        { courseNo: 0, stageLabel: '初检基线', counts: [4, 9, 14, 18, 11, 16] },
        { courseNo: 1, stageLabel: '第1疗程结案', counts: [6, 18, 24, 15, 6, 3] },
        { courseNo: 2, stageLabel: '第2疗程复测', counts: [8, 29, 24, 9, 2, 0] },
      ],
      scatterPreviewNodes: [
        { x: 48, y: 24, baselineLevel: 4, course1Level: 3, course2Level: 2 },
        { x: 56, y: 34, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 62, y: 44, baselineLevel: 6, course1Level: 5, course2Level: 3 },
        { x: 52, y: 48, baselineLevel: 6, course1Level: 4, course2Level: 2 },
        { x: 44, y: 54, baselineLevel: 5, course1Level: 3, course2Level: 2 },
        { x: 58, y: 58, baselineLevel: 6, course1Level: 5, course2Level: 3 },
        { x: 64, y: 68, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 49, y: 72, baselineLevel: 5, course1Level: 4, course2Level: 2 },
        { x: 36, y: 66, baselineLevel: 4, course1Level: 3, course2Level: 2 },
        { x: 30, y: 76, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 72, y: 32, baselineLevel: 2, course1Level: 2, course2Level: 2 },
        { x: 74, y: 50, baselineLevel: 3, course1Level: 2, course2Level: 2 },
      ],
    },
    {
      id: 'cluster-bone-nerve',
      title: '透明软骨 · 椎脊神经与腰髋骨关节簇',
      shortTitle: '软骨与脊神经',
      organId: 'bone',
      organLabel: '骨骼与关节',
      pdfPages: '第 10–15 页、第 45–59 页',
      sliceNames: ['透明软骨切片#1', '软骨细胞#1', '粗面内质网#1', '椎脊神经左视图', '第五腰椎', '右髋/右肩'],
      summaryNote:
        '74岁高龄退变核心灶：透明软骨、软骨细胞及神经束初检出现 22 处 6级黑块(■)，经骨化三醇+马鹿骨干预后显著向 3–4级稳态回迁。',
      stageDistributions: [
        { courseNo: 0, stageLabel: '初检基线', counts: [5, 8, 12, 19, 14, 22] },
        { courseNo: 1, stageLabel: '第1疗程结案', counts: [6, 15, 21, 20, 11, 7] },
        { courseNo: 2, stageLabel: '第2疗程复测', counts: [7, 23, 28, 15, 5, 2] },
      ],
      scatterPreviewNodes: [
        { x: 32, y: 26, baselineLevel: 6, course1Level: 5, course2Level: 3 },
        { x: 48, y: 28, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 66, y: 30, baselineLevel: 6, course1Level: 5, course2Level: 4 },
        { x: 38, y: 46, baselineLevel: 5, course1Level: 4, course2Level: 3 },
        { x: 54, y: 48, baselineLevel: 6, course1Level: 6, course2Level: 4 },
        { x: 70, y: 50, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 30, y: 66, baselineLevel: 5, course1Level: 3, course2Level: 2 },
        { x: 46, y: 68, baselineLevel: 6, course1Level: 5, course2Level: 4 },
        { x: 62, y: 72, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 50, y: 82, baselineLevel: 4, course1Level: 3, course2Level: 2 },
      ],
    },
    {
      id: 'cluster-hepatobiliary',
      title: '胆囊 · 总胆管与肝脏后视胰腺簇',
      shortTitle: '胆囊与肝胰',
      organId: 'liver',
      organLabel: '肝脏/胆胰',
      pdfPages: '第 4–5 页、第 22 页、第 26–27 页',
      sliceNames: ['胆囊', '肝脏後视图', '胰腺胰岛B细胞#1', '肠系膜上动脉与门静脉'],
      summaryNote:
        '原报告第5页胆囊体部呈密集 6级黑块(■)与 5级菱形(◆)聚集（总胆管 D=3.169 重），第2疗程叠加护肝菌后胆汁淤积高熵点大幅消散。',
      stageDistributions: [
        { courseNo: 0, stageLabel: '初检基线', counts: [3, 10, 15, 16, 10, 11] },
        { courseNo: 1, stageLabel: '第1疗程结案', counts: [5, 15, 20, 15, 6, 4] },
        { courseNo: 2, stageLabel: '第2疗程复测', counts: [6, 26, 22, 8, 2, 1] },
      ],
      scatterPreviewNodes: [
        { x: 58, y: 24, baselineLevel: 6, course1Level: 5, course2Level: 3 },
        { x: 52, y: 34, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 46, y: 44, baselineLevel: 6, course1Level: 5, course2Level: 3 },
        { x: 40, y: 54, baselineLevel: 5, course1Level: 4, course2Level: 2 },
        { x: 36, y: 62, baselineLevel: 5, course1Level: 3, course2Level: 2 },
        { x: 64, y: 38, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 56, y: 50, baselineLevel: 5, course1Level: 4, course2Level: 2 },
        { x: 68, y: 66, baselineLevel: 3, course1Level: 2, course2Level: 2 },
      ],
    },
    {
      id: 'cluster-cardio-vascular',
      title: '心脏前壁 · 传导系统与躯干主动脉簇',
      shortTitle: '心脏与血管',
      organId: 'heart',
      organLabel: '心脏/血管',
      pdfPages: '第 6–9 页、第 29–31 页、第 38–41 页',
      sliceNames: ['心脏前壁', '心脏;前视图', '心脏传导系统细胞学#1', '躯干主要血管'],
      summaryNote:
        '心脏前壁冠脉左前降支沿线呈成串 5级青边菱形(◆)，左心房与心肌组织负荷 >2.5(重)，经辅酶Q10+优康力护航后恢复 2–3级黄橙稳态。',
      stageDistributions: [
        { courseNo: 0, stageLabel: '初检基线', counts: [8, 12, 16, 20, 13, 3] },
        { courseNo: 1, stageLabel: '第1疗程结案', counts: [9, 20, 22, 15, 5, 1] },
        { courseNo: 2, stageLabel: '第2疗程复测', counts: [10, 28, 23, 9, 2, 0] },
      ],
      scatterPreviewNodes: [
        { x: 50, y: 26, baselineLevel: 3, course1Level: 3, course2Level: 2 },
        { x: 60, y: 42, baselineLevel: 5, course1Level: 4, course2Level: 3 },
        { x: 64, y: 52, baselineLevel: 5, course1Level: 4, course2Level: 3 },
        { x: 68, y: 62, baselineLevel: 5, course1Level: 3, course2Level: 2 },
        { x: 62, y: 70, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 42, y: 54, baselineLevel: 2, course1Level: 2, course2Level: 2 },
        { x: 46, y: 68, baselineLevel: 4, course1Level: 3, course2Level: 2 },
        { x: 36, y: 62, baselineLevel: 3, course1Level: 2, course2Level: 2 },
      ],
    },
    {
      id: 'cluster-brain-eye-lung',
      title: '大脑六维动脉 · 左眼与支气管呼吸簇',
      shortTitle: '脑动脉与肺眼',
      organId: 'brain',
      organLabel: '大脑/感官/肺',
      pdfPages: '第 3、6–8、12 页、第 17、32–37、50 页',
      sliceNames: ['大脑动脉顶/底/左右侧视(6幅)', '左眼', '主干肩关节截面(肺)', '喉气管冠状面'],
      summaryNote:
        '脑动脉 6 幅切面以 4级倒三角(▼)为主（神经血管 D=4.198 E5），左眼白内障与肩横截面肺气肿呈 E7 高关注预警，提示老年微循环综合养护。',
      stageDistributions: [
        { courseNo: 0, stageLabel: '初检基线', counts: [4, 11, 22, 29, 6, 4] },
        { courseNo: 1, stageLabel: '第1疗程结案', counts: [5, 18, 28, 20, 4, 1] },
        { courseNo: 2, stageLabel: '第2疗程复测', counts: [6, 25, 31, 12, 2, 0] },
      ],
      scatterPreviewNodes: [
        { x: 38, y: 30, baselineLevel: 4, course1Level: 3, course2Level: 2 },
        { x: 58, y: 30, baselineLevel: 4, course1Level: 3, course2Level: 3 },
        { x: 34, y: 48, baselineLevel: 4, course1Level: 4, course2Level: 3 },
        { x: 64, y: 48, baselineLevel: 5, course1Level: 4, course2Level: 3 },
        { x: 48, y: 56, baselineLevel: 4, course1Level: 3, course2Level: 2 },
        { x: 40, y: 70, baselineLevel: 6, course1Level: 4, course2Level: 3 },
        { x: 60, y: 70, baselineLevel: 4, course1Level: 3, course2Level: 2 },
      ],
    },
  ],
  pathologyItems: [
    {
      id: 'path-spine-deform',
      name: '脊椎变形 / 铁曼病（老年软骨退变）',
      organId: 'bone',
      organLabel: '骨骼关节',
      mergedSlicesCount: 2,
      peakSliceName: '粗面内质网 - 细胞学研制 #1',
      pdfPages: 'P55',
      clinicalInterpretation: '全报告最高病理 D 值（11.434 / 10.933），对应老年脊柱退行性侧弯与肋胸软骨营养不良。',
      matchedDrugNames: ['骨化三醇胶丸（罗盖全）'],
      matchedProductNames: ['马鹿骨'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 11.434 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 7.450 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 4.820 },
      ],
    },
    {
      id: 'path-gastric-ulcer',
      name: '慢性胃溃疡（伴卡他性胃炎）',
      organId: 'stomach',
      organLabel: '胃部黏膜',
      mergedSlicesCount: 3,
      peakSliceName: '腹部第一腰椎截面 / 胃前后壁',
      pdfPages: 'P18, P20, P21',
      clinicalInterpretation: '腹腰椎截面 D=11.038、胃后壁 6.624、胃前壁 6.492 连续三切面 E7 高关注，提示胃窦幽门黏膜糜烂受损。',
      matchedDrugNames: ['瑞巴派特片（膜固思达）', '铝碳酸镁咀嚼片（达喜）'],
      matchedProductNames: ['太空晶球益生菌'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 11.038 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 4.620 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 2.180 },
      ],
    },
    {
      id: 'path-enterocolitis',
      name: '肠炎 / 结肠炎 / 直肠炎综合征',
      organId: 'stomach',
      organLabel: '大小肠屏障',
      mergedSlicesCount: 5,
      peakSliceName: '小肠 / 直肠切面',
      pdfPages: 'P18, P23, P25',
      clinicalInterpretation: '肠炎(10.620)、结肠炎(9.993)、直肠炎(8.835)、结肠运动障碍(6.847)同轴高发，反映老年肠漏与蠕动紊乱。',
      matchedDrugNames: ['瑞巴派特片（膜固思达）'],
      matchedProductNames: ['太空晶球益生菌', '优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 10.620 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 4.350 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.890 },
      ],
    },
    {
      id: 'path-eye-cataract',
      name: '左眼白内障 / 青光眼微循环预警',
      organId: 'brain',
      organLabel: '头面感官',
      mergedSlicesCount: 2,
      peakSliceName: '左眼切面',
      pdfPages: 'P50',
      clinicalInterpretation: '白内障 D=8.885(E7)、青光眼 D=5.973(E7)，建议结合眼科裂隙灯与眼压常规随访，强化花青素抗氧化食疗。',
      matchedDrugNames: [],
      matchedProductNames: ['优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 8.885 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 6.410 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 4.760 },
      ],
    },
    {
      id: 'path-emphysema',
      name: '肺气肿 / 慢性支气管粘膜炎',
      organId: 'lungs',
      organLabel: '呼吸系统',
      mergedSlicesCount: 2,
      peakSliceName: '主干肩关节水平横向截面',
      pdfPages: 'P17',
      clinicalInterpretation: '肺气肿 D=5.917(E7 高)、慢支粘膜炎 D=3.855(E4 中)，提示老年气道纤毛清除力与肺泡弹性减退。',
      matchedDrugNames: [],
      matchedProductNames: ['优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 5.917 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 4.180 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 2.950 },
      ],
    },
    {
      id: 'path-neurovascular',
      name: '全身多切面神经血管疾病（心脑血管硬化）',
      organId: 'vascular',
      organLabel: '心脑血管轴',
      mergedSlicesCount: 18,
      peakSliceName: '腹主动脉截面(5.177) / 心脏前视(4.723) / 脑动脉(4.198)',
      pdfPages: 'P17–18, P24, P29–41, P45–56',
      clinicalInterpretation: '原 PDF 散落在 18 个切面重复打印，系统自动归并为 1 条主干血管内皮硬化负荷线，便于跨期追踪。',
      matchedDrugNames: ['辅酶Q10软胶囊（能气朗）'],
      matchedProductNames: ['优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 5.177 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 3.640 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 2.380 },
      ],
    },
    {
      id: 'path-splenomegaly',
      name: '脾脏免疫代谢负荷（脾肿大倾向）',
      organId: 'liver',
      organLabel: '肝脾免疫',
      mergedSlicesCount: 2,
      peakSliceName: '腹部第一腰椎截面 / 脾切面',
      pdfPages: 'P18, P42',
      clinicalInterpretation: 'D=3.279 / 2.715（E4 中等关注），与慢性肠道炎症及EB/巨细胞病毒谐振背景相关。',
      matchedDrugNames: [],
      matchedProductNames: ['护肝菌', '太空晶球益生菌'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 3.279 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 2.410 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.680 },
      ],
    },
    {
      id: 'path-osteoporosis',
      name: '全身多部位骨质疏松症',
      organId: 'bone',
      organLabel: '中轴与四肢骨',
      mergedSlicesCount: 6,
      peakSliceName: '第五腰椎(2.628) / 右髋(2.502) / 右肩(2.494) / 股骨(2.422)',
      pdfPages: 'P51–52, P56–59',
      clinicalInterpretation: '腰椎、髋、肩、上臂、骨盆、股骨 6 大承重部位全部呈 E4 中等关注，指引预防老年跌倒骨折。',
      matchedDrugNames: ['骨化三醇胶丸（罗盖全）'],
      matchedProductNames: ['马鹿骨'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 2.628 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 2.040 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.560 },
      ],
    },
  ],
  organLoadItems: [
    {
      id: 'org-pancreas',
      tissueName: '胰腺实质与胰岛 B 细胞',
      organId: 'liver',
      organLabel: '肝胆胰轴',
      mergedSlicesCount: 2,
      peakSliceName: '腹部第一腰椎截面(3.688) / 胰岛B细胞(2.307)',
      pdfPages: 'P18, P22',
      functionalNote: '消化酶外分泌与餐后糖调节储备下降（初检双切面均为「重」度负荷）。',
      matchedProductNames: ['太空晶球益生菌', '优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 3.688 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 2.180 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.490 },
      ],
    },
    {
      id: 'org-biliary',
      tissueName: '总胆管与胆囊平滑肌',
      organId: 'liver',
      organLabel: '肝胆代谢',
      mergedSlicesCount: 4,
      peakSliceName: '胆囊切面：总胆管(3.169) / 胆囊(2.038)',
      pdfPages: 'P26, P27',
      functionalNote: '老年胆汁排空迟缓、脂溶性维生素吸收效率偏低，第2疗程重点接入护肝菌疏泄。',
      matchedProductNames: ['护肝菌', '优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 3.169 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 2.340 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.420 },
      ],
    },
    {
      id: 'org-heart-myocardium',
      tissueName: '左心房 · 心脏整体与心肌',
      organId: 'heart',
      organLabel: '心血管系',
      mergedSlicesCount: 6,
      peakSliceName: '心脏前壁：左心房(2.873) / 心脏(2.595) / 心肌(2.587)',
      pdfPages: 'P30, P38',
      functionalNote: '心肌线粒体 ATP 供能偏紧、舒张顺应性减退（初检三项均 >2.2 重度负荷）。',
      matchedProductNames: ['优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 2.873 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 1.960 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.380 },
      ],
    },
    {
      id: 'org-pylorus',
      tissueName: '胃窦幽门括约肌与直肠黏膜',
      organId: 'stomach',
      organLabel: '消化管道',
      mergedSlicesCount: 5,
      peakSliceName: '腹部截面幽门(2.811) / 胃前后壁幽门(1.647)',
      pdfPages: 'P18, P20–21, P23, P25',
      functionalNote: '与慢性胃溃疡及幽门螺杆菌信号互为印证，经膜固思达+太空晶球益生菌修复后率先降至轻度。',
      matchedProductNames: ['太空晶球益生菌'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 2.811 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 1.540 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.080 },
      ],
    },
    {
      id: 'org-hypothalamus',
      tissueName: '脑室黏膜鞘膜与下丘脑节律中枢',
      organId: 'brain',
      organLabel: '神经内分泌',
      mergedSlicesCount: 9,
      peakSliceName: '脑室黏膜鞘膜(3.258) / 大脑动脉下丘脑(1.786)',
      pdfPages: 'P18, P20–21, P32–37',
      functionalNote: '大脑动脉 6 切面均提示下丘脑中度负荷（1.365–1.786），关联老年睡眠浅与自主神经波动。',
      matchedProductNames: ['优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 3.258 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 2.150 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.460 },
      ],
    },
    {
      id: 'org-sciatic-disc',
      tissueName: '坐骨神经 · 膝关节软骨与腰椎间盘',
      organId: 'bone',
      organLabel: '骨关节神经',
      mergedSlicesCount: 4,
      peakSliceName: '腰骶丛坐骨神经(1.550) / 膝软骨(1.545) / 腰椎间盘(1.404)',
      pdfPages: 'P45, P48, P51, P59',
      functionalNote: '与患者上下楼梯膝酸、久坐腰沉体感高度一致。',
      matchedProductNames: ['马鹿骨'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 1.550 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 1.280 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.050 },
      ],
    },
  ],
  microbeItems: [
    {
      id: 'mic-gut-dysbiosis',
      agentName: '肠道条件致病菌群失衡簇（变形杆菌 / 屎肠球菌 / 大肠杆菌）',
      ecologicalNiche: '胃前后壁 · 小肠 · 直肠 · 胰腺导管',
      organId: 'stomach',
      mergedSlicesCount: 14,
      pdfPages: 'P18–25, P40, P46–47',
      clinicalVerificationTip:
        '小肠变形杆菌(12.761)、胃后壁屎肠球菌(12.724)、大肠杆菌(5.936)显著超标，反映老年有益双歧/乳杆菌匮乏，最适合高活菌微生态竞争性定植。',
      matchedProductNames: ['太空晶球益生菌', '优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 12.761 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 4.120 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 1.480 },
      ],
    },
    {
      id: 'mic-hpylori',
      agentName: '幽门螺旋杆菌生物谐振信号',
      ecologicalNiche: '腹部幽门截面 · 胃部后壁 · 胃部前壁',
      organId: 'stomach',
      mergedSlicesCount: 3,
      pdfPages: 'P18, P20, P21',
      clinicalVerificationTip:
        '初检幽门区 D=2.883(超标)、胃前后壁 0.913(明显)，建议门诊配合 C13/C14 呼气试验定量核实，并按幽门强化量服用太空晶球益生菌（早7条+晚7条）。',
      matchedProductNames: ['太空晶球益生菌'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 2.883 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 0.710 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 0.340 },
      ],
    },
    {
      id: 'mic-cmv-ebv',
      agentName: '潜伏疱疹病毒家族免疫谐振（巨细胞病毒 / EB病毒）',
      ecologicalNiche: '大脑动脉 · 心脏前壁 · 脾脏 · 甲状腺 · 软骨细胞',
      organId: 'vascular',
      mergedSlicesCount: 18,
      pdfPages: 'P17, P24, P28, P32–44, P50, P54–55',
      clinicalVerificationTip:
        '巨细胞病毒(12.980)与EB病毒(12.739)多切面超标提示高龄细胞免疫监视力偏弱（非急性病毒血症诊断），重在提升优质蛋白与黏膜免疫球蛋白。',
      matchedProductNames: ['优康力', '护肝菌'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 12.980 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 7.250 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 3.420 },
      ],
    },
    {
      id: 'mic-respiratory',
      agentName: '上呼吸道菌群信号（肺炎链球菌 / 布兰汉氏球菌）',
      ecologicalNiche: '主干肩关节肺截面 · 喉气管冠状面',
      organId: 'lungs',
      mergedSlicesCount: 2,
      pdfPages: 'P17, P28',
      clinicalVerificationTip:
        '初检 D=11.678 / 8.709，提示换季注意呼吸道保暖防感、强化呼吸道黏膜屏障营养。',
      matchedProductNames: ['优康力'],
      coursePoints: [
        { courseNo: 0, stageLabel: '初检基线', scanDate: '2026-08-23', dValue: 11.678 },
        { courseNo: 1, stageLabel: '第1疗程结案', scanDate: '2026-10-07', dValue: 5.640 },
        { courseNo: 2, stageLabel: '第2疗程复测', scanDate: '2026-11-18', dValue: 2.150 },
      ],
    },
  ],
  foodTherapyItems: [
    {
      name: '黑枣',
      dValue: 0.003,
      targetBenefit: '果胶护胃黏膜 · 补中益气养血',
      elderlyMealTip: '去核蒸熟每日 2–3 颗，温和不刺激溃疡面',
    },
    {
      name: '南瓜',
      dValue: 0.010,
      targetBenefit: '富含果胶吸附胃酸与菌群毒素 · 护眼叶黄素',
      elderlyMealTip: '早餐蒸南瓜或熬煮南瓜小米粥护幽门',
    },
    {
      name: '香蕉',
      dValue: 0.011,
      targetBenefit: '高钾稳压护心肌 · 水溶性膳食纤维润肠',
      elderlyMealTip: '餐后半根熟透香蕉改善老年结肠慢传输',
    },
    {
      name: '杏果',
      dValue: 0.014,
      targetBenefit: '润肺定喘 · 类胡萝卜素养护气道上皮',
      elderlyMealTip: '少量温食，契合 P17 支气管粘膜养护',
    },
    {
      name: '燕麦粥',
      dValue: 0.017,
      targetBenefit: 'β-葡聚糖养益生菌（益生元） · 稳胆汁胆固醇',
      elderlyMealTip: '软烂温热燕麦粥做早餐基底，减轻胰腺负担',
    },
    {
      name: '梅子',
      dValue: 0.017,
      targetBenefit: '有机酸促胆汁温和排空 · 抑肠道杂菌',
      elderlyMealTip: '胃反酸期少量佐餐，反酸消退后泡温水',
    },
    {
      name: '黑加仑',
      dValue: 0.020,
      targetBenefit: '高浓度花青素靶向改善左眼晶状体与脑微循环',
      elderlyMealTip: '契合 P50 左眼白内障/青光眼微循环防护',
    },
    {
      name: '大蒜（熟食）',
      dValue: 0.023,
      targetBenefit: '大蒜素协同抑制肠道变形杆菌与幽门菌群',
      elderlyMealTip: '老年胃弱忌生吃，炖菜熟食温和抑菌',
    },
    {
      name: '碎荞麦片',
      dValue: 0.028,
      targetBenefit: '芦丁强化毛细血管弹性 · 平稳餐后血糖',
      elderlyMealTip: '与大米/燕麦 1:3 同煮软饭护血管内皮',
    },
    {
      name: '燕麦片',
      dValue: 0.031,
      targetBenefit: '全谷物B族维生素营养周围与坐骨神经',
      elderlyMealTip: '温牛奶或温豆浆冲泡提升钙磷吸收',
    },
  ],
  mineralItems: [
    { name: '玛瑙', dValue: 0.055, note: '生物频谱低D值谐振第1位（舒缓自主神经节律参考）' },
    { name: '锆石', dValue: 0.074, note: '生物频谱谐振第2位' },
    { name: '钻石', dValue: 0.107, note: '生物频谱谐振第3位' },
    { name: '绿宝石', dValue: 0.116, note: '生物频谱谐振第4位' },
    { name: '水晶石', dValue: 0.117, note: '生物频谱谐振第5位' },
  ],
  architectureRules: [
    {
      stepNo: '01',
      title: '60页碎片切面 → 8大3D器官拓扑归并',
      rawPainPoint: '原PDF按49幅局部切面逐页罗列（如神经血管重复打印18页、巨细胞病毒重复15页），74岁老人翻阅极易焦虑迷失。',
      transformedPresentation: '按解剖归属自动聚合去重，提取「全切面峰值D值 + 受累切面数 + 原页码溯源」，一键驱动中央 3D 人体旋转定位。',
    },
    {
      stepNo: '02',
      title: '6级细胞散点图 → 定量能量活性占比条与跨期消退对比',
      rawPainPoint: '原PDF第3–15页仅给静态彩色符号图，无法量化对比调理前后「6级黑块(■)」到底少了多少。',
      transformedPresentation: '统计每器官簇 1–6 级细胞占比，将 5级菱形(◆)与 6级黑块(■)单列为「高熵异常灶」，跨疗程直观展示黑块清零过程。',
    },
    {
      stepNo: '03',
      title: '正向风险D值 vs 反向食疗D值「双标尺防误读」视觉隔离',
      rawPainPoint: '原报告中病理/器官/微生物是「D值越高越严重(>5.0 E7高)」，而第60页食物疗法是「D值越低越适合(0.003最佳)」，极易讲反。',
      transformedPresentation: '风险矩阵采用红琥绿正向预警进度条并标注 E1–E7 / 轻中重，食疗专区采用翡翠绿「低D值契合度排行卡」，彻底杜绝医患误读。',
    },
    {
      stepNo: '04',
      title: '体验报告预警 → 医学检验互证 + 药名/产品品名/食疗三联落地',
      rawPainPoint: '单看生命科学体验报告缺乏临床客观检验锚点与具体调理抓手。',
      transformedPresentation: '将高关注D值项直接对齐「建议门诊复核项（如胃镜/C13）」与「临床药名 + 功能产品品名（太空晶球益生菌/马鹿骨/护肝菌/优康力）+ Top10食疗」。',
    },
  ],
};

/**
 * Computes summary statistics for any given scan course (`0 | 1 | 2`) of a NebulaImportedReport,
 * enabling instant cross-period comparison on the widescreen!
 */
export interface NebulaStageSummaryStats {
  courseNo: number;
  stageLabel: string;
  scanDate: string;
  e6e7HighPathologyCount: number;
  e4e5MediumPathologyCount: number;
  heavyOrganLoadCount: number;
  overLimitMicrobeCount: number;
  totalGrade6BlackSquares: number;
  totalGrade5Diamonds: number;
}

export function summarizeNebulaReportAtStage(
  report: NebulaImportedReport,
  courseNo: number
): NebulaStageSummaryStats {
  const stageMeta =
    report.scanStages.find((s) => s.courseNo === courseNo) ?? report.scanStages[0];

  let e6e7HighPathologyCount = 0;
  let e4e5MediumPathologyCount = 0;
  for (const item of report.pathologyItems) {
    const pt = item.coursePoints.find((c) => c.courseNo === courseNo) ?? item.coursePoints[0];
    const cls = classifyPathologyDValue(pt.dValue);
    if (cls.grade === 'E6-E7') e6e7HighPathologyCount += 1;
    else if (cls.grade === 'E4' || cls.grade === 'E5') e4e5MediumPathologyCount += 1;
  }

  let heavyOrganLoadCount = 0;
  for (const org of report.organLoadItems) {
    const pt = org.coursePoints.find((c) => c.courseNo === courseNo) ?? org.coursePoints[0];
    if (classifyOrganTissueDValue(pt.dValue).degree === '重') {
      heavyOrganLoadCount += 1;
    }
  }

  let overLimitMicrobeCount = 0;
  for (const mic of report.microbeItems) {
    const pt = mic.coursePoints.find((c) => c.courseNo === courseNo) ?? mic.coursePoints[0];
    if (classifyMicrobeDValue(pt.dValue).stateLabel === '超标') {
      overLimitMicrobeCount += 1;
    }
  }

  let totalGrade6BlackSquares = 0;
  let totalGrade5Diamonds = 0;
  for (const cluster of report.organEnergyClusters) {
    const dist =
      cluster.stageDistributions.find((d) => d.courseNo === courseNo) ??
      cluster.stageDistributions[0];
    totalGrade5Diamonds += dist.counts[4];
    totalGrade6BlackSquares += dist.counts[5];
  }

  return {
    courseNo: stageMeta.courseNo,
    stageLabel: stageMeta.stageLabel,
    scanDate: stageMeta.scanDate,
    e6e7HighPathologyCount,
    e4e5MediumPathologyCount,
    heavyOrganLoadCount,
    overLimitMicrobeCount,
    totalGrade6BlackSquares,
    totalGrade5Diamonds,
  };
}
