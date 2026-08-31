'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import {
  Shield, Search, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  Users, UserX, UserCheck, Flame, RefreshCw, ArrowRight, UserPlus, LogOut
} from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<'verify' | 'outside' | 'passes' | 'emergency'>('verify');
  const [passes, setPasses] = useState<any[]>([]);
  const [outsideLogs, setOutsideLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activePassesCount: 0,
    currentlyOutsideCount: 0,
    overdueCount: 0,
    todayExitsCount: 0,
    todayReturnsCount: 0,
    visitorsInsideCount: 0,
    expectedVisitorsCount: 0
  });
  const [emergencyData, setEmergencyData] = useState<{ employeesOutside: any[]; visitorsInside: any[]; timestamp: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Operational Context (Gate & Shift)
  const [selectedGate, setSelectedGate] = useState('Gate 1 — Main Entrance');
  const [selectedShift, setSelectedShift] = useState('Morning (06:00 - 14:00)');

  const loadData = useCallback(async () => {
    try {
      const [passesRes, statsRes, outsideRes] = await Promise.all([
        api.get('/gate-passes/today'),
        api.get('/security/stats').catch(() => ({ data: { data: null } })),
        api.get('/security/currently-outside').catch(() => ({ data: { data: [] } }))
      ]);
      setPasses(passesRes.data?.data || []);
      if (statsRes.data?.data) setStats(statsRes.data.data);
      if (outsideRes.data?.data) setOutsideLogs(outsideRes.data.data);
    } catch (err) {
      console.error('Failed to load security data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmergencyRoll = async () => {
    try {
      const res = await api.get('/security/emergency-roll');
      if (res.data?.success) setEmergencyData(res.data.data);
    } catch (err) {
      console.error('Failed to load emergency roll', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'emergency') {
      loadEmergencyRoll();
    }
  }, [activeTab]);

  const verify = async (queryToSearch?: string) => {
    const q = (queryToSearch || search).trim();
    if (!q) return;
    setVerifying(true);
    setVerifyResult(null);
    setActionMsg(null);
    try {
      const res = await api.post('/gate-passes/verify', { query: q });
      setVerifyResult(res.data?.data);
    } catch (err: any) {
      setVerifyResult({ error: err.response?.data?.message || 'Gate pass not found. Please verify the code.' });
    } finally {
      setVerifying(false);
    }
  };

  const allowExit = async (id: string) => {
    setActioning(true);
    setActionMsg(null);
    try {
      const res = await api.post('/security/exit', { gatePassId: id, notes: `Gate: ${selectedGate} | Shift: ${selectedShift}` });
      setActionMsg({ type: 'success', text: res.data?.message || 'Exit recorded successfully!' });
      setVerifyResult(null);
      setSearch('');
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to record exit.' });
    } finally {
      setActioning(false);
    }
  };

  const markReturned = async (id: string) => {
    setActioning(true);
    setActionMsg(null);
    try {
      const res = await api.post('/security/return', { gatePassId: id, notes: `Gate: ${selectedGate} | Shift: ${selectedShift}` });
      setActionMsg({ type: 'success', text: res.data?.message || 'Return recorded successfully!' });
      setVerifyResult(null);
      setSearch('');
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to record return.' });
    } finally {
      setActioning(false);
    }
  };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Top Header & Operational Context */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={24} style={{ color: 'var(--blue-700)' }} /> Security Gate Control Center
              </h1>
              <p>Verify employee gate passes, log physical entry/exit, detect late returns & monitor premises safety</p>
            </div>

            {/* Gate & Shift Selectors */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--blue-50)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--blue-200)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--blue-900)' }}>GATE:</span>
                <select
                  value={selectedGate}
                  onChange={e => setSelectedGate(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.8rem', color: 'var(--blue-800)', outline: 'none', cursor: 'pointer' }}
                >
                  <option>Gate 1 — Main Entrance</option>
                  <option>Gate 2 — Rear Staff Gate</option>
                  <option>Gate 3 — Logistics & Cargo</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--slate-100)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--slate-200)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-600)' }}>SHIFT:</span>
                <select
                  value={selectedShift}
                  onChange={e => setSelectedShift(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.8rem', color: 'var(--slate-700)', outline: 'none', cursor: 'pointer' }}
                >
                  <option>Morning (06:00 - 14:00)</option>
                  <option>Evening (14:00 - 22:00)</option>
                  <option>Night (22:00 - 06:00)</option>
                </select>
              </div>

              <button className="btn btn-outline btn-sm" onClick={loadData}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Alert Banner */}
        {actionMsg && (
          <div className={`alert ${actionMsg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actionMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span style={{ flex: 1 }}>{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>✕</button>
          </div>
        )}

        {/* Live KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--blue-600)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>Active Passes Today</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--blue-700)', marginTop: 2 }}>{stats.activePassesCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--slate-400)' }}>Approved for exit</div>
          </div>

          <div
            className="card"
            style={{ padding: '14px 18px', borderLeft: '4px solid var(--amber-500)', cursor: 'pointer' }}
            onClick={() => setActiveTab('outside')}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--amber-700)' }}>Employees Outside</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--amber-600)', marginTop: 2 }}>{stats.currentlyOutsideCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--amber-700)' }}>Currently off-premises</div>
          </div>

          <div className="card" style={{ padding: '14px 18px', borderLeft: `4px solid ${stats.overdueCount > 0 ? 'var(--red-600)' : 'var(--green-500)'}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: stats.overdueCount > 0 ? 'var(--red-600)' : 'var(--green-700)' }}>
              Overdue Returns
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.overdueCount > 0 ? 'var(--red-600)' : 'var(--green-600)', marginTop: 2 }}>
              {stats.overdueCount}
            </div>
            <div style={{ fontSize: '0.68rem', color: stats.overdueCount > 0 ? 'var(--red-600)' : 'var(--slate-400)' }}>
              {stats.overdueCount > 0 ? '⚠️ Exceeded return time' : 'All returns on track'}
            </div>
          </div>

          <Link href="/security/visitors" className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #8b5cf6', textDecoration: 'none' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed' }}>Visitors Inside</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', marginTop: 2 }}>{stats.visitorsInsideCount}</div>
            <div style={{ fontSize: '0.68rem', color: '#7c3aed' }}>Open visitor console ➔</div>
          </Link>

          <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--slate-400)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-600)' }}>Today Gate Events</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-800)', marginTop: 2 }}>{stats.todayExitsCount + stats.todayReturnsCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--slate-500)' }}>{stats.todayExitsCount} Exits · {stats.todayReturnsCount} Returns</div>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--blue-100)', gap: 8 }}>
          {[
            { id: 'verify', label: 'Verify & Action Pass', icon: <Search size={15} /> },
            { id: 'outside', label: `Currently Outside (${stats.currentlyOutsideCount})`, icon: <UserX size={15} /> },
            { id: 'passes', label: `Today's Passes (${passes.length})`, icon: <Clock size={15} /> },
            { id: 'emergency', label: 'Emergency Evacuation Roll', icon: <Flame size={15} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, marginBottom: -2,
                borderBottom: activeTab === tab.id ? '2px solid var(--blue-700)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--blue-700)' : 'var(--slate-500)',
                transition: 'all 0.15s'
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Verify & Action */}
        {activeTab === 'verify' && (
          <div className="space-y-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><Search size={16} /> Enter Pass ID / Employee Code / Scan QR</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-control"
                    placeholder="Search by Pass ID (GP-2026-00125) or Employee ID (EMP1001)..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && verify()}
                    style={{ flex: 1, fontSize: '0.95rem' }}
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={() => verify()} disabled={verifying}>
                    {verifying ? <Spinner white size="sm" /> : <Shield size={16} />}
                    Verify Pass
                  </button>
                </div>

                {verifyResult && (
                  <div style={{ marginTop: 16 }}>
                    {verifyResult.error ? (
                      <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={18} />
                        <div>
                          <div style={{ fontWeight: 700 }}>Pass Verification Failed</div>
                          <div style={{ fontSize: '0.82rem' }}>{verifyResult.error}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="card" style={{ border: '2px solid var(--blue-300)', overflow: 'hidden' }}>
                        {/* Verified Pass Banner */}
                        <div style={{ background: 'var(--blue-700)', color: 'white', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>OFFICIAL VERIFIED GATE PASS</div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.2rem', marginTop: 2 }}>{verifyResult.passNumber}</div>
                          </div>
                          <span className={`badge ${statusBadgeClass(verifyResult.status)}`} style={{ fontSize: '0.85rem', padding: '6px 14px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>
                            {statusLabel(verifyResult.status)}
                          </span>
                        </div>

                        {/* Masked Employee Info (Least Privilege) */}
                        <div style={{ padding: '20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px 24px', marginBottom: 18 }}>
                            {[
                              ['Employee Name', `${verifyResult.employee?.firstName} ${verifyResult.employee?.lastName}`],
                              ['Employee Code', verifyResult.employee?.employeeCode],
                              ['Department', verifyResult.employee?.department?.name || 'General'],
                              ['Destination', verifyResult.exitRequest?.destination],
                              ['Exit Date', fmtDate(verifyResult.exitRequest?.exitDate)],
                              ['Approved Exit Window', `${verifyResult.exitRequest?.exitTime} — ${verifyResult.exitRequest?.expectedReturnTime}`],
                              ['Stated Purpose', verifyResult.exitRequest?.reason],
                            ].map(([label, value]) => (
                              <div key={label as string} style={{ padding: '6px 0', borderBottom: '1px solid var(--slate-100)' }}>
                                <div style={{ color: 'var(--slate-400)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                                <div style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: '0.9rem', marginTop: 2 }}>{value || '—'}</div>
                              </div>
                            ))}
                          </div>

                          {/* Approval Badges */}
                          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            <span style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--green-50)', border: '1px solid var(--green-200)', color: 'var(--green-700)', fontSize: '0.78rem', fontWeight: 700 }}>
                              ✓ Manager Authority: APPROVED
                            </span>
                            {verifyResult.exitRequest?.requiresHrApproval && (
                              <span style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--green-50)', border: '1px solid var(--green-200)', color: 'var(--green-700)', fontSize: '0.78rem', fontWeight: 700 }}>
                                ✓ HR Authority: APPROVED
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {verifyResult.status === 'ACTIVE' && (
                            <button
                              className="btn btn-primary"
                              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                              onClick={() => allowExit(verifyResult.id)}
                              disabled={actioning}
                            >
                              {actioning ? <Spinner white size="sm" /> : <LogOut size={18} />}
                              ALLOW EXIT — Record Actual Exit Time ({selectedGate})
                            </button>
                          )}

                          {verifyResult.status === 'USED' && (
                            <button
                              className="btn btn-success"
                              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                              onClick={() => markReturned(verifyResult.id)}
                              disabled={actioning}
                            >
                              {actioning ? <Spinner white size="sm" /> : <CheckCircle2 size={18} />}
                              MARK AS RETURNED — Record Return Time ({selectedGate})
                            </button>
                          )}

                          {verifyResult.status === 'EXPIRED' && (
                            <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <AlertTriangle size={18} />
                              <span>This gate pass is expired. Direct employee to request a new exit permission or contact manager.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Currently Outside Tracker */}
        {activeTab === 'outside' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><UserX size={16} /> Employees Currently Outside Premises</h3>
              <span className="badge badge-amber">{outsideLogs.length} outside</span>
            </div>
            {outsideLogs.length === 0 ? (
              <div className="empty-state">
                <CheckCircle2 size={36} style={{ color: 'var(--green-500)' }} />
                <h4>No Employees Currently Outside</h4>
                <p>All employees who exited on gate passes today have returned.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Code</th>
                      <th>Department</th>
                      <th>Destination</th>
                      <th>Actual Exit</th>
                      <th>Expected Return</th>
                      <th>Status / Late</th>
                      <th>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outsideLogs.map((log: any) => (
                      <tr key={log.id} style={{ background: log.isOverdue ? 'var(--red-50)' : 'transparent' }}>
                        <td style={{ fontWeight: 700 }}>{log.employee?.firstName} {log.employee?.lastName}</td>
                        <td className="font-mono">{log.employee?.employeeCode}</td>
                        <td>{log.employee?.department?.name || '—'}</td>
                        <td>{log.gatePass?.exitRequest?.destination || '—'}</td>
                        <td className="font-mono">{log.actualExitTime ? fmtTime(log.actualExitTime) : '—'}</td>
                        <td className="font-mono">{log.expectedReturnTime ? fmtTime(log.expectedReturnTime) : '—'}</td>
                        <td>
                          {log.isOverdue ? (
                            <span className="badge badge-danger" style={{ fontWeight: 800 }}>
                              🚨 OVERDUE (+{log.lateMins}m)
                            </span>
                          ) : (
                            <span className="badge badge-amber">
                              Outside ({log.elapsedMins}m)
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => markReturned(log.gatePassId)}
                            disabled={actioning}
                          >
                            <CheckCircle2 size={13} /> Mark Returned
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Today's Passes Full Table */}
        {activeTab === 'passes' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Clock size={16} /> All Approved Gate Passes Today</h3>
              <span className="badge badge-blue">{passes.length} passes</span>
            </div>
            {passes.length === 0 ? (
              <div className="empty-state">
                <Shield size={36} style={{ color: 'var(--slate-400)' }} />
                <h4>No Passes Scheduled Today</h4>
                <p>Approved exit permissions will appear here automatically.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Pass ID</th>
                      <th>Employee</th>
                      <th>Code</th>
                      <th>Department</th>
                      <th>Exit Window</th>
                      <th>Destination</th>
                      <th>Pass Status</th>
                      <th>Actual Exit</th>
                      <th>Actual Return</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passes.map((p: any) => (
                      <tr key={p.id}>
                        <td className="font-mono" style={{ color: 'var(--blue-700)', fontWeight: 800 }}>{p.passNumber}</td>
                        <td style={{ fontWeight: 600 }}>{p.employee?.firstName} {p.employee?.lastName}</td>
                        <td className="font-mono">{p.employee?.employeeCode}</td>
                        <td>{p.employee?.department?.name || '—'}</td>
                        <td className="font-mono">{p.exitRequest?.exitTime} – {p.exitRequest?.expectedReturnTime}</td>
                        <td>{p.exitRequest?.destination}</td>
                        <td><span className={`badge ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span></td>
                        <td className="font-mono">{p.gateLogs?.[0]?.actualExitTime ? fmtTime(p.gateLogs[0].actualExitTime) : '—'}</td>
                        <td className="font-mono">{p.gateLogs?.[0]?.actualReturnTime ? fmtTime(p.gateLogs[0].actualReturnTime) : '—'}</td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setSearch(p.passNumber); setActiveTab('verify'); verify(p.passNumber); }}
                          >
                            Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Emergency Evacuation Roll Call */}
        {activeTab === 'emergency' && (
          <div className="space-y-4">
            <div className="card" style={{ borderLeft: '4px solid var(--red-600)', background: 'var(--red-50)' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--red-200)' }}>
                <h3 className="card-title" style={{ color: 'var(--red-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={18} color="var(--red-600)" /> Emergency Evacuation Roll Call
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--red-700)', fontWeight: 700 }}>
                  LIVE ROSTER: {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--red-900)' }}>
                  In the event of an evacuation, fire, or facility incident, this list shows <strong>all employees currently verified outside</strong> and <strong>all visitors verified inside</strong> the facility.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Visitors Inside */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><UserPlus size={16} /> Visitors Inside the Facility ({emergencyData?.visitorsInside.length || 0})</h3>
                </div>
                <div className="card-body">
                  {!emergencyData || emergencyData.visitorsInside.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                      No active visitors logged inside facility.
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Visitor</th>
                            <th>Host Employee</th>
                            <th>Contact</th>
                            <th>Entry Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emergencyData.visitorsInside.map((v: any) => (
                            <tr key={v.id}>
                              <td style={{ fontWeight: 700 }}>{v.visitor?.fullName}</td>
                              <td>{v.hostUser?.employee?.firstName} {v.hostUser?.employee?.lastName}</td>
                              <td className="font-mono">{v.visitor?.mobile}</td>
                              <td className="font-mono">{v.checkIns?.[0]?.checkInTime ? fmtTime(v.checkIns[0].checkInTime) : v.expectedEntryTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Employees Outside */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><UserX size={16} /> Employees Verified Outside ({emergencyData?.employeesOutside.length || 0})</h3>
                </div>
                <div className="card-body">
                  {!emergencyData || emergencyData.employeesOutside.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                      All employees are on-site (none currently outside).
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Exit Time</th>
                            <th>Destination</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emergencyData.employeesOutside.map((e: any) => (
                            <tr key={e.id}>
                              <td style={{ fontWeight: 700 }}>{e.employee?.firstName} {e.employee?.lastName}</td>
                              <td>{e.employee?.department?.name}</td>
                              <td className="font-mono">{e.actualExitTime ? fmtTime(e.actualExitTime) : '—'}</td>
                              <td>{e.gatePass?.exitRequest?.destination}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
