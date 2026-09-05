'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Shield, Mail, Lock, AlertCircle, ArrowRight, QrCode, KeyRound, CheckCircle2, RefreshCw, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { ContactModal } from '@/components/ui/ContactModal';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Forgot password / OTP Modal state
  const [contactOpen, setContactOpen] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [receivedOtp, setReceivedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

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

  const openForgotModal = () => {
    setForgotEmail(email || '');
    setForgotOtp('');
    setReceivedOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
    setForgotStep(1);
    setForgotOpen(true);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/request-otp', { email: forgotEmail });
      const otpCode = res.data?.data?.otp || '';
      setReceivedOtp(otpCode);
      setForgotSuccess(res.data?.message || 'Verification OTP code generated.');
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Failed to request OTP code. Please check email address.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotOtp.trim()) {
      setForgotError('Please enter the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password/verify-otp', {
        email: forgotEmail,
        otp: forgotOtp.trim(),
        newPassword
      });
      setForgotStep(3);
      setForgotSuccess('Your password has been reset successfully!');
      setEmail(forgotEmail);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #e0ecff 0%, #eff6ff 50%, #f1f5f9 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Fixed Top Bar ─────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 64,
      }}>
        {/* Trend Technologies Logo */}
        <Image
          src="/trend-logo.jpg"
          alt="Trend Technologies"
          width={160}
          height={52}
          style={{ objectFit: 'contain', maxHeight: 46, width: 'auto' }}
          priority
        />
        {/* Contact Us Button */}
        <button
          onClick={() => setContactOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            color: 'white', border: 'none', borderRadius: 10,
            padding: '9px 20px', fontWeight: 700, fontSize: '0.875rem',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,78,216,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(29,78,216,0.45)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(29,78,216,0.35)';
          }}
        >
          <MessageSquare size={15} />
          Contact Us
        </button>
      </div>

      {/* ── Scrollable body — centered content ────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80, /* top-bar 64px + 16px gap */
        paddingBottom: 32,
        paddingLeft: 16,
        paddingRight: 16,
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
              color: 'white',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14, boxShadow: '0 8px 24px rgba(29,78,216,0.35)',
            }}>
              <Shield size={28} />
            </div>
            <h1 style={{
              fontSize: '1.6rem', fontWeight: 800,
              color: '#1e293b', marginBottom: 4, letterSpacing: '-0.02em',
            }}>
              SmartGate OS
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
              Campus Access &amp; Visitor Management System
            </p>
          </div>

          {/* Visitor Fast-Track Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
            borderRadius: 14, padding: '15px 18px', marginBottom: 16,
            color: 'white', boxShadow: '0 6px 20px rgba(37,99,235,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 11,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <QrCode size={21} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>Are you a Visitor?</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.88, marginTop: 2 }}>No account or login needed</div>
              </div>
            </div>
            <Link
              href="/visitor-register"
              style={{
                background: 'white', color: '#1d4ed8',
                padding: '8px 14px', borderRadius: 9,
                fontSize: '0.78rem', fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(0,0,0,0.14)',
                transition: 'transform 0.15s',
              }}
            >
              Visitor Entry <ArrowRight size={13} />
            </Link>
          </div>

          {/* ── Login Card ─────────────────────────────────────── */}
          <div style={{
            background: 'white',
            borderRadius: 18,
            border: '1px solid #dde5f0',
            boxShadow: '0 8px 32px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.06)',
            overflow: 'hidden',
          }}>
            {/* Card Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: '#fafcff',
            }}>
              <h2 style={{
                fontSize: '1rem', fontWeight: 700, color: '#1e293b',
                display: 'flex', alignItems: 'center', gap: 8, margin: 0,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield size={14} color="white" />
                </div>
                Employee / Staff Sign In
              </h2>
            </div>

            {/* Card Body */}
            <div style={{ padding: '24px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {error && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: '#dc2626', fontSize: '0.8125rem',
                  }}>
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                    Work Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8', flexShrink: 0 }} />
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      style={{
                        width: '100%', paddingLeft: 38, paddingRight: 12,
                        paddingTop: 10, paddingBottom: 10,
                        border: '1.5px solid #e2e8f0', borderRadius: 10,
                        fontSize: '0.875rem', color: '#1e293b',
                        outline: 'none', background: '#f8fafc',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#1d4ed8'; e.currentTarget.style.background = 'white'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                      Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={openForgotModal}
                      style={{
                        background: 'none', border: 'none',
                        color: '#1d4ed8', fontSize: '0.78rem', fontWeight: 600,
                        cursor: 'pointer', padding: 0,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.textDecoration = 'none'; }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8', flexShrink: 0 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{
                        width: '100%', paddingLeft: 38, paddingRight: 44,
                        paddingTop: 10, paddingBottom: 10,
                        border: '1.5px solid #e2e8f0', borderRadius: 10,
                        fontSize: '0.875rem', color: '#1e293b',
                        outline: 'none', background: '#f8fafc',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#1d4ed8'; e.currentTarget.style.background = 'white'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 10,
                        top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none',
                        cursor: 'pointer', color: '#94a3b8', padding: 4,
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: loading
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                    color: 'white', border: 'none', borderRadius: 10,
                    fontSize: '0.9375rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading ? 'none' : '0 4px 14px rgba(29,78,216,0.35)',
                    transition: 'all 0.15s',
                    marginTop: 2,
                  }}
                >
                  {loading ? <><Spinner white size="sm" /> Signing in…</> : <>Sign In <ArrowRight size={16} /></>}
                </button>
              </form>
            </div>

            {/* Card Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafcff',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                Don&apos;t have an employee account?{' '}
                <Link href="/register" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}>
                  Create Account
                </Link>
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                Visiting campus today?{' '}
                <Link href="/visitor-register" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                  Fill Visitor Form (No Login Required) →
                </Link>
              </span>
            </div>
          </div>

          {/* Powered by */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Powered by{' '}
              <span style={{ fontWeight: 700, color: '#1e3a8a' }}>Trend Technologies</span>
              {' '}· © {new Date().getFullYear()} SmartGate OS
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FORGOT PASSWORD & OTP RESET MODAL                            */}
      {/* ============================================================ */}
      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="🔐 Reset Password via OTP"
      >
        <div>
          {forgotStep === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                Enter your registered work email address. We will generate a secure 6-digit OTP verification code to reset your password.
              </p>

              {forgotError && (
                <div className="alert alert-error">
                  <AlertCircle size={15} />
                  <span>{forgotError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Work Email Address <span className="required">*</span></label>
                <div className="form-input-icon">
                  <Mail size={15} />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setForgotOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={forgotLoading}>
                  {forgotLoading ? <><Spinner white size="sm" /> Sending OTP...</> : <><KeyRound size={14} /> Send OTP Code</>}
                </button>
              </div>
            </form>
          )}

          {forgotStep === 2 && (
            <form onSubmit={handleVerifyOtpAndReset} className="space-y-3">
              {/* OTP Banner Code Demonstration */}
              {receivedOtp && (
                <div style={{
                  background: 'var(--blue-50)',
                  border: '1px solid var(--blue-200)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--blue-700)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🔑 Your Verification OTP Code
                    </div>
                    <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--blue-900)', letterSpacing: '0.15em', marginTop: 2 }}>
                      {receivedOtp}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                    onClick={() => setForgotOtp(receivedOtp)}
                  >
                    Auto-Fill Code
                  </button>
                </div>
              )}

              <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                OTP sent to <strong>{forgotEmail}</strong>. Code expires in 10 minutes.
              </p>

              {forgotError && (
                <div className="alert alert-error">
                  <AlertCircle size={15} />
                  <span>{forgotError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Enter 6-Digit OTP Code <span className="required">*</span></label>
                <input
                  type="text"
                  maxLength={6}
                  className="form-control font-mono"
                  placeholder="e.g. 123456"
                  value={forgotOtp}
                  onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{ fontSize: '1.1rem', letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700 }}
                  autoFocus
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">New Password <span className="required">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      style={{ paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--slate-400)',
                        padding: 4
                      }}
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password <span className="required">*</span></label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleRequestOtp}
                  disabled={forgotLoading}
                  style={{ fontSize: '0.78rem', color: 'var(--blue-700)', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={12} /> Resend OTP Code
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setForgotStep(1)}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={forgotLoading}>
                    {forgotLoading ? <><Spinner white size="sm" /> Resetting...</> : <><KeyRound size={14} /> Reset Password</>}
                  </button>
                </div>
              </div>
            </form>
          )}

          {forgotStep === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: 'var(--green-50)',
                color: 'var(--green-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: 6 }}>
                Password Reset Successful!
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: 20, lineHeight: 1.5 }}>
                Your account password has been updated in the database. You can now log in with your new password.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={() => setForgotOpen(false)}
                style={{ padding: '10px 18px', fontWeight: 700 }}
              >
                Continue to Sign In <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Contact Modal */}
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
