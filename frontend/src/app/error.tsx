'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          background: '#fef2f2', color: '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px auto'
        }}>
          <AlertTriangle size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', background: '#2563eb', color: '#ffffff',
              borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} /> Try Again
          </button>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', background: '#f1f5f9', color: '#334155',
              borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none'
            }}
          >
            <Home size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
