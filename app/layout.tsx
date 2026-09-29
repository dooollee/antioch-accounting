import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Antioch 회비 현황',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
