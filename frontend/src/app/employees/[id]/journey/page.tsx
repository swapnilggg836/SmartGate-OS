'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import {
  UserCircle, Calendar, Shield, FileText, Clock, GitBranch, Activity,
  CheckCircle2, XCircle, AlertCircle, ArrowRight, Building2, Briefcase
} from 'lucide-react';

type SectionKey = 'overview' | 'history' | 'leave' | 'exit' | 'gate' | 'authority' | 'audit';

export default function EmployeeJourneyPage() {
  const params = useParams();
  const userId = params?.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');

  useEffect(() => {
    if (!userId) return;
    const fetchJourney = async () => {
      try {
        const res = await api.get(`/users/${userId}/journey`);
        if (res.data?.success) setData(res.data.data);
        else setError('Failed to load journey');
      } catch {
        setError('Unable to fetch employee journey');
      } finally {
        setLoading(false);
      }
    };
    fetchJourney();
  }, [userId]);

  if (loading) return <AppLayout><PageLoader /></AppLayout>;
  if (error || !data) return (
    <AppLayout>
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <AlertCircle size={36} color="var(--red-600)" style={{ margin: '0 auto 12px' }} />
        <h4>{error || 'Employee Journey Not Found'}</h4>
      </div>
    </AppLayout>
  );

  const { employee, user, statusHistory, leaveRequests, exitRequests, gatePassHistory, authorityConnections, auditLogs } = data;

  const sections: { id: SectionKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <UserCircle size={14} /> },
    { id: 'history', label: 'Status History', icon: <Activity size={14} />, count: statusHistory.length },
    { id: 'leave', label: 'Leave Requests', icon: <Calendar size={14} />, count: leaveRequests.length },
    { id: 'exit', label: 'Exit Permissions', icon: <FileText size={14} />, count: exitRequests.length },
    { id: 'gate', label: 'Gate Passes', icon: <Shield size={14} />, count: gatePassHistory.length },
    { id: 'authority', label: 'Authority Connections', icon: <GitBranch size={14} />, count: authorityConnections.length },
    { id: 'audit', label: 'Audit Trail', icon: <Clock size={14} />, count: auditLogs.length }
  ];

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      APPROVED: 'var(--emerald-500)', REJECTED: 'var(--red-400)',
      PENDING_MANAGER: '#F59E0B', PENDING_HR: '#8B5CF6',
      CANCELLED: 'var(--slate-400)', COMPLETED: 'var(--emerald-500)',
      ACTIVE: 'var(--emerald-500)', EXITED: '#F59E0B', RETURNED: 'var(--emerald-500)',
      LATE_RETURN: 'var(--red-400)', OVERDUE: '#DC2626', CRITICAL: '#DC2626',
      SENT_BACK: '#F97316'
    };
    const color = colors[status] || 'var(--text-secondary)';
    return (
      <span style={{
        padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
        background: `${color}18`, color, border: `1px solid ${color}30`
      }}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const exportToCsv = () => {
    if (!data) return;
    const { employee, user, statusHistory, leaveRequests, exitRequests, gatePassHistory, authorityConnections, auditLogs } = data;
    const lines: string[] = [];

    lines.push('=== SMARTGATE OS - 360 DEGREE EMPLOYEE JOURNEY REPORT ===');
    lines.push(`Generated on,${new Date().toLocaleString()}`);
    lines.push('');

    lines.push('--- EMPLOYEE PROFILE ---');
    lines.push(`Employee Name,"${employee.firstName} ${employee.lastName}"`);
    lines.push(`Employee ID,${employee.employeeCode}`);
    lines.push(`Work Email,${user.email}`);
    lines.push(`Role,${user.role}`);
    lines.push(`Designation,"${employee.designation}"`);
    lines.push(`Department,"${employee.departmentId || ''}"`);
    lines.push(`Joining Date,${new Date(employee.joiningDate).toLocaleDateString()}`);
    lines.push(`Account Status,${user.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    lines.push('');

    lines.push('--- STATUS & DEPARTMENT TRANSFER HISTORY ---');
    lines.push('Date,Change Type,Old Value,New Value,Notes');
    statusHistory.forEach((h: any) => {
      lines.push(`${new Date(h.createdAt).toLocaleDateString()},${h.changeType},"${h.oldValue || ''}","${h.newValue || ''}","${h.notes || ''}"`);
    });
    lines.push('');

    lines.push('--- LEAVE REQUESTS HISTORY ---');
    lines.push('Request ID,Leave Type,From Date,To Date,Days,Status,Reason');
    leaveRequests.forEach((l: any) => {
      lines.push(`${l.id},${l.leaveType?.name || 'Leave'},${new Date(l.fromDate).toLocaleDateString()},${new Date(l.toDate).toLocaleDateString()},${l.totalDays},${l.status},"${(l.reason || '').replace(/"/g, '""')}"`);
    });
    lines.push('');

    lines.push('--- EXIT PERMISSIONS & GATE PASS HISTORY ---');
    lines.push('Pass Number,Exit Date,Exit Time,Expected Return,Actual Exit,Actual Return,Destination,Status');
    gatePassHistory.forEach((g: any) => {
      lines.push(`${g.passNumber},${new Date(g.createdAt).toLocaleDateString()},${g.exitRequest?.exitTime || ''},${g.exitRequest?.expectedReturnTime || ''},${g.gateLogs?.[0]?.actualExitTime ? new Date(g.gateLogs[0].actualExitTime).toLocaleTimeString() : '—'},${g.gateLogs?.[0]?.actualReturnTime ? new Date(g.gateLogs[0].actualReturnTime).toLocaleTimeString() : '—'},"${g.exitRequest?.destination || ''}",${g.status}`);
    });
    lines.push('');

    lines.push('--- AUTHORITY CONNECTIONS ---');
    lines.push('Connection Type,Authority User,Status');
    authorityConnections.forEach((c: any) => {
      lines.push(`${c.connectionType},"${c.authorityUser?.employee?.firstName || ''} ${c.authorityUser?.employee?.lastName || c.authorityUser?.email}",${c.status}`);
    });
    lines.push('');

    lines.push('--- AUDIT TRAIL ---');
    lines.push('Action,Entity,Entity ID,Date');
    auditLogs.forEach((a: any) => {
      lines.push(`${a.action},${a.entity},${a.entityId},${new Date(a.createdAt).toLocaleString()}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `360-journey-${employee.employeeCode}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
      {/* Employee Header */}
      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--blue-700), var(--blue-500))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', fontWeight: 800, color: 'white'
        }}>
          {employee?.avatarUrl
            ? <img src={employee.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : `${employee?.firstName?.[0]}${employee?.lastName?.[0]}`}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--slate-800)' }}>
            {employee?.firstName} {employee?.lastName}
          </div>
          <div style={{ fontSize: '0.83rem', color: 'var(--slate-600)', marginTop: 2 }}>
            {employee?.employeeCode} · {employee?.designation}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 size={12} /> {employee?.departmentId}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> Joined {new Date(employee?.joiningDate).toLocaleDateString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: user?.isActive ? 'var(--green-700)' : 'var(--red-600)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {user?.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {user?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={exportToCsv}>
            <FileText size={14} /> Download 360° Report (.CSV)
          </button>
          <div style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--blue-50)', color: 'var(--blue-700)', fontWeight: 700, fontSize: '0.8rem' }}>
            {user?.role?.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
              borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 600, background: 'transparent',
              color: activeSection === s.id ? 'var(--primary-400)' : 'var(--text-secondary)',
              borderBottom: activeSection === s.id ? '2px solid var(--primary-400)' : '2px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            {s.icon}{s.label}
            {s.count !== undefined && s.count > 0 && (
              <span style={{ padding: '1px 6px', borderRadius: 10, background: 'var(--primary-600)', color: 'white', fontSize: '0.65rem', fontWeight: 700 }}>{s.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { label: 'Leave Requests', value: leaveRequests.length, color: '#8B5CF6' },
            { label: 'Approved Leaves', value: leaveRequests.filter((r: any) => r.status === 'APPROVED').length, color: 'var(--emerald-500)' },
            { label: 'Exit Permissions', value: exitRequests.length, color: '#F59E0B' },
            { label: 'Gate Passes', value: gatePassHistory.length, color: 'var(--primary-400)' },
            { label: 'Authority Links', value: authorityConnections.length, color: '#EC4899' },
            { label: 'Audit Events', value: auditLogs.length, color: 'var(--slate-400)' }
          ].map(item => (
            <div key={item.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status History */}
      {activeSection === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {statusHistory.length === 0 ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>No status changes recorded</div> : null}
          {statusHistory.map((h: any) => (
            <div key={h.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={14} color="var(--primary-400)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{h.changeType.replace(/_/g, ' ')}</div>
                {h.oldValue && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{h.oldValue} <ArrowRight size={10} style={{ verticalAlign: 'middle' }} /> {h.newValue}</div>}
                {h.notes && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{h.notes}</div>}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>{new Date(h.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Leave Requests */}
      {activeSection === 'leave' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leaveRequests.length === 0 ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>No leave requests</div> : null}
          {leaveRequests.map((r: any) => (
            <div key={r.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.87rem', color: 'var(--text-primary)' }}>{r.leaveType?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {new Date(r.fromDate).toLocaleDateString()} → {new Date(r.toDate).toLocaleDateString()} ({r.totalDays} days)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 3 }}>{r.reason}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.approvals?.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {r.approvals.map((a: any) => (
                    <div key={a.id} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {a.status === 'APPROVED' ? <CheckCircle2 size={11} color="var(--emerald-500)" /> : <XCircle size={11} color="var(--red-400)" />}
                      {a.approver?.employee?.firstName} ({a.approverRole})
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                Submitted {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exit Permissions */}
      {activeSection === 'exit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exitRequests.length === 0 ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>No exit permission requests</div> : null}
          {exitRequests.map((r: any) => (
            <div key={r.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.87rem', color: 'var(--text-primary)' }}>
                    {r.destination}
                    {r.isUrgent && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: 'var(--red-400)', fontWeight: 700 }}>URGENT</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {new Date(r.exitDate).toLocaleDateString()} · {r.exitTime} → {r.expectedReturnTime}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{r.reason}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.gatePass?.gateLogs?.length > 0 && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', fontSize: '0.75rem' }}>
                  {r.gatePass.gateLogs.map((log: any) => (
                    <div key={log.id} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>Exit: <strong>{log.actualExitTime ? new Date(log.actualExitTime).toLocaleTimeString() : '—'}</strong></span>
                      <span>Return: <strong>{log.actualReturnTime ? new Date(log.actualReturnTime).toLocaleTimeString() : '—'}</strong></span>
                      {log.lateMinutes > 0 && <span style={{ color: 'var(--red-400)' }}>Late: {log.lateMinutes}m</span>}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Submitted {new Date(r.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gate Passes */}
      {activeSection === 'gate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gatePassHistory.length === 0 ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>No gate passes</div> : null}
          {gatePassHistory.map((gp: any) => (
            <div key={gp.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--primary-400)', fontFamily: 'monospace', fontSize: '0.9rem' }}>{gp.passNumber}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Valid: {new Date(gp.validFrom).toLocaleString()} → {new Date(gp.validUntil).toLocaleString()}
                  </div>
                </div>
                <StatusBadge status={gp.status} />
              </div>
              {gp.gateLogs?.map((log: any) => (
                <div key={log.id} style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>Exit Status: <StatusBadge status={log.exitStatus} /></span>
                    <span>Return Status: <StatusBadge status={log.returnStatus} /></span>
                    {log.lateMinutes > 0 && <span style={{ color: 'var(--red-400)', fontWeight: 700 }}>Late: {log.lateMinutes} min</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Authority Connections */}
      {activeSection === 'authority' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {authorityConnections.length === 0 ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>No authority connections</div> : null}
          {authorityConnections.map((conn: any) => (
            <div key={conn.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary-400)', marginBottom: 4 }}>
                    {conn.connectionType.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.87rem' }}>
                    {conn.authorityUser?.employee?.firstName} {conn.authorityUser?.employee?.lastName}
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginLeft: 6 }}>({conn.authorityUser?.employee?.employeeCode})</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {conn.authorityUser?.employee?.designation} · {conn.authorityUser?.role}
                  </div>
                </div>
                <StatusBadge status={conn.status} />
              </div>
              <div style={{ marginTop: 6, fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                {conn.startDate ? `Active since ${new Date(conn.startDate).toLocaleDateString()} · ` : ''}
                Requested {new Date(conn.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Logs */}
      {activeSection === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {auditLogs.length === 0 ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>No audit events</div> : null}
          {auditLogs.map((log: any) => (
            <div key={log.id} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={12} color="var(--slate-400)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{log.action.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 1 }}>{log.entity} · {log.entityId.slice(0, 12)}...</div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>{new Date(log.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AppLayout>
  );
}
