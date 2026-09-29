import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

// 회원 정보(이름·연락처·납부 내역)는 관리자만 조회/수정할 수 있습니다.
const unauthorized = () => NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });

const serverError = (label: string, error: unknown) => {
  console.error(`회원 API ${label} 에러:`, error);
  const message = error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.';
  return NextResponse.json({ error: message }, { status: 500 });
};

const EDITABLE_FIELDS = ['name', 'dept', 'phone', 'affiliation', 'status', 'monthlyStatus'] as const;

// 1. 회원 목록 조회
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ members });
  } catch (error) {
    return serverError('GET', error);
  }
}

// 2. 회원 정보 / 납부 상태 수정
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = await request.json();
    const fields = Object.fromEntries(EDITABLE_FIELDS.filter((k) => k in body).map((k) => [k, body[k]]));

    const { error } = await supabase.from('members').update(fields).eq('id', body.id);
    if (error) throw error;
    return NextResponse.json({ message: '업데이트 성공' });
  } catch (error) {
    return serverError('PATCH', error);
  }
}

// 3. 새 회원 등록
export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const { name, dept, phone, affiliation } = await request.json();
    const newMember = {
      id: Date.now().toString(),
      name,
      dept,
      phone,
      affiliation: affiliation?.trim() || null,
      monthlyStatus: Array(12).fill(false),
      status: 'active',
    };

    const { error } = await supabase.from('members').insert([newMember]);
    if (error) throw error;
    return NextResponse.json({ message: '등록 성공', newMember });
  } catch (error) {
    return serverError('POST', error);
  }
}

// 4. 회원 삭제
export async function DELETE(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const { id } = await request.json();
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: '삭제 성공' });
  } catch (error) {
    return serverError('DELETE', error);
  }
}
