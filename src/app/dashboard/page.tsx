'use client';

import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">RenVask</h1>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-medium-gray">Ola Nordmann</span>
              <button className="bg-soft-gray text-dark-gray px-4 py-2 rounded-lg hover:bg-gray-200">
                Logg ut
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">
            Velkommen til RenVask! 🎉
          </h2>
          <p className="text-xl text-medium-gray">
            Din konto er opprettet og klar til bruk.
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-dark-gray mb-2">
                Venter på poseleveranse
              </h3>
              <p className="text-medium-gray mb-4">
                Vi sender deg en RenVask-pose i løpet av 3-5 virkedager.
                Du kan bestille henting når posen er levert og aktivert.
              </p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                Venter på levering
              </span>
            </div>
            <div className="text-6xl">
              📦
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="text-4xl mb-4">👕</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Bestill henting</h4>
            <p className="text-medium-gray mb-4">
              Tilgjengelig når posen er levert
            </p>
            <button
              disabled
              className="w-full bg-gray-200 text-gray-400 font-semibold py-2 rounded-lg cursor-not-allowed"
            >
              Ikke tilgjengelig ennå
            </button>
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