'use client';

import { useState } from 'react';
import { IroningToggle as SwitchRow } from '@/components/order-flow/primitives';
import { CUSTOMER_EMAIL_KINDS } from '@/lib/config/email-preferences';
import { SAVE_BUTTON_CLASS, SaveMessage, type SaveMessageState } from '../SettingsSection';
import { updateEmailPreferencesAction } from '../actions';

export function EmailPreferencesForm({ initial }: { initial: Partial<Record<string, boolean>> }) {
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      CUSTOMER_EMAIL_KINDS.filter((kind) => kind.optional).map((kind) => [kind.id, initial[kind.id] !== false])
    )
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessageState>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await updateEmailPreferencesAction(values);
    setSaving(false);
    setMessage(
      result.success
        ? { kind: 'success', text: 'Valgene er lagret' }
        : { kind: 'error', text: result.error ?? 'Kunne ikke lagre' }
    );
  }

  return (
    <div>
      <div className="mt-5 space-y-2">
        {CUSTOMER_EMAIL_KINDS.map((kind) => {
          if (!kind.optional) {
            return (
              <SwitchRow
                key={kind.id}
                label={kind.label}
                hint={kind.description}
                checked
                disabled
                disabledHint={`${kind.description} Sendes alltid.`}
                onChange={() => {}}
              />
            );
          }
          if (kind.id === 'evaluation') {
            return (
              <SwitchRow
                key={kind.id}
                label={kind.label}
                hint={kind.description}
                checked={values.delivered && values.evaluation}
                disabled={!values.delivered}
                disabledHint="Sendes bare sammen med «Tøyet er levert»."
                onChange={(checked) => {
                  setValues((current) => ({ ...current, [kind.id]: checked }));
                  setMessage(null);
                }}
              />
            );
          }
          return (
            <SwitchRow
              key={kind.id}
              label={kind.label}
              hint={kind.description}
              checked={values[kind.id]}
              disabledHint=""
              onChange={(checked) => {
                setValues((current) => ({ ...current, [kind.id]: checked }));
                setMessage(null);
              }}
            />
          );
        })}
      </div>

      <div className="mt-5">
        <button type="button" onClick={handleSave} disabled={saving} className={SAVE_BUTTON_CLASS}>
          {saving ? 'Lagrer …' : 'Lagre'}
        </button>
        <SaveMessage message={message} />
      </div>
    </div>
  );
}
