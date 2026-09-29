import { Sidebar } from '@/components/Sidebar';

export function Shell({ variant, children }: { variant: 'public' | 'admin'; children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar variant={variant} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
