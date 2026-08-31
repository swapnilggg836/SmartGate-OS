import React from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Shield, Calendar, Clock, User, Building2, QrCode, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

async function getPassData(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/visitors/pass/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch { return null; }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: '#16a34a', USED: '#2563eb', EXPIRED: '#dc2626', CANCELLED: '#6b7280',
    APPROVED: '#16a34a', CHECKED_IN: '#16a34a', COMPLETED: '#16a34a', REJECTED: '#dc2626',
    PENDING_HOST: '#d97706', WAITING: '#d97706', OVERDUE: '#dc2626',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Valid Pass', USED: 'Pass Used', EXPIRED: 'Expired', CANCELLED: 'Cancelled',
    APPROVED: 'Visit Approved', CHECKED_IN: 'Checked In', COMPLETED: 'Visit Completed',
    PENDING_HOST: 'Awaiting Approval', WAITING: 'Waiting', REJECTED: 'Rejected', OVERDUE: 'Overdue',
  };
  const color = colors[status] || '#6b7280';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: `${color}18`, color, fontWeight: 700, fontSize: '0.875rem', border: `1.5px solid ${color}33` }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {labels[status] || status}
    </span>
  );
}

export default async function VisitorPassPage({ params }: { params: { token: string } }) {
  const pass = await getPassData(params.token);

  if (!pass) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <XCircle size={32} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Invalid Pass</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>This visitor pass link is invalid, expired, or has already been used. Please contact your host for assistance.</p>
        </div>
      </div>
    );
  }

  const isValid = pass.status === 'ACTIVE' && pass.visitStatus === 'APPROVED';
  const visitDateFormatted = new Date(pass.visitDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hostDisplay = pass.hostDesignation ? `${pass.hostName} · ${pass.hostDesignation}` : pass.hostName;
  const timeDisplay = `${pass.expectedEntryTime} – ${pass.expectedExitTime}`;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={22} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>SmartGate OS</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>Visitor Management</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}>
          <div style={{ background: isValid ? 'linear-gradient(135deg, #1e3a5f, #2563eb)' : 'linear-gradient(135deg, #dc2626, #b91c1c)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Visitor Pass</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0.04em' }}>{pass.passNumber}</div>
              </div>
              <StatusBadge status={pass.status !== 'ACTIVE' ? pass.status : pass.visitStatus} />
            </div>
            <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>{pass.visitorName}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginTop: 2 }}>Visit ID: {pass.visitId}</div>
          </div>

          <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'inline-block', padding: 16, border: '2px solid #e2e8f0', borderRadius: 12, background: '#fafafa' }}>
              <div style={{ width: 160, height: 160, background: '#0f172a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <QrCode size={80} color="white" />
                <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{pass.passNumber}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 10 }}>Show this QR code to security at the gate</p>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {[
              { icon: <User size={15} color="#64748b" />, label: 'Meeting', value: hostDisplay },
              { icon: <Building2 size={15} color="#64748b" />, label: 'Department', value: pass.departmentName || '—' },
              { icon: <Calendar size={15} color="#64748b" />, label: 'Date', value: visitDateFormatted },
              { icon: <Clock size={15} color="#64748b" />, label: 'Time', value: timeDisplay },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ marginTop: 2 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                </div>
              </div>
            ))}
            {pass.numberOfVisitors > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#eff6ff', borderRadius: 8, marginTop: 4 }}>
                <User size={14} color="#2563eb" />
                <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>Group visit: {pass.numberOfVisitors} visitors</span>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 24px 20px', textAlign: 'center', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
            {isValid
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}><CheckCircle2 size={14} /> This pass is valid. Please present to security.</div>
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}><AlertTriangle size={14} /> This pass is no longer valid.</div>
            }
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: 20 }}>Powered by SmartGate OS · Visitor Management System</p>
      </div>
    </div>
  );
}

