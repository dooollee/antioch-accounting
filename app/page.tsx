'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { PaymentChart } from '@/components/PaymentChart';
import { RevenueChart } from '@/components/RevenueChart';
import { SummaryCard } from '@/components/SummaryCard';
import { UnpaidList } from '@/components/UnpaidList';
import { getYearlyChartData, Member, Config, getCurrentFiscalMonthIndex } from '@/lib/utils/dataHelpers';

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 [새 기능 1] 현재 선택된 월 상태 관리 (기본값: 이번 달)
  // 자바스크립트에서 월은 0부터 시작하므로 (0 = 1월, 11 = 12월) getMonth()를 그대로 씁니다.
  const [selectedMonth, setSelectedMonth] = useState(getCurrentFiscalMonthIndex());

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/hello');
        if (!res.ok) throw new Error('데이터 로드 실패');
        const data = await res.json();
        
        setMembers(data.members);
        setConfig(data.config);
      } catch (error) {
        console.error('종합 대시보드 데이터 로드 에러:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const chartData = config ? getYearlyChartData(members, config, 'total') : []; 

  if (isLoading || !config) {
    return (
      <>
        <Header title="대쉬보드" />
        <div className="p-20 text-center text-slate-500">종합 데이터를 분석하는 중입니다... ⏳</div>
      </>
    );
  }

  return (
    <main className="space-y-8">
      <Header 
        title="대쉬보드"
        showMonthFilter={true}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* 💡 [새 기능 3] SummaryCard에 monthIndex 전달 */}
      <SummaryCard 
        members={members} 
        config={config} 
        type="total" 
        title="대학부 & 청년부 합계" 
        monthIndex={selectedMonth} 
      />

      {/* 차트는 1년치 전체를 보여주므로 그대로 둡니다. */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PaymentChart data={chartData} />
        <RevenueChart data={chartData} />
      </section>

      {/* 💡 [새 기능 4] UnpaidList에 monthIndex 전달 */}
      <UnpaidList 
        members={members} 
        config={config} 
        type="total" 
        monthIndex={selectedMonth} 
      />
    </main>
  );
}