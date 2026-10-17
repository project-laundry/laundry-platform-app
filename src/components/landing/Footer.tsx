import Link from "next/link";
import { Wordmark } from '@/components/layout/AppHeader';
import { COMPANY, formatOrgNumber, phoneHref } from '@/lib/config/company';

// Brand icons were removed from lucide-react in v1.0; this is the original
// lucide path inlined (ISC license).
function Instagram({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// Same origin as the Instagram icon above: lucide's facebook path, inlined.
function Facebook({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function Footer({
  /** The "Priser" link points at the customer price calculator; hide it on cleaner pages. */
  showPricing = true,
}: {
  showPricing?: boolean;
}) {
  return (
    <footer className="border-t border-cream-dark/70 bg-warm-white/80 backdrop-blur">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4">
            <Wordmark />
            <p className="leading-relaxed text-medium-gray">
              NooraCare kobler deg med en lokal renser som vasker klærne dine.
            </p>
            <div className="space-y-1 text-sm text-medium-gray">
              <p>{COMPANY.legalName}</p>
              <p>Org.nr: {formatOrgNumber()}</p>
            </div>
            {/* Social Icons */}
            <div className="flex gap-3 pt-2">
              <a
                href={COMPANY.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-10 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green"
                aria-label="Instagram"
              >
                <Instagram className="size-5" />
              </a>
              {COMPANY.facebookUrl && (
                <a
                  href={COMPANY.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-10 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green"
                  aria-label="Facebook"
                >
                  <Facebook className="size-5" />
                </a>
              )}
            </div>
          </div>

          {/* Service Areas Column */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-semibold text-dark-gray">
              Serviceområder
            </h4>
            <ul className="space-y-3 text-medium-gray">
              <li>Bergen</li>
              <li>Oslo</li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-semibold text-dark-gray">
              Kontakt
            </h4>
            <ul className="space-y-3 text-medium-gray">
              <li>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="transition-colors hover:text-nordic-blue"
                >
                  {COMPANY.email}
                </a>
              </li>
              <li>
                <a
                  href={phoneHref()}
                  className="transition-colors hover:text-nordic-blue"
                >
                  {COMPANY.phoneDisplay}
                </a>
              </li>
              <li className="leading-relaxed">
                {COMPANY.address.street}
                <br />
                {COMPANY.address.postalCode} {COMPANY.address.city}
              </li>
              <li>
                <Link
                  href="/kontakt"
                  className="transition-colors hover:text-nordic-blue"
                >
                  Kontakt oss
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-semibold text-dark-gray">
              Selskap
            </h4>
            <ul className="space-y-3">
              {showPricing && (
                <li>
                  <Link
                    href="/pris-kalkulator"
                    className="text-medium-gray transition-colors hover:text-nordic-blue"
                  >
                    Priser
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/personvern"
                  className="text-medium-gray transition-colors hover:text-nordic-blue"
                >
                  Personvern
                </Link>
              </li>
              <li>
                <Link
                  href="/salgsvilkar"
                  className="text-medium-gray transition-colors hover:text-nordic-blue"
                >
                  Vilkår
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-cream-dark/60">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-medium-gray md:flex-row">
            <p>© {new Date().getFullYear()} NooraCare. Alle rettigheter reservert.</p>
            <div className="flex gap-6">
              <Link
                href="/personvern"
                className="transition-colors hover:text-nordic-blue"
              >
                Personvern
              </Link>
              <Link
                href="/salgsvilkar"
                className="transition-colors hover:text-nordic-blue"
              >
                Vilkår
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
