'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Search, Link2, Link2Off, UserCheck, AlertCircle, CheckCircle2, Clock, XCircle, ArrowRight, Users, RefreshCw, GitBranch } from 'lucide-react';

type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE' | 'NEEDS_REASSIGNMENT';
type ConnectionType = 'REPORTING_MANAGER' | 'HR_AUTHORITY' | 'GM_AUTHORITY' | 'HIGHER_AUTHORITY';

interface Connection {
  id: string;
  connectionType: ConnectionType;
  status: ConnectionStatus;
  startDate?: string;
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  authorityUser?: {
    id: string;
    email: string;
    role: string;
    employee?: {
      employeeCode: string;
      firstName: string;
      lastName: string;
      designation: string;
      avatarUrl?: string;
      department?: { name: string };
    };
  };
  user?: {
    id: string;
    email: string;
    role: string;
    employee?: {
      employeeCode: string;
      firstName: string;
      lastName: string;
      designation: string;
      avatarUrl?: string;
      department?: { name: string };
    };
  };
}

interface SearchResult {
  id: string;
  email: string;
  role: string;
  employee?: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation: string;
    department?: string;
    avatarUrl?: string;
  };
}

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  REPORTING_MANAGER: 'Manager Authority',
  HR_AUTHORITY: 'HR Authority',
  GM_AUTHORITY: 'GM Authority',
  HIGHER_AUTHORITY: 'Higher Authority'
};

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pending', color: 'var(--amber-500)', icon: <Clock size={13} /> },
  ACTIVE: { label: 'Active', color: 'var(--emerald-500)', icon: <CheckCircle2 size={13} /> },
  REJECTED: { label: 'Rejected', color: 'var(--red-500)', icon: <XCircle size={13} /> },
  INACTIVE: { label: 'Inactive', color: 'var(--slate-400)', icon: <Link2Off size={13} /> },
  NEEDS_REASSIGNMENT: { label: 'Needs Reassignment', color: '#f97316', icon: <AlertCircle size={13} /> }
};

export default function AuthorityPage() {
  const { user } = useAuth();
  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [pendingInbox, setPendingInbox] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-authorities' | 'requests-inbox' | 'connect-new'>('my-authorities');

  // Connect new state
  const [selectedType, setSelectedType] = useState<ConnectionType>('REPORTING_MANAGER');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [connRes, inboxRes] = await Promise.all([
        api.get('/authority/my-connections'),
        api.get('/authority/pending-connections')
      ]);
      if (connRes.data?.success) setMyConnections(connRes.data.data);
      if (inboxRes.data?.success) setPendingInbox(inboxRes.data.data);
    } catch (err) {
      console.error('Failed to fetch authority data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(async (q: string, type: ConnectionType) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/authority/search?q=${encodeURIComponent(q)}&connectionType=${type}`);
      if (res.data?.success) setSearchResults(res.data.data);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(searchQuery, selectedType), 400);
    return () => clearTimeout(t);
  }, [searchQuery, selectedType, handleSearch]);

  const handleConnect = async (authorityUserId: string) => {
    setConnecting(authorityUserId);
    setActionMsg(null);
    try {
      await api.post('/authority/connect', { authorityUserId, connectionType: selectedType });
      setActionMsg({ type: 'success', text: 'Connection request sent successfully!' });
      setSearchQuery('');
      setSearchResults([]);
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send request' });
    } finally {
      setConnecting(null);
    }
  };

  const handleRespond = async (connectionId: string, status: 'ACTIVE' | 'REJECTED', reason?: string) => {
    try {
      await api.patch(`/authority/${connectionId}/respond`, { status, rejectionReason: reason });
      setActionMsg({ type: 'success', text: status === 'ACTIVE' ? 'Connection accepted!' : 'Connection declined.' });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to respond' });
    }
  };

  const handleDeactivate = async (connectionId: string) => {
    if (!confirm('Are you sure you want to deactivate this connection?')) return;
    try {
      await api.patch(`/authority/${connectionId}/deactivate`, {});
      setActionMsg({ type: 'success', text: 'Connection deactivated.' });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Failed to deactivate' });
    }
  };

  const EmployeeCard = ({ emp, role, extra }: { emp: any; role?: string; extra?: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0
      }}>
        {emp?.avatarUrl ? <img src={emp.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : `${emp?.firstName?.[0] || ''}${emp?.lastName?.[0] || ''}`}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {emp?.firstName} {emp?.lastName}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {emp?.employeeCode} · {emp?.designation}
        </div>
        {emp?.department && <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{emp.department?.name || emp.department}</div>}
      </div>
      {extra}
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <GitBranch size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Authority Connections</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Connect with your manager, HR and GM so your requests reach the right people
            </p>
          </div>
        </div>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
          background: actionMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${actionMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: actionMsg.type === 'success' ? 'var(--emerald-400)' : 'var(--red-400)'
        }}>
          {actionMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Pending inbox badge */}
      {pendingInbox.length > 0 && (
        <div
          onClick={() => setActiveTab('requests-inbox')}
          style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16, cursor: 'pointer',
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', gap: 10, color: 'var(--amber-400)'
          }}
        >
          <Clock size={18} />
          <span style={{ fontWeight: 600 }}>{pendingInbox.length} pending connection request{pendingInbox.length > 1 ? 's' : ''} awaiting your response</span>
          <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { id: 'my-authorities', label: 'My Authorities', icon: <Link2 size={14} /> },
          { id: 'requests-inbox', label: `Requests Inbox${pendingInbox.length > 0 ? ` (${pendingInbox.length})` : ''}`, icon: <UserCheck size={14} /> },
          { id: 'connect-new', label: 'Connect New', icon: <Search size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '8px 8px 0 0',
              border: 'none', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
              background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary-400)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-400)' : '2px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab: My Authorities */}
      {activeTab === 'my-authorities' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading...</div>
          ) : myConnections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
              <GitBranch size={40} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No authority connections yet</div>
              <div style={{ fontSize: '0.83rem' }}>Go to "Connect New" tab to find and connect with your manager and HR</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myConnections.map(conn => {
                const statusCfg = STATUS_CONFIG[conn.status];
                const emp = conn.authorityUser?.employee;
                return (
                  <div key={conn.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary-400)', marginBottom: 8 }}>
                          {CONNECTION_TYPE_LABELS[conn.connectionType]}
                        </div>
                        {emp ? <EmployeeCard emp={emp} role={conn.authorityUser?.role} /> : (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{conn.authorityUser?.email}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                          borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                          background: `${statusCfg.color}18`, color: statusCfg.color
                        }}>
                          {statusCfg.icon}{statusCfg.label}
                        </div>
                        {conn.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleDeactivate(conn.id)}
                            style={{ fontSize: '0.73rem', color: 'var(--red-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Deactivate
                          </button>
                        )}
                        {conn.status === 'NEEDS_REASSIGNMENT' && (
                          <div style={{ fontSize: '0.73rem', color: '#f97316' }}>
                            ⚠ Please connect a new authority
                          </div>
                        )}
                      </div>
                    </div>
                    {conn.rejectionReason && (
                      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', fontSize: '0.78rem', color: 'var(--red-400)' }}>
                        Rejection reason: {conn.rejectionReason}
                      </div>
                    )}
                    {conn.startDate && conn.status === 'ACTIVE' && (
                      <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        Active since {new Date(conn.startDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Requests Inbox */}
      {activeTab === 'requests-inbox' && (
        <div>
          {pendingInbox.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
              <UserCheck size={40} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600 }}>No pending connection requests</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingInbox.map(conn => {
                const emp = conn.user?.employee;
                return (
                  <div key={conn.id} className="card" style={{ padding: 16, borderLeft: '3px solid var(--amber-500)' }}>
                    <div style={{ fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--amber-400)', marginBottom: 10 }}>
                      Wants you as their {CONNECTION_TYPE_LABELS[conn.connectionType]}
                    </div>
                    {emp ? <EmployeeCard emp={emp} role={conn.user?.role} /> : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{conn.user?.email}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button
                        onClick={() => handleRespond(conn.id, 'ACTIVE')}
                        className="btn-primary"
                        style={{ fontSize: '0.82rem', padding: '7px 18px' }}
                      >
                        <CheckCircle2 size={14} /> Accept
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for declining (optional):') || '';
                          handleRespond(conn.id, 'REJECTED', reason);
                        }}
                        style={{
                          fontSize: '0.82rem', padding: '7px 18px', borderRadius: 8,
                          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                          color: 'var(--red-400)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                        }}
                      >
                        <XCircle size={14} /> Decline
                      </button>
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      Requested {new Date(conn.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Connect New */}
      {activeTab === 'connect-new' && (
        <div>
          {/* Connection type selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Connection Type
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(Object.entries(CONNECTION_TYPE_LABELS) as [ConnectionType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => { setSelectedType(type); setSearchQuery(''); setSearchResults([]); }}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                    cursor: 'pointer', border: '1px solid',
                    borderColor: selectedType === type ? 'var(--primary-400)' : 'var(--border)',
                    background: selectedType === type ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                    color: selectedType === type ? 'var(--primary-400)' : 'var(--text-secondary)',
                    transition: 'all 0.15s'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search by name or employee ID for ${CONNECTION_TYPE_LABELS[selectedType]}...`}
              style={{
                width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-primary)', fontSize: '0.87rem', outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searching && (
              <RefreshCw size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', animation: 'spin 1s linear infinite' }} />
            )}
          </div>

          {/* Results */}
          {actionMsg && (
            <div style={{
              padding: '10px 16px', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              background: actionMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${actionMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: actionMsg.type === 'success' ? 'var(--emerald-400)' : 'var(--red-400)'
            }}>
              {actionMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {actionMsg.text}
            </div>
          )}

          {searchResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {searchResults.map(result => (
                <div key={result.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700, color: 'white'
                    }}>
                      {result.employee?.avatarUrl
                        ? <img src={result.employee.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : `${result.employee?.firstName?.[0] || ''}${result.employee?.lastName?.[0] || ''}`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {result.employee?.firstName} {result.employee?.lastName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {result.employee?.employeeCode} · {result.employee?.designation}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {result.employee?.department} · <span style={{ textTransform: 'capitalize', color: 'var(--primary-400)' }}>{result.role.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConnect(result.id)}
                      disabled={connecting === result.id}
                      className="btn-primary"
                      style={{ fontSize: '0.8rem', padding: '7px 16px', flexShrink: 0 }}
                    >
                      {connecting === result.id ? '...' : <><Link2 size={13} /> Connect</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 2 && !searching ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No users found matching "{searchQuery}"
            </div>
          ) : searchQuery.length < 2 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)', fontSize: '0.85rem', opacity: 0.7 }}>
              Type at least 2 characters to search
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
