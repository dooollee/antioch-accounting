import { FinanceView } from '@/components/FinanceView';
import { getCarryover, getPublicStats, getTransactions } from '@/lib/publicStats';

export const dynamic = 'force-dynamic';

export default async function Finance() {
  const [months, transactions, carryover] = await Promise.all([getPublicStats(), getTransactions(), getCarryover()]);
  return <FinanceView dues={months.map((m) => m.total.revenue)} transactions={transactions} carryover={carryover} />;
}
