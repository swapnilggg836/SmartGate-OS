'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { FileText, Clock, Plus, AlertTriangle } from 'lucide-react';

function ExitRequestModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ reason: '', exitDate: '', exitTime: '14:00', expectedReturnTime: '17:00', destination: '', description: '', isUrgent: false, requiresHrApproval: true });
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
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="exit-req-form" type="submit" disabled={submitting}>{submitting && <Spinner white size="sm" />} Submit Request</button></>}
    >
      <form id="exit-req-form" onSubmit={submit} className="space-y-3">
        {error && <div className="alert alert-error"><AlertTriangle size={14} /><span>{error}</span></div>}
        <div className="form-group"><label className="form-label">Reason <span className="required">*</span></label>
          <input className="form-control" placeholder="e.g. Conference, Doctor Visit, Official Work" value={form.reason} onChange={set('reason')} required /></div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Exit Date <span className="required">*</span></label>
            <input type="date" className="form-control" value={form.exitDate} onChange={set('exitDate')} required min={new Date().toISOString().split('T')[0]} /></div>
          <div className="form-group"><label className="form-label">Destination <span className="required">*</span></label>
            <input className="form-control" placeholder="e.g. City Hospital, Client Office" value={form.destination} onChange={set('destination')} required /></div>
        </div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Exit Time <span className="required">*</span></label>
            <input type="time" className="form-control" value={form.exitTime} onChange={set('exitTime')} required /></div>
          <div className="form-group"><label className="form-label">Expected Return <span className="required">*</span></label>
            <input type="time" className="form-control" value={form.expectedReturnTime} onChange={set('expectedReturnTime')} required /></div>
        </div>
        <div className="form-group"><label className="form-label">Description (optional)</label>
          <textarea className="form-control" rows={2} value={form.description} onChange={set('description')} placeholder="Add any additional details or notes..." /></div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--red-600)', fontWeight: 600 }}>
            <input type="checkbox" checked={form.isUrgent} onChange={setBool('isUrgent')} style={{ width: 16, height: 16, accentColor: '#dc2626' }} />
            🚨 Mark as Urgent (Super Admin notified)
          </label>
        </div>
      </form>
    </Modal>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [exitRequests, setExitRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExit, setShowExit] = useState(false);

  const load = () => {
    api.get('/exit-requests')
      .then(ex => {
        setExitRequests(ex.data?.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const downloadExitCsv = () => {
    if (exitRequests.length === 0) return;
    const headers = ['Date', 'Exit Time', 'Return Time', 'Destination', 'Reason', 'Status', 'Submitted At'];
    const rows = exitRequests.map(r => [
      fmtDate(r.exitDate),
      r.exitTime,
      r.expectedReturnTime,
      `"${(r.destination || '').replace(/"/g, '""')}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      r.status,
      fmtDate(r.createdAt)
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-exit-permissions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1>My Exit Permissions</h1>
              <p style={{ marginTop: 2 }}>Track and manage all your exit permission requests and gate passes</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={downloadExitCsv} disabled={exitRequests.length === 0}>
                Export CSV
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowExit(true)}><Plus size={14} /> Apply Exit Permission</button>
            </div>
          </div>
        </div>

        <div className="card">
          {exitRequests.length === 0 ? (
            <div className="empty-state">
              <FileText size={36} />
              <h4>No Exit Requests</h4>
              <p>You haven't submitted any exit permission requests yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowExit(true)}><Plus size={14} /> Apply Now</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Exit Time</th>
                    <th>Return Time</th>
                    <th>Destination</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {exitRequests.map((r: any) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{fmtDate(r.exitDate)}</td>
                      <td className="font-mono">{r.exitTime}</td>
                      <td className="font-mono">{r.expectedReturnTime}</td>
                      <td>{r.destination}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                      <td><span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ExitRequestModal open={showExit} onClose={() => setShowExit(false)} onSuccess={() => { setShowExit(false); load(); }} />
    </AppLayout>
  );
}
