'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { fmtDate, statusBadgeClass, statusLabel } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { AlertTriangle, Users, CheckCircle2, Clock, XCircle, RefreshCw, Search, Download, Eye, ExternalLink, Printer, Shield, User, Building, Car, Phone, Mail, FileText, QrCode } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ color, opacity: 0.6 }}>{icon}</div>
      </div>
    </div>
  );
}

export default function AdminVisitorsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [emergency, setEmergency] = useState<any[] | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      const [visitsRes, statsRes] = await Promise.all([
        api.get(`/visitors?${params.toString()}`),
        api.get('/visitors/stats'),
      ]);
      setVisits(visitsRes.data?.data || []);
      setStats(statsRes.data?.data || null);
    } finally { setLoading(false); }
  }, [q, statusFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const loadEmergency = async () => {
    try {
      const r = await api.get('/visitors/emergency');
      setEmergency(r.data?.data || []);
      setShowEmergency(true);
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const downloadCsv = () => {
    if (visits.length === 0) return;
    const headers = ['Visit ID', 'Pass Number', 'Visitor Name', 'Mobile', 'Organization', 'Host', 'Department', 'Purpose', 'Date', 'Expected In', 'Expected Out', 'Status', 'Group Size', 'Vehicle'];
    const rows = visits.map(v => [
      v.visitId,
      v.visitorPass?.passNumber || '—',
      `"${v.visitor?.fullName || ''}"`,
      `="${v.visitor?.mobile || ''}"`,
      `"${v.visitor?.organization || ''}"`,
      `"${v.hostUser?.employee ? `${v.hostUser.employee.firstName} ${v.hostUser.employee.lastName}` : (v.hostUser?.email || '')}"`,
      `"${v.department?.name || v.hostUser?.employee?.department?.name || ''}"`,
      `"${(v.purpose || '').replace(/"/g, '""')}"`,
      fmtDate(v.visitDate),
      v.expectedEntryTime,
      v.expectedExitTime,
      v.status,
      String(v.numberOfVisitors || 1),
      v.vehicleNumber || '—'
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitor-management-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="page-header">
          <div className="page-header-row">
            <div><h1>Visitor Management</h1><p style={{ marginTop: 2 }}>Complete visitor records and security oversight</p></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={downloadCsv} disabled={visits.length === 0}>
                <Download size={14} /> Export CSV
              </button>
              <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
              <button className="btn btn-sm" style={{ background: '#dc2626', color: 'white' }} onClick={loadEmergency}><AlertTriangle size={14} /> Emergency List</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <StatCard label="Total Visits" value={stats.total} color="#2563eb" icon={<Users size={28} />} />
            <StatCard label="Today" value={stats.today} color="#7c3aed" icon={<Clock size={28} />} />
            <StatCard label="Inside Now" value={stats.inside} color="#16a34a" icon={<CheckCircle2 size={28} />} />
            <StatCard label="Waiting" value={stats.waiting} color="#d97706" icon={<Clock size={28} />} />
            <StatCard label="Completed" value={stats.completed} color="#0891b2" icon={<CheckCircle2 size={28} />} />
            <StatCard label="Overdue" value={stats.overdue} color="#dc2626" icon={<AlertTriangle size={28} />} />
          </div>
        )}

        {/* Emergency Modal */}
        {showEmergency && emergency && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dc2626', color: 'white', borderRadius: '16px 16px 0 0' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>?? Emergency ? Visitors Currently Inside</h3>
                  <p style={{ fontSize: '0.8rem', opacity: 0.85 }}>Generated at {new Date().toLocaleTimeString()} ? {emergency.length} visitor(s)</p>
                </div>
                <button onClick={() => setShowEmergency(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
              </div>
              <div style={{ padding: 20 }}>
                {emergency.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate-500)' }}><CheckCircle2 size={40} color="#16a34a" /><p style={{ marginTop: 12 }}>No visitors currently inside.</p></div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'var(--slate-50)' }}>{['Visitor', 'Host', 'Department', 'Entry Time', 'Expected Exit', 'Status'].map(h => <th key={h} style={{ padding: '8px 12px', fontSize: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--slate-600)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {emergency.map((e: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                          <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 600 }}>{e.visitorName}</div><div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{e.mobile}</div></td>
                          <td style={{ padding: '10px 12px' }}>{e.hostName}</td>
                          <td style={{ padding: '10px 12px' }}>{e.department}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{e.entryTime ? new Date(e.entryTime).toLocaleTimeString() : '-'}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{e.expectedExitTime}</td>
                          <td style={{ padding: '10px 12px' }}><span className={`badge ${statusBadgeClass(e.status)}`}>{statusLabel(e.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search visitor name, mobile, visit ID..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['PENDING_HOST', 'APPROVED', 'WAITING', 'CHECKED_IN', 'OVERDUE', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
            <input type="date" className="form-control" style={{ width: 160 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            {(q || statusFilter || dateFilter) && <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setStatusFilter(''); setDateFilter(''); }}>Clear</button>}
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
          ) : visits.length === 0 ? (
            <div className="empty-state"><Users size={36} /><h4>No visitor records found</h4><p>Try adjusting your filters.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Visit ID</th><th>Visitor</th><th>Host</th><th>Purpose</th><th>Date</th><th>Type</th><th>Status</th><th>Pass</th><th>Action</th></tr></thead>
                <tbody>
                  {visits.map((v: any) => {
                    const hEmp = v.hostUser?.employee;
                    const photo = v.photoUrl || v.visitor?.photoUrl;
                    return (
                      <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedVisit(v)}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{v.visitId}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {photo ? (
                              <img
                                src={photo}
                                alt="Visitor"
                                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                flexShrink: 0,
                                border: '1px solid #bfdbfe'
                              }}>
                                {v.visitor?.fullName ? v.visitor.fullName.charAt(0).toUpperCase() : 'V'}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{v.visitor?.fullName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{v.visitor?.mobile}</div>
                              {v.visitor?.organization && <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{v.visitor.organization}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{hEmp ? `${hEmp.firstName} ${hEmp.lastName}` : v.hostUser?.email}<br /><span style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{v.department?.name || hEmp?.department?.name}</span></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.purpose}</td>
                        <td>{fmtDate(v.visitDate)}<br /><span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--slate-500)' }}>{v.expectedEntryTime} – {v.expectedExitTime}</span></td>
                        <td><span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>{v.visitType === 'WALK_IN' ? 'Walk-in' : 'Invited'}</span></td>
                        <td><span className={`badge ${statusBadgeClass(v.status)}`}>{statusLabel(v.status)}</span></td>
                        <td>{v.visitorPass ? <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--blue-700)' }}>{v.visitorPass.passNumber}</span> : <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>-</span>}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setSelectedVisit(v)}
                          >
                            <Eye size={12} /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--slate-100)', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                Showing {visits.length} records · Click any row to view full visitor & host parameters
              </div>
            </div>
          )}
        </div>

        {/* FULL VISITOR & HOST PARAMETERS MODAL */}
        {selectedVisit && (
          <Modal
            open={!!selectedVisit}
            onClose={() => setSelectedVisit(null)}
            title={`Visit Details: ${selectedVisit.visitId}`}
            footer={
              <>
                {selectedVisit.visitorPass?.qrToken && (
                  <a
                    href={`/visitor-pass/${selectedVisit.visitorPass.qrToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}
                  >
                    <ExternalLink size={14} /> Open Digital QR Pass
                  </a>
                )}
                <button className="btn btn-primary" onClick={() => setSelectedVisit(null)}>
                  Close
                </button>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* STATUS BANNER */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--slate-50)',
                border: '1px solid var(--slate-200)'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Current Status</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>
                    <span className={`badge ${statusBadgeClass(selectedVisit.status)}`}>{statusLabel(selectedVisit.status)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Pass Number</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: '#1d4ed8' }}>
                    {selectedVisit.visitorPass?.passNumber || 'Not Generated'}
                  </div>
                </div>
              </div>

              {/* SECTION 1: WHO CAME (VISITOR PARAMETERS WITH PHOTO) */}
              <div style={{ border: '1px solid var(--slate-200)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.875rem', color: '#1d4ed8' }}>
                    <User size={16} /> 1. Visitor Parameters (Who Came)
                  </div>
                  {(selectedVisit.photoUrl || selectedVisit.visitor?.photoUrl) && (
                    <span style={{ fontSize: '0.7rem', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                      ✓ Live Selfie Attached
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 }}>
                  {(selectedVisit.photoUrl || selectedVisit.visitor?.photoUrl) ? (
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={selectedVisit.photoUrl || selectedVisit.visitor.photoUrl}
                        alt="Visitor"
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 12,
                          objectFit: 'cover',
                          border: '3px solid #2563eb',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
                        }}
                      />
                      <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginTop: 4 }}>Gate ID Photo</span>
                    </div>
                  ) : (
                    <div style={{
                      width: 100,
                      height: 100,
                      borderRadius: 12,
                      background: '#f1f5f9',
                      border: '2px dashed #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: '0.72rem'
                    }}>
                      <User size={28} />
                      <span>No Photo</span>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 200, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, fontSize: '0.8125rem' }}>
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Full Name</span>
                      <strong>{selectedVisit.visitor?.fullName || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Mobile / WhatsApp</span>
                      <strong>{selectedVisit.visitor?.mobile || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Email Address</span>
                      <span>{selectedVisit.visitor?.email || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Organization / Company</span>
                      <strong>{selectedVisit.visitor?.organization || 'Individual / Personal'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Total Persons</span>
                      <span>{selectedVisit.numberOfVisitors || 1} Person(s)</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Vehicle Number</span>
                      <strong style={{ fontFamily: 'monospace' }}>{selectedVisit.vehicleNumber || 'No Vehicle'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>ID Proof Type</span>
                      <span>{selectedVisit.visitor?.idType || 'Aadhaar / Photo ID'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: WHOM TO MEET (HOST PARAMETERS) */}
              <div style={{ border: '1px solid var(--slate-200)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.875rem', color: '#16a34a', marginBottom: 12 }}>
                  <Building size={16} /> 2. Host Parameters (Whom to Meet)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Host Name</span>
                    <strong>{selectedVisit.hostUser?.employee ? `${selectedVisit.hostUser.employee.firstName} ${selectedVisit.hostUser.employee.lastName}` : (selectedVisit.hostUser?.email || '—')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Designation</span>
                    <span>{selectedVisit.hostUser?.employee?.designation || 'Staff Member'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Department</span>
                    <strong>{selectedVisit.department?.name || selectedVisit.hostUser?.employee?.department?.name || 'General'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Host Email</span>
                    <span>{selectedVisit.hostUser?.email || '—'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Host System Role</span>
                    <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>{selectedVisit.hostUser?.role || 'EMPLOYEE'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: VISIT LOGISTICS & GATE TRAIL */}
              <div style={{ border: '1px solid var(--slate-200)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.875rem', color: '#7c3aed', marginBottom: 12 }}>
                  <Clock size={16} /> 3. Gate Timing & Execution Logs
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Visit Date</span>
                    <strong>{fmtDate(selectedVisit.visitDate)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Scheduled Window</span>
                    <span style={{ fontFamily: 'monospace' }}>{selectedVisit.expectedEntryTime} – {selectedVisit.expectedExitTime}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Purpose</span>
                    <span>{selectedVisit.purpose}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Visit Type</span>
                    <span>{selectedVisit.visitType === 'WALK_IN' ? 'Walk-in Registration' : 'Pre-Invited'}</span>
                  </div>
                  {selectedVisit.checkIns?.[0] && (
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Actual Gate In</span>
                      <strong style={{ color: '#16a34a' }}>{new Date(selectedVisit.checkIns[0].actualEntryTime).toLocaleTimeString('en-IN')}</strong>
                    </div>
                  )}
                  {selectedVisit.checkOuts?.[0] && (
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>Actual Gate Out</span>
                      <strong style={{ color: '#ea580c' }}>{new Date(selectedVisit.checkOuts[0].actualExitTime).toLocaleTimeString('en-IN')}</strong>
                    </div>
                  )}
                  {selectedVisit.rejectionReason && (
                    <div style={{ gridColumn: '1 / -1', background: '#fef2f2', padding: '8px 12px', borderRadius: 8, color: '#b91c1c' }}>
                      <span style={{ fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>Rejection Reason:</span>
                      {selectedVisit.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}
