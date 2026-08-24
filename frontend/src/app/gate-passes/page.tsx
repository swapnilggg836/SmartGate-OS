'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { QrCode, Download, Calendar, Clock } from 'lucide-react';

export default function GatePassesPage() {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    api.get('/gate-passes/my-passes').catch(() => api.get('/gate-passes/my-active')).then(r => {
      const d = r.data?.data;
      setPasses(Array.isArray(d) ? d : d ? [d] : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <h1>My Gate Pass</h1>
          <p>Your approved digital gate passes</p>
        </div>

        {passes.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <QrCode size={40} />
              <h4>No Active Gate Pass</h4>
              <p>Gate passes are generated automatically after your exit request is fully approved by Manager and HR.</p>
            </div>
          </div>
        ) : (
          <div className="grid-2">
            {passes.map((p: any) => (
              <div key={p.id} className="gate-pass" onClick={() => setSelected(p)} style={{ cursor: 'pointer' }}>
                <div className="gate-pass-header">
                  <div>
                    <div style={{ fontSize: '0.6875rem', opacity: 0.7 }}>GATE PASS</div>
                    <div className="gate-pass-id">{p.passNumber}</div>
                  </div>
                  <span className={`badge ${statusBadgeClass(p.status)}`} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                    {statusLabel(p.status)}
                  </span>
                </div>
                <div className="gate-pass-body">
                  {[
                    ['Employee', `${p.employee?.firstName} ${p.employee?.lastName}`],
                    ['Employee ID', p.employee?.employeeCode],
                    ['Department', p.employee?.department?.name],
                    ['Reason', p.exitRequest?.reason],
                    ['Exit Date', fmtDate(p.exitRequest?.exitDate)],
                    ['Exit Time', p.exitRequest?.exitTime],
                    ['Expected Return', p.exitRequest?.expectedReturnTime],
                    ['Destination', p.exitRequest?.destination],
                    ['Valid Until', fmtDateTime(p.validUntil)],
                  ].map(([label, value]) => (
                    <div key={label as string} className="gate-pass-row">
                      <span className="label">{label}</span>
                      <span className="value">{value || '—'}</span>
                    </div>
                  ))}
                </div>
                <div className="gate-pass-approvals">
                  <div className="approval-chip">
                    <div className="role">Manager</div>
                    <div className="status">✓ APPROVED</div>
                  </div>
                  {p.exitRequest?.requiresHrApproval && (
                    <div className="approval-chip">
                      <div className="role">HR</div>
                      <div className="status">✓ APPROVED</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function fmtDateTime(d: any) {
  if (!d) return '—';
  return `${fmtDate(d)}, ${fmtTime(d)}`;
}
