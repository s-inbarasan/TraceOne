import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ScrollRestorationArea } from '@/components/layout/scroll-restoration';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ScrollRestorationArea className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl p-6">
            {children}
          </div>
        </ScrollRestorationArea>
      </div>
    </div>
  );
}
