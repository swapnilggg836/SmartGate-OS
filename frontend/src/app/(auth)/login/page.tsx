'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--blue-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--blue-700)', color: 'white',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14, boxShadow: '0 4px 14px rgba(29,78,216,0.3)'
          }}>
            <Shield size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: 4 }}>
            SmartGate OS
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>
            Employee Leave & Gate Pass System
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '1rem' }}>Sign In to Your Account</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="alert alert-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Work Email Address <span className="required">*</span>
                </label>
                <div className="form-input-icon">
                  <Mail size={15} />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password <span className="required">*</span>
                </label>
                <div className="form-input-icon">
                  <Lock size={15} />
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ padding: '11px 16px', fontSize: '0.9rem', marginTop: 4 }}
                disabled={loading}
              >
                {loading ? <><Spinner white size="sm" /> Signing in…</> : <>Sign In <ArrowRight size={15} /></>}
              </button>
            </form>
          </div>
          <div className="card-footer" style={{ textAlign: 'center' }}>
            <span style={{ color: 'var(--slate-500)', fontSize: '0.8125rem' }}>
              Don't have an account?{' '}
              <Link href="/register" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>
                Create Account
              </Link>
            </span>
          </div>
        </div>

        {/* Demo Hint */}
        <div style={{
          marginTop: 16, padding: '12px 16px',
          background: 'white', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--blue-100)',
          fontSize: '0.75rem', color: 'var(--slate-500)'
        }}>
          <strong style={{ color: 'var(--blue-700)' }}>Demo accounts:</strong>{' '}
          Use <code style={{ background: 'var(--blue-50)', padding: '1px 5px', borderRadius: 4, color: 'var(--blue-800)' }}>Password123!</code> for all seeded accounts
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              ['employee@enterprise.com', 'Employee'],
              ['manager@enterprise.com', 'Manager'],
              ['hr@enterprise.com', 'HR'],
              ['gm@enterprise.com', 'General Manager'],
              ['security@enterprise.com', 'Security'],
              ['admin@enterprise.com', 'Super Admin'],
            ].map(([em, role]) => (
              <button
                key={em}
                type="button"
                onClick={() => { setEmail(em); setPassword('Password123!'); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', color: 'var(--blue-700)', fontSize: '0.75rem',
                  padding: '2px 0', fontWeight: 500
                }}
              >
                → {em} <span style={{ color: 'var(--slate-400)', fontWeight: 400 }}>({role})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
