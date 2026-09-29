'use client';

import { useState } from 'react';
import { Header, MonthSelect } from '@/components/Header';
import { FinanceChart } from '@/components/FinanceChart';
import { MonthReportCard } from '@/components/MonthReportCard';
import {
  CONFIG,
  FISCAL_MONTHS,
  TX_LABEL,
  Transaction,
  buildMonthlyReports,
  formatWon,
  getCurrentFiscalMonthIndex,
  signedWon,
} from '@/lib/utils/dataHelpers';

interface FinanceViewProps {
  dues: number[]; // 회계월별 회비 수입 (12개)
  transactions: Transaction[];
  carryover: number;
}

export function FinanceView({ dues, transactions, carryover }: FinanceViewProps) {
  const [monthIndex, setMonthIndex] = useState(getCurrentFiscalMonthIndex);
  const reports = buildMonthlyReports(dues, transactions, carryover);
  const r = reports[monthIndex];
  const m = FISCAL_MONTHS[monthIndex];

  return (
    <div className="space-y-6">
      <Header title="수입 · 지출" description={`${CONFIG.year} 회계연도 · 전년도 이월금 ${signedWon(carryover)}`}>
        <MonthSelect value={monthIndex} onChange={setMonthIndex} />
      </Header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={monthIndex === 0 ? '전년도 이월금' : '전월 잔액'} value={signedWon(r.opening)} />
        <Stat label={`${m}월 수입`} value={formatWon(r.incomeTotal)} />
        <Stat label={`${m}월 지출`} value={formatWon(r.expenseTotal)} />
        <Stat label={`${m}월 말 잔액`} value={signedWon(r.closing)} negative={r.closing < 0} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[24rem_1fr]">
        <MonthReportCard report={r} monthIndex={monthIndex} />

        <div className="space-y-4">
          <FinanceChart
            data={reports.map((x, i) => ({ name: `${FISCAL_MONTHS[i]}월`, income: x.incomeTotal, expense: x.expenseTotal }))}
          />

          <div className="rounded-xl border border-slate-200 bg-white">
            <h3 className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700">{m}월 상세 내역</h3>
            {r.items.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                {r.incomeTotal > 0 ? '회비 외 입력된 내역이 없습니다.' : '입력된 내역이 없습니다.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {r.items.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <TypeBadge type={t.type} />
                    <span className="shrink-0 text-slate-800">{t.category}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-500">{t.description}</span>
                    <span className="tabular-nums text-slate-900">
                      {t.type === 'expense' ? '-' : '+'}
                      {formatWon(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-5 py-3 text-left font-medium">월</th>
              <th className="px-3 py-3 text-right font-medium">전월 잔액</th>
              <th className="px-3 py-3 text-right font-medium">수입</th>
              <th className="px-3 py-3 text-right font-medium">지출</th>
              <th className="px-5 py-3 text-right font-medium">월말 잔액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 whitespace-nowrap tabular-nums">
            {reports.map((x, i) => (
              <tr
                key={i}
                onClick={() => setMonthIndex(i)}
                className={`cursor-pointer ${i === monthIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <td className="px-5 py-2 text-slate-600">{FISCAL_MONTHS[i]}월</td>
                <td className="px-3 py-2 text-right text-slate-500">{signedWon(x.opening)}</td>
                <td className="px-3 py-2 text-right">{formatWon(x.incomeTotal)}</td>
                <td className="px-3 py-2 text-right">{formatWon(x.expenseTotal)}</td>
                <td className={`px-5 py-2 text-right font-medium ${x.closing < 0 ? 'text-orange-700' : ''}`}>
                  {signedWon(x.closing)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TypeBadge({ type }: { type: Transaction['type'] }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
        type === 'income' ? 'bg-blue-50 text-blue-800' : 'bg-orange-50 text-orange-800'
      }`}
    >
      {TX_LABEL[type]}
    </span>
  );
}

function Stat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${negative ? 'text-orange-700' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}
