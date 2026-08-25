'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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
  onLeave: number;
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
  onLeaveToday: number;
  absentToday: number;
  currentlyOutside: number;
  pendingLeave: number;
  pendingExit: number;
  lateReturns: number;
  criticalCases: number;
}

function KpiCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {React.cloneElement(icon as React.ReactElement, { size: 20, color })}
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: color, marginTop: 3 }}>{sub}</div>}
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

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Building2 size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Company Overview</h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {loading && !overview ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-secondary)' }}>Loading company data...</div>
      ) : overview ? (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 30 }}>
            <KpiCard icon={<Users />} label="Total Employees" value={overview.totalEmployees} color="var(--primary-400)" />
            <KpiCard icon={<UserCheck />} label="Present Today" value={overview.presentToday} color="var(--emerald-500)" sub={`${Math.round((overview.presentToday / Math.max(overview.totalEmployees, 1)) * 100)}% attendance`} />
            <KpiCard icon={<UserX />} label="Absent Today" value={overview.absentToday} color="var(--red-400)" />
            <KpiCard icon={<FileText />} label="On Leave Today" value={overview.onLeaveToday} color="#8B5CF6" />
            <KpiCard icon={<TrendingUp />} label="Currently Outside" value={overview.currentlyOutside} color="#F59E0B" />
            <KpiCard icon={<Clock />} label="Pending Approvals" value={overview.pendingLeave + overview.pendingExit} color="#F97316" sub={`${overview.pendingLeave} leave · ${overview.pendingExit} exit`} />
            <KpiCard icon={<AlertCircle />} label="Late Returns" value={overview.lateReturns} color="var(--red-400)" />
            <KpiCard icon={<XCircle />} label="Critical Cases" value={overview.criticalCases} color="#DC2626" />
            <KpiCard icon={<Briefcase />} label="Total Managers" value={overview.totalManagers} color="var(--primary-400)" />
            <KpiCard icon={<Users />} label="Total HR" value={overview.totalHR} color="#EC4899" />
            <KpiCard icon={<Shield />} label="Security Staff" value={overview.totalSecurity} color="#64748B" />
            <KpiCard icon={<UserX />} label="Inactive Users" value={overview.inactiveUsers} color="var(--slate-400)" />
          </div>

          {/* Critical Alerts */}
          {(overview.criticalCases > 0 || overview.lateReturns > 0) && (
            <div style={{
              padding: '14px 18px', borderRadius: 12, marginBottom: 24,
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <AlertCircle size={20} color="#DC2626" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#DC2626' }}>Attention Required</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {overview.criticalCases > 0 && `${overview.criticalCases} critical pending case${overview.criticalCases > 1 ? 's' : ''} require escalation. `}
                  {overview.lateReturns > 0 && `${overview.lateReturns} employee${overview.lateReturns > 1 ? 's are' : ' is'} overdue on return.`}
                </div>
              </div>
            </div>
          )}

          {/* Department Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} color="var(--primary-400)" />
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Department-Wise Summary</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>Today</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-alt, rgba(255,255,255,0.03))' }}>
                    {['Department', 'Total', 'Present', 'Absent', 'On Leave', 'Outside', 'Late Returns'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: h === 'Department' ? 'left' : 'center',
                        fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: '1px solid var(--border)'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deptSummary.map((dept, i) => (
                    <tr key={dept.id} style={{ borderBottom: i < deptSummary.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div>{dept.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{dept.code}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{dept.total}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ color: 'var(--emerald-500)', fontWeight: 600 }}>{dept.present}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ color: dept.absent > 0 ? 'var(--red-400)' : 'var(--text-secondary)', fontWeight: dept.absent > 0 ? 600 : 400 }}>{dept.absent}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ color: '#8B5CF6', fontWeight: dept.onLeave > 0 ? 600 : 400 }}>{dept.onLeave}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ color: '#F59E0B', fontWeight: dept.outside > 0 ? 600 : 400 }}>{dept.outside}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {dept.late > 0 ? (
                          <span style={{
                            padding: '3px 10px', borderRadius: 20,
                            background: 'rgba(239,68,68,0.12)', color: 'var(--red-400)',
                            fontWeight: 700, fontSize: '0.78rem'
                          }}>{dept.late}</span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(99,102,241,0.05)', borderTop: '2px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--primary-400)', fontSize: '0.82rem' }}>TOTALS</td>
                    {[
                      deptSummary.reduce((s, d) => s + d.total, 0),
                      deptSummary.reduce((s, d) => s + d.present, 0),
                      deptSummary.reduce((s, d) => s + d.absent, 0),
                      deptSummary.reduce((s, d) => s + d.onLeave, 0),
                      deptSummary.reduce((s, d) => s + d.outside, 0),
                      deptSummary.reduce((s, d) => s + d.late, 0),
                    ].map((v, i) => (
                      <td key={i} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>{v}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-secondary)' }}>Failed to load data</div>
      )}
    </div>
  );
}
