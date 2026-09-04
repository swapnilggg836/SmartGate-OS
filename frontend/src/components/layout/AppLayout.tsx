'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar, Navbar, MobileNav } from '@/components/layout/Navigation';
import { PageLoader } from '@/components/ui/Spinner';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/requests': 'My Requests',
  '/gate-passes': 'My Gate Pass',
  '/approvals': 'Approvals',
  '/security': 'Gate Security',
  '/security/visitors': 'Visitor Console',
  '/visitors': 'Visitors',
  '/employees': 'Employee Directory',
  '/notifications': 'Notifications',
  '/profile': 'My Profile',
  '/admin': 'Admin Panel',
  '/admin/audit': 'Audit Logs',
  '/admin/users': 'User Management',
  '/admin/departments': 'Departments',
  '/admin/visitors': 'Visitor Management',
  '/authority': 'Authority Connections',
  '/authority/my-team': 'My Team',
  '/admin/company': 'Company Overview',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <PageLoader />;
  if (!user) return null;

  const title = PAGE_TITLES[pathname] || 'SmartGate OS';

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="page-content">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
