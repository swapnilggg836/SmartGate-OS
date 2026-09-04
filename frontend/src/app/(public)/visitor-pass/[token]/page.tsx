'use client';

import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield, Calendar, Clock, User, Building2, CheckCircle2,
  XCircle, AlertTriangle, Printer, MessageCircle, Share2,
  Download, Car, Users, Phone, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: '#16a34a',
    USED: '#2563eb',
    EXPIRED: '#dc2626',
    CANCELLED: '#6b7280',
    APPROVED: '#16a34a',
    CHECKED_IN: '#16a34a',
    COMPLETED: '#16a34a',
    REJECTED: '#dc2626',
    PENDING_HOST: '#d97706',
    WAITING: '#d97706',
    OVERDUE: '#dc2626',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Valid Pass',
    USED: 'Pass Used',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
    APPROVED: 'Visit Approved',
    CHECKED_IN: 'Checked In',
    COMPLETED: 'Visit Completed',
    PENDING_HOST: 'Awaiting Approval',
    WAITING: 'Waiting',
    REJECTED: 'Rejected',
    OVERDUE: 'Overdue',
  };
  const color = colors[status] || '#6b7280';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 20,
      background: `${color}18`,
      color,
      fontWeight: 700,
      fontSize: '0.8rem',
      border: `1.5px solid ${color}33`
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {labels[status] || status}
    </span>
  );
}

export default function VisitorPassPage({ params }: { params: { token: string } }) {
  const [pass, setPass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/visitors/pass/${params.token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setPass(data.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.token]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!pass) return;
    const passUrl = typeof window !== 'undefined' ? window.location.href : '';
    const msg = encodeURIComponent(
      `*SmartGate OS · Official Visitor Pass*\n` +
      `Pass Number: ${pass.passNumber}\n` +
      `Visitor: ${pass.visitorName}\n` +
      `Host: ${pass.hostName} (${pass.departmentName || 'Campus'})\n` +
      `Valid Date: ${new Date(pass.visitDate).toLocaleDateString('en-IN')}\n` +
      `Valid Time: ${pass.expectedEntryTime} - ${pass.expectedExitTime}\n\n` +
      `Open Scannable Pass & QR Code:\n${passUrl}\n\n` +
      `Show this QR pass at the security gate.`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('pass-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 400, 400);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${pass.passNumber}-QR.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '4px solid rgba(255,255,255,0.2)',
            borderTopColor: '#3b82f6', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Loading digital visitor pass...</p>
        </div>
      </div>
    );
  }

  if (error || !pass) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 36,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#fee2e2', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <XCircle size={32} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            Invalid Visitor Pass
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
            This pass link is invalid, expired, or has not been approved yet.
          </p>
          <Link
            href="/visitor-register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#2563eb',
              color: 'white',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            Fill New Visitor Request →
          </Link>
        </div>
      </div>
    );
  }

  const isValid = pass.status === 'ACTIVE' && pass.visitStatus === 'APPROVED';
  const visitDateFormatted = new Date(pass.visitDate).toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  const hostDisplay = pass.hostDesignation ? `${pass.hostName} · ${pass.hostDesignation}` : pass.hostName;
  const timeDisplay = `${pass.expectedEntryTime} – ${pass.expectedExitTime}`;
  const qrValue = pass.qrToken;

  return (
    <>
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: 2px solid #000 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
          }
          .print-dark-header {
            background: #1e3a8a !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px 40px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Top Brand & Back to Home (hidden on print) */}
          <div className="no-print" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <Link
              href="/visitor-register"
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
                fontWeight: 600,
                background: 'rgba(255,255,255,0.1)',
                padding: '6px 12px',
                borderRadius: 8
              }}
            >
              <ArrowLeft size={14} /> Visitor Portal
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shield size={18} color="white" />
              </div>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>SmartGate OS</span>
            </div>
          </div>

          {/* MAIN VISITOR PASS BADGE */}
          <div
            ref={printRef}
            className="print-container"
            style={{
              background: 'white',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {/* Header Stripe */}
            <div
              className="print-dark-header"
              style={{
                background: isValid
                  ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                padding: '20px 22px',
                color: 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    opacity: 0.8,
                    fontWeight: 700
                  }}>
                    Digital Visitor Badge
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                    {pass.passNumber}
                  </div>
                </div>
                <StatusBadge status={pass.status !== 'ACTIVE' ? pass.status : pass.visitStatus} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                {pass.photoUrl ? (
                  <img
                    src={pass.photoUrl}
                    alt="Visitor Photo"
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 14,
                      objectFit: 'cover',
                      border: '2.5px solid white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      flexShrink: 0
                    }}
                  />
                ) : (
                  <div style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {pass.visitorName ? pass.visitorName.charAt(0).toUpperCase() : 'V'}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    {pass.visitorName}
                  </div>
                  {pass.organization && (
                    <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: 2 }}>
                      {pass.organization}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 2 }}>
                    Visit ID: <strong>{pass.visitId}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SCANNABLE QR CODE SECTION */}
            <div style={{
              padding: '24px 20px',
              textAlign: 'center',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <div style={{
                display: 'inline-block',
                padding: 16,
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                border: '2px solid #e2e8f0'
              }}>
                <QRCodeSVG
                  id="pass-qr-svg"
                  value={qrValue}
                  size={180}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>

              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#475569',
                marginTop: 8,
                fontWeight: 700
              }}>
                {pass.passNumber}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 0' }}>
                Show or scan this QR code at the Security Desk for Entry
              </p>
            </div>

            {/* VISIT DETAILS GRID */}
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2 }}>
                    Host Employee
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                    {pass.hostName}
                  </div>
                  {pass.hostDesignation && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {pass.hostDesignation}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2 }}>
                    Department
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                    {pass.departmentName || 'Campus Main'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2 }}>
                    Visit Date
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    {visitDateFormatted}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2 }}>
                    Expected Time
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                    {timeDisplay}
                  </div>
                </div>
              </div>

              {/* Additional Details (Persons, Vehicle, Purpose) */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pass.numberOfVisitors > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#2563eb', background: '#eff6ff', padding: '6px 10px', borderRadius: 8, fontWeight: 600 }}>
                    <Users size={14} /> Total Visitors in Group: {pass.numberOfVisitors} Persons
                  </div>
                )}
                {pass.vehicleNumber && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#475569' }}>
                    <Car size={14} color="#64748b" /> Vehicle: <strong>{pass.vehicleNumber}</strong>
                  </div>
                )}
                {pass.purpose && (
                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                    Purpose: <strong>{pass.purpose}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Footer Banner */}
            <div style={{
              padding: '12px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderTop: '1px solid #f1f5f9'
            }}>
              {isValid ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#16a34a', fontSize: '0.8rem', fontWeight: 700 }}>
                  <CheckCircle2 size={15} /> Pass is ACTIVE & Authorized for Campus Entry
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 700 }}>
                  <AlertTriangle size={15} /> Pass is no longer valid for entry
                </div>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS (Hidden on print) */}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={handlePrint}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
                }}
              >
                <Printer size={16} /> Print Pass
              </button>

              <button
                onClick={handleShareWhatsApp}
                style={{
                  background: '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(37,211,102,0.3)'
                }}
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={handleDownloadQR}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Download size={14} /> Download QR
              </button>

              <button
                onClick={handleCopyLink}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Share2 size={14} /> {copied ? 'Copied Link!' : 'Copy Link'}
              </button>
            </div>
          </div>

          <p className="no-print" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', marginTop: 20 }}>
            SmartGate OS · Contactless Visitor Management System
          </p>
        </div>
      </div>
    </>
  );
}
