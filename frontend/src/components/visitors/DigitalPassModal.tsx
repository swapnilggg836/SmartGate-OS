'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield, Printer, Download, MessageCircle, X, RotateCw,
  Building2, User, Clock, Calendar, CheckCircle2, AlertTriangle, Wifi, PhoneCall
} from 'lucide-react';
import { fmtDate, statusBadgeClass, statusLabel } from '@/lib/utils';

interface DigitalPassModalProps {
  visit: any;
  open: boolean;
  onClose: () => void;
}

export function DigitalPassModal({ visit, open, onClose }: DigitalPassModalProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');

  if (!open || !visit) return null;

  const visitor = visit.visitor || {};
  const hostEmp = visit.hostUser?.employee;
  const hostName = hostEmp ? `${hostEmp.firstName} ${hostEmp.lastName}` : visit.hostUser?.email || 'Host';
  const passNumber = visit.visitorPass?.passNumber || visit.pass?.passNumber || `VP-PENDING`;
  const qrToken = visit.visitorPass?.qrToken || visit.pass?.qrToken || visit.visitId;
  const photo = visit.photoUrl || visitor.photoUrl;
  const visitDateFormatted = fmtDate(visit.visitDate);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadBadge = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 920);

    // Header Gradient
    const gradient = ctx.createLinearGradient(0, 0, 600, 220);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e3a8a');
    gradient.addColorStop(1, '#2563eb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 200);

    // Header Text
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('SMARTGATE OS · OFFICIAL VISITOR PASS', 30, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText(passNumber, 30, 85);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`Visit ID: ${visit.visitId}`, 30, 115);

    // Visitor Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(visitor.fullName || 'Visitor', 30, 160);

    if (visitor.organization) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(visitor.organization, 30, 185);
    }

    // QR Code from DOM
    const svg = document.getElementById(`modal-pass-qr-${visit.id}`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        // Center QR box
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(150, 240, 300, 300);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.strokeRect(150, 240, 300, 300);
        ctx.drawImage(img, 175, 265, 250, 250);

        // Details Section
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(`Host: ${hostName}`, 50, 590);

        ctx.font = '16px system-ui, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`Department: ${visit.department?.name || hostEmp?.department?.name || 'Campus Main'}`, 50, 620);
        ctx.fillText(`Purpose: ${visit.purpose || 'Official Visit'}`, 50, 650);
        ctx.fillText(`Date: ${visitDateFormatted}`, 50, 680);
        ctx.fillText(`Time: ${visit.expectedEntryTime} - ${visit.expectedExitTime}`, 50, 710);
        if (visitor.mobile) {
          ctx.fillText(`Mobile: ${visitor.mobile}`, 50, 740);
        }

        // Footer Banner
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(0, 840, 600, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SECURITY CLEARANCE · SHOW AT GATE ENTRANCE & EXIT', 300, 885);

        // Download
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${passNumber}-Badge.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const handleShareWhatsApp = () => {
    const passUrl = typeof window !== 'undefined' ? `${window.location.origin}/visitor-pass/${qrToken}` : '';
    const msg = encodeURIComponent(
      `*SmartGate OS · Visitor Entry Badge*\n` +
      `Pass Number: ${passNumber}\n` +
      `Visitor: ${visitor.fullName}\n` +
      `Host: ${hostName} (${visit.department?.name || 'Campus'})\n` +
      `Date: ${visitDateFormatted}\n` +
      `Valid Time: ${visit.expectedEntryTime} - ${visit.expectedExitTime}\n\n` +
      `View Scannable Pass & QR Code:\n${passUrl}\n\n` +
      `Show this QR at the security gate for entry & exit.`
    );
    const cleanPhone = (visitor.mobile || '').replace(/[^0-9]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{
        background: 'white',
        borderRadius: 24,
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh'
      }}>
        {/* Top Modal Nav Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          background: '#0f172a',
          color: 'white',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="#38bdf8" />
            <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.04em' }}>
              Digital Visitor Badge
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setSide(s => s === 'front' ? 'back' : 'front')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: 'white',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
              title="Flip between front pass and back rules"
            >
              <RotateCw size={13} /> {side === 'front' ? 'View Back / Rules' : 'View Front / Pass'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
          {side === 'front' ? (
            /* FRONT SIDE OF PASS */
            <div>
              {/* Blue Header Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: 'white',
                padding: '20px 22px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontWeight: 700 }}>
                      SmartGate Campus Pass
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.02em' }}>
                      {passNumber}
                    </div>
                  </div>
                  <span className={`badge ${statusBadgeClass(visit.status)}`} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    {statusLabel(visit.status)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {photo ? (
                    <img
                      src={photo}
                      alt="Visitor"
                      style={{ width: 62, height: 62, borderRadius: 12, objectFit: 'cover', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    />
                  ) : (
                    <div style={{ width: 54, height: 54, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                      {visitor.fullName ? visitor.fullName.charAt(0).toUpperCase() : 'V'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.2 }}>
                      {visitor.fullName}
                    </div>
                    {visitor.organization && (
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: 2 }}>
                        {visitor.organization}
                      </div>
                    )}
                    <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 2 }}>
                      Phone: <strong>{visitor.mobile}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scannable High-Res QR Code */}
              <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{
                  display: 'inline-block',
                  background: 'white',
                  padding: 14,
                  borderRadius: 16,
                  boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
                  border: '2px solid #e2e8f0'
                }}>
                  <QRCodeSVG
                    id={`modal-pass-qr-${visit.id}`}
                    value={qrToken}
                    size={160}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569', marginTop: 8, fontWeight: 700 }}>
                  Scan payload token: {passNumber}
                </div>
              </div>

              {/* Visit Details Grid */}
              <div style={{ padding: '18px 22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Host Employee</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{hostName}</div>
                    {hostEmp?.designation && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{hostEmp.designation}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Department</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{visit.department?.name || hostEmp?.department?.name || 'General'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Visit Date</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{visitDateFormatted}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Time Window</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{visit.expectedEntryTime} – {visit.expectedExitTime}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#334155' }}>
                  Purpose: <strong>{visit.purpose}</strong>
                  {visit.vehicleNumber && <div style={{ marginTop: 4 }}>Vehicle Number: <strong>{visit.vehicleNumber}</strong></div>}
                </div>
              </div>
            </div>
          ) : (
            /* BACK SIDE OF PASS (CAMPUS RULES, WI-FI, SAFETY) */
            <div style={{ padding: '24px 22px' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Shield size={24} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Campus Visitor Guidelines
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                  Safety, Conduct & Facility Access Instructions
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
                  <Wifi size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>Guest Wi-Fi Access</div>
                    <div style={{ fontSize: '0.76rem', color: '#475569' }}>Network: <strong>SmartGate-Guest</strong> | Pass: <strong>CampusGuest@2026</strong></div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
                  <Shield size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>Lanyard Badge Protocol</div>
                    <div style={{ fontSize: '0.76rem', color: '#475569' }}>Please keep this badge or physical lanyard visible at all times while moving across campus floors.</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
                  <AlertTriangle size={18} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>NDA & Photography Policy</div>
                    <div style={{ fontSize: '0.76rem', color: '#475569' }}>Photography, video recording, or accessing unauthorized server rooms and production bays is strictly prohibited.</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
                  <PhoneCall size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>Emergency Campus Contacts</div>
                    <div style={{ fontSize: '0.76rem', color: '#475569' }}>Main Gate Security: <strong>Ext 1099</strong> | Medical Room: <strong>Ext 1010</strong> | Reception: <strong>Ext 1000</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: 10,
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={handleDownloadBadge}
            className="btn btn-sm btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}
          >
            <Download size={13} /> Download Badge (PNG)
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleShareWhatsApp}
              className="btn btn-sm"
              style={{ background: '#25D366', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}
            >
              <MessageCircle size={13} /> WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-sm btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
