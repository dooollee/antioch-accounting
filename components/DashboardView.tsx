'use client';

import { useState } from 'react';
import { Header, MonthSelect, Segmented } from '@/components/Header';
import { TrendChart } from '@/components/TrendChart';
import {
  CONFIG,
  DEPT_LABEL,
  FISCAL_MONTHS,
  MonthlyStats,
  SCOPE_OPTIONS,
  Scope,
  formatWon,
  getCurrentFiscalMonthIndex,
  paidRate,
} from '@/lib/utils/dataHelpers';

const shortWon = (n: number) => (n >= 10000 ? `${(n / 10000).toLocaleString('ko-KR')}만` : n.toLocaleString('ko-KR'));

export function DashboardView({ months }: { months: MonthlyStats }) {
  const [monthIndex, setMonthIndex] = useState(getCurrentFiscalMonthIndex);
  const [scope, setScope] = useState<Scope>('total');
  const s = months[monthIndex][scope];
  const rate = paidRate(s);
  const cumulative = months.slice(0, monthIndex + 1).reduce((sum, m) => sum + m[scope].revenue, 0);

  const feeText =
    scope === 'total'
      ? `대학부 ${formatWon(CONFIG.fees.univ)} · 청년부 ${formatWon(CONFIG.fees.youth)}`
      : formatWon(CONFIG.fees[scope]);

  return (
    <div className="space-y-6">
      <Header title="대시보드" description={`${CONFIG.year} 회계연도 · 월 회비 ${feeText}`}>
        <Segmented options={SCOPE_OPTIONS} value={scope} onChange={setScope} />
        <MonthSelect value={monthIndex} onChange={setMonthIndex} />
      </Header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={`${FISCAL_MONTHS[monthIndex]}월 납부율`} value={`${rate}%`}>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-blue-700" style={{ width: `${rate}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{s.count}명 중 {s.paidCount}명 납부</p>
        </Stat>
        <Stat label={`${FISCAL_MONTHS[monthIndex]}월 납부액`} value={formatWon(s.revenue)}>
          <p className="mt-2 text-xs text-slate-500">예정액 {formatWon(s.expected)}</p>
        </Stat>
        <Stat label="누적 납부액" value={formatWon(cumulative)}>
          <p className="mt-2 text-xs text-slate-500">11월 ~ {FISCAL_MONTHS[monthIndex]}월</p>
        </Stat>
      </section>

      {scope === 'total' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">부서별 납부율 ({FISCAL_MONTHS[monthIndex]}월)</h3>
          <div className="mt-4 space-y-4">
            {(['univ', 'youth'] as const).map((dept) => {
              const d = months[monthIndex][dept];
              const r = paidRate(d);
              return (
                <div key={dept} className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-slate-600">{DEPT_LABEL[dept]}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-blue-700" style={{ width: `${r}%` }} />
                  </div>
                  <span className="w-28 text-right tabular-nums text-slate-700">
                    {r}% <span className="text-slate-400">({d.paidCount}/{d.count})</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart
          title="월별 납부율"
          data={months.map((m, i) => ({ name: `${FISCAL_MONTHS[i]}월`, value: paidRate(m[scope]) }))}
          highlight={monthIndex}
          domain={[0, 100]}
          format={(v) => `${v}%`}
        />
        <TrendChart
          title="월별 납부액"
          data={months.map((m, i) => ({ name: `${FISCAL_MONTHS[i]}월`, value: m[scope].revenue }))}
          highlight={monthIndex}
          format={shortWon}
        />
      </section>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {children}
    </div>
  );
}
