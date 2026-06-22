'use client';

import { useState, useEffect } from 'react';
import { Chart } from "@/components/Chart";
import { Header } from "@/components/Header";
import { SummaryCard } from "@/components/SummaryCard";
import { UnpaidList } from "@/components/UnpaidList";
import { Member, Config } from '@/lib/utils/dataHelpers';

export default function Univ() {
  const [members, setMembers] = useState<Member[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 현재 선택된 월 상태 관리 (기본값: 이번 달)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // 페이지 로드 시 백엔드 API 호출
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/hello');
        if (!res.ok) throw new Error('데이터 로드 실패');
        const data = await res.json();
        
        setMembers(data.members);
        setConfig(data.config);
      } catch (error) {
        console.error('대학부 현황 데이터 로드 에러:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading || !config) {
    return (
      <>
        <Header title="대학부 현황" />
        <div className="p-20 text-center text-slate-500">대학부 데이터를 불러오는 중입니다... ⏳</div>
      </>
    );
  }

  return (
    <main className="space-y-8">
      {/* 💡 [리팩토링] 기존 복잡했던 드롭다운 UI 대신 Header 컴포넌트 하나로 통합 */}
      <Header 
        title="대학부 현황" 
        showMonthFilter={true}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />
      
      {/* 요약 카드 */}
      <SummaryCard 
        members={members} 
        config={config} 
        type="univ" 
        title="대학부" 
        monthIndex={selectedMonth}
      />
      
      {/* 차트 그래프 */}
      <Chart 
        members={members} 
        config={config} 
        type="univ" 
      />
      
      {/* 미납 회원 리스트 */}
      <UnpaidList 
        config={config}
        members={members} 
        type="univ" 
        monthIndex={selectedMonth}
      />
    </main>
  );
}