'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { getSocket, reconnectSocketWithToken } from '@/lib/socket';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
  metadata?: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetch = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const res = await api.get('/notifications');
      const data = res.data?.data;
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  }, [user]);

  // Initial fetch and polling fallback
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetch();
    const interval = setInterval(fetch, 20000);
    return () => clearInterval(interval);
  }, [user, fetch]);

  // Real-time WebSocket listener for immediate instant alerts
  useEffect(() => {
    if (!user) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      reconnectSocketWithToken(token);
    }

    const socket = getSocket();

    const handleIncomingNotif = (notif: any) => {
      if (!notif || !notif.id) return;
      setNotifications(prev => {
        const safe = Array.isArray(prev) ? prev : [];
        if (safe.some(n => n.id === notif.id)) return safe;
        return [notif, ...safe];
      });
    };

    socket.on('notification:new', handleIncomingNotif);
    socket.on('notification', handleIncomingNotif);

    return () => {
      socket.off('notification:new', handleIncomingNotif);
      socket.off('notification', handleIncomingNotif);
    };
  }, [user]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => Array.isArray(prev) ? prev.map(n => n.id === id ? { ...n, read: true } : n) : []);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => Array.isArray(prev) ? prev.map(n => ({ ...n, read: true })) : []);
    } catch {}
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => Array.isArray(prev) ? prev.filter(n => n.id !== id) : []);
    } catch {}
  };

  const clearRead = async () => {
    try {
      await api.delete('/notifications/clear-read');
      setNotifications(prev => Array.isArray(prev) ? prev.filter(n => !n.read) : []);
    } catch {}
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications: safeNotifications,
        unreadCount,
        markRead,
        markAllRead,
        deleteNotification,
        clearRead,
        refresh: fetch
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}

