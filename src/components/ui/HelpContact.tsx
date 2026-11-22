import { Mail, Phone } from 'lucide-react';
import { COMPANY, phoneHref } from '@/lib/config/company';

const LINK_CLASS =
  'inline-flex items-center gap-1.5 py-1 font-medium text-nordic-blue transition-colors hover:text-sea-green';

/**
 * "Trenger du hjelp?" — phone and e-mail to NooraCare for a signed-in
 * customer (customer dashboard and order details page). The values come from
 * lib/config/company.ts, never from here. `orderNumber` pre-fills the e-mail
 * subject so support sees which order it is about. Promises no response time.
 */
export function HelpContact({ orderNumber }: { orderNumber?: string }) {
  const mailHref = orderNumber
    ? `mailto:${COMPANY.email}?subject=${encodeURIComponent(`Bestilling #${orderNumber}`)}`
    : `mailto:${COMPANY.email}`;

  return (
    <aside className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-4 text-sm shadow-[var(--shadow-card)] backdrop-blur">
      <h2 className="font-medium text-dark-gray">Trenger du hjelp?</h2>
      <p className="mt-0.5 text-medium-gray">Ring oss eller send en e-post.</p>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        <a href={phoneHref()} className={`${LINK_CLASS} tabular-nums`}>
          <Phone className="size-4" />
          {COMPANY.phoneDisplay}
        </a>
        <a href={mailHref} className={LINK_CLASS}>
          <Mail className="size-4" />
          {COMPANY.email}
        </a>
      </div>
    </aside>
  );
}
