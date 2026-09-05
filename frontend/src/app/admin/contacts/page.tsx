'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Mail, Phone, User, Clock, CheckCircle2, Trash2, RefreshCw, Eye, EyeOff, Search } from 'lucide-react';
import { fmtDate, fmtTime } from '@/lib/utils';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  repliedAt: string | null;
  createdAt: string;
}

function ContactCard({ sub, onMarkRead, onDelete }: {
  sub: ContactSubmission;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this contact submission?')) return;
    setDeleting(true);
    await onDelete(sub.id);
    setDeleting(false);
  };

  return (
    <div style={{
      background: sub.isRead ? 'white' : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      border: `1px solid ${sub.isRead ? '#e2e8f0' : '#bfdbfe'}`,
      borderRadius: 14, padding: '16px 20px', marginBottom: 12,
      boxShadow: sub.isRead ? '0 1px 3px rgba(0,0,0,0.04)' : '0 4px 12px rgba(29,78,216,0.1)',
      transition: 'all 0.2s',
    }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {!sub.isRead && (
              <span style={{
                background: '#1d4ed8', color: 'white', fontSize: '0.65rem',
                fontWeight: 700, padding: '2px 7px', borderRadius: 20, letterSpacing: '0.04em',
              }}>NEW</span>
            )}
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{sub.subject}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#475569' }}>
              <User size={13} color="#1d4ed8" />{sub.name}
            </span>
            <a href={`mailto:${sub.email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#1d4ed8', textDecoration: 'none' }}>
              <Mail size={13} />{sub.email}
            </a>
            {sub.phone && (
              <a href={`tel:${sub.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#7c3aed', textDecoration: 'none' }}>
                <Phone size={13} />{sub.phone}
              </a>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#94a3b8' }}>
              <Clock size={12} />{fmtDate(sub.createdAt)} {fmtTime(sub.createdAt)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {!sub.isRead && (
            <button
              onClick={() => onMarkRead(sub.id)}
              title="Mark as read"
              style={{
                background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 8,
                padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <CheckCircle2 size={13} /> Read
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse' : 'Expand'}
            style={{
              background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8,
              padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {expanded ? <EyeOff size={13} /> : <Eye size={13} />}
            {expanded ? 'Hide' : 'View'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete"
            style={{
              background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8,
              padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            {deleting ? <Spinner size="sm" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>

      {/* Message Body */}
      {expanded && (
        <div style={{
          marginTop: 14, padding: '14px 16px',
          background: 'white', borderRadius: 10, border: '1px solid #e2e8f0',
          fontSize: '0.875rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap',
        }}>
          {sub.message}
        </div>
      )}

      {/* Reply button */}
      {expanded && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <a
            href={`mailto:${sub.email}?subject=Re: ${encodeURIComponent(sub.subject)}&body=Hello ${encodeURIComponent(sub.name)},%0A%0A`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
              color: 'white', textDecoration: 'none', borderRadius: 8,
              padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(29,78,216,0.25)',
            }}
          >
            <Mail size={13} /> Reply via Email
          </a>
          {sub.phone && (
            <a
              href={`tel:${sub.phone}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#f5f3ff', color: '#7c3aed', textDecoration: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
                border: '1px solid #ddd6fe',
              }}
            >
              <Phone size={13} /> Call
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContactsAdminPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubmissions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await api.get(`/contacts?limit=100${unreadOnly ? '&unread=true' : ''}`);
      if (res.data?.success) {
        setSubmissions(res.data.data.submissions || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [unreadOnly]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/contacts/${id}/read`);
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, isRead: true } : s));
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/contacts/${id}`);
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch { /* silent */ }
  };

  if (!user || user.role !== 'SUPER_ADMIN') {
    return <AppLayout><div style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>Access Denied</div></AppLayout>;
  }

  const filtered = submissions.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = submissions.filter(s => !s.isRead).length;

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div style={{ padding: '24px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(29,78,216,0.3)', flexShrink: 0,
            }}>
              <MessageSquare size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b', marginBottom: 2 }}>
                Contact Submissions
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                {submissions.length} total · {unreadCount} unread
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: unreadOnly ? '#1d4ed8' : 'white',
                color: unreadOnly ? 'white' : '#475569',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              {unreadOnly ? '✓ Unread Only' : 'All Messages'}
            </button>
            <button
              onClick={() => fetchSubmissions(true)}
              disabled={refreshing}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', color: '#475569',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw size={14} />} Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, email or subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Received', value: submissions.length, color: '#1d4ed8' },
            { label: 'Unread', value: unreadCount, color: '#dc2626' },
            { label: 'Read', value: submissions.length - unreadCount, color: '#16a34a' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'white', border: `1px solid #e2e8f0`, borderRadius: 12,
              padding: '14px 18px', borderLeft: `3px solid ${stat.color}`,
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
            <MessageSquare size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>
              {search ? 'No matching submissions' : unreadOnly ? 'All messages have been read!' : 'No contact submissions yet'}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map(sub => (
              <ContactCard
                key={sub.id}
                sub={sub}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
