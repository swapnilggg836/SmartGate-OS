'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { fmtDate, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import {
  UserPlus, Users, CheckCircle2, XCircle, AlertTriangle, Search,
  QrCode, MessageCircle, Printer, LogOut, Share2, Copy, Check, ExternalLink,
  Mail, Smartphone, Send
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DigitalPassModal } from '@/components/visitors/DigitalPassModal';

function HostSearch({ value, onChange }: { value: any; onChange: (h: any) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get(`/visitors/search-host?q=${encodeURIComponent(q)}`);
        setResults(r.data?.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  if (value) {
    const emp = value.employee;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '2px solid var(--blue-500)', borderRadius: 8, background: 'var(--blue-50)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
          {emp ? `${emp.firstName[0]}` : value.email[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{emp ? `${emp.firstName} ${emp.lastName}` : value.email}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{emp?.designation}{emp?.department?.name ? ` · ${emp.department.name}` : ''}</div>
        </div>
        <button onClick={() => onChange(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}><XCircle size={16} /></button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
        <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search by name or employee code..." value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {(results.length > 0 || loading) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--slate-200)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, marginTop: 4 }}>
          {loading && <div style={{ padding: '10px 14px', color: 'var(--slate-500)', fontSize: '0.8rem' }}>Searching...</div>}
          {results.map((u: any) => {
            const emp = u.employee;
            return (
              <button key={u.id} onClick={() => { onChange(u); setQ(''); setResults([]); }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {emp ? `${emp.firstName[0]}` : u.email[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{emp ? `${emp.firstName} ${emp.lastName}` : u.email}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{emp?.designation}{emp?.department?.name ? ` · ${emp.department.name}` : ''}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InviteModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [host, setHost] = useState<any>(null);
  const [form, setForm] = useState({ fullName: '', gender: 'MALE', mobile: '', email: '', organization: '', idType: '', purpose: '', description: '', visitDate: new Date().toISOString().split('T')[0], expectedEntryTime: '10:00', expectedExitTime: '11:00', numberOfVisitors: 1, vehicleNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [inviteResult, setInviteResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (open && user) {
      setHost({ id: user.id, email: user.email, employee: user.employee, role: user.role });
      setInviteResult(null);
      setError('');
    }
  }, [open, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    if (!host) { setError('Please select the person to visit.'); setSubmitting(false); return; }
    try {
      const res = await api.post('/visitors/invite', {
        ...form,
        hostUserId: host.id,
        numberOfVisitors: Number(form.numberOfVisitors)
      });
      const data = res.data?.data || res.data;
      if (data) {
        setInviteResult({
          ...(res.data || {}),
          ...(data || {})
        });
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to invite visitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inviteResult) {
    const pass = inviteResult.pass || inviteResult.visit?.pass;
    const passUrl = inviteResult.passUrl || (pass ? `/visitor-pass/${pass.qrToken}` : `/visitor-register`);
    const fullPassUrl = passUrl?.startsWith('http') ? passUrl : `${typeof window !== 'undefined' ? window.location.origin : ''}${passUrl}`;
    const whatsappUrl = inviteResult.whatsappUrl;
    const smsUrl = inviteResult.smsUrl;
    const smsText = inviteResult.smsText;
    const recipientEmail = inviteResult.recipientEmail || form.email;
    const recipientMobile = inviteResult.recipientMobile || form.mobile;

    return (
      <Modal open={open} onClose={() => { onSuccess(); onClose(); }} title="🎉 Visitor Pass & Invitation Created!">
        <div style={{ padding: '6px 0' }}>
          {/* Header Card */}
          <div style={{
            textAlign: 'center',
            background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: 14,
            padding: '18px 16px',
            marginBottom: 16
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%', background: '#dcfce7', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'
            }}>
              <CheckCircle2 size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
              Digital Pass Issued for {form.fullName}
            </h3>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
              <span>🎫 Pass Number:</span> {pass?.passNumber || inviteResult.visit?.visitId || 'VP-ACTIVE'}
            </div>
          </div>

          {/* Automated Channel Dispatch Status */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Multi-Channel Dispatch Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Email / Gmail Channel */}
              <div style={{
                background: recipientEmail ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${recipientEmail ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: 10,
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.82rem', color: recipientEmail ? '#15803d' : '#64748b', marginBottom: 4 }}>
                  <Mail size={15} /> Gmail / Email
                </div>
                <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                  {recipientEmail ? (
                    <>
                      <div style={{ color: '#16a34a', fontWeight: 700 }}>✓ Pass Emailed</div>
                      <div style={{ color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {recipientEmail}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No email provided</span>
                  )}
                </div>
              </div>

              {/* SMS Gateway Channel */}
              <div style={{
                background: recipientMobile ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${recipientMobile ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: 10,
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.82rem', color: recipientMobile ? '#15803d' : '#64748b', marginBottom: 4 }}>
                  <Smartphone size={15} /> SMS Dispatch
                </div>
                <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                  {recipientMobile ? (
                    <>
                      <div style={{ color: '#16a34a', fontWeight: 700 }}>✓ SMS Dispatched</div>
                      <div style={{ color: '#64748b' }}>{recipientMobile}</div>
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No phone provided</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Share Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  background: '#25D366',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  padding: '11px 16px',
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)'
                }}
              >
                <MessageCircle size={18} /> Share Pass on WhatsApp
              </a>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: smsUrl ? '1fr 1fr' : '1fr', gap: 10 }}>
              {smsUrl && (
                <a
                  href={smsUrl}
                  className="btn btn-outline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <Send size={14} /> Open SMS App
                </a>
              )}
              {smsText && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleCopy(smsText)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  {copied ? 'SMS Text Copied!' : 'Copy SMS Text'}
                </button>
              )}
            </div>
          </div>

          {/* Pass Web Link Box */}
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
              Visitor Pass Web Link (QR & Badge):
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                readOnly
                value={fullPassUrl}
                className="form-control"
                style={{ fontSize: '0.8rem', background: 'white' }}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleCopy(fullPassUrl)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
              >
                {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link
              href={fullPassUrl}
              target="_blank"
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
            >
              <ExternalLink size={15} /> Preview Pass
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { onSuccess(); onClose(); }}
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite a Visitor"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="invite-form" type="submit" disabled={submitting}>
          {submitting && <Spinner white size="sm" />} Send Invitation
        </button>
      </>}
    >
      <form id="invite-form" onSubmit={submit} className="space-y-3">
        {error && <div className="alert alert-error"><AlertTriangle size={14} /><span>{error}</span></div>}
        <div style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '12px 14px' }}>
          <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 8, color: 'var(--slate-700)' }}>Person to Visit</p>
          <HostSearch value={host} onChange={setHost} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label className="form-label">Full Name <span className="required">*</span></label><input className="form-control" value={form.fullName} onChange={set('fullName')} required placeholder="Visitor name" /></div>
          <div className="form-group"><label className="form-label">Mobile <span className="required">*</span></label><input className="form-control" value={form.mobile} onChange={set('mobile')} required placeholder="+91 XXXXXXXXXX" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label className="form-label">Gender</label>
            <select className="form-control" value={form.gender} onChange={set('gender')}>
              <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select></div>
          <div className="form-group"><label className="form-label">Email (optional)</label><input type="email" className="form-control" value={form.email} onChange={set('email')} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label className="form-label">Organization</label><input className="form-control" value={form.organization} onChange={set('organization')} /></div>
          <div className="form-group"><label className="form-label">ID Type</label>
            <select className="form-control" value={form.idType} onChange={set('idType')}>
              <option value="">Select...</option><option value="AADHAR">Aadhar</option><option value="PAN">PAN</option><option value="PASSPORT">Passport</option><option value="DRIVING_LICENSE">Driving License</option><option value="OTHER">Other</option>
            </select></div>
        </div>
        <div className="form-group"><label className="form-label">Purpose <span className="required">*</span></label><input className="form-control" value={form.purpose} onChange={set('purpose')} required /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="form-group"><label className="form-label">Visit Date <span className="required">*</span></label><input type="date" className="form-control" value={form.visitDate} onChange={set('visitDate')} required min={new Date().toISOString().split('T')[0]} /></div>
          <div className="form-group"><label className="form-label">Entry Time <span className="required">*</span></label><input type="time" className="form-control" value={form.expectedEntryTime} onChange={set('expectedEntryTime')} required /></div>
          <div className="form-group"><label className="form-label">Exit Time <span className="required">*</span></label><input type="time" className="form-control" value={form.expectedExitTime} onChange={set('expectedExitTime')} required /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label className="form-label">No. of Visitors</label><input type="number" className="form-control" min={1} max={50} value={form.numberOfVisitors} onChange={set('numberOfVisitors')} /></div>
          <div className="form-group"><label className="form-label">Vehicle Number</label><input className="form-control" value={form.vehicleNumber} onChange={set('vehicleNumber')} placeholder="Optional" /></div>
        </div>
        <div className="form-group"><label className="form-label">Notes (optional)</label><textarea className="form-control" rows={2} value={form.description} onChange={set('description')} /></div>
      </form>
    </Modal>
  );
}

export default function VisitorsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'my' | 'incoming'>('my');
  const [myVisits, setMyVisits] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showQrPoster, setShowQrPoster] = useState(false);
  const [selectedPassVisit, setSelectedPassVisit] = useState<any | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/visitors/my-visits'), api.get('/visitors/incoming')])
      .then(([my, inc]) => { setMyVisits(my.data?.data || []); setIncoming(inc.data?.data || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (visitId: string, action: string) => {
    try { await api.patch(`/visitors/${visitId}/respond`, { action }); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleHostCheckout = async (visitId: string) => {
    if (!confirm('Mark meeting as completed and authorize this visitor for exit checkout at Security?')) return;
    try {
      await api.patch(`/visitors/${visitId}/host-checkout`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to authorize exit');
    }
  };

  const pendingCount = incoming.filter(v => ['PENDING_HOST', 'WAITING'].includes(v.status)).length;
  const activeList = tab === 'my' ? myVisits : incoming;

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  const downloadVisitorsCsv = () => {
    if (activeList.length === 0) return;
    const headers = ['Visit ID', 'Visitor Name', 'Mobile', 'Organization', 'Host', 'Purpose', 'Date', 'Expected Time', 'Status', 'Pass Number'];
    const rows = activeList.map(v => [
      v.visitId,
      `"${v.visitor?.fullName || ''}"`,
      `="${v.visitor?.mobile || ''}"`,
      `"${v.visitor?.organization || ''}"`,
      `"${v.hostUser?.employee ? `${v.hostUser.employee.firstName} ${v.hostUser.employee.lastName}` : (v.hostUser?.email || '')}"`,
      `"${(v.purpose || '').replace(/"/g, '""')}"`,
      fmtDate(v.visitDate),
      `"${v.expectedEntryTime || ''} - ${v.expectedExitTime || ''}"`,
      v.status,
      v.visitorPass?.passNumber || ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitors-${tab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1>Visitors</h1>
              <p style={{ marginTop: 2 }}>Manage visitor invitations, approvals, and exit authorizations</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={downloadVisitorsCsv} disabled={activeList.length === 0}>
                <Printer size={14} /> Export CSV
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowQrPoster(true)}>
                <QrCode size={14} /> Gate QR Poster
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
                <UserPlus size={14} /> Invite Visitor
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid var(--blue-100)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTab('my')}
            style={{
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '0.8125rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              marginBottom: -2,
              borderBottom: tab === 'my' ? '2px solid var(--blue-700)' : '2px solid transparent',
              color: tab === 'my' ? 'var(--blue-700)' : 'var(--slate-500)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <UserPlus size={15} />
            <span>My Invitations ({myVisits.length})</span>
          </button>

          <button
            onClick={() => setTab('incoming')}
            style={{
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '0.8125rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              marginBottom: -2,
              borderBottom: tab === 'incoming' ? '2px solid var(--blue-700)' : '2px solid transparent',
              color: tab === 'incoming' ? 'var(--blue-700)' : 'var(--slate-500)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Users size={15} />
            <span>Incoming ({incoming.length})</span>
            {pendingCount > 0 && (
              <span style={{
                background: '#ef4444', color: 'white', fontSize: '0.65rem',
                fontWeight: 700, padding: '1px 6px', borderRadius: 999
              }}>
                {pendingCount} new
              </span>
            )}
          </button>
        </div>

        <div className="card">
          <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, color: '#3b82f6' }}>💡 Pro-Tip:</span> Double-click any visitor row to open their 2-sided digital pass badge (with download & print).
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>
              {tab === 'my' ? 'Showing pre-registered invitations you created' : 'Showing gate walk-in arrivals & visitors requesting to meet you'}
            </div>
          </div>
          {activeList.length === 0 ? (
            <div className="empty-state">
              {tab === 'my' ? <UserPlus size={36} /> : <Users size={36} />}
              <h4>{tab === 'my' ? 'No Invitations Sent Yet' : 'No Incoming Gate Requests'}</h4>
              <p>
                {tab === 'my'
                  ? 'You have not scheduled any visitor invitations. Click "Invite Visitor" to create a pass and share it with your guest.'
                  : 'No walk-in visitors or gate requests are currently waiting to meet you.'}
              </p>
              {tab === 'my' && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
                  <UserPlus size={14} /> Invite Visitor
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Visit ID</th>
                    <th>Visitor</th>
                    <th>Host</th>
                    <th>Purpose</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.map((v: any) => {
                    const hEmp = v.hostUser?.employee;
                    const hostName = hEmp ? `${hEmp.firstName} ${hEmp.lastName}` : v.hostUser?.email;
                    const pass = v.visitorPass;
                    return (
                      <tr
                        key={v.id}
                        onDoubleClick={() => setSelectedPassVisit(v)}
                        style={{ cursor: 'pointer' }}
                        title="Double click to open Digital Pass Modal"
                      >
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{v.visitId}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{v.visitor?.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{v.visitor?.mobile}</div>
                          {v.visitor?.organization && <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{v.visitor.organization}</div>}
                        </td>
                        <td>
                          {hostName}<br />
                          <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{v.department?.name || hEmp?.department?.name}</span>
                        </td>
                        <td>{v.purpose}</td>
                        <td>{fmtDate(v.visitDate)}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{v.expectedEntryTime} – {v.expectedExitTime}</td>
                        <td>
                          <span className={`badge ${statusBadgeClass(v.status)}`}>{statusLabel(v.status)}</span>
                          {v.visitType === 'WALK_IN' && <span className="badge badge-slate" style={{ marginLeft: 4, fontSize: '0.65rem' }}>Walk-in</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {['PENDING_HOST', 'WAITING'].includes(v.status) && (
                              <>
                                <button className="btn btn-sm" style={{ background: 'var(--green-600)', color: 'white', padding: '3px 8px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); respond(v.visitId, 'APPROVE'); }}>
                                  <CheckCircle2 size={11} /> Approve
                                </button>
                                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red-600)', padding: '3px 8px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); respond(v.visitId, 'REJECT'); }}>
                                  <XCircle size={11} /> Reject
                                </button>
                              </>
                            )}

                            {/* Meeting In Progress -> Host can clear for exit */}
                            {v.status === 'CHECKED_IN' && (
                              <button
                                className="btn btn-sm"
                                style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={(e) => { e.stopPropagation(); handleHostCheckout(v.visitId || v.id); }}
                                title="End meeting and authorize visitor to exit through security gate"
                              >
                                <LogOut size={11} /> End Meeting & Clear Exit
                              </button>
                            )}

                            {/* Open 2-Sided Pass Modal */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedPassVisit(v); }}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Open Pass Badge"
                            >
                              <QrCode size={11} /> Pass
                            </button>

                            {/* Direct WhatsApp Share */}
                            {pass && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const passUrl = `${window.location.origin}/visitor-pass/${pass.qrToken}`;
                                  const msg = encodeURIComponent(`Hello ${v.visitor?.fullName}!\nHere is your Visitor Entry Pass for SmartGate Campus:\nPass Number: ${pass.passNumber}\nHost: ${hostName}\nView Pass & QR Code:\n${passUrl}\nPlease show this at Security.`);
                                  const cleanPhone = (v.visitor?.mobile || '').replace(/[^0-9]/g, '');
                                  window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`, '_blank');
                                }}
                                title="Share pass link on WhatsApp"
                                className="btn btn-sm"
                                style={{ background: '#25D366', color: 'white', border: 'none', padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <MessageCircle size={11} /> WhatsApp
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} onSuccess={() => { setShowInvite(false); load(); }} />
      <GateQrPosterModal open={showQrPoster} onClose={() => setShowQrPoster(false)} />
      <DigitalPassModal visit={selectedPassVisit} open={!!selectedPassVisit} onClose={() => setSelectedPassVisit(null)} />
    </AppLayout>
  );
}

function GateQrPosterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [registerUrl, setRegisterUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRegisterUrl(`${window.location.origin}/visitor-register`);
    }
  }, []);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Company Gate Check-in QR Poster"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨️ Print Gate Poster
        </button>
      </>}
    >
      <div style={{ textAlign: 'center', padding: '16px 8px' }}>
        <div style={{
          border: '3px dashed #3b82f6',
          borderRadius: 16,
          padding: 24,
          background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.08)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1d4ed8', marginBottom: 6 }}>
            SmartGate OS · Enterprise Security
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
            VISITOR SELF CHECK-IN
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 20px' }}>
            Scan with your mobile camera to request entry & receive your digital pass
          </p>

          <div style={{
            background: 'white',
            padding: 16,
            borderRadius: 16,
            display: 'inline-block',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            marginBottom: 20
          }}>
            <QRCodeSVG
              value={registerUrl || 'http://localhost:3000/visitor-register'}
              size={200}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>

          <div style={{ textAlign: 'left', background: 'white', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155' }}>
            <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 6 }}>Instructions for Visitors:</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span>1.</span><span>Open camera app and scan this QR code.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span>2.</span><span>Fill in your name, WhatsApp number, and select who you came to meet.</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>3.</span><span>Your host will approve and your QR entry pass will appear on your phone & WhatsApp!</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
