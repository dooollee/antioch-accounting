import { DashboardView } from '@/components/DashboardView';
import { getPublicStats } from '@/lib/publicStats';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  return <DashboardView months={await getPublicStats()} />;
}
