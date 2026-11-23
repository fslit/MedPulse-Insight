import { OrganId } from './healthModel';
import { PatientCohortRecord } from './patientCohort';

export type RecoveryPhotoKey =
  | 'zhouyaqin_hike'
  | 'suwanqing_wellness'
  | 'chenjianguo_cycling'
  | 'linxiao_morning';

export interface ExperienceMetricItem {
  id: string;
  label: string;
  baselineText: string;
  currentText: string;
  deltaBadge: string;
  /** 0..100 normalized wellness bar percentage for visual trajectory */
  wellnessPercent: number;
}

export interface LabProofItem {
  label: string;
  baselineValue: string;
  courseValue: string;
  referenceRange: string;
  achievedNormal: boolean;
}

export interface CourseExperienceNode {
  /** Exact match to TreatmentCourseRecord.id in patientCohort.ts */
  courseId: string;
  courseNo: number;
  courseLabel: string;
  durationLabel: string;
  milestoneStatus: 'baseline' | 'improving' | 'cured';
  milestoneTitle: string;
  patientQuote: string;
  sharedDate: string;
  photoCaption: string;
  experienceScore: number;
  experienceMetrics: ExperienceMetricItem[];
  labProofs: LabProofItem[];
}

export interface RecoverySuccessCase {
  id: string;
  patientId: string;
  patientName: string;
  genderAgeText: string;
  occupationTag: string;
  outcomeBadge: string;
  curedSummaryTitle: string;
  totalDurationText: string;
  primaryOrgan: OrganId;
  relatedOrgans: OrganId[];
  appliedDefaultProtocolIds: string[];
  appliedRegimenTitle: string;
  photoKey: RecoveryPhotoKey;
  photoLocationTag: string;
  attendingDoctorComment: string;
  courseNodes: CourseExperienceNode[];
}

export const RECOVERY_SUCCESS_CASES: ReadonlyArray<RecoverySuccessCase> = [
  {
    id: 'case-zhouyaqin',
    patientId: 'pat-zhouyaqin',
    patientName: '周雅琴',
    genderAgeText: '女 · 46岁',
    occupationTag: '中学教研主任',
    outcomeBadge: '2个疗程全项逆转结案',
    curedSummaryTitle: '轻度脂肪肝（8.4% → 4.3%）与临界血压完全恢复正常',
    totalDurationText: '2个标准疗程 · 共 180 天（24周）',
    primaryOrgan: 'liver',
    relatedOrgans: ['liver', 'heart', 'vascular'],
    appliedDefaultProtocolIds: ['def-liver', 'def-sleep-rhythm'],
    appliedRegimenTitle:
      '药名：易善复(首期后停药·零降压西药)｜品名：护肝菌 + 白胶囊 + 黑片 + 优康力 + 美龄鹿',
    photoKey: 'zhouyaqin_hike',
    photoLocationTag: '第2疗程结案后 · 晨间环湖步道 6公里徒步实拍分享',
    attendingDoctorComment:
      '陈景明主任点评：患者严格按 90 天单疗程规范完成 2 个周期肝脏恢复方案，MRI-PDFF 肝脂率从 8.4% 降至 4.3% 彻底脱帽，主观精力与深度睡眠同步大幅跃升。',
    courseNodes: [
      {
        courseId: 'zyq-c0',
        courseNo: 0,
        courseLabel: '初诊基线',
        durationLabel: '入组第 0 天 · 建档基线',
        milestoneStatus: 'baseline',
        milestoneTitle: '午后严重困倦乏力，右胁隐痛饱胀伴睡眠浅易醒',
        patientQuote:
          '入组前每天下午两三点眼皮发沉，晚饭稍微吃多一点右上腹就发闷发胀，夜里两三点总醒，走二十分钟坡路就喘。',
        sharedDate: '2026-05-08',
        photoCaption: '初诊建档阶段：体脂与肝脂肪含量超标，日间精力评分偏低',
        experienceScore: 56,
        experienceMetrics: [
          {
            id: 'energy',
            label: '日间清醒精力评分',
            baselineText: '5.2 / 10分',
            currentText: '5.2 / 10分',
            deltaBadge: '初诊基线',
            wellnessPercent: 52,
          },
          {
            id: 'sleep',
            label: '穿戴监测深度睡眠',
            baselineText: '1.1 小时/晚',
            currentText: '1.1 小时/晚',
            deltaBadge: '浅睡易醒',
            wellnessPercent: 44,
          },
          {
            id: 'bloating',
            label: '餐后右胁饱胀不适',
            baselineText: '每周 5–6 次',
            currentText: '每周 5–6 次',
            deltaBadge: '高频困扰',
            wellnessPercent: 35,
          },
          {
            id: 'stamina',
            label: '连续户外快走耐力',
            baselineText: '22 分钟',
            currentText: '22 分钟',
            deltaBadge: '心率易高',
            wellnessPercent: 40,
          },
        ],
        labProofs: [
          {
            label: '肝脏脂肪含量',
            baselineValue: '8.4%',
            courseValue: '8.4%',
            referenceRange: '< 5.0%',
            achievedNormal: false,
          },
          {
            label: '静息血压',
            baselineValue: '134/86 mmHg',
            courseValue: '134/86 mmHg',
            referenceRange: '90–129 / 60–84',
            achievedNormal: false,
          },
          {
            label: '总胆固醇 TC',
            baselineValue: '5.6 mmol/L',
            courseValue: '5.6 mmol/L',
            referenceRange: '< 5.2 mmol/L',
            achievedNormal: false,
          },
        ],
      },
      {
        courseId: 'zyq-c1',
        courseNo: 1,
        courseLabel: '第1疗程',
        durationLabel: '第1疗程满期 · 第 90 天',
        milestoneStatus: 'improving',
        milestoneTitle: '血压胆固醇率先归绿，午后困倦消退、深睡延长 48 分钟',
        patientQuote:
          '坚持早空腹白胶囊、晚餐后37℃温水冲服护肝菌、睡前黑片满一个疗程后，最明显的感受是午休起来头脑特别清爽，晚饭后不再胀气，晨起血压稳稳落在 126/81！',
        sharedDate: '2026-08-10',
        photoCaption: '第1疗程（90天）结案记录：减重 2.8kg，血压与血脂率先回归正常绿区',
        experienceScore: 82,
        experienceMetrics: [
          {
            id: 'energy',
            label: '日间清醒精力评分',
            baselineText: '5.2 分',
            currentText: '7.9 / 10分',
            deltaBadge: '提升 +2.7分',
            wellnessPercent: 79,
          },
          {
            id: 'sleep',
            label: '穿戴监测深度睡眠',
            baselineText: '1.1 小时',
            currentText: '1.9 小时/晚',
            deltaBadge: '延长 +48分钟',
            wellnessPercent: 76,
          },
          {
            id: 'bloating',
            label: '餐后右胁饱胀不适',
            baselineText: '每周 5–6 次',
            currentText: '每周 ≤1 次',
            deltaBadge: '缓解 80%',
            wellnessPercent: 82,
          },
          {
            id: 'stamina',
            label: '连续户外快走耐力',
            baselineText: '22 分钟',
            currentText: '48 分钟',
            deltaBadge: '续航翻倍',
            wellnessPercent: 75,
          },
        ],
        labProofs: [
          {
            label: '肝脏脂肪含量',
            baselineValue: '8.4%',
            courseValue: '5.8%',
            referenceRange: '< 5.0%',
            achievedNormal: false,
          },
          {
            label: '静息血压',
            baselineValue: '134/86 mmHg',
            courseValue: '126/81 mmHg',
            referenceRange: '90–129 / 60–84',
            achievedNormal: true,
          },
          {
            label: '总胆固醇 TC',
            baselineValue: '5.6 mmol/L',
            courseValue: '5.1 mmol/L',
            referenceRange: '< 5.2 mmol/L',
            achievedNormal: true,
          },
        ],
      },
      {
        courseId: 'zyq-c2',
        courseNo: 2,
        courseLabel: '第2疗程',
        durationLabel: '第2疗程康复结案 · 第 180 天',
        milestoneStatus: 'cured',
        milestoneTitle: '脂肪肝 4.3% 完全逆转脱帽，周末轻松完成 6 公里环湖徒步',
        patientQuote:
          '拿到第 2 疗程超声复查单看到肝脂降到 4.3% 全部箭头消失那一刻特别激动！现在每天早上六点半自然醒，周末环湖徒步 75 分钟气息都很稳，整个人轻盈了整整 5 公斤。',
        sharedDate: '2026-11-10',
        photoCaption: '第2疗程康复结案实拍：周女士晨间环湖徒步 6km 后分享健康状态（体重 -5.0kg）',
        experienceScore: 95,
        experienceMetrics: [
          {
            id: 'energy',
            label: '日间清醒精力评分',
            baselineText: '5.2 分',
            currentText: '9.4 / 10分',
            deltaBadge: '满格活力 +4.2分',
            wellnessPercent: 94,
          },
          {
            id: 'sleep',
            label: '穿戴监测深度睡眠',
            baselineText: '1.1 小时',
            currentText: '2.5 小时/晚',
            deltaBadge: '深睡达标 +1.4h',
            wellnessPercent: 93,
          },
          {
            id: 'bloating',
            label: '餐后右胁饱胀不适',
            baselineText: '每周 5–6 次',
            currentText: '0 次（完全消失）',
            deltaBadge: '症状清零',
            wellnessPercent: 98,
          },
          {
            id: 'stamina',
            label: '连续户外快走耐力',
            baselineText: '22 分钟',
            currentText: '75 分钟（6km）',
            deltaBadge: '提升 +240%',
            wellnessPercent: 95,
          },
        ],
        labProofs: [
          {
            label: '肝脏脂肪含量',
            baselineValue: '8.4%',
            courseValue: '4.3%',
            referenceRange: '< 5.0%',
            achievedNormal: true,
          },
          {
            label: '静息血压',
            baselineValue: '134/86 mmHg',
            courseValue: '122/78 mmHg',
            referenceRange: '90–129 / 60–84',
            achievedNormal: true,
          },
          {
            label: '总胆固醇 TC',
            baselineValue: '5.6 mmol/L',
            courseValue: '4.8 mmol/L',
            referenceRange: '< 5.2 mmol/L',
            achievedNormal: true,
          },
        ],
      },
    ],
  },
  {
    id: 'case-suwanqing',
    patientId: 'pat-suwanqing',
    patientName: '苏婉清',
    genderAgeText: '女 · 35岁',
    occupationTag: '互联网产品总监',
    outcomeBadge: '血脂胃黏膜双达标结案',
    curedSummaryTitle: '高胆固醇（6.3 → 5.1）转绿，胃窦黏膜充血与餐后反酸彻底平复',
    totalDurationText: '2个疗程 · 胃黏膜修复 + 优康力血管调脂',
    primaryOrgan: 'stomach',
    relatedOrgans: ['stomach', 'vascular', 'liver'],
    appliedDefaultProtocolIds: ['def-gastric-mucosa', 'def-vascular', 'def-sleep-rhythm'],
    appliedRegimenTitle:
      '药名：膜固思达/达喜(第2期停药) + 高纯度ω-3鱼油｜品名：太空晶球益生菌 + 优康力 + 开心季菌 + 正固素',
    photoKey: 'suwanqing_wellness',
    photoLocationTag: '第2疗程复评转绿当日 · 居家营养早餐与温水益生菌打卡实拍',
    attendingDoctorComment:
      '沈知夏副主任点评：针对白领高频外卖与空腹冰咖啡导致的胃黏膜屏障受损合并高胆固醇，采用太空晶球益生菌修复胃黏膜、优康力减少肠道胆固醇重吸收，两疗程实现无药双逆转。',
    courseNodes: [
      {
        courseId: 'swq-c0',
        courseNo: 0,
        courseLabel: '初诊基线',
        durationLabel: '入组第 0 天 · 胃镜与血脂基线',
        milestoneStatus: 'baseline',
        milestoneTitle: '频繁餐后反酸嗳气、上腹隐痛，高胆固醇伴入睡困难',
        patientQuote:
          '以前靠冰美式续命，一忙起来下午胃里泛酸烧心，晚上十一点躺下脑子还在转，体检出来总胆固醇 6.3、胃窦充血，整个人脸色暗沉焦躁。',
        sharedDate: '2026-05-20',
        photoCaption: '初诊建档阶段：TC 6.3 mmol/L、LDL-C 4.1 mmol/L，胃镜示胃窦黏膜充血',
        experienceScore: 58,
        experienceMetrics: [
          {
            id: 'acid',
            label: '餐后反酸/胃胀频次',
            baselineText: '每周 5 次',
            currentText: '每周 5 次',
            deltaBadge: '黏膜充血期',
            wellnessPercent: 34,
          },
          {
            id: 'sleep_lat',
            label: '夜间入睡潜伏时长',
            baselineText: '48 分钟',
            currentText: '48 分钟',
            deltaBadge: '入睡困难',
            wellnessPercent: 42,
          },
          {
            id: 'skin_vitality',
            label: '晨起气色与排便规律',
            baselineText: '5.5 / 10分',
            currentText: '5.5 / 10分',
            deltaBadge: '肠胃紊乱',
            wellnessPercent: 55,
          },
          {
            id: 'focus',
            label: '午后专注抗疲劳度',
            baselineText: '5.8 / 10分',
            currentText: '5.8 / 10分',
            deltaBadge: '午后脑雾',
            wellnessPercent: 58,
          },
        ],
        labProofs: [
          {
            label: '总胆固醇 TC',
            baselineValue: '6.3 mmol/L',
            courseValue: '6.3 mmol/L',
            referenceRange: '< 5.2 mmol/L',
            achievedNormal: false,
          },
          {
            label: '低密度脂蛋白 LDL-C',
            baselineValue: '4.1 mmol/L',
            courseValue: '4.1 mmol/L',
            referenceRange: '< 3.4 mmol/L',
            achievedNormal: false,
          },
          {
            label: '胃窦黏膜评估',
            baselineValue: '轻度浅表充血',
            courseValue: '轻度浅表充血',
            referenceRange: '黏膜光滑正常',
            achievedNormal: false,
          },
        ],
      },
      {
        courseId: 'swq-c1',
        courseNo: 1,
        courseLabel: '第1疗程',
        durationLabel: '第1疗程结案 · 胃黏膜修复达标',
        milestoneStatus: 'improving',
        milestoneTitle: '反酸烧心感基本消失，总胆固醇稳步回落 0.7 mmol/L',
        patientQuote:
          '停掉空腹冰咖啡、按时用 37℃ 以下温水服太空晶球益生菌两周后，胃里那种火辣反酸感就退下去了；晚餐用优康力慢饮代餐既顶饱又舒服，睡眠也踏实多了。',
        sharedDate: '2026-08-22',
        photoCaption: '第1疗程复评：胃胀反酸显著缓解，TC 降至 5.6 mmol/L',
        experienceScore: 84,
        experienceMetrics: [
          {
            id: 'acid',
            label: '餐后反酸/胃胀频次',
            baselineText: '每周 5 次',
            currentText: '每周 ≤1 次',
            deltaBadge: '减少 80%',
            wellnessPercent: 84,
          },
          {
            id: 'sleep_lat',
            label: '夜间入睡潜伏时长',
            baselineText: '48 分钟',
            currentText: '22 分钟',
            deltaBadge: '缩短 26分钟',
            wellnessPercent: 80,
          },
          {
            id: 'skin_vitality',
            label: '晨起气色与排便规律',
            baselineText: '5.5 分',
            currentText: '8.2 / 10分',
            deltaBadge: '每日规律顺畅',
            wellnessPercent: 82,
          },
          {
            id: 'focus',
            label: '午后专注抗疲劳度',
            baselineText: '5.8 分',
            currentText: '8.4 / 10分',
            deltaBadge: '提升 +2.6分',
            wellnessPercent: 84,
          },
        ],
        labProofs: [
          {
            label: '总胆固醇 TC',
            baselineValue: '6.3 mmol/L',
            courseValue: '5.6 mmol/L',
            referenceRange: '< 5.2 mmol/L',
            achievedNormal: false,
          },
          {
            label: '低密度脂蛋白 LDL-C',
            baselineValue: '4.1 mmol/L',
            courseValue: '3.5 mmol/L',
            referenceRange: '< 3.4 mmol/L',
            achievedNormal: false,
          },
          {
            label: '肝脏脂肪含量',
            baselineValue: '6.4%',
            courseValue: '5.3%',
            referenceRange: '< 5.0%',
            achievedNormal: false,
          },
        ],
      },
      {
        courseId: 'swq-c2',
        courseNo: 2,
        courseLabel: '第2疗程',
        durationLabel: '第2疗程康复结案 · 全项转绿',
        milestoneStatus: 'cured',
        milestoneTitle: 'TC 5.1 / LDL-C 3.1 / 肝脂 4.5% 全面转绿，胃黏膜彻底恢复稳态',
        patientQuote:
          '两个疗程下来不仅胃养好了，连困扰两年的高胆固醇和轻度肝脂沉积也一次性全部变回绿色正常值！现在每天早上一杯温水益生菌配燕麦早餐已经成了最享受的习惯。',
        sharedDate: '2026-11-18',
        photoCaption: '第2疗程结案实拍：苏女士分享居家清晨 37℃ 温水益生菌与高纤早餐日常',
        experienceScore: 94,
        experienceMetrics: [
          {
            id: 'acid',
            label: '餐后反酸/胃胀频次',
            baselineText: '每周 5 次',
            currentText: '0 次（完全平复）',
            deltaBadge: '胃黏膜稳态',
            wellnessPercent: 97,
          },
          {
            id: 'sleep_lat',
            label: '夜间入睡潜伏时长',
            baselineText: '48 分钟',
            currentText: '14 分钟',
            deltaBadge: '脑肠轴同调',
            wellnessPercent: 93,
          },
          {
            id: 'skin_vitality',
            label: '晨起气色与排便规律',
            baselineText: '5.5 分',
            currentText: '9.5 / 10分',
            deltaBadge: '肤色透亮红润',
            wellnessPercent: 95,
          },
          {
            id: 'focus',
            label: '午后专注抗疲劳度',
            baselineText: '5.8 分',
            currentText: '9.2 / 10分',
            deltaBadge: '全天精力充沛',
            wellnessPercent: 92,
          },
        ],
        labProofs: [
          {
            label: '总胆固醇 TC',
            baselineValue: '6.3 mmol/L',
            courseValue: '5.1 mmol/L',
            referenceRange: '< 5.2 mmol/L',
            achievedNormal: true,
          },
          {
            label: '低密度脂蛋白 LDL-C',
            baselineValue: '4.1 mmol/L',
            courseValue: '3.1 mmol/L',
            referenceRange: '< 3.4 mmol/L',
            achievedNormal: true,
          },
          {
            label: '胃窦黏膜与肝脂',
            baselineValue: '充血 / 6.4%',
            courseValue: '正常 / 4.5%',
            referenceRange: '光滑 / < 5.0%',
            achievedNormal: true,
          },
        ],
      },
    ],
  },
  {
    id: 'case-chenjianguo',
    patientId: 'pat-chenjianguo',
    patientName: '陈建国',
    genderAgeText: '男 · 52岁',
    occupationTag: '制造企业负责人',
    outcomeBadge: '3疗程血压降20mmHg标杆',
    curedSummaryTitle: '血压由 156/98 稳降至 136/86 mmHg，中度脂肪肝（14.6%）大幅消退至 8.2%',
    totalDurationText: '3个阶梯疗程 · 累计减重 7.1 kg',
    primaryOrgan: 'heart',
    relatedOrgans: ['heart', 'liver', 'vascular'],
    appliedDefaultProtocolIds: ['def-vascular', 'def-liver'],
    appliedRegimenTitle:
      '药名：苯磺酸氨氯地平片(5mg→2.5mg减半) + 瑞舒伐他汀钙片 + 辅酶Q10｜品名：优康力 + 护肝菌 + 白胶囊 + 黑片',
    photoKey: 'chenjianguo_cycling',
    photoLocationTag: '第3疗程第8周 · 傍晚滨江绿道 30公里有氧骑行打卡实拍',
    attendingDoctorComment:
      '陈景明主任点评：患者初诊合并二级临界高血压、中度脂肪肝与空腹血糖受损（6.3），通过三疗程阶梯式内皮修复与减重，空腹血糖已率先恢复 5.5 正常值，收缩压累计下降 20 mmHg。',
    courseNodes: [
      {
        courseId: 'cjg-c0',
        courseNo: 0,
        courseLabel: '初诊基线',
        durationLabel: '入组第 0 天 · 三高共病高危基线',
        milestoneStatus: 'baseline',
        milestoneTitle: '午后头晕后颈发紧、应酬后胸闷气短，腰围超标伴鼾症',
        patientQuote:
          '年初体检血压冲到 156/98、中度脂肪肝 14.6%、血糖也亮红灯，下午开会经常觉得后脖子发紧头晕，上三层楼就喘，夜里打呼噜老婆都担心。',
        sharedDate: '2026-03-10',
        photoCaption: '初诊建档阶段：体重 84.2kg（BMI 27.5），血压、肝脂、血糖三项高危预警',
        experienceScore: 49,
        experienceMetrics: [
          {
            id: 'dizziness',
            label: '午后头晕/后颈紧绷',
            baselineText: '每周 5–6 次',
            currentText: '每周 5–6 次',
            deltaBadge: '血管高压负荷',
            wellnessPercent: 30,
          },
          {
            id: 'cycling_km',
            label: '单次无喘有氧骑行',
            baselineText: '6 公里',
            currentText: '6 公里',
            deltaBadge: '心肺受限',
            wellnessPercent: 35,
          },
          {
            id: 'snore_sleep',
            label: '夜间呼吸顺畅睡眠分',
            baselineText: '61 / 100分',
            currentText: '61 / 100分',
            deltaBadge: '夜醒口干',
            wellnessPercent: 50,
          },
          {
            id: 'resting_hr',
            label: '晨起静息心率',
            baselineText: '84 次/分',
            currentText: '84 次/分',
            deltaBadge: '交感偏兴奋',
            wellnessPercent: 52,
          },
        ],
        labProofs: [
          {
            label: '静息血压',
            baselineValue: '156/98 mmHg',
            courseValue: '156/98 mmHg',
            referenceRange: '90–129 / 60–84',
            achievedNormal: false,
          },
          {
            label: '肝脏脂肪含量',
            baselineValue: '14.6%（中度）',
            courseValue: '14.6%（中度）',
            referenceRange: '< 5.0%',
            achievedNormal: false,
          },
          {
            label: '空腹血糖 FPG',
            baselineValue: '6.3 mmol/L',
            courseValue: '6.3 mmol/L',
            referenceRange: '3.9–6.1 mmol/L',
            achievedNormal: false,
          },
        ],
      },
      {
        courseId: 'cjg-c1',
        courseNo: 1,
        courseLabel: '第1疗程',
        durationLabel: '第1疗程结案 · 戒酒限盐稳压期',
        milestoneStatus: 'improving',
        milestoneTitle: '收缩压首降 10 mmHg，空腹血糖重回 5.9 安全区间',
        patientQuote:
          '第一疗程把晚间应酬换成优康力代餐，配合低冲击骑行，一个月不到头晕脖子紧的感觉就少了一大半，体重减了近 6 斤，血糖先一步回到了正常线内！',
        sharedDate: '2026-06-12',
        photoCaption: '第1疗程复评：减重 2.9kg，血压回落至 146/92 mmHg，血糖转绿',
        experienceScore: 73,
        experienceMetrics: [
          {
            id: 'dizziness',
            label: '午后头晕/后颈紧绷',
            baselineText: '每周 5–6 次',
            currentText: '每周 2 次',
            deltaBadge: '显著减轻',
            wellnessPercent: 70,
          },
          {
            id: 'cycling_km',
            label: '单次无喘有氧骑行',
            baselineText: '6 公里',
            currentText: '16 公里',
            deltaBadge: '提升 +10km',
            wellnessPercent: 68,
          },
          {
            id: 'snore_sleep',
            label: '夜间呼吸顺畅睡眠分',
            baselineText: '61 分',
            currentText: '77 / 100分',
            deltaBadge: '打鼾减轻',
            wellnessPercent: 77,
          },
          {
            id: 'resting_hr',
            label: '晨起静息心率',
            baselineText: '84 次/分',
            currentText: '79 次/分',
            deltaBadge: '下降 5 bpm',
            wellnessPercent: 74,
          },
        ],
        labProofs: [
          {
            label: '静息血压',
            baselineValue: '156/98 mmHg',
            courseValue: '146/92 mmHg',
            referenceRange: '90–129 / 60–84',
            achievedNormal: false,
          },
          {
            label: '肝脏脂肪含量',
            baselineValue: '14.6%',
            courseValue: '12.1%',
            referenceRange: '< 5.0%',
            achievedNormal: false,
          },
          {
            label: '空腹血糖 FPG',
            baselineValue: '6.3 mmol/L',
            courseValue: '5.9 mmol/L',
            referenceRange: '3.9–6.1 mmol/L',
            achievedNormal: true,
          },
        ],
      },
      {
        courseId: 'cjg-c2',
        courseNo: 2,
        courseLabel: '第2疗程',
        durationLabel: '第2疗程结案 · 中度脂肪肝成功降级',
        milestoneStatus: 'improving',
        milestoneTitle: '肝脂肪率跨入 9.8% 脱离中度，胃黏膜同步恢复正常',
        patientQuote:
          '第二个疗程叠加护肝菌三联方案后，腰围足足收了 6 厘米，以前系不上的皮带扣松了两格，骑车 24 公里心率依然很平稳。',
        sharedDate: '2026-09-15',
        photoCaption: '第2疗程复评：累计减重 5.4kg，中度脂肪肝降为轻度，胃镜黏膜转正常',
        experienceScore: 84,
        experienceMetrics: [
          {
            id: 'dizziness',
            label: '午后头晕/后颈紧绷',
            baselineText: '每周 5–6 次',
            currentText: '偶发 ≤1次/月',
            deltaBadge: '基本消除',
            wellnessPercent: 86,
          },
          {
            id: 'cycling_km',
            label: '单次无喘有氧骑行',
            baselineText: '6 公里',
            currentText: '24 公里',
            deltaBadge: '心肺强健',
            wellnessPercent: 83,
          },
          {
            id: 'snore_sleep',
            label: '夜间呼吸顺畅睡眠分',
            baselineText: '61 分',
            currentText: '85 / 100分',
            deltaBadge: '整夜安睡',
            wellnessPercent: 85,
          },
          {
            id: 'resting_hr',
            label: '晨起静息心率',
            baselineText: '84 次/分',
            currentText: '76 次/分',
            deltaBadge: '下降 8 bpm',
            wellnessPercent: 84,
          },
        ],
        labProofs: [
          {
            label: '静息血压',
            baselineValue: '156/98 mmHg',
            courseValue: '140/89 mmHg',
            referenceRange: '90–129 / 60–84',
            achievedNormal: false,
          },
          {
            label: '肝脏脂肪含量',
            baselineValue: '14.6%（中度）',
            courseValue: '9.8%（转轻度）',
            referenceRange: '< 5.0%',
            achievedNormal: false,
          },
          {
            label: '空腹血糖 FPG',
            baselineValue: '6.3 mmol/L',
            courseValue: '5.6 mmol/L',
            referenceRange: '3.9–6.1 mmol/L',
            achievedNormal: true,
          },
        ],
      },
      {
        courseId: 'cjg-c3',
        courseNo: 3,
        courseLabel: '第3疗程',
        durationLabel: '第3疗程第8周 · 冲击全面稳态',
        milestoneStatus: 'cured',
        milestoneTitle: '累计减重 14.2 斤、收缩压大降 20 mmHg，傍晚轻松骑行 32 公里',
        patientQuote:
          '现在晨起家庭自测血压稳定在 133/84 左右，午后头晕胸闷彻底没再犯过！傍晚沿滨江绿道骑行 32 公里浑身通透，身边好几个企业家朋友看到我的变化都来建档了。',
        sharedDate: '2026-11-15',
        photoCaption: '第3疗程实拍分享：陈先生傍晚滨江绿道完成 32km 靶心率骑行后自测心率 74bpm',
        experienceScore: 92,
        experienceMetrics: [
          {
            id: 'dizziness',
            label: '午后头晕/后颈紧绷',
            baselineText: '每周 5–6 次',
            currentText: '0 次（完全消失）',
            deltaBadge: '症状清零',
            wellnessPercent: 96,
          },
          {
            id: 'cycling_km',
            label: '单次无喘有氧骑行',
            baselineText: '6 公里',
            currentText: '32 公里',
            deltaBadge: '耐力提升 5倍',
            wellnessPercent: 94,
          },
          {
            id: 'snore_sleep',
            label: '夜间呼吸顺畅睡眠分',
            baselineText: '61 分',
            currentText: '91 / 100分',
            deltaBadge: '鼾症大幅消退',
            wellnessPercent: 91,
          },
          {
            id: 'resting_hr',
            label: '晨起静息心率',
            baselineText: '84 次/分',
            currentText: '74 次/分',
            deltaBadge: '下降 10 bpm',
            wellnessPercent: 92,
          },
        ],
        labProofs: [
          {
            label: '静息血压（门诊/晨测）',
            baselineValue: '156/98 mmHg',
            courseValue: '136/86（晨133/84）',
            referenceRange: '累计降 20/12 mmHg',
            achievedNormal: true,
          },
          {
            label: '肝脏脂肪含量',
            baselineValue: '14.6%（中度）',
            courseValue: '8.2%（降幅 44%）',
            referenceRange: '< 5.0%',
            achievedNormal: true,
          },
          {
            label: '空腹血糖 FPG',
            baselineValue: '6.3 mmol/L',
            courseValue: '5.5 mmol/L',
            referenceRange: '3.9–6.1 mmol/L',
            achievedNormal: true,
          },
        ],
      },
    ],
  },
  {
    id: 'case-linxiao',
    patientId: 'pat-linxiao',
    patientName: '林晓',
    genderAgeText: '通用 · 38岁',
    occupationTag: '建筑设计合伙人',
    outcomeBadge: '第2疗程稳步改善见证',
    curedSummaryTitle: '双疗程减重 3.7 kg，肝脂肪率下降 2.6%，晨起静息心率与睡眠明显优化',
    totalDurationText: '第2疗程进行中（累计管理 21 周）',
    primaryOrgan: 'vascular',
    relatedOrgans: ['heart', 'liver', 'vascular'],
    appliedDefaultProtocolIds: ['def-liver', 'def-vascular'],
    appliedRegimenTitle:
      '药名：苯磺酸氨氯地平片(络活喜2.5mg) + 辅酶Q10软胶囊｜品名：护肝菌 + 白胶囊 + 黑片 + 优康力',
    photoKey: 'linxiao_morning',
    photoLocationTag: '第2疗程第9周 · 晨起血压心率自测与优康力温水代餐打卡实拍',
    attendingDoctorComment:
      '陈景明主任点评：熬夜伏案人群典型双疗程稳步下降曲线，第 2 疗程引入肝脏三联与优康力代餐后，斜率明显加快，预计本疗程结案即可跨入理想靶区。',
    courseNodes: [
      {
        courseId: 'c0-baseline',
        courseNo: 0,
        courseLabel: '初诊基线',
        durationLabel: '入组第 0 天 · 筛查基线',
        milestoneStatus: 'baseline',
        milestoneTitle: '熬夜审图后心悸耳鸣、晨起头昏沉，肝脂与胆固醇双高',
        patientQuote:
          '赶项目通宵后经常觉得心跳快、太阳穴发胀，体检查出 148/95 临界高血压和 11.2% 脂肪肝，下决心跟陈主任做系统非药物调理。',
        sharedDate: '2026-06-15',
        photoCaption: '初诊建档阶段：血压 148/95 mmHg，肝脂肪率 11.2%，TC 6.2 mmol/L',
        experienceScore: 60,
        experienceMetrics: [
          {
            id: 'morning_clarity',
            label: '晨起头脑清爽度',
            baselineText: '5.4 / 10分',
            currentText: '5.4 / 10分',
            deltaBadge: '晨起昏沉',
            wellnessPercent: 54,
          },
          {
            id: 'hr_rest',
            label: '静息心率稳态',
            baselineText: '81 次/分',
            currentText: '81 次/分',
            deltaBadge: '偏快',
            wellnessPercent: 56,
          },
          {
            id: 'sleep_deep',
            label: '夜间深睡比例',
            baselineText: '14%',
            currentText: '14%',
            deltaBadge: '睡眠碎片化',
            wellnessPercent: 48,
          },
          {
            id: 'waist_feel',
            label: '腰腹轻盈体感分',
            baselineText: '5.2 / 10分',
            currentText: '5.2 / 10分',
            deltaBadge: '久坐腹胀',
            wellnessPercent: 52,
          },
        ],
        labProofs: [
          {
            label: '静息血压',
            baselineValue: '148/95 mmHg',
            courseValue: '148/95 mmHg',
            referenceRange: '90–129 / 60–84',
            achievedNormal: false,
          },
          {
            label: '肝脏脂肪含量',
            baselineValue: '11.2%',
            courseValue: '11.2%',
            referenceRange: '< 5.0%',
            achievedNormal: false,
          },
          {
            label: '总胆固醇 TC',
            baselineValue: '6.2 mmol/L',
            courseValue: '6.2 mmol/L',
            referenceRange: '< 5.2 mmol/L',
            achievedNormal: false,
          },
        ],
      },
      {
        courseId: 'c1-course1',
        courseNo: 1,
        courseLabel: '第1疗程',
        durationLabel: '第1疗程满期 · 第 12 周',
        milestoneStatus: 'improving',
        milestoneTitle: '养成规律快走与低钠饮食习惯，肝脂肪率跨入 10% 以内',
        patientQuote:
          '首疗程先把外卖和夜宵戒了，每周四次公园快走，三个月瘦了 3.6 斤，熬夜后的心慌感明显少了。',
        sharedDate: '2026-09-16',
        photoCaption: '第1疗程结案：体重由 70.2kg 降至 68.4kg，肝脂降至 9.8%',
        experienceScore: 76,
        experienceMetrics: [
          {
            id: 'morning_clarity',
            label: '晨起头脑清爽度',
            baselineText: '5.4 分',
            currentText: '7.4 / 10分',
            deltaBadge: '提升 +2.0分',
            wellnessPercent: 74,
          },
          {
            id: 'hr_rest',
            label: '静息心率稳态',
            baselineText: '81 次/分',
            currentText: '78 次/分',
            deltaBadge: '下降 3 bpm',
            wellnessPercent: 74,
          },
          {
            id: 'sleep_deep',
            label: '夜间深睡比例',
            baselineText: '14%',
            currentText: '20%',
            deltaBadge: '提升 +6%',
            wellnessPercent: 75,
          },
          {
            id: 'waist_feel',
            label: '腰腹轻盈体感分',
            baselineText: '5.2 分',
            currentText: '7.5 / 10分',
            deltaBadge: '减重 1.8kg',
            wellnessPercent: 75,
          },
        ],
        labProofs: [
          {
            label: '静息血压',
            baselineValue: '148/95 mmHg',
            courseValue: '145/93 mmHg',
            referenceRange: '90–129 / 60–84',
            achievedNormal: false,
          },
          {
            label: '肝脏脂肪含量',
            baselineValue: '11.2%',
            courseValue: '9.8%',
            referenceRange: '< 5.0%',
            achievedNormal: false,
          },
          {
            label: '总胆固醇 TC',
            baselineValue: '6.2 mmol/L',
            courseValue: '6.0 mmol/L',
            referenceRange: '< 5.2 mmol/L',
            achievedNormal: false,
          },
        ],
      },
      {
        courseId: 'c2-course2',
        courseNo: 2,
        courseLabel: '第2疗程',
        durationLabel: '第2疗程第 9 周 · 强化逆转中',
        milestoneStatus: 'cured',
        milestoneTitle: '叠加护肝菌三联与优康力代餐后加速改善，深睡占比升至 25%',
        patientQuote:
          '第二疗程加上护肝菌和优康力温水代餐后，身体反馈比第一疗程更快！早上手表深睡稳定在 2 小时以上，晨起慢跑 5 公里配速轻松进 6 分半。',
        sharedDate: '2026-11-19',
        photoCaption: '第2疗程阶段实拍：晨起温水优康力代餐、睡眠手表与血压监测日常（累计减重 3.7kg）',
        experienceScore: 88,
        experienceMetrics: [
          {
            id: 'morning_clarity',
            label: '晨起头脑清爽度',
            baselineText: '5.4 分',
            currentText: '8.7 / 10分',
            deltaBadge: '提升 +3.3分',
            wellnessPercent: 87,
          },
          {
            id: 'hr_rest',
            label: '静息心率稳态',
            baselineText: '81 次/分',
            currentText: '76 次/分',
            deltaBadge: '下降 5 bpm',
            wellnessPercent: 86,
          },
          {
            id: 'sleep_deep',
            label: '夜间深睡比例',
            baselineText: '14%',
            currentText: '25%',
            deltaBadge: '高质量深睡',
            wellnessPercent: 88,
          },
          {
            id: 'waist_feel',
            label: '腰腹轻盈体感分',
            baselineText: '5.2 分',
            currentText: '8.8 / 10分',
            deltaBadge: '累计减重 3.7kg',
            wellnessPercent: 88,
          },
        ],
        labProofs: [
          {
            label: '静息血压',
            baselineValue: '148/95 mmHg',
            courseValue: '142/92 mmHg',
            referenceRange: '较初诊 -6/-3',
            achievedNormal: false,
          },
          {
            label: '肝脏脂肪含量',
            baselineValue: '11.2%',
            courseValue: '8.6%',
            referenceRange: '较初诊 -2.6%',
            achievedNormal: true,
          },
          {
            label: '总胆固醇 TC',
            baselineValue: '6.2 mmol/L',
            courseValue: '5.8 mmol/L',
            referenceRange: '稳步回落 -0.4',
            achievedNormal: true,
          },
        ],
      },
    ],
  },
];

export interface AlignedCaseResolution {
  /** 'own_case' when the patient has their own course-aligned photos & experience data;
   *  'peer_benchmark' when viewing a new baseline patient (e.g. 赵明轩) and showing a matched cured peer case */
  mode: 'own_case' | 'peer_benchmark';
  activeCase: RecoverySuccessCase;
  alignedNode: CourseExperienceNode;
  availableBenchmarkCases: RecoverySuccessCase[];
  alignmentReason: string;
}

export function getRecoveryCaseByPatientId(
  patientId: string
): RecoverySuccessCase | undefined {
  return RECOVERY_SUCCESS_CASES.find((c) => c.patientId === patientId);
}

export function findNodeAlignedToCourse(
  successCase: RecoverySuccessCase,
  courseId?: string,
  courseNo?: number
): CourseExperienceNode {
  if (courseId) {
    const exact = successCase.courseNodes.find((n) => n.courseId === courseId);
    if (exact) return exact;
  }
  if (typeof courseNo === 'number') {
    const byNo = successCase.courseNodes.find((n) => n.courseNo === courseNo);
    if (byNo) return byNo;
  }
  return successCase.courseNodes[successCase.courseNodes.length - 1];
}

/**
 * Resolves the exact Course-Aligned Recovery Case & Experience Node for the currently
 * inspected patient, course, and selected 3D organ on the Widescreen.
 */
export function resolveAlignedCaseForPatient(
  patient: PatientCohortRecord,
  inspectedCourseId: string,
  selectedOrgan: OrganId | null,
  preferredBenchmarkCaseId?: string
): AlignedCaseResolution {
  const inspectedCourse =
    patient.courses.find((c) => c.id === inspectedCourseId) ??
    patient.courses[patient.courses.length - 1];

  const ownCase = getRecoveryCaseByPatientId(patient.id);
  if (ownCase) {
    const alignedNode = findNodeAlignedToCourse(
      ownCase,
      inspectedCourse.id,
      inspectedCourse.courseNo
    );
    return {
      mode: 'own_case',
      activeCase: ownCase,
      alignedNode,
      availableBenchmarkCases: [...RECOVERY_SUCCESS_CASES],
      alignmentReason: `已精确对齐本患者「${alignedNode.courseLabel}」实拍照片、穿戴体感数据与复查指标`,
    };
  }

  // Peer benchmark matching for newly enrolled patients (e.g. 赵明轩, 第1疗程第1周)
  const curedBenchmarks = RECOVERY_SUCCESS_CASES.filter(
    (c) => c.id !== 'case-linxiao'
  );

  let matchedCase: RecoverySuccessCase | undefined;
  if (preferredBenchmarkCaseId) {
    matchedCase = RECOVERY_SUCCESS_CASES.find((c) => c.id === preferredBenchmarkCaseId);
  }
  if (!matchedCase && selectedOrgan) {
    matchedCase =
      curedBenchmarks.find((c) => c.primaryOrgan === selectedOrgan) ??
      curedBenchmarks.find((c) => c.relatedOrgans.includes(selectedOrgan));
  }
  if (!matchedCase) {
    matchedCase = curedBenchmarks[0];
  }

  // For a new patient on Course 1, default to showing the cured final node if comparing vs target,
  // or match courseNo when stepping through courses so the doctor can contrast Course 1 vs Cured Course 2!
  const targetCourseNo =
    patient.compareCourseId === 'target_course_end' && inspectedCourse.courseNo <= 1
      ? matchedCase.courseNodes[matchedCase.courseNodes.length - 1].courseNo
      : inspectedCourse.courseNo;

  const alignedNode = findNodeAlignedToCourse(
    matchedCase,
    undefined,
    targetCourseNo
  );

  return {
    mode: 'peer_benchmark',
    activeCase: matchedCase,
    alignedNode,
    availableBenchmarkCases: curedBenchmarks,
    alignmentReason: `当前患者刚入组首疗程，已自动匹配同方案康复标杆「${matchedCase.patientName} · ${matchedCase.outcomeBadge}」按疗程对照讲解`,
  };
}

export function filterRecoveryCases(
  organFilter: OrganId | 'all',
  searchQuery = ''
): RecoverySuccessCase[] {
  const q = searchQuery.trim().toLowerCase();
  return RECOVERY_SUCCESS_CASES.filter((item) => {
    if (
      organFilter !== 'all' &&
      item.primaryOrgan !== organFilter &&
      !item.relatedOrgans.includes(organFilter)
    ) {
      return false;
    }
    if (!q) return true;
    return (
      item.patientName.toLowerCase().includes(q) ||
      item.curedSummaryTitle.toLowerCase().includes(q) ||
      item.appliedRegimenTitle.toLowerCase().includes(q) ||
      item.outcomeBadge.toLowerCase().includes(q) ||
      item.occupationTag.toLowerCase().includes(q)
    );
  });
}
