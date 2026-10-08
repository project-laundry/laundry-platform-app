import Link from "next/link";
import { Wordmark } from '@/components/layout/AppHeader';
import { INSTAGRAM_URL } from '@/components/coming-soon/launch';

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

const PHONE_DISPLAY = '+47 976 16 468';
const PHONE_HREF = `tel:${PHONE_DISPLAY.replace(/\s/g, '')}`;

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
              <p>NooraCare AS</p>
              <p>Org.nr: 836 788 842</p>
            </div>
            {/* Social Icons */}
            <div className="flex gap-3 pt-2">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-10 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green"
                aria-label="Instagram"
              >
                <Instagram className="size-5" />
              </a>
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
                  href="mailto:post@nooracare.no"
                  className="transition-colors hover:text-nordic-blue"
                >
                  post@nooracare.no
                </a>
              </li>
              <li>
                <a
                  href={PHONE_HREF}
                  className="transition-colors hover:text-nordic-blue"
                >
                  {PHONE_DISPLAY}
                </a>
              </li>
              {/* TODO: confirm the postal address before production */}
              <li className="leading-relaxed">
                Breimyra 232
                <br />
                5134 Flaktveit
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
            <p>© 2026 NooraCare. Alle rettigheter reservert.</p>
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
