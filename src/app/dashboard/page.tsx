'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import {
  getActiveNotifications,
  createNotificationTriggers,
  NotificationTriggers,
  NotificationDismissals,
  NOTIFICATION_TEMPLATES
} from '@/lib/notifications';

type CustomerJourneyState = 'awaiting_bag' | 'no_active_order' | 'active_order' | 'multiple_active_orders';

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
  trackingButton?: {
    text: string;
    href: string;
    className: string;
  };
}

const journeyStateConfigs: Record<CustomerJourneyState, StatusConfig> = {
  awaiting_bag: {
    title: 'Venter på poseleveranse',
    description: 'Vi sender deg en NooraCare-pose i løpet av 3-5 virkedager. Du kan bestille henting når posen er levert og aktivert.',
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
  no_active_order: {
    title: 'Ingen aktive bestillinger',
    description: 'Du har ikke noen aktive bestillinger for øyeblikket. Bestill en ny henting når det passer deg!',
    badge: {
      text: 'Klar for bestilling',
      className: 'bg-green-100 text-green-800'
    },
    icon: '✅',
    orderButton: {
      text: 'Bestill henting',
      href: '/orders/new',
      disabled: false,
      className: 'block w-full bg-nordic-blue text-white text-center font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors'
    }
  },
  active_order: {
    title: 'Du har en aktiv bestilling!',
    description: 'Din bestilling er i prosess. Du vil få varsling når renseren er på vei for henting og levering.',
    badge: {
      text: 'Bestilling aktiv',
      className: 'bg-blue-100 text-blue-800'
    },
    icon: '🚚',
    orderButton: {
      text: 'Bestill ny henting',
      href: '/orders/new',
      disabled: false,
      className: 'block w-full bg-nordic-blue text-white text-center font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors'
    },
    trackingButton: {
      text: 'Spor bestilling',
      href: '/orders/1234',
      className: 'block w-full bg-gray-100 text-dark-gray text-center font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors mt-2'
    }
  },
  multiple_active_orders: {
    title: 'Du har flere aktive bestillinger!',
    description: 'Du har flere bestillinger i prosess. Se oversikten nedenfor for å følge med på statusen til hver bestilling.',
    badge: {
      text: 'Flere bestillinger aktive',
      className: 'bg-purple-100 text-purple-800'
    },
    icon: '📦',
    orderButton: {
      text: 'Bestill ny henting',
      href: '/orders/new',
      disabled: false,
      className: 'block w-full bg-nordic-blue text-white text-center font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors'
    }
  }
};

export default function DashboardPage() {
  // Customer journey state (independent from notifications)
  const [currentJourneyState, setCurrentJourneyState] = useState<CustomerJourneyState>('no_active_order');

  // Independent notification triggers
  const [notificationTriggers, setNotificationTriggers] = useState<NotificationTriggers>(
    createNotificationTriggers()
  );

  // Track dismissed notifications
  const [dismissedNotifications, setDismissedNotifications] = useState<NotificationDismissals>({});

  const currentConfig = journeyStateConfigs[currentJourneyState];

  // Get active notifications based on triggers and dismissals
  const notifications = getActiveNotifications(notificationTriggers, dismissedNotifications);

  const handleNotificationDismiss = (id: string) => {
    setDismissedNotifications(prev => ({
      ...prev,
      [id]: true
    }));
  };

  // Helper to toggle notification triggers
  const toggleNotificationTrigger = (key: keyof NotificationTriggers) => {
    setNotificationTriggers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Reset all notifications
  const resetNotifications = () => {
    setDismissedNotifications({});
  };

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
            Velkommen til NooraCare! 🎉
          </h2>
          <p className="text-xl text-medium-gray">
            Din konto er opprettet og klar til bruk.
          </p>
        </div>

        {/* State Toggle for Development (remove in production) */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔧 Dev: Test Different Customer Journey States</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.keys(journeyStateConfigs).map((state) => (
              <button
                key={state}
                onClick={() => setCurrentJourneyState(state as CustomerJourneyState)}
                className={`px-3 py-1 text-xs rounded-md font-medium ${
                  currentJourneyState === state
                    ? 'bg-yellow-200 text-yellow-900'
                    : 'bg-white text-yellow-700 border border-yellow-300'
                }`}
              >
                {state.replace('_', ' ')}
              </button>
            ))}
          </div>

          <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔔 Test Independent Notifications</h4>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="flex items-center text-xs text-yellow-800">
              <input
                type="checkbox"
                checked={notificationTriggers.showWelcomeMessage}
                onChange={() => toggleNotificationTrigger('showWelcomeMessage')}
                className="mr-1"
              />
              Welcome Message
            </label>
            <label className="flex items-center text-xs text-yellow-800">
              <input
                type="checkbox"
                checked={notificationTriggers.showBagDelivered}
                onChange={() => toggleNotificationTrigger('showBagDelivered')}
                className="mr-1"
              />
              Bag Delivered
            </label>
            <label className="flex items-center text-xs text-yellow-800">
              <input
                type="checkbox"
                checked={notificationTriggers.showBagDeliveryInfo}
                onChange={() => toggleNotificationTrigger('showBagDeliveryInfo')}
                className="mr-1"
              />
              Bag Delivery Info
            </label>
            <label className="flex items-center text-xs text-yellow-800">
              <input
                type="checkbox"
                checked={notificationTriggers.showGettingStartedTip}
                onChange={() => toggleNotificationTrigger('showGettingStartedTip')}
                className="mr-1"
              />
              Getting Started Tip
            </label>
            <label className="flex items-center text-xs text-yellow-800">
              <input
                type="checkbox"
                checked={notificationTriggers.showActiveOrderReminder}
                onChange={() => toggleNotificationTrigger('showActiveOrderReminder')}
                className="mr-1"
              />
              Active Order Reminder
            </label>
            <label className="flex items-center text-xs text-yellow-800">
              <input
                type="checkbox"
                checked={notificationTriggers.showMultipleOrdersTip}
                onChange={() => toggleNotificationTrigger('showMultipleOrdersTip')}
                className="mr-1"
              />
              Multiple Orders Tip
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetNotifications}
              className="px-2 py-1 text-xs bg-white text-yellow-700 border border-yellow-300 rounded-md"
            >
              Reset dismissed notifications
            </button>
          </div>
        </div>

        {/* Notification Center */}
        {notifications.length > 0 && (
          <div className="mb-8">
            <NotificationCenter
              notifications={notifications}
              onDismiss={handleNotificationDismiss}
            />
          </div>
        )}

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
              {currentConfig.trackingButton && (
                <div className="mt-4 w-[250px]">
                  <a href={currentConfig.trackingButton.href} className={currentConfig.trackingButton.className}>
                    {currentConfig.trackingButton.text}
                  </a>
                </div>
              )}
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