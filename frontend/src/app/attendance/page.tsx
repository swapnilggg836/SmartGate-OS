'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';
import { Calendar, Users, TrendingUp, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type ViewType = 'records' | 'monthly' | 'colleagues';

export default function AttendancePage() {
  const { user } = useAuth();
  const role = user?.role || '';
  const isSenior = ['MANAGER', 'HR', 'SUPER_ADMIN'].includes(role);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState<ViewType>(isSenior ? 'monthly' : 'records');

  const [records, setRecords] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = `month=${month}&year=${year}`;
      const [recRes, sumRes] = await Promise.all([
        api.get(`/attendance?${params}`),
        api.get('/attendance/summary')
      ]);
      setRecords(Array.isArray(recRes.data?.data) ? recRes.data.data : []);
      setSummary(sumRes.data?.data || null);

      if (isSenior) {
        const mRes = await api.get(`/attendance/monthly-summary?month=${month}&year=${year}`);
        setMonthly(Array.isArray(mRes.data?.data) ? mRes.data.data : []);
      }

      // Fetch department colleagues live status
      const colRes = await api.get('/attendance/department-colleagues');
      setColleagues(Array.isArray(colRes.data?.data) ? colRes.data.data : []);
    } catch { 
      setRecords([]); 
    } finally { 
      setLoading(false); 
    }
  }, [month, year, isSenior]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  const isPersonal = summary?.isPersonal;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={22} style={{ color: 'var(--blue-700)' }} /> Attendance
          </h1>
          <p>{isSenior ? `Monthly attendance overview — ${MONTHS[month-1]} ${year}` : 'Your personal attendance records & team status'}</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="stats-grid">
            {[
              { label: isPersonal ? 'Days Elapsed (This Month)' : 'Total Employees', value: summary.totalEmployees, color: 'var(--blue-600)' },
              { label: isPersonal ? 'Present Days' : 'Present Today', value: summary.presentCount, color: '#16a34a' },
              { label: isPersonal ? 'Exit Permissions' : 'On Exit Permission', value: summary.onExitCount, color: '#d97706' },
              { label: isPersonal ? 'Approved Leaves' : 'On Leave', value: summary.onLeaveCount, color: '#7c3aed' },
              { label: isPersonal ? 'Absent Days' : 'Absent', value: summary.absentCount, color: '#dc2626' }
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* View Switcher / Month Navigator */}
        <div className="card" style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: '6px 10px' }}><ChevronLeft size={16} /></button>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue-700)', minWidth: 160, textAlign: 'center' }}>
                {MONTHS[month-1]} {year}
              </span>
              <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: '6px 10px' }}><ChevronRight size={16} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              {isSenior ? (
                <>
                  <button className={`btn ${view === 'monthly' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('monthly')} style={{ fontSize: '0.8125rem' }}>
                    <Users size={14} /> Monthly Summary
                  </button>
                  <button className={`btn ${view === 'records' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('records')} style={{ fontSize: '0.8125rem' }}>
                    <Calendar size={14} /> Daily Records
                  </button>
                </>
              ) : (
                <>
                  <button className={`btn ${view === 'records' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('records')} style={{ fontSize: '0.8125rem' }}>
                    <Calendar size={14} /> My Records
                  </button>
                  <button className={`btn ${view === 'colleagues' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('colleagues')} style={{ fontSize: '0.8125rem' }}>
                    <Users size={14} /> Department Teammates ({colleagues.length})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Summary Table (Manager/HR/Admin) */}
        {isSenior && view === 'monthly' && (
          <div className="card">
            <div className="card-header">
              <h3><TrendingUp size={16} style={{ color: 'var(--blue-600)' }} /> {MONTHS[month-1]} {year} — Employee Summary</h3>
            </div>
            {monthly.length === 0 ? (
              <div className="empty-state"><Calendar size={32} /><h4>No Records</h4><p>No attendance data for this period.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Dept</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>On Leave</th>
                      <th>Exit Perm.</th>
                      <th>Half Day</th>
                      <th>% Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((e: any) => {
                      const workingDays = e.present + e.absent + e.onLeave + e.halfDay + e.onExitPermission;
                      const pct = workingDays > 0 ? Math.round((e.present / workingDays) * 100) : 0;
                      return (
                        <tr key={e.employeeId}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{e.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{e.employeeCode}</div>
                          </td>
                          <td style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>{e.department}</td>
                          <td><span className="badge badge-green">{e.present}</span></td>
                          <td><span className="badge badge-red">{e.absent}</span></td>
                          <td><span className="badge badge-amber">{e.onLeave}</span></td>
                          <td><span className="badge badge-blue">{e.onExitPermission}</span></td>
                          <td><span className="badge badge-slate">{e.halfDay}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, background: 'var(--slate-100)', borderRadius: 4, height: 6 }}>
                                <div style={{ width: `${pct}%`, background: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626', height: 6, borderRadius: 4, transition: 'width 0.3s' }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626', minWidth: 36 }}>{pct}%</span>
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
        )}

        {/* Department Teammates Tab (Employee View) */}
        {!isSenior && view === 'colleagues' && (
          <div className="card">
            <div className="card-header">
              <h3><UserCheck size={16} style={{ color: 'var(--blue-600)' }} /> My Department Teammates — Today's Status</h3>
            </div>
            {colleagues.length === 0 ? (
              <div className="empty-state">
                <Users size={32} />
                <h4>No Teammates Found</h4>
                <p>No other active employees registered in your department.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Teammate</th>
                      <th>Employee Code</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Status Today</th>
                      <th>Check In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colleagues.map((c: any) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%', background: 'var(--blue-700)',
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden'
                            }}>
                              {c.avatarUrl ? (
                                <img src={c.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                c.name.split(' ').map((n: string) => n[0]).join('')
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--blue-700)', fontWeight: 600 }}>
                          {c.employeeCode}
                        </td>
                        <td style={{ fontSize: '0.8125rem' }}>{c.designation}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--slate-600)' }}>{c.department}</td>
                        <td>
                          <span className={`badge ${statusBadgeClass(c.todayStatus)}`}>
                            {statusLabel(c.todayStatus)}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--slate-600)' }}>
                          {c.checkInTime ? fmtTime(c.checkInTime) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Daily Records */}
        {view === 'records' && (
          <div className="card">
            <div className="card-header">
              <h3><Calendar size={16} style={{ color: 'var(--blue-600)' }} /> Daily Records — {MONTHS[month-1]} {year}</h3>
            </div>
            {records.length === 0 ? (
              <div className="empty-state"><Calendar size={32} /><h4>No Records</h4><p>No attendance data for this month.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {isSenior && <th>Employee</th>}
                      {isSenior && <th>Department</th>}
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((a: any) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{fmtDate(a.date)}</td>
                        {isSenior && <td><div style={{ fontWeight: 600 }}>{a.employee?.firstName} {a.employee?.lastName}</div><div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{a.employee?.employeeCode}</div></td>}
                        {isSenior && <td style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>{a.employee?.department?.name || '—'}</td>}
                        <td><span className={`badge ${statusBadgeClass(a.status)}`}>{statusLabel(a.status)}</span></td>
                        <td style={{ color: 'var(--slate-600)', fontSize: '0.8125rem' }}>{a.checkInTime ? fmtTime(a.checkInTime) : '—'}</td>
                        <td style={{ color: 'var(--slate-600)', fontSize: '0.8125rem' }}>{a.checkOutTime ? fmtTime(a.checkOutTime) : '—'}</td>
                        <td style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
