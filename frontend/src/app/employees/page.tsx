'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Users, Plus, Search, Mail, Phone, Building, Edit3, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fmtDate } from '@/lib/utils';

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = ['HR', 'SUPER_ADMIN'].includes(user?.role || '');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', departmentId: '', designation: '', role: 'EMPLOYEE', employeeCode: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([api.get('/users/employees'), api.get('/departments')]).then(([emps, depts]) => {
      setEmployees(emps.data?.data || []);
      setDepartments(depts.data?.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e =>
    `${e.firstName} ${e.lastName} ${e.employeeCode} ${e.email} ${e.department?.name}`.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditEmp(null);
    setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', departmentId: departments[0]?.id || '', designation: '', role: 'EMPLOYEE', employeeCode: '' });
    setError('');
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      // Auto-generate employeeCode if not provided
      const payload = { ...form };
      if (!payload.employeeCode.trim()) {
        const initials = `${payload.firstName[0]}${payload.lastName[0]}`.toUpperCase();
        payload.employeeCode = `${initials}${Date.now().toString().slice(-5)}`;
      }
      await api.post('/users', payload);  // POST /api/users (Admin/HR only)
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally { setSubmitting(false); }
  };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1>Employee Directory</h1>
              <p>{employees.length} employees across {departments.length} departments</p>
            </div>
            {isAdmin && <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Employee</button>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="form-input-icon" style={{ maxWidth: 300 }}>
              <Search size={14} />
              <input className="form-control" placeholder="Search by name, ID, department..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>{filtered.length} results</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state"><Users size={36} /><h4>No Employees Found</h4><p>Try adjusting the search term.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Employee</th><th>Code</th><th>Department</th><th>Designation</th><th>Role</th><th>Email</th><th>Phone</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {filtered.map((e: any) => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue-700)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                            {e.avatarUrl ? <img src={e.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${e.firstName?.[0]}${e.lastName?.[0]}`}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{e.firstName} {e.lastName}</span>
                        </div>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--blue-700)' }}>{e.employeeCode}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{e.department?.name}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{e.designation}</td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>
                          {e.user?.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{e.user?.email}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{e.phone}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{fmtDate(e.joiningDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Employee"
        footer={<><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" form="add-emp-form" type="submit" disabled={submitting}>{submitting && <Spinner white size="sm" />} Create Employee</button></>}
      >
        <form id="add-emp-form" onSubmit={submit} className="space-y-3">
          {error && <div className="alert alert-error"><AlertCircle size={14} /><span>{error}</span></div>}
          <div className="form-grid">
            <div className="form-group"><label className="form-label">First Name <span className="required">*</span></label>
              <input className="form-control" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required placeholder="First name" /></div>
            <div className="form-group"><label className="form-label">Last Name <span className="required">*</span></label>
              <input className="form-control" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required placeholder="Last name" /></div>
          </div>
          <div className="form-group"><label className="form-label">Email <span className="required">*</span></label>
            <input type="email" className="form-control" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="employee@company.com" /></div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Phone <span className="required">*</span></label>
              <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Designation <span className="required">*</span></label>
              <input className="form-control" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} required /></div>
          </div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Department <span className="required">*</span></label>
              <select className="form-control" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} required>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="EMPLOYEE">Employee</option><option value="MANAGER">Manager</option>
                <option value="HR">HR</option><option value="SECURITY_GUARD">Security Guard</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Employee Code <span style={{fontSize:'0.75rem',color:'var(--slate-400)'}}>(auto-generated if empty)</span></label>
            <input className="form-control" value={form.employeeCode} onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))} placeholder="e.g. EMP1001 (optional)" /></div>
          <div className="form-group"><label className="form-label">Password <span className="required">*</span></label>
            <input type="password" className="form-control" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min 6 characters" /></div>
        </form>
      </Modal>
    </AppLayout>
  );
}
