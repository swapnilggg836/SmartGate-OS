'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { ClipboardList } from 'lucide-react';
import { fmtDateTime } from '@/lib/utils';

function fmtDateTime2(d: any) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-logs').then(r => setLogs(r.data?.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={22} style={{ color: 'var(--blue-700)' }} /> Audit Logs</h1>
          <p>Complete audit trail of all system actions stored in MySQL</p>
        </div>

        <div className="card">
          {logs.length === 0 ? (
            <div className="empty-state"><ClipboardList size={36} /><h4>No Audit Logs</h4><p>System actions will be recorded here.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>User</th><th>IP Address</th></tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id}>
                      <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>{fmtDateTime2(l.createdAt)}</td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.6875rem', fontFamily: 'monospace' }}>{l.action}</span>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}><span style={{ fontWeight: 600 }}>{l.entity}</span></td>
                      <td style={{ fontSize: '0.8125rem' }}>{l.userEmail || '—'}</td>
                      <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{l.ipAddress || '—'}</td>
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
