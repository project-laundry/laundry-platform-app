import type { Metadata } from 'next';

// Pre-launch: keep login/signup out of search results. Remove at launch.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
