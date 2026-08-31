'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import {
  Users, FileText, Clock, CheckCircle2, ExternalLink, RefreshCw,
  UserCheck, Search, AlertTriangle, LogOut, ArrowRight, Shield, UserX
} from 'lucide-react';
import Link from 'next/link';

interface Junior {
  id: string;
  connectionType: string;
  status: string;
  createdAt: string;
  computedStatus?: string;
  isOutside?: boolean;
  isOverdue?: boolean;
  outsideDetails?: any;
  pendingLeavesCount?: number;
  pendingExitsCount?: number;
  user?: {
    id: string;
    email: string;
    role: string;
    employee?: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      designation: string;
      avatarUrl?: string;
      department?: { name: string };
      leaveRequests?: { id: string; status: string }[];
      exitRequests?: { id: string; status: string }[];
    };
  };
}

const CONNECTION_LABELS: Record<string, string> = {
  REPORTING_MANAGER: 'Direct Report',
  HR_AUTHORITY: 'HR Assigned',
  GM_AUTHORITY: 'GM Direct',
  HIGHER_AUTHORITY: 'Under Authority'
};

export default function MyTeamPage() {
  const { user } = useAuth();
  const [juniors, setJuniors] = useState<Junior[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchJuniors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/authority/my-juniors');
      if (res.data?.success) setJuniors(res.data.data);
    } catch (err) {
      console.error('Failed to fetch team', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJuniors();
  }, []);

  // Compute team metrics
  const stats = useMemo(() => {
    let present = 0;
    let outside = 0;
    let onLeave = 0;
    let pending = 0;

    juniors.forEach(j => {
      if (j.isOutside) outside++;
      else if (j.computedStatus === 'ON_LEAVE') onLeave++;
      else present++;

      const pendingCount = (j.pendingLeavesCount || 0) + (j.pendingExitsCount || 0);
      if (pendingCount > 0) pending += pendingCount;
    });

    return {
      total: juniors.length,
      present,
      outside,
      onLeave,
      pending
    };
  }, [juniors]);

  // Filter team members
  const filtered = useMemo(() => {
    return juniors.filter(j => {
      const emp = j.user?.employee;
      const fullName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.toLowerCase();
      const code = (emp?.employeeCode || '').toLowerCase();
      const desig = (emp?.designation || '').toLowerCase();
      const q = search.toLowerCase().trim();

      const matchesSearch = !q || fullName.includes(q) || code.includes(q) || desig.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'OUTSIDE') return j.isOutside;
      if (statusFilter === 'ON_LEAVE') return j.computedStatus === 'ON_LEAVE';
      if (statusFilter === 'PRESENT') return !j.isOutside && j.computedStatus !== 'ON_LEAVE';
      if (statusFilter === 'PENDING') return ((j.pendingLeavesCount || 0) + (j.pendingExitsCount || 0)) > 0;

      return true;
    });
  }, [juniors, search, statusFilter]);

  const outsideMembers = useMemo(() => {
    return juniors.filter(j => j.isOutside);
  }, [juniors]);

  if (loading) {
    return (
      <AppLayout>
        <PageLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={24} style={{ color: 'var(--blue-700)' }} /> Team Operations & Management
              </h1>
              <p>Real-time oversight of connected team members, attendance status, active gate exits & approval routing</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                <FileText size={14} /> Review Approvals ({stats.pending})
              </Link>
              <button className="btn btn-outline btn-sm" onClick={fetchJuniors}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div
            className="card"
            style={{ padding: '14px 18px', borderLeft: '4px solid var(--blue-600)', cursor: 'pointer' }}
            onClick={() => setStatusFilter('ALL')}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>Team Size</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--blue-700)', marginTop: 2 }}>{stats.total}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--slate-400)' }}>Connected direct reports</div>
          </div>

          <div
            className="card"
            style={{ padding: '14px 18px', borderLeft: '4px solid var(--green-500)', cursor: 'pointer' }}
            onClick={() => setStatusFilter('PRESENT')}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--green-700)' }}>Present On-Site</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--green-600)', marginTop: 2 }}>{stats.present}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--green-700)' }}>In building today</div>
          </div>

          <div
            className="card"
            style={{ padding: '14px 18px', borderLeft: '4px solid var(--amber-500)', cursor: 'pointer' }}
            onClick={() => setStatusFilter('OUTSIDE')}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--amber-700)' }}>Currently Outside</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--amber-600)', marginTop: 2 }}>{stats.outside}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--amber-700)' }}>On gate pass permission</div>
          </div>

          <div
            className="card"
            style={{ padding: '14px 18px', borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
            onClick={() => setStatusFilter('ON_LEAVE')}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed' }}>On Approved Leave</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', marginTop: 2 }}>{stats.onLeave}</div>
            <div style={{ fontSize: '0.68rem', color: '#7c3aed' }}>Scheduled absence</div>
          </div>

          <Link
            href="/approvals"
            className="card"
            style={{ padding: '14px 18px', borderLeft: `4px solid ${stats.pending > 0 ? 'var(--red-600)' : 'var(--slate-400)'}`, textDecoration: 'none' }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: stats.pending > 0 ? 'var(--red-600)' : 'var(--slate-600)' }}>
              Pending Approvals
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.pending > 0 ? 'var(--red-600)' : 'var(--slate-800)', marginTop: 2 }}>
              {stats.pending}
            </div>
            <div style={{ fontSize: '0.68rem', color: stats.pending > 0 ? 'var(--red-600)' : 'var(--slate-400)' }}>
              {stats.pending > 0 ? 'Action required ➔' : 'All requests cleared'}
            </div>
          </Link>
        </div>

        {/* Section: My Team Currently Outside (If any) */}
        {outsideMembers.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid var(--amber-500)', background: 'var(--amber-50)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--amber-200)' }}>
              <h3 className="card-title" style={{ color: 'var(--amber-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogOut size={16} color="var(--amber-700)" /> My Team Members Currently Outside ({outsideMembers.length})
              </h3>
            </div>
            <div className="table-wrap">
              <table className="table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th>Destination</th>
                    <th>Expected Return</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outsideMembers.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700 }}>{m.user?.employee?.firstName} {m.user?.employee?.lastName}</td>
                      <td className="font-mono">{m.user?.employee?.employeeCode}</td>
                      <td>{m.outsideDetails?.gatePass?.exitRequest?.destination || 'Official Off-site'}</td>
                      <td className="font-mono">{new Date(m.outsideDetails?.expectedReturnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        {m.isOverdue ? (
                          <span className="badge badge-danger">🚨 OVERDUE</span>
                        ) : (
                          <span className="badge badge-amber">Outside On Permission</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="card" style={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, maxWidth: 420 }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--slate-400)' }} />
                <input
                  className="form-control"
                  placeholder="Search team member name, code, designation..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 36, fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `All (${juniors.length})` },
                { id: 'PRESENT', label: `Present (${stats.present})` },
                { id: 'OUTSIDE', label: `Outside (${stats.outside})` },
                { id: 'ON_LEAVE', label: `On Leave (${stats.onLeave})` },
                { id: 'PENDING', label: `Pending Action (${stats.pending})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`btn btn-sm ${statusFilter === f.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.78rem' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Team Grid */}
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Users size={40} style={{ color: 'var(--slate-400)' }} />
              <h4>No Team Members Found</h4>
              <p>{search ? 'No team members matching your search query.' : 'Employees who connect you as their Reporting Manager will appear here.'}</p>
              <Link href="/authority" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                <UserCheck size={14} /> View Authority Connections
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {filtered.map(conn => {
              const emp = conn.user?.employee;
              const pendingLeave = conn.pendingLeavesCount || 0;
              const pendingExit = conn.pendingExitsCount || 0;
              const totalPending = pendingLeave + pendingExit;

              return (
                <div key={conn.id} className="card" style={{ padding: 18, position: 'relative' }}>
                  {/* Top Badge Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span className="badge badge-blue" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      {CONNECTION_LABELS[conn.connectionType] || conn.connectionType}
                    </span>

                    {conn.isOutside ? (
                      <span className={`badge ${conn.isOverdue ? 'badge-danger' : 'badge-amber'}`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                        {conn.isOverdue ? '🚨 OVERDUE' : '🟡 Outside'}
                      </span>
                    ) : conn.computedStatus === 'ON_LEAVE' ? (
                      <span className="badge" style={{ background: '#ede9fe', color: '#7c3aed', fontSize: '0.7rem', fontWeight: 700 }}>
                        🟣 On Leave
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                        🟢 On-Site
                      </span>
                    )}
                  </div>

                  {/* Employee Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: 'var(--blue-700)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '1rem', flexShrink: 0
                    }}>
                      {emp?.avatarUrl ? (
                        <img src={emp.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        `${emp?.firstName?.[0] || ''}${emp?.lastName?.[0] || ''}`
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--slate-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp?.firstName} {emp?.lastName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 1 }}>
                        {emp?.employeeCode} · {emp?.designation}
                      </div>
                      {emp?.department && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--blue-600)', fontWeight: 600, marginTop: 2 }}>
                          🏢 {emp.department.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pending Status Alert */}
                  <div style={{ marginBottom: 14 }}>
                    {totalPending > 0 ? (
                      <div style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--amber-50)', border: '1px solid var(--amber-200)',
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: '0.78rem', color: 'var(--amber-800)', fontWeight: 600
                      }}>
                        <Clock size={14} color="var(--amber-600)" />
                        {totalPending} pending request{totalPending > 1 ? 's' : ''} ({pendingLeave} leave · {pendingExit} exit)
                      </div>
                    ) : (
                      <div style={{
                        padding: '6px 10px', borderRadius: 8, background: 'var(--green-50)',
                        fontSize: '0.75rem', color: 'var(--green-700)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500
                      }}>
                        <CheckCircle2 size={13} /> All requests up to date
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--slate-100)', paddingTop: 12 }}>
                    <Link
                      href="/approvals"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}
                    >
                      <FileText size={13} /> {totalPending > 0 ? 'Approve Requests' : 'View History'}
                    </Link>
                    {emp?.id && (
                      <Link
                        href={`/employees/${emp.id}/journey`}
                        className="btn btn-outline btn-sm"
                        style={{ textDecoration: 'none' }}
                        title="View Career Journey"
                      >
                        <ExternalLink size={13} /> Journey
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
