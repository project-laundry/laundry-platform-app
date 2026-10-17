'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormInput } from '@/components/forms/FormInput';
import { validateNorwegianPhone } from '@/lib/validation/cleaner';
import { updateCustomerContactAction } from './actions';
import { INPUT_CLASS, SAVE_BUTTON_CLASS, SaveMessage, type SaveMessageState } from './SettingsSection';

interface ContactFormProps {
  initialFullName: string;
  /** 8 digits, +47 already stripped by the page. */
  initialPhoneDigits: string;
  email: string;
}

export function ContactForm({ initialFullName, initialPhoneDigits, email }: ContactFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhoneDigits);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveMessageState>(null);

  // Digits only, max 8 — the +47 prefix is fixed in the UI (same as signup).
  const handlePhoneChange = (raw: string) => {
    setPhone(raw.replace(/\D/g, '').slice(0, 8));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (fullName.trim().length < 2) {
      newErrors.fullName = 'Navn må ha minst 2 tegn';
    }
    if (!validateNorwegianPhone(phone)) {
      newErrors.phone = 'Telefonnummer må være 8 siffer';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    if (!validate()) return;

    setIsSaving(true);
    const result = await updateCustomerContactAction({ fullName, phone });
    setIsSaving(false);

    if (result.success) {
      setSaveMessage({ kind: 'success', text: 'Endringene er lagret' });
      // The header and dashboard greeting are server-rendered from the users row.
      router.refresh();
    } else {
      setSaveMessage({ kind: 'error', text: result.error || 'Kunne ikke lagre endringene' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="Fullt navn"
        value={fullName}
        onChange={(value) => setFullName(value.slice(0, 100))}
        placeholder="Ola Nordmann"
        required
        error={errors.fullName}
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">
          Telefonnummer<span className="ml-1 text-red-600">*</span>
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value="+47"
            disabled
            aria-label="Landskode"
            className="w-16 rounded-2xl border border-cream-dark bg-cream/50 px-4 py-3 text-center text-dark-gray"
          />
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="8 siffer"
            className={`flex-1 ${INPUT_CLASS} ${errors.phone ? 'border-red-300' : 'border-cream-dark'}`}
          />
        </div>
        {errors.phone && <p className="mt-1.5 text-sm text-red-600">{errors.phone}</p>}
      </label>

      <div>
        <FormInput label="E-post" value={email} onChange={() => {}} type="email" disabled />
        <p className="mt-1.5 text-sm text-medium-gray">Ta kontakt med oss for å endre e-post.</p>
      </div>

      <SaveMessage message={saveMessage} />

      <button type="submit" disabled={isSaving} className={SAVE_BUTTON_CLASS}>
        {isSaving ? 'Lagrer…' : 'Lagre endringer'}
      </button>
    </form>
  );
}
