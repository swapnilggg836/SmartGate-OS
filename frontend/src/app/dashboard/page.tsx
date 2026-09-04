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
  const emp = user?.employee;

  const [data, setData] = useState<any>({
    exitRequests: [],
    activePass: null,
    totalExits: 0,
    passesCount: 0,
    pendingExits: 0,
    approvedExits: 0
  });
  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);

  const loadData = React.useCallback(() => {
    Promise.all([
      api.get('/exit-requests'),
      api.get('/gate-passes/my-active').catch(() => ({ data: { data: null } })),
      api.get('/gate-passes').catch(() => ({ data: { data: [] } }))
    ]).then(([exit, activePass, passes]) => {
      const exitList = exit.data?.data || [];
      const passList = passes.data?.data || [];
      const pendingExits = exitList.filter((r: any) => r.status.includes('PENDING')).length;
      const approvedExits = exitList.filter((r: any) => r.status === 'APPROVED' || r.status === 'COMPLETED').length;

      setData({
        exitRequests: exitList,
        activePass: activePass.data?.data,
        totalExits: exitList.length,
        passesCount: passList.length,
        pendingExits,
        approvedExits
      });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div className="card">
        <div className="card-body" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ marginBottom: 2 }}>Welcome back, {emp?.firstName || 'User'}! 👋</h2>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>
                {emp?.employeeCode} · {emp?.designation} · {emp?.departmentName || '—'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowExitModal(true)}>
                <Plus size={14} /> Apply Exit Permission
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

      {/* Employee Exit Permission & Pass Summary */}
      <div>
        <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} style={{ color: 'var(--blue-700)' }} /> My Activity & Action Summary
        </h3>
        <div className="grid-4">
          <div className="stat-card">
            <div className="stat-card-icon blue"><Clock size={20} /></div>
            <div>
              <div className="stat-card-value">{data.totalExits}</div>
              <div className="stat-card-label">Exit Permissions Applied</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green"><QrCode size={20} /></div>
            <div>
              <div className="stat-card-value">{data.passesCount}</div>
              <div className="stat-card-label">Gate Passes Issued</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon amber"><ClipboardList size={20} /></div>
            <div>
              <div className="stat-card-value">{data.pendingExits}</div>
              <div className="stat-card-label">Pending Approval</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green"><CheckCircle2 size={20} /></div>
            <div>
              <div className="stat-card-value">{data.approvedExits}</div>
              <div className="stat-card-label">Approved & Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Exit Permission Requests */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><FileText size={15} /> Recent Exit Permission Requests</h3>
          <a href="/requests" style={{ fontSize: '0.75rem', color: 'var(--blue-700)', textDecoration: 'none', fontWeight: 600 }}>View All</a>
        </div>
        {data.exitRequests.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 24px' }}>
            <FileText size={32} />
            <p>No exit requests yet</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExitModal(true)} style={{ marginTop: 8 }}>
              <Plus size={14} /> Apply Now
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Exit Date</th>
                  <th>Exit Window</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.exitRequests.slice(0, 5).map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.destination}</td>
                    <td>{fmtDate(r.exitDate)}</td>
                    <td className="font-mono">{r.exitTime} → {r.expectedReturnTime}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                    <td><span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <ExitRequestModal open={showExitModal} onClose={() => setShowExitModal(false)} onSuccess={() => { setShowExitModal(false); loadData(); }} />
    </div>
  );
}

// =============================================
// MANAGER DASHBOARD
// =============================================
function ManagerDashboard() {
  const { user } = useAuth();
  const emp = user?.employee;
  const [pending, setPending] = useState<any[]>([]);
  const [stats, setStats] = useState({ exits: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [rejectComment, setRejectComment] = useState('');

  const load = () => {
    api.get('/exit-requests/pending').then(exits => {
      const all = exits.data?.data || [];
      setPending(all);
      setStats({ exits: all.length, approved: 0, rejected: 0 });
    }).catch(() => {
      setPending([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    await api.patch(`/exit-requests/${id}/review`, { status: 'APPROVED', comments: 'Approved' });
    load();
  };

  const reject = async () => {
    await api.patch(`/exit-requests/${rejectModal.id}/review`, { status: 'REJECTED', comments: rejectComment });
    setRejectModal({ open: false, id: '' });
    setRejectComment('');
    load();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <h2>Welcome, {emp?.firstName || 'Manager'}!</h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: 2 }}>{emp?.designation || 'Manager'} · {emp?.departmentName || '—'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3">
        <div className="stat-card">
          <div className="stat-card-icon amber"><Clock size={20} /></div>
          <div><div className="stat-card-value">{pending.length}</div><div className="stat-card-label">Pending Exit Requests</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><CheckCircle2 size={20} /></div>
          <div><div className="stat-card-value">{pending.filter(p => !p.isUrgent).length}</div><div className="stat-card-label">Routine Requests</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red" style={{ background: 'var(--red-50)', color: 'var(--red-600)' }}><AlertTriangle size={20} /></div>
          <div><div className="stat-card-value" style={{ color: 'var(--red-600)' }}>{pending.filter(p => p.isUrgent).length}</div><div className="stat-card-label">Urgent Exit Requests</div></div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><ClipboardList size={15} /> Pending Exit Approvals — Your Team</h3>
          <span className="badge badge-amber">{pending.length} pending</span>
        </div>
        {pending.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={36} />
            <h4>All Caught Up!</h4>
            <p>No pending exit permissions from your team.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Destination</th>
                  <th>Exit Window</th>
                  <th>Reason</th>
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
                    <td style={{ fontWeight: 600 }}>{r.destination}</td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      <div>{fmtDate(r.exitDate)}</div>
                      <div className="font-mono" style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>{r.exitTime} → {r.expectedReturnTime}</div>
                    </td>
                    <td style={{ color: 'var(--slate-600)', fontSize: '0.75rem', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{fmtDate(r.createdAt)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span>
                      {r.isUrgent && <span className="badge badge-danger" style={{ marginLeft: 4 }}>🚨 URGENT</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => approve(r.id)}>
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button className="btn btn-danger-outline btn-sm" onClick={() => { setRejectModal({ open: true, id: r.id }); setRejectComment(''); }}>
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
      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: '' })} title="Reject Request — Add Reason"
        footer={
          <><button className="btn btn-ghost" onClick={() => setRejectModal({ open: false, id: '' })}>Cancel</button>
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
  const emp = user?.employee;
  const [pending, setPending] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [rejectComment, setRejectComment] = useState('');

  const load = () => {
    Promise.all([
      api.get('/exit-requests/pending-hr').catch(() => ({ data: { data: [] } })),
      api.get('/users/employees').catch(() => ({ data: { data: [] } }))
    ]).then(([exits, emps]) => {
      const all = exits.data?.data || [];
      setPending(all);
      setStats({ totalEmployees: (emps.data?.data || []).length });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    await api.patch(`/exit-requests/${id}/review`, { status: 'APPROVED', comments: 'HR Approved' });
    load();
  };

  const reject = async () => {
    await api.patch(`/exit-requests/${rejectModal.id}/review`, { status: 'REJECTED', comments: rejectComment });
    setRejectModal({ open: false, id: '' });
    load();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <h2>HR Dashboard — Welcome, {emp?.firstName || 'HR'}!</h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: 2 }}>Human Resources · Second-level exit permission authority</p>
        </div>
      </div>

      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-card-icon amber"><ClipboardList size={20} /></div>
          <div><div className="stat-card-value">{pending.length}</div><div className="stat-card-label">Awaiting HR Clearance</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><Users size={20} /></div>
          <div><div className="stat-card-value">{stats.totalEmployees}</div><div className="stat-card-label">Total Employees</div></div>
        </div>
      </div>

      {/* HR Pending Queue */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><ClipboardList size={15} /> Awaiting HR Exit Clearance</h3>
          {pending.length > 0 && <span className="badge badge-amber">{pending.length} pending</span>}
        </div>
        {pending.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={36} />
            <h4>No HR Reviews Pending</h4>
            <p>All exit permission requests have been processed.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Employee</th><th>Destination</th><th>Exit Window</th><th>Manager Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.employee?.firstName} {r.employee?.lastName}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--slate-400)' }}>{r.employee?.employeeCode}</div>
                    </td>
                    <td><strong>{r.destination}</strong></td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      <div>{fmtDate(r.exitDate)}</div>
                      <div className="font-mono" style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>{r.exitTime} → {r.expectedReturnTime}</div>
                    </td>
                    <td><span className="badge badge-green">Manager Approved</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => approve(r.id)}><CheckCircle2 size={13} /> Approve</button>
                        <button className="btn btn-danger-outline btn-sm" onClick={() => { setRejectModal({ open: true, id: r.id }); setRejectComment(''); }}><XCircle size={13} /> Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: '' })} title="Reject — Add Reason"
        footer={<><button className="btn btn-ghost" onClick={() => setRejectModal({ open: false, id: '' })}>Cancel</button><button className="btn btn-danger" onClick={reject} disabled={!rejectComment.trim()}>Confirm Reject</button></>}
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
      api.get('/gate-passes/today').catch(() => ({ data: { data: [] } })),
    ]).then(([emps, depts, exits, passes]) => {
      setStats({
        employees: (emps.data?.data || []).length,
        departments: (depts.data?.data || []).length,
        pendingExits: (exits.data?.data || []).length,
        todayPasses: (passes.data?.data || []).length,
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
          <div className="stat-card-icon purple" style={{ background: '#f5f3ff', color: '#7c3aed' }}><QrCode size={20} /></div>
          <div><div className="stat-card-value" style={{ color: '#7c3aed' }}>{stats.todayPasses}</div><div className="stat-card-label">Today's Gate Passes</div></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Quick Admin Actions</h3></div>
          <div className="card-body space-y-3">
            <a href="/employees" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><Users size={15} /> Manage Employees</a>
            <a href="/admin/users" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><Users size={15} /> Manage User Roles</a>
            <a href="/admin/departments" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><FileText size={15} /> Manage Departments</a>
            <a href="/admin/visitors" className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start' }}><Users size={15} /> Visitor Management</a>
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
// GM (GENERAL MANAGER) DASHBOARD
// =============================================
function GMDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [criticalExits, setCriticalExits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ open: boolean; id: string; action: 'APPROVE' | 'REJECT' | 'SEND_BACK' }>({ open: false, id: '', action: 'APPROVE' });
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/users/company/summary').catch(() => ({ data: { data: null } })),
      api.get('/exit-requests').catch(() => ({ data: { data: [] } })),
    ]).then(([sumRes, exitRes]) => {
      setSummary(sumRes.data?.data);
      const allExits = exitRes.data?.data || [];

      // GM sees: Urgent exits, Critical exits, or Pending GM
      const gmExits = allExits.filter((e: any) =>
        e.isUrgent || ['PENDING_GM', 'PENDING_HR'].includes(e.status)
      );

      setCriticalExits(gmExits);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async () => {
    setSubmitting(true);
    try {
      const url = `/exit-requests/${actionModal.id}/review`;

      const statusMap: Record<string, string> = {
        APPROVE: 'APPROVED',
        REJECT: 'REJECTED',
        SEND_BACK: 'PENDING_MANAGER'
      };

      await api.patch(url, {
        status: statusMap[actionModal.action],
        comments: comments || `GM ${actionModal.action} decision`
      });

      setActionModal({ open: false, id: '', action: 'APPROVE' });
      setComments('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  const overview = summary?.overview || {};
  const deptSummary = summary?.departmentSummary || [];
  const totalCriticalPending = criticalExits.filter(e => ['PENDING_GM', 'PENDING_HR', 'PENDING_MANAGER'].includes(e.status)).length;

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <div className="card" style={{ borderLeft: '4px solid var(--blue-700)', background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)' }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-blue" style={{ fontWeight: 800 }}>EXECUTIVE PORTAL</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Selective Authority & Corporate Oversight</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-800)', marginTop: 4 }}>
                Welcome, {user?.employee?.firstName || 'General Manager'}!
              </h2>
              <p style={{ color: 'var(--slate-600)', fontSize: '0.82rem', marginTop: 2 }}>
                High-level governance, critical escalation reviews & corporate operations matrix
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowExitModal(true)}>
                <Plus size={14} /> My Exit Permission
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Executive KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--blue-700)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>Total Workforce</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--blue-700)', marginTop: 2 }}>{overview.totalEmployees || 0}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--slate-400)' }}>Across all departments</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--green-600)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--green-700)' }}>On-Site Today</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--green-600)', marginTop: 2 }}>{overview.presentToday || 0}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--green-700)' }}>Active in premises</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--amber-500)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--amber-700)' }}>Currently Outside</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--amber-600)', marginTop: 2 }}>{overview.currentlyOutside || 0}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--amber-700)' }}>On gate pass permission</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: `4px solid ${totalCriticalPending > 0 ? 'var(--red-600)' : 'var(--slate-400)'}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: totalCriticalPending > 0 ? 'var(--red-600)' : 'var(--slate-500)' }}>
            🔴 Critical & Escalated
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalCriticalPending > 0 ? 'var(--red-600)' : 'var(--slate-800)', marginTop: 2 }}>
            {totalCriticalPending}
          </div>
          <div style={{ fontSize: '0.68rem', color: totalCriticalPending > 0 ? 'var(--red-600)' : 'var(--slate-400)' }}>
            {totalCriticalPending > 0 ? 'Executive review required' : 'All clear'}
          </div>
        </div>
      </div>

      {/* 🔴 Section: Critical & Escalated Requests Queue */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate-800)' }}>
            <AlertTriangle size={16} color="var(--red-600)" /> Critical Requests & Urgent Exit Escalations
          </h3>
          <span className="badge badge-blue">Selective GM Scope</span>
        </div>

        {criticalExits.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={36} color="var(--green-600)" />
            <h4>No Escalated Cases</h4>
            <p>Routine requests are handled by Department Managers and HR. Only critical cases appear here.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Details</th>
                  <th>Duration / Window</th>
                  <th>Approval Chain</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {criticalExits.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{e.employee?.firstName} {e.employee?.lastName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{e.employee?.employeeCode} · {e.employee?.department?.name}</div>
                    </td>
                    <td>
                      <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                        🚨 URGENT EXIT
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      <strong>{e.destination}</strong> — {e.reason}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.78rem' }}>
                      {fmtDate(e.exitDate)} · {e.exitTime}–{e.expectedReturnTime}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'var(--green-50)', color: 'var(--green-700)', fontWeight: 600 }}>
                        Mgr: ✓
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadgeClass(e.status)}`}>{statusLabel(e.status)}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-success btn-xs"
                          onClick={() => setActionModal({ open: true, id: e.id, action: 'APPROVE' })}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger-outline btn-xs"
                          onClick={() => setActionModal({ open: true, id: e.id, action: 'REJECT' })}
                        >
                          Reject
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

      {/* 🏢 Section: High-Level Department Operations Matrix */}
      {deptSummary.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Users size={16} /> Department Operations & Workforce Summary
            </h3>
            <span className="badge badge-blue">Executive Aggregates</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Code</th>
                  <th>Total Staff</th>
                  <th>Present On-Site</th>
                  <th>Currently Outside</th>
                  <th>Overdue / Late</th>
                </tr>
              </thead>
              <tbody>
                {deptSummary.map((d: any) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700 }}>{d.name}</td>
                    <td className="font-mono">{d.code}</td>
                    <td style={{ fontWeight: 600 }}>{d.total}</td>
                    <td><span className="badge badge-success">{d.present}</span></td>
                    <td><span className="badge badge-amber">{d.outside}</span></td>
                    <td>
                      {d.late > 0 ? (
                        <span className="badge badge-danger">🚨 {d.late} OVERDUE</span>
                      ) : (
                        <span className="badge badge-success">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Modal */}
      <Modal
        open={actionModal.open}
        onClose={() => setActionModal({ open: false, id: '', action: 'APPROVE' })}
        title={`Executive Decision: ${actionModal.action}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setActionModal({ open: false, id: '', action: 'APPROVE' })}>
              Cancel
            </button>
            <button
              className={`btn ${actionModal.action === 'APPROVE' ? 'btn-success' : 'btn-danger'}`}
              onClick={handleAction}
              disabled={submitting}
            >
              {submitting ? <><Spinner white size="sm" /> Processing...</> : `Confirm ${actionModal.action}`}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)' }}>
            You are recording an executive <strong>{actionModal.action}</strong> on this exit request.
          </p>
          <div className="form-group">
            <label className="form-label">Executive Notes / Reason</label>
            <textarea
              className="form-control"
              rows={3}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="e.g. Approved under executive emergency exception..."
            />
          </div>
        </div>
      </Modal>

      {/* Personal Exit Modal for GM */}
      <ExitRequestModal open={showExitModal} onClose={() => setShowExitModal(false)} onSuccess={() => { setShowExitModal(false); load(); }} />
    </div>
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
      case 'GM' as any: return <GMDashboard />;
      default: return <GMDashboard />;
    }
  };

  return (
    <AppLayout>
      {renderDashboard()}
    </AppLayout>
  );
}
