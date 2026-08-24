'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { FileText, Calendar, Clock, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';

function ExitRequestModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ reason: '', exitDate: '', exitTime: '14:00', expectedReturnTime: '17:00', destination: '', description: '', isUrgent: false, requiresHrApproval: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.checked }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/exit-requests', form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply Exit Permission"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="exit-req-form" type="submit" disabled={submitting}>{submitting && <Spinner white size="sm" />} Submit</button></>}
    >
      <form id="exit-req-form" onSubmit={submit} className="space-y-3">
        {error && <div className="alert alert-error"><AlertTriangle size={14} /><span>{error}</span></div>}
        <div className="form-group"><label className="form-label">Reason <span className="required">*</span></label>
          <input className="form-control" placeholder="e.g. Conference, Doctor Visit" value={form.reason} onChange={set('reason')} required /></div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Exit Date <span className="required">*</span></label>
            <input type="date" className="form-control" value={form.exitDate} onChange={set('exitDate')} required min={new Date().toISOString().split('T')[0]} /></div>
          <div className="form-group"><label className="form-label">Destination <span className="required">*</span></label>
            <input className="form-control" placeholder="e.g. City Hospital" value={form.destination} onChange={set('destination')} required /></div>
        </div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Exit Time <span className="required">*</span></label>
            <input type="time" className="form-control" value={form.exitTime} onChange={set('exitTime')} required /></div>
          <div className="form-group"><label className="form-label">Expected Return <span className="required">*</span></label>
            <input type="time" className="form-control" value={form.expectedReturnTime} onChange={set('expectedReturnTime')} required /></div>
        </div>
        <div className="form-group"><label className="form-label">Description (optional)</label>
          <textarea className="form-control" rows={2} value={form.description} onChange={set('description')} /></div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
            <input type="checkbox" checked={form.requiresHrApproval} onChange={setBool('requiresHrApproval')} style={{ width: 16, height: 16, accentColor: 'var(--blue-600)' }} />
            Requires HR Approval
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--red-600)', fontWeight: 600 }}>
            <input type="checkbox" checked={form.isUrgent} onChange={setBool('isUrgent')} style={{ width: 16, height: 16, accentColor: '#dc2626' }} />
            🚨 Mark as Urgent (Super Admin notified)
          </label>
        </div>
      </form>
    </Modal>
  );
}

function LeaveRequestModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (open) api.get('/leave/types').then(r => { const d = r.data?.data || []; setLeaveTypes(d); if (d[0]) setForm(f => ({ ...f, leaveTypeId: d[0].id })); });
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try { await api.post('/leave/requests', form); onSuccess(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply for Leave"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="leave-req-form" type="submit" disabled={submitting}>{submitting && <Spinner white size="sm" />} Submit</button></>}
    >
      <form id="leave-req-form" onSubmit={submit} className="space-y-3">
        {error && <div className="alert alert-error"><AlertTriangle size={14} /><span>{error}</span></div>}
        <div className="form-group"><label className="form-label">Leave Type <span className="required">*</span></label>
          <select className="form-control" value={form.leaveTypeId} onChange={set('leaveTypeId')} required>
            <option value="">Select Leave Type</option>
            {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
          </select></div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">From Date <span className="required">*</span></label>
            <input type="date" className="form-control" value={form.fromDate} onChange={set('fromDate')} required min={new Date().toISOString().split('T')[0]} /></div>
          <div className="form-group"><label className="form-label">To Date <span className="required">*</span></label>
            <input type="date" className="form-control" value={form.toDate} onChange={set('toDate')} required min={form.fromDate} /></div>
        </div>
        <div className="form-group"><label className="form-label">Reason <span className="required">*</span></label>
          <textarea className="form-control" rows={3} value={form.reason} onChange={set('reason')} required placeholder="Reason for leave..." /></div>
      </form>
    </Modal>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'exit' | 'leave'>('exit');
  const [exitRequests, setExitRequests] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExit, setShowExit] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  const load = () => {
    Promise.all([
      api.get('/exit-requests'),
      api.get('/leave/requests')
    ]).then(([ex, lv]) => {
      setExitRequests(ex.data?.data || []);
      setLeaveRequests(lv.data?.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1>My Requests</h1>
              <p style={{ marginTop: 2 }}>Track all your exit permissions and leave applications</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowExit(true)}><Plus size={14} /> Exit Permission</button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowLeave(true)}><Plus size={14} /> Apply Leave</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--blue-100)' }}>
          {(['exit', 'leave'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', fontWeight: 600, fontSize: '0.8125rem', border: 'none',
              background: 'none', cursor: 'pointer', borderBottom: tab === t ? '2px solid var(--blue-700)' : '2px solid transparent',
              color: tab === t ? 'var(--blue-700)' : 'var(--slate-500)', marginBottom: -2
            }}>
              {t === 'exit' ? `Exit Permissions (${exitRequests.length})` : `Leave Requests (${leaveRequests.length})`}
            </button>
          ))}
        </div>

        {tab === 'exit' && (
          <div className="card">
            {exitRequests.length === 0 ? (
              <div className="empty-state"><FileText size={36} /><h4>No Exit Requests</h4><p>Submit your first exit permission request.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowExit(true)}><Plus size={14} /> Apply Now</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Date</th><th>Exit Time</th><th>Return Time</th><th>Destination</th><th>Reason</th><th>Status</th><th>Submitted</th></tr></thead>
                  <tbody>
                    {exitRequests.map((r: any) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{fmtDate(r.exitDate)}</td>
                        <td className="font-mono">{r.exitTime}</td>
                        <td className="font-mono">{r.expectedReturnTime}</td>
                        <td>{r.destination}</td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                        <td><span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'leave' && (
          <div className="card">
            {leaveRequests.length === 0 ? (
              <div className="empty-state"><Calendar size={36} /><h4>No Leave Requests</h4><p>Apply for leave when needed.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowLeave(true)}><Plus size={14} /> Apply Now</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Applied</th></tr></thead>
                  <tbody>
                    {leaveRequests.map((r: any) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.leaveType?.name}</td>
                        <td>{fmtDate(r.fromDate)}</td>
                        <td>{fmtDate(r.toDate)}</td>
                        <td><strong>{r.totalDays}</strong></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                        <td><span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ExitRequestModal open={showExit} onClose={() => setShowExit(false)} onSuccess={() => { setShowExit(false); load(); }} />
      <LeaveRequestModal open={showLeave} onClose={() => setShowLeave(false)} onSuccess={() => { setShowLeave(false); load(); }} />
    </AppLayout>
  );
}
