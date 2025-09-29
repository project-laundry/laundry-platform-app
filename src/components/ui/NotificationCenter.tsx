'use client';

import { useState } from 'react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  dismissible?: boolean;
  autoHide?: number; // milliseconds
}

interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss?: (id: string) => void;
}

const notificationStyles = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'ℹ️',
    titleColor: 'text-blue-900',
    textColor: 'text-blue-800',
    buttonBg: 'bg-blue-100',
    buttonText: 'text-blue-800',
    buttonHover: 'hover:bg-blue-200'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✅',
    titleColor: 'text-green-900',
    textColor: 'text-green-800',
    buttonBg: 'bg-green-100',
    buttonText: 'text-green-800',
    buttonHover: 'hover:bg-green-200'
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: '⚠️',
    titleColor: 'text-orange-900',
    textColor: 'text-orange-800',
    buttonBg: 'bg-orange-100',
    buttonText: 'text-orange-800',
    buttonHover: 'hover:bg-orange-200'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '❌',
    titleColor: 'text-red-900',
    textColor: 'text-red-800',
    buttonBg: 'bg-red-100',
    buttonText: 'text-red-800',
    buttonHover: 'hover:bg-red-200'
  }
};

export function NotificationCenter({ notifications, onDismiss }: NotificationCenterProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
    onDismiss?.(id);
  };

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {visibleNotifications.map((notification) => {
        const style = notificationStyles[notification.type];

        return (
          <div
            key={notification.id}
            className={`${style.bg} ${style.border} border rounded-lg p-4 shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="text-xl">
                  {style.icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${style.titleColor} mb-1`}>
                    {notification.title}
                  </h3>
                  <p className={`${style.textColor} text-sm`}>
                    {notification.message}
                  </p>
                  {notification.actionText && notification.actionUrl && (
                    <div className="mt-3">
                      <a
                        href={notification.actionUrl}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${style.buttonBg} ${style.buttonText} ${style.buttonHover} transition-colors`}
                      >
                        {notification.actionText}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {notification.dismissible !== false && (
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className={`${style.textColor} hover:opacity-75 transition-opacity ml-2 text-lg font-bold`}
                  aria-label="Lukk varsling"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}