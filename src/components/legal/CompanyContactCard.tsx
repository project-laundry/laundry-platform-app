import { COMPANY, formatOrgNumber, formatPostalAddress, phoneHref } from '@/lib/config/company';

/**
 * The company details box on the legal pages (/salgsvilkar, /personvern,
 * /personvern-renser). Values come from lib/config/company.ts; `label` is the
 * only line that differs between the pages.
 */
export function CompanyContactCard({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur">
      <p className="mb-3 text-sm font-medium text-medium-gray">{label}</p>
      <ul className="space-y-1.5 text-sm text-dark-gray">
        <li>
          <span className="font-medium">Selskapsnavn:</span> {COMPANY.legalName}
        </li>
        <li>
          <span className="font-medium">Organisasjonsnummer:</span> {formatOrgNumber()}
        </li>
        <li>
          <span className="font-medium">Postadresse:</span> {formatPostalAddress()}
        </li>
        <li>
          <span className="font-medium">Telefon:</span>{' '}
          <a
            href={phoneHref()}
            className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
          >
            {COMPANY.phoneDisplay}
          </a>
        </li>
        <li>
          <span className="font-medium">E-post:</span>{' '}
          <a
            href={`mailto:${COMPANY.email}`}
            className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
          >
            {COMPANY.email}
          </a>
        </li>
      </ul>
    </div>
  );
}
