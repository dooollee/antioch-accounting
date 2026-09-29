'use client';

import { useState } from 'react';
import { AffiliationSelect, Header, Segmented } from '@/components/Header';
import { memberApi, useMembers } from '@/lib/useMembers';
import { DEPT_LABEL, FISCAL_MONTHS, Member, Scope, matchAffiliation } from '@/lib/utils/dataHelpers';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'total', label: '전체' },
  { value: 'univ', label: '대학부' },
  { value: 'youth', label: '청년부' },
];

export default function Ledger() {
  const { members, setMembers, isLoading, error } = useMembers();
  const [scope, setScope] = useState<Scope>('total');
  const [affiliation, setAffiliation] = useState('');

  // 납부 상태 저장 (화면 먼저 반영 후 DB 저장, 실패 시 되돌림)
  const savePayment = async (memberId: string, makeStatus: (prev: boolean[]) => boolean[]) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    const prevStatus = target.monthlyStatus;
    const monthlyStatus = makeStatus(prevStatus);
    const apply = (status: boolean[]) =>
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, monthlyStatus: status } : m)));

    apply(monthlyStatus);
    try {
      await memberApi('PATCH', { id: memberId, monthlyStatus });
    } catch (e) {
      console.error('납부 상태 변경 에러:', e);
      apply(prevStatus);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const togglePayment = (memberId: string, monthIndex: number) =>
    savePayment(memberId, (prev) => prev.map((paid, i) => (i === monthIndex ? !paid : paid)));

  // 일괄납부: 1년치를 한 번에 납부/해제
  const setAllPayment = (member: Member, paid: boolean) =>
    savePayment(member.id, () => Array(FISCAL_MONTHS.length).fill(paid));

  const filtered = members.filter(
    (m) => (scope === 'total' || m.dept === scope) && matchAffiliation(m, affiliation)
  );

  return (
    <div className="space-y-6">
      <Header title="회계 장부" description="칸을 눌러 월별 납부 여부를 기록합니다. 1년치를 한 번에 낸 회원은 '일괄 납부'를 누르세요.">
        <AffiliationSelect members={members} value={affiliation} onChange={setAffiliation} />
        <Segmented options={SCOPES} value={scope} onChange={setScope} />
      </Header>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-slate-500">불러오는 중</p>
      ) : error ? (
        <p className="py-20 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="max-h-[calc(100dvh-12rem)] overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_#e2e8f0]">
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 min-w-28 bg-slate-50 p-3 text-left font-medium text-slate-500">이름</th>
                  {FISCAL_MONTHS.map((month, i) => (
                    <th key={i} className="min-w-14 p-3 text-center font-medium text-slate-500">{month}월</th>
                  ))}
                  <th className="p-3 text-center font-medium text-slate-500">일괄</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? (
                  filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="sticky left-0 bg-white p-3">
                        <span className="font-medium text-slate-800">{m.name}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          {DEPT_LABEL[m.dept]}
                          {m.affiliation && ` · ${m.affiliation}`}
                        </span>
                      </td>
                      {m.monthlyStatus.map((isPaid, idx) => (
                        <td key={idx} className="p-2 text-center">
                          <button
                            onClick={() => togglePayment(m.id, idx)}
                            aria-label={`${m.name} ${FISCAL_MONTHS[idx]}월 ${isPaid ? '납부' : '미납'}`}
                            className={`mx-auto flex h-6 w-6 items-center justify-center rounded border text-xs transition-colors ${
                              isPaid
                                ? 'border-blue-700 bg-blue-700 text-white'
                                : 'border-slate-300 bg-white hover:border-slate-500'
                            }`}
                          >
                            {isPaid && '✓'}
                          </button>
                        </td>
                      ))}
                      <td className="whitespace-nowrap p-2 text-center">
                        {m.monthlyStatus.every(Boolean) ? (
                          <button
                            onClick={() => setAllPayment(m, false)}
                            className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          >
                            전체 해제
                          </button>
                        ) : (
                          <button
                            onClick={() => setAllPayment(m, true)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-500"
                          >
                            일괄 납부
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="p-16 text-center text-slate-500">해당 부서에 회원이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-slate-500">{filtered.length}명</p>
        </>
      )}
    </div>
  );
}
