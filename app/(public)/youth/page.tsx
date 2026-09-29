import { DashboardView } from '@/components/DashboardView';
import { getPublicStats } from '@/lib/publicStats';

export const dynamic = 'force-dynamic';

export default async function Youth() {
  return <DashboardView title="청년부 현황" scope="youth" months={await getPublicStats()} />;
}
