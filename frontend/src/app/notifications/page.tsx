'use client';

import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { Bell, CheckCheck } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const typeIcon: Record<string, string> = {
    INFO: 'ℹ️', SUCCESS: '✅', WARNING: '⚠️', ERROR: '❌', APPROVAL: '👍', REJECTION: '❌', GATE_PASS: '🎫', LATE_RETURN: '⏰'
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Bell size={22} style={{ color: 'var(--blue-700)' }} /> Notifications</h1>
              <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All notifications read'}</p>
            </div>
            {unreadCount > 0 && (
              <button className="btn btn-outline btn-sm" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark All Read
              </button>
            )}
          </div>
        </div>

        <div className="card">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} />
              <h4>No Notifications</h4>
              <p>You're all caught up! Notifications will appear here when there's activity on your account.</p>
            </div>
          ) : (
            <div>
              {notifications.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  style={{
                    padding: '14px 20px', borderBottom: i < notifications.length - 1 ? '1px solid var(--slate-100)' : 'none',
                    cursor: n.read ? 'default' : 'pointer', background: n.read ? 'white' : 'var(--blue-50)',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    transition: 'background 200ms'
                  }}
                >
                  <div style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: 2 }}>{typeIcon[n.type] || '🔔'}</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--slate-800)' }}>{n.title}</strong>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--slate-400)', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', margin: 0 }}>{n.message}</p>
                  </div>
                  {!n.read && (
                    <div style={{ width: 8, height: 8, background: 'var(--blue-700)', borderRadius: '50%', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
