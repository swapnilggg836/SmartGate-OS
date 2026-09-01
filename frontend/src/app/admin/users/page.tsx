'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import {
  UserCheck, Search, ToggleLeft, ToggleRight, AlertCircle,
  Plus, RefreshCw, Eye, EyeOff, UserPlus, Download
} from 'lucide-react';
import { fmtDate } from '@/lib/utils';

const ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'GM', 'SECURITY_GUARD', 'SUPER_ADMIN'];

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  HR: 'HR Director',
  GM: 'General Manager',
  SECURITY_GUARD: 'Security Guard',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  EMPLOYEE: 'badge-blue',
  MANAGER: 'badge-amber',
  HR: 'badge-green',
  GM: 'badge-amber',
  SECURITY_GUARD: 'badge-slate',
  SUPER_ADMIN: 'badge-red',
};

function initials(first?: string, last?: string) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '?';
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [viewUser, setViewUser] = useState<any>(null);

  // Create form
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    role: 'EMPLOYEE', departmentId: '', designation: '', phone: '', employeeCode: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments'),
      ]);
      setUsers(usersRes.data?.data || []);
      setDepartments(deptsRes.data?.data || []);
    } catch {
      setError('Failed to load data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.employee?.firstName || '').toLowerCase().includes(q) ||
      (u.employee?.lastName || '').toLowerCase().includes(q) ||
      (u.employee?.employeeCode || '').toLowerCase().includes(q) ||
      (u.employee?.designation || '').toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL'
      || (statusFilter === 'ACTIVE' && u.isActive)
      || (statusFilter === 'INACTIVE' && !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Valid email is required';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!form.departmentId) errs.departmentId = 'Department is required';
    if (!form.designation.trim()) errs.designation = 'Designation is required';
    if (!form.phone.trim() || form.phone.length < 5) errs.phone = 'Valid phone number is required';
    if (!form.employeeCode.trim()) errs.employeeCode = 'Employee code is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    setError('');
    if (!validateForm()) return;
    setCreating(true);
    try {
      await api.post('/users', {
        email: form.email,
        password: form.password,
        role: form.role,
        firstName: form.firstName,
        lastName: form.lastName,
        departmentId: form.departmentId,
        designation: form.designation,
        phone: form.phone,
        employeeCode: form.employeeCode,
      });
      setSuccess(`✅ User "${form.firstName} ${form.lastName}" created successfully!`);
      setCreateOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'EMPLOYEE', departmentId: '', designation: '', phone: '', employeeCode: '' });
      setFormErrors({});
      load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user. Please check all fields.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    setToggling(userId);
    try {
      await api.patch(`/users/${userId}/status`, { isActive: !isActive });
      setSuccess(isActive ? 'User deactivated.' : 'User activated.');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setToggling(null);
      setConfirmModal({ open: false, user: null });
    }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setSuccess('Role updated.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
    }
  };

  const downloadCsv = () => {
    const rows = [
      ['Name', 'Email', 'Employee Code', 'Role', 'Department', 'Designation', 'Status', 'Joined'],
      ...filtered.map(u => [
        u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : '',
        u.email,
        u.employee?.employeeCode || '',
        u.role,
        u.employee?.department || '',
        u.employee?.designation || '',
        u.isActive ? 'Active' : 'Inactive',
        u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '',
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">

        {/* Header */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserCheck size={22} style={{ color: 'var(--blue-700)' }} /> User Management
              </h1>
              <p>{users.length} total users · {users.filter(u => u.isActive).length} active · {users.filter(u => !u.isActive).length} inactive</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={downloadCsv}>
                <Download size={14} /> Export CSV
              </button>
              <button className="btn btn-outline btn-sm" onClick={load}>
                <RefreshCw size={14} />
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setCreateOpen(true); setError(''); setFormErrors({}); }}>
                <UserPlus size={14} /> Create New User
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{success}</span>
            <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'inherit' }}>×</button>
          </div>
        )}
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} />
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'inherit' }}>×</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid-4">
          {[
            { label: 'Total Users', value: users.length, color: 'var(--blue-700)' },
            { label: 'Active', value: users.filter(u => u.isActive).length, color: 'var(--green-600)' },
            { label: 'Inactive', value: users.filter(u => !u.isActive).length, color: 'var(--red-600)' },
            { label: 'Departments', value: departments.length, color: 'var(--amber-600)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-card-icon" style={{ background: `${s.color}15`, color: s.color }}>
                <UserCheck size={20} />
              </div>
              <div>
                <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: '14px 18px' }}>
          <div className="filter-bar-responsive">
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--slate-400)' }} />
              <input
                className="form-control"
                placeholder="Search name, email, code, designation..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 auto' }}>
              <select className="form-control" style={{ flex: '1 1 140px', padding: '7px 10px' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="ALL">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} style={{ flex: '1 1 auto' }}>
                    {s === 'ALL' ? 'All' : s === 'ACTIVE' ? '✓ Active' : '✗ Inactive'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><UserCheck size={16} /> Users ({filtered.length})</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <UserCheck size={40} />
              <h4>No users found</h4>
              <p>Try changing the filters or create a new user.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u: any) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', background: 'var(--blue-700)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden'
                          }}>
                            {u.employee?.avatarUrl
                              ? <img src={u.employee.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : initials(u.employee?.firstName, u.employee?.lastName)
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                              {u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : u.email}
                            </div>
                            {u.employee?.designation && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{u.employee.designation}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>{u.email}</td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--blue-700)', fontWeight: 600 }}>
                          {u.employee?.employeeCode || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{u.employee?.department || '—'}</td>
                      <td>
                        <select
                          className="form-control"
                          value={u.role}
                          onChange={e => changeRole(u.id, e.target.value)}
                          style={{ padding: '4px 6px', fontSize: '0.72rem', minWidth: 110 }}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{fmtDate(u.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setViewUser(u)}
                            title="View Details"
                            style={{ padding: '4px 8px' }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-danger-outline' : 'btn-success'}`}
                            onClick={() => setConfirmModal({ open: true, user: u })}
                            disabled={toggling === u.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}
                          >
                            {toggling === u.id
                              ? <Spinner />
                              : u.isActive
                                ? <><ToggleRight size={13} /> Deactivate</>
                                : <><ToggleLeft size={13} /> Activate</>
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============================
          CREATE USER MODAL
          ============================ */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setFormErrors({}); setError(''); }}
        title="Create New User"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? <><Spinner /> Creating...</> : <><UserPlus size={14} /> Create User</>}
          </button>
        </>}
      >
        <div className="space-y-3">
          {error && (
            <div className="alert alert-error" style={{ fontSize: '0.8rem' }}>
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">First Name <span className="required">*</span></label>
              <input className={`form-control ${formErrors.firstName ? 'error' : ''}`} placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              {formErrors.firstName && <span className="form-error">{formErrors.firstName}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="required">*</span></label>
              <input className={`form-control ${formErrors.lastName ? 'error' : ''}`} placeholder="Doe" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              {formErrors.lastName && <span className="form-error">{formErrors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address <span className="required">*</span></label>
            <input className={`form-control ${formErrors.email ? 'error' : ''}`} type="email" placeholder="john.doe@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            {formErrors.email && <span className="form-error">{formErrors.email}</span>}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input className={`form-control ${formErrors.password ? 'error' : ''}`} type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {formErrors.password && <span className="form-error">{formErrors.password}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <input className={`form-control ${formErrors.confirmPassword ? 'error' : ''}`} type={showPass ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              {formErrors.confirmPassword && <span className="form-error">{formErrors.confirmPassword}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Employee Code <span className="required">*</span></label>
              <input className={`form-control ${formErrors.employeeCode ? 'error' : ''}`} placeholder="EMP1025" value={form.employeeCode} onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))} />
              {formErrors.employeeCode && <span className="form-error">{formErrors.employeeCode}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone <span className="required">*</span></label>
              <input className={`form-control ${formErrors.phone ? 'error' : ''}`} placeholder="+91 9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              {formErrors.phone && <span className="form-error">{formErrors.phone}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Department <span className="required">*</span></label>
              <select className={`form-control ${formErrors.departmentId ? 'error' : ''}`} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                <option value="">Select Department</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {formErrors.departmentId && <span className="form-error">{formErrors.departmentId}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Role <span className="required">*</span></label>
              <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Designation <span className="required">*</span></label>
            <input className={`form-control ${formErrors.designation ? 'error' : ''}`} placeholder="e.g. Software Engineer" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
            {formErrors.designation && <span className="form-error">{formErrors.designation}</span>}
          </div>
        </div>
      </Modal>

      {/* ============================
          VIEW USER DETAIL MODAL
          ============================ */}
      <Modal
        open={!!viewUser}
        onClose={() => setViewUser(null)}
        title="User Details"
        footer={<button className="btn btn-ghost" onClick={() => setViewUser(null)}>Close</button>}
      >
        {viewUser && (
          <div className="space-y-3">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--blue-700)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, overflow: 'hidden' }}>
                {viewUser.employee?.avatarUrl
                  ? <img src={viewUser.employee.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials(viewUser.employee?.firstName, viewUser.employee?.lastName)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {viewUser.employee ? `${viewUser.employee.firstName} ${viewUser.employee.lastName}` : viewUser.email}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>{viewUser.email}</div>
                <span className={`badge ${viewUser.isActive ? 'badge-green' : 'badge-red'}`} style={{ marginTop: 4 }}>
                  {viewUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {[
              ['Employee Code', viewUser.employee?.employeeCode],
              ['Designation', viewUser.employee?.designation],
              ['Department', viewUser.employee?.department],
              ['Phone', viewUser.employee?.phone],
              ['Role', ROLE_LABELS[viewUser.role] || viewUser.role],
              ['Joined', fmtDate(viewUser.createdAt)],
            ].map(([label, value]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--slate-100)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>{label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)' }}>{value || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ============================
          CONFIRM TOGGLE MODAL
          ============================ */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, user: null })}
        title={confirmModal.user?.isActive ? '⚠️ Deactivate User?' : '✅ Activate User?'}
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
        <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {confirmModal.user?.isActive
            ? `This will prevent <strong>${confirmModal.user?.email}</strong> from logging in. You can re-activate anytime.`
            : `This will restore login access for <strong>${confirmModal.user?.email}</strong>.`}
        </p>
      </Modal>
    </AppLayout>
  );
}
