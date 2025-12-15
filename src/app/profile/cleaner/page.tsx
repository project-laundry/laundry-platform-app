'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CleanerProfile {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  serviceAreas: string[];
  verified: boolean;
  rating: number;
  completedOrders: number;
  bankAccount: {
    accountNumber: string;
    bankName: string;
  };
  availability: {
    [key: string]: {
      available: boolean;
      timeSlots: string[];
    };
  };
}

const initialProfile: CleanerProfile = {
  name: 'Kari Renser',
  email: 'kari.renser@email.com',
  phone: '+47 987 65 432',
  address: {
    street: 'Torgallmenningen 5',
    city: 'Bergen',
    postalCode: '5020'
  },
  serviceAreas: ['Bergen sentrum', 'Sandviken', 'Arna'],
  verified: true,
  rating: 4.8,
  completedOrders: 47,
  bankAccount: {
    accountNumber: '1234.56.78901',
    bankName: 'DNB'
  },
  availability: {
    monday: { available: true, timeSlots: ['09:00-17:00'] },
    tuesday: { available: true, timeSlots: ['09:00-17:00'] },
    wednesday: { available: true, timeSlots: ['09:00-17:00'] },
    thursday: { available: true, timeSlots: ['09:00-17:00'] },
    friday: { available: true, timeSlots: ['09:00-17:00'] },
    saturday: { available: true, timeSlots: ['10:00-16:00'] },
    sunday: { available: false, timeSlots: [] }
  }
};

const dayLabels: Record<string, string> = {
  monday: 'Mandag',
  tuesday: 'Tirsdag',
  wednesday: 'Onsdag',
  thursday: 'Torsdag',
  friday: 'Fredag',
  saturday: 'Lørdag',
  sunday: 'Søndag'
};

const availableCities = ['Bergen', 'Oslo'];
const bergenAreas = ['Bergen sentrum', 'Sandviken', 'Arna', 'Fyllingsdalen', 'Årstad', 'Fana'];
const osloAreas = ['Oslo sentrum', 'Grünerløkka', 'Majorstuen', 'Frogner', 'St. Hanshaugen'];

export default function CleanerProfilePage() {
  const [profile, setProfile] = useState<CleanerProfile>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'availability' | 'payment'>('personal');

  const handleSave = () => {
    // In real app, this would make an API call
    setIsEditing(false);
  };

  const handleServiceAreaToggle = (area: string) => {
    setProfile(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(area)
        ? prev.serviceAreas.filter(a => a !== area)
        : [...prev.serviceAreas, area]
    }));
  };

  const handleAvailabilityToggle = (day: string) => {
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: {
          ...prev.availability[day],
          available: !prev.availability[day].available
        }
      }
    }));
  };

  const getServiceAreasForCity = () => {
    if (profile.address.city === 'Bergen') return bergenAreas;
    if (profile.address.city === 'Oslo') return osloAreas;
    return [];
  };

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/cleaner"
                className="text-nordic-blue hover:text-blue-600"
              >
                ← Tilbake til dashboard
              </Link>
              <h1 className="text-2xl font-bold text-dark-gray">Profil og innstillinger</h1>
            </div>
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                isEditing
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-nordic-blue text-white'
              }`}
            >
              {isEditing ? 'Lagre endringer' : 'Rediger profil'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Summary */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-nordic-blue rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-dark-gray">{profile.name}</h2>
              <p className="text-medium-gray">{profile.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-semibold">{profile.rating}</span>
                </div>
                <span className="text-medium-gray">•</span>
                <span className="text-medium-gray">{profile.completedOrders} fullførte oppdrag</span>
                {profile.verified && (
                  <>
                    <span className="text-medium-gray">•</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                      ✓ Verifisert
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-t-2xl border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
                activeTab === 'personal'
                  ? 'text-nordic-blue border-b-2 border-nordic-blue'
                  : 'text-medium-gray hover:text-dark-gray'
              }`}
            >
              Personlig informasjon
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
                activeTab === 'availability'
                  ? 'text-nordic-blue border-b-2 border-nordic-blue'
                  : 'text-medium-gray hover:text-dark-gray'
              }`}
            >
              Tilgjengelighet
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
                activeTab === 'payment'
                  ? 'text-nordic-blue border-b-2 border-nordic-blue'
                  : 'text-medium-gray hover:text-dark-gray'
              }`}
            >
              Betalingsinformasjon
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-2xl p-6 border border-gray-200 border-t-0">
          {/* Personal Information Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">Navn</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-nordic-blue disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">E-post</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-nordic-blue disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-nordic-blue disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">By</label>
                  <select
                    value={profile.address.city}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value },
                      serviceAreas: [] // Reset service areas when city changes
                    }))}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-nordic-blue disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-gray mb-2">Gateadresse</label>
                <input
                  type="text"
                  value={profile.address.street}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value }
                  }))}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-nordic-blue disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-gray mb-3">Serviceområder</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getServiceAreasForCity().map(area => (
                    <label key={area} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.serviceAreas.includes(area)}
                        onChange={() => handleServiceAreaToggle(area)}
                        disabled={!isEditing}
                        className="w-4 h-4 text-nordic-blue border-gray-300 rounded focus:ring-nordic-blue disabled:opacity-50"
                      />
                      <span className="text-dark-gray">{area}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-dark-gray mb-4">Ukentlig tilgjengelighet</h3>
              {Object.entries(profile.availability).map(([day, schedule]) => (
                <div key={day} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-24">
                    <span className="font-medium text-dark-gray">{dayLabels[day]}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedule.available}
                      onChange={() => handleAvailabilityToggle(day)}
                      disabled={!isEditing}
                      className="w-4 h-4 text-nordic-blue border-gray-300 rounded focus:ring-nordic-blue disabled:opacity-50"
                    />
                    <span className="text-dark-gray">Tilgjengelig</span>
                  </label>
                  {schedule.available && (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={schedule.timeSlots.join(', ')}
                        placeholder="09:00-17:00"
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-nordic-blue disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Payment Information Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-dark-gray mb-4">Bankkonto for utbetalinger</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-dark-gray mb-2">Kontonummer</label>
                    <input
                      type="text"
                      value={profile.bankAccount.accountNumber}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, accountNumber: e.target.value }
                      }))}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-nordic-blue disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-gray mb-2">Bank</label>
                    <input
                      type="text"
                      value={profile.bankAccount.bankName}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, bankName: e.target.value }
                      }))}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-nordic-blue disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Utbetalingsinfo</h4>
                <p className="text-blue-700 text-sm">
                  Utbetalinger skjer hver mandag for forrige uke. Beløpet overføres til din registrerte bankkonto.
                  Du vil motta en e-post med utbetalingsdetaljer når transaksjonen er gjennomført.
                </p>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-nordic-blue text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Lagre endringer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}