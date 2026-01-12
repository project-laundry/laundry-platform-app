'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { oreToNok, PRICING, BASE_PRICE_PER_KG_NOK, IRONING_PRICE_NOK } from '@/lib/config/pricing';
import { updateCleanerOrderStatus, setOrderWeight, declineCleanerOrder, type OrderWithCustomer } from '../actions';
import type { OrderStatus } from '@/types/database';

interface CleanerOrderCardProps {
  order: OrderWithCustomer;
}

// Status workflow mapping - what action leads to what next status
const STATUS_ACTIONS: Record<OrderStatus, { next: OrderStatus; label: string; confirmText: string } | null> = {
  pickup_scheduled: {
    next: 'picked_up',
    label: 'Marker som hentet',
    confirmText: 'Bekreft at du har hentet klærne?',
  },
  picked_up: {
    next: 'in_cleaning',
    label: 'Sett i maskin',
    confirmText: 'Bekreft at klærne er satt i vaskemaskinen?',
  },
  in_cleaning: {
    next: 'ready_for_delivery',
    label: 'Ferdig vasket',
    confirmText: 'Bekreft at vask og evt. stryking er ferdig?',
  },
  ready_for_delivery: {
    next: 'out_for_delivery',
    label: 'Ut for levering',
    confirmText: 'Bekreft at du er på vei for å levere?',
  },
  out_for_delivery: {
    next: 'completed',
    label: 'Levert',
    confirmText: 'Bekreft at klærne er levert til kunden?',
  },
  pending_assignment: null,
  completed: null,
  cancelled: null,
};

type PendingAction = 'status' | 'decline' | 'weight' | null;

export function CleanerOrderCard({ order }: CleanerOrderCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weight, setWeight] = useState(order.actual_weight_kg?.toString() || '');
  const [notes, setNotes] = useState(order.pricing_notes || '');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const action = STATUS_ACTIONS[order.status];
  const needsWeight = order.status === 'picked_up' && !order.actual_weight_kg;
  const hasWeight = order.actual_weight_kg !== null;

  // Calculate preview price when weight is entered
  const previewPrice =
    weight && parseFloat(weight) > 0
      ? parseFloat(weight) * PRICING.base_price_per_kg_ore + (order.needs_ironing ? PRICING.ironing_price_ore : 0)
      : 0;

  function handleStatusClick() {
    if (!action) return;

    // If transitioning from picked_up and no weight set, show weight input first
    if (order.status === 'picked_up' && !order.actual_weight_kg) {
      setShowWeightInput(true);
      return;
    }

    setPendingAction('status');
  }

  async function confirmStatusUpdate() {
    if (!action) return;

    setIsLoading(true);
    const result = await updateCleanerOrderStatus(order.id, action.next);
    if (!result.success) {
      alert(result.error || 'Kunne ikke oppdatere status');
    }
    setIsLoading(false);
    setPendingAction(null);
  }

  function handleWeightClick() {
    setPendingAction('weight');
  }

  async function confirmSetWeight() {
    if (!weight || parseFloat(weight) <= 0) {
      alert('Vennligst oppgi en gyldig vekt');
      return;
    }

    setIsLoading(true);
    const result = await setOrderWeight(order.id, parseFloat(weight), notes || undefined);
    if (result.success) {
      setShowWeightInput(false);
      setPendingAction(null);
    } else {
      alert(result.error || 'Kunne ikke lagre vekt');
    }
    setIsLoading(false);
  }

  function handleDeclineClick() {
    setPendingAction('decline');
  }

  async function confirmDecline() {
    setIsLoading(true);
    const result = await declineCleanerOrder(order.id);
    if (!result.success) {
      alert(result.error || 'Kunne ikke avslå oppdrag');
    }
    setIsLoading(false);
    setPendingAction(null);
  }

  function cancelPendingAction() {
    setPendingAction(null);
  }

  function handleEditWeight() {
    setWeight(order.actual_weight_kg?.toString() || '');
    setNotes(order.pricing_notes || '');
    setShowWeightInput(true);
  }

  return (
    <Card>
      <CardContent className="pt-4 sm:pt-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div>
            <p className="font-semibold text-dark-gray">#{order.order_number}</p>
            <p className="text-sm text-medium-gray">{order.customer.user.full_name}</p>
          </div>
          <Badge variant={getOrderStatusVariant(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm mb-2 sm:mb-3">
          <div>
            <p className="text-medium-gray">Henting</p>
            <p className="font-medium text-dark-gray">
              {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
          <div>
            <p className="text-medium-gray">Levering</p>
            <p className="font-medium text-dark-gray">
              {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        </div>

        {/* Details section - always visible */}
        <div className="border-t pt-2 sm:pt-3 mb-2 sm:mb-3 text-sm space-y-1.5 sm:space-y-2">
          <div>
            <p className="text-medium-gray">Adresse</p>
            <p className="font-medium">
              {order.street}, {order.postal_code} {order.city}
            </p>
          </div>
          {order.special_instructions && (
            <div>
              <p className="text-medium-gray">Instruksjoner</p>
              <p>{order.special_instructions}</p>
            </div>
          )}
          {order.special_instructions_address && (
            <div>
              <p className="text-medium-gray">Adresseinstruksjoner</p>
              <p>{order.special_instructions_address}</p>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {order.needs_ironing && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Stryking inkludert</span>
            )}
            {order.subscription && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                {order.subscription.frequency === 'weekly'
                  ? 'Ukentlig'
                  : order.subscription.frequency === 'biweekly'
                    ? 'Annenhver uke'
                    : order.subscription.frequency === 'monthly'
                      ? 'Månedlig'
                      : 'Enkeltordre'}
              </span>
            )}
          </div>
          {hasWeight && !showWeightInput && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-medium-gray">Vekt / Pris</p>
                <button onClick={handleEditWeight} className="text-xs text-nordic-blue hover:underline">
                  Endre
                </button>
              </div>
              <p className="font-medium">
                {order.actual_weight_kg} kg - {oreToNok(order.total_cost_ore || 0)} kr
              </p>
              {order.pricing_notes && <p className="text-xs text-medium-gray mt-1">{order.pricing_notes}</p>}
            </div>
          )}
        </div>

        {/* Weight input form */}
        {showWeightInput && (
          <div className="border-t pt-3 mb-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-dark-gray mb-1">Vekt (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nordic-blue"
                placeholder="f.eks. 5.5"
              />
            </div>
            {weight && parseFloat(weight) > 0 && (
              <div className="bg-soft-gray p-3 rounded-lg">
                <p className="text-sm text-medium-gray">Beregnet pris:</p>
                <p className="text-lg font-semibold text-dark-gray">{oreToNok(previewPrice)} kr</p>
                <p className="text-xs text-medium-gray">
                  ({weight} kg x {BASE_PRICE_PER_KG_NOK} kr
                  {order.needs_ironing ? ` + ${IRONING_PRICE_NOK} kr stryking` : ''})
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-dark-gray mb-1">Notater (valgfritt)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nordic-blue"
                placeholder="f.eks. Ekstra skitne klær"
              />
            </div>

            {/* Weight confirmation */}
            {pendingAction === 'weight' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 mb-3">
                  Bekreft lagring av vekt: {weight} kg = {oreToNok(previewPrice)} kr?
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={confirmSetWeight} disabled={isLoading} className="flex-1">
                    {isLoading ? 'Lagrer...' : 'Bekreft'}
                  </Button>
                  <Button variant="outline" onClick={cancelPendingAction} disabled={isLoading} className="sm:flex-initial">
                    Avbryt
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleWeightClick} disabled={isLoading || !weight} className="flex-1">
                  Lagre vekt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWeightInput(false);
                    setWeight(order.actual_weight_kg?.toString() || '');
                    setNotes(order.pricing_notes || '');
                  }}
                  className="sm:flex-initial"
                >
                  Avbryt
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Confirmation dialogs */}
        {pendingAction === 'status' && action && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-yellow-800 mb-3">{action.confirmText}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={confirmStatusUpdate} disabled={isLoading} className="flex-1">
                {isLoading ? 'Oppdaterer...' : 'Bekreft'}
              </Button>
              <Button variant="outline" onClick={cancelPendingAction} disabled={isLoading} className="sm:flex-initial">
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {pendingAction === 'decline' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-red-800 mb-3">Er du sikker på at du vil avslå dette oppdraget?</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="destructive" onClick={confirmDecline} disabled={isLoading} className="flex-1">
                {isLoading ? 'Avslår...' : 'Ja, avslå'}
              </Button>
              <Button variant="outline" onClick={cancelPendingAction} disabled={isLoading} className="sm:flex-initial">
                Nei, behold
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons (hidden when confirmation is showing) */}
        {action && !showWeightInput && !pendingAction && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleStatusClick} disabled={isLoading} className="flex-1">
              {isLoading ? 'Oppdaterer...' : action.label}
            </Button>
            {order.status === 'pickup_scheduled' && (
              <Button variant="outline" onClick={handleDeclineClick} disabled={isLoading} className="sm:flex-initial">
                Avslå
              </Button>
            )}
          </div>
        )}

        {/* Show weight prompt for picked_up orders without weight */}
        {needsWeight && !showWeightInput && !pendingAction && (
          <Button onClick={() => setShowWeightInput(true)} className="w-full">
            Registrer vekt
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
