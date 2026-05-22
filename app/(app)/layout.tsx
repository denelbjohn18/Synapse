import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/shell/Sidebar';
import { TopBar } from '@/components/shell/TopBar';
import { CopyToastHost } from '@/components/canvas/CopyToast';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-content">
        <TopBar />
        <main className="shell-main">{children}</main>
      </div>
      <CopyToastHost />
    </div>
  );
}
