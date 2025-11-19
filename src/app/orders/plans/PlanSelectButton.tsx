import Link from 'next/link';

interface PlanSelectButtonProps {
  planSlug: string;
}

export function PlanSelectButton({ planSlug }: PlanSelectButtonProps) {
  return (
    <Link
      href={`/orders/additional-services?plan=${planSlug}`}
      className="w-full py-3 px-6 rounded-lg font-semibold transition-colors bg-white text-nordic-blue border-2 border-nordic-blue hover:bg-nordic-blue hover:text-white cursor-pointer block text-center"
    >
      Velg plan
    </Link>
  );
}
