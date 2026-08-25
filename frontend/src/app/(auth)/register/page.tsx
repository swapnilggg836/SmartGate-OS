'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, RegisterData } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Shield, User, Mail, Lock, Phone, Building, Briefcase, AlertCircle, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

type UserRole = 'SUPER_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'SECURITY_GUARD';

const DEFAULT_DEPARTMENTS = [
  { id: 'ENG-IT', name: 'Engineering & IT', code: 'ENG-IT' },
  { id: 'HR-DEPT', name: 'Human Resources', code: 'HR-DEPT' },
  { id: 'OPS-LOG', name: 'Operations & Logistics', code: 'OPS-LOG' },
  { id: 'SEC-FAC', name: 'Security & Facilities', code: 'SEC-FAC' },
  { id: 'FIN-ACC', name: 'Finance & Accounts', code: 'FIN-ACC' }
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [departments, setDepartments] = useState<any[]>(DEFAULT_DEPARTMENTS);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{
    firstName: string; lastName: string; email: string;
    password: string; confirmPassword: string; phone: string;
    departmentId: string; designation: string; role: UserRole; employeeCode: string;
  }>({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', departmentId: 'ENG-IT', designation: '', role: 'EMPLOYEE', employeeCode: ''
  });

  const loadDepartments = () => {
    setLoadingDepts(true);
    api.get('/departments').then(res => {
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setDepartments(res.data.data);
        setForm(f => ({ ...f, departmentId: res.data.data[0].id }));
      }
    }).catch(err => {
      console.warn('Using default departments list:', err.message);
    }).finally(() => {
      setLoadingDepts(false);
    });
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!form.departmentId) { setError('Please select a department'); return; }
    setLoading(true);
    const data: RegisterData = {
      email: form.email, password: form.password,
      firstName: form.firstName, lastName: form.lastName,
      departmentId: form.departmentId, designation: form.designation,
      phone: form.phone, role: form.role,
      employeeCode: form.employeeCode.trim() || undefined
    };
    const result = await register(data);
    if (!result.ok) { setError(result.error || 'Registration failed'); setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--blue-50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'var(--blue-700)',
            color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12, boxShadow: '0 4px 12px rgba(29,78,216,0.3)'
          }}>
            <Shield size={22} />
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: 4 }}>
            Create Employee Account
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>
            Register a new account — data saved to MySQL database
          </p>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '1rem' }}>Employee Registration Form</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="alert alert-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* Name Row */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First Name <span className="required">*</span></label>
                  <div className="form-input-icon">
                    <User size={14} />
                    <input type="text" className="form-control" placeholder="e.g. Rahul" value={form.firstName} onChange={set('firstName')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name <span className="required">*</span></label>
                  <div className="form-input-icon">
                    <User size={14} />
                    <input type="text" className="form-control" placeholder="e.g. Patil" value={form.lastName} onChange={set('lastName')} required />
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Work Email <span className="required">*</span></label>
                  <div className="form-input-icon">
                    <Mail size={14} />
                    <input type="email" className="form-control" placeholder="rahul@company.com" value={form.email} onChange={set('email')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number <span className="required">*</span></label>
                  <div className="form-input-icon">
                    <Phone size={14} />
                    <input type="tel" className="form-control" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} required />
                  </div>
                </div>
              </div>

              {/* Department & Role */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Department <span className="required">*</span></label>
                  <select className="form-control" value={form.departmentId} onChange={set('departmentId')} required>
                    <option value="">{loadingDepts ? '⏳ Loading departments from MySQL...' : departments.length === 0 ? '⚠️ No departments found (Click to refresh)' : 'Select Department'}</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                  {departments.length === 0 && !loadingDepts && (
                    <button
                      type="button"
                      onClick={loadDepartments}
                      className="text-xs text-blue-600 underline mt-1"
                      style={{ fontSize: '0.75rem', color: 'var(--blue-700)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    >
                      ↻ Refresh Departments
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Role <span className="required">*</span></label>
                  <select className="form-control" value={form.role} onChange={set('role')}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager / Team Lead</option>
                    <option value="HR">HR Director</option>
                    <option value="SECURITY_GUARD">Security Guard</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              </div>

              {/* Designation & Employee Code */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Designation <span className="required">*</span></label>
                  <div className="form-input-icon">
                    <Briefcase size={14} />
                    <input type="text" className="form-control" placeholder="e.g. Software Engineer" value={form.designation} onChange={set('designation')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Employee Code <span style={{ color: 'var(--slate-400)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" className="form-control" placeholder="Auto-generated if blank" value={form.employeeCode} onChange={set('employeeCode')} />
                  <span className="form-hint">Leave blank to auto-generate e.g. EMP1007</span>
                </div>
              </div>

              {/* Password */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <div className="form-input-icon">
                    <Lock size={14} />
                    <input type="password" className="form-control" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password <span className="required">*</span></label>
                  <div className="form-input-icon">
                    <Lock size={14} />
                    <input type="password" className="form-control" placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ padding: '11px 16px', fontSize: '0.9rem', marginTop: 4 }}
                disabled={loading}
              >
                {loading ? <><Spinner white size="sm" /> Creating Account…</> : <>Create Account <ArrowRight size={15} /></>}
              </button>
            </form>
          </div>
          <div className="card-footer" style={{ textAlign: 'center' }}>
            <span style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
