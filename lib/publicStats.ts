import { supabase } from '@/lib/supabase';
import { CONFIG, Transaction, buildMonthlyStats, carryoverKey, Member } from '@/lib/utils/dataHelpers';

// 공개 페이지용: 이름/연락처는 조회하지 않고 집계 숫자만 브라우저로 보냅니다.
export async function getPublicStats() {
  const { data, error } = await supabase.from('members').select('dept, monthlyStatus');
  if (error) throw error;
  return buildMonthlyStats((data ?? []) as Pick<Member, 'dept' | 'monthlyStatus'>[]);
}

export async function getTransactions(year = CONFIG.year): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, fiscal_year, month_index, type, category, description, amount')
    .eq('fiscal_year', year)
    .order('month_index')
    .order('id');
  if (error) throw error;
  return data ?? [];
}

// 전년도 이월금 (settings 테이블, 없으면 0)
export async function getCarryover(year = CONFIG.year) {
  const { data, error } = await supabase.from('settings').select('value').eq('key', carryoverKey(year)).maybeSingle();
  if (error) throw error;
  return Number(data?.value ?? 0) || 0;
}
