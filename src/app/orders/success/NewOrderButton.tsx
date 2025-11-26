'use client';

import { useRouter } from 'next/navigation';

export function NewOrderButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        router.push('/orders/plans');
      }}
      className="border-2 border-nordic-blue text-nordic-blue font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
    >
      Nytt abonnement
    </button>
  );
}
