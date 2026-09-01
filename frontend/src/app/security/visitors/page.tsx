'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Shield, Search, CheckCircle2, XCircle, Clock, AlertTriangle, Users, UserPlus, LogIn, LogOut, QrCode, RefreshCw, MessageCircle } from 'lucide-react';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: '14px 18px', borderLeft: `3px solid ${color}`, cursor: 'default' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function WalkInModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ fullName: '', mobile: '', gender: 'MALE', organization: '', idType: '', purpose: '', expectedExitTime: '18:00', numberOfVisitors: 1, vehicleNumber: '' });
  const [host, setHost] = useState<any>(null);
  const [hostQ, setHostQ] = useState('');
  const [hostResults, setHostResults] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (hostQ.length < 2) { setHostResults([]); return; }
    const t = setTimeout(async () => {
      try { const r = await api.get(`/visitors/search-host?q=${encodeURIComponent(hostQ)}`); setHostResults(r.data?.data || []); }
      catch { setHostResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [hostQ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    if (!host) { setError('Please select the host.'); setSubmitting(false); return; }
    try {
      await api.post('/visitors/walk-in', { ...form, hostUserId: host.id, numberOfVisitors: Number(form.numberOfVisitors) });
      onSuccess();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Register Walk-in Visitor"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="walkin-form" type="submit" disabled={submitting}>{submitting && <Spinner white size="sm" />} Register</button></>}>
      <form id="walkin-form" onSubmit={submit} className="space-y-3">
        {error && <div className="alert alert-error"><AlertTriangle size={14} /><span>{error}</span></div>}

        <div style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '12px 14px', marginBottom: 4 }}>
          <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 8 }}>Person to Visit</p>
          {host ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '2px solid var(--blue-500)', borderRadius: 8, background: 'var(--blue-50)' }}>
              <div style={{ flex: 1, fontWeight: 600, fontSize: '0.875rem' }}>{host.employee ? `${host.employee.firstName} ${host.employee.lastName}` : host.email}</div>
              <button type="button" onClick={() => setHost(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}><XCircle size={14} /></button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input className="form-control" style={{ paddingLeft: 30 }} placeholder="Search employee..." value={hostQ} onChange={e => setHostQ(e.target.value)} />
              {hostResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--slate-200)', borderRadius: 8, zIndex: 50, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                  {hostResults.map((u: any) => (
                    <button key={u.id} type="button" onClick={() => { setHost(u); setHostQ(''); setHostResults([]); }}
                      style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.8125rem' }}>
                      <strong>{u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : u.email}</strong>
                      <span style={{ color: 'var(--slate-500)', fontSize: '0.72rem', marginLeft: 6 }}>{u.employee?.designation}{u.employee?.department?.name ? ` · ${u.employee.department.name}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label className="form-label">Full Name <span className="required">*</span></label><input className="form-control" value={form.fullName} onChange={set('fullName')} required /></div>
          <div className="form-group"><label className="form-label">Mobile <span className="required">*</span></label><input className="form-control" value={form.mobile} onChange={set('mobile')} required /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label className="form-label">Organization</label><input className="form-control" value={form.organization} onChange={set('organization')} /></div>
          <div className="form-group"><label className="form-label">Expected Exit</label><input type="time" className="form-control" value={form.expectedExitTime} onChange={set('expectedExitTime')} required /></div>
        </div>
        <div className="form-group"><label className="form-label">Purpose <span className="required">*</span></label><input className="form-control" value={form.purpose} onChange={set('purpose')} required /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label className="form-label">No. of Visitors</label><input type="number" className="form-control" min={1} max={50} value={form.numberOfVisitors} onChange={set('numberOfVisitors')} /></div>
          <div className="form-group"><label className="form-label">Vehicle Number</label><input className="form-control" value={form.vehicleNumber} onChange={set('vehicleNumber')} /></div>
        </div>
      </form>
    </Modal>
  );
}

function CheckInModal({ visit, open, onClose, onSuccess }: { visit: any; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [idVerified, setIdVerified] = useState(false);
  const [gate, setGate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try { await api.post(`/visitors/security/check-in/${visit.visitId}`, { idVerified, gate, notes }); onSuccess(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  if (!visit) return null;
  const hEmp = visit.hostUser?.employee;
  return (
    <Modal open={open} onClose={onClose} title="Check-In Visitor"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting && <Spinner white size="sm" />}<LogIn size={14} /> Confirm Check-In</button></>}>
      <div className="space-y-3">
        <div style={{ background: 'var(--blue-50)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{visit.visitor?.fullName}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: 4 }}>{visit.visitor?.mobile}{visit.visitor?.organization ? ` · ${visit.visitor.organization}` : ''}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: 2 }}>Meeting: {hEmp ? `${hEmp.firstName} ${hEmp.lastName}` : visit.hostUser?.email}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>Purpose: {visit.purpose}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', fontFamily: 'monospace', marginTop: 4 }}>Expected exit: {visit.expectedExitTime}</div>
        </div>
        <div className="form-group"><label className="form-label">Gate / Entry Point</label><input className="form-control" value={gate} onChange={e => setGate(e.target.value)} placeholder="e.g. Main Gate, Gate A" /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', padding: '10px 14px', border: '1px solid var(--slate-200)', borderRadius: 8, background: idVerified ? 'var(--green-50)' : '' }}>
          <input type="checkbox" checked={idVerified} onChange={e => setIdVerified(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#16a34a' }} />
          <span style={{ fontWeight: 600, color: idVerified ? '#16a34a' : 'var(--slate-700)' }}>? ID Verified</span>
        </label>
        <div className="form-group"><label className="form-label">Notes (optional)</label><textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

export default function SecurityVisitorsPage() {
  const [tab, setTab] = useState<'today' | 'inside'>('today');
  const [todayVisits, setTodayVisits] = useState<any[]>([]);
  const [insideVisits, setInsideVisits] = useState<any[]>([]);
  const [verifySearch, setVerifySearch] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState<any>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [showQrPoster, setShowQrPoster] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, insideRes] = await Promise.all([api.get('/visitors/security/today'), api.get('/visitors/security/inside')]);
      setTodayVisits(todayRes.data?.data || []);
      setInsideVisits(insideRes.data?.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const verify = async () => {
    if (!verifySearch.trim()) return;
    setVerifying(true); setVerifyResult(null);
    try { const r = await api.post('/visitors/security/verify', { identifier: verifySearch.trim() }); setVerifyResult(r.data); }
    catch (err: any) { setVerifyResult({ error: err.response?.data?.message || 'Not found' }); }
    finally { setVerifying(false); }
  };

  const checkOut = async (visitId: string) => {
    setActioning(visitId);
    try { await api.post(`/visitors/security/check-out/${visitId}`, {}); load(); setVerifyResult(null); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setActioning(null); }
  };

  const approved = todayVisits.filter(v => v.status === 'APPROVED');
  const waiting = todayVisits.filter(v => v.status === 'WAITING');
  const pending = todayVisits.filter(v => v.status === 'PENDING_HOST');

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div><h1>Security · Visitor Console</h1><p style={{ marginTop: 2 }}>Today's visitor management and gate control</p></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowQrPoster(true)}>
                <QrCode size={14} /> Gate QR Poster
              </button>
              <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /></button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowWalkIn(true)}><UserPlus size={14} /> Register Walk-in</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <StatCard label="Expected Today" value={approved.length} color="#2563eb" />
          <StatCard label="Waiting" value={waiting.length + pending.length} color="#d97706" />
          <StatCard label="Inside Now" value={insideVisits.filter(v => v.status === 'CHECKED_IN').length} color="#16a34a" />
          <StatCard label="Overdue" value={insideVisits.filter(v => v.status === 'OVERDUE').length} color="#dc2626" />
        </div>

        {/* Quick Verify */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--slate-700)' }}>?? Verify Visitor Pass / QR</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-control" placeholder="Scan QR, enter Pass No. (VP-...), Visit ID (VIS-...) or mobile..." value={verifySearch} onChange={e => setVerifySearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && verify()} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={verify} disabled={verifying}>{verifying ? <Spinner white size="sm" /> : <QrCode size={16} />} Verify</button>
          </div>

          {verifyResult && (
            <div style={{ marginTop: 14, padding: '16px', borderRadius: 10, border: `1.5px solid ${verifyResult.error ? 'var(--red-300)' : verifyResult.warnings?.length ? '#fbbf24' : 'var(--green-300)'}`, background: verifyResult.error ? 'var(--red-50)' : (verifyResult.warnings?.length ? '#fffbeb' : 'var(--green-50)') }}>
              {verifyResult.error ? (
                <div style={{ color: 'var(--red-700)', display: 'flex', gap: 8, alignItems: 'center' }}><XCircle size={16} /> {verifyResult.error}</div>
              ) : (
                <>
                  {verifyResult.warnings?.map((w: string, i: number) => <div key={i} style={{ color: '#b45309', fontSize: '0.8rem', marginBottom: 4, display: 'flex', gap: 6 }}><AlertTriangle size={13} /> {w}</div>)}
                  {(() => {
                    const v = verifyResult.data?.visit || verifyResult.data;
                    if (!v) return null;
                    const hEmp = v.hostUser?.employee;
                    return (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{v.visitor?.fullName}</div>
                             <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>{v.visitor?.mobile}{v.visitor?.organization ? ` · ${v.visitor.organization}` : ''}</div>
                          </div>
                           <span className={`badge ${statusBadgeClass(v.status)}`}>{statusLabel(v.status)}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem', color: 'var(--slate-700)', marginBottom: 12 }}>
                           <div>Meeting: <strong>{hEmp ? `${hEmp.firstName} ${hEmp.lastName}` : v.hostUser?.email}</strong></div>
                          <div>Dept: <strong>{v.department?.name || hEmp?.department?.name || '?'}</strong></div>
                          <div>Purpose: <strong>{v.purpose}</strong></div>
                           <div>Time: <strong style={{ fontFamily: 'monospace' }}>{v.expectedEntryTime} – {v.expectedExitTime}</strong></div>
                          {verifyResult.data?.passNumber && <div style={{ gridColumn: '1/-1' }}>Pass: <strong style={{ fontFamily: 'monospace' }}>{verifyResult.data.passNumber}</strong></div>}
                        </div>
                        {['APPROVED', 'WAITING'].includes(v.status) && !verifyResult.warnings?.length && (
                          <button className="btn btn-primary btn-sm" onClick={() => { setCheckInTarget(v); setVerifyResult(null); setVerifySearch(''); }}>
                            <LogIn size={13} /> Proceed to Check-In
                          </button>
                        )}
                        {['CHECKED_IN', 'OVERDUE'].includes(v.status) && (
                          <button className="btn btn-sm" style={{ background: '#ea580c', color: 'white' }} onClick={() => checkOut(v.visitId)} disabled={actioning === v.visitId}>
                            {actioning === v.visitId ? <Spinner white size="sm" /> : <LogOut size={13} />} Check Out
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--blue-100)' }}>
          {(['today', 'inside'] as const).map((t) => {
            const label = t === 'today' ? `Today's Visitors (${todayVisits.length})` : `Inside Now (${insideVisits.length})`;
            return (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.8125rem', border: 'none', background: 'none', cursor: 'pointer', marginBottom: -2, borderBottom: tab === t ? '2px solid var(--blue-700)' : '2px solid transparent', color: tab === t ? 'var(--blue-700)' : 'var(--slate-500)' }}>{label}</button>
            );
          })}
        </div>

        <div className="card">
          {(() => {
            const list = tab === 'today' ? todayVisits : insideVisits;
            if (list.length === 0) return <div className="empty-state"><Users size={36} /><h4>{tab === 'today' ? 'No visitors expected today' : 'No visitors inside'}</h4></div>;
            return (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Visit ID</th><th>Visitor</th><th>Host</th><th>Purpose</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {list.map((v: any) => {
                      const hEmp = v.hostUser?.employee;
                      const checkIn = v.checkIns?.[0];
                      return (
                        <tr key={v.id} style={v.status === 'OVERDUE' ? { background: '#fff7ed' } : {}}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{v.visitId}</td>
                          <td><div style={{ fontWeight: 600 }}>{v.visitor?.fullName}</div><div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{v.visitor?.mobile}</div></td>
                          <td>{hEmp ? `${hEmp.firstName} ${hEmp.lastName}` : v.hostUser?.email}</td>
                          <td>{v.purpose}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {v.expectedEntryTime} – {v.expectedExitTime}
                            {checkIn && <div style={{ fontSize: '0.7rem', color: 'var(--green-700)', marginTop: 2 }}>In: {fmtTime(checkIn.actualEntryTime)}</div>}
                          </td>
                          <td><span className={`badge ${statusBadgeClass(v.status)}`}>{statusLabel(v.status)}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              {['APPROVED', 'WAITING'].includes(v.status) && (
                                <button className="btn btn-sm" style={{ background: '#16a34a', color: 'white', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => setCheckInTarget(v)}>
                                  <LogIn size={11} /> Check In
                                </button>
                              )}
                              {v.visitorPass && (
                                <button
                                  onClick={() => {
                                    const passUrl = `${window.location.origin}/visitor-pass/${v.visitorPass.qrToken}`;
                                    const msg = encodeURIComponent(`Hello ${v.visitor?.fullName}!\nHere is your Visitor Entry Pass for SmartGate Campus:\nPass Number: ${v.visitorPass.passNumber}\nView Pass & QR Code:\n${passUrl}\nPlease show this at Security.`);
                                    const cleanPhone = (v.visitor?.mobile || '').replace(/[^0-9]/g, '');
                                    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`, '_blank');
                                  }}
                                  title="Send pass on WhatsApp"
                                  className="btn btn-sm"
                                  style={{ background: '#25D366', color: 'white', border: 'none', padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <MessageCircle size={11} /> WhatsApp
                                </button>
                              )}
                              {['CHECKED_IN', 'OVERDUE'].includes(v.status) && (
                                <button className="btn btn-sm btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => checkOut(v.visitId)} disabled={actioning === v.visitId}>
                                  {actioning === v.visitId ? <Spinner size="sm" /> : <LogOut size={11} />} Check Out
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
            );
          })()}
        </div>
      </div>

      <WalkInModal open={showWalkIn} onClose={() => setShowWalkIn(false)} onSuccess={() => { setShowWalkIn(false); load(); }} />
      {checkInTarget && <CheckInModal visit={checkInTarget} open={!!checkInTarget} onClose={() => setCheckInTarget(null)} onSuccess={() => { setCheckInTarget(null); load(); setVerifyResult(null); }} />}
      <GateQrPosterModal open={showQrPoster} onClose={() => setShowQrPoster(false)} />
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
            SmartGate OS · Gate Security
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
            VISITOR SELF CHECK-IN
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 20px' }}>
            Scan with your phone to request entry & receive your digital pass
          </p>

          <div style={{
            background: 'white',
            padding: 16,
            borderRadius: 16,
            display: 'inline-block',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            marginBottom: 20
          }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(registerUrl || 'http://localhost:3000/visitor-register')}`}
              alt="Gate Registration QR"
              style={{ width: 200, height: 200, display: 'block' }}
            />
          </div>

          <div style={{ textAlign: 'left', background: 'white', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155' }}>
            <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 6 }}>Instructions for Visitors:</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span>1.</span><span>Scan this QR code using your mobile phone camera.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span>2.</span><span>Fill in your details and select the employee you came to meet.</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>3.</span><span>Receive your approved digital pass on your phone & WhatsApp, then show it to Security.</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
