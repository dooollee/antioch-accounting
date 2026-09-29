'use client';

import { useEffect, useRef, useState } from 'react';
import { AffiliationSelect, Header, SearchInput, Segmented } from '@/components/Header';
import { memberApi, useMembers } from '@/lib/useMembers';
import { DEPT_LABEL, Dept, Member, STATUS_LABEL, Scope, getAffiliations, matchAffiliation } from '@/lib/utils/dataHelpers';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'total', label: '전체' },
  { value: 'univ', label: '대학부' },
  { value: 'youth', label: '청년부' },
];

// id 가 있으면 수정, 없으면 신규 등록
type MemberForm = { id?: string; name: string; dept: Dept; phone: string; affiliation: string };
const EMPTY_FORM: MemberForm = { name: '', dept: 'univ', phone: '', affiliation: '' };

const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900';

export default function MembersPage() {
  const { members, setMembers, isLoading, error } = useMembers();
  const [searchTerm, setSearchTerm] = useState('');
  const [scope, setScope] = useState<Scope>('total');
  const [affiliation, setAffiliation] = useState('');
  const [form, setForm] = useState<MemberForm | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isFormOpen = form !== null;
  useEffect(() => {
    if (!isFormOpen) return;
    nameInputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFormOpen]);

  const handleStatusChange = async (id: string, status: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    try {
      await memberApi('PATCH', { id, status });
    } catch (e) {
      console.error('상태 변경 에러:', e);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.phone.trim()) return alert('이름과 연락처를 모두 입력해주세요.');

    const payload = { ...form, affiliation: form.affiliation.trim() || null };
    try {
      if (form.id) {
        await memberApi('PATCH', payload);
        setMembers((prev) => prev.map((m) => (m.id === form.id ? { ...m, ...payload } : m)));
      } else {
        const { newMember } = await memberApi('POST', payload);
        setMembers((prev) => [...prev, newMember as Member]);
      }
      setForm(null);
    } catch (e) {
      console.error('회원 저장 에러:', e);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`${name} 회원을 삭제하시겠습니까? 납부 기록도 함께 삭제됩니다.`)) return;
    try {
      await memberApi('DELETE', { id });
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error('삭제 에러:', e);
      alert('삭제에 실패했습니다.');
    }
  };

  const filtered = members.filter(
    (m) =>
      [m.name, m.phone, m.affiliation ?? ''].some((v) => v.includes(searchTerm)) &&
      (scope === 'total' || m.dept === scope) &&
      matchAffiliation(m, affiliation)
  );

  return (
    <div className="space-y-6">
      <Header title="회원 관리" description="교적부 명단과 인적 사항을 관리합니다.">
        <button
          onClick={() => setForm(EMPTY_FORM)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          회원 등록
        </button>
      </Header>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={SCOPES} value={scope} onChange={setScope} />
          <AffiliationSelect members={members} value={affiliation} onChange={setAffiliation} />
        </div>
        <SearchInput placeholder="이름, 연락처, 소속 검색" value={searchTerm} onChange={setSearchTerm} className="sm:w-64" />
      </section>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-slate-500">불러오는 중</p>
      ) : error ? (
        <p className="py-20 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="max-h-[calc(100dvh-12rem)] overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_#e2e8f0]">
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="p-3 font-medium">이름</th>
                  <th className="p-3 font-medium">부서</th>
                  <th className="p-3 font-medium">소속</th>
                  <th className="p-3 font-medium">연락처</th>
                  <th className="p-3 font-medium">상태</th>
                  <th className="p-3 text-right font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? (
                  filtered.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{member.name}</td>
                      <td className="p-3 text-slate-600">{DEPT_LABEL[member.dept]}</td>
                      <td className="p-3 text-slate-600">{member.affiliation || <span className="text-slate-300">-</span>}</td>
                      <td className="p-3 tabular-nums text-slate-600">{member.phone}</td>
                      <td className="p-3">
                        <select
                          className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-1 text-slate-700"
                          value={member.status || 'active'}
                          onChange={(e) => handleStatusChange(member.id, e.target.value)}
                        >
                          {Object.entries(STATUS_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">
                        <button
                          onClick={() => setForm({
                              id: member.id,
                              name: member.name,
                              dept: member.dept,
                              phone: member.phone,
                              affiliation: member.affiliation ?? '',
                            })}
                          className="text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(member.id, member.name)}
                          className="ml-3 text-red-600 hover:underline"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-500">검색 결과가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-slate-500">{filtered.length}명</p>
        </>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setForm(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="w-full max-w-sm rounded-xl bg-white p-6"
          >
            <h2 className="text-lg font-bold">{form.id ? '회원 정보 수정' : '회원 등록'}</h2>
            <div className="mt-4 space-y-4 text-sm">
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">이름</span>
                <input
                  ref={nameInputRef}
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="홍길동"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">부서</span>
                <select
                  className={inputClass}
                  value={form.dept}
                  onChange={(e) => setForm({ ...form, dept: e.target.value as Dept })}
                >
                  <option value="univ">대학부</option>
                  <option value="youth">청년부</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">연락처</span>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="010-1234-5678"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">소속 <span className="font-normal text-slate-400">(선택)</span></span>
                <input
                  className={inputClass}
                  list="affiliation-options"
                  value={form.affiliation}
                  onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
                  placeholder="예: 1셀, 찬양팀, OO대학교"
                />
                <datalist id="affiliation-options">
                  {getAffiliations(members).map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2 text-sm">
              <button type="button" onClick={() => setForm(null)} className="rounded-md bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200">
                취소
              </button>
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700">
                {form.id ? '저장' : '등록'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
