'use client';

import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield, Calendar, Clock, User, Building2, CheckCircle2,
  XCircle, AlertTriangle, Printer, MessageCircle, Share2,
  Download, Car, Users, Phone, ArrowLeft, Check, ThumbsUp,
  ThumbsDown, LogOut, Wifi, RotateCw
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
    CHECKED_IN: '#0284c7',
    CLEARED_FOR_EXIT: '#8b5cf6',
    COMPLETED: '#16a34a',
    CHECKED_OUT: '#16a34a',
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
    CHECKED_IN: 'Inside Campus / In Meeting',
    CLEARED_FOR_EXIT: 'Host Cleared Exit',
    COMPLETED: 'Visit Completed',
    CHECKED_OUT: 'Checked Out',
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
      padding: '5px 12px',
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
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [responding, setResponding] = useState(false);
  const [responseMsg, setResponseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const loadPass = () => {
    fetch(`${API_BASE}/visitors/pass/${params.token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setPass(data.data);
          // If visit is completed, clear any cached visit in localStorage so returning visitors start fresh
          if (['COMPLETED', 'CHECKED_OUT'].includes(data.data.visitStatus)) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('smartgate_active_visit_id');
            }
          }
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPass();
  }, [params.token]);

  const handleRespondInvitation = async (action: 'ACCEPT' | 'DECLINE') => {
    setResponding(true);
    setResponseMsg(null);
    try {
      const res = await fetch(`${API_BASE}/visitors/pass/${params.token}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({
          type: 'success',
          text: action === 'ACCEPT'
            ? 'Invitation Accepted! Your campus pass is ready. Please present the QR code at security.'
            : 'Invitation Declined. Host has been notified.'
        });
        loadPass();
      } else {
        setResponseMsg({ type: 'error', text: data.message || 'Failed to respond to invitation.' });
      }
    } catch {
      setResponseMsg({ type: 'error', text: 'Network error responding to invitation.' });
    } finally {
      setResponding(false);
    }
  };

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
      `Show this QR pass at the security gate for entry & exit.`
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

  const handleDownloadBadge = () => {
    if (!pass) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 940;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Card White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 940);

    // Header Gradient
    const gradient = ctx.createLinearGradient(0, 0, 600, 220);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e3a8a');
    gradient.addColorStop(1, '#2563eb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 200);

    // Top Tag
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('SMARTGATE OS · OFFICIAL CAMPUS PASS', 30, 45);

    // Pass Number
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText(pass.passNumber, 30, 85);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`Visit ID: ${pass.visitId || 'ONLINE'}`, 30, 115);

    // Visitor Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(pass.visitorName || 'Visitor', 30, 160);

    if (pass.organization) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(pass.organization, 30, 185);
    }

    // Capture QR SVG to canvas
    const svg = document.getElementById('pass-qr-svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        // QR Container
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(150, 240, 300, 300);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.strokeRect(150, 240, 300, 300);
        ctx.drawImage(img, 175, 265, 250, 250);

        // Details Section
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(`Host: ${pass.hostName}`, 50, 590);

        ctx.font = '16px system-ui, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`Department: ${pass.departmentName || 'Campus Main'}`, 50, 620);
        ctx.fillText(`Purpose: ${pass.purpose || 'Campus Visit'}`, 50, 650);
        ctx.fillText(`Date: ${new Date(pass.visitDate).toLocaleDateString('en-IN')}`, 50, 680);
        ctx.fillText(`Expected Time: ${pass.expectedEntryTime} – ${pass.expectedExitTime}`, 50, 710);
        if (pass.visitorPhone) {
          ctx.fillText(`Contact: ${pass.visitorPhone}`, 50, 740);
        }
        if (pass.vehicleNumber) {
          ctx.fillText(`Vehicle: ${pass.vehicleNumber}`, 50, 770);
        }

        // Footer Banner
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(0, 860, 600, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SECURITY CLEARANCE · SHOW AT GATE ENTRANCE & EXIT', 300, 908);

        // Download PNG
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${pass.passNumber}-Badge.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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

  const isVisitCompleted = ['COMPLETED', 'CHECKED_OUT'].includes(pass.visitStatus);
  const isClearedForExit = pass.visitStatus === 'CLEARED_FOR_EXIT';
  const isInsideCampus = pass.visitStatus === 'CHECKED_IN';
  const isValid = pass.status === 'ACTIVE' && (pass.visitStatus === 'APPROVED' || isInsideCampus || isClearedForExit);
  const isInvitationPending = pass.invitationStatus === 'PENDING' || pass.visitStatus === 'PENDING_HOST';

  const visitDateFormatted = new Date(pass.visitDate).toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
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

          {/* Top Brand & Flip/Nav Bar (hidden on print) */}
          <div className="no-print" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <Link
              href="/visitor-register"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('smartgate_active_visit_id');
                }
              }}
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
              <button
                onClick={() => setSide(s => s === 'front' ? 'back' : 'front')}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <RotateCw size={13} /> {side === 'front' ? 'Back / Rules' : 'Front / Pass'}
              </button>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shield size={18} color="white" />
              </div>
            </div>
          </div>

          {/* VISIT COMPLETED / ENTRY OVER BANNER */}
          {isVisitCompleted && (
            <div style={{
              background: '#0f172a',
              color: 'white',
              borderRadius: 16,
              padding: '20px',
              marginBottom: 16,
              border: '2px solid #22c55e',
              boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px'
              }}>
                <CheckCircle2 size={28} />
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4ade80' }}>
                Visit Completed · Entry Over
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '6px 0 14px', lineHeight: 1.4 }}>
                Thank you for visiting! Your session has been officially checked out at the security gate.
                This visitor pass is now archived.
              </p>
              {pass.actualExitTime && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 14 }}>
                  Checked Out At: <strong>{new Date(pass.actualExitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
              )}
              <Link
                href="/visitor-register"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('smartgate_active_visit_id');
                  }
                }}
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
                Register a New Visit →
              </Link>
            </div>
          )}

          {/* HOST CLEARED EXIT BANNER */}
          {isClearedForExit && (
            <div style={{
              background: '#f3e8ff',
              color: '#6b21a8',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 16,
              border: '1.5px solid #d8b4fe',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <LogOut size={24} style={{ flexShrink: 0, color: '#9333ea' }} />
              <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#581c87' }}>Host Has Cleared You For Exit</strong>
                Your meeting with {pass.hostName} is concluded. Please proceed to the Security Gate for final checkout.
              </div>
            </div>
          )}

          {/* INVITATION ACCEPT / DECLINE PROMPT */}
          {isInvitationPending && (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: '18px 20px',
              marginBottom: 16,
              boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
              border: '2px solid #3b82f6'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: 4 }}>
                You have an Invitation from {pass.hostName}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 14px' }}>
                Please accept or decline this campus visit invitation.
              </p>
              {responseMsg && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  marginBottom: 12,
                  background: responseMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                  color: responseMsg.type === 'success' ? '#166534' : '#991b1b',
                  fontWeight: 600
                }}>
                  {responseMsg.text}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  disabled={responding}
                  onClick={() => handleRespondInvitation('ACCEPT')}
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <ThumbsUp size={15} /> Accept Pass
                </button>
                <button
                  disabled={responding}
                  onClick={() => handleRespondInvitation('DECLINE')}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <ThumbsDown size={15} /> Decline
                </button>
              </div>
            </div>
          )}

          {/* MAIN VISITOR PASS BADGE CONTAINER */}
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
            {side === 'front' ? (
              <>
                {/* Header Stripe */}
                <div
                  className="print-dark-header"
                  style={{
                    background: isVisitCompleted
                      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                      : isValid
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
                    <StatusBadge status={pass.visitStatus || pass.status} />
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
                  background: isVisitCompleted ? '#f1f5f9' : '#f8fafc',
                  opacity: isVisitCompleted ? 0.6 : 1
                }}>
                  <div style={{
                    display: 'inline-block',
                    padding: 16,
                    background: 'white',
                    borderRadius: 16,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    border: '2px solid #e2e8f0',
                    position: 'relative'
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
                    {isVisitCompleted && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.8)',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        letterSpacing: '0.05em'
                      }}>
                        ENTRY OVER
                      </div>
                    )}
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
                    {isVisitCompleted
                      ? 'This pass has already been used and checked out.'
                      : 'Show or scan this QR code at the Security Desk for Entry & Exit'}
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

                  {/* Actual timestamps if checked in or out */}
                  {(pass.actualEntryTime || pass.actualExitTime) && (
                    <div style={{ marginTop: 12, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: '0.74rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                      {pass.actualEntryTime && (
                        <span>Entry: <strong>{new Date(pass.actualEntryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                      )}
                      {pass.actualExitTime && (
                        <span>Exit: <strong>{new Date(pass.actualExitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                      )}
                    </div>
                  )}

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
                  {isVisitCompleted ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                      <CheckCircle2 size={15} /> Visit Concluded · Archived
                    </div>
                  ) : isValid ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#16a34a', fontSize: '0.8rem', fontWeight: 700 }}>
                      <CheckCircle2 size={15} /> Pass is ACTIVE & Authorized for Campus Entry
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 700 }}>
                      <AlertTriangle size={15} /> Pass is no longer valid for entry
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* BACK SIDE: CAMPUS GUIDELINES & WI-FI */
              <div style={{ padding: '28px 24px' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: '#eff6ff', color: '#2563eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <Shield size={26} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    Campus Visitor Guidelines
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    Please review security & access policies during your stay
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
                    <Wifi size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>Guest Wi-Fi Access</div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: 2 }}>
                        SSID: <strong>SmartGate-Guest</strong> | Passcode: <strong>CampusGuest@2026</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
                    <Shield size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>Wear Pass Badge</div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: 2 }}>
                        Please keep this badge or physical lanyard visible at all times across campus wings.
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
                    <AlertTriangle size={20} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>Security & NDA Policy</div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: 2 }}>
                        Photography, video recording, or entering unauthorized server/lab rooms is prohibited.
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
                    <Phone size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>Gate & Emergency Desk</div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: 2 }}>
                        Security Gate: <strong>Ext 1099</strong> | First Aid: <strong>Ext 1010</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button
                    onClick={() => setSide('front')}
                    style={{
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 18px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Pass Front
                  </button>
                </div>
              </div>
            )}
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
                onClick={handleDownloadBadge}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
                title="Download full badge image"
              >
                <Download size={14} /> Download Badge
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
