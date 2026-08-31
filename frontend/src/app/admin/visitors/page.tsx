'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { fmtDate, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { AlertTriangle, Users, CheckCircle2, Clock, XCircle, RefreshCw, Search, Download } from 'lucide-react';

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ color, opacity: 0.6 }}>{icon}</div>
      </div>
    </div>
  );
}

export default function AdminVisitorsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [emergency, setEmergency] = useState<any[] | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      const [visitsRes, statsRes] = await Promise.all([
        api.get(`/visitors?${params.toString()}`),
        api.get('/visitors/stats'),
      ]);
      setVisits(visitsRes.data?.data || []);
      setStats(statsRes.data?.data || null);
    } finally { setLoading(false); }
  }, [q, statusFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const loadEmergency = async () => {
    try {
      const r = await api.get('/visitors/emergency');
      setEmergency(r.data?.data || []);
      setShowEmergency(true);
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div><h1>Visitor Management</h1><p style={{ marginTop: 2 }}>Complete visitor records and security oversight</p></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
              <button className="btn btn-sm" style={{ background: '#dc2626', color: 'white' }} onClick={loadEmergency}><AlertTriangle size={14} /> Emergency List</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <StatCard label="Total Visits" value={stats.total} color="#2563eb" icon={<Users size={28} />} />
            <StatCard label="Today" value={stats.today} color="#7c3aed" icon={<Clock size={28} />} />
            <StatCard label="Inside Now" value={stats.inside} color="#16a34a" icon={<CheckCircle2 size={28} />} />
            <StatCard label="Waiting" value={stats.waiting} color="#d97706" icon={<Clock size={28} />} />
            <StatCard label="Completed" value={stats.completed} color="#0891b2" icon={<CheckCircle2 size={28} />} />
            <StatCard label="Overdue" value={stats.overdue} color="#dc2626" icon={<AlertTriangle size={28} />} />
          </div>
        )}

        {/* Emergency Modal */}
        {showEmergency && emergency && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dc2626', color: 'white', borderRadius: '16px 16px 0 0' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>?? Emergency ? Visitors Currently Inside</h3>
                  <p style={{ fontSize: '0.8rem', opacity: 0.85 }}>Generated at {new Date().toLocaleTimeString()} ? {emergency.length} visitor(s)</p>
                </div>
                <button onClick={() => setShowEmergency(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
              </div>
              <div style={{ padding: 20 }}>
                {emergency.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate-500)' }}><CheckCircle2 size={40} color="#16a34a" /><p style={{ marginTop: 12 }}>No visitors currently inside.</p></div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'var(--slate-50)' }}>{['Visitor', 'Host', 'Department', 'Entry Time', 'Expected Exit', 'Status'].map(h => <th key={h} style={{ padding: '8px 12px', fontSize: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--slate-600)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {emergency.map((e: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                          <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 600 }}>{e.visitorName}</div><div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{e.mobile}</div></td>
                          <td style={{ padding: '10px 12px' }}>{e.hostName}</td>
                          <td style={{ padding: '10px 12px' }}>{e.department}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{e.entryTime ? new Date(e.entryTime).toLocaleTimeString() : '-'}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{e.expectedExitTime}</td>
                          <td style={{ padding: '10px 12px' }}><span className={`badge ${statusBadgeClass(e.status)}`}>{statusLabel(e.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search visitor name, mobile, visit ID..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['PENDING_HOST', 'APPROVED', 'WAITING', 'CHECKED_IN', 'OVERDUE', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
            <input type="date" className="form-control" style={{ width: 160 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            {(q || statusFilter || dateFilter) && <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setStatusFilter(''); setDateFilter(''); }}>Clear</button>}
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
          ) : visits.length === 0 ? (
            <div className="empty-state"><Users size={36} /><h4>No visitor records found</h4><p>Try adjusting your filters.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Visit ID</th><th>Visitor</th><th>Host</th><th>Purpose</th><th>Date</th><th>Type</th><th>Status</th><th>Pass</th></tr></thead>
                <tbody>
                  {visits.map((v: any) => {
                    const hEmp = v.hostUser?.employee;
                    return (
                      <tr key={v.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{v.visitId}</td>
                        <td><div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{v.visitor?.fullName}</div><div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{v.visitor?.mobile}</div>{v.visitor?.organization && <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{v.visitor.organization}</div>}</td>
                        <td>{hEmp ? `${hEmp.firstName} ${hEmp.lastName}` : v.hostUser?.email}<br /><span style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{v.department?.name || hEmp?.department?.name}</span></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.purpose}</td>
                        <td>{fmtDate(v.visitDate)}<br /><span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--slate-500)' }}>{v.expectedEntryTime} – {v.expectedExitTime}</span></td>
                        <td><span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>{v.visitType === 'WALK_IN' ? 'Walk-in' : 'Invited'}</span></td>
                        <td><span className={`badge ${statusBadgeClass(v.status)}`}>{statusLabel(v.status)}</span></td>
                        <td>{v.visitorPass ? <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--blue-700)' }}>{v.visitorPass.passNumber}</span> : <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>-</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--slate-100)', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                Showing {visits.length} records
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
