'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Lock, ArrowLeft, QrCode, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #e0ecff 0%, #eff6ff 50%, #f1f5f9 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14, boxShadow: '0 8px 24px rgba(29,78,216,0.35)'
          }}>
            <Shield size={26} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
            SmartGate OS
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
            Enterprise Access &amp; Digital Gate Pass System
          </p>
        </div>

        {/* Security Policy Advisory Card */}
        <div style={{
          background: 'white',
          borderRadius: 18,
          border: '1px solid #dde5f0',
          boxShadow: '0 8px 32px rgba(15,23,42,0.10)',
          overflow: 'hidden',
          marginBottom: 16
        }}>
          {/* Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            color: 'white',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Lock size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Public Self-Registration Disabled
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: 2 }}>
                Restricted to authorized enterprise provisioning
              </div>
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <UserCheck size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.55 }}>
                  Under company security policy, employee and staff accounts cannot be self-registered.
                  All accounts are created and provisioned directly by <strong>Human Resources (HR)</strong> or <strong>System Administrators</strong> in the internal User Management Console.
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
              • <strong>New Employee?</strong> Please contact your HR representative or reporting manager to have your work account issued.<br />
              • <strong>Existing Staff?</strong> Sign in using your registered company email address.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                href="/login"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                  color: 'white', textDecoration: 'none', padding: '12px 18px',
                  borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
                  boxShadow: '0 4px 14px rgba(29,78,216,0.30)',
                  transition: 'all 0.15s'
                }}
              >
                <ArrowLeft size={16} /> Return to Employee Sign In
              </Link>

              <Link
                href="/visitor-register"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'white', color: '#1d4ed8', border: '1.5px solid #bfdbfe',
                  textDecoration: 'none', padding: '11px 18px',
                  borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                  transition: 'all 0.15s'
                }}
              >
                <QrCode size={16} /> Are You a Visitor? Open Visitor Entry Pass
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            SmartGate OS · Enterprise Security &amp; Access Control
          </span>
        </div>
      </div>
    </div>
  );
}
