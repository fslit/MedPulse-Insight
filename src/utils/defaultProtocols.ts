import { OrganId } from './healthModel';
import {
  LabMetricsSnapshot,
  ManagedTaskItem,
  ProtocolCategory,
} from './clinicalWorkflow';

export type DosingSlotId =
  | 'morning_fasting'
  | 'before_meal'
  | 'after_breakfast'
  | 'with_meal'
  | 'meal_replace'
  | 'daytime_water'
  | 'after_dinner'
  | 'bedtime';

export const DOSING_SLOT_ORDER: ReadonlyArray<DosingSlotId> = [
  'morning_fasting',
  'before_meal',
  'after_breakfast',
  'with_meal',
  'meal_replace',
  'daytime_water',
  'after_dinner',
  'bedtime',
];

export const DOSING_SLOT_LABELS: Record<DosingSlotId, string> = {
  morning_fasting: '07:00 晨起空腹',
  before_meal: '三餐前 15 分钟',
  after_breakfast: '08:30 早餐后',
  with_meal: '三餐随餐服用',
  meal_replace: '早/晚餐营养代餐',
  daytime_water: '日间温水冲饮',
  after_dinner: '19:00 晚餐后',
  bedtime: '21:30 睡前 1–2h',
};

export interface RegimenDosingItem {
  productName: string;
  slot: DosingSlotId;
  dosageText: string;
  methodNote: string;
}

export type DefaultProtocolGroup =
  | 'all'
  | 'digestive_liver'
  | 'cardio_metabolic'
  | 'neuro_sleep'
  | 'renal_immune_bone';

export const DEFAULT_PROTOCOL_GROUP_LABELS: Record<DefaultProtocolGroup, string> = {
  all: '全部默认方案 (17)',
  digestive_liver: '消化与肝胆胰 (4)',
  cardio_metabolic: '血管与代谢线粒体 (3)',
  neuro_sleep: '睡眠与神经情绪 (4)',
  renal_immune_bone: '肾肺骨关节与免疫生殖 (6)',
};

export type ReferenceSheetId =
  | 'sheet-visceral'
  | 'sheet-metabolic'
  | 'sheet-neuro-immune';

export interface DefaultProtocolReferenceSheet {
  id: ReferenceSheetId;
  title: string;
  subtitle: string;
  imageUrl: string;
  coveredOrgans: string;
}

export const DEFAULT_PROTOCOL_REFERENCE_SHEETS: ReadonlyArray<DefaultProtocolReferenceSheet> = [
  {
    id: 'sheet-visceral',
    title: '系统默认标准表一 · 六大脏器与骨关节',
    subtitle: '胃黏膜 · 肠道 · 肝脏 · 肾脏 · 肺 · 骨骼及关节',
    imageUrl: '/assets/aistudio/52edee7d90f96174173e2ae58194f559_5a72e36a.png',
    coveredOrgans: '胃黏膜、肠道、肝脏、肾脏、肺、骨骼及关节',
  },
  {
    id: 'sheet-metabolic',
    title: '系统默认标准表二 · 代谢血管与睡眠节律',
    subtitle: '胰腺损伤 · 血管损伤 · 高尿酸 · 睡眠节律损伤 · 线粒体损伤',
    imageUrl: '/assets/aistudio/6f51ed8e5ec9d5b5868afc14c4ed73ad_b103ad7a.png',
    coveredOrgans: '胰腺损伤、血管损伤、高尿酸、睡眠节律损伤、线粒体损伤',
  },
  {
    id: 'sheet-neuro-immune',
    title: '系统默认标准表三 · 免疫生殖与神经情绪',
    subtitle: '肿瘤 · 子宫卵巢 · 免疫失衡 · 神经受损 · 多动狂躁 · 抑郁症',
    imageUrl: '/assets/aistudio/74183460d851af7e4231350a9037ef36_b4435d0c.png',
    coveredOrgans: '肿瘤、子宫卵巢、免疫失衡、神经受损、多动症/狂躁症、抑郁症',
  },
];

export interface DefaultOrganProtocol {
  id: string;
  organTitle: string;
  shortTitle: string;
  group: Exclude<DefaultProtocolGroup, 'all'>;
  groupLabel: string;
  linkedOrganId: OrganId;
  secondaryOrganIds?: OrganId[];
  workflowCategory: ProtocolCategory;
  painPoints: string;
  recoverySchemeText: string;
  resolutionPoints: string;
  courseDays: 10 | 15 | 30 | 60 | 90;
  recommendedCoursesLabel: string;
  waterTempRule?: string;
  regimenItems: RegimenDosingItem[];
  referenceSheetId: ReferenceSheetId;
  scoreGain: number;
}

export const SYSTEM_DEFAULT_PROTOCOLS: ReadonlyArray<DefaultOrganProtocol> = [
  // ==================== 标准表一：胃黏膜、肠道、肝脏、肾脏、肺、骨骼及关节 ====================
  {
    id: 'def-gastric-mucosa',
    organTitle: '胃黏膜（胃胀、反酸、打嗝、胃类炎症、幽门螺旋杆菌超标）',
    shortTitle: '胃黏膜屏障修复默认方案（太空晶球益生菌）',
    group: 'digestive_liver',
    groupLabel: '消化与肝胆胰',
    linkedOrganId: 'stomach',
    workflowCategory: 'digestive',
    painPoints:
      '胃痛、反酸、嗳气、胃溃疡反复发作，长期可诱发胃黏膜肠化生、胃癌风险升高，同时导致蛋白质、矿物质初级消化效率下降，继发全身营养不良',
    recoverySchemeText:
      '太空晶球益生菌（胃胀、反酸、打嗝、胃类炎症：早空腹3条 晚餐后4条。幽门感染：早空腹7条 晚饭后7条。）备注：适量37度以下温水吞服或冲服，15天为1疗程，需2-6个疗程',
    resolutionPoints:
      '促进黏膜细胞增殖和修复，抗氧化稳定新生细胞，降低有害菌定植。',
    courseDays: 15,
    recommendedCoursesLabel: '需2-6个疗程',
    waterTempRule: '适量37℃以下温水吞服或冲服',
    regimenItems: [
      {
        productName: '太空晶球益生菌',
        slot: 'morning_fasting',
        dosageText: '早空腹 3 条（幽门超标 7 条）',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '太空晶球益生菌',
        slot: 'after_dinner',
        dosageText: '晚餐后 4 条（幽门超标 7 条）',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
    ],
    referenceSheetId: 'sheet-visceral',
    scoreGain: 2,
  },
  {
    id: 'def-intestine',
    organTitle: '肠道（肠道炎症、便秘、腹泻）',
    shortTitle: '肠道菌群与肠壁屏障修复方案（晶球益生菌+优康力）',
    group: 'digestive_liver',
    groupLabel: '消化与肝胆胰',
    linkedOrganId: 'stomach',
    workflowCategory: 'digestive',
    painPoints:
      '腹泻/便秘交替、肠漏、营养吸收障碍、血清白蛋白降低，长期可诱发自身免疫性疾病、食物不耐受，肿瘤发生风险升高',
    recoverySchemeText:
      '太空晶球益生菌（每餐之前2条，3次/天，适量37度以下温水吞服或冲服）+优康力（代替早餐或晚餐，6勺+300ml温水/天，小口慢饮）备注：30天为1疗程，需3-4个疗程',
    resolutionPoints:
      '修复肠上皮细胞肠壁屏障，抑制肠道炎症，定植调节菌群结构改善肠道蠕动',
    courseDays: 30,
    recommendedCoursesLabel: '需3-4个疗程',
    waterTempRule: '益生菌 ≤37℃ 温水吞/冲服；优康力 300ml 温水小口慢饮',
    regimenItems: [
      {
        productName: '太空晶球益生菌',
        slot: 'before_meal',
        dosageText: '每餐前 2 条，3次/天',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '优康力',
        slot: 'meal_replace',
        dosageText: '代替早餐或晚餐，6勺 + 300ml 温水/天',
        methodNote: '小口慢饮',
      },
    ],
    referenceSheetId: 'sheet-visceral',
    scoreGain: 2,
  },
  {
    id: 'def-liver',
    organTitle: '肝脏（脂肪肝、代谢异常、大三阳、小三阳）',
    shortTitle: '肝脏代谢与脂肪肝恢复方案（护肝菌+白胶囊+黑片）',
    group: 'digestive_liver',
    groupLabel: '消化与肝胆胰',
    linkedOrganId: 'liver',
    workflowCategory: 'liver',
    painPoints:
      '乏力、黄疸、转氨酶升高、脂肪代谢紊乱诱发脂肪肝，严重可进展为肝硬化、肝功能衰竭，同时导致解毒功能下降、凝血因子合成不足',
    recoverySchemeText:
      '护肝菌（晚餐后6条，适量37度以下温水吞服或冲服）+白胶囊（空腹4粒）+黑片（睡前2小时6片）备注：90天为1疗程，需2个疗程',
    resolutionPoints:
      '促进肝细胞再生，清除肝脏自由基抑制脂质过氧化，减少内毒素入肝降低炎症负荷，提升解毒能力',
    courseDays: 90,
    recommendedCoursesLabel: '需2个疗程',
    waterTempRule: '护肝菌需适量 ≤37℃ 温水吞服或冲服',
    regimenItems: [
      {
        productName: '白胶囊',
        slot: 'morning_fasting',
        dosageText: '空腹 4 粒',
        methodNote: '温水送服',
      },
      {
        productName: '护肝菌',
        slot: 'after_dinner',
        dosageText: '晚餐后 6 条',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '黑片',
        slot: 'bedtime',
        dosageText: '睡前 2 小时 6 片',
        methodNote: '温水送服',
      },
    ],
    referenceSheetId: 'sheet-visceral',
    scoreGain: 3,
  },
  {
    id: 'def-kidneys',
    organTitle: '肾脏（肾小球肾炎）',
    shortTitle: '肾脏减负与低氮营养恢复方案（优康力代餐）',
    group: 'renal_immune_bone',
    groupLabel: '肾肺骨关节与免疫生殖',
    linkedOrganId: 'kidneys',
    workflowCategory: 'cardio',
    painPoints:
      '蛋白尿、水肿、电解质紊乱、代谢废物蓄积，严重进展为尿毒症需要透析，同时导致促红细胞生成素合成不足诱发肾性贫血',
    recoverySchemeText:
      '优康力（代替早餐或晚餐，6勺+300ml温水/天，小口慢饮）备注：30天为1疗程，需6个疗程',
    resolutionPoints:
      '减少含氮废物，减少尿素生成，预防贫血，降低肠道毒素生成量减少肾脏过滤负荷',
    courseDays: 30,
    recommendedCoursesLabel: '需6个疗程',
    waterTempRule: '6勺+300ml温水/天，小口慢饮',
    regimenItems: [
      {
        productName: '优康力',
        slot: 'meal_replace',
        dosageText: '代替早餐或晚餐，6勺 + 300ml 温水/天',
        methodNote: '小口慢饮，减轻肾脏含氮过滤负荷',
      },
    ],
    referenceSheetId: 'sheet-visceral',
    scoreGain: 2,
  },
  {
    id: 'def-lungs',
    organTitle: '肺（结节、肺气虚弱）',
    shortTitle: '肺结节与呼吸道黏膜免疫恢复方案（优康力）',
    group: 'renal_immune_bone',
    groupLabel: '肾肺骨关节与免疫生殖',
    linkedOrganId: 'lungs',
    workflowCategory: 'followup',
    painPoints:
      '咳嗽、咳痰、气短、血氧饱和度下降，慢性损伤可诱发肺纤维化、呼吸衰竭，同时导致机体缺氧影响全身器官功能',
    recoverySchemeText:
      '优康力（代替早餐或晚餐，6勺+300ml温水/天，小口慢饮）备注：30天为1疗程，需12个疗程',
    resolutionPoints:
      '减少氧化损伤，维持呼吸肌力量，提升呼吸道黏膜免疫能力，稀释痰液降低气道阻力',
    courseDays: 30,
    recommendedCoursesLabel: '需12个疗程',
    waterTempRule: '6勺+300ml温水/天，小口慢饮',
    regimenItems: [
      {
        productName: '优康力',
        slot: 'meal_replace',
        dosageText: '代替早餐或晚餐，6勺 + 300ml 温水/天',
        methodNote: '小口慢饮，支持呼吸道黏膜免疫',
      },
    ],
    referenceSheetId: 'sheet-visceral',
    scoreGain: 2,
  },
  {
    id: 'def-bone-joint',
    organTitle: '骨骼及关节（骨密度低、关节炎症）',
    shortTitle: '骨骼关节定向沉积恢复方案（马鹿骨）',
    group: 'renal_immune_bone',
    groupLabel: '肾肺骨关节与免疫生殖',
    linkedOrganId: 'bone',
    workflowCategory: 'followup',
    painPoints:
      '疼痛、骨质疏松、易骨折，长期可导致运动功能丧失、卧床并发症发生率升高',
    recoverySchemeText:
      '马鹿骨（第一个月随餐服用3粒，3次/天。第二~三个月随餐服用3粒，2次/天。）备注：90天为1疗程，建议长期服用保健',
    resolutionPoints:
      '促进肠道钙吸收，引导钙沉积至骨骼避免血管钙化',
    courseDays: 90,
    recommendedCoursesLabel: '建议长期服用保健',
    regimenItems: [
      {
        productName: '马鹿骨',
        slot: 'with_meal',
        dosageText: '第1月随餐 3粒×3次/天；第2–3月随餐 3粒×2次/天',
        methodNote: '随餐温水送服，引导钙定向沉积骨骼',
      },
    ],
    referenceSheetId: 'sheet-visceral',
    scoreGain: 2,
  },

  // ==================== 标准表二：胰腺损伤、血管损伤、高尿酸、睡眠节律损伤、线粒体损伤 ====================
  {
    id: 'def-pancreas',
    organTitle: '胰腺损伤（腹泻、糖代谢紊乱）',
    shortTitle: '胰腺修复与糖代谢稳态方案（晶球益生菌+优康力）',
    group: 'digestive_liver',
    groupLabel: '消化与肝胆胰',
    linkedOrganId: 'liver',
    secondaryOrganIds: ['stomach'],
    workflowCategory: 'liver',
    painPoints:
      '腹痛、腹胀、血糖波动、脂肪泻、食欲下降。胰岛素分泌异常诱发2型糖尿病；外分泌不足导致营养不良；重症坏死性胰腺炎致死率达15%~30%',
    recoverySchemeText:
      '太空晶球益生菌（每餐之前2条，3次/天，适量37度以下温水吞服或冲服）+优康力（代替早餐或晚餐，6勺+300ml温水/天，小口慢饮）备注：30天为1疗程，需6个疗程',
    resolutionPoints:
      '抑制胰腺氧化应激反应，减轻炎症因子浸润，调节肠道菌群降低胰腺感染风险，修复胰腺腺泡细胞损伤',
    courseDays: 30,
    recommendedCoursesLabel: '需6个疗程',
    waterTempRule: '益生菌 ≤37℃ 温水吞/冲服；优康力 300ml 温水小口慢饮',
    regimenItems: [
      {
        productName: '太空晶球益生菌',
        slot: 'before_meal',
        dosageText: '每餐前 2 条，3次/天',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '优康力',
        slot: 'meal_replace',
        dosageText: '代替早餐或晚餐，6勺 + 300ml 温水/天',
        methodNote: '小口慢饮',
      },
    ],
    referenceSheetId: 'sheet-metabolic',
    scoreGain: 2,
  },
  {
    id: 'def-vascular',
    organTitle: '血管损伤',
    shortTitle: '血管内皮保护与斑块稳定方案（优康力代餐）',
    group: 'cardio_metabolic',
    groupLabel: '血管与代谢线粒体',
    linkedOrganId: 'vascular',
    secondaryOrganIds: ['heart'],
    workflowCategory: 'cardio',
    painPoints:
      '头晕、肢体麻木、血压波动、下肢水肿、血管斑块形成。动脉粥样硬化诱发心梗、脑梗；血管内皮功能障碍导致靶器官灌注不足；血管破裂出血致死致残率超40%',
    recoverySchemeText:
      '优康力（代替早餐或晚餐，6勺+300ml温水/天，小口慢饮）备注：30天为1疗程，需6个疗程',
    resolutionPoints:
      '保护血管内皮细胞完整性，降低同型半胱氨酸水平稳定斑块，降低肠道胆固醇吸收',
    courseDays: 30,
    recommendedCoursesLabel: '需6个疗程',
    waterTempRule: '6勺+300ml温水/天，小口慢饮',
    regimenItems: [
      {
        productName: '优康力',
        slot: 'meal_replace',
        dosageText: '代替早餐或晚餐，6勺 + 300ml 温水/天',
        methodNote: '小口慢饮，降低肠道胆固醇吸收并稳斑块',
      },
    ],
    referenceSheetId: 'sheet-metabolic',
    scoreGain: 3,
  },
  {
    id: 'def-hyperuricemia',
    organTitle: '高尿酸',
    shortTitle: '高尿酸肠道降解与排泄方案（青酸玲菌）',
    group: 'cardio_metabolic',
    groupLabel: '血管与代谢线粒体',
    linkedOrganId: 'kidneys',
    secondaryOrganIds: ['vascular'],
    workflowCategory: 'lipid',
    painPoints:
      '痛风、且是慢性肾病、高血压、心脑血管疾病及糖尿病等疾病的独立危险因素，长期高尿酸血症还可导致动脉粥样硬化，增加心血管疾病发生风险。',
    recoverySchemeText:
      '青酸玲菌（早晨空腹2条，适量37度以下温水冲服）备注：30天为1疗程，1-2个疗程',
    resolutionPoints:
      '降解肠道尿酸、减少重吸收、改善代谢与炎症、促进尿酸排泄',
    courseDays: 30,
    recommendedCoursesLabel: '1-2个疗程',
    waterTempRule: '适量 ≤37℃ 温水冲服',
    regimenItems: [
      {
        productName: '青酸玲菌',
        slot: 'morning_fasting',
        dosageText: '早晨空腹 2 条',
        methodNote: '适量 ≤37℃ 温水冲服',
      },
    ],
    referenceSheetId: 'sheet-metabolic',
    scoreGain: 2,
  },
  {
    id: 'def-sleep-rhythm',
    organTitle: '睡眠节律损伤（睡不着、深度睡眠时间短、爱做梦）',
    shortTitle: '睡眠节律与脑肠轴降皮质醇方案（开心季菌+正固素）',
    group: 'neuro_sleep',
    groupLabel: '睡眠与神经情绪',
    linkedOrganId: 'brain',
    secondaryOrganIds: ['heart'],
    workflowCategory: 'sleep',
    painPoints:
      '入睡困难、早醒、睡眠浅、日间嗜睡、注意力下降。认知功能衰退；免疫球蛋白合成下降30%以上，免疫低下；长期睡眠不足诱发心血管疾病、代谢综合征风险升高2倍',
    recoverySchemeText:
      '开心季菌（3条，适量37度以下温水吞服或冲服）+正固素（2条/天，晚饭后直接服用）备注：10天为1个疗程，需3个疗程',
    resolutionPoints:
      '抑制中枢神经兴奋性缩短入睡潜伏期，调节脑肠轴通路降低皮质醇水平，调节神经递质5-羟色胺分泌（血清素），快速入眠',
    courseDays: 10,
    recommendedCoursesLabel: '需3个疗程',
    waterTempRule: '开心季菌需适量 ≤37℃ 温水吞服或冲服',
    regimenItems: [
      {
        productName: '正固素',
        slot: 'after_dinner',
        dosageText: '晚饭后 2 条/天',
        methodNote: '晚饭后直接服用',
      },
      {
        productName: '开心季菌',
        slot: 'bedtime',
        dosageText: '3 条/天',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
    ],
    referenceSheetId: 'sheet-metabolic',
    scoreGain: 2,
  },
  {
    id: 'def-mitochondria',
    organTitle: '线粒体损伤（新陈代谢差、皮肤暗沉、纹路深）',
    shortTitle: '线粒体能量代谢激活方案（美龄鹿）',
    group: 'cardio_metabolic',
    groupLabel: '血管与代谢线粒体',
    linkedOrganId: 'vascular',
    workflowCategory: 'lipid',
    painPoints:
      '早衰，ATP合成不足导致多器官能量代谢障碍，氧化应激产物累积诱发细胞凋亡，线粒体DNA突变增加神经退行性疾病发病风险',
    recoverySchemeText:
      '美龄鹿（1条+500ml温水冲服/天，半个小时内喝完最佳）备注：30天为1个疗程，需6个疗程',
    resolutionPoints:
      '清除线粒体活性氧，提升线粒体呼吸链功能，提升全身线粒体能量代谢',
    courseDays: 30,
    recommendedCoursesLabel: '需6个疗程',
    waterTempRule: '1条+500ml温水冲服/天，半小时内饮完最佳',
    regimenItems: [
      {
        productName: '美龄鹿',
        slot: 'daytime_water',
        dosageText: '1 条 + 500ml 温水冲服/天',
        methodNote: '半个小时内喝完最佳',
      },
    ],
    referenceSheetId: 'sheet-metabolic',
    scoreGain: 2,
  },

  // ==================== 标准表三：肿瘤、子宫卵巢、免疫失衡、神经受损、多动狂躁、抑郁症 ====================
  {
    id: 'def-tumor-support',
    organTitle: '肿瘤',
    shortTitle: '肿瘤免疫营养支持方案（素复元益生菌+优康力）',
    group: 'renal_immune_bone',
    groupLabel: '肾肺骨关节与免疫生殖',
    linkedOrganId: 'lungs',
    workflowCategory: 'followup',
    painPoints:
      '恶心呕吐、吞咽困难、腹胀、便秘、腹泻、腹痛、乏力、体能衰退、痛苦的死亡',
    recoverySchemeText:
      '素复元益生菌（第一个月早餐后2条，第二个月早餐后1条，适量37度以下温水冲服）+优康力代替早餐或晚餐，6勺+300ml温水/天，小口慢饮 备注：60天为1个疗程，建议一直服用',
    resolutionPoints:
      '增强免疫、预防扩散及转移、抑制生长、减少肿瘤面积',
    courseDays: 60,
    recommendedCoursesLabel: '建议一直服用',
    waterTempRule: '素复元益生菌 ≤37℃ 温水冲服；优康力小口慢饮',
    regimenItems: [
      {
        productName: '素复元益生菌',
        slot: 'after_breakfast',
        dosageText: '第1月早餐后 2 条，第2月早餐后 1 条',
        methodNote: '适量 ≤37℃ 温水冲服',
      },
      {
        productName: '优康力',
        slot: 'meal_replace',
        dosageText: '代替早餐或晚餐，6勺 + 300ml 温水/天',
        methodNote: '小口慢饮',
      },
    ],
    referenceSheetId: 'sheet-neuro-immune',
    scoreGain: 2,
  },
  {
    id: 'def-uterus-ovary',
    organTitle: '子宫、卵巢（宫寒、痛经、月经不调、卵巢衰老）',
    shortTitle: '女性内分泌与卵巢养护方案（爱知巢+养荣丹+美龄鹿）',
    group: 'renal_immune_bone',
    groupLabel: '肾肺骨关节与免疫生殖',
    linkedOrganId: 'kidneys',
    workflowCategory: 'sleep',
    painPoints:
      '皮肤干燥松弛、发量减少、腰腹脂肪堆积、体重腰围增长、肌肉流失、阴道干涩、反复尿路感染、入睡困难、易醒、烦躁、焦虑低落',
    recoverySchemeText:
      '爱知巢益生菌（早餐后半小时2条，睡前1小时2条，适量37度以下温水吞服或冲服）+养荣丹（早餐随餐1袋，温水吞服）+美龄鹿（1条+500ml温水冲服/天，半个小时内喝完最佳）备注：30天为1疗程，需3-4个疗程',
    resolutionPoints:
      '面部纹路变浅光滑、面色红润下颌线提升、月经平稳',
    courseDays: 30,
    recommendedCoursesLabel: '需3-4个疗程',
    waterTempRule: '爱知巢益生菌 ≤37℃ 温水吞/冲服；美龄鹿半小时内喝完',
    regimenItems: [
      {
        productName: '养荣丹',
        slot: 'with_meal',
        dosageText: '早餐随餐 1 袋',
        methodNote: '温水吞服',
      },
      {
        productName: '爱知巢益生菌',
        slot: 'after_breakfast',
        dosageText: '早餐后半小时 2 条',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '美龄鹿',
        slot: 'daytime_water',
        dosageText: '1 条 + 500ml 温水冲服/天',
        methodNote: '半个小时内喝完最佳',
      },
      {
        productName: '爱知巢益生菌',
        slot: 'bedtime',
        dosageText: '睡前 1 小时 2 条',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
    ],
    referenceSheetId: 'sheet-neuro-immune',
    scoreGain: 2,
  },
  {
    id: 'def-immune-imbalance',
    organTitle: '免疫失衡（鼻炎、湿疹、荨麻疹等）',
    shortTitle: '过敏与免疫稳态分阶方案（晶球+康敏讯A/B+护肝菌）',
    group: 'renal_immune_bone',
    groupLabel: '肾肺骨关节与免疫生殖',
    linkedOrganId: 'lungs',
    secondaryOrganIds: ['liver'],
    workflowCategory: 'digestive',
    painPoints:
      '剧烈瘙痒、疼痛、失眠、哮喘、鼻窦炎、过敏性支气管炎、分泌性中耳炎',
    recoverySchemeText:
      '第一月：太空晶球益生菌（早上空腹2条，适量37度以下温水吞服或冲服）+康敏讯益生菌（早中晚各2条，先用A装 连续服用15天，第16天开始服用B装）+护肝菌（早2条 晚2条）。第二月：优康力代替早餐或晚餐，6勺+300ml温水/天，小口慢饮 备注：30天为1疗程，需2-3个疗程',
    resolutionPoints:
      '减轻瘙痒及疼痛、减少反复发作频率',
    courseDays: 30,
    recommendedCoursesLabel: '需2-3个疗程',
    waterTempRule: '所有益生菌均用 ≤37℃ 温水吞/冲服；康敏讯前15天A装、第16天起B装',
    regimenItems: [
      {
        productName: '太空晶球益生菌',
        slot: 'morning_fasting',
        dosageText: '早上空腹 2 条（第1月）',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '康敏讯益生菌',
        slot: 'with_meal',
        dosageText: '早中晚各 2 条（第1–15天A装，第16天起B装）',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '护肝菌',
        slot: 'after_dinner',
        dosageText: '早 2 条 + 晚 2 条（第1月）',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '优康力',
        slot: 'meal_replace',
        dosageText: '第2月起代替早或晚餐，6勺+300ml温水/天',
        methodNote: '小口慢饮',
      },
    ],
    referenceSheetId: 'sheet-neuro-immune',
    scoreGain: 2,
  },
  {
    id: 'def-nerve-damage',
    organTitle: '神经受损（记忆减退、老年痴呆、中风后遗症）',
    shortTitle: '神经元修复与认知记忆恢复方案（MCC1274菌+优康力）',
    group: 'neuro_sleep',
    groupLabel: '睡眠与神经情绪',
    linkedOrganId: 'brain',
    workflowCategory: 'sleep',
    painPoints:
      '淡漠、抑郁、焦虑、夜间睡眠行为异常、跌倒、误服、走失、理财、出行、家务、社交安排能力下降',
    recoverySchemeText:
      'MCC1274菌（晚餐后2条，适量37度以下温水吞服或冲服）+优康力（代替早餐或晚餐，6勺+300ml温水/天，小口慢饮）备注：30天为1疗程，需2-3个疗程',
    resolutionPoints:
      '减少炎症、修复神经元、增强记忆、恢复生活规律',
    courseDays: 30,
    recommendedCoursesLabel: '需2-3个疗程',
    waterTempRule: 'MCC1274菌 ≤37℃ 温水吞/冲服；优康力小口慢饮',
    regimenItems: [
      {
        productName: '优康力',
        slot: 'meal_replace',
        dosageText: '代替早餐或晚餐，6勺 + 300ml 温水/天',
        methodNote: '小口慢饮',
      },
      {
        productName: 'MCC1274菌',
        slot: 'after_dinner',
        dosageText: '晚餐后 2 条',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
    ],
    referenceSheetId: 'sheet-neuro-immune',
    scoreGain: 2,
  },
  {
    id: 'def-adhd-mania',
    organTitle: '多动症、狂躁症',
    shortTitle: '情绪行为稳定微生态干预方案（晶球+开心季菌+优益力）',
    group: 'neuro_sleep',
    groupLabel: '睡眠与神经情绪',
    linkedOrganId: 'brain',
    workflowCategory: 'sleep',
    painPoints:
      '焦虑、抽动、睡眠差、行为冲动、攀爬危险高处、突然冲入马路、亲子冲突、家长长期高压陪读、听课走神、作业漏项、考试粗心',
    recoverySchemeText:
      '太空晶球益生菌（早上空腹2条，适量37度以下温水吞服或冲服）+开心季菌（2条，适量37度以下温水吞服或冲服）+优益力（早餐或晚餐后，6勺+300ml温水/天，小口慢饮）备注：30天为1疗程，需12-18个疗程',
    resolutionPoints:
      '情绪及行为稳定、沟通顺畅、亲子关系和谐、学习成绩增长',
    courseDays: 30,
    recommendedCoursesLabel: '需12-18个疗程',
    waterTempRule: '益生菌 ≤37℃ 温水吞/冲服；优益力 300ml 温水小口慢饮',
    regimenItems: [
      {
        productName: '太空晶球益生菌',
        slot: 'morning_fasting',
        dosageText: '早上空腹 2 条',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
      {
        productName: '优益力',
        slot: 'after_dinner',
        dosageText: '早餐或晚餐后，6勺 + 300ml 温水/天',
        methodNote: '小口慢饮',
      },
      {
        productName: '开心季菌',
        slot: 'bedtime',
        dosageText: '2 条/天',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
    ],
    referenceSheetId: 'sheet-neuro-immune',
    scoreGain: 2,
  },
  {
    id: 'def-depression',
    organTitle: '抑郁症',
    shortTitle: '心境改善阶梯递减微生态方案（开心季菌）',
    group: 'neuro_sleep',
    groupLabel: '睡眠与神经情绪',
    linkedOrganId: 'brain',
    workflowCategory: 'sleep',
    painPoints: '睡眠困难、情绪低落难以开怀、厌世轻生',
    recoverySchemeText:
      '开心季菌（第一周晚饭后6条，第8天开始，3条/天，第二个月开始，1条/天，适量37度以下温水吞服或冲服）备注：30天为1疗程，需3-4个疗程',
    resolutionPoints: '睡眠质量提升、心情愉悦',
    courseDays: 30,
    recommendedCoursesLabel: '需3-4个疗程',
    waterTempRule: '适量 ≤37℃ 温水吞服或冲服',
    regimenItems: [
      {
        productName: '开心季菌',
        slot: 'after_dinner',
        dosageText: '第1周晚饭后 6条/天 → 第8天起 3条/天 → 第2月起 1条/天',
        methodNote: '适量 ≤37℃ 温水吞服或冲服',
      },
    ],
    referenceSheetId: 'sheet-neuro-immune',
    scoreGain: 2,
  },
];

export interface CourseCyclePresetOption {
  cycleWeeks: number;
  courseDays: number;
  label: string;
}

export const COURSE_CYCLE_PRESETS: ReadonlyArray<CourseCyclePresetOption> = [
  {
    cycleWeeks: 2,
    courseDays: 10,
    label: '10–15天 / 2周（睡眠节律 10天 · 胃黏膜 15天标准疗程）',
  },
  {
    cycleWeeks: 4,
    courseDays: 30,
    label: '30天 / 4周（血管 · 肠道 · 胰腺 · 高尿酸标准 1疗程）',
  },
  {
    cycleWeeks: 8,
    courseDays: 60,
    label: '60天 / 8周（强化免疫支持标准 1疗程）',
  },
  {
    cycleWeeks: 12,
    courseDays: 90,
    label: '90天 / 12周（肝脏脂肪肝 · 骨骼关节标准 1疗程）',
  },
  {
    cycleWeeks: 24,
    courseDays: 180,
    label: '180天 / 24周（多疗程达标后半年巩固维持期）',
  },
];

export interface MatchedDefaultProtocol {
  protocol: DefaultOrganProtocol;
  matchReason: string;
  priority: 'high' | 'medium';
}

export function getDefaultProtocolById(id?: string): DefaultOrganProtocol | undefined {
  if (!id) return undefined;
  return SYSTEM_DEFAULT_PROTOCOLS.find((p) => p.id === id);
}

/**
 * Automatically matches the patient's abnormal biomarkers and clinical history
 * to the clinic's 17 standard default organ recovery protocols.
 */
export function matchDefaultProtocolsForPatient(
  metrics: LabMetricsSnapshot,
  contextText = ''
): MatchedDefaultProtocol[] {
  const results: MatchedDefaultProtocol[] = [];
  const seen = new Set<string>();
  const ctx = contextText.toLowerCase();

  const pushMatch = (
    protocolId: string,
    matchReason: string,
    priority: 'high' | 'medium'
  ) => {
    if (seen.has(protocolId)) return;
    const found = getDefaultProtocolById(protocolId);
    if (!found) return;
    seen.add(protocolId);
    results.push({ protocol: found, matchReason, priority });
  };

  // 1. Liver steatosis / hepatic metabolism
  if (metrics.liverFatPercent >= 5.0 || ctx.includes('脂肪肝')) {
    pushMatch(
      'def-liver',
      metrics.liverFatPercent >= 5.0
        ? `肝脂肪含量 ${metrics.liverFatPercent.toFixed(1)}%（高于 <5.0% 正常线）`
        : `主诉脂肪肝管理结案巩固（当前肝脂率已逆转至 ${metrics.liverFatPercent.toFixed(1)}%）`,
      metrics.liverFatPercent >= 10 ? 'high' : 'medium'
    );
  }

  // 2. Vascular / Blood Pressure / Cholesterol
  const bpElevated = metrics.systolicBp >= 130 || metrics.diastolicBp >= 85;
  const lipidElevated = metrics.totalCholesterol >= 5.2 || metrics.ldlCholesterol >= 3.4;
  if (bpElevated || lipidElevated || ctx.includes('高血压') || ctx.includes('高胆固醇')) {
    const reasons: string[] = [];
    if (bpElevated) reasons.push(`血压 ${metrics.systolicBp}/${metrics.diastolicBp} mmHg`);
    if (lipidElevated) reasons.push(`TC ${metrics.totalCholesterol.toFixed(1)} mmol/L`);
    pushMatch(
      'def-vascular',
      reasons.length > 0
        ? `${reasons.join(' · ')}，提示需保护血管内皮并减少肠道胆固醇吸收`
        : '既往心脑血管或血脂调理结案后血管内皮巩固养护',
      metrics.systolicBp >= 140 || metrics.totalCholesterol >= 5.8 ? 'high' : 'medium'
    );
  }

  // 3. Gastric mucosa
  if (
    metrics.gastricStatus === 'mild_congestion' ||
    ctx.includes('胃') ||
    ctx.includes('反酸')
  ) {
    pushMatch(
      'def-gastric-mucosa',
      metrics.gastricStatus === 'mild_congestion'
        ? '胃镜评估提示胃窦黏膜轻度浅表充血'
        : '病史提及胃黏膜养护诉求',
      'medium'
    );
  }

  // 4. Pancreas / Fasting Glucose
  if (metrics.fastingGlucose >= 5.8 || ctx.includes('控糖') || ctx.includes('血糖')) {
    pushMatch(
      'def-pancreas',
      `空腹血糖 ${metrics.fastingGlucose.toFixed(1)} mmol/L 伴糖代谢调理需求`,
      metrics.fastingGlucose >= 6.1 ? 'high' : 'medium'
    );
  }

  // 5. Sleep rhythm / late nights / sympathetic stress
  if (
    ctx.includes('熬夜') ||
    ctx.includes('晚睡') ||
    ctx.includes('睡眠') ||
    ctx.includes('失眠') ||
    metrics.systolicBp >= 140
  ) {
    pushMatch(
      'def-sleep-rhythm',
      ctx.includes('熬夜') || ctx.includes('晚睡') || ctx.includes('睡眠')
        ? '既往作息存在晚睡/熬夜节律受损'
        : '血压偏高伴夜间交感神经兴奋，宜同步调节脑肠轴睡眠节律',
      'medium'
    );
  }

  // 6. Allergy / Urticaria / Immune imbalance (ignore negated phrases such as "无药物过敏")
  const positiveImmuneCtx = ctx.replace(/无[^\s，,。；;、]*过敏/g, '');
  if (
    positiveImmuneCtx.includes('荨麻疹') ||
    positiveImmuneCtx.includes('湿疹') ||
    positiveImmuneCtx.includes('鼻炎') ||
    positiveImmuneCtx.includes('过敏')
  ) {
    pushMatch('def-immune-imbalance', '既往史提示过敏/荨麻疹免疫失衡倾向', 'medium');
  }

  // 7. Hyperuricemia / Bone / Uterus-Ovary keywords if present
  if (ctx.includes('尿酸') || ctx.includes('痛风')) {
    pushMatch('def-hyperuricemia', '主诉或病史涉及高尿酸代谢控制', 'high');
  }
  if (ctx.includes('骨') || ctx.includes('关节') || ctx.includes('膝')) {
    pushMatch('def-bone-joint', '涉及骨骼密度或膝关节保护需求', 'medium');
  }
  if (ctx.includes('卵巢') || ctx.includes('月经') || ctx.includes('宫寒')) {
    pushMatch('def-uterus-ovary', '女性生殖内分泌养护需求', 'medium');
  }

  // Fallback if completely healthy patient: offer mitochondria & sleep wellness reference
  if (results.length === 0) {
    pushMatch('def-mitochondria', '各项指标已达标，可作日常细胞能量代谢巩固参考', 'medium');
  }

  return results;
}

/**
 * Returns all default protocols mapped to a specific 3D anatomical `OrganId`.
 */
export function getDefaultProtocolsForOrgan(organId: OrganId): DefaultOrganProtocol[] {
  const primary = SYSTEM_DEFAULT_PROTOCOLS.filter((p) => p.linkedOrganId === organId);
  const secondary = SYSTEM_DEFAULT_PROTOCOLS.filter(
    (p) => p.linkedOrganId !== organId && p.secondaryOrganIds?.includes(organId)
  );
  return [...primary, ...secondary];
}

export function filterDefaultProtocols(
  protocols: ReadonlyArray<DefaultOrganProtocol>,
  group: DefaultProtocolGroup,
  searchQuery: string
): DefaultOrganProtocol[] {
  const q = searchQuery.trim().toLowerCase();
  return protocols.filter((item) => {
    if (group !== 'all' && item.group !== group) return false;
    if (!q) return true;
    const productsConcat = item.regimenItems
      .map((r) => `${r.productName} ${r.dosageText}`)
      .join(' ')
      .toLowerCase();
    return (
      item.organTitle.toLowerCase().includes(q) ||
      item.shortTitle.toLowerCase().includes(q) ||
      item.painPoints.toLowerCase().includes(q) ||
      item.recoverySchemeText.toLowerCase().includes(q) ||
      item.resolutionPoints.toLowerCase().includes(q) ||
      productsConcat.includes(q)
    );
  });
}

/**
 * Converts a `DefaultOrganProtocol` into a structured `ManagedTaskItem` payload
 * ready for doctor prescription publishing and patient daily check-in.
 */
export function convertDefaultProtocolToManagedTask(
  protocol: DefaultOrganProtocol
): Omit<ManagedTaskItem, 'id' | 'completedByPatient'> {
  const checklist = protocol.regimenItems.map(
    (item) =>
      `${DOSING_SLOT_LABELS[item.slot]}：${item.productName}（${item.dosageText} · ${item.methodNote}）`
  );
  checklist.push(
    `疗程规范：${protocol.courseDays}天为1疗程，${protocol.recommendedCoursesLabel}`
  );

  const primaryOrganName = protocol.organTitle.split('（')[0];

  return {
    templateId: protocol.id,
    title: protocol.shortTitle,
    category: protocol.workflowCategory,
    relatedOrgan: protocol.linkedOrganId,
    targetTag: `${protocol.courseDays}天/疗程 · ${protocol.recommendedCoursesLabel}`,
    frequency: `${protocol.courseDays}天为1疗程（${protocol.recommendedCoursesLabel}）`,
    shortDesc: `针对${primaryOrganName}：${protocol.resolutionPoints}`,
    summary: `【系统默认功能恢复方案】${protocol.recoverySchemeText}`,
    advice: `解决靶点：${protocol.resolutionPoints}${
      protocol.waterTempRule ? `（特别提醒：${protocol.waterTempRule}）` : ''
    }`,
    scoreGain: protocol.scoreGain,
    weeklyChecklist: checklist,
  };
}

export interface SynthesizedDosingEntry {
  productName: string;
  dosageSummary: string;
  methodNote: string;
  sourceOrgans: string[];
  isSharedAcrossOrgans: boolean;
}

export interface SynthesizedDosingSlot {
  slot: DosingSlotId;
  slotLabel: string;
  entries: SynthesizedDosingEntry[];
}

export interface DailyDosingScheduleResult {
  protocolCount: number;
  slots: SynthesizedDosingSlot[];
  safetyReminders: string[];
  recommendedMaxCourseDays: number;
}

/**
 * Merges and deduplicates shared products (e.g. `优康力` across Vascular + Intestine + Kidneys)
 * into a clean 1-day chronological dosing timetable for the patient.
 */
export function buildDailyDosingSchedule(
  protocols: ReadonlyArray<DefaultOrganProtocol>
): DailyDosingScheduleResult {
  if (protocols.length === 0) {
    return {
      protocolCount: 0,
      slots: [],
      safetyReminders: [],
      recommendedMaxCourseDays: 0,
    };
  }

  const slotMap = new Map<DosingSlotId, Map<string, SynthesizedDosingEntry>>();
  let hasProbiotics = false;
  let hasMealReplacement = false;
  let maxDays = 0;

  for (const proto of protocols) {
    if (proto.courseDays > maxDays) maxDays = proto.courseDays;
    const organShort = proto.organTitle.split('（')[0];

    for (const item of proto.regimenItems) {
      if (item.methodNote.includes('37') || item.productName.includes('菌')) {
        hasProbiotics = true;
      }
      if (item.slot === 'meal_replace' || item.productName === '优康力') {
        hasMealReplacement = true;
      }

      if (!slotMap.has(item.slot)) {
        slotMap.set(item.slot, new Map());
      }
      const prodMap = slotMap.get(item.slot)!;
      const existing = prodMap.get(item.productName);

      if (!existing) {
        prodMap.set(item.productName, {
          productName: item.productName,
          dosageSummary: item.dosageText,
          methodNote: item.methodNote,
          sourceOrgans: [organShort],
          isSharedAcrossOrgans: false,
        });
      } else {
        if (!existing.sourceOrgans.includes(organShort)) {
          existing.sourceOrgans.push(organShort);
        }
        existing.isSharedAcrossOrgans = existing.sourceOrgans.length > 1;
        // If dosages differ in the same slot (e.g. 太空晶球益生菌), surface the combined guidance clearly
        if (!existing.dosageSummary.includes(item.dosageText)) {
          existing.dosageSummary = `${existing.dosageSummary}（兼顾${organShort}：${item.dosageText}）`;
        }
      }
    }
  }

  const slots: SynthesizedDosingSlot[] = [];
  for (const slotId of DOSING_SLOT_ORDER) {
    const prodMap = slotMap.get(slotId);
    if (!prodMap || prodMap.size === 0) continue;
    slots.push({
      slot: slotId,
      slotLabel: DOSING_SLOT_LABELS[slotId],
      entries: Array.from(prodMap.values()),
    });
  }

  const safetyReminders: string[] = [];
  if (hasProbiotics) {
    safetyReminders.push('所有益生菌制剂务必使用 ≤37℃ 温水吞服或冲服，避免高温灭活活性菌株。');
  }
  if (hasMealReplacement) {
    safetyReminders.push(
      '多器官共用「优康力」营养代餐时，每日总量保持 6勺+300ml 温水代替早或晚餐一次即可，小口慢饮无需重复加倍。'
    );
  }

  return {
    protocolCount: protocols.length,
    slots,
    safetyReminders,
    recommendedMaxCourseDays: maxDays,
  };
}

/**
 * Extracts active `DefaultOrganProtocol` items referenced inside a patient's `ManagedTaskItem[]`
 * and synthesizes their daily dosing schedule.
 */
export function buildDailyDosingScheduleFromTasks(
  tasks: ReadonlyArray<ManagedTaskItem>
): DailyDosingScheduleResult {
  const protocols: DefaultOrganProtocol[] = [];
  const seen = new Set<string>();
  for (const t of tasks) {
    const found = getDefaultProtocolById(t.templateId);
    if (found && !seen.has(found.id)) {
      seen.add(found.id);
      protocols.push(found);
    }
  }
  return buildDailyDosingSchedule(protocols);
}
