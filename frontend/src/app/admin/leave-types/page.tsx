'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { BookOpen, Plus, AlertCircle, Edit3, Trash2 } from 'lucide-react';

export default function LeaveTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', defaultDaysPerYear: 12, requiresHrApproval: false, color: '#3B82F6' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/leave/types').then(r => setTypes(r.data?.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', code: '', defaultDaysPerYear: 12, requiresHrApproval: false, color: '#3B82F6' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (t: any) => {
    setEditItem(t);
    setForm({ name: t.name, code: t.code, defaultDaysPerYear: t.defaultDaysPerYear, requiresHrApproval: t.requiresHrApproval, color: t.color || '#3B82F6' });
    setError('');
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      if (editItem) {
        await api.patch(`/leave/types/${editItem.id}`, form);
      } else {
        await api.post('/leave/types', form);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save leave type');
    } finally { setSubmitting(false); }
  };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1><BookOpen size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--blue-700)' }} />Leave Types</h1>
              <p>Manage leave categories and policies</p>
            </div>
            <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Leave Type</button>
          </div>
        </div>

        <div className="card">
          {types.length === 0 ? (
            <div className="empty-state"><BookOpen size={36} /><h4>No Leave Types</h4><p>Create your first leave type.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Code</th><th>Days/Year</th><th>HR Required</th><th>Color</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {types.map((t: any) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td className="font-mono" style={{ color: 'var(--blue-700)', fontSize: '0.8125rem' }}>{t.code}</td>
                      <td style={{ fontWeight: 600, color: 'var(--blue-600)' }}>{t.defaultDaysPerYear}</td>
                      <td><span className={`badge ${t.requiresHrApproval ? 'badge-blue' : 'badge-slate'}`}>{t.requiresHrApproval ? 'Yes' : 'No'}</span></td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 20, height: 20, borderRadius: 4, background: t.color }} /><span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{t.color}</span></div></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><Edit3 size={13} /> Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Leave Type' : 'Add Leave Type'}
        footer={<><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" form="lt-form" type="submit" disabled={submitting}>{submitting && <Spinner white size="sm" />} Save</button></>}
      >
        <form id="lt-form" onSubmit={submit} className="space-y-3">
          {error && <div className="alert alert-error"><AlertCircle size={14} /><span>{error}</span></div>}
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Name <span className="required">*</span></label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Casual Leave" /></div>
            <div className="form-group"><label className="form-label">Code <span className="required">*</span></label>
              <input className="form-control" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required placeholder="e.g. CL" /></div>
          </div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Days Per Year</label>
              <input type="number" className="form-control" value={form.defaultDaysPerYear} onChange={e => setForm(f => ({ ...f, defaultDaysPerYear: parseInt(e.target.value) || 12 }))} min={1} max={365} /></div>
            <div className="form-group"><label className="form-label">Color</label>
              <input type="color" className="form-control" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ height: 40, padding: '4px 8px' }} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.requiresHrApproval} onChange={e => setForm(f => ({ ...f, requiresHrApproval: e.target.checked }))} style={{ width: 16, height: 16 }} />
            Requires HR Approval (2-step approval chain)
          </label>
        </form>
      </Modal>
    </AppLayout>
  );
}
