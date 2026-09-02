import React from 'react';
import Link from 'next/link';
import { HelpCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '24px'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '36px',
        maxWidth: '460px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#eff6ff', color: '#2563eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px auto'
        }}>
          <HelpCircle size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          404 — Page Not Found
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
          The page you requested could not be found or has been moved.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', background: '#2563eb', color: '#ffffff',
            borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none'
          }}
        >
          <Home size={15} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
