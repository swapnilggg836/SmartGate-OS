'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Search, Link2, Link2Off, UserCheck, AlertCircle, CheckCircle2, Clock, XCircle, ArrowRight, Users, RefreshCw, GitBranch, ShieldCheck } from 'lucide-react';

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
                <GitBranch size={22} style={{ color: 'var(--blue-700)' }} /> Authority Connections
              </h1>
              <p>Connect with your manager, HR and GM so your leave and exit requests reach the right approvers</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={fetchData}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Action message */}
        {actionMsg && (
          <div className={`alert ${actionMsg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actionMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span style={{ flex: 1 }}>{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Pending inbox banner */}
        {pendingInbox.length > 0 && (
          <div
            onClick={() => setActiveTab('requests-inbox')}
            className="card"
            style={{
              padding: '14px 18px', cursor: 'pointer', borderLeft: '4px solid var(--amber-500)',
              background: 'var(--amber-50)', display: 'flex', alignItems: 'center', gap: 12
            }}
          >
            <Clock size={20} color="var(--amber-600)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--amber-800)' }}>
                {pendingInbox.length} Pending Connection Request{pendingInbox.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--amber-700)' }}>
                Employees are requesting you to be their reporting authority. Click to review.
              </div>
            </div>
            <ArrowRight size={18} color="var(--amber-700)" />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--blue-100)', gap: 8 }}>
          {[
            { id: 'my-authorities', label: 'My Authorities', icon: <Link2 size={15} /> },
            { id: 'requests-inbox', label: `Requests Inbox${pendingInbox.length > 0 ? ` (${pendingInbox.length})` : ''}`, icon: <UserCheck size={15} /> },
            { id: 'connect-new', label: 'Connect New Authority', icon: <Search size={15} /> }
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

        {/* Tab: My Authorities */}
        {activeTab === 'my-authorities' && (
          <div className="space-y-3">
            {myConnections.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <GitBranch size={40} style={{ color: 'var(--slate-400)' }} />
                  <h4>No Authority Connections Yet</h4>
                  <p>You need to connect with your Reporting Manager and HR so your leave and exit permissions can be routed and approved.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('connect-new')}>
                    <Search size={14} /> Connect New Authority
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {myConnections.map(conn => {
                  const statusCfg = STATUS_CONFIG[conn.status];
                  const emp = conn.authorityUser?.employee;
                  return (
                    <div key={conn.id} className="card" style={{ padding: 18, borderLeft: `4px solid ${conn.status === 'ACTIVE' ? 'var(--green-500)' : 'var(--amber-500)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <span className="badge badge-blue" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                          {CONNECTION_TYPE_LABELS[conn.connectionType]}
                        </span>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px',
                          borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                          background: `${statusCfg.color}18`, color: statusCfg.color
                        }}>
                          {statusCfg.icon}{statusCfg.label}
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        {emp ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: '50%', background: 'var(--blue-700)',
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                            }}>
                              {emp.avatarUrl ? <img src={emp.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : `${emp.firstName[0]}${emp.lastName[0]}`}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--slate-800)' }}>
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                                {emp.employeeCode} · {emp.designation}
                              </div>
                              {emp.department && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--blue-600)', fontWeight: 500, marginTop: 2 }}>
                                  🏢 {emp.department.name}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--slate-700)', fontWeight: 600, fontSize: '0.9rem' }}>{conn.authorityUser?.email}</div>
                        )}
                      </div>

                      {conn.rejectionReason && (
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', fontSize: '0.78rem', marginBottom: 10 }}>
                          <strong>Reason:</strong> {conn.rejectionReason}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--slate-100)', paddingTop: 10, marginTop: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>
                          {conn.startDate ? `Since ${new Date(conn.startDate).toLocaleDateString()}` : `Requested ${new Date(conn.createdAt).toLocaleDateString()}`}
                        </span>
                        {conn.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleDeactivate(conn.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red-600)', fontSize: '0.75rem', padding: '4px 8px' }}
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Requests Inbox */}
        {activeTab === 'requests-inbox' && (
          <div className="space-y-3">
            {pendingInbox.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <UserCheck size={40} style={{ color: 'var(--slate-400)' }} />
                  <h4>No Pending Connection Requests</h4>
                  <p>When employees request you as their Manager or HR authority, their requests will appear here for your review.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {pendingInbox.map(conn => {
                  const emp = conn.user?.employee;
                  return (
                    <div key={conn.id} className="card" style={{ padding: 18, borderLeft: '4px solid var(--amber-500)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--amber-700)', marginBottom: 10 }}>
                        Wants you as {CONNECTION_TYPE_LABELS[conn.connectionType]}
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        {emp ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: '50%', background: 'var(--blue-700)',
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                            }}>
                              {emp.avatarUrl ? <img src={emp.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : `${emp.firstName[0]}${emp.lastName[0]}`}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--slate-800)' }}>
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                                {emp.employeeCode} · {emp.designation}
                              </div>
                              {emp.department && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--blue-600)', fontWeight: 500, marginTop: 2 }}>
                                  🏢 {emp.department.name}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--slate-700)', fontWeight: 600, fontSize: '0.9rem' }}>{conn.user?.email}</div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => handleRespond(conn.id, 'ACTIVE')}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                        >
                          <CheckCircle2 size={14} /> Accept
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for declining (optional):') || '';
                            handleRespond(conn.id, 'REJECTED', reason);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--red-600)', borderColor: 'var(--red-300)' }}
                        >
                          <XCircle size={14} /> Decline
                        </button>
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
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Search size={16} /> Search & Connect Authority</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Select Authority Level</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(Object.entries(CONNECTION_TYPE_LABELS) as [ConnectionType, string][]).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setSelectedType(type); setSearchQuery(''); setSearchResults([]); }}
                      className={`btn btn-sm ${selectedType === type ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input
                  className="form-control"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Type name or employee ID to search for ${CONNECTION_TYPE_LABELS[selectedType]}...`}
                  style={{ paddingLeft: 36 }}
                />
                {searching && (
                  <RefreshCw size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--blue-600)', animation: 'spin 1s linear infinite' }} />
                )}
              </div>

              {searchResults.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                  {searchResults.map(result => (
                    <div key={result.id} className="card" style={{ padding: 14, background: 'var(--slate-50)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', background: 'var(--blue-700)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                        }}>
                          {result.employee?.avatarUrl ? <img src={result.employee.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : `${result.employee?.firstName?.[0] || ''}${result.employee?.lastName?.[0] || ''}`}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--slate-800)' }}>
                            {result.employee?.firstName} {result.employee?.lastName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                            {result.employee?.employeeCode} · {result.employee?.designation}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--blue-600)', fontWeight: 600 }}>
                            {result.role.replace('_', ' ')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleConnect(result.id)}
                          disabled={connecting === result.id}
                          className="btn btn-primary btn-sm"
                        >
                          {connecting === result.id ? <Spinner white size="sm" /> : <><Link2 size={13} /> Connect</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 && !searching ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate-500)', fontSize: '0.875rem' }}>
                  No authorities found matching "{searchQuery}"
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--slate-400)', fontSize: '0.82rem' }}>
                  Type at least 2 characters to search for employees
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
