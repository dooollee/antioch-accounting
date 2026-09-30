'use client';

import { AFFILIATION_NONE, FISCAL_MONTHS, Member, getAffiliations } from '@/lib/utils/dataHelpers';

interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function Header({ title, description, children }: HeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function MonthSelect({
  value,
  onChange,
  label = '조회 월',
}: {
  value: number;
  onChange: (month: number) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <select
        className="cursor-pointer bg-transparent font-semibold text-slate-800 outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {FISCAL_MONTHS.map((m, i) => (
          <option key={i} value={i}>{m}월</option>
        ))}
      </select>
    </label>
  );
}

// 회원들이 입력한 소속 목록으로 필터 옵션을 만듭니다. 소속이 하나도 없으면 숨김
export function AffiliationSelect({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: string;
  onChange: (v: string) => void;
}) {
  const affiliations = getAffiliations(members);
  if (affiliations.length === 0) return null;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-900"
    >
      <option value="">전체</option>
      {affiliations.map((a) => (
        <option key={a} value={a}>{a}</option>
      ))}
      <option value={AFFILIATION_NONE}>소속 없음</option>
    </select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onChange('')}
        className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm outline-none focus:border-slate-900"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="검색어 지우기"
          className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-sm transition-colors ${
            value === o.value ? 'bg-slate-900 font-medium text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
