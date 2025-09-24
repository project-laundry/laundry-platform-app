'use client';

import { useState } from 'react';
import Link from 'next/link';

type UserStatus = 'awaiting_bag' | 'bag_delivered' | 'first_order_placed' | 'active_customer';

interface StatusConfig {
  title: string;
  description: string;
  badge: {
    text: string;
    className: string;
  };
  icon: string;
  orderButton: {
    text: string;
    href?: string;
    disabled: boolean;
    className: string;
  };
}

const statusConfigs: Record<UserStatus, StatusConfig> = {
  awaiting_bag: {
    title: 'Venter på poseleveranse',
    description: 'Vi sender deg en RenVask-pose i løpet av 3-5 virkedager. Du kan bestille henting når posen er levert og aktivert.',
    badge: {
      text: 'Venter på levering',
      className: 'bg-orange-100 text-orange-800'
    },
    icon: '📦',
    orderButton: {
      text: 'Ikke tilgjengelig ennå',
      disabled: true,
      className: 'w-full bg-gray-200 text-gray-400 font-semibold py-2 rounded-lg cursor-not-allowed'
    }
  },
  bag_delivered: {
    title: 'RenVask-posen er levert! 🎉',
    description: 'Din RenVask-pose er levert og klar til bruk. Du kan nå bestille din første henting!',
    badge: {
      text: 'Klar for bestilling',
      className: 'bg-green-100 text-green-800'
    },
    icon: '✅',
    orderButton: {
      text: 'Bestill nå',
      href: '/orders/new',
      disabled: false,
      className: 'block w-full bg-nordic-blue text-white text-center font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors'
    }
  },
  first_order_placed: {
    title: 'Din første bestilling er på vei!',
    description: 'Vi har mottatt din første bestilling. Du vil få varsling når renseren er på vei for henting.',
    badge: {
      text: 'Første bestilling aktiv',
      className: 'bg-blue-100 text-blue-800'
    },
    icon: '🚚',
    orderButton: {
      text: 'Bestill ny henting',
      href: '/orders/new',
      disabled: false,
      className: 'block w-full bg-nordic-blue text-white text-center font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors'
    }
  },
  active_customer: {
    title: 'Velkommen tilbake!',
    description: 'Du har brukt RenVask før. Bestill en ny henting når det passer deg.',
    badge: {
      text: 'Aktiv kunde',
      className: 'bg-success-green/20 text-success-green'
    },
    icon: '⭐',
    orderButton: {
      text: 'Bestill henting',
      href: '/orders/new',
      disabled: false,
      className: 'block w-full bg-nordic-blue text-white text-center font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors'
    }
  }
};

export default function DashboardPage() {
  // You can easily change this state to test different user journeys
  const [userStatus, setUserStatus] = useState<UserStatus>('bag_delivered');

  const currentConfig = statusConfigs[userStatus];

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

        {/* State Toggle for Development (remove in production) */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔧 Dev: Test Different User States</h4>
          <div className="flex flex-wrap gap-2">
            {Object.keys(statusConfigs).map((status) => (
              <button
                key={status}
                onClick={() => setUserStatus(status as UserStatus)}
                className={`px-3 py-1 text-xs rounded-md font-medium ${
                  userStatus === status
                    ? 'bg-yellow-200 text-yellow-900'
                    : 'bg-white text-yellow-700 border border-yellow-300'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-dark-gray mb-2">
                {currentConfig.title}
              </h3>
              <p className="text-medium-gray mb-4">
                {currentConfig.description}
              </p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentConfig.badge.className}`}>
                {currentConfig.badge.text}
              </span>
            </div>
            <div className="text-6xl">
              {currentConfig.icon}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="text-4xl mb-4">👕</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Bestill henting</h4>
            <p className="text-medium-gray mb-4">
              Få klærne dine hentet og vasket
            </p>
            {currentConfig.orderButton.disabled ? (
              <button className={currentConfig.orderButton.className}>
                {currentConfig.orderButton.text}
              </button>
            ) : (
              <a href={currentConfig.orderButton.href} className={currentConfig.orderButton.className}>
                {currentConfig.orderButton.text}
              </a>
            )}
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