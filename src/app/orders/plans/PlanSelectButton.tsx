'use client';

import { useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';

interface PlanSelectButtonProps {
  planSlug: string;
}

export function PlanSelectButton({ planSlug }: PlanSelectButtonProps) {
  const router = useRouter();
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  const handleClick = () => {
    updateOrderData({
      plan: planSlug as 'single' | 'weekly' | 'biweekly',
      hasBag: false,
      additionalKg: 0,
      delicateItems: 0,
      needsIroning: false
    });
    router.push('/orders/additional-services');
  };

  return (
    <button
      onClick={handleClick}
      className="w-full py-3 px-6 rounded-lg font-semibold transition-colors bg-white text-nordic-blue border-2 border-nordic-blue hover:bg-nordic-blue hover:text-white cursor-pointer block text-center"
    >
      Velg plan
    </button>
  );
}
