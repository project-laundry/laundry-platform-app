import { headers } from 'next/headers';
import { Navbar } from '@/components/landing/Navbar';
import { isGatedHost } from '@/lib/prelaunch';

/** The marketing navbar, aware of the pre-launch gate: on the production host
 *  it hides "Logg inn" / "Kom i gang" (those pages redirect to "/" there) and
 *  points the CTA at the waitlist instead. Reading the host makes the page
 *  dynamic, which is fine for the legal/contact pages that use it.
 *  Delete this wrapper with the gate at launch and use `Navbar` directly. */
export async function MarketingNav() {
  const host = (await headers()).get('host');
  return <Navbar prelaunch={isGatedHost(host)} />;
}
