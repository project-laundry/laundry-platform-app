import { ViewAsBanner } from '@/components/layout/ViewAsBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ViewAsBanner />
    </>
  );
}
