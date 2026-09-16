import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { StepGuard } from './StepGuard';

// The five onboarding steps require a signed-in cleaner account without a
// profile yet. requireRole sends signed-out users to /auth/login (the login
// page routes cleaners without a profile back here) and other roles to
// /dashboard. Cleaners who already finished onboarding go to their dashboard.
export default async function CleanerStepsLayout({ children }: { children: React.ReactNode }) {
  const { authUserId } = await requireRole(['cleaner']);

  const cleaner = await getCleanerByUserId(authUserId);
  if (cleaner) {
    redirect('/dashboard/cleaner');
  }

  return <StepGuard>{children}</StepGuard>;
}
