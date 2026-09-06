'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import {
  User, Lock, Mail, Phone, Building, Briefcase, Edit3,
  Save, CheckCircle2, AlertCircle, LogOut, KeyRound, RefreshCw, ShieldCheck,
  Camera, Upload, RotateCcw, X, Sparkles, Check
} from 'lucide-react';

const resizeAndCropImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const targetSize = 400;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        // Center crop calculation for square avatar
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

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

  // Camera & File Upload states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        firstName: user.employee.firstName || '',
        lastName: user.employee.lastName || '',
        phone: user.employee.phone || '',
        designation: user.employee.designation || '',
        avatarUrl: user.employee.avatarUrl || '/default-avatar.png'
      });
    }
  }, [user]);

  // Clean up camera stream on unmount or mode change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or connection.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 150);
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(err?.message || 'Unable to access camera. Please allow camera permissions or upload an image file.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const targetSize = 400;
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const vWidth = video.videoWidth || 480;
      const vHeight = video.videoHeight || 480;
      const minDim = Math.min(vWidth, vHeight);
      const startX = (vWidth - minDim) / 2;
      const startY = (vHeight - minDim) / 2;
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setForm(f => ({ ...f, avatarUrl: dataUrl }));
      setProfileMsg({ type: 'success', text: 'Camera photo snapped! Click "Save Changes" to apply.' });
      setTimeout(() => setProfileMsg(null), 3500);
    }
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await resizeAndCropImage(file);
      setForm(f => ({ ...f, avatarUrl: compressed }));
      setProfileMsg({ type: 'success', text: 'Photo loaded! Click "Save Changes" to apply.' });
      setTimeout(() => setProfileMsg(null), 3500);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.message || 'Failed to process image.' });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleResetDefault = () => {
    stopCamera();
    setForm(f => ({ ...f, avatarUrl: '/default-avatar.png' }));
    setProfileMsg({ type: 'success', text: 'Reset to default avatar! Click "Save Changes" to apply.' });
    setTimeout(() => setProfileMsg(null), 3500);
  };

  const handleCancelEdit = () => {
    stopCamera();
    if (user?.employee) {
      setForm({
        firstName: user.employee.firstName || '',
        lastName: user.employee.lastName || '',
        phone: user.employee.phone || '',
        designation: user.employee.designation || '',
        avatarUrl: user.employee.avatarUrl || '/default-avatar.png'
      });
    }
    setEditing(false);
    setProfileMsg(null);
  };

  if (!user) return <AppLayout><PageLoader /></AppLayout>;
  const emp = user.employee;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    stopCamera();
    try {
      await api.put('/auth/profile', {
        ...form,
        avatarUrl: form.avatarUrl || '/default-avatar.png'
      });
      await refreshUser();
      setEditing(false);
      setProfileMsg({ type: 'success', text: 'Profile and avatar updated successfully!' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
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
            <h2 className="card-title">
              <User size={15} /> {editing ? 'Edit Personal Profile' : 'My Profile'}
            </h2>
            <button
              type="button"
              className={`btn btn-sm ${editing ? 'btn-ghost' : 'btn-outline'}`}
              onClick={() => {
                if (editing) {
                  handleCancelEdit();
                } else {
                  setEditing(true);
                }
              }}
            >
              {editing ? <><X size={13} /> Cancel</> : <><Edit3 size={13} /> Edit Profile</>}
            </button>
          </div>
          <div className="card-body">
            {profileMsg && (
              <div className={`alert ${profileMsg.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            {editing ? (
              <form onSubmit={saveProfile} className="space-y-4">
                {/* Avatar / Photo Management Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 12,
                  padding: '16px',
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Camera size={15} color="var(--blue-600)" /> Profile Avatar & Photo
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                    {/* Circular Live Preview */}
                    <div
                      style={{
                        width: 84, height: 84, borderRadius: '50%', background: '#e2e8f0',
                        overflow: 'hidden', border: '3px solid var(--blue-600)',
                        boxShadow: '0 4px 14px rgba(37,99,235,0.2)', flexShrink: 0, position: 'relative'
                      }}
                    >
                      <img
                        src={form.avatarUrl || '/default-avatar.png'}
                        alt="Avatar Preview"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => fileInputRef.current?.click()}
                          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        >
                          <Upload size={14} /> Upload Photo
                        </button>

                        {!isCameraActive ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={startCamera}
                            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                          >
                            <Camera size={14} /> Take Photo
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={stopCamera}
                            style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--red-600)' }}
                          >
                            <X size={14} /> Close Camera
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleResetDefault}
                          style={{ fontSize: '0.8rem', padding: '6px 10px', color: 'var(--slate-600)' }}
                          title="Reset to default gray avatar silhouette"
                        >
                          <RotateCcw size={13} /> Default
                        </button>
                      </div>

                      <p style={{ fontSize: '0.72rem', color: 'var(--slate-500)', margin: 0 }}>
                        JPG, PNG, or WEBP. Automatically centered, resized, and saved to your account.
                      </p>
                    </div>
                  </div>

                  {/* Live Camera Viewfinder if active */}
                  {isCameraActive && (
                    <div style={{ marginTop: 14, padding: 14, background: 'white', borderRadius: 10, border: '1px solid var(--blue-200)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: 8 }}>
                        📷 Live Camera Viewfinder
                      </div>
                      <div style={{ width: 200, height: 200, margin: '0 auto 12px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--blue-600)', background: '#000' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={captureCameraPhoto}
                          style={{ fontSize: '0.82rem', padding: '6px 16px' }}
                        >
                          <Camera size={14} /> Capture Snapshot
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={stopCamera}
                          style={{ fontSize: '0.82rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="alert alert-error" style={{ marginTop: 10, padding: '8px 12px', fontSize: '0.78rem' }}>
                      <AlertCircle size={14} />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {/* Optional Image URL accordion */}
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--slate-200)' }}>
                    <details style={{ fontSize: '0.75rem', color: 'var(--slate-600)' }}>
                      <summary style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--blue-700)', fontWeight: 600 }}>
                        Or paste an Image URL
                      </summary>
                      <div style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://example.com/avatar.jpg"
                          value={form.avatarUrl?.startsWith('data:') ? '' : form.avatarUrl}
                          onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                    </details>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">First Name <span className="required">*</span></label>
                    <input
                      className="form-control"
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="required">*</span></label>
                    <input
                      className="form-control"
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Phone <span className="required">*</span></label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation <span className="required">*</span></label>
                    <input
                      className="form-control"
                      value={form.designation}
                      onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Locked Administrative Details */}
                <div style={{ background: 'var(--slate-50)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--slate-200)', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 6, color: 'var(--slate-700)' }}>
                    <Lock size={12} /> Account & Organization Details (Admin Managed)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>Employee ID:</strong> {emp?.employeeCode || '—'}</div>
                    <div><strong>Department:</strong> {emp?.departmentName || '—'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                    {savingProfile ? <Spinner white size="sm" /> : <Save size={14} />} Save Changes
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleCancelEdit} disabled={savingProfile}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {/* Avatar + Name Banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--slate-100)' }}>
                  <div style={{
                    width: 76, height: 76, borderRadius: '50%', background: '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', border: '3px solid var(--blue-100)', flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
                  }}>
                    <img
                      src={emp?.avatarUrl || '/default-avatar.png'}
                      alt={`${emp?.firstName || ''} ${emp?.lastName || ''}`}
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ marginBottom: 3, fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      {emp ? `${emp.firstName} ${emp.lastName}` : user.email}
                    </h2>
                    <p style={{ color: 'var(--slate-500)', fontSize: '0.85rem', marginBottom: 6 }}>
                      {emp?.designation || 'Staff Member'} {emp?.departmentName ? `· ${emp.departmentName}` : ''}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--blue-50)', color: 'var(--blue-700)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--blue-200)', fontWeight: 600 }}>
                        {roleLabels[user.role] || user.role}
                      </span>
                      {emp?.employeeCode && (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--slate-100)', color: 'var(--slate-700)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                          ID: {emp.employeeCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details List */}
                <div className="space-y-3">
                  {[
                    [<Mail size={15} />, 'Email Address', user.email],
                    [<Phone size={15} />, 'Phone Number', emp?.phone],
                    [<Building size={15} />, 'Department', emp?.departmentName],
                    [<Briefcase size={15} />, 'Designation', emp?.designation],
                    [<User size={15} />, 'Employee Code', emp?.employeeCode],
                  ].map(([icon, label, value]) => (
                    <div key={label as string} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--slate-100)' }}>
                      <span style={{ color: 'var(--blue-500)', flexShrink: 0 }}>{icon}</span>
                      <span style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', width: 130, flexShrink: 0 }}>{label as string}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--slate-800)', fontFamily: label === 'Email Address' || label === 'Employee Code' ? 'monospace' : undefined }}>{value as string || '—'}</span>
                    </div>
                  ))}
                </div>
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

