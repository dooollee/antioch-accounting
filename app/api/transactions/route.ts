import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';
import { getTransactions } from '@/lib/publicStats';
import { CONFIG } from '@/lib/utils/dataHelpers';

// 수입/지출 입력·수정·삭제는 관리자만. 공개 페이지는 서버에서 getTransactions 로 직접 읽습니다.
const COLUMNS = 'id, fiscal_year, month_index, type, category, description, amount';

const unauthorized = () => NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });
const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

const serverError = (label: string, error: unknown) => {
  console.error(`수입/지출 API ${label} 에러:`, error);
  const message = (error as { message?: string })?.message;
  return NextResponse.json({ error: message ?? '처리 중 오류가 발생했습니다.' }, { status: 500 });
};

// 입력값 검사 후 DB에 넣을 필드만 추립니다. partial=true 면 들어온 필드만 검사(수정용)
function pickFields(body: Record<string, unknown>, partial = false) {
  const fields: Record<string, unknown> = {};

  if (!partial || 'type' in body) {
    if (body.type !== 'income' && body.type !== 'expense') return '수입/지출 구분이 올바르지 않습니다.';
    fields.type = body.type;
  }
  if (!partial || 'month_index' in body) {
    const m = Number(body.month_index);
    if (!Number.isInteger(m) || m < 0 || m > 11) return '월이 올바르지 않습니다.';
    fields.month_index = m;
  }
  if (!partial || 'category' in body) {
    const c = String(body.category ?? '').trim();
    if (!c) return '항목을 입력해주세요.';
    fields.category = c;
  }
  if (!partial || 'amount' in body) {
    const a = Number(body.amount);
    if (!Number.isInteger(a) || a <= 0) return '금액은 0보다 큰 숫자로 입력해주세요.';
    fields.amount = a;
  }
  if ('description' in body) {
    fields.description = String(body.description ?? '').trim() || null;
  }
  return fields;
}

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    return NextResponse.json({ transactions: await getTransactions() });
  } catch (error) {
    return serverError('GET', error);
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const fields = pickFields(await request.json());
  if (typeof fields === 'string') return badRequest(fields);
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...fields, fiscal_year: CONFIG.year })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ transaction: data });
  } catch (error) {
    return serverError('POST', error);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const body = await request.json();
  const fields = pickFields(body, true);
  if (typeof fields === 'string') return badRequest(fields);
  try {
    const { data, error } = await supabase.from('transactions').update(fields).eq('id', body.id).select(COLUMNS).single();
    if (error) throw error;
    return NextResponse.json({ transaction: data });
  } catch (error) {
    return serverError('PATCH', error);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await request.json();
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('DELETE', error);
  }
}
