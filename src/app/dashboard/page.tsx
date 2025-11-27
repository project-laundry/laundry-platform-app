import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/ui/LogoutButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.full_name || 'Bruker';

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-medium-gray">{userName}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-dark-gray mb-2">
                Ingen aktive bestillinger
              </h3>
              <p className="text-medium-gray mb-4">
                Du har ikke noen aktive bestillinger for øyeblikket. Bestill klesvask når det passer deg!
              </p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Klar for bestilling
              </span>
            </div>
            <div className="text-6xl">
              ✅
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="text-4xl mb-4">👕</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Bestill klesvask</h4>
            <p className="text-medium-gray mb-4">
              Få klærne dine hentet og vasket
            </p>
            <Link href="/orders/plans" className="block w-full bg-nordic-blue text-white text-center font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors">
              Bestill klesvask
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="text-4xl mb-4">📋</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Mine bestillinger</h4>
            <p className="text-medium-gray mb-4">
              Se status på dine vaskebestillinger
            </p>
            <Link
              href="/orders"
              className="block w-full bg-soft-gray text-dark-gray text-center font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Se bestillinger
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="text-4xl mb-4">⚙️</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Innstillinger</h4>
            <p className="text-medium-gray mb-4">
              Administrer konto og preferanser
            </p>
            <Link
              href="/profile"
              className="block w-full bg-soft-gray text-dark-gray text-center font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Gå til innstillinger
            </Link>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-nordic-blue/5 rounded-2xl p-8 border border-nordic-blue/20">
          <div className="flex items-start">
            <div className="text-4xl mr-6">💬</div>
            <div>
              <h3 className="text-xl font-bold text-dark-gray mb-2">
                Trenger du hjelp?
              </h3>
              <p className="text-medium-gray mb-4">
                Vårt kundeserviceteam er her for å hjelpe deg med spørsmål eller problemer.
              </p>
              <div className="flex gap-4">
                <a
                  href="mailto:hei@renvask.no"
                  className="bg-nordic-blue text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Send e-post
                </a>
                <a
                  href="tel:+4712345678"
                  className="bg-white text-nordic-blue border border-nordic-blue font-semibold px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Ring oss
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
