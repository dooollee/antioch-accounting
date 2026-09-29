'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AffiliationSelect, Header, MonthSelect, SearchInput, Segmented } from '@/components/Header';
import { copyText, useMembers } from '@/lib/useMembers';
import {
  Arrears,
  DEFAULT_MESSAGE_TEMPLATE,
  DEPT_LABEL,
  MESSAGE_FIELDS,
  FISCAL_MONTHS,
  STATUS_LABEL,
  Scope,
  arrearsMessage,
  arrearsSummary,
  formatWon,
  getArrears,
  getCurrentFiscalMonthIndex,
  matchAffiliation,
} from '@/lib/utils/dataHelpers';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'total', label: '전체' },
  { value: 'univ', label: '대학부' },
  { value: 'youth', label: '청년부' },
];

export default function ArrearsPage() {
  const { members, isLoading, error } = useMembers();
  const [upto, setUpto] = useState(getCurrentFiscalMonthIndex);
  const [scope, setScope] = useState<Scope>('total');
  const [affiliation, setAffiliation] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [query, setQuery] = useState('');
  const [template, setTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.settings?.message_template && setTemplate(data.settings.message_template))
      .catch(() => {});
  }, []);

  const list = useMemo(() => {
    const targets = members.filter(
      (m) =>
        (scope === 'total' || m.dept === scope) &&
        matchAffiliation(m, affiliation) &&
        (!activeOnly || m.status === 'active') &&
        m.name.includes(query.trim())
    );
    return getArrears(targets, upto);
  }, [members, scope, affiliation, activeOnly, query, upto]);

  const total = list.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-6">
      <Header title="미납 현황" description={`회계연도 시작(11월)부터 ${FISCAL_MONTHS[upto]}월까지의 개인별 미납 내역`}>
        <button
          onClick={() => setEditing(!editing)}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
        >
          안내 문구 편집
        </button>
        <MonthSelect label="기준 월" value={upto} onChange={setUpto} />
      </Header>

      {editing && (
        <MessageEditor
          initial={template}
          sample={list[0]}
          onSaved={(t) => {
            setTemplate(t);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      )}

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented options={SCOPES} value={scope} onChange={setScope} />
          <AffiliationSelect members={members} value={affiliation} onChange={setAffiliation} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            활동 회원만
          </label>
        </div>
        <SearchInput placeholder="이름 검색" value={query} onChange={setQuery} className="sm:w-48" />
      </section>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-slate-500">불러오는 중</p>
      ) : error ? (
        <p className="py-20 text-center text-sm text-red-600">{error}</p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
            <p className="text-sm text-slate-600">
              미납 <b className="text-slate-900">{list.length}명</b> · 합계{' '}
              <b className="text-slate-900">{formatWon(total)}</b>
            </p>
            {list.length > 0 && <CopyButton label="전체 목록 복사" text={() => arrearsSummary(list, upto)} />}
          </div>

          {list.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">미납 회원이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((a) => (
                <ArrearsRow key={a.member.id} a={a} template={template} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function ArrearsRow({ a, template }: { a: Arrears; template: string }) {
  const [open, setOpen] = useState(false);
  const message = arrearsMessage(a, template);

  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-slate-900">{a.member.name}</span>
            <span className="text-xs text-slate-500">
              {DEPT_LABEL[a.member.dept]}
              {a.member.affiliation && ` · ${a.member.affiliation}`}
              {a.member.status !== 'active' && ` · ${STATUS_LABEL[a.member.status ?? ''] ?? a.member.status}`}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {a.months.map((i) => (
              <span key={i} className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">
                {FISCAL_MONTHS[i]}월
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="mr-auto text-right font-semibold tabular-nums text-slate-900 sm:mr-2">
            {formatWon(a.amount)}
          </span>
          <button onClick={() => setOpen(!open)} className="text-sm text-slate-500 hover:text-slate-900">
            {open ? '닫기' : '미리보기'}
          </button>
          <CopyButton label="메시지 복사" text={() => message} primary />
          <ShareButton text={message} />
        </div>
      </div>

      {open && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-sans text-sm text-slate-700">
          {message}
        </pre>
      )}
    </li>
  );
}

// 예시로 보여줄 회원 (미납자가 없을 때)
const SAMPLE: Arrears = {
  member: { id: 'sample', name: '홍길동', dept: 'univ', phone: '', monthlyStatus: [], affiliation: '1셀' },
  months: [0, 1],
  amount: 10000,
};

function MessageEditor({
  initial,
  sample,
  onSaved,
  onClose,
}: {
  initial: string;
  sample?: Arrears;
  onSaved: (template: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 커서 위치에 {항목} 끼워 넣기
  const insertField = (field: string) => {
    const el = textareaRef.current;
    const token = `{${field}}`;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + token + draft.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'message_template', value: draft }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
      onSaved(draft);
    } catch (e) {
      alert(`저장에 실패했습니다.\n${e instanceof Error ? e.message : ''}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">안내 문구 편집</h3>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs text-slate-500">항목 넣기</span>
          {MESSAGE_FIELDS.map((f) => (
            <button
              key={f}
              onClick={() => insertField(f)}
              className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">문구</span>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="w-full resize-y rounded-md border border-slate-300 p-3 text-sm leading-relaxed outline-none focus:border-slate-900"
          />
        </label>
        <div>
          <span className="mb-1 block text-xs text-slate-500">
            미리보기 ({(sample ?? SAMPLE).member.name}{sample ? '' : ', 예시'})
          </span>
          <pre className="min-h-62 whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-sans text-sm leading-relaxed text-slate-700">
            {arrearsMessage(sample ?? SAMPLE, draft)}
          </pre>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <button onClick={() => setDraft(DEFAULT_MESSAGE_TEMPLATE)} className="text-slate-500 hover:text-slate-900">
          기본 문구로 되돌리기
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-md bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200">
            취소
          </button>
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? '저장 중' : '저장'}
          </button>
        </div>
      </div>
    </section>
  );
}

function CopyButton({ label, text, primary }: { label: string; text: () => string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    if (!(await copyText(text()))) return alert('복사에 실패했습니다.');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={onClick}
      className={`min-w-24 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        primary
          ? 'bg-slate-900 text-white hover:bg-slate-700'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {copied ? '복사됨' : label}
    </button>
  );
}

// 모바일에서는 공유 시트로 카카오톡에 바로 보낼 수 있습니다.
function ShareButton({ text }: { text: string }) {
  if (typeof navigator === 'undefined' || !navigator.share) return null;
  return (
    <button
      onClick={() => navigator.share({ text }).catch(() => {})}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      공유
    </button>
  );
}
