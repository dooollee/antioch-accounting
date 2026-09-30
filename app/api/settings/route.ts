import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';
import { CONFIG, FIXED_EXPENSES_KEY, carryoverKey, parseFixedExpenses } from '@/lib/utils/dataHelpers';

// 관리자 설정값 (key-value): 미납 안내 문구, 전년도 이월금, 고정지출 목록
const CARRYOVER_KEY = carryoverKey(CONFIG.year);
const ALLOWED_KEYS = ['message_template', CARRYOVER_KEY, FIXED_EXPENSES_KEY];

const unauthorized = () => NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) {
    console.error('설정 GET 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: Object.fromEntries(data.map((r) => [r.key, r.value])) });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const { key, value } = await request.json();
  if (!ALLOWED_KEYS.includes(key) || typeof value !== 'string') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  if (key === CARRYOVER_KEY && !Number.isInteger(Number(value))) {
    return NextResponse.json({ error: '이월금은 숫자로 입력해주세요.' }, { status: 400 });
  }
  if (key === FIXED_EXPENSES_KEY && !parseFixedExpenses(value)) {
    return NextResponse.json({ error: '고정지출 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  const { error } = await supabase.from('settings').upsert({ key, value });
  if (error) {
    console.error('설정 PUT 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
