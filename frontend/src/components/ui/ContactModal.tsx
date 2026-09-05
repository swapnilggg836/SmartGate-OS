'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { X, Send, Phone, Mail, User, MessageSquare, CheckCircle2, AlertCircle, FileText, MapPin } from 'lucide-react';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/contacts', form);
      if (res.data?.success) {
        setSuccess(true);
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setError(res.data?.message || 'Failed to send. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError('');
    onClose();
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        background: 'white', borderRadius: 20, width: '100%', maxWidth: 580,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          borderRadius: '20px 20px 0 0', padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Contact Us</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>We'll get back to you within 24 hours</div>
            </div>
          </div>
          <button onClick={handleClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: 'white', cursor: 'pointer', borderRadius: 10,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Contact Details Card */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe', borderRadius: 14, padding: '16px 20px',
            marginBottom: 20,
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              📋 Contact Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={14} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Contact Person</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Sunil Punekar</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={14} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Email</div>
                  <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                    <a href="mailto:sunilpunekar@trendtechnologies.com.sg" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
                      sunilpunekar@trendtechnologies.com.sg
                    </a>
                    <span style={{ color: '#94a3b8', margin: '0 6px' }}>·</span>
                    <a href="mailto:punekarsunil1995@gmail.com" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
                      punekarsunil1995@gmail.com
                    </a>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={14} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Phone</div>
                  <a href="tel:+918975337698" style={{ fontSize: '0.9rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 700 }}>
                    +91 8975337698
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Success State */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#dcfce7', color: '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
                Message Sent!
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
                Your message has been submitted successfully. Sunil Punekar will get back to you soon.
              </p>
              <button onClick={handleClose} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  color: '#dc2626', fontSize: '0.875rem',
                }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Your Name <span className="required">*</span></label>
                  <div className="form-input-icon">
                    <User size={14} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Full name"
                      value={form.name}
                      onChange={set('name')}
                      required
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <div className="form-input-icon">
                    <Phone size={14} />
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 XXXXXXXXXX"
                      value={form.phone}
                      onChange={set('phone')}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address <span className="required">*</span></label>
                <div className="form-input-icon">
                  <Mail size={14} />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={set('email')}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subject <span className="required">*</span></label>
                <div className="form-input-icon">
                  <FileText size={14} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="What is this about?"
                    value={form.subject}
                    onChange={set('subject')}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Message <span className="required">*</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Write your message here..."
                  value={form.message}
                  onChange={set('message')}
                  required
                  style={{ resize: 'vertical', minHeight: 100 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={handleClose} className="btn btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                    color: 'white', border: 'none', borderRadius: 10,
                    padding: '10px 22px', fontWeight: 700, fontSize: '0.9rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    opacity: submitting ? 0.7 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  {submitting ? (
                    <><div className="spinner sm white" />Sending…</>
                  ) : (
                    <><Send size={15} />Send Message</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
