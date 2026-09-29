'use client';

import { useState, useSyncExternalStore } from 'react';
import { copyText } from '@/lib/useMembers';
import { CategoryAmount, FISCAL_MONTHS, MonthReport, formatWon, monthReportText, signedWon } from '@/lib/utils/dataHelpers';

const noopSubscribe = () => () => {};

// 월별 결산표: 전월 잔액 → 항목별 수입 → 항목별 지출 → 월말 잔액
export function MonthReportCard({ report, monthIndex }: { report: MonthReport; monthIndex: number }) {
  const [copied, setCopied] = useState(false);
  // 공유 시트는 브라우저(주로 모바일)에서만 확인 가능. 서버 렌더에서는 false
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === 'function',
    () => false
  );
  const m = FISCAL_MONTHS[monthIndex];

  const copy = async () => {
    if (!(await copyText(monthReportText(report, monthIndex)))) return alert('복사에 실패했습니다.');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = () => navigator.share?.({ text: monthReportText(report, monthIndex) }).catch(() => {});

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
        <h3 className="font-semibold text-slate-800">{m}월 결산</h3>
        <div className="flex gap-1.5">
          {canShare && (
            <button
              onClick={share}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              공유
            </button>
          )}
          <button
            onClick={copy}
            className="min-w-16 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
          >
            {copied ? '복사됨' : '결산 복사'}
          </button>
        </div>
      </div>

      <table className="w-full border-collapse">
        <colgroup>
          <col className="w-16" />
          <col />
          <col className="w-32" />
        </colgroup>
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500">
            <th className="border-b border-slate-200 px-4 py-2 text-left font-medium">구분</th>
            <th className="border-b border-slate-200 px-3 py-2 text-left font-medium">항목</th>
            <th className="border-b border-slate-200 px-4 py-2 text-right font-medium">금액</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          <tr>
            <td colSpan={2} className="border-b border-slate-200 px-4 py-2.5 font-medium text-slate-700">
              {monthIndex === 0 ? '전년도 이월금' : '전월 잔액'}
            </td>
            <td className="border-b border-slate-200 px-4 py-2.5 text-right font-medium">{signedWon(report.opening)}</td>
          </tr>

          <Section label="수입" items={report.income} total={report.incomeTotal} tone="income" />
          <Section label="지출" items={report.expense} total={report.expenseTotal} tone="expense" />

          <tr className="bg-slate-900 text-white">
            <td colSpan={2} className="px-4 py-3 font-semibold">월말 잔액</td>
            <td className={`px-4 py-3 text-right font-semibold ${report.closing < 0 ? 'text-orange-300' : ''}`}>
              {signedWon(report.closing)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Section({
  label,
  items,
  total,
  tone,
}: {
  label: string;
  items: CategoryAmount[];
  total: number;
  tone: 'income' | 'expense';
}) {
  const rows = items.length ? items : [{ category: '없음', amount: 0 }];
  const labelClass = tone === 'income' ? 'text-blue-800' : 'text-orange-800';

  return (
    <>
      {rows.map((c, i) => (
        <tr key={c.category}>
          {i === 0 && (
            <td rowSpan={rows.length + 1} className={`border-b border-r border-slate-200 px-4 py-2 align-top font-medium ${labelClass}`}>
              {label}
            </td>
          )}
          <td className={`px-3 py-2 ${items.length ? 'text-slate-700' : 'text-slate-400'}`}>{c.category}</td>
          <td className="px-4 py-2 text-right text-slate-700">{items.length ? formatWon(c.amount) : '-'}</td>
        </tr>
      ))}
      <tr className="bg-slate-50">
        <td className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-500">{label} 합계</td>
        <td className="border-b border-slate-200 px-4 py-2 text-right font-semibold text-slate-900">
          {tone === 'expense' && total > 0 ? '-' : ''}
          {formatWon(total)}
        </td>
      </tr>
    </>
  );
}
