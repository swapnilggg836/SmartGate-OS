'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Shield, QrCode, User, Phone, Mail, Building, FileText, CheckCircle2,
  Clock, AlertCircle, ArrowRight, Share2, RefreshCw, Car, Users, Sparkles, MessageCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const PURPOSES = [
  'Business Meeting',
  'Interview / Recruitment',
  'Vendor / Contractor Visit',
  'Client Presentation',
  'Courier / Package Delivery',
  'Office Maintenance / IT Support',
  'Personal Visit',
  'Other Official Work'
];

const ID_TYPES = [
  { value: 'AADHAR', label: 'Aadhaar Card' },
  { value: 'PAN', label: 'PAN Card' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'OTHER', label: 'Other Photo ID' },
];

export default function VisitorRegisterPage() {
  const [hosts, setHosts] = useState<any[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [hostSearch, setHostSearch] = useState('');
  const [selectedHost, setSelectedHost] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    organization: '',
    idType: 'AADHAR',
    purpose: 'Business Meeting',
    numberOfVisitors: 1,
    vehicleNumber: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Live Tracking State
  const [trackingVisitId, setTrackingVisitId] = useState<string | null>(null);
  const [visitStatus, setVisitStatus] = useState<any | null>(null);
  const [polling, setPolling] = useState(false);
  const pollTimerRef = useRef<any>(null);

  // Load public host list
  useEffect(() => {
    fetch(`${API_BASE}/visitors/public-hosts`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHosts(data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHosts(false));
  }, []);

  // Poll status when tracking
  useEffect(() => {
    if (!trackingVisitId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/visitors/public-status/${trackingVisitId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setVisitStatus(json.data);
          if (['APPROVED', 'REJECTED', 'CHECKED_IN'].includes(json.data.status)) {
            // Stop rapid polling once finalized
            clearInterval(pollTimerRef.current);
          }
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    };

    checkStatus();
    pollTimerRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [trackingVisitId]);

  const filteredHosts = hosts.filter(h =>
    !hostSearch ||
    h.name.toLowerCase().includes(hostSearch.toLowerCase()) ||
    h.department.toLowerCase().includes(hostSearch.toLowerCase()) ||
    (h.code && h.code.toLowerCase().includes(hostSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim()) return setError('Please enter your full name.');
    if (!form.mobile.trim() || form.mobile.replace(/[^0-9]/g, '').length < 7) {
      return setError('Please enter a valid mobile / WhatsApp number.');
    }
    if (!selectedHost) {
      return setError('Please select the employee (host) you came to meet.');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/visitors/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hostUserId: selectedHost.id,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      setTrackingVisitId(data.data.visitId);
      setVisitStatus(data.data);
      setPolling(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Could not submit visitor request. Please retry or speak to Security.');
    } finally {
      setSubmitting(false);
    }
  };

  // WhatsApp pass sharing helper
  const openWhatsApp = () => {
    if (visitStatus?.whatsappUrl) {
      window.open(visitStatus.whatsappUrl, '_blank');
    } else if (visitStatus?.pass) {
      const passUrl = `${window.location.origin}/visitor-pass/${visitStatus.pass.qrToken}`;
      const msg = encodeURIComponent(
        `Hello ${visitStatus.visitorName}!\nHere is your Visitor Entry Pass for SmartGate Campus:\n` +
        `Pass Number: ${visitStatus.pass.passNumber}\nHost: ${visitStatus.hostName}\n` +
        `Open your pass & QR Code:\n${passUrl}\nShow this at the security gate.`
      );
      const cleanPhone = form.mobile.replace(/[^0-9]/g, '');
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`, '_blank');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 40%, #f8fafc 100%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1e293b',
      paddingBottom: 60
    }}>
      {/* Top Corporate Brand Header */}
      <header style={{
        background: '#1d4ed8',
        color: 'white',
        padding: '18px 20px',
        boxShadow: '0 2px 10px rgba(29, 78, 216, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'white',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              SmartGate OS
            </h1>
            <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>
              Visitor Gate Check-in Portal
            </div>
          </div>
        </div>

        <Link
          href="/login"
          style={{
            color: 'white',
            background: 'rgba(255,255,255,0.18)',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: '0.75rem',
            textDecoration: 'none',
            fontWeight: 600
          }}
        >
          Staff Login →
        </Link>
      </header>

      <main style={{ maxWidth: 540, margin: '0 auto', padding: '20px 16px' }}>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: LIVE STATUS TRACKER (IF SUBMITTED)                    */}
        {/* ------------------------------------------------------------- */}
        {trackingVisitId ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Status Card Header */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              {/* STATUS: PENDING_HOST */}
              {visitStatus?.status === 'PENDING_HOST' && (
                <div>
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 0 0 10px #f0f7ff',
                    animation: 'pulse 2s infinite'
                  }}>
                    <Clock size={36} />
                  </div>
                  <span style={{
                    display: 'inline-block',
                    background: '#dbeafe',
                    color: '#1e40af',
                    padding: '4px 14px',
                    borderRadius: 99,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 10
                  }}>
                    Awaiting Host Approval
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>
                    Request Sent to {visitStatus.hostName}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 auto', maxWidth: 400 }}>
                    We have notified your host in <strong>{visitStatus.hostDepartment || 'the building'}</strong>. Please wait a moment while they review your visit request.
                  </p>

                  <div style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: 10,
                    fontSize: '0.8rem',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}>
                    <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                    Auto-checking host response every 3 seconds...
                  </div>
                </div>
              )}

              {/* STATUS: APPROVED */}
              {visitStatus?.status === 'APPROVED' && (
                <div>
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 0 0 10px #f0fdf4'
                  }}>
                    <CheckCircle2 size={40} />
                  </div>
                  <span style={{
                    display: 'inline-block',
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '4px 14px',
                    borderRadius: 99,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 10
                  }}>
                    ✓ Entry Approved by Host
                  </span>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
                    Welcome, {visitStatus.visitorName}!
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 20px' }}>
                    Your digital gate pass has been issued. Show this pass to Security at the gate.
                  </p>

                  {/* DIGITAL GATE PASS CARD */}
                  {visitStatus.pass && (
                    <div style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                      borderRadius: 16,
                      color: 'white',
                      padding: 20,
                      textAlign: 'left',
                      boxShadow: '0 8px 24px rgba(37,99,235,0.25)',
                      marginBottom: 20
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 12, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>Visitor Pass</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.04em' }}>{visitStatus.pass.passNumber}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>
                          ACTIVE
                        </div>
                      </div>

                      {/* QR Representation */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ background: 'white', padding: 8, borderRadius: 10, flexShrink: 0 }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(visitStatus.pass.qrToken)}`}
                            alt="Pass QR"
                            style={{ width: 100, height: 100, display: 'block' }}
                          />
                        </div>
                        <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                          <div><strong>Visitor:</strong> {visitStatus.visitorName}</div>
                          <div><strong>Host:</strong> {visitStatus.hostName}</div>
                          <div><strong>Dept:</strong> {visitStatus.hostDepartment}</div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: 4 }}>
                            Valid for immediate gate check-in
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.7rem', opacity: 0.85, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 10 }}>
                        Scan QR at Gate Security Desk for Entry
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={openWhatsApp}
                      style={{
                        background: '#25D366',
                        color: 'white',
                        border: 'none',
                        borderRadius: 12,
                        padding: '14px 20px',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)'
                      }}
                    >
                      <MessageCircle size={20} />
                      Save Pass to WhatsApp
                    </button>

                    {visitStatus.pass && (
                      <Link
                        href={`/visitor-pass/${visitStatus.pass.qrToken}`}
                        target="_blank"
                        style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: 12,
                          padding: '12px 20px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        <QrCode size={16} /> Open Fullscreen Pass
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* STATUS: REJECTED */}
              {visitStatus?.status === 'REJECTED' && (
                <div>
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <AlertCircle size={40} />
                  </div>
                  <span style={{
                    display: 'inline-block',
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '4px 14px',
                    borderRadius: 99,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: 10
                  }}>
                    Visit Not Approved
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>
                    Request Declined
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20 }}>
                    {visitStatus.rejectionReason || 'The host is currently unavailable to receive visitors.'}
                  </p>
                  <button
                    onClick={() => { setTrackingVisitId(null); setVisitStatus(null); }}
                    style={{
                      background: '#1d4ed8',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 10,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Try Another Request
                  </button>
                </div>
              )}

              {/* STATUS: WAITING */}
              {visitStatus?.status === 'WAITING' && (
                <div>
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#fffbeb',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <Clock size={40} />
                  </div>
                  <span style={{
                    display: 'inline-block',
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '4px 14px',
                    borderRadius: 99,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: 10
                  }}>
                    Host Requested to Wait
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>
                    Please Wait 5-10 Minutes
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {visitStatus.hostName} is currently in a meeting or wrapping up an assignment and will approve shortly.
                  </p>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => { setTrackingVisitId(null); setVisitStatus(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                ← Fill a new visitor form
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header Banner */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: '20px 20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                <Sparkles size={14} /> Gate Self Check-In
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                Welcome to Enterprise Campus
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Please fill in your details below to notify your host and receive your entry pass.
              </p>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* CARD 1: WHO ARE YOU MEETING? */}
              <div style={{ background: 'white', borderRadius: 16, padding: 18, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#1d4ed8' }}>
                  <Building size={16} /> Step 1: Select Employee (Host)
                </div>

                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder="Search host by name or department..."
                    value={hostSearch}
                    onChange={e => setHostSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Selected Host Badge */}
                {selectedHost ? (
                  <div style={{
                    background: '#eff6ff',
                    border: '2px solid #3b82f6',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e3a8a' }}>
                        {selectedHost.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                        {selectedHost.designation} · {selectedHost.department}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedHost(null)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        color: '#1d4ed8',
                        fontWeight: 600
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    background: '#f8fafc'
                  }}>
                    {loadingHosts ? (
                      <div style={{ padding: 16, textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                        Loading staff list...
                      </div>
                    ) : filteredHosts.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                        No employee found matching "{hostSearch}"
                      </div>
                    ) : (
                      filteredHosts.map(h => (
                        <div
                          key={h.id}
                          onClick={() => { setSelectedHost(h); setHostSearch(''); }}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{h.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{h.designation} · {h.department}</div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Select →</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* CARD 2: YOUR VISITOR DETAILS */}
              <div style={{ background: 'white', borderRadius: 16, padding: 18, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8, color: '#1d4ed8' }}>
                  <User size={16} /> Step 2: Your Information
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                    Mobile / WhatsApp Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={form.mobile}
                    onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#059669', display: 'block', marginTop: 3 }}>
                    📲 Your approved entry pass link will be sent to this WhatsApp number.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="name@mail.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                      Organization / Company
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Infosys / Vendor"
                      value={form.organization}
                      onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                      ID Proof Carried
                    </label>
                    <select
                      value={form.idType}
                      onChange={e => setForm(f => ({ ...f, idType: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box', background: 'white' }}
                    >
                      {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                      Total Persons
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={form.numberOfVisitors}
                      onChange={e => setForm(f => ({ ...f, numberOfVisitors: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                    Purpose of Visit <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={form.purpose}
                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: 'white' }}
                  >
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                    Vehicle Number (If any)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH 12 AB 1234"
                    value={form.vehicleNumber}
                    onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: '#1d4ed8',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 20px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)',
                  transition: 'background 0.2s'
                }}
              >
                {submitting ? 'Connecting with Host...' : 'Request Entry Pass →'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                Protected by SmartGate OS · Entry subject to Security & Host approval
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
