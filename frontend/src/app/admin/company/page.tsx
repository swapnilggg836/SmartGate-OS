'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import {
  Users, UserCheck, UserX, Clock, CheckCircle2, XCircle, AlertCircle, Building2,
  TrendingUp, Shield, Briefcase, FileText, RefreshCw
} from 'lucide-react';

interface DeptRow {
  id: string;
  name: string;
  code: string;
  total: number;
  present: number;
  absent: number;
  outside: number;
  late: number;
}

interface Overview {
  totalEmployees: number;
  activeEmployees: number;
  inactiveUsers: number;
  totalManagers: number;
  totalHR: number;
  totalSecurity: number;
  presentToday: number;
  absentToday: number;
  currentlyOutside: number;
  pendingExit: number;
  lateReturns: number;
  criticalCases: number;
}

function KpiCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, borderLeft: `4px solid ${color}` }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {React.cloneElement(icon as React.ReactElement, { size: 18, color })}
      </div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-800)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function CompanyPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [deptSummary, setDeptSummary] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/company/summary');
      if (res.data?.success) {
        setOverview(res.data.data.overview);
        setDeptSummary(res.data.data.departmentSummary);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('Failed to load company summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading && !overview) {
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
                <Building2 size={22} style={{ color: 'var(--blue-700)' }} /> Company Overview
              </h1>
              <p>Real-time organization metrics, department breakdown & gate pass activity (Updated: {lastRefresh.toLocaleTimeString()})</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
        </div>

        {overview && (
          <>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
              <KpiCard icon={<Users />} label="Total Employees" value={overview.totalEmployees} color="var(--blue-600)" />
              <KpiCard icon={<UserCheck />} label="Present On-Site" value={overview.presentToday} color="var(--green-600)" />
              <KpiCard icon={<TrendingUp />} label="Currently Outside" value={overview.currentlyOutside} color="var(--amber-500)" sub="On gate pass permission" />
              <KpiCard icon={<Clock />} label="Pending Exit Requests" value={overview.pendingExit} color="var(--amber-600)" sub={`${overview.pendingExit} pending`} />
              <KpiCard icon={<AlertCircle />} label="Late Returns" value={overview.lateReturns} color="var(--red-600)" />
              <KpiCard icon={<XCircle />} label="Critical Cases" value={overview.criticalCases} color="#dc2626" />
              <KpiCard icon={<Briefcase />} label="Total Managers" value={overview.totalManagers} color="var(--blue-700)" />
              <KpiCard icon={<Users />} label="Total HR Staff" value={overview.totalHR} color="#ec4899" />
              <KpiCard icon={<Shield />} label="Security Staff" value={overview.totalSecurity} color="var(--slate-600)" />
              <KpiCard icon={<UserX />} label="Inactive Accounts" value={overview.inactiveUsers} color="var(--slate-400)" />
            </div>

            {/* Critical Alert */}
            {(overview.criticalCases > 0 || overview.lateReturns > 0) && (
              <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--red-600)', background: 'var(--red-50)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertCircle size={20} color="var(--red-600)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--red-700)' }}>Action Required</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: 2 }}>
                    {overview.criticalCases > 0 && `${overview.criticalCases} critical pending exit request(s) require immediate escalation. `}
                    {overview.lateReturns > 0 && `${overview.lateReturns} employee(s) are overdue on their return to premises.`}
                  </div>
                </div>
              </div>
            )}

            {/* Department Table */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><Building2 size={16} /> Department Breakdown & Gate Activity</h3>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th style={{ textAlign: 'center' }}>Total Staff</th>
                      <th style={{ textAlign: 'center' }}>Present</th>
                      <th style={{ textAlign: 'center' }}>Currently Outside</th>
                      <th style={{ textAlign: 'center' }}>Late Returns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptSummary.map((dept) => (
                      <tr key={dept.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{dept.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>Code: {dept.code}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{dept.total}</td>
                        <td style={{ textAlign: 'center', color: 'var(--green-600)', fontWeight: 600 }}>{dept.present}</td>
                        <td style={{ textAlign: 'center', color: 'var(--amber-600)', fontWeight: dept.outside > 0 ? 600 : 400 }}>{dept.outside}</td>
                        <td style={{ textAlign: 'center' }}>
                          {dept.late > 0 ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>{dept.late}</span>
                          ) : (
                            <span style={{ color: 'var(--slate-400)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--blue-50)', fontWeight: 800 }}>
                      <td style={{ color: 'var(--blue-900)' }}>TOTALS</td>
                      <td style={{ textAlign: 'center' }}>{deptSummary.reduce((s, d) => s + d.total, 0)}</td>
                      <td style={{ textAlign: 'center', color: 'var(--green-700)' }}>{deptSummary.reduce((s, d) => s + d.present, 0)}</td>
                      <td style={{ textAlign: 'center', color: 'var(--amber-700)' }}>{deptSummary.reduce((s, d) => s + d.outside, 0)}</td>
                      <td style={{ textAlign: 'center', color: 'var(--red-700)' }}>{deptSummary.reduce((s, d) => s + d.late, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
