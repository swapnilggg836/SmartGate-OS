'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useNotifications, Notification } from '@/context/NotificationContext';
import AppLayout from '@/components/layout/AppLayout';
import {
  Bell, CheckCheck, Trash2, RefreshCw, CheckCircle2, AlertTriangle,
  QrCode, Calendar, ArrowRight, Shield, User, ExternalLink, Lock
} from 'lucide-react';
import { timeAgo, fmtDate } from '@/lib/utils';

type FilterTab = 'ALL' | 'UNREAD' | 'VISITORS' | 'REQUESTS' | 'SECURITY';

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, clearRead, refresh } = useNotifications();
  const [tab, setTab] = useState<FilterTab>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getNotificationCategory = (n: Notification): 'VISITORS' | 'REQUESTS' | 'SECURITY' | 'GENERAL' => {
    const t = (n.type || '').toUpperCase();
    const title = (n.title || '').toUpperCase();
    const msg = (n.message || '').toUpperCase();

    if (t.includes('VISITOR') || title.includes('VISITOR') || msg.includes('VISITOR') || t.includes('GATE') || title.includes('PASS')) {
      return 'VISITORS';
    }
    if (t.includes('LEAVE') || t.includes('EXIT') || t.includes('REQUEST') || t.includes('APPROVAL') || title.includes('LEAVE') || title.includes('EXIT') || title.includes('APPROVAL')) {
      return 'REQUESTS';
    }
    if (t.includes('PASSWORD') || t.includes('OTP') || t.includes('ALERT') || t.includes('AUTHORITY') || title.includes('PASSWORD') || title.includes('OTP') || title.includes('SECURITY')) {
      return 'SECURITY';
    }
    return 'GENERAL';
  };

  const filteredNotifications = notifications.filter(n => {
    if (tab === 'UNREAD') return !n.read;
    if (tab === 'VISITORS') return getNotificationCategory(n) === 'VISITORS';
    if (tab === 'REQUESTS') return getNotificationCategory(n) === 'REQUESTS';
    if (tab === 'SECURITY') return getNotificationCategory(n) === 'SECURITY';
    return true;
  });

  const visitorCount = notifications.filter(n => getNotificationCategory(n) === 'VISITORS').length;
  const requestCount = notifications.filter(n => getNotificationCategory(n) === 'REQUESTS').length;
  const securityCount = notifications.filter(n => getNotificationCategory(n) === 'SECURITY').length;

  const getIconAndStyle = (n: Notification) => {
    const t = (n.type || '').toUpperCase();
    const cat = getNotificationCategory(n);

    if (t.includes('ACTION_REQUIRED') || t.includes('URGENT') || t.includes('ALERT') || t.includes('LATE')) {
      return { icon: <AlertTriangle size={18} color="#dc2626" />, bg: '#fee2e2', border: '#fca5a5' };
    }
    if (t.includes('APPROVED') || t.includes('SUCCESS')) {
      return { icon: <CheckCircle2 size={18} color="#16a34a" />, bg: '#dcfce7', border: '#86efac' };
    }
    if (cat === 'VISITORS') {
      return { icon: <QrCode size={18} color="#2563eb" />, bg: '#dbeafe', border: '#93c5fd' };
    }
    if (cat === 'REQUESTS') {
      return { icon: <Calendar size={18} color="#7c3aed" />, bg: '#ede9fe', border: '#c4b5fd' };
    }
    if (cat === 'SECURITY') {
      return { icon: <Lock size={18} color="#d97706" />, bg: '#fef3c7', border: '#fcd34d' };
    }
    return { icon: <Bell size={18} color="#475569" />, bg: '#f1f5f9', border: '#cbd5e1' };
  };

  const getActionLink = (n: Notification): { label: string; href: string } | null => {
    const cat = getNotificationCategory(n);
    const title = (n.title || '').toUpperCase();
    const msg = (n.message || '').toUpperCase();

    if (cat === 'VISITORS') {
      return { label: 'Open Visitors Console', href: '/visitors' };
    }
    if (title.includes('GATE PASS') || msg.includes('GATE PASS') || (n.type || '').includes('GATE_PASS')) {
      return { label: 'View Gate Passes', href: '/gate-passes' };
    }
    if (cat === 'REQUESTS') {
      if (title.includes('APPROVAL') || msg.includes('REVIEW') || (n.type || '').includes('APPROVAL')) {
        return { label: 'Review Approvals', href: '/approvals' };
      }
      return { label: 'View My Requests', href: '/requests' };
    }
    if (cat === 'SECURITY' || title.includes('PASSWORD') || title.includes('OTP')) {
      return { label: 'Manage Profile & Security', href: '/profile' };
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell size={22} style={{ color: 'var(--blue-700)' }} /> Personal Notifications
              </h1>
              <p style={{ marginTop: 2 }}>
                Real-time activity, pass issuances, approvals, and security alerts for your account
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh notification stream"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={markAllRead}
                >
                  <CheckCheck size={14} /> Mark All Read
                </button>
              )}
              {notifications.some(n => n.read) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={clearRead}
                  title="Remove all read notifications from your history"
                >
                  <Trash2 size={13} /> Clear Read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid var(--blue-100)', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All (${notifications.length})` },
            { id: 'UNREAD', label: `Unread (${unreadCount})`, highlight: unreadCount > 0 },
            { id: 'VISITORS', label: `Visitors & Passes (${visitorCount})` },
            { id: 'REQUESTS', label: `Requests & Approvals (${requestCount})` },
            { id: 'SECURITY', label: `Security & System (${securityCount})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as FilterTab)}
              style={{
                padding: '9px 16px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                marginBottom: -2,
                borderBottom: tab === t.id ? '2px solid var(--blue-700)' : '2px solid transparent',
                color: tab === t.id ? 'var(--blue-700)' : 'var(--slate-500)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{t.label}</span>
              {t.highlight && (
                <span style={{
                  background: '#ef4444', color: 'white', fontSize: '0.65rem',
                  fontWeight: 800, padding: '1px 6px', borderRadius: 999
                }}>
                  new
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List Card */}
        <div className="card">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 20px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--blue-50)',
                color: 'var(--blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12
              }}>
                <Bell size={28} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 4px' }}>
                {tab === 'UNREAD' ? 'No Unread Notifications' : 'No Notifications in this Filter'}
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', maxWidth: 420, margin: '0 auto' }}>
                {tab === 'UNREAD'
                  ? "You're all caught up! When new gate passes, visitor requests, or approval updates arrive, you'll see them here instantly."
                  : 'No notification records match the selected category for your user account.'}
              </p>
            </div>
          ) : (
            <div>
              {filteredNotifications.map((n, i) => {
                const style = getIconAndStyle(n);
                const action = getActionLink(n);

                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: i < filteredNotifications.length - 1 ? '1px solid var(--slate-100)' : 'none',
                      background: n.read ? 'white' : 'rgba(239, 246, 255, 0.65)',
                      display: 'flex',
                      gap: 14,
                      alignItems: 'flex-start',
                      transition: 'background 150ms'
                    }}
                  >
                    {/* Left Icon Pill */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2
                      }}
                    >
                      {style.icon}
                    </div>

                    {/* Notification Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '0.9rem', color: n.read ? 'var(--slate-800)' : 'var(--blue-950)' }}>
                            {n.title}
                          </strong>
                          {!n.read && (
                            <span style={{
                              background: 'var(--blue-600)', color: 'white', fontSize: '0.62rem',
                              fontWeight: 800, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase'
                            }}>
                              New
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)', whiteSpace: 'nowrap' }}>
                          {timeAgo(n.createdAt)} · {fmtDate(n.createdAt)}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: '0 0 10px', lineHeight: 1.45 }}>
                        {n.message}
                      </p>

                      {/* Action Links & Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {action && (
                          <Link
                            href={action.href}
                            onClick={() => !n.read && markRead(n.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--blue-700)',
                              background: 'var(--blue-50)',
                              border: '1px solid var(--blue-200)',
                              padding: '3px 10px',
                              borderRadius: 6,
                              textDecoration: 'none'
                            }}
                          >
                            <span>{action.label}</span>
                            <ArrowRight size={12} />
                          </Link>
                        )}

                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--slate-500)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            Mark Read
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteNotification(n.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--slate-400)',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: 0,
                            marginLeft: 'auto'
                          }}
                          title="Delete notification"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

