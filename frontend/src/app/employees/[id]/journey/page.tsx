'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
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

  if (loading) return <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-secondary)' }}>Loading journey...</div>;
  if (error || !data) return <div style={{ textAlign: 'center', padding: 64, color: 'var(--red-400)' }}>{error || 'Not found'}</div>;

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

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Employee Header */}
      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', fontWeight: 800, color: 'white'
        }}>
          {employee?.avatarUrl
            ? <img src={employee.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : `${employee?.firstName?.[0]}${employee?.lastName?.[0]}`}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            {employee?.firstName} {employee?.lastName}
          </div>
          <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {employee?.employeeCode} · {employee?.designation}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 size={12} /> {employee?.departmentId}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> Joined {new Date(employee?.joiningDate).toLocaleDateString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: user?.isActive ? 'var(--emerald-400)' : 'var(--red-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {user?.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {user?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', color: 'var(--primary-400)', fontWeight: 700, fontSize: '0.85rem' }}>
          {user?.role?.replace('_', ' ')}
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
  );
}
