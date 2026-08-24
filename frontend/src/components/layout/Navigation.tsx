'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { initials } from '@/lib/utils';
import {
  LayoutDashboard, FileText, LogOut, User, Bell, Shield, Users, Calendar,
  ClipboardList, Settings, Menu, X, QrCode, UserCheck, BookOpen
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  roles: string[];
}

function useNavItems(role: string, pendingCount: number, unread: number): NavItem[] {
  const items: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} />, roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'SECURITY_GUARD'] },
    // Requests & Passes (Any staff with employee record can apply)
    { label: 'My Requests', href: '/requests', icon: <FileText size={16} />, roles: ['EMPLOYEE', 'MANAGER', 'HR'] },
    { label: 'My Gate Pass', href: '/gate-passes', icon: <QrCode size={16} />, roles: ['EMPLOYEE', 'MANAGER', 'HR'] },
    // Approvals (Manager, HR, Super Admin)
    { label: 'Approvals', href: '/approvals', icon: <ClipboardList size={16} />, badge: pendingCount || undefined, roles: ['MANAGER', 'HR', 'SUPER_ADMIN'] },
    // Security Guard & Super Admin
    { label: 'Gate Security', href: '/security', icon: <Shield size={16} />, roles: ['SECURITY_GUARD', 'SUPER_ADMIN'] },
    // Attendance (Everyone views attendance relevant to their role)
    { label: 'Attendance', href: '/attendance', icon: <Calendar size={16} />, roles: ['EMPLOYEE', 'MANAGER', 'HR', 'SUPER_ADMIN'] },
    // Directory (HR, Admin, Manager)
    { label: 'Employees', href: '/employees', icon: <Users size={16} />, roles: ['HR', 'SUPER_ADMIN', 'MANAGER'] },
    // System Config (HR & Admin)
    { label: 'Leave Types', href: '/admin/leave-types', icon: <BookOpen size={16} />, roles: ['HR', 'SUPER_ADMIN'] },
    // Admin only
    { label: 'Departments', href: '/admin/departments', icon: <Settings size={16} />, roles: ['SUPER_ADMIN'] },
    { label: 'Users', href: '/admin/users', icon: <UserCheck size={16} />, roles: ['SUPER_ADMIN'] },
    { label: 'Audit Logs', href: '/admin/audit', icon: <ClipboardList size={16} />, roles: ['SUPER_ADMIN'] },
    // Common
    { label: 'Notifications', href: '/notifications', icon: <Bell size={16} />, badge: unread || undefined, roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'SECURITY_GUARD'] },
    { label: 'Profile', href: '/profile', icon: <User size={16} />, roles: ['SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'SECURITY_GUARD'] },
  ];
  return items.filter(item => item.roles.includes(role));
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const navItems = useNavItems(user?.role || 'EMPLOYEE', pendingCount, unreadCount);

  if (!user) return null;

  const emp = user.employee;
  const displayName = emp ? `${emp.firstName} ${emp.lastName}` : user.email;
  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    HR: 'HR Director',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
    SECURITY_GUARD: 'Security Guard'
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49
          }}
          className="mobile-sidebar-backdrop"
        />
      )}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Shield size={18} />
          </div>
          <div className="sidebar-logo-text">
            SmartGate OS
            <span>Leave & Gate Pass System</span>
          </div>
          <button
            onClick={onClose}
            className="mobile-hamburger"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Navigation</span>
          {navItems.filter(i => !['Profile', 'Notifications'].includes(i.label)).map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`sidebar-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
              {item.badge && item.badge > 0 ? (
                <span className="sidebar-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              ) : null}
            </Link>
          ))}

          <span className="sidebar-section-label" style={{ marginTop: 8 }}>Account</span>
          {navItems.filter(i => ['Profile', 'Notifications'].includes(i.label)).map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
              {item.badge && item.badge > 0 ? (
                <span className="sidebar-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {emp?.avatarUrl ? (
                <img src={emp.avatarUrl} alt="" />
              ) : (
                initials(emp?.firstName, emp?.lastName)
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role">{roleLabels[user.role] || user.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="sidebar-link"
            style={{ color: 'rgba(255,100,100,0.85)', marginTop: 4 }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export function Navbar({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const emp = user?.employee;

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onMenuClick}
          className="navbar-icon-btn mobile-hamburger"
          style={{ display: 'none' }}
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>
        <h1 className="navbar-title">{title}</h1>
      </div>

      <div className="navbar-right">
        <Link href="/notifications" className="navbar-icon-btn">
          <Bell size={16} />
          {unreadCount > 0 && <span className="notification-dot" />}
        </Link>

        <Link href="/profile" className="navbar-user-chip">
          <div className="navbar-user-chip-avatar">
            {emp?.avatarUrl ? (
              <img src={emp.avatarUrl} alt="" />
            ) : (
              initials(emp?.firstName, emp?.lastName)
            )}
          </div>
          <span className="navbar-user-chip-name">
            {emp ? `${emp.firstName} ${emp.lastName}` : user?.email}
          </span>
        </Link>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();

  const role = user?.role || 'EMPLOYEE';

  const getItems = () => {
    if (role === 'SECURITY_GUARD') return [
      { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
      { href: '/security', icon: <Shield size={20} />, label: 'Gate Log' },
      { href: '/notifications', icon: <Bell size={20} />, label: 'Alerts', badge: unreadCount },
      { href: '/profile', icon: <User size={20} />, label: 'Profile' },
    ];
    if (role === 'MANAGER' || role === 'HR') return [
      { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
      { href: '/approvals', icon: <ClipboardList size={20} />, label: 'Approvals' },
      { href: '/notifications', icon: <Bell size={20} />, label: 'Alerts', badge: unreadCount },
      { href: '/profile', icon: <User size={20} />, label: 'Profile' },
    ];
    if (role === 'SUPER_ADMIN') return [
      { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
      { href: '/employees', icon: <Users size={20} />, label: 'Employees' },
      { href: '/notifications', icon: <Bell size={20} />, label: 'Alerts', badge: unreadCount },
      { href: '/profile', icon: <User size={20} />, label: 'Profile' },
    ];
    // Employee
    return [
      { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
      { href: '/requests', icon: <FileText size={20} />, label: 'Requests' },
      { href: '/gate-passes', icon: <QrCode size={20} />, label: 'Pass' },
      { href: '/notifications', icon: <Bell size={20} />, label: 'Alerts', badge: unreadCount },
      { href: '/profile', icon: <User size={20} />, label: 'Profile' },
    ];
  };

  const items = getItems();

  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-bottom-nav-inner">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <div style={{ position: 'relative' }}>
              {item.icon}
              {item.badge && item.badge > 0 ? (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'var(--red-500)', color: 'white',
                  fontSize: '0.55rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </div>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
