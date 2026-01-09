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
const STATUS_ACTIONS: Record<OrderStatus, { next: OrderStatus; label: string } | null> = {
  pickup_scheduled: { next: 'picked_up', label: 'Marker som hentet' },
  picked_up: { next: 'in_cleaning', label: 'Sett i maskin' },
  in_cleaning: { next: 'ready_for_delivery', label: 'Ferdig vasket' },
  ready_for_delivery: { next: 'out_for_delivery', label: 'Ut for levering' },
  out_for_delivery: { next: 'completed', label: 'Levert' },
  pending_assignment: null,
  completed: null,
  cancelled: null,
};

export function CleanerOrderCard({ order }: CleanerOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const action = STATUS_ACTIONS[order.status];
  const needsWeight = order.status === 'picked_up' && !order.actual_weight_kg;

  // Calculate preview price when weight is entered
  const previewPrice =
    weight && parseFloat(weight) > 0
      ? parseFloat(weight) * PRICING.base_price_per_kg_ore + (order.needs_ironing ? PRICING.ironing_price_ore : 0)
      : 0;

  async function handleStatusUpdate() {
    if (!action) return;

    // If transitioning from picked_up and no weight set, show weight input first
    if (order.status === 'picked_up' && !order.actual_weight_kg) {
      setShowWeightInput(true);
      return;
    }

    setIsLoading(true);
    const result = await updateCleanerOrderStatus(order.id, action.next);
    if (!result.success) {
      alert(result.error || 'Kunne ikke oppdatere status');
    }
    setIsLoading(false);
  }

  async function handleSetWeight() {
    if (!weight || parseFloat(weight) <= 0) {
      alert('Vennligst oppgi en gyldig vekt');
      return;
    }

    setIsLoading(true);
    const result = await setOrderWeight(order.id, parseFloat(weight), notes || undefined);
    if (result.success) {
      setShowWeightInput(false);
      setWeight('');
      setNotes('');
    } else {
      alert(result.error || 'Kunne ikke lagre vekt');
    }
    setIsLoading(false);
  }

  async function handleDecline() {
    if (!confirm('Er du sikker på at du vil avslå dette oppdraget?')) return;

    setIsLoading(true);
    const result = await declineCleanerOrder(order.id);
    if (!result.success) {
      alert(result.error || 'Kunne ikke avslå oppdrag');
    }
    setIsLoading(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-dark-gray">#{order.order_number}</p>
            <p className="text-sm text-medium-gray">{order.customer.user.full_name}</p>
          </div>
          <Badge variant={getOrderStatusVariant(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
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

        {/* Expandable details */}
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm text-nordic-blue mb-3">
          {isExpanded ? 'Vis mindre' : 'Vis detaljer'}
        </button>

        {isExpanded && (
          <div className="border-t pt-3 mb-3 text-sm space-y-2">
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
            {order.actual_weight_kg && (
              <div>
                <p className="text-medium-gray">Vekt / Pris</p>
                <p className="font-medium">
                  {order.actual_weight_kg} kg - {oreToNok(order.total_cost_ore || 0)} kr
                </p>
                {order.pricing_notes && <p className="text-xs text-medium-gray mt-1">{order.pricing_notes}</p>}
              </div>
            )}
          </div>
        )}

        {/* Weight input form (shown after pickup, before putting in machine) */}
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
            <div className="flex gap-2">
              <Button onClick={handleSetWeight} disabled={isLoading || !weight} className="flex-1">
                {isLoading ? 'Lagrer...' : 'Lagre vekt'}
              </Button>
              <Button variant="outline" onClick={() => setShowWeightInput(false)}>
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {action && !showWeightInput && (
          <div className="flex gap-2">
            <Button onClick={handleStatusUpdate} disabled={isLoading} className="flex-1">
              {isLoading ? 'Oppdaterer...' : action.label}
            </Button>
            {order.status === 'pickup_scheduled' && (
              <Button variant="outline" onClick={handleDecline} disabled={isLoading}>
                Avslå
              </Button>
            )}
          </div>
        )}

        {/* Show weight prompt for picked_up orders without weight */}
        {needsWeight && !showWeightInput && (
          <Button onClick={() => setShowWeightInput(true)} className="w-full">
            Registrer vekt
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
