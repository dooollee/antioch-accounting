'use client'

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { FISCAL_MONTHS } from '@/lib/utils/dataHelpers';

interface Member {
  id: string;
  name: string;
  dept: 'univ' | 'youth';
  phone: string;
  monthlyStatus: boolean[];
  status?: string;
}

export default function Ledger() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 [새 기능 1] 선택된 부서 상태 관리 (기본값: 'all')
  const [selectedDept, setSelectedDept] = useState<'all' | 'univ' | 'youth'>('all');

  // 처음 렌더링될 때 DB에서 데이터 가져오기 (GET)
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/hello');
        if (!res.ok) throw new Error('데이터 로드 실패');
        const data = await res.json();
        setMembers(data.members);
      } catch (error) {
        console.error('데이터 로드 에러:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMembers();
  }, []);

  // 체크 표시(납부 여부)를 클릭했을 때 DB까지 수정하는 함수 (PATCH)
  const togglePayment = async (memberId: string, monthIndex: number) => {
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

    const newMonthlyStatus = [...targetMember.monthlyStatus];
    newMonthlyStatus[monthIndex] = !newMonthlyStatus[monthIndex];

    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, monthlyStatus: newMonthlyStatus } : m));

    try {
      const res = await fetch('/api/hello', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: memberId, 
          "monthlyStatus": newMonthlyStatus 
        }),
      });
      if (!res.ok) throw new Error('DB 수정 실패');
    } catch (error) {
      console.error('납부 상태 변경 에러:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 💡 [새 기능 2] 선택된 부서에 따라 노출할 회원 목록 필터링
  const filteredMembers = members.filter((m) => {
    return selectedDept === 'all' || m.dept === selectedDept;
  });

  if (isLoading) {
    return (
      <>
        <Header title='회계 장부'/>
        <div className="p-20 text-center text-slate-500">데이터를 불러오는 중입니다... ⏳</div>
      </>
    );
  }

  return (
    <>
      <Header title='회계 장부'/>
      
      {/* 💡 [새 기능 3] 상단 부서 선택 버튼 토글 바 추가 */}
      <section className="mb-6 flex justify-end">
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/50">
          {(['all', 'univ', 'youth'] as const).map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDept === dept
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {dept === 'all' ? '전체' : dept === 'univ' ? '대학부' : '청년부'}
            </button>
          ))}
        </div>
      </section>

      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              <th className="p-3 border-b text-left text-xs font-semibold text-slate-500 sticky left-0 bg-slate-50/70 z-10 min-w-[90px]">이름</th>
              {FISCAL_MONTHS.map((month, i) => (
                <th key={i} className="p-3 border-b text-center text-xs font-semibold text-slate-500 min-w-[60px]">{month}월</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {/* 💡 [새 기능 4] members 대신 필터링된 filteredMembers를 기반으로 리스트 생성 */}
            {filteredMembers.length > 0 ? (
              filteredMembers.map(m => (
                <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 sticky left-0 bg-white font-medium text-slate-700 text-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      {/* 부서 식별용 미니 라벨 */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        m.dept === 'univ' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {m.dept === 'univ' ? '대' : '청'}
                      </span>
                    </div>
                  </td>
                  {m.monthlyStatus.map((isPaid, idx) => (
                    <td key={idx} className="p-3 text-center">
                      <button 
                        onClick={() => togglePayment(m.id, idx)}
                        className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                          isPaid 
                            ? 'bg-blue-500 border-blue-500 text-white shadow-xs shadow-blue-100' 
                            : 'border-slate-300 hover:border-blue-400 bg-white'
                        }`}
                      >
                        {isPaid && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} className="p-20 text-center text-slate-400 text-sm">
                  해당 부서에 소속된 회원이 없습니다. 🧐
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="text-xs text-slate-400 text-center mt-4">
        현재 총 {filteredMembers.length}명의 장부를 확인 중입니다.
      </footer>
    </>
  );
}