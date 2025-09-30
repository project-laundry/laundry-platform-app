import { Notification } from '@/components/ui/NotificationCenter';

// Independent notification triggers - not tied to customer journey states
export interface NotificationTriggers {
  showWelcomeMessage: boolean;
  showBagDelivered: boolean;
  showBagDeliveryInfo: boolean;
  showGettingStartedTip: boolean;
  showActiveOrderReminder: boolean;
  showMultipleOrdersTip: boolean;
}

// Notification dismissal state
export interface NotificationDismissals {
  [notificationId: string]: boolean;
}

// Pre-defined notification templates
export const NOTIFICATION_TEMPLATES = {
  welcome: {
    id: 'welcome_message',
    type: 'success' as const,
    title: 'Velkommen til NooraCare! 🎉',
    message: 'Kontoen din er opprettet og aktivert. Vi sender deg en NooraCare-pose i løpet av 3-5 virkedager. Du vil få beskjed når posen er levert og klar til bruk.',
    dismissible: true
  },
  bagDelivered: {
    id: 'bag_delivered',
    type: 'success' as const,
    title: 'NooraCare-posen din er levert! 📦',
    message: 'Din NooraCare-pose er nå levert og aktivert. Du kan begynne å bestille klesvask når det passer deg.',
    actionText: 'Bestill første klesvask',
    actionUrl: '/orders/bag-check',
    dismissible: true
  },
  bagDeliveryInfo: {
    id: 'bag_delivery_info',
    type: 'info' as const,
    title: 'Informasjon om poseleveranse',
    message: 'Posen sendes via post til adressen du oppga ved registrering. Du vil få en SMS når posen er sendt og en ny SMS når den er levert.',
    dismissible: true
  },
  gettingStartedTip: {
    id: 'getting_started_tip',
    type: 'info' as const,
    title: 'Tips for første bestilling',
    message: 'Legg klærne i NooraCare-posen og bestill klesvask. Vi anbefaler å bestille 2-3 dager i forveien for å sikre ønsket hentetidspunkt.',
    actionText: 'Se instruksjoner',
    actionUrl: '/orders/instructions',
    dismissible: true
  },
  activeOrderReminder: {
    id: 'active_order_reminder',
    type: 'info' as const,
    title: 'Din bestilling er i prosess',
    message: 'Renseren vil kontakte deg 30 minutter før henting og levering. Hold telefonen tilgjengelig.',
    dismissible: true
  },
  multipleOrdersTip: {
    id: 'multiple_orders_tip',
    type: 'warning' as const,
    title: 'Flere aktive bestillinger',
    message: 'Du har flere bestillinger i prosess. Sørg for at du har tilstrekkelig med NooraCare-poser for alle bestillingene.',
    actionText: 'Bestill flere poser',
    actionUrl: '/profile?section=bags',
    dismissible: true
  }
};

// Get active notifications based on triggers and dismissals
export function getActiveNotifications(
  triggers: NotificationTriggers,
  dismissals: NotificationDismissals = {}
): Notification[] {
  const notifications: Notification[] = [];

  // Check each trigger and add notification if active and not dismissed
  if (triggers.showWelcomeMessage && !dismissals[NOTIFICATION_TEMPLATES.welcome.id]) {
    notifications.push(NOTIFICATION_TEMPLATES.welcome);
  }

  if (triggers.showBagDelivered && !dismissals[NOTIFICATION_TEMPLATES.bagDelivered.id]) {
    notifications.push(NOTIFICATION_TEMPLATES.bagDelivered);
  }

  if (triggers.showBagDeliveryInfo && !dismissals[NOTIFICATION_TEMPLATES.bagDeliveryInfo.id]) {
    notifications.push(NOTIFICATION_TEMPLATES.bagDeliveryInfo);
  }

  if (triggers.showGettingStartedTip && !dismissals[NOTIFICATION_TEMPLATES.gettingStartedTip.id]) {
    notifications.push(NOTIFICATION_TEMPLATES.gettingStartedTip);
  }

  if (triggers.showActiveOrderReminder && !dismissals[NOTIFICATION_TEMPLATES.activeOrderReminder.id]) {
    notifications.push(NOTIFICATION_TEMPLATES.activeOrderReminder);
  }

  if (triggers.showMultipleOrdersTip && !dismissals[NOTIFICATION_TEMPLATES.multipleOrdersTip.id]) {
    notifications.push(NOTIFICATION_TEMPLATES.multipleOrdersTip);
  }

  return notifications;
}

// Helper to create default notification triggers
export function createNotificationTriggers(overrides: Partial<NotificationTriggers> = {}): NotificationTriggers {
  return {
    showWelcomeMessage: false,
    showBagDelivered: false,
    showBagDeliveryInfo: false,
    showGettingStartedTip: false,
    showActiveOrderReminder: false,
    showMultipleOrdersTip: false,
    ...overrides
  };
}