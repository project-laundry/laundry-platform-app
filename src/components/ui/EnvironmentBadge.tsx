import { getAppEnvironment } from "@/lib/utils/environment";

const LABELS: Record<string, { text: string; className: string }> = {
  staging: {
    text: "STAGING",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  development: {
    text: "DEV",
    className: "bg-sky-100 text-sky-800 border-sky-300",
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
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider leading-none ${config.className}`}
      title={`Miljø: ${env}`}
    >
      {config.text}
    </span>
  );
}
