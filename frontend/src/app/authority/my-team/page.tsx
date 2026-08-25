'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Users, FileText, Clock, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Junior {
  id: string;
  connectionType: string;
  status: string;
  createdAt: string;
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
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchJuniors = async () => {
      try {
        const res = await api.get('/authority/my-juniors');
        if (res.data?.success) setJuniors(res.data.data);
      } catch (err) {
        console.error('Failed to fetch team', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJuniors();
  }, []);

  const connectionTypes = Array.from(new Set(juniors.map(j => j.connectionType)));
  const filtered = filter === 'ALL' ? juniors : juniors.filter(j => j.connectionType === filter);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Users size={20} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>My Team</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            People directly connected to you — {juniors.length} member{juniors.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      {connectionTypes.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {['ALL', ...connectionTypes].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                borderColor: filter === type ? 'var(--primary-400)' : 'var(--border)',
                background: filter === type ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                color: filter === type ? 'var(--primary-400)' : 'var(--text-secondary)',
                transition: 'all 0.15s'
              }}
            >
              {type === 'ALL' ? 'All' : CONNECTION_LABELS[type] || type}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>Loading team...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
          <Users size={48} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No team members yet</div>
          <div style={{ fontSize: '0.83rem' }}>Employees will appear here once they connect you as their authority</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(conn => {
            const emp = conn.user?.employee;
            const pendingLeave = emp?.leaveRequests?.length || 0;
            const pendingExit = emp?.exitRequests?.length || 0;
            const totalPending = pendingLeave + pendingExit;

            return (
              <div key={conn.id} className="card" style={{ padding: 16, position: 'relative' }}>
                {/* Badge */}
                <div style={{
                  position: 'absolute', top: 10, right: 10, fontSize: '0.65rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '3px 8px', borderRadius: 20,
                  background: 'rgba(99,102,241,0.15)', color: 'var(--primary-400)'
                }}>
                  {CONNECTION_LABELS[conn.connectionType] || conn.connectionType}
                </div>

                {/* Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, marginRight: 60 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                    background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 700, color: 'white'
                  }}>
                    {emp?.avatarUrl
                      ? <img src={emp.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : `${emp?.firstName?.[0] || ''}${emp?.lastName?.[0] || ''}`}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {emp?.firstName} {emp?.lastName}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      {emp?.employeeCode} · {conn.user?.role?.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                      {emp?.designation}
                    </div>
                  </div>
                </div>

                {/* Dept */}
                {emp?.department && (
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginBottom: 10 }}>
                    🏢 {emp.department.name}
                  </div>
                )}

                {/* Pending requests */}
                {totalPending > 0 ? (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.78rem', color: 'var(--amber-400)', marginBottom: 10
                  }}>
                    <Clock size={13} />
                    {totalPending} pending request{totalPending > 1 ? 's' : ''} awaiting approval
                  </div>
                ) : (
                  <div style={{ fontSize: '0.73rem', color: 'var(--emerald-400)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                    <CheckCircle2 size={13} /> No pending requests
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link
                    href={`/approvals?userId=${conn.user?.id}`}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: 8, textAlign: 'center',
                      fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
                      background: 'var(--primary-600)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                    }}
                  >
                    <FileText size={12} /> View Requests
                  </Link>
                  <Link
                    href={`/employees/${conn.user?.employee?.id}`}
                    style={{
                      padding: '7px 10px', borderRadius: 8,
                      fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
