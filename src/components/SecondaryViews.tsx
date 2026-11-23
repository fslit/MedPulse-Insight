import React, { useState } from 'react';
import { Check, ArrowUpRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  ACTION_PLANS,
  ActionPlanItem,
  NavTabId,
  ORGAN_ORDER,
  ORGAN_RECORDS,
  OrganId,
  OrganRecord,
  RISK_PROMPTS,
  RiskPromptItem,
  TREND_6M_DATA,
} from '../utils/healthModel';
import { OrganIcon } from './OrganIcons';

interface SecondaryViewsProps {
  activeTab: Exclude<NavTabId, 'report'>;
  organRecords?: Record<OrganId, OrganRecord>;
  riskPrompts?: RiskPromptItem[];
  onLocateOrganIn3D: (organId: OrganId) => void;
  completedPlans: ActionPlanItem['id'][];
  onTogglePlanComplete: (planId: ActionPlanItem['id']) => void;
  projectedScore: number;
}

export const SecondaryViews: React.FC<SecondaryViewsProps> = ({
  activeTab,
  organRecords = ORGAN_RECORDS,
  riskPrompts = RISK_PROMPTS,
  onLocateOrganIn3D,
  completedPlans,
  onTogglePlanComplete,
  projectedScore,
}) => {
  const [organFilter, setOrganFilter] = useState<'all' | 'attention'>('all');

  if (activeTab === 'profile') {
    const allOrgans = ORGAN_ORDER.map((id) => organRecords[id]);
    const attentionCount = allOrgans.filter((o) => o.severity !== 'normal').length;
    const organs =
      organFilter === 'attention'
        ? allOrgans.filter((o) => o.severity !== 'normal')
        : allOrgans;
    return (
      <section className="space-y-4">
        <div className="bg-white border border-[#dce5ec] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">全身八大器官与系统数字画像</h2>
            <p className="text-xs text-slate-500 mt-1">
              汇总体检检验、超声及复查随访结果，点击任一卡片可跳转至 3D 人体精准定位并唤出引线评估卡。
            </p>
          </div>
          <div
            role="group"
            aria-label="器官状态筛选"
            className="inline-flex items-center bg-[#edf2f6] border border-[#dce5ec] rounded-xl p-1 self-start"
          >
            <button
              type="button"
              onClick={() => setOrganFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                organFilter === 'all'
                  ? 'bg-white text-[#0d7a8a] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部器官 (8)
            </button>
            <button
              type="button"
              onClick={() => setOrganFilter('attention')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                organFilter === 'attention'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              仅看需关注 ({attentionCount})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {organs.map((organ) => (
            <div
              key={organ.id}
              className="bg-white border border-[#dce5ec] rounded-2xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        organ.severity !== 'normal'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-[#eaf5f7] text-[#0d7a8a]'
                      }`}
                    >
                      <OrganIcon organId={organ.id} className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{organ.name}</h3>
                      <span className="text-[11px] text-slate-500">{organ.systemName}</span>
                    </div>
                  </div>
                  <span
                    className={`text-lg font-extrabold font-num ${
                      organ.severity !== 'normal' ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {organ.score}分
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">{organ.summary}</p>

                <div className="space-y-1.5 pt-2.5 border-t border-[#e8eef3] text-xs">
                  {organ.metrics.slice(0, 2).map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-slate-500">{m.label}</span>
                      <span className={`font-num font-semibold ${m.abnormal ? 'text-amber-700' : 'text-slate-800'}`}>
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onLocateOrganIn3D(organ.id)}
                className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#eaf5f7] hover:bg-[#d8ecf0] border border-[#b5dce3] text-[#0d7a8a] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>在 3D 人体中定位查看</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (activeTab === 'risks') {
    return (
      <section className="space-y-4">
        <div className="bg-white border border-[#dce5ec] rounded-2xl p-5">
          <h2 className="text-lg font-bold text-slate-900">代谢与心血管协同风险评估</h2>
          <p className="text-xs text-slate-500 mt-1">
            当前共 {riskPrompts.length} 项重点关注指标，点击可返回三维解剖图谱定位对应靶器官。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {riskPrompts.map((risk) => {
            const organ = organRecords[risk.organId];
            return (
              <div
                key={risk.id}
                className="bg-white border border-[#dce5ec] rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          risk.severity === 'alert' ? 'text-red-600' : 'text-amber-600'
                        }`}
                      />
                      <h3 className="text-base font-bold text-slate-900">{risk.title}</h3>
                    </div>
                    <span className="text-xs font-num font-semibold text-amber-700">
                      {risk.metricSummary}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                    <p>
                      <strong className="text-slate-900">病理生理关联：</strong>
                      {risk.mechanism}
                    </p>
                    <p>
                      <strong className="text-emerald-700">12 周控制目标：</strong>
                      {risk.targetGoal}
                    </p>
                    <p className="text-slate-500">{organ.advice}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onLocateOrganIn3D(risk.organId)}
                  className="mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#0d7a8a] hover:bg-[#096472] text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>定位 {organ.name} 3D 病灶解剖位</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (activeTab === 'plans') {
    return (
      <section className="space-y-4">
        <div className="bg-white border border-[#dce5ec] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">12 周可执行生活方式干预方案</h2>
            <p className="text-xs text-slate-500 mt-1">
              勾选下方习惯打卡可实时测算 3 个月后预期健康指数改善幅度。
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">预期健康指数：</span>
            <strong className="text-2xl font-extrabold font-num text-emerald-700">
              {projectedScore} 分
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACTION_PLANS.map((plan) => {
            const done = completedPlans.includes(plan.id);
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-5 border transition-colors ${
                  done
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-white border-[#dce5ec]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{plan.title}</h3>
                    <p className="text-xs text-[#0d7a8a] font-medium mt-0.5">{plan.targetTag}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTogglePlanComplete(plan.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#eaf5f7] hover:bg-[#d8ecf0] text-[#0d7a8a] border border-[#b5dce3]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {done ? '已打卡执行' : `打卡 (+${plan.scoreGain}分)`}
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">{plan.summary}</p>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {plan.weeklyChecklist.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // activeTab === 'history'
  return (
    <section className="bg-white border border-[#dce5ec] rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">近 6 个月核心指标历史对比台账</h2>
        <p className="text-xs text-slate-500 mt-1">
          对比 2026 年 6 月至 11 月连续随访数据，体重已稳步下降 2.0 kg，综合健康评分提升 7 分。
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#dce5ec] text-xs text-slate-500">
              <th className="py-3 px-3 font-medium">随访月份</th>
              <th className="py-3 px-3 font-medium text-right">收缩压 / 舒张压 (mmHg)</th>
              <th className="py-3 px-3 font-medium text-right">总胆固醇 (mmol/L)</th>
              <th className="py-3 px-3 font-medium text-right">体重 (kg)</th>
              <th className="py-3 px-3 font-medium text-right">综合健康评分</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8eef3] font-num text-xs sm:text-sm">
            {TREND_6M_DATA.map((row, idx) => {
              const isLatest = idx === TREND_6M_DATA.length - 1;
              return (
                <tr key={row.month} className={isLatest ? 'bg-[#eaf5f7]/60' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-3 font-sans font-semibold text-slate-900">
                    {row.month} {isLatest ? '· 本次体检' : ''}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-700 font-medium">
                    {row.systolicBp} / {row.diastolicBp}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-700 font-medium">{row.cholesterol.toFixed(1)}</td>
                  <td className="py-3 px-3 text-right text-slate-800">{row.weightKg.toFixed(1)}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">{row.healthScore} 分</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
