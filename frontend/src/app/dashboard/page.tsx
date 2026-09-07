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
  Shield, AlertTriangle, CheckCircle2, XCircle, Plus, TrendingUp,
  Eye, LogOut, LogIn, RotateCcw, Search, Check, ExternalLink,
  LayoutGrid, List
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
      api.get('/exit-requests/my').catch(() => api.get('/exit-requests?mine=true')),
      api.get('/gate-passes/my-active').catch(() => ({ data: { data: null } })),
      api.get('/gate-passes/my-passes').catch(() => api.get('/gate-passes')).catch(() => ({ data: { data: [] } }))
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
  const [selectedPass, setSelectedPass] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'INSIDE' | 'OUTSIDE' | 'RETURNED'>('ALL');
  const [tableFilter, setTableFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const load = () => {
    api.get('/gate-passes/today').then(r => {
      setPasses(r.data?.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Helper to determine exact real-time campus movement status
  const getPassMovementState = (p: any): 'INSIDE' | 'OUTSIDE' | 'RETURNED' => {
    if (!p) return 'INSIDE';
    const latestLog = p.gateLogs?.[0];
    if (latestLog?.exitStatus === 'EXITED' && latestLog?.returnStatus === 'PENDING') {
      return 'OUTSIDE';
    }
    if (latestLog?.returnStatus === 'RETURNED' || latestLog?.returnStatus === 'LATE_RETURN' || p.status === 'USED') {
      return 'RETURNED';
    }
    return 'INSIDE';
  };

  const verify = async (queryToUse?: string) => {
    const q = (queryToUse !== undefined ? queryToUse : search).trim();
    if (!q) return;
    setVerifying(true);
    setSearch(q);
    try {
      const res = await api.post('/gate-passes/verify', { query: q });
      setVerifyResult(res.data?.data);
      // Scroll to verify section smoothly
      if (typeof window !== 'undefined') {
        const verifyElem = document.getElementById('gate-verify-card');
        if (verifyElem) verifyElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err: any) {
      setVerifyResult({ error: err.response?.data?.message || 'Pass not found or not approved for today.' });
    } finally {
      setVerifying(false);
    }
  };

  const allowExit = async (gatePassId: string) => {
    setActionLoadingId(gatePassId);
    try {
      const res = await api.post('/security/exit', { gatePassId });
      setBanner({ type: 'success', message: res.data?.message || 'Gate Exit recorded successfully. Departure logged.' });
      await load();
      setVerifyResult(null);
      if (selectedPass?.id === gatePassId) setSelectedPass(null);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.response?.data?.message || 'Failed to record exit.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const markReturned = async (gatePassId: string) => {
    setActionLoadingId(gatePassId);
    try {
      const res = await api.post('/security/return', { gatePassId });
      setBanner({ type: 'success', message: res.data?.message || 'Gate Return (Re-In) recorded successfully. Entry logged.' });
      await load();
      setVerifyResult(null);
      if (selectedPass?.id === gatePassId) setSelectedPass(null);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.response?.data?.message || 'Failed to record return.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const allowReExit = async (gatePassId: string) => {
    setActionLoadingId(gatePassId);
    try {
      const res = await api.post('/security/re-exit', { gatePassId });
      setBanner({ type: 'success', message: res.data?.message || 'Re-Exit recorded successfully. Employee authorized to step out again.' });
      await load();
      setVerifyResult(null);
      if (selectedPass?.id === gatePassId) setSelectedPass(null);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.response?.data?.message || 'Failed to record re-exit.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const insideCount = passes.filter(p => getPassMovementState(p) === 'INSIDE').length;
  const outsideCount = passes.filter(p => getPassMovementState(p) === 'OUTSIDE').length;
  const returnedCount = passes.filter(p => getPassMovementState(p) === 'RETURNED').length;

  const filteredPasses = passes.filter(p => {
    const st = getPassMovementState(p);
    if (filterTab !== 'ALL' && st !== filterTab) return false;
    if (!tableFilter.trim()) return true;
    const q = tableFilter.toLowerCase();
    const empName = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.toLowerCase();
    const empCode = (p.employee?.employeeCode || '').toLowerCase();
    const passNum = (p.passNumber || '').toLowerCase();
    const dept = (p.employee?.department?.name || '').toLowerCase();
    return empName.includes(q) || empCode.includes(q) || passNum.includes(q) || dept.includes(q);
  });

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Security Header */}
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Shield size={20} style={{ color: 'var(--blue-700)' }} /> Security Gate Dashboard
              </h2>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: 4, marginBottom: 0 }}>
                Logged in as: <strong>{user?.employee?.firstName} {user?.employee?.lastName}</strong> · Security Guard (Gate 1)
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Refresh Passes
            </button>
          </div>
        </div>
      </div>

      {/* Action Banner */}
      {banner && (
        <div className={`alert ${banner.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            {banner.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{banner.message}</span>
          </div>
          <button onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Verify Panel */}
      <div id="gate-verify-card" className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}><QrCode size={15} /> Verify Gate Pass</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>1-Click Verify from table below or enter code</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="form-control"
              placeholder="Enter Gate Pass ID (e.g. GP-2026-00016) or Employee Code (e.g. EMP1024)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verify()}
              style={{ flex: '1 1 260px' }}
            />
            <button className="btn btn-primary" onClick={() => verify()} disabled={verifying} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {verifying ? <Spinner white size="sm" /> : <Shield size={15} />}
              Verify
            </button>
            {verifyResult && (
              <button className="btn btn-ghost" onClick={() => { setVerifyResult(null); setSearch(''); }}>
                Clear
              </button>
            )}
          </div>

          {verifyResult && (
            <div style={{ marginTop: 16 }}>
              {verifyResult.error ? (
                <div className="alert alert-error"><AlertTriangle size={15} /><span>{verifyResult.error}</span></div>
              ) : (() => {
                const vState = getPassMovementState(verifyResult);
                return (
                  <div className="card" style={{ border: '2px solid var(--blue-400)', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.12)' }}>
                    <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: 'white', padding: '14px 20px', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <QrCode size={20} />
                        <strong style={{ fontSize: '1.05rem', letterSpacing: '0.04em' }}>{verifyResult.passNumber}</strong>
                      </div>
                      <div>
                        {vState === 'OUTSIDE' && (
                          <span className="badge" style={{ background: '#fef3c7', color: '#b45309', border: 'none', fontWeight: 800, fontSize: '0.78rem' }}>
                            🟡 CURRENTLY OUTSIDE
                          </span>
                        )}
                        {vState === 'RETURNED' && (
                          <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', fontWeight: 800, fontSize: '0.78rem' }}>
                            🔵 RETURNED TO CAMPUS
                          </span>
                        )}
                        {vState === 'INSIDE' && (
                          <span className="badge" style={{ background: '#dcfce7', color: '#15803d', border: 'none', fontWeight: 800, fontSize: '0.78rem' }}>
                            🟢 INSIDE (READY FOR EXIT)
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px 20px', marginBottom: 14 }}>
                        {[
                          ['Employee', `${verifyResult.employee?.firstName} ${verifyResult.employee?.lastName}`],
                          ['Employee Code', verifyResult.employee?.employeeCode],
                          ['Department', verifyResult.employee?.department?.name],
                          ['Approved Exit Date', fmtDate(verifyResult.exitRequest?.exitDate)],
                          ['Allowed Exit Window', `${verifyResult.exitRequest?.exitTime} → ${verifyResult.exitRequest?.expectedReturnTime}`],
                          ['Destination', verifyResult.exitRequest?.destination],
                          ['Reason for Leaving', verifyResult.exitRequest?.reason],
                        ].map(([label, value]) => (
                          <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed var(--slate-100)', fontSize: '0.8125rem' }}>
                            <span style={{ color: 'var(--slate-500)' }}>{label}</span>
                            <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{value || '—'}</span>
                          </div>
                        ))}
                      </div>

                      {/* Approvals status badges */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                        <span style={{ padding: '5px 10px', borderRadius: 6, background: '#dcfce7', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                          ✓ Manager: APPROVED
                        </span>
                        {verifyResult.exitRequest?.requiresHrApproval && (
                          <span style={{ padding: '5px 10px', borderRadius: 6, background: '#dcfce7', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                            ✓ HR Director: APPROVED
                          </span>
                        )}
                      </div>

                      {/* Dynamic 1-Click Action Buttons */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {vState === 'INSIDE' && (
                          <button
                            className="btn btn-success"
                            style={{ flex: '1 1 200px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: '0.92rem', background: '#16a34a', color: '#fff' }}
                            onClick={() => allowExit(verifyResult.id)}
                            disabled={actionLoadingId === verifyResult.id}
                          >
                            {actionLoadingId === verifyResult.id ? <Spinner white size="sm" /> : <LogOut size={18} />}
                            ✅ Allow Exit — Record Physical Departure
                          </button>
                        )}

                        {vState === 'OUTSIDE' && (
                          <button
                            className="btn btn-warning"
                            style={{ flex: '1 1 200px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: '0.92rem', background: '#d97706', color: '#fff' }}
                            onClick={() => markReturned(verifyResult.id)}
                            disabled={actionLoadingId === verifyResult.id}
                          >
                            {actionLoadingId === verifyResult.id ? <Spinner white size="sm" /> : <LogIn size={18} />}
                            ↩️ Record Re-In — Check In to Campus
                          </button>
                        )}

                        {vState === 'RETURNED' && (
                          <div style={{ display: 'flex', gap: 10, flex: '1 1 240px', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-primary"
                              style={{ flex: 1, minWidth: 180, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: '0.92rem', background: '#2563eb', color: '#fff' }}
                              onClick={() => allowReExit(verifyResult.id)}
                              disabled={actionLoadingId === verifyResult.id}
                            >
                              {actionLoadingId === verifyResult.id ? <Spinner white size="sm" /> : <RotateCcw size={18} />}
                              🔄 Allow Re-Exit — Step Out Again
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                              onClick={() => markReturned(verifyResult.id)}
                              disabled={actionLoadingId === verifyResult.id}
                              title="Record Re-In entry"
                            >
                              {actionLoadingId === verifyResult.id ? <Spinner size="sm" /> : <LogIn size={16} />}
                              ↩️ Record Re-In
                            </button>
                          </div>
                        )}

                        <button
                          className="btn btn-outline"
                          style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                          onClick={() => setSelectedPass(verifyResult)}
                        >
                          <Eye size={16} /> View Digital Pass & QR
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Today's Gate Passes Section */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 className="card-title" style={{ margin: 0 }}><Clock size={16} /> Today's Approved Gate Passes</h3>
            <span className="badge badge-blue">{filteredPasses.length} / {passes.length} passes</span>
          </div>

          {/* Right side controls: Filter Tabs + View Mode Toggle */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filter Chips - swipeable horizontally on mobile */}
            <div style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              maxWidth: '100%',
              paddingBottom: 2,
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none'
            }}>
              <button
                className={`btn btn-sm ${filterTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterTab('ALL')}
                style={{ fontSize: '0.75rem', padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}
              >
                All ({passes.length})
              </button>
              <button
                className={`btn btn-sm ${filterTab === 'INSIDE' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => setFilterTab('INSIDE')}
                style={{ fontSize: '0.75rem', padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}
              >
                🟢 Inside ({insideCount})
              </button>
              <button
                className={`btn btn-sm ${filterTab === 'OUTSIDE' ? 'btn-warning' : 'btn-ghost'}`}
                onClick={() => setFilterTab('OUTSIDE')}
                style={{ fontSize: '0.75rem', padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap', background: filterTab === 'OUTSIDE' ? '#d97706' : undefined, color: filterTab === 'OUTSIDE' ? '#fff' : undefined }}
              >
                🟡 Outside ({outsideCount})
              </button>
              <button
                className={`btn btn-sm ${filterTab === 'RETURNED' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterTab('RETURNED')}
                style={{ fontSize: '0.75rem', padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}
              >
                🔵 Returned ({returnedCount})
              </button>
            </div>

            {/* View Mode Switcher (Cards vs Table) */}
            <div style={{ display: 'inline-flex', background: 'var(--slate-100)', padding: 2, borderRadius: 8, border: '1px solid var(--slate-200)' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '4px 9px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                  color: viewMode === 'cards' ? 'var(--blue-700)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="Cards view (Recommended for mobile/touch)"
              >
                <LayoutGrid size={13} /> Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '4px 9px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? 'var(--blue-700)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="Table View (Best for desktop monitors)"
              >
                <List size={13} /> Table
              </button>
            </div>
          </div>
        </div>

        {/* Search filter input inside card */}
        {passes.length > 0 && (
          <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Search size={14} style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by employee name, badge ID, or pass number..."
              value={tableFilter}
              onChange={e => setTableFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.84rem', width: '100%', color: '#334155' }}
            />
            {tableFilter && (
              <button onClick={() => setTableFilter('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem' }}>✕</button>
            )}
          </div>
        )}

        {filteredPasses.length === 0 ? (
          <div className="empty-state">
            <Shield size={36} />
            <h4>No Passes Match Your Selection</h4>
            <p>{passes.length === 0 ? "Approved employee exit passes for today will appear here automatically." : "Try switching filter tabs or clearing the search."}</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* ========================================================
             TOUCH-FRIENDLY RESPONSIVE CARDS VIEW (DEFAULT / MOBILE)
             ======================================================== */
          <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {filteredPasses.map((p: any) => {
              const mState = getPassMovementState(p);
              const latestLog = p.gateLogs?.[0];

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    border: mState === 'OUTSIDE' ? '2px solid #f59e0b' : mState === 'RETURNED' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  {/* Top: Pass Number + Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => verify(p.passNumber)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      title="Click to Verify Pass in Scanner"
                    >
                      <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--blue-700)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                        {p.passNumber}
                      </span>
                    </button>

                    <div>
                      {mState === 'OUTSIDE' && (
                        <span className="badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 800, fontSize: '0.75rem', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          🟡 OUTSIDE (ON PASS)
                        </span>
                      )}
                      {mState === 'RETURNED' && (
                        <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 800, fontSize: '0.75rem', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          🔵 RETURNED
                        </span>
                      )}
                      {mState === 'INSIDE' && (
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 800, fontSize: '0.75rem', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          🟢 INSIDE (READY)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Employee Name and Info */}
                  <div>
                    <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                      {p.employee?.firstName} {p.employee?.lastName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: 3 }}>
                      <span style={{ color: 'var(--blue-700)', fontWeight: 700 }}>{p.employee?.employeeCode}</span> · {p.employee?.department?.name || 'Department'}
                    </div>
                  </div>

                  {/* Exit Window & Details Pill Box */}
                  <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 12px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Exit Window:</span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{p.exitRequest?.exitTime || '—'} → {p.exitRequest?.expectedReturnTime || '—'}</span>
                    </div>
                    {p.exitRequest?.destination && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Destination:</span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{p.exitRequest.destination}</span>
                      </div>
                    )}
                    {latestLog?.actualExitTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Actual Exit:</span>
                        <span style={{ color: '#16a34a', fontWeight: 800 }}>{fmtTime(latestLog.actualExitTime)}</span>
                      </div>
                    )}
                    {latestLog?.actualReturnTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Actual Return:</span>
                        <span style={{ color: '#2563eb', fontWeight: 800 }}>{fmtTime(latestLog.actualReturnTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* BIG, PROMINENT 46px TOUCH BUTTON */}
                  <div>
                    {mState === 'INSIDE' && (
                      <button
                        className="btn btn-success"
                        onClick={() => allowExit(p.id)}
                        disabled={actionLoadingId === p.id}
                        style={{
                          width: '100%',
                          minHeight: 46,
                          fontSize: '0.92rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                        }}
                      >
                        {actionLoadingId === p.id ? <Spinner white size="sm" /> : <LogOut size={18} />}
                        🟢 ALLOW EXIT (Physical Departure)
                      </button>
                    )}

                    {mState === 'OUTSIDE' && (
                      <button
                        className="btn btn-warning"
                        onClick={() => markReturned(p.id)}
                        disabled={actionLoadingId === p.id}
                        style={{
                          width: '100%',
                          minHeight: 46,
                          fontSize: '0.92rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: '#d97706',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
                        }}
                      >
                        {actionLoadingId === p.id ? <Spinner white size="sm" /> : <LogIn size={18} />}
                        🟡 RECORD RE-IN (Campus Entry)
                      </button>
                    )}

                    {mState === 'RETURNED' && (
                      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => allowReExit(p.id)}
                          disabled={actionLoadingId === p.id}
                          style={{
                            flex: 1,
                            minHeight: 46,
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                          }}
                        >
                          {actionLoadingId === p.id ? <Spinner white size="sm" /> : <RotateCcw size={16} />}
                          🔄 ALLOW RE-EXIT
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => markReturned(p.id)}
                          disabled={actionLoadingId === p.id}
                          style={{
                            minHeight: 46,
                            padding: '0 14px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Record Re-In entry"
                        >
                          <LogIn size={15} /> Re-In
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Secondary Actions: View Pass & Verify */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 2 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedPass(p)}
                      style={{
                        minHeight: 38,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        fontWeight: 700,
                        background: '#f8fafc'
                      }}
                    >
                      <Eye size={15} /> View Pass & QR
                    </button>

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => verify(p.passNumber)}
                      style={{
                        minHeight: 38,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        fontWeight: 700,
                        color: 'var(--blue-700)',
                        borderColor: 'var(--blue-300)',
                        background: '#eff6ff'
                      }}
                    >
                      <Shield size={15} /> Verify
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================
             STRUCTURED TABLE VIEW (FOR DESKTOP / SPREADSHEET USERS)
             ======================================================== */
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pass ID</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Exit Window</th>
                  <th>Campus Status</th>
                  <th>Actual Exit</th>
                  <th>Actual Return</th>
                  <th style={{ minWidth: 260 }}>Guard Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPasses.map((p: any) => {
                  const mState = getPassMovementState(p);
                  const latestLog = p.gateLogs?.[0];

                  return (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => verify(p.passNumber)}
                          title="Click to Verify Pass in top scanner"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--blue-700)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                            {p.passNumber}
                          </span>
                        </button>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{p.employee?.firstName} {p.employee?.lastName}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--slate-400)' }}>{p.employee?.employeeCode}</div>
                      </td>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{p.employee?.department?.name || '—'}</td>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--slate-700)' }}>
                          {p.exitRequest?.exitTime || '—'} → {p.exitRequest?.expectedReturnTime || '—'}
                        </div>
                        {p.exitRequest?.destination && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--slate-400)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.exitRequest.destination}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {mState === 'OUTSIDE' && (
                          <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                            🟡 Outside (On Pass)
                          </span>
                        )}
                        {mState === 'RETURNED' && (
                          <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                            🔵 Returned (On Campus)
                          </span>
                        )}
                        {mState === 'INSIDE' && (
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                            🟢 Inside (Ready)
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: latestLog?.actualExitTime ? 'var(--slate-800)' : 'var(--slate-400)', fontWeight: latestLog?.actualExitTime ? 600 : 400, whiteSpace: 'nowrap' }}>
                        {latestLog?.actualExitTime ? fmtTime(latestLog.actualExitTime) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: latestLog?.actualReturnTime ? 'var(--slate-800)' : 'var(--slate-400)', fontWeight: latestLog?.actualReturnTime ? 600 : 400, whiteSpace: 'nowrap' }}>
                        {latestLog?.actualReturnTime ? fmtTime(latestLog.actualReturnTime) : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedPass(p)}
                            title="View Official Digital Gate Pass & QR Code"
                            style={{ padding: '5px 9px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                          >
                            <Eye size={14} /> View Pass
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => verify(p.passNumber)}
                            title="Load into Verify scanner"
                            style={{ padding: '5px 9px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--blue-700)', borderColor: 'var(--blue-300)', fontWeight: 700 }}
                          >
                            <Shield size={14} /> Verify
                          </button>
                          {mState === 'INSIDE' && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => allowExit(p.id)}
                              disabled={actionLoadingId === p.id}
                              style={{
                                padding: '5px 11px',
                                fontSize: '0.74rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#16a34a',
                                color: '#ffffff',
                                borderColor: '#16a34a',
                                fontWeight: 800
                              }}
                              title="Allow Exit — Record Physical Departure"
                            >
                              {actionLoadingId === p.id ? <Spinner white size="sm" /> : <LogOut size={14} />}
                              Allow Exit
                            </button>
                          )}
                          {mState === 'OUTSIDE' && (
                            <button
                              className="btn btn-sm"
                              onClick={() => markReturned(p.id)}
                              disabled={actionLoadingId === p.id}
                              style={{
                                padding: '5px 11px',
                                fontSize: '0.74rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#d97706',
                                color: '#ffffff',
                                borderColor: '#d97706',
                                fontWeight: 800
                              }}
                              title="Record Return (Re-In) / Physical Entry"
                            >
                              {actionLoadingId === p.id ? <Spinner white size="sm" /> : <LogIn size={14} />}
                              Record Re-In
                            </button>
                          )}
                          {mState === 'RETURNED' && (
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => allowReExit(p.id)}
                                disabled={actionLoadingId === p.id}
                                style={{
                                  padding: '5px 11px',
                                  fontSize: '0.74rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#ffffff',
                                  background: '#2563eb',
                                  borderColor: '#2563eb',
                                  fontWeight: 800
                                }}
                                title="Allow employee to re-exit campus again"
                              >
                                {actionLoadingId === p.id ? <Spinner white size="sm" /> : <RotateCcw size={14} />}
                                Re-Exit
                              </button>
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => markReturned(p.id)}
                                disabled={actionLoadingId === p.id}
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '0.72rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  color: '#b45309'
                                }}
                                title="Log Re-In Entry"
                              >
                                <LogIn size={12} /> Re-In
                              </button>
                            </>
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

      {/* ========================================================
          DIGITAL GATE PASS MODAL (VIEW & EXECUTE FOR SECURITY GUARD)
          ======================================================== */}
      {selectedPass && (() => {
        const modalState = getPassMovementState(selectedPass);

        return (
          <Modal
            open={!!selectedPass}
            onClose={() => setSelectedPass(null)}
            title={`Gate Pass: ${selectedPass.passNumber}`}
            footer={
              <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => setSelectedPass(null)}>
                  Close
                </button>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {modalState === 'INSIDE' && (
                    <button
                      className="btn btn-success"
                      onClick={() => allowExit(selectedPass.id)}
                      disabled={actionLoadingId === selectedPass.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, background: '#16a34a', color: '#fff' }}
                    >
                      {actionLoadingId === selectedPass.id ? <Spinner white size="sm" /> : <LogOut size={16} />}
                      Allow Exit (Record Departure)
                    </button>
                  )}

                  {modalState === 'OUTSIDE' && (
                    <button
                      className="btn btn-warning"
                      onClick={() => markReturned(selectedPass.id)}
                      disabled={actionLoadingId === selectedPass.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#d97706', color: '#fff', fontWeight: 800 }}
                    >
                      {actionLoadingId === selectedPass.id ? <Spinner white size="sm" /> : <LogIn size={16} />}
                      Record Re-In (Physical Entry)
                    </button>
                  )}

                  {modalState === 'RETURNED' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => allowReExit(selectedPass.id)}
                        disabled={actionLoadingId === selectedPass.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', fontWeight: 800 }}
                      >
                        {actionLoadingId === selectedPass.id ? <Spinner white size="sm" /> : <RotateCcw size={16} />}
                        Allow Re-Exit (Step Out Again)
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => markReturned(selectedPass.id)}
                        disabled={actionLoadingId === selectedPass.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                      >
                        {actionLoadingId === selectedPass.id ? <Spinner size="sm" /> : <LogIn size={15} />}
                        Record Re-In
                      </button>
                    </div>
                  )}
                </div>
              </div>
            }
          >
            <div style={{ padding: '6px 0' }}>
              {/* Header Badge */}
              <div style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: 12,
                padding: '16px 20px',
                textAlign: 'center',
                marginBottom: 16
              }}>
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bfdbfe', fontWeight: 800 }}>
                  SmartGate OS · Official Campus Pass
                </div>
                <h3 style={{ margin: '4px 0', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                  {selectedPass.passNumber}
                </h3>
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, marginTop: 4 }}>
                  {modalState === 'OUTSIDE' && '🟡 OUTSIDE ON PASS'}
                  {modalState === 'RETURNED' && '🔵 RETURNED TO CAMPUS'}
                  {modalState === 'INSIDE' && '🟢 INSIDE (READY FOR EXIT)'}
                </div>
              </div>

              {/* QR Code and Employee Card - Responsive flex-wrap */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{
                  flex: '0 0 auto',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 12,
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <QRCodeSVG
                    value={selectedPass.passNumber || selectedPass.id}
                    size={130}
                    level="M"
                    includeMargin={false}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 5, fontWeight: 700 }}>Scan QR at Gate</div>
                </div>

                <div style={{ flex: '1 1 200px', minWidth: 190 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedPass.employee?.firstName} {selectedPass.employee?.lastName}
                  </h4>
                  <div style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 700, marginBottom: 2 }}>
                    Badge: {selectedPass.employee?.employeeCode}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {selectedPass.employee?.designation || 'Staff'} · {selectedPass.employee?.department?.name || 'Department'}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>
                      ✓ Manager Approved
                    </span>
                    {selectedPass.exitRequest?.requiresHrApproval && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>
                        ✓ HR Approved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Exit Window & Details */}
              <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 14px', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>Exit Window:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {selectedPass.exitRequest?.exitTime} → {selectedPass.exitRequest?.expectedReturnTime}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>Destination:</span>
                    <span style={{ color: '#334155', fontWeight: 600 }}>{selectedPass.exitRequest?.destination || 'Local Business'}</span>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>Reason:</span>
                    <span style={{ color: '#334155' }}>{selectedPass.exitRequest?.reason || 'Exit Permission'}</span>
                  </div>

                  {selectedPass.gateLogs?.[0]?.actualExitTime && (
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>Actual Exit:</span>
                      <span style={{ fontWeight: 700, color: '#16a34a' }}>
                        {fmtTime(selectedPass.gateLogs[0].actualExitTime)}
                      </span>
                    </div>
                  )}

                  {selectedPass.gateLogs?.[0]?.actualReturnTime && (
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>Actual Return:</span>
                      <span style={{ fontWeight: 700, color: '#2563eb' }}>
                        {fmtTime(selectedPass.gateLogs[0].actualReturnTime)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Gate Movement History */}
              {selectedPass.gateLogs && selectedPass.gateLogs.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
                    Gate Movement Timeline ({selectedPass.gateLogs.length} events):
                  </div>
                  <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#ffffff' }}>
                    {selectedPass.gateLogs.map((log: any, idx: number) => (
                      <div key={log.id || idx} style={{ padding: '7px 12px', borderBottom: idx < selectedPass.gateLogs.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>Exit:</strong> {log.actualExitTime ? fmtTime(log.actualExitTime) : '—'}
                          {log.notes && <span style={{ color: '#64748b', marginLeft: 6 }}>({log.notes})</span>}
                        </div>
                        <div style={{ color: log.actualReturnTime ? '#2563eb' : '#d97706', fontWeight: 700 }}>
                          <strong>Return:</strong> {log.actualReturnTime ? fmtTime(log.actualReturnTime) : 'Pending Re-In'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
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
