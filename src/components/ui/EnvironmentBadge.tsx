import { getAppEnvironment } from "@/lib/utils/environment";

const LABELS: Record<string, { text: string; className: string }> = {
  staging: {
    text: "STAGING",
    className: "bg-amber-50 text-amber-800",
  },
  development: {
    text: "DEV",
    className: "bg-nordic-blue/10 text-nordic-blue",
  },
};

/**
 * Small badge indicating the current environment.
 * Renders nothing in production so end users never see it.
 */
export function EnvironmentBadge() {
  const env = getAppEnvironment();
  const config = LABELS[env];

  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider leading-none ${config.className}`}
      title={`Miljø: ${env}`}
    >
      {config.text}
    </span>
  );
}
