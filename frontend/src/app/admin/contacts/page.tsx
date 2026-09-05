'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import {
  MessageSquare, Mail, Phone, User, Clock, CheckCircle2, Trash2,
  RefreshCw, Eye, EyeOff, Search, Key, ShieldCheck, Copy, Check,
  AlertCircle, ArrowUpRight, ExternalLink
} from 'lucide-react';
import { fmtDate, fmtTime } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

interface MatchedUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    designation: string;
    department: string;
  } | null;
}

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
  matchedUser?: MatchedUser | null;
}

function ContactCard({ sub, onMarkRead, onDelete, onResetPassword }: {
  sub: ContactSubmission;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onResetPassword?: (user: MatchedUser) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPasswordRelated =
    sub.subject.toLowerCase().includes('password') ||
    sub.subject.toLowerCase().includes('pass') ||
    sub.message.toLowerCase().includes('password') ||
    sub.message.toLowerCase().includes('reset') ||
    sub.message.toLowerCase().includes('login');

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
      borderRadius: 14, padding: '16px 20px', marginBottom: 14,
      boxShadow: sub.isRead ? '0 1px 3px rgba(0,0,0,0.04)' : '0 4px 14px rgba(29,78,216,0.12)',
      transition: 'all 0.2s',
    }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {!sub.isRead && (
              <span style={{
                background: '#1d4ed8', color: 'white', fontSize: '0.65rem',
                fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em',
              }}>NEW</span>
            )}
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{sub.subject}</span>

            {isPasswordRelated && (
              <span style={{
                background: '#fef3c7', color: '#92400e', fontSize: '0.7rem',
                fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a',
                display: 'inline-flex', alignItems: 'center', gap: 4
              }}>
                🔑 Password Request
              </span>
            )}

            {sub.matchedUser && (
              <span style={{
                background: '#ecfdf5', color: '#065f46', fontSize: '0.7rem',
                fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: '1px solid #a7f3d0',
                display: 'inline-flex', alignItems: 'center', gap: 4
              }}>
                <CheckCircle2 size={11} color="#059669" /> Registered User ({sub.matchedUser.role})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>
              <User size={13} color="#1d4ed8" />{sub.name}
            </span>
            <a href={`mailto:${sub.email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 500 }}>
              <Mail size={13} />{sub.email}
            </a>
            {sub.phone && (
              <a href={`tel:${sub.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#7c3aed', textDecoration: 'none', fontWeight: 500 }}>
                <Phone size={13} />{sub.phone}
              </a>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#94a3b8' }}>
              <Clock size={12} />{fmtDate(sub.createdAt)} {fmtTime(sub.createdAt)}
            </span>
          </div>

          {/* Registered User Banner */}
          {sub.matchedUser && (
            <div style={{
              marginTop: 10, padding: '8px 12px', background: '#f0fdf4',
              borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
            }}>
              <div style={{ fontSize: '0.78rem', color: '#166534' }}>
                <strong>Account Found:</strong> {sub.matchedUser.employee ? `${sub.matchedUser.employee.firstName} ${sub.matchedUser.employee.lastName} (${sub.matchedUser.employee.employeeCode})` : sub.matchedUser.email}
                {' · '}{sub.matchedUser.employee?.department || 'No dept'} · Status: <strong>{sub.matchedUser.isActive ? 'Active' : 'Inactive'}</strong>
              </div>
              {onResetPassword && (
                <button
                  type="button"
                  onClick={() => onResetPassword(sub.matchedUser!)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#15803d', color: 'white', border: 'none',
                    borderRadius: 6, padding: '5px 10px', fontSize: '0.75rem',
                    fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 5px rgba(21,128,61,0.2)'
                  }}
                >
                  <Key size={12} /> Reset Password
                </button>
              )}
            </div>
          )}

          {!sub.matchedUser && isPasswordRelated && (
            <div style={{
              marginTop: 8, padding: '6px 10px', background: '#fffbeb',
              borderRadius: 6, border: '1px solid #fef3c7', fontSize: '0.75rem', color: '#92400e'
            }}>
              ℹ️ Email <strong>{sub.email}</strong> was not found in system accounts. If the user used a different personal email, search for them in <a href="/admin/users" style={{ color: '#b45309', textDecoration: 'underline', fontWeight: 600 }}>User Management</a>.
            </div>
          )}
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

      {/* Action buttons */}
      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              <Phone size={13} /> Call: {sub.phone}
            </a>
          )}
          {sub.matchedUser && onResetPassword && (
            <button
              onClick={() => onResetPassword(sub.matchedUser!)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                borderRadius: 8, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Key size={13} /> Reset Account Password
            </button>
          )}
          <a
            href="/admin/users"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0',
              borderRadius: 8, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={13} /> Go to Users
          </a>
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

  // Reset password modal state
  const [resetModal, setResetModal] = useState<{
    open: boolean;
    user: MatchedUser | null;
    newPassword: string;
    submitting: boolean;
    error: string;
    successResult: { password: string; email: string } | null;
    copied: boolean;
  }>({
    open: false,
    user: null,
    newPassword: '',
    submitting: false,
    error: '',
    successResult: null,
    copied: false,
  });

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

  const handleOpenReset = (targetUser: MatchedUser) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const pwd = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setResetModal({
      open: true,
      user: targetUser,
      newPassword: pwd,
      submitting: false,
      error: '',
      successResult: null,
      copied: false,
    });
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const pwd = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setResetModal(prev => ({ ...prev, newPassword: pwd, error: '' }));
  };

  const handleExecuteReset = async () => {
    if (!resetModal.user) return;
    setResetModal(prev => ({ ...prev, submitting: true, error: '' }));
    try {
      const res = await api.post(`/users/${resetModal.user.id}/reset-password`, {
        newPassword: resetModal.newPassword || undefined
      });
      const finalPwd = res.data?.data?.newPassword || resetModal.newPassword;
      setResetModal(prev => ({
        ...prev,
        submitting: false,
        successResult: {
          password: finalPwd,
          email: resetModal.user!.email
        }
      }));
    } catch (err: any) {
      setResetModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to reset password.'
      }));
    }
  };

  const copyPassword = () => {
    if (resetModal.successResult?.password) {
      navigator.clipboard.writeText(resetModal.successResult.password);
      setResetModal(prev => ({ ...prev, copied: true }));
      setTimeout(() => setResetModal(prev => ({ ...prev, copied: false })), 2500);
    }
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
                {submissions.length} total · {unreadCount} unread · Manage customer & employee inquiries
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
                onResetPassword={handleOpenReset}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          QUICK RESET PASSWORD MODAL
          ============================================================ */}
      <Modal
        open={resetModal.open}
        onClose={() => setResetModal(prev => ({ ...prev, open: false, successResult: null, error: '' }))}
        title="🔑 Reset User Password"
        footer={resetModal.successResult ? (
          <button
            className="btn btn-primary"
            onClick={() => setResetModal(prev => ({ ...prev, open: false, successResult: null, error: '' }))}
          >
            Done
          </button>
        ) : (
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setResetModal(prev => ({ ...prev, open: false, error: '' }))}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleExecuteReset}
              disabled={resetModal.submitting}
            >
              {resetModal.submitting ? <><Spinner size="sm" /> Resetting...</> : <><Key size={14} /> Confirm Reset Password</>}
            </button>
          </>
        )}
      >
        {resetModal.user && (
          <div className="space-y-3">
            {resetModal.successResult ? (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', background: '#f0fdf4',
                  color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12
                }}>
                  <ShieldCheck size={28} />
                </div>
                <h3 style={{ fontSize: '1.15rem', color: '#1e293b', marginBottom: 4, fontWeight: 700 }}>
                  Password Reset Successfully!
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
                  The password for <strong>{resetModal.successResult.email}</strong> has been updated in the database.
                </p>

                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 12
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>NEW PASSWORD</div>
                    <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.05em' }}>
                      {resetModal.successResult.password}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${resetModal.copied ? 'btn-success' : 'btn-outline'}`}
                    onClick={copyPassword}
                    style={{ gap: 6 }}
                  >
                    {resetModal.copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <a
                    href={`mailto:${resetModal.successResult.email}?subject=Your SmartGate OS Password Has Been Reset&body=Hello,%0A%0AYour password has been reset by the System Administrator.%0A%0AYour new temporary password is: ${resetModal.successResult.password}%0A%0APlease log in and change your password immediately.%0A%0ARegards,%0ASmartGate OS Administrator`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#1d4ed8', color: 'white', textDecoration: 'none',
                      borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700
                    }}
                  >
                    <Mail size={13} /> Email New Password to User
                  </a>
                </div>
              </div>
            ) : (
              <>
                {resetModal.error && (
                  <div className="alert alert-error">
                    <AlertCircle size={14} />
                    <span>{resetModal.error}</span>
                  </div>
                )}

                <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e3a8a' }}>
                    {resetModal.user.employee ? `${resetModal.user.employee.firstName} ${resetModal.user.employee.lastName} (${resetModal.user.employee.employeeCode})` : resetModal.user.email}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 2 }}>
                    Email: {resetModal.user.email} · Role: {resetModal.user.role} · {resetModal.user.employee?.department || 'No dept'}
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      New Password
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={generateRandomPassword}
                      style={{ fontSize: '0.72rem', color: '#1d4ed8', padding: '2px 6px' }}
                    >
                      🎲 Generate Random
                    </button>
                  </div>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Enter min 6 chars or use generated"
                    value={resetModal.newPassword}
                    onChange={e => setResetModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                  <span className="form-hint" style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Setting a new password will update the user's account in the database and invalidate any active sessions.
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

