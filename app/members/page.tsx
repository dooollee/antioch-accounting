'use client';

import { useState, useEffect, useRef } from 'react';

interface Member {
  id: string;
  name: string;
  dept: 'univ' | 'youth';
  phone: string;
  monthlyStatus: boolean[];
  status?: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<'all' | 'univ' | 'youth'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // 모달창 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    name: '',
    dept: 'univ' as 'univ' | 'youth',
    phone: ''
  });

  // 💡이름 입력창을 조준할 Ref(참조)를 만듭니다.
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 💡 [새 기능 1] 현재 수정 중인 회원 정보를 담을 상태 (null이면 창이 닫힘)
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // DB에서 데이터 가져오기 (GET)
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/hello');
        if (!res.ok) throw new Error('데이터 로드 실패');
        const data = await res.json();
        
        const updatedMembers = data.members.map((m: Member) => ({
          ...m,
          status: m.status || 'active'
        }));

        setMembers(updatedMembers);
      } catch (error) {
        console.error('백엔드 통신 에러:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMembers();
  }, []);

  // 💡 모달 열림/닫힘 상태를 감지하는 useEffect 추가
  // 💡 모달 열림/닫힘 상태를 감지하는 useEffect 부분을 이걸로 교체합니다.
  useEffect(() => {
    const isAnyModalOpen = isModalOpen || editingMember !== null;

    if (isAnyModalOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 15);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';

      // 💡 [추가] 등록 모달창이 완전히 닫혔을 때(isModalOpen이 false가 되었을 때) 
      // 작성 중이던 폼 데이터를 완전히 증발시킵니다.
      if (!isModalOpen) {
        setNewMemberData({ name: '', dept: 'univ', phone: '' });
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, editingMember]);

  // 드롭다운 상태 변경 함수 (PATCH)
  const handleStatusChange = async (id: string, newStatus: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
    try {
      const res = await fetch('/api/hello', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error('DB 업데이트 실패');
    } catch (error) {
      console.error('상태 변경 중 에러 발생:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 새 회원 등록 (POST)
  const handleAddMember = async () => {
    if (!newMemberData.name || !newMemberData.phone) {
      return alert('이름과 연락처를 모두 입력해주세요!');
    }
    try {
      const res = await fetch('/api/hello', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemberData),
      });
      if (!res.ok) throw new Error('DB 등록 실패');
      const result = await res.json();
      setMembers(prev => [...prev, result.newMember]);
      setIsModalOpen(false);
      setNewMemberData({ name: '', dept: 'univ', phone: '' });
      alert('새 회원이 등록되었습니다! 🎉');
    } catch (error) {
      console.error('새 회원 등록 에러:', error);
      alert('등록에 실패했습니다.');
    }
  };

  // 💡 [새 기능 2] 인적 사항 수정 저장 함수 (PATCH)
  const handleEditMember = async () => {
    if (!editingMember) return;
    if (!editingMember.name || !editingMember.phone) {
      return alert('이름과 연락처를 모두 입력해주세요!');
    }

    try {
      const res = await fetch('/api/hello', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // 수정된 회원의 id와 이름, 부서, 연락처를 패키징해서 보냅니다.
        body: JSON.stringify({
          id: editingMember.id,
          name: editingMember.name,
          dept: editingMember.dept,
          phone: editingMember.phone
        }),
      });

      if (!res.ok) throw new Error('DB 수정 실패');

      // 내 프론트엔드 화면 상태도 최신 정보로 실시간 업데이트
      setMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m));
      setEditingMember(null); // 모달창 닫기
      alert('회원 정보가 성공적으로 수정되었습니다! ✨');

    } catch (error) {
      console.error('회원 정보 수정 에러:', error);
      alert('수정에 실패했습니다.');
    }
  };

  // 회원 삭제 (DELETE)
  const handleDeleteMember = async (id: string, name: string) => {
    if (!window.confirm(`${name} 회원을 정말 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/hello', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('DB 삭제 실패');
      setMembers(prev => prev.filter(m => m.id !== id));
      alert('삭제가 완료되었습니다. 🗑️');
    } catch (error) {
      console.error('삭제 중 에러 발생:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.includes(searchTerm) || m.phone.includes(searchTerm);
    const matchesDept = selectedDept === 'all' || m.dept === selectedDept;
    return matchesSearch && matchesDept;
  });

  if (isLoading) {
    return <div className="p-20 text-center text-slate-500">데이터를 불러오는 중입니다... ⏳</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">회원 관리</h1>
          <p className="text-slate-500 mt-1">교적부 명단을 관리하고 인적 사항을 수정합니다.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm active:scale-95"
        >
          + 새 회원 등록
        </button>
      </header>

      {/* 검색창 필터 */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="이름 또는 연락처로 검색..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'univ', 'youth'] as const).map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedDept === dept ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dept === 'all' ? '전체' : dept === 'univ' ? '대학부' : '청년부'}
            </button>
          ))}
        </div>
      </section>

      {/* 테이블 리스트 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 font-semibold text-slate-600 text-sm">이름</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">부서 / 학년</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">연락처</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">상태</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {member.name ? member.name[0] : '👤'}
                        </div>
                        <span className="font-semibold text-slate-700">{member.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-600">
                        {member.dept === 'univ' ? '대학부' : '청년부'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-sm">
                      {member.phone}
                    </td>
                    <td className="p-4">
                      <select 
                        className="bg-transparent border-none text-sm font-medium text-slate-600 focus:ring-0 cursor-pointer"
                        value={member.status || 'active'}
                        onChange={(e) => handleStatusChange(member.id, e.target.value)}
                      >
                        <option value="active">🟢 활동</option>
                        <option value="inactive">🟡 장결</option>
                        <option value="military">🪖 군복무</option>
                        <option value="graduated">🎓 졸업</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* 💡 [새 기능 3] 정보 수정 버튼 클릭 시 클릭한 회원의 데이터로 모달을 엽니다. */}
                        <button 
                          onClick={() => setEditingMember(member)}
                          className="text-blue-600 hover:underline text-sm font-medium"
                        >
                          정보 수정
                        </button>
                        <button 
                          onClick={() => handleDeleteMember(member.id, member.name)}
                          className="text-red-500 hover:underline text-sm font-medium"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-400">
                    검색 결과와 일치하는 회원이 없습니다. 🧐
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <footer className="text-sm text-slate-400 text-center pb-10">
        현재 총 {filteredMembers.length}명의 회원이 조회되었습니다.
      </footer>

      {/* 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">새 회원 등록</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                <input ref={nameInputRef} type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={newMemberData.name} onChange={(e) => setNewMemberData({...newMemberData, name: e.target.value})} placeholder="예: 홍길동"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">부서</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={newMemberData.dept} onChange={(e) => setNewMemberData({...newMemberData, dept: e.target.value as 'univ'|'youth'})}>
                  <option value="univ">대학부</option>
                  <option value="youth">청년부</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">연락처</label>
                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={newMemberData.phone} onChange={(e) => setNewMemberData({...newMemberData, phone: e.target.value})} placeholder="예: 010-1234-5678"/>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => 
                  {
                  // 💡 1. 모달을 닫기 전에 입력했던 값들을 깨끗이 청소합니다.
                  setNewMemberData({ name: '', dept: 'univ', phone: '' });
                  setIsModalOpen(false);
                }}  
               className="px-4 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">취소</button>
              <button onClick={handleAddMember} className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700">등록하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 💡 [새 기능 4] 회원 정보 수정 모달 UI */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">회원 정보 수정</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({...editingMember, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">부서</label>
                <select 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={editingMember.dept}
                  onChange={(e) => setEditingMember({...editingMember, dept: e.target.value as 'univ'|'youth'})}
                >
                  <option value="univ">대학부</option>
                  <option value="youth">청년부</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">연락처</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={editingMember.phone}
                  onChange={(e) => setEditingMember({...editingMember, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                취소
              </button>
              <button 
                onClick={handleEditMember}
                className="px-4 py-2 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700"
              >
                수정 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}