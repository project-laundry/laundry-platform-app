'use client';

import { useState } from 'react';
import Link from 'next/link';

type MissionStatus = 'available' | 'assigned' | 'in_progress' | 'completed';

interface Mission {
  id: string;
  customerId: string;
  customerName: string;
  type: 'pickup' | 'delivery';
  address: string;
  estimatedTime: string;
  items: number;
  payment: number;
  distance: string;
  specialInstructions?: string;
  status: MissionStatus;
}

interface Earnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalEarnings: number;
}

const mockMissions: Mission[] = [
  {
    id: '1',
    customerId: 'c1',
    customerName: 'Emma Hansen',
    type: 'pickup',
    address: 'Sandviken 12, 5020 Bergen',
    estimatedTime: '15 min',
    items: 5,
    payment: 150,
    distance: '2.3 km',
    specialInstructions: 'Ring på døren, ikke summer',
    status: 'available'
  },
  {
    id: '2',
    customerId: 'c2',
    customerName: 'Lars Olsen',
    type: 'delivery',
    address: 'Arna Sentrum 45, 5260 Bergen',
    estimatedTime: '20 min',
    items: 3,
    payment: 120,
    distance: '4.1 km',
    status: 'assigned'
  },
  {
    id: '3',
    customerId: 'c3',
    customerName: 'Sofia Andersen',
    type: 'pickup',
    address: 'Danmarksplass 8, 5020 Bergen',
    estimatedTime: '10 min',
    items: 7,
    payment: 200,
    distance: '1.8 km',
    status: 'available'
  }
];

const mockEarnings: Earnings = {
  today: 340,
  thisWeek: 1450,
  thisMonth: 5230,
  totalEarnings: 12890
};

export default function CleanerDashboardPage() {
  const [missions, setMissions] = useState<Mission[]>(mockMissions);
  const [activeMissions, setActiveMissions] = useState<Mission[]>(
    missions.filter(m => m.status === 'assigned' || m.status === 'in_progress')
  );

  const availableMissions = missions.filter(m => m.status === 'available');
  const completedMissions = missions.filter(m => m.status === 'completed');

  const handleAcceptMission = (missionId: string) => {
    setMissions(prev => prev.map(mission =>
      mission.id === missionId
        ? { ...mission, status: 'assigned' as MissionStatus }
        : mission
    ));
  };

  const handleDeclineMission = (missionId: string) => {
    setMissions(prev => prev.filter(mission => mission.id !== missionId));
  };

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
              <span className="text-medium-gray">Kari Renser</span>
              <button className="bg-soft-gray text-dark-gray px-4 py-2 rounded-lg hover:bg-gray-200">
                Logg ut
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Earnings Overview */}
        <div className="mb-8">
          {/* Earnings Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-dark-gray mb-4">Inntjening</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-medium-gray">I dag</p>
                <p className="text-2xl font-bold text-dark-gray">{mockEarnings.today} NOK</p>
              </div>
              <div>
                <p className="text-sm text-medium-gray">Denne uken</p>
                <p className="text-2xl font-bold text-dark-gray">{mockEarnings.thisWeek} NOK</p>
              </div>
              <div>
                <p className="text-sm text-medium-gray">Denne måneden</p>
                <p className="text-lg font-bold text-dark-gray">{mockEarnings.thisMonth} NOK</p>
              </div>
              <div>
                <p className="text-sm text-medium-gray">Totalt</p>
                <p className="text-lg font-bold text-dark-gray">{mockEarnings.totalEarnings} NOK</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Missions */}
        {activeMissions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-dark-gray mb-4">Aktive oppdrag</h2>
            <div className="space-y-4">
              {activeMissions.map((mission) => (
                <div key={mission.id} className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-dark-gray">{mission.customerName}</h3>
                      <p className="text-medium-gray">{mission.address}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {mission.type === 'pickup' ? 'Henting' : 'Levering'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-medium-gray">Estimert tid</p>
                      <p className="font-semibold">{mission.estimatedTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-medium-gray">Antall plagg</p>
                      <p className="font-semibold">{mission.items} stk</p>
                    </div>
                    <div>
                      <p className="text-sm text-medium-gray">Betaling</p>
                      <p className="font-semibold">{mission.payment} NOK</p>
                    </div>
                  </div>
                  {mission.specialInstructions && (
                    <div className="bg-white rounded-lg p-3 mb-4">
                      <p className="text-sm text-medium-gray mb-1">Spesielle instruksjoner:</p>
                      <p className="text-dark-gray">{mission.specialInstructions}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button className="flex-1 bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600">
                      Start oppdrag
                    </button>
                    <button className="px-4 py-2 bg-white text-blue-500 border border-blue-500 rounded-lg hover:bg-blue-50">
                      Kontakt kunde
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Missions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark-gray mb-4">Tilgjengelige oppdrag</h2>
          {availableMissions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-dark-gray mb-2">Ingen tilgjengelige oppdrag</h3>
              <p className="text-medium-gray">Vi varsler deg når nye oppdrag blir tilgjengelige i ditt område.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {availableMissions.map((mission) => (
                <div key={mission.id} className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-dark-gray">{mission.customerName}</h3>
                      <p className="text-medium-gray">{mission.address}</p>
                      <p className="text-sm text-medium-gray">📍 {mission.distance} unna</p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {mission.type === 'pickup' ? 'Henting' : 'Levering'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-medium-gray">Estimert tid</p>
                      <p className="font-semibold">{mission.estimatedTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-medium-gray">Antall plagg</p>
                      <p className="font-semibold">{mission.items} stk</p>
                    </div>
                    <div>
                      <p className="text-sm text-medium-gray">Betaling</p>
                      <p className="font-semibold text-green-600">{mission.payment} NOK</p>
                    </div>
                  </div>
                  {mission.specialInstructions && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-medium-gray mb-1">Spesielle instruksjoner:</p>
                      <p className="text-dark-gray">{mission.specialInstructions}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAcceptMission(mission.id)}
                      className="flex-1 bg-nordic-blue text-white font-semibold py-2 rounded-lg hover:bg-blue-600"
                    >
                      Godta oppdrag
                    </button>
                    <button
                      onClick={() => handleDeclineMission(mission.id)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      Avslå
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
            <div className="text-3xl mb-3">📊</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Statistikk</h4>
            <p className="text-medium-gray mb-4">Se detaljert oversikt over din ytelse</p>
            <button className="w-full bg-soft-gray text-dark-gray font-semibold py-2 rounded-lg hover:bg-gray-200">
              Se statistikk
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
            <div className="text-3xl mb-3">💰</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Utbetalinger</h4>
            <p className="text-medium-gray mb-4">Administrer betalingsinfo og historikk</p>
            <button className="w-full bg-soft-gray text-dark-gray font-semibold py-2 rounded-lg hover:bg-gray-200">
              Se utbetalinger
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
            <div className="text-3xl mb-3">📅</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Tilgjengelighet</h4>
            <p className="text-medium-gray mb-4">Sett dine arbeidsplaner</p>
            <button className="w-full bg-soft-gray text-dark-gray font-semibold py-2 rounded-lg hover:bg-gray-200">
              Rediger plan
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
            <div className="text-3xl mb-3">⚙️</div>
            <h4 className="text-lg font-bold text-dark-gray mb-2">Innstillinger</h4>
            <p className="text-medium-gray mb-4">Administrer profil og preferanser</p>
            <Link
              href="/profile/cleaner"
              className="block w-full bg-soft-gray text-dark-gray font-semibold py-2 rounded-lg hover:bg-gray-200"
            >
              Gå til innstillinger
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}