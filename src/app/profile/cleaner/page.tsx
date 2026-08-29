'use client';

import { useState } from 'react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { Check, Info, Star } from 'lucide-react';

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

const inputClass =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-medium-gray';

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
    <div className="min-h-screen bg-cream text-dark-gray">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      {/* Header */}
      <AppHeader maxWidth="max-w-4xl" />

      <div className="mx-auto max-w-4xl px-5 pb-16 pt-6">
        <div className="mb-4">
          <BackLink href="/dashboard/cleaner" label="Tilbake til dashboard" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-bottom-3 duration-500">
          <h1 className="font-serif text-3xl font-semibold leading-tight text-dark-gray sm:text-4xl">
            Profil og innstillinger
          </h1>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] sm:w-auto"
          >
            {isEditing ? 'Lagre endringer' : 'Rediger profil'}
          </button>
        </div>

        {/* Profile Summary */}
        <div
          className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
          style={{ animationDelay: '60ms' }}
        >
          <div className="flex items-center gap-5">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-nordic-blue font-serif text-2xl font-semibold text-white">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-2xl font-semibold text-dark-gray">{profile.name}</h2>
              <p className="text-sm text-medium-gray">{profile.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium tabular-nums">{profile.rating}</span>
                </span>
                <span className="text-medium-gray">{profile.completedOrders} fullførte oppdrag</span>
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sea-green/10 px-2.5 py-0.5 text-xs font-medium text-sea-green">
                    <Check className="size-3" />
                    Verifisert
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="mt-6 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-3 duration-700"
          style={{ animationDelay: '120ms' }}
        >
          <button
            onClick={() => setActiveTab('personal')}
            className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'personal'
                ? 'border-sea-green bg-sea-green/10 text-sea-green'
                : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
            }`}
          >
            Personlig informasjon
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'availability'
                ? 'border-sea-green bg-sea-green/10 text-sea-green'
                : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
            }`}
          >
            Tilgjengelighet
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'payment'
                ? 'border-sea-green bg-sea-green/10 text-sea-green'
                : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
            }`}
          >
            Betalingsinformasjon
          </button>
        </div>

        {/* Tab Content */}
        <div
          key={activeTab}
          className="mt-4 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-top-1 duration-300"
        >
          {/* Personal Information Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-dark-gray">Navn</span>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-dark-gray">E-post</span>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-dark-gray">Telefon</span>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-dark-gray">By</span>
                  <select
                    value={profile.address.city}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value },
                      serviceAreas: [] // Reset service areas when city changes
                    }))}
                    disabled={!isEditing}
                    className={inputClass}
                  >
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-dark-gray">Gateadresse</span>
                <input
                  type="text"
                  value={profile.address.street}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value }
                  }))}
                  disabled={!isEditing}
                  className={inputClass}
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-medium text-dark-gray">Serviceområder</span>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {getServiceAreasForCity().map(area => {
                    const checked = profile.serviceAreas.includes(area);
                    return (
                      <label
                        key={area}
                        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-all ${
                          !isEditing
                            ? 'cursor-not-allowed border-cream-dark/60 bg-cream/40 opacity-70'
                            : checked
                              ? 'cursor-pointer border-sea-green bg-sea-green/8'
                              : 'cursor-pointer border-cream-dark bg-white hover:border-sea-green/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleServiceAreaToggle(area)}
                          disabled={!isEditing}
                          className="size-4 shrink-0 accent-sea-green"
                        />
                        <span className="text-sm text-dark-gray">{area}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-dark-gray">Ukentlig tilgjengelighet</h3>
              {Object.entries(profile.availability).map(([day, schedule]) => (
                <div
                  key={day}
                  className="flex items-center gap-4 rounded-2xl border border-cream-dark bg-white px-4 py-3"
                >
                  <div className="w-24">
                    <span className="font-medium text-dark-gray">{dayLabels[day]}</span>
                  </div>
                  <label className={`flex items-center gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={schedule.available}
                      onChange={() => handleAvailabilityToggle(day)}
                      disabled={!isEditing}
                      className="size-4 shrink-0 accent-sea-green disabled:opacity-50"
                    />
                    <span className="text-sm text-dark-gray">Tilgjengelig</span>
                  </label>
                  {schedule.available && (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={schedule.timeSlots.join(', ')}
                        placeholder="09:00-17:00"
                        disabled={!isEditing}
                        className="w-full rounded-2xl border border-cream-dark bg-white px-3.5 py-2 text-sm tabular-nums text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-medium-gray"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Payment Information Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-semibold text-dark-gray">Bankkonto for utbetalinger</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-dark-gray">Kontonummer</span>
                    <input
                      type="text"
                      value={profile.bankAccount.accountNumber}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, accountNumber: e.target.value }
                      }))}
                      disabled={!isEditing}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-dark-gray">Bank</span>
                    <input
                      type="text"
                      value={profile.bankAccount.bankName}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, bankName: e.target.value }
                      }))}
                      disabled={!isEditing}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
                <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
                <div>
                  <p className="font-medium text-dark-gray">Utbetalingsinfo</p>
                  <p className="mt-1">
                    Utbetalinger skjer hver mandag for forrige uke. Beløpet overføres til din registrerte bankkonto.
                    Du vil motta en e-post med utbetalingsdetaljer når transaksjonen er gjennomført.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-6 flex gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <button
              onClick={() => setIsEditing(false)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-cream-dark bg-white px-6 py-3.5 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Lagre endringer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
