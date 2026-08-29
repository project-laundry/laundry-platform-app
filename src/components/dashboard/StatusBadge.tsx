// Brandbook §4 "Status badges" — tinted pill fills keyed by the variant names
// returned from lib/utils/order-status.ts and subscription-status.ts.

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'success'
  | 'info'
  | 'warning'
  | 'neutral';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-sea-green/10 text-sea-green',
  info: 'bg-sea-green/10 text-sea-green',
  warning: 'bg-amber-50 text-amber-800',
  destructive: 'bg-red-50 text-red-700',
  neutral: 'bg-cream-dark/60 text-medium-gray',
  default: 'bg-cream-dark/60 text-medium-gray',
  secondary: 'bg-cream-dark/60 text-medium-gray',
  outline: 'bg-cream-dark/60 text-medium-gray',
};

export function StatusBadge({
  variant,
  children,
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
