import { Shell } from '@/components/Shell';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <Shell variant="public">{children}</Shell>;
}
