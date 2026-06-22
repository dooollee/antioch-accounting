'use client';

import { FISCAL_MONTHS } from "@/lib/utils/dataHelpers";

interface HeaderProps {
  title: string;
  showMonthFilter?: boolean; 
  selectedMonth?: number;
  onMonthChange?: (month: number) => void;
}

export function Header({ 
  title, 
  showMonthFilter = false, 
  selectedMonth, 
  onMonthChange 
}: HeaderProps) {
  return (
    // 💡 flex와 justify-between으로 타이틀은 왼쪽, 드롭다운은 오른쪽으로 확실히 밀어냅니다.
    <div className="flex items-center justify-between w-full pb-4 border-b border-slate-100 mb-2">
      
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>

      {showMonthFilter && selectedMonth !== undefined && onMonthChange && (
        <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors shadow-sm">
          <span className="text-xs font-medium text-slate-500">
            조회 월
          </span>
          <select 
            className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none focus:ring-0 cursor-pointer p-0 pr-1 appearance-none"
            value={selectedMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
          >
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i}>{FISCAL_MONTHS[i]}월</option>
            ))}
          </select>
          {/* 💡 커스텀 화살표 아이콘 추가 (선택 박스 기본 화살표 대신 사용) */}
          <span className="text-[10px] text-slate-400 pointer-events-none">▼</span>
        </div>
      )}
    </div>
  );
}