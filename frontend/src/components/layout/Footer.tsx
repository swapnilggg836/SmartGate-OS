'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Mail, Phone, MessageSquare, Shield, ExternalLink } from 'lucide-react';
import { ContactModal } from '@/components/ui/ContactModal';

export function AppFooter() {
  const [contactOpen, setContactOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <>
      <footer style={{
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Left: Brand + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image
            src="/trend-logo.jpg"
            alt="Trend Technologies"
            width={100}
            height={34}
            style={{ objectFit: 'contain', height: 30, width: 'auto' }}
          />
          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={13} color="#1d4ed8" />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              SmartGate OS © {year}
            </span>
          </div>
        </div>

        {/* Center: Contact info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a
            href="mailto:sunilpunekar@trendtechnologies.com.sg"
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.73rem' }}
          >
            <Mail size={12} color="#1d4ed8" />
            sunilpunekar@trendtechnologies.com.sg
          </a>
          <a
            href="tel:+918975337698"
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.73rem' }}
          >
            <Phone size={12} color="#1d4ed8" />
            +91 8975337698
          </a>
        </div>

        {/* Right: Contact Us button */}
        <button
          onClick={() => setContactOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            color: 'white', border: 'none', borderRadius: 8,
            padding: '7px 14px', fontWeight: 700, fontSize: '0.78rem',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(29,78,216,0.25)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
        >
          <MessageSquare size={13} />
          Contact Us
        </button>
      </footer>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
