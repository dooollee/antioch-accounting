import  { Sidebar }  from "@/components/Sidebar";
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex">
          <Sidebar /> 
          <main className="w-screen min-h-screen p-6 bg-slate-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}