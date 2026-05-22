import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CopyToastHost } from '@/components/canvas/CopyToast';
import { SaveIndicator } from '@/components/canvas/SaveIndicator';

export default async function CanvasLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <>
      {children}
      <CopyToastHost />
      <SaveIndicator />
    </>
  );
}
