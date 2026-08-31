'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { ClipboardList, Download, Search, RefreshCw } from 'lucide-react';

function fmtDateTime2(d: any) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    api.get('/audit-logs')
      .then(r => setLogs(r.data?.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(l =>
      (l.action || '').toLowerCase().includes(q) ||
      (l.entity || '').toLowerCase().includes(q) ||
      (l.userEmail || '').toLowerCase().includes(q) ||
      (l.ipAddress || '').toLowerCase().includes(q) ||
      (l.entityId || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const downloadAuditCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'Timestamp', 'Action', 'Entity', 'Entity ID', 'User Email', 'IP Address', 'New Values JSON'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.createdAt).toLocaleString(),
      l.action,
      l.entity,
      l.entityId || '',
      l.userEmail || '',
      l.ipAddress || '',
      `"${(l.newValues || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <ClipboardList size={24} style={{ color: 'var(--blue-700)' }} /> System Audit Trail & Compliance Logs
              </h1>
              <p>Immutable tamper-proof record of all administrative, gate verification, leave approval and security actions</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={downloadAuditCsv} disabled={logs.length === 0}>
                <Download size={14} /> Download Audit Trail (.CSV)
              </button>
              <button className="btn btn-outline btn-sm" onClick={fetchLogs}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card" style={{ padding: '12px 18px' }}>
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--slate-400)' }} />
            <input
              className="form-control"
              placeholder="Search action, entity, user email, IP address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Audit Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <ClipboardList size={16} /> Audit Records ({filteredLogs.length} events)
            </h3>
            <span className="badge badge-blue">Tamper-Proof MySQL Log</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={36} style={{ color: 'var(--slate-400)' }} />
              <h4>No Audit Logs Found</h4>
              <p>No audit events match your search query.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>User / Actor</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((l: any) => (
                    <tr key={l.id}>
                      <td className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--slate-600)', whiteSpace: 'nowrap' }}>
                        {fmtDateTime2(l.createdAt)}
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700 }}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {l.entity}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {l.userEmail || 'System / Anonymous'}
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        {l.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
