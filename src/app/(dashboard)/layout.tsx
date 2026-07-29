export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import SocialMediaAlertButton from '@/components/SocialMediaAlertButton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-slate-50">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <AppHeader />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-8">
          <SocialMediaAlertButton />
          {children}
        </main>
      </div>
    </div>
  );
}
