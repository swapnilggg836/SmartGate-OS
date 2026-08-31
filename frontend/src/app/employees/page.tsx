'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import {
  Users, Plus, Search, Mail, Phone, Building, Edit3,
  UserCheck, AlertCircle, CheckCircle2, ArrowRightLeft,
  ExternalLink, UserX, Shield, RefreshCw, FileText
} from 'lucide-react';
import { fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default function EmployeesPage() {
  const { user } = useAuth();
  const isHrOrAdmin = ['HR', 'SUPER_ADMIN'].includes(user?.role || '');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    departmentId: '', designation: '', role: 'EMPLOYEE', employeeCode: ''
  });

  // Transfer Dept Modal
  const [transferModal, setTransferModal] = useState<{ open: boolean; emp: any }>({ open: false, emp: null });
  const [transferForm, setTransferForm] = useState({ newDepartmentId: '', newDesignation: '', notes: '' });

  // Deactivate Modal
  const [deactivateModal, setDeactivateModal] = useState<{ open: boolean; emp: any }>({ open: false, emp: null });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/users/employees'), api.get('/departments')])
      .then(([emps, depts]) => {
        setEmployees(emps.data?.data || []);
        setDepartments(depts.data?.data || []);
      })
      .catch(err => console.error('Load employees error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase().trim();
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    const code = (e.employeeCode || '').toLowerCase();
    const email = (e.user?.email || '').toLowerCase();
    const deptName = (e.department?.name || '').toLowerCase();

    const matchesSearch = !q || fullName.includes(q) || code.includes(q) || email.includes(q) || deptName.includes(q);
    if (!matchesSearch) return false;

    if (selectedDept !== 'ALL' && e.departmentId !== selectedDept) return false;
    if (statusFilter === 'ACTIVE' && !e.user?.isActive) return false;
    if (statusFilter === 'INACTIVE' && e.user?.isActive) return false;

    return true;
  });

  const openAdd = () => {
    setAddForm({
      email: '', password: '', firstName: '', lastName: '', phone: '',
      departmentId: departments[0]?.id || '', designation: '', role: 'EMPLOYEE', employeeCode: ''
    });
    setError('');
    setShowAddModal(true);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { ...addForm };
      if (!payload.employeeCode.trim()) {
        const initials = `${payload.firstName[0]}${payload.lastName[0]}`.toUpperCase();
        payload.employeeCode = `${initials}${Date.now().toString().slice(-5)}`;
      }
      await api.post('/users', payload);
      setShowAddModal(false);
      showSuccess(`Employee ${payload.firstName} ${payload.lastName} created successfully!`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const openTransfer = (emp: any) => {
    setTransferForm({
      newDepartmentId: departments[0]?.id || '',
      newDesignation: emp.designation,
      notes: ''
    });
    setError('');
    setTransferModal({ open: true, emp });
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModal.emp) return;
    setError('');
    setSubmitting(true);
    try {
      await api.patch(`/users/employees/${transferModal.emp.id}/transfer`, transferForm);
      setTransferModal({ open: false, emp: null });
      showSuccess(`Transferred ${transferModal.emp.firstName} to new department.`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to transfer department');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (emp: any) => {
    try {
      const newStatus = !emp.user?.isActive;
      await api.patch(`/users/${emp.userId}/status`, { isActive: newStatus });
      setDeactivateModal({ open: false, emp: null });
      showSuccess(`${emp.firstName} ${emp.lastName} ${newStatus ? 'activated' : 'deactivated'}.`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update employee status');
    }
  };

  const downloadDirectoryCsv = () => {
    if (employees.length === 0) return;
    const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Designation', 'Role', 'Status', 'Joining Date'];
    const rows = employees.map(e => [
      e.employeeCode,
      `"${e.firstName}"`,
      `"${e.lastName}"`,
      e.user?.email || '',
      e.phone || '',
      `"${e.department?.name || ''}"`,
      `"${e.designation || ''}"`,
      e.user?.role || '',
      e.user?.isActive ? 'ACTIVE' : 'INACTIVE',
      new Date(e.joiningDate).toLocaleDateString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `staff-directory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                <Users size={24} style={{ color: 'var(--blue-700)' }} /> Employee Management Directory
              </h1>
              <p>Search, onboard, manage department assignments, and review employee career lifecycles ({employees.length} total staff)</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={downloadDirectoryCsv}>
                <FileText size={14} /> Export Directory (.CSV)
              </button>
              {isHrOrAdmin && (
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <Plus size={15} /> Add New Employee
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={load}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 400 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--slate-400)' }} />
              <input
                className="form-control"
                placeholder="Search name, code, email, designation..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ width: 'auto', fontSize: '0.82rem', padding: '6px 12px' }}
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: 4 }}>
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {s === 'ALL' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Building size={16} /> Staff Roster ({filtered.length} employees)
            </h3>
            <span className="badge badge-blue">Least-Privilege Scoped</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <Users size={36} style={{ color: 'var(--slate-400)' }} />
              <h4>No Employees Found</h4>
              <p>Try adjusting your search criteria or department filter.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joining Date</th>
                    {isHrOrAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', background: 'var(--blue-700)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden'
                          }}>
                            {e.avatarUrl ? (
                              <img src={e.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              `${e.firstName?.[0] || ''}${e.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {e.firstName} {e.lastName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                              {e.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--blue-700)', fontWeight: 600 }}>
                        {e.employeeCode}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {e.department?.name || '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {e.designation}
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                          {e.user?.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${e.user?.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                          {e.user?.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        {fmtDate(e.joiningDate)}
                      </td>
                      {isHrOrAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Link
                              href={`/employees/${e.id}/journey`}
                              className="btn btn-outline btn-xs"
                              title="View Career & Compliance Journey"
                              style={{ textDecoration: 'none' }}
                            >
                              <ExternalLink size={12} /> Journey
                            </Link>
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => openTransfer(e)}
                              title="Transfer Department"
                            >
                              <ArrowRightLeft size={12} /> Transfer
                            </button>
                            <button
                              className={`btn btn-xs ${e.user?.isActive ? 'btn-danger' : 'btn-primary'}`}
                              onClick={() => setDeactivateModal({ open: true, emp: e })}
                              title={e.user?.isActive ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {e.user?.isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Employee (HR / Admin)"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="add-emp-form" type="submit" disabled={submitting}>
              {submitting ? <><Spinner white size="sm" /> Creating...</> : 'Create Employee'}
            </button>
          </>
        }
      >
        <form id="add-emp-form" onSubmit={submitAdd} className="space-y-3">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">First Name <span className="required">*</span></label>
              <input
                className="form-control"
                value={addForm.firstName}
                onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))}
                required
                placeholder="e.g. Rahul"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="required">*</span></label>
              <input
                className="form-control"
                value={addForm.lastName}
                onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))}
                required
                placeholder="e.g. Verma"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Work Email <span className="required">*</span></label>
            <input
              type="email"
              className="form-control"
              value={addForm.email}
              onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              required
              placeholder="employee@enterprise.com"
            />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Phone <span className="required">*</span></label>
              <input
                className="form-control"
                value={addForm.phone}
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                required
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Designation <span className="required">*</span></label>
              <input
                className="form-control"
                value={addForm.designation}
                onChange={e => setAddForm(f => ({ ...f, designation: e.target.value }))}
                required
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Department <span className="required">*</span></label>
              <select
                className="form-control"
                value={addForm.departmentId}
                onChange={e => setAddForm(f => ({ ...f, departmentId: e.target.value }))}
                required
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">System Role</label>
              <select
                className="form-control"
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR</option>
                <option value="SECURITY_GUARD">Security Guard</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              Employee Code <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>(auto-generated if empty)</span>
            </label>
            <input
              className="form-control"
              value={addForm.employeeCode}
              onChange={e => setAddForm(f => ({ ...f, employeeCode: e.target.value }))}
              placeholder="e.g. EMP1050"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Initial Password <span className="required">*</span></label>
            <input
              type="password"
              className="form-control"
              value={addForm.password}
              onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
              required
              placeholder="Min 6 characters"
            />
          </div>
        </form>
      </Modal>

      {/* Department Transfer Modal */}
      <Modal
        open={transferModal.open}
        onClose={() => setTransferModal({ open: false, emp: null })}
        title={`Transfer Department: ${transferModal.emp?.firstName} ${transferModal.emp?.lastName}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setTransferModal({ open: false, emp: null })}>Cancel</button>
            <button className="btn btn-primary" form="transfer-form" type="submit" disabled={submitting}>
              {submitting ? <><Spinner white size="sm" /> Processing...</> : 'Confirm Department Transfer'}
            </button>
          </>
        }
      >
        <form id="transfer-form" onSubmit={submitTransfer} className="space-y-3">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)' }}>
            Current Department: <strong>{transferModal.emp?.department?.name || 'Unassigned'}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">New Target Department <span className="required">*</span></label>
            <select
              className="form-control"
              value={transferForm.newDepartmentId}
              onChange={e => setTransferForm(f => ({ ...f, newDepartmentId: e.target.value }))}
              required
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Updated Designation (Optional)</label>
            <input
              className="form-control"
              value={transferForm.newDesignation}
              onChange={e => setTransferForm(f => ({ ...f, newDesignation: e.target.value }))}
              placeholder="e.g. Lead QA Specialist"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Transfer Notes / Reason</label>
            <textarea
              className="form-control"
              rows={2}
              value={transferForm.notes}
              onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Reassigned to Enterprise Systems project team"
            />
          </div>
        </form>
      </Modal>

      {/* Deactivate Modal */}
      <Modal
        open={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, emp: null })}
        title={deactivateModal.emp?.user?.isActive ? 'Offboard / Deactivate Employee' : 'Reactivate Employee Account'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeactivateModal({ open: false, emp: null })}>Cancel</button>
            <button
              className={`btn ${deactivateModal.emp?.user?.isActive ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => toggleUserStatus(deactivateModal.emp)}
            >
              {deactivateModal.emp?.user?.isActive ? 'Confirm Deactivation' : 'Confirm Reactivation'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)' }}>
          Are you sure you want to {deactivateModal.emp?.user?.isActive ? 'deactivate' : 'reactivate'}{' '}
          <strong>{deactivateModal.emp?.firstName} {deactivateModal.emp?.lastName}</strong> ({deactivateModal.emp?.employeeCode})?
        </p>
        {deactivateModal.emp?.user?.isActive && (
          <div className="alert alert-warning" style={{ marginTop: 12, fontSize: '0.78rem' }}>
            <AlertCircle size={14} />
            <span>
              Deactivating this employee will immediately revoke login permissions and gate pass approvals, while permanently preserving all past historical attendance and leave logs.
            </span>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
