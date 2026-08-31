'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { fmtDate, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { UserPlus, Users, CheckCircle2, XCircle, AlertTriangle, Search } from 'lucide-react';

function HostSearch({ value, onChange }: { value: any; onChange: (h: any) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { const r = await api.get(`/visitors/search-host?q=${encodeURIComponent(q)}`); setResults(r.data?.data || []); }
      catch { setResults([]); }
      finally { setLoading(false); }
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
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => { if (open && user) setHost({ id: user.id, email: user.email, employee: user.employee, role: user.role }); }, [open, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    if (!host) { setError('Please select the person to visit.'); setSubmitting(false); return; }
    try { await api.post('/visitors/invite', { ...form, hostUserId: host.id, numberOfVisitors: Number(form.numberOfVisitors) }); onSuccess(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to invite visitor'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite a Visitor"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="invite-form" type="submit" disabled={submitting}>{submitting && <Spinner white size="sm" />} Send Invitation</button></>}>
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

  const pendingCount = incoming.filter(v => ['PENDING_HOST', 'WAITING'].includes(v.status)).length;
  const activeList = tab === 'my' ? myVisits : incoming;

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div><h1>Visitors</h1><p style={{ marginTop: 2 }}>Manage visitor invitations and requests</p></div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}><UserPlus size={14} /> Invite Visitor</button>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid var(--blue-100)' }}>
          {(['my', 'incoming'] as const).map((t) => {
            const label = t === 'my' ? `My Invitations (${myVisits.length})` : `Incoming (${incoming.length})`;
            return (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.8125rem', border: 'none', background: 'none', cursor: 'pointer', marginBottom: -2, borderBottom: tab === t ? '2px solid var(--blue-700)' : '2px solid transparent', color: tab === t ? 'var(--blue-700)' : 'var(--slate-500)' }}>{label}</button>
            );
          })}
        </div>

        <div className="card">
          {activeList.length === 0 ? (
            <div className="empty-state"><Users size={36} /><h4>{tab === 'my' ? 'No Invitations Yet' : 'No Incoming Requests'}</h4>
              <p>{tab === 'my' ? 'Invite your first visitor.' : 'No one is trying to visit you right now.'}</p>
              {tab === 'my' && <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}><UserPlus size={14} /> Invite Visitor</button>}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Visit ID</th><th>Visitor</th><th>Host</th><th>Purpose</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {activeList.map((v: any) => {
                    const hEmp = v.hostUser?.employee;
                    const hostName = hEmp ? `${hEmp.firstName} ${hEmp.lastName}` : v.hostUser?.email;
                    return (
                      <tr key={v.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{v.visitId}</td>
                        <td><div style={{ fontWeight: 600 }}>{v.visitor?.fullName}</div><div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{v.visitor?.mobile}</div>{v.visitor?.organization && <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{v.visitor.organization}</div>}</td>
                        <td>{hostName}<br /><span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{v.department?.name || hEmp?.department?.name}</span></td>
                        <td>{v.purpose}</td>
                        <td>{fmtDate(v.visitDate)}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{v.expectedEntryTime} – {v.expectedExitTime}</td>
                        <td><span className={`badge ${statusBadgeClass(v.status)}`}>{statusLabel(v.status)}</span>{v.visitType === 'WALK_IN' && <span className="badge badge-slate" style={{ marginLeft: 4, fontSize: '0.65rem' }}>Walk-in</span>}</td>
                        <td>
                          {['PENDING_HOST', 'WAITING'].includes(v.status) && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-sm" style={{ background: 'var(--green-600)', color: 'white', padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => respond(v.visitId, 'APPROVE')}><CheckCircle2 size={11} /> Approve</button>
                              <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red-600)', padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => respond(v.visitId, 'REJECT')}><XCircle size={11} /> Reject</button>
                            </div>
                          )}
                          {v.status === 'APPROVED' && v.visitorPass && <span style={{ fontSize: '0.72rem', color: 'var(--green-700)', fontWeight: 600 }}>✓ {v.visitorPass.passNumber}</span>}
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
    </AppLayout>
  );
}
