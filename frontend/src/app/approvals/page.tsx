'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { fmtDate, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { ClipboardList, CheckCircle2, XCircle, AlertTriangle, Zap } from 'lucide-react';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const role = user?.role || '';
  const [tab, setTab] = useState<'exit' | 'leave'>('exit');
  const [exitRequests, setExitRequests] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; type: string }>({ open: false, id: '', type: '' });
  const [rejectComment, setRejectComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let exitList: any[] = [];
      let leaveList: any[] = [];

      if (role === 'MANAGER') {
        const [eRes, lRes] = await Promise.all([
          api.get('/exit-requests/pending').catch(() => ({ data: { data: [] } })),
          api.get('/leave/requests/pending').catch(() => ({ data: { data: [] } })),
        ]);
        exitList = eRes.data?.data || [];
        leaveList = lRes.data?.data || [];
      } else if (role === 'HR') {
        const [eRes, lRes] = await Promise.all([
          api.get('/exit-requests/pending-hr').catch(() => ({ data: { data: [] } })),
          api.get('/leave/requests/pending-hr').catch(() => ({ data: { data: [] } })),
        ]);
        exitList = eRes.data?.data || [];
        leaveList = lRes.data?.data || [];
      } else {
        // SUPER_ADMIN or GM
        const [e1, l1, e2, l2] = await Promise.all([
          api.get('/exit-requests/pending').catch(() => ({ data: { data: [] } })),
          api.get('/leave/requests/pending').catch(() => ({ data: { data: [] } })),
          api.get('/exit-requests/pending-hr').catch(() => ({ data: { data: [] } })),
          api.get('/leave/requests/pending-hr').catch(() => ({ data: { data: [] } }))
        ]);
        exitList = [...(e1.data?.data || []), ...(e2.data?.data || [])];
        leaveList = [...(l1.data?.data || []), ...(l2.data?.data || [])];
      }

      const dedup = (arr: any[]) => arr.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
      setExitRequests(dedup(exitList));
      setLeaveRequests(dedup(leaveList));
    } catch { }
    finally { setLoading(false); }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string, type: string) => {
    setActionLoading(id + '-approve');
    try {
      const url = type === 'exit' ? `/exit-requests/${id}/review` : `/leave/requests/${id}/review`;
      await api.patch(url, { status: 'APPROVED', comments: 'Approved' });
      showToast('Request approved successfully ✓');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Approval failed', false);
    } finally { setActionLoading(null); }
  };

  const reject = async () => {
    if (!rejectComment.trim()) return;
    setSubmitting(true);
    try {
      const url = rejectModal.type === 'exit' ? `/exit-requests/${rejectModal.id}/review` : `/leave/requests/${rejectModal.id}/review`;
      await api.patch(url, { status: 'REJECTED', comments: rejectComment });
      showToast('Request rejected.');
      setRejectModal({ open: false, id: '', type: '' });
      setRejectComment('');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Rejection failed', false);
    } finally { setSubmitting(false); }
  };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  const renderTable = (requests: any[], type: 'exit' | 'leave') => (
    requests.length === 0 ? (
      <div className="empty-state">
        <CheckCircle2 size={36} />
        <h4>All Caught Up!</h4>
        <p>No pending {type === 'exit' ? 'exit permission' : 'leave'} requests.</p>
      </div>
    ) : (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Dept</th>
              {type === 'exit'
                ? <><th>Destination</th><th>Date</th><th>Exit</th><th>Return</th><th>Flags</th></>
                : <><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Submitted By</th></>
              }
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r: any) => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.employee?.firstName} {r.employee?.lastName}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--slate-400)' }}>{r.employee?.employeeCode}</div>
                </td>
                <td style={{ fontSize: '0.8125rem' }}>{r.employee?.department?.name}</td>
                {type === 'exit' ? (
                  <>
                    <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.destination}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{fmtDate(r.exitDate)}</td>
                    <td className="font-mono" style={{ fontSize: '0.8125rem' }}>{r.exitTime}</td>
                    <td className="font-mono" style={{ fontSize: '0.8125rem' }}>{r.expectedReturnTime}</td>
                    <td>
                      {r.isUrgent && <span className="badge badge-red" title="Urgent"><Zap size={10} /> Urgent</span>}
                      {r.requiresHrApproval && <span className="badge badge-blue" style={{ marginLeft: 4 }}>HR Req.</span>}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.leaveType?.name}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{fmtDate(r.fromDate)}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{fmtDate(r.toDate)}</td>
                    <td style={{ fontWeight: 600 }}>{r.totalDays}d</td>
                    <td>
                      {r.submitterRole && r.submitterRole !== 'EMPLOYEE' && (
                        <span className={`badge ${r.submitterRole === 'MANAGER' ? 'badge-amber' : 'badge-blue'}`}>
                          {r.submitterRole}
                        </span>
                      )}
                    </td>
                  </>
                )}
                <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{r.reason}</td>
                <td><span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => approve(r.id, type)}
                      disabled={actionLoading === r.id + '-approve'}
                    >
                      {actionLoading === r.id + '-approve' ? <Spinner size="sm" /> : <CheckCircle2 size={13} />} Approve
                    </button>
                    <button
                      className="btn btn-danger-outline btn-sm"
                      onClick={() => { setRejectModal({ open: true, id: r.id, type }); setRejectComment(''); }}
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Toast */}
        {toast && (
          <div className={`alert ${toast.ok ? 'alert-success' : 'alert-error'}`} style={{ position: 'fixed', top: 72, right: 20, zIndex: 9999, minWidth: 280 }}>
            {toast.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{toast.msg}</span>
          </div>
        )}

        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1><ClipboardList size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--blue-700)' }} />Approvals</h1>
              <p>Review and approve/reject team requests — only your relevant pending items shown</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--blue-100)' }}>
          {(['exit', 'leave'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', fontWeight: 600, fontSize: '0.8125rem', border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--blue-700)' : '2px solid transparent',
              color: tab === t ? 'var(--blue-700)' : 'var(--slate-500)', marginBottom: -2
            }}>
              {t === 'exit' ? `Exit Permissions (${exitRequests.length})` : `Leave Requests (${leaveRequests.length})`}
            </button>
          ))}
        </div>

        <div className="card">
          {tab === 'exit' ? renderTable(exitRequests, 'exit') : renderTable(leaveRequests, 'leave')}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: '', type: '' })}
        title="Reject Request"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setRejectModal({ open: false, id: '', type: '' })}>Cancel</button>
          <button className="btn btn-danger" onClick={reject} disabled={!rejectComment.trim() || submitting}>
            {submitting && <Spinner white size="sm" />} Confirm Reject
          </button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Rejection Reason <span className="required">*</span></label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Enter reason for rejection (required)..."
            value={rejectComment}
            onChange={e => setRejectComment(e.target.value)}
            autoFocus
          />
          <span className="form-hint">This reason will be sent to the employee as a notification.</span>
        </div>
      </Modal>
    </AppLayout>
  );
}
