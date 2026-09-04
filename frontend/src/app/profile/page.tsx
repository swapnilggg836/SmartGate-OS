'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import {
  User, Lock, Mail, Phone, Building, Briefcase, Edit3,
  Save, CheckCircle2, AlertCircle, LogOut, KeyRound, RefreshCw, ShieldCheck
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Form states
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', designation: '', avatarUrl: '' });
  const [pwdTab, setPwdTab] = useState<'standard' | 'otp'>('standard');
  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '' });

  // OTP Self Reset state
  const [otpSent, setOtpSent] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpNewPwd, setOtpNewPwd] = useState('');
  const [otpConfirmPwd, setOtpConfirmPwd] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (user?.employee) {
      setForm({
        firstName: user.employee.firstName,
        lastName: user.employee.lastName,
        phone: user.employee.phone,
        designation: user.employee.designation,
        avatarUrl: user.employee.avatarUrl || ''
      });
    }
  }, [user]);

  if (!user) return <AppLayout><PageLoader /></AppLayout>;
  const emp = user.employee;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await api.put('/auth/profile', form);
      await refreshUser();
      setEditing(false);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally { setSavingProfile(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (pwd.newPwd !== pwd.confirm) { setPwdMsg({ type: 'error', text: 'Passwords do not match' }); return; }
    if (pwd.newPwd.length < 6) { setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters' }); return; }
    setSavingPwd(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwd.current, newPassword: pwd.newPwd });
      setPwd({ current: '', newPwd: '', confirm: '' });
      setPwdMsg({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => setPwdMsg(null), 5000);
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally { setSavingPwd(false); }
  };

  const handleRequestProfileOtp = async () => {
    setPwdMsg(null);
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/profile/request-reset-otp');
      const otpCode = res.data?.data?.otp || '';
      setReceivedOtp(otpCode);
      setOtpSent(true);
      setPwdMsg({ type: 'success', text: `Verification OTP generated for ${user.email}. Valid for 10 minutes.` });
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.response?.data?.message || 'Failed to generate OTP' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyProfileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!otpInput.trim()) { setPwdMsg({ type: 'error', text: 'Please enter the 6-digit OTP code' }); return; }
    if (otpNewPwd.length < 6) { setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters' }); return; }
    if (otpNewPwd !== otpConfirmPwd) { setPwdMsg({ type: 'error', text: 'Passwords do not match' }); return; }

    setOtpLoading(true);
    try {
      await api.post('/auth/profile/verify-reset-otp', {
        otp: otpInput.trim(),
        newPassword: otpNewPwd
      });
      setPwdMsg({ type: 'success', text: '✅ Password reset successfully via OTP verification!' });
      setOtpInput('');
      setOtpNewPwd('');
      setOtpConfirmPwd('');
      setOtpSent(false);
      setReceivedOtp('');
      setTimeout(() => setPwdMsg(null), 5000);
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.response?.data?.message || 'Failed to verify OTP or reset password.' });
    } finally {
      setOtpLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin', HR: 'HR Director', MANAGER: 'Manager / Team Lead',
    EMPLOYEE: 'Employee', SECURITY_GUARD: 'Security Guard'
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 640, margin: '0 auto' }} className="space-y-4">
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><User size={15} /> My Profile</h2>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(!editing)}>
              <Edit3 size={13} /> {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          <div className="card-body">
            {/* Avatar + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--slate-100)' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--blue-700)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', fontWeight: 700, overflow: 'hidden', border: '3px solid var(--blue-100)', flexShrink: 0
              }}>
                {emp?.avatarUrl ? <img src={emp.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as any).style.display = 'none'; }} /> : `${emp?.firstName?.[0] || ''}${emp?.lastName?.[0] || ''}`}
              </div>
              <div>
                <h2 style={{ marginBottom: 2 }}>{emp ? `${emp.firstName} ${emp.lastName}` : user.email}</h2>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginBottom: 4 }}>{emp?.designation} · {emp?.departmentName}</p>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--blue-50)', color: 'var(--blue-700)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--blue-200)' }}>
                  {roleLabels[user.role]}
                </span>
              </div>
            </div>

            {profileMsg && (
              <div className={`alert ${profileMsg.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            {editing ? (
              <form onSubmit={saveProfile} className="space-y-3">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">First Name <span className="required">*</span></label>
                    <input className="form-control" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">Last Name <span className="required">*</span></label>
                    <input className="form-control" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Phone <span className="required">*</span></label>
                    <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">Designation <span className="required">*</span></label>
                    <input className="form-control" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Avatar Photo URL (optional)</label>
                  <input type="url" className="form-control" placeholder="https://..." value={form.avatarUrl} onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))} /></div>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? <Spinner white size="sm" /> : <Save size={14} />} Save Changes
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                {[
                  [<Mail size={15} />, 'Email', user.email],
                  [<Phone size={15} />, 'Phone', emp?.phone],
                  [<Building size={15} />, 'Department', emp?.departmentName],
                  [<Briefcase size={15} />, 'Designation', emp?.designation],
                  [<User size={15} />, 'Employee Code', emp?.employeeCode],
                ].map(([icon, label, value]) => (
                  <div key={label as string} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <span style={{ color: 'var(--blue-500)', flexShrink: 0 }}>{icon}</span>
                    <span style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', width: 120, flexShrink: 0 }}>{label as string}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--slate-800)', fontFamily: label === 'Email' || label === 'Employee Code' ? 'monospace' : undefined }}>{value as string || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security & Password Settings */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 className="card-title"><Lock size={15} /> Password & Security</h3>
            <div style={{ display: 'flex', gap: 4, background: 'var(--slate-100)', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${pwdTab === 'standard' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => { setPwdTab('standard'); setPwdMsg(null); }}
              >
                Change with Current Pwd
              </button>
              <button
                type="button"
                className={`btn btn-sm ${pwdTab === 'otp' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => { setPwdTab('otp'); setPwdMsg(null); }}
              >
                🔑 Reset with OTP
              </button>
            </div>
          </div>

          <div className="card-body">
            {pwdMsg && (
              <div className={`alert ${pwdMsg.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
                {pwdMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{pwdMsg.text}</span>
              </div>
            )}

            {pwdTab === 'standard' ? (
              <form onSubmit={changePassword} className="space-y-3">
                <div className="form-group">
                  <label className="form-label">Current Password <span className="required">*</span></label>
                  <input
                    type="password"
                    className="form-control"
                    value={pwd.current}
                    onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
                    required
                    placeholder="Your current password"
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">New Password <span className="required">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      value={pwd.newPwd}
                      onChange={e => setPwd(p => ({ ...p, newPwd: e.target.value }))}
                      required
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password <span className="required">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      value={pwd.confirm}
                      onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                      required
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-outline" disabled={savingPwd}>
                  {savingPwd ? <Spinner size="sm" /> : <Lock size={14} />} Update Password
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {!otpSent ? (
                  <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: 'var(--blue-50)',
                      color: 'var(--blue-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 10
                    }}>
                      <KeyRound size={24} />
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: 4 }}>
                      Forgot Your Current Password?
                    </h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', maxWidth: 440, margin: '0 auto 16px' }}>
                      We can generate a 6-digit one-time password (OTP) verification code for your email address (<strong>{user.email}</strong>) to safely reset your password.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleRequestProfileOtp}
                      disabled={otpLoading}
                    >
                      {otpLoading ? <><Spinner white size="sm" /> Sending OTP...</> : <><KeyRound size={14} /> Send OTP Code to {user.email}</>}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyProfileOtp} className="space-y-3">
                    {/* OTP Banner */}
                    {receivedOtp && (
                      <div style={{
                        background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
                        borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 12
                      }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--blue-700)', fontWeight: 700, textTransform: 'uppercase' }}>
                            🔑 Your Generated Reset Code
                          </div>
                          <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--blue-900)', letterSpacing: '0.15em' }}>
                            {receivedOtp}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                          onClick={() => setOtpInput(receivedOtp)}
                        >
                          Auto-Fill
                        </button>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Enter 6-Digit OTP Code <span className="required">*</span></label>
                      <input
                        type="text"
                        maxLength={6}
                        className="form-control font-mono"
                        placeholder="e.g. 123456"
                        value={otpInput}
                        onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        required
                        style={{ fontSize: '1.1rem', letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700 }}
                        autoFocus
                      />
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">New Password <span className="required">*</span></label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Min 6 characters"
                          value={otpNewPwd}
                          onChange={e => setOtpNewPwd(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm Password <span className="required">*</span></label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Repeat new password"
                          value={otpConfirmPwd}
                          onChange={e => setOtpConfirmPwd(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleRequestProfileOtp}
                        disabled={otpLoading}
                        style={{ fontSize: '0.75rem', color: 'var(--blue-700)' }}
                      >
                        <RefreshCw size={12} /> Resend Code
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={otpLoading}>
                        {otpLoading ? <><Spinner white size="sm" /> Resetting...</> : <><ShieldCheck size={14} /> Verify & Update Password</>}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sign Out */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <button onClick={logout} className="btn btn-danger-outline">
            <LogOut size={14} /> Sign Out of Account
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

