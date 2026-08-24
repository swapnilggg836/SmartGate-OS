'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import {
  Calendar, Clock, FileText, QrCode, Users, ClipboardList,
  Shield, AlertTriangle, CheckCircle2, XCircle, Plus, TrendingUp
} from 'lucide-react';

// =============================================
// EMPLOYEE DASHBOARD
// =============================================
function EmployeeDashboard() {
  const { user } = useAuth();
  const emp = user!.employee!;

  const [data, setData] = useState<any>({ balances: [], exitRequests: [], leaveRequests: [], activePass: null });
  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/leave/balances'),
      api.get('/exit-requests?limit=5'),
      api.get('/leave/requests?limit=5'),
      api.get('/gate-passes/my-active').catch(() => ({ data: { data: null } }))
    ]).then(([bal, exit, leave, pass]) => {
      setData({
        balances: bal.data?.data || [],
        exitRequests: exit.data?.data || [],
        leaveRequests: leave.data?.data || [],
        activePass: pass.data?.data
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div className="card">
        <div className="card-body" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ marginBottom: 2 }}>Welcome back, {emp.firstName}! 👋</h2>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>
                {emp.employeeCode} · {emp.designation} · {emp.departmentName}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowExitModal(true)}>
                <Plus size={14} /> Apply Exit Permission
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowLeaveModal(true)}>
                <Calendar size={14} /> Apply Leave
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Gate Pass Alert */}
      {data.activePass && (
        <div className="alert alert-info">
          <QrCode size={16} />
          <div>
            <strong>Active Gate Pass: {data.activePass.passNumber}</strong>
            <div style={{ fontSize: '0.75rem', marginTop: 2 }}>
              Valid until {fmtTime(data.activePass.validUntil)} · Status: <strong>{data.activePass.status}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balances */}
      <div>
        <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} style={{ color: 'var(--blue-700)' }} /> Leave Balances
        </h3>
        {data.balances.length === 0 ? (
          <p style={{ color: 'var(--slate-400)', fontSize: '0.8125rem' }}>No leave balances found.</p>
        ) : (
          <div className="grid-4">
            {data.balances.map((b: any) => (
              <div key={b.id} className="card">
                <div className="card-body" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: 6 }}>{b.leaveType?.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--blue-700)' }}>
                      {Math.max(0, b.totalDays - b.usedDays - b.pendingDays).toFixed(0)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>/ {b.totalDays} days left</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.6875rem', color: 'var(--slate-500)' }}>
                    <span>Used: <strong>{b.usedDays}</strong></span>
                    <span>Pending: <strong>{b.pendingDays}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="grid-2">
        {/* Exit Requests */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><FileText size={15} /> Recent Exit Requests</h3>
            <a href="/requests" style={{ fontSize: '0.75rem', color: 'var(--blue-700)', textDecoration: 'none', fontWeight: 600 }}>View All</a>
          </div>
          {data.exitRequests.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <FileText size={28} />
              <p>No exit requests yet</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {data.exitRequests.slice(0, 4).map((r: any) => (
                <div key={r.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate-800)' }}>{r.destination}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{fmtDate(r.exitDate)} · {r.exitTime}</div>
                  </div>
                  <span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leave Requests */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Calendar size={15} /> Recent Leave Requests</h3>
            <a href="/requests" style={{ fontSize: '0.75rem', color: 'var(--blue-700)', textDecoration: 'none', fontWeight: 600 }}>View All</a>
          </div>
          {data.leaveRequests.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <Calendar size={28} />
              <p>No leave requests yet</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {data.leaveRequests.slice(0, 4).map((r: any) => (
                <div key={r.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate-800)' }}>{r.leaveType?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{fmtDate(r.fromDate)} → {fmtDate(r.toDate)}</div>
                  </div>
                  <span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ExitRequestModal open={showExitModal} onClose={() => setShowExitModal(false)} onSuccess={() => { setShowExitModal(false); window.location.reload(); }} />
      <LeaveRequestModal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} onSuccess={() => { setShowLeaveModal(false); window.location.reload(); }} />
    </div>
  );
}

// =============================================
// MANAGER DASHBOARD
// =============================================
function ManagerDashboard() {
  const { user } = useAuth();
  const emp = user!.employee!;
  const [pending, setPending] = useState<any[]>([]);
  const [stats, setStats] = useState({ exits: 0, leaves: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; type: string }>({ open: false, id: '', type: '' });
  const [rejectComment, setRejectComment] = useState('');

  const load = () => {
    Promise.all([
      api.get('/exit-requests/pending'),
      api.get('/leave/requests/pending'),
    ]).then(([exits, leaves]) => {
      const all = [
        ...(exits.data?.data || []).map((r: any) => ({ ...r, _type: 'exit' })),
        ...(leaves.data?.data || []).map((r: any) => ({ ...r, _type: 'leave' }))
      ];
      setPending(all);
      setStats({ exits: (exits.data?.data || []).length, leaves: (leaves.data?.data || []).length, approved: 0, rejected: 0 });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string, type: string) => {
    const url = type === 'exit' ? `/exit-requests/${id}/review` : `/leave/requests/${id}/review`;
    await api.patch(url, { status: 'APPROVED', comments: 'Approved' });
    load();
  };

  const reject = async () => {
    const url = rejectModal.type === 'exit' ? `/exit-requests/${rejectModal.id}/review` : `/leave/requests/${rejectModal.id}/review`;
    await api.patch(url, { status: 'REJECTED', comments: rejectComment });
    setRejectModal({ open: false, id: '', type: '' });
    setRejectComment('');
    load();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <h2>Welcome, {emp.firstName}!</h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: 2 }}>{emp.designation} · {emp.departmentName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-card-icon amber"><Clock size={20} /></div>
          <div><div className="stat-card-value">{stats.exits}</div><div className="stat-card-label">Pending Exit Requests</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><Calendar size={20} /></div>
          <div><div className="stat-card-value">{stats.leaves}</div><div className="stat-card-label">Pending Leave Requests</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><CheckCircle2 size={20} /></div>
          <div><div className="stat-card-value">{pending.length}</div><div className="stat-card-label">Total Pending</div></div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><ClipboardList size={15} /> Pending Approvals — Your Team</h3>
          <span className="badge badge-amber">{pending.length} pending</span>
        </div>
        {pending.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={36} />
            <h4>All Caught Up!</h4>
            <p>No pending approvals from your team.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.employee?.firstName} {r.employee?.lastName}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--slate-400)' }}>{r.employee?.employeeCode} · {r.employee?.department?.name}</div>
                    </td>
                    <td>
                      <span className={`badge ${r._type === 'exit' ? 'badge-blue' : 'badge-slate'}`}>
                        {r._type === 'exit' ? 'Exit Permission' : 'Leave'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {r._type === 'exit' ? (
                        <><div><strong>{r.destination}</strong></div><div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>{fmtDate(r.exitDate)} · {r.exitTime} → {r.expectedReturnTime}</div></>
                      ) : (
                        <><div><strong>{r.leaveType?.name}</strong></div><div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>{fmtDate(r.fromDate)} → {fmtDate(r.toDate)} ({r.totalDays} days)</div></>
                      )}
                      <div style={{ color: 'var(--slate-500)', fontSize: '0.75rem', marginTop: 2, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason}</div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{fmtDate(r.createdAt)}</td>
                    <td><span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => approve(r.id, r._type)}>
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button className="btn btn-danger-outline btn-sm" onClick={() => { setRejectModal({ open: true, id: r.id, type: r._type }); setRejectComment(''); }}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: '', type: '' })} title="Reject Request — Add Reason"
        footer={
          <><button className="btn btn-ghost" onClick={() => setRejectModal({ open: false, id: '', type: '' })}>Cancel</button>
            <button className="btn btn-danger" onClick={reject} disabled={!rejectComment.trim()}>Confirm Reject</button></>
        }
      >
        <div className="form-group">
          <label className="form-label">Rejection Reason <span className="required">*</span></label>
          <textarea className="form-control" rows={3} placeholder="Enter reason for rejection..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
          <span className="form-hint">This will be sent to the employee as a notification.</span>
        </div>
      </Modal>
    </div>
  );
}

// =============================================
// HR DASHBOARD
// =============================================
function HRDashboard() {
  const { user } = useAuth();
  const emp = user!.employee!;
  const [pending, setPending] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; type: string }>({ open: false, id: '', type: '' });
  const [rejectComment, setRejectComment] = useState('');

  const load = () => {
    Promise.all([
      api.get('/exit-requests/pending-hr').catch(() => ({ data: { data: [] } })),
      api.get('/leave/requests/pending-hr').catch(() => ({ data: { data: [] } })),
      api.get('/users/employees').catch(() => ({ data: { data: [] } }))
    ]).then(([exits, leaves, emps]) => {
      const all = [
        ...(exits.data?.data || []).map((r: any) => ({ ...r, _type: 'exit' })),
        ...(leaves.data?.data || []).map((r: any) => ({ ...r, _type: 'leave' }))
      ];
      setPending(all);
      setStats({ totalEmployees: (emps.data?.data || []).length });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string, type: string) => {
    const url = type === 'exit' ? `/exit-requests/${id}/review` : `/leave/requests/${id}/review`;
    await api.patch(url, { status: 'APPROVED', comments: 'HR Approved' });
    load();
  };

  const reject = async () => {
    const url = rejectModal.type === 'exit' ? `/exit-requests/${rejectModal.id}/review` : `/leave/requests/${rejectModal.id}/review`;
    await api.patch(url, { status: 'REJECTED', comments: rejectComment });
    setRejectModal({ open: false, id: '', type: '' });
    load();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <h2>HR Dashboard — Welcome, {emp.firstName}!</h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: 2 }}>Human Resources · Second-level approval authority</p>
        </div>
      </div>

      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-card-icon amber"><ClipboardList size={20} /></div>
          <div><div className="stat-card-value">{pending.length}</div><div className="stat-card-label">Awaiting HR Approval</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><Users size={20} /></div>
          <div><div className="stat-card-value">{stats.totalEmployees}</div><div className="stat-card-label">Total Employees</div></div>
        </div>
      </div>

      {/* HR Pending Queue */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><ClipboardList size={15} /> Awaiting HR Review</h3>
          {pending.length > 0 && <span className="badge badge-amber">{pending.length} pending</span>}
        </div>
        {pending.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={36} />
            <h4>No HR Reviews Pending</h4>
            <p>All requests have been processed.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Employee</th><th>Type</th><th>Details</th><th>Manager Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.employee?.firstName} {r.employee?.lastName}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--slate-400)' }}>{r.employee?.employeeCode}</div>
                    </td>
                    <td><span className={`badge ${r._type === 'exit' ? 'badge-blue' : 'badge-slate'}`}>{r._type === 'exit' ? 'Exit' : 'Leave'}</span></td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {r._type === 'exit' ? <><strong>{r.destination}</strong><div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>{fmtDate(r.exitDate)}</div></> : <><strong>{r.leaveType?.name}</strong><div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>{fmtDate(r.fromDate)} → {fmtDate(r.toDate)}</div></>}
                    </td>
                    <td><span className="badge badge-green">Manager Approved</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => approve(r.id, r._type)}><CheckCircle2 size={13} /> Approve</button>
                        <button className="btn btn-danger-outline btn-sm" onClick={() => { setRejectModal({ open: true, id: r.id, type: r._type }); setRejectComment(''); }}><XCircle size={13} /> Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: '', type: '' })} title="Reject — Add Reason"
        footer={<><button className="btn btn-ghost" onClick={() => setRejectModal({ open: false, id: '', type: '' })}>Cancel</button><button className="btn btn-danger" onClick={reject} disabled={!rejectComment.trim()}>Confirm Reject</button></>}
      >
        <div className="form-group">
          <label className="form-label">Rejection Reason <span className="required">*</span></label>
          <textarea className="form-control" rows={3} value={rejectComment} onChange={e => setRejectComment(e.target.value)} placeholder="Reason for rejection..." />
        </div>
      </Modal>
    </div>
  );
}

// =============================================
// SECURITY DASHBOARD
// =============================================
function SecurityDashboard() {
  const { user } = useAuth();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const load = () => {
    api.get('/gate-passes/today').then(r => {
      setPasses(r.data?.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const verify = async () => {
    if (!search.trim()) return;
    setVerifying(true);
    try {
      const res = await api.post('/gate-passes/verify', { query: search.trim() });
      setVerifyResult(res.data?.data);
    } catch (err: any) {
      setVerifyResult({ error: err.response?.data?.message || 'Not found' });
    } finally {
      setVerifying(false);
    }
  };

  const allowExit = async (gatePassId: string) => {
    await api.post('/security/exit', { gatePassId });
    load();
    setVerifyResult(null);
  };

  const markReturned = async (gatePassId: string) => {
    await api.post('/security/return', { gatePassId });
    load();
    setVerifyResult(null);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} style={{ color: 'var(--blue-700)' }} /> Security Gate Dashboard
          </h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: 2 }}>
            Logged in as: {user?.employee?.firstName} {user?.employee?.lastName} · Security Guard
          </p>
        </div>
      </div>

      {/* Verify Panel */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><QrCode size={15} /> Verify Gate Pass</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-control"
              placeholder="Enter Gate Pass ID (e.g. GP-2026-00125) or Employee ID (e.g. EMP1001)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verify()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={verify} disabled={verifying}>
              {verifying ? <Spinner white size="sm" /> : <Shield size={15} />}
              Verify
            </button>
          </div>

          {verifyResult && (
            <div style={{ marginTop: 16 }}>
              {verifyResult.error ? (
                <div className="alert alert-error"><AlertTriangle size={15} /><span>{verifyResult.error}</span></div>
              ) : (
                <div className="card" style={{ border: '2px solid var(--blue-300)' }}>
                  <div style={{ background: 'var(--blue-700)', color: 'white', padding: '12px 20px', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{verifyResult.passNumber}</strong>
                    <span className={`badge ${statusBadgeClass(verifyResult.status)}`} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>{statusLabel(verifyResult.status)}</span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    {[
                      ['Employee', `${verifyResult.employee?.firstName} ${verifyResult.employee?.lastName}`],
                      ['Employee ID', verifyResult.employee?.employeeCode],
                      ['Department', verifyResult.employee?.department?.name],
                      ['Exit Date', fmtDate(verifyResult.exitRequest?.exitDate)],
                      ['Exit Time', verifyResult.exitRequest?.exitTime],
                      ['Expected Return', verifyResult.exitRequest?.expectedReturnTime],
                      ['Destination', verifyResult.exitRequest?.destination],
                      ['Reason', verifyResult.exitRequest?.reason],
                    ].map(([label, value]) => (
                      <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed var(--slate-100)', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--slate-500)' }}>{label}</span>
                        <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{value || '—'}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <span style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--green-50)', border: '1px solid var(--green-100)', color: 'var(--green-700)', fontSize: '0.75rem', fontWeight: 700 }}>Manager: APPROVED</span>
                      {verifyResult.exitRequest?.requiresHrApproval && (
                        <span style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--green-50)', border: '1px solid var(--green-100)', color: 'var(--green-700)', fontSize: '0.75rem', fontWeight: 700 }}>HR: APPROVED</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      {verifyResult.status === 'ACTIVE' && (
                        <button className="btn btn-primary btn-full" style={{ padding: '11px 0' }} onClick={() => allowExit(verifyResult.id)}>
                          ✅ Allow Exit — Record Exit Time
                        </button>
                      )}
                      {verifyResult.status === 'USED' && (
                        <button className="btn btn-success btn-full" style={{ padding: '11px 0' }} onClick={() => markReturned(verifyResult.id)}>
                          🔄 Mark as Returned
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Today's Gate Passes */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Clock size={15} /> Today's Approved Gate Passes</h3>
          <span className="badge badge-blue">{passes.length} passes</span>
        </div>
        {passes.length === 0 ? (
          <div className="empty-state">
            <Shield size={36} />
            <h4>No Passes Today</h4>
            <p>No approved gate passes for today.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pass ID</th><th>Employee</th><th>Department</th>
                  <th>Exit Time</th><th>Expected Return</th><th>Status</th>
                  <th>Actual Exit</th><th>Actual Return</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--blue-700)' }}>{p.passNumber}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{p.employee?.firstName} {p.employee?.lastName}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--slate-400)' }}>{p.employee?.employeeCode}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{p.employee?.department?.name}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{p.exitRequest?.exitTime}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{p.exitRequest?.expectedReturnTime}</td>
                    <td><span className={`badge ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span></td>
                    <td style={{ fontSize: '0.75rem' }}>{p.gateLogs?.[0]?.actualExitTime ? fmtTime(p.gateLogs[0].actualExitTime) : '—'}</td>
                    <td style={{ fontSize: '0.75rem' }}>{p.gateLogs?.[0]?.actualReturnTime ? fmtTime(p.gateLogs[0].actualReturnTime) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// ADMIN DASHBOARD
// =============================================
function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users/employees'),
      api.get('/departments'),
      api.get('/exit-requests/pending'),
      api.get('/leave/requests/pending'),
    ]).then(([emps, depts, exits, leaves]) => {
      setStats({
        employees: (emps.data?.data || []).length,
        departments: (depts.data?.data || []).length,
        pendingExits: (exits.data?.data || []).length,
        pendingLeaves: (leaves.data?.data || []).length,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <h2>Admin Dashboard — Welcome, {user?.employee?.firstName}!</h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: 2 }}>Super Admin · Full system access</p>
        </div>
      </div>

      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-card-icon blue"><Users size={20} /></div>
          <div><div className="stat-card-value">{stats.employees}</div><div className="stat-card-label">Total Employees</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><TrendingUp size={20} /></div>
          <div><div className="stat-card-value">{stats.departments}</div><div className="stat-card-label">Departments</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon amber"><Clock size={20} /></div>
          <div><div className="stat-card-value">{stats.pendingExits}</div><div className="stat-card-label">Pending Exit Requests</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon amber"><Calendar size={20} /></div>
          <div><div className="stat-card-value">{stats.pendingLeaves}</div><div className="stat-card-label">Pending Leave Requests</div></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Quick Admin Actions</h3></div>
          <div className="card-body space-y-3">
            <a href="/employees" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><Users size={15} /> Manage Employees</a>
            <a href="/admin/users" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><Users size={15} /> Manage User Roles</a>
            <a href="/admin/departments" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><FileText size={15} /> Manage Departments</a>
            <a href="/admin/leave-types" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><Calendar size={15} /> Manage Leave Types</a>
            <a href="/admin/audit" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><ClipboardList size={15} /> View Audit Logs</a>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">System Info</h3></div>
          <div className="card-body">
            {[
              ['Database', 'MySQL (smart_gate_db)'],
              ['Backend', 'Node.js + Express + Prisma'],
              ['Authentication', 'JWT (access + refresh tokens)'],
              ['Real-time', 'Socket.io WebSocket'],
              ['Roles', 'Super Admin, HR, Manager, Employee, Security'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--slate-100)', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// EXIT REQUEST MODAL
// =============================================
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
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply Exit Permission"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="exit-form" type="submit" disabled={submitting}>{submitting ? <Spinner white size="sm" /> : null} Submit Request</button></>}
    >
      <form id="exit-form" onSubmit={submit} className="space-y-3">
        {error && <div className="alert alert-error"><AlertTriangle size={14} /><span>{error}</span></div>}
        <div className="form-group">
          <label className="form-label">Reason <span className="required">*</span></label>
          <input className="form-control" placeholder="e.g. Conference, Doctor Visit, Client Meeting" value={form.reason} onChange={set('reason')} required />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Exit Date <span className="required">*</span></label>
            <input type="date" className="form-control" value={form.exitDate} onChange={set('exitDate')} required min={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group">
            <label className="form-label">Destination <span className="required">*</span></label>
            <input className="form-control" placeholder="e.g. Pune Conference Center" value={form.destination} onChange={set('destination')} required />
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Exit Time <span className="required">*</span></label>
            <input type="time" className="form-control" value={form.exitTime} onChange={set('exitTime')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Expected Return Time <span className="required">*</span></label>
            <input type="time" className="form-control" value={form.expectedReturnTime} onChange={set('expectedReturnTime')} required />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description (optional)</label>
          <textarea className="form-control" rows={2} placeholder="Additional details..." value={form.description} onChange={set('description')} />
        </div>
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

// =============================================
// LEAVE REQUEST MODAL
// =============================================
function LeaveRequestModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) api.get('/leave/types').then(r => { setLeaveTypes(r.data?.data || []); if (r.data?.data?.[0]) setForm(f => ({ ...f, leaveTypeId: r.data.data[0].id })); });
  }, [open]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/leave/requests', form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply for Leave"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="leave-form" type="submit" disabled={submitting}>{submitting ? <Spinner white size="sm" /> : null} Submit Leave Request</button></>}
    >
      <form id="leave-form" onSubmit={submit} className="space-y-3">
        {error && <div className="alert alert-error"><AlertTriangle size={14} /><span>{error}</span></div>}
        <div className="form-group">
          <label className="form-label">Leave Type <span className="required">*</span></label>
          <select className="form-control" value={form.leaveTypeId} onChange={set('leaveTypeId')} required>
            <option value="">Select Leave Type</option>
            {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
          </select>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">From Date <span className="required">*</span></label>
            <input type="date" className="form-control" value={form.fromDate} onChange={set('fromDate')} required min={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date <span className="required">*</span></label>
            <input type="date" className="form-control" value={form.toDate} onChange={set('toDate')} required min={form.fromDate || new Date().toISOString().split('T')[0]} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Reason <span className="required">*</span></label>
          <textarea className="form-control" rows={3} placeholder="Reason for leave..." value={form.reason} onChange={set('reason')} required />
        </div>
      </form>
    </Modal>
  );
}

// =============================================
// MAIN DASHBOARD PAGE
// =============================================
export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return null;

  const renderDashboard = () => {
    switch (user.role) {
      case 'EMPLOYEE': return <EmployeeDashboard />;
      case 'MANAGER': return <ManagerDashboard />;
      case 'HR': return <HRDashboard />;
      case 'SECURITY_GUARD': return <SecurityDashboard />;
      case 'SUPER_ADMIN': return <AdminDashboard />;
      default: return <div>Unknown role</div>;
    }
  };

  return (
    <AppLayout>
      {renderDashboard()}
    </AppLayout>
  );
}
