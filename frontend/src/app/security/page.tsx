'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Shield, Search, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function SecurityPage() {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [actioning, setActioning] = useState(false);

  const load = () => {
    api.get('/gate-passes/today').then(r => setPasses(r.data?.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const verify = async () => {
    if (!search.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.post('/gate-passes/verify', { query: search.trim() });
      setVerifyResult(res.data?.data);
    } catch (err: any) {
      setVerifyResult({ error: err.response?.data?.message || 'Gate pass not found. Please check the ID.' });
    } finally { setVerifying(false); }
  };

  const allowExit = async (id: string) => {
    setActioning(true);
    try { await api.post('/security/exit', { gatePassId: id }); load(); setVerifyResult(null); setSearch(''); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setActioning(false); }
  };

  const markReturned = async (id: string) => {
    setActioning(true);
    try { await api.post('/security/return', { gatePassId: id }); load(); setVerifyResult(null); setSearch(''); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setActioning(false); }
  };

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={22} style={{ color: 'var(--blue-700)' }} /> Gate Security</h1>
          <p>Verify gate passes and record employee entry/exit</p>
        </div>

        {/* Verify Panel */}
        <div className="card">
          <div className="card-header"><h3 className="card-title"><Search size={15} /> Verify Gate Pass</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                placeholder="Enter Gate Pass ID (GP-2026-00125) or Employee ID (EMP1001)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verify()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={verify} disabled={verifying}>
                {verifying ? <Spinner white size="sm" /> : <Shield size={15} />}
                Verify
              </button>
            </div>

            {verifyResult && (
              <div style={{ marginTop: 16 }}>
                {verifyResult.error ? (
                  <div className="alert alert-error"><AlertTriangle size={15} /><span>{verifyResult.error}</span></div>
                ) : (
                  <div className="card" style={{ border: '2px solid var(--blue-200)' }}>
                    <div style={{ background: 'var(--blue-700)', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.6875rem', opacity: 0.7 }}>VERIFIED GATE PASS</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>{verifyResult.passNumber}</div>
                      </div>
                      <span className={`badge ${statusBadgeClass(verifyResult.status)}`} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                        {statusLabel(verifyResult.status)}
                      </span>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 14 }}>
                        {[
                          ['Employee Name', `${verifyResult.employee?.firstName} ${verifyResult.employee?.lastName}`],
                          ['Employee ID', verifyResult.employee?.employeeCode],
                          ['Department', verifyResult.employee?.department?.name],
                          ['Destination', verifyResult.exitRequest?.destination],
                          ['Exit Date', fmtDate(verifyResult.exitRequest?.exitDate)],
                          ['Exit Time', verifyResult.exitRequest?.exitTime],
                          ['Expected Return', verifyResult.exitRequest?.expectedReturnTime],
                          ['Reason', verifyResult.exitRequest?.reason],
                        ].map(([label, value]) => (
                          <div key={label as string} style={{ fontSize: '0.8125rem', padding: '4px 0', borderBottom: '1px solid var(--slate-100)' }}>
                            <div style={{ color: 'var(--slate-500)', fontSize: '0.6875rem', marginBottom: 1 }}>{label}</div>
                            <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{value || '—'}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        <span style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--green-50)', border: '1px solid var(--green-200)', color: 'var(--green-700)', fontSize: '0.75rem', fontWeight: 700 }}>
                          ✓ Manager: APPROVED
                        </span>
                        {verifyResult.exitRequest?.requiresHrApproval && (
                          <span style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--green-50)', border: '1px solid var(--green-200)', color: 'var(--green-700)', fontSize: '0.75rem', fontWeight: 700 }}>
                            ✓ HR: APPROVED
                          </span>
                        )}
                      </div>

                      {verifyResult.status === 'ACTIVE' && (
                        <button className="btn btn-primary btn-full" style={{ padding: '12px', fontSize: '0.9rem' }} onClick={() => allowExit(verifyResult.id)} disabled={actioning}>
                          {actioning ? <Spinner white size="sm" /> : <CheckCircle2 size={16} />}
                          Allow Exit — Record Actual Exit Time
                        </button>
                      )}
                      {verifyResult.status === 'USED' && (
                        <button className="btn btn-success btn-full" style={{ padding: '12px', fontSize: '0.9rem' }} onClick={() => markReturned(verifyResult.id)} disabled={actioning}>
                          {actioning ? <Spinner white size="sm" /> : <Clock size={16} />}
                          Mark as Returned — Record Return Time
                        </button>
                      )}
                      {verifyResult.status === 'EXPIRED' && (
                        <div className="alert alert-warning"><AlertTriangle size={15} /><span>This gate pass has expired and cannot be used.</span></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Today's Passes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Clock size={15} /> Today's Approved Gate Passes</h3>
            <span className="badge badge-blue">{passes.length} passes</span>
          </div>
          {passes.length === 0 ? (
            <div className="empty-state"><Shield size={36} /><h4>No Passes Today</h4><p>No approved gate passes for today.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Pass ID</th><th>Employee</th><th>ID</th><th>Department</th><th>Exit Time</th><th>Exp. Return</th><th>Status</th><th>Actual Exit</th><th>Actual Return</th></tr>
                </thead>
                <tbody>
                  {passes.map((p: any) => (
                    <tr key={p.id} onClick={() => { setSearch(p.passNumber); }} style={{ cursor: 'pointer' }}>
                      <td className="font-mono" style={{ color: 'var(--blue-700)', fontWeight: 700, fontSize: '0.75rem' }}>{p.passNumber}</td>
                      <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{p.employee?.firstName} {p.employee?.lastName}</td>
                      <td className="font-mono" style={{ fontSize: '0.75rem' }}>{p.employee?.employeeCode}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{p.employee?.department?.name}</td>
                      <td className="font-mono" style={{ fontSize: '0.8125rem' }}>{p.exitRequest?.exitTime}</td>
                      <td className="font-mono" style={{ fontSize: '0.8125rem' }}>{p.exitRequest?.expectedReturnTime}</td>
                      <td><span className={`badge ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span></td>
                      <td style={{ fontSize: '0.75rem' }}>{p.gateLogs?.[0]?.actualExitTime ? fmtTime(p.gateLogs[0].actualExitTime) : <span style={{ color: 'var(--slate-300)' }}>—</span>}</td>
                      <td style={{ fontSize: '0.75rem' }}>{p.gateLogs?.[0]?.actualReturnTime ? fmtTime(p.gateLogs[0].actualReturnTime) : <span style={{ color: 'var(--slate-300)' }}>—</span>}</td>
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
