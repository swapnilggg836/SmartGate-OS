'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Building, Plus, AlertCircle, Edit3 } from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/departments').then(r => setDepartments(r.data?.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', code: '', description: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (d: any) => {
    setEditItem(d);
    setForm({ name: d.name, code: d.code || '', description: d.description || '' });
    setError('');
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      if (editItem) {
        await api.patch(`/departments/${editItem.id}`, form);
      } else {
        await api.post('/departments', form);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save department');
    } finally { setSubmitting(false); }
  };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1><Building size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--blue-700)' }} />Departments</h1>
              <p>Manage company departments and teams</p>
            </div>
            <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Department</button>
          </div>
        </div>

        <div className="card">
          {departments.length === 0 ? (
            <div className="empty-state"><Building size={36} /><h4>No Departments</h4><p>Create your first department.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Code</th><th>Description</th><th>Employees</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {departments.map((d: any) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue-600)' }} />{d.name}</div></td>
                      <td className="font-mono" style={{ color: 'var(--blue-700)', fontSize: '0.8125rem' }}>{d.code || '—'}</td>
                      <td style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>{d.description || '—'}</td>
                      <td><span className="badge badge-blue">{d._count?.employees ?? d.employees?.length ?? '—'}</span></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}><Edit3 size={13} /> Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Department' : 'Add Department'}
        footer={<><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" form="dept-form" type="submit" disabled={submitting}>{submitting && <Spinner white size="sm" />} Save</button></>}
      >
        <form id="dept-form" onSubmit={submit} className="space-y-3">
          {error && <div className="alert alert-error"><AlertCircle size={14} /><span>{error}</span></div>}
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Name <span className="required">*</span></label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Engineering" /></div>
            <div className="form-group"><label className="form-label">Code</label>
              <input className="form-control" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. ENG" /></div>
          </div>
          <div className="form-group"><label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
        </form>
      </Modal>
    </AppLayout>
  );
}
