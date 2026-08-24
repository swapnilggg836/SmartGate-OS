'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { UserCheck, Search, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { fmtDate } from '@/lib/utils';

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/users').then(r => setUsers(r.data?.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    `${u.email} ${u.role} ${u.employee?.firstName} ${u.employee?.lastName} ${u.employee?.employeeCode}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = async (userId: string, isActive: boolean) => {
    setToggling(userId);
    try {
      await api.patch(`/users/${userId}/status`, { isActive: !isActive });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally { setToggling(null); setConfirmModal({ open: false, user: null }); }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
    }
  };

  const ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'SECURITY_GUARD', 'SUPER_ADMIN'];

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1><UserCheck size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--blue-700)' }} />User Management</h1>
              <p>{users.length} users in the system</p>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error"><AlertCircle size={14} /><span>{error}</span><button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>×</button></div>}

        <div className="card">
          <div className="card-header">
            <div className="form-input-icon" style={{ maxWidth: 300 }}>
              <Search size={14} />
              <input className="form-control" placeholder="Search by email, name, role..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>{filtered.length} results</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state"><UserCheck size={36} /><h4>No Users Found</h4></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((u: any) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          {u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : u.email}
                        </div>
                        {u.employee && <div style={{ fontSize: '0.6875rem', color: 'var(--slate-400)' }}>{u.employee.employeeCode}</div>}
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{u.email}</td>
                      <td>
                        <select
                          className="form-control"
                          value={u.role}
                          onChange={e => changeRole(u.id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', minWidth: 120 }}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{fmtDate(u.createdAt)}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${u.isActive ? 'btn-danger-outline' : 'btn-success'}`}
                          onClick={() => setConfirmModal({ open: true, user: u })}
                          disabled={toggling === u.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          {u.isActive ? <><ToggleRight size={13} /> Deactivate</> : <><ToggleLeft size={13} /> Activate</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, user: null })}
        title={confirmModal.user?.isActive ? 'Deactivate User?' : 'Activate User?'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setConfirmModal({ open: false, user: null })}>Cancel</button>
          <button
            className={`btn ${confirmModal.user?.isActive ? 'btn-danger' : 'btn-success'}`}
            onClick={() => toggleActive(confirmModal.user?.id, confirmModal.user?.isActive)}
          >
            {confirmModal.user?.isActive ? 'Yes, Deactivate' : 'Yes, Activate'}
          </button>
        </>}
      >
        <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem' }}>
          {confirmModal.user?.isActive
            ? `This will prevent ${confirmModal.user?.email} from logging in.`
            : `This will restore access for ${confirmModal.user?.email}.`}
        </p>
      </Modal>
    </AppLayout>
  );
}
