'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import {
  FileSpreadsheet, Download, Calendar, Filter, RefreshCw,
  Clock, Shield, UserPlus, Users, CheckCircle2, AlertCircle,
  TrendingUp, Building, Search, ArrowRight, Eye, AlertTriangle
} from 'lucide-react';
import { fmtDate, fmtTime, statusBadgeClass, statusLabel } from '@/lib/utils';

type ReportType = 'visitors' | 'gate-logs' | 'exit' | 'departments' | 'audit';
type IntervalType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('visitors');
  const [interval, setInterval] = useState<IntervalType>('monthly');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Date ranges
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Set default dates according to interval
  const applyIntervalDates = (selectedInterval: IntervalType) => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = '';

    if (selectedInterval === 'daily') {
      start = end; // Today
    } else if (selectedInterval === 'weekly') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (selectedInterval === 'monthly') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (selectedInterval === 'yearly') {
      const d = new Date(today);
      d.setDate(d.getDate() - 365);
      start = d.toISOString().split('T')[0];
    }

    if (start) {
      setStartDate(start);
      setEndDate(end);
    }
  };

  useEffect(() => {
    applyIntervalDates('monthly');
  }, []);

  const handleIntervalChange = (newInterval: IntervalType) => {
    setInterval(newInterval);
    if (newInterval !== 'custom') {
      applyIntervalDates(newInterval);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedDept !== 'ALL') params.append('departmentId', selectedDept);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const query = params.toString() ? `?${params.toString()}` : '';

      if (reportType === 'visitors') {
        const res = await api.get(`/visitors${query}`);
        setData(res.data?.data || []);
      } else if (reportType === 'gate-logs') {
        const res = await api.get(`/gate-logs${query}`);
        setData(res.data?.data || []);
      } else if (reportType === 'exit') {
        const res = await api.get(`/exit-requests${query}`);
        setData(res.data?.data || []);
      } else if (reportType === 'departments') {
        const res = await api.get('/departments');
        setData(res.data?.data || []);
      } else if (reportType === 'audit') {
        const res = await api.get('/audit-logs');
        setData(res.data?.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch report data', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
  }, [reportType, startDate, endDate, selectedDept, statusFilter]);

  // Search filtered records
  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data;

    return data.filter(d => {
      if (reportType === 'visitors') {
        return (
          (d.visitor?.fullName || '').toLowerCase().includes(q) ||
          (d.visitor?.mobile || '').toLowerCase().includes(q) ||
          (d.visitor?.organization || '').toLowerCase().includes(q) ||
          (d.visitId || '').toLowerCase().includes(q) ||
          (d.visitorPass?.passNumber || '').toLowerCase().includes(q) ||
          (d.purpose || '').toLowerCase().includes(q) ||
          (d.hostUser?.employee?.firstName || '').toLowerCase().includes(q)
        );
      } else if (reportType === 'gate-logs') {
        return (
          (d.employee?.firstName || '').toLowerCase().includes(q) ||
          (d.employee?.lastName || '').toLowerCase().includes(q) ||
          (d.employee?.employeeCode || '').toLowerCase().includes(q) ||
          (d.gatePass?.passNumber || '').toLowerCase().includes(q) ||
          (d.notes || '').toLowerCase().includes(q)
        );
      } else if (reportType === 'exit') {
        return (
          (d.employee?.firstName || '').toLowerCase().includes(q) ||
          (d.employee?.employeeCode || '').toLowerCase().includes(q) ||
          (d.reason || '').toLowerCase().includes(q) ||
          (d.destination || '').toLowerCase().includes(q)
        );
      } else if (reportType === 'departments') {
        return (
          (d.name || '').toLowerCase().includes(q) ||
          (d.code || '').toLowerCase().includes(q)
        );
      } else if (reportType === 'audit') {
        return (
          (l => (l.action || '').toLowerCase().includes(q) || (l.userEmail || '').toLowerCase().includes(q) || (l.entity || '').toLowerCase().includes(q))(d)
        );
      }
      return true;
    });
  }, [data, search, reportType]);

  // Interval Label
  const intervalLabel = {
    daily: 'Daily (Today)',
    weekly: 'Weekly (Last 7 Days)',
    monthly: 'Monthly (Last 30 Days)',
    yearly: 'Yearly (Annual)',
    custom: 'Custom Date Range'
  }[interval];

  // Stats calculation
  const stats = useMemo(() => {
    if (reportType === 'visitors') {
      const total = data.length;
      const checkedIn = data.filter(v => v.status === 'CHECKED_IN').length;
      const completed = data.filter(v => v.status === 'CHECKED_OUT' || v.status === 'COMPLETED').length;
      const waiting = data.filter(v => v.status === 'PENDING_HOST' || v.status === 'WAITING').length;
      return { total, primary: checkedIn, primaryLabel: 'Inside Campus', secondary: completed, secondaryLabel: 'Checked Out', flag: waiting, flagLabel: 'Waiting Approval' };
    } else if (reportType === 'gate-logs') {
      const total = data.length;
      const outside = data.filter(g => g.exitStatus === 'EXITED' && g.returnStatus === 'PENDING').length;
      const returned = data.filter(g => g.returnStatus === 'RETURNED' || g.returnStatus === 'COMPLETED').length;
      const late = data.filter(g => ['LATE_RETURN', 'OVERDUE', 'CRITICAL'].includes(g.returnStatus)).length;
      return { total, primary: outside, primaryLabel: 'Currently Outside', secondary: returned, secondaryLabel: 'Returned Cleanly', flag: late, flagLabel: 'Late / Overdue' };
    } else if (reportType === 'exit') {
      const total = data.length;
      const approved = data.filter(e => e.status === 'APPROVED' || e.status === 'COMPLETED').length;
      const pending = data.filter(e => e.status.includes('PENDING')).length;
      const rejected = data.filter(e => e.status === 'REJECTED').length;
      return { total, primary: approved, primaryLabel: 'Approved Exits', secondary: pending, secondaryLabel: 'Pending Approval', flag: rejected, flagLabel: 'Rejected Requests' };
    } else {
      return { total: data.length, primary: data.length, primaryLabel: 'Total Records', secondary: 0, secondaryLabel: 'Active', flag: 0, flagLabel: 'Alerts' };
    }
  }, [data, reportType]);

  // Export to Excel CSV
  const downloadExcelCSV = () => {
    if (filteredData.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];
    const sanitizedInterval = interval.toUpperCase();
    const filename = `SmartGate_${reportType.toUpperCase()}_Report_${sanitizedInterval}_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'visitors') {
      headers = [
        'Visit ID', 'Pass Number', 'Visitor Name', 'Gender', 'Phone / Mobile', 'Organization',
        'ID Type', 'Host Employee', 'Host Code', 'Department', 'Purpose', 'Visit Date',
        'Expected Entry', 'Expected Exit', 'Actual Check-In', 'Actual Check-Out',
        'Vehicle Number', 'Status', 'Group Size', 'Created At'
      ];
      rows = filteredData.map(d => {
        const checkIn = d.checkIns?.[0];
        const checkOut = d.checkOuts?.[0];
        return [
          d.visitId || '',
          d.visitorPass?.passNumber || '—',
          `"${d.visitor?.fullName || ''}"`,
          d.visitor?.gender || '—',
          `="${d.visitor?.mobile || ''}"`,
          `"${d.visitor?.organization || ''}"`,
          d.visitor?.idType || '—',
          `"${d.hostUser?.employee?.firstName || ''} ${d.hostUser?.employee?.lastName || ''}"`,
          d.hostUser?.employee?.employeeCode || '',
          `"${d.department?.name || d.hostUser?.employee?.department?.name || ''}"`,
          `"${(d.purpose || '').replace(/"/g, '""')}"`,
          fmtDate(d.visitDate),
          d.expectedEntryTime || '—',
          d.expectedExitTime || '—',
          checkIn?.actualEntryTime ? fmtTime(checkIn.actualEntryTime) : '—',
          checkOut?.actualExitTime ? fmtTime(checkOut.actualExitTime) : '—',
          d.vehicleNumber || '—',
          d.status || '—',
          String(d.numberOfVisitors || 1),
          fmtDate(d.createdAt)
        ];
      });
    } else if (reportType === 'gate-logs') {
      headers = [
        'Log ID', 'Log Date', 'Pass Number', 'Employee Name', 'Employee Code', 'Department',
        'Approved Exit Time', 'Actual Exit Time', 'Expected Return Time', 'Actual Return Time',
        'Exit Status', 'Return Status', 'Late (Mins)', 'Security Notes'
      ];
      rows = filteredData.map(d => [
        d.id,
        fmtDate(d.createdAt),
        d.gatePass?.passNumber || '—',
        `"${d.employee?.firstName || ''} ${d.employee?.lastName || ''}"`,
        d.employee?.employeeCode || '',
        `"${d.employee?.department?.name || ''}"`,
        fmtTime(d.approvedExitTime),
        d.actualExitTime ? fmtTime(d.actualExitTime) : '—',
        fmtTime(d.expectedReturnTime),
        d.actualReturnTime ? fmtTime(d.actualReturnTime) : '—',
        d.exitStatus || '—',
        d.returnStatus || '—',
        String(d.lateMinutes || 0),
        `"${(d.notes || '').replace(/"/g, '""')}"`
      ]);
    } else if (reportType === 'exit') {
      headers = [
        'Request ID', 'Employee Name', 'Employee Code', 'Department', 'Exit Date',
        'Exit Time', 'Expected Return Time', 'Destination', 'Status', 'Reason', 'Is Urgent', 'Submitted Date'
      ];
      rows = filteredData.map(d => [
        d.id,
        `"${d.employee?.firstName || ''} ${d.employee?.lastName || ''}"`,
        d.employee?.employeeCode || '',
        `"${d.employee?.department?.name || ''}"`,
        fmtDate(d.exitDate),
        d.exitTime,
        d.expectedReturnTime,
        `"${(d.destination || '').replace(/"/g, '""')}"`,
        d.status,
        `"${(d.reason || '').replace(/"/g, '""')}"`,
        d.isUrgent ? 'YES' : 'NO',
        fmtDate(d.createdAt)
      ]);
    } else if (reportType === 'departments') {
      headers = ['Department ID', 'Department Name', 'Code', 'Total Staff', 'Created At'];
      rows = filteredData.map(d => [
        d.id,
        `"${d.name}"`,
        d.code || '—',
        String(d.employees?.length || 0),
        fmtDate(d.createdAt)
      ]);
    } else if (reportType === 'audit') {
      headers = ['Audit ID', 'Timestamp', 'Action', 'Entity', 'Entity ID', 'User Email', 'IP Address', 'Data Changes'];
      rows = filteredData.map(l => [
        l.id,
        new Date(l.createdAt).toLocaleString('en-IN'),
        l.action,
        l.entity,
        l.entityId || '',
        l.userEmail || '',
        l.ipAddress || '',
        `"${(l.newValues || '').replace(/"/g, '""')}"`
      ]);
    }

    // Add UTF-8 BOM so Microsoft Excel correctly parses UTF-8 strings
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={24} style={{ color: 'var(--blue-700)' }} /> Reports & Excel Analytics Hub
              </h1>
              <p>
                Daily, Weekly, Monthly & Yearly audit logs, visitor tracking & gate pass activity with 1-click Excel download
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={downloadExcelCSV}
                disabled={loading || filteredData.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <Download size={15} /> Download Excel (.CSV) Report
              </button>
              <button className="btn btn-outline btn-sm" onClick={fetchReports} disabled={loading} title="Refresh Data">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 1. Time Interval Quick Selector Tabs (Daily, Weekly, Monthly, Yearly) */}
        <div className="card" style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} style={{ color: 'var(--blue-700)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                Report Timeframe:
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'daily', label: '📅 Daily (Today)' },
                { id: 'weekly', label: '📅 Weekly (Last 7 Days)' },
                { id: 'monthly', label: '📅 Monthly (Last 30 Days)' },
                { id: 'yearly', label: '📅 Yearly (Annual)' },
                { id: 'custom', label: '⚙️ Custom Range' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleIntervalChange(t.id as IntervalType)}
                  className={`btn btn-sm ${interval === t.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    fontSize: '0.78rem',
                    padding: '6px 12px',
                    fontWeight: interval === t.id ? 700 : 500
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range details */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              Active Period: <strong>{startDate}</strong> to <strong>{endDate}</strong> ({intervalLabel})
            </div>

            {interval === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="date"
                  className="form-control"
                  style={{ padding: '4px 8px', fontSize: '0.78rem', width: 135 }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>to</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ padding: '4px 8px', fontSize: '0.78rem', width: 135 }}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* 2. Key Metrics Summary Banner */}
        <div className="grid-4">
          <div className="stat-card">
            <div className="stat-card-icon blue"><TrendingUp size={20} /></div>
            <div>
              <div className="stat-card-value">{stats.total}</div>
              <div className="stat-card-label">Total in {intervalLabel}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green"><CheckCircle2 size={20} /></div>
            <div>
              <div className="stat-card-value" style={{ color: 'var(--green-600)' }}>{stats.primary}</div>
              <div className="stat-card-label">{stats.primaryLabel}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon purple"><Clock size={20} /></div>
            <div>
              <div className="stat-card-value">{stats.secondary}</div>
              <div className="stat-card-label">{stats.secondaryLabel}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon amber"><AlertTriangle size={20} /></div>
            <div>
              <div className="stat-card-value" style={{ color: 'var(--amber-600)' }}>{stats.flag}</div>
              <div className="stat-card-label">{stats.flagLabel}</div>
            </div>
          </div>
        </div>

        {/* 3. Report Category Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--blue-100)', gap: 8, overflowX: 'auto' }}>
          {[
            { id: 'visitors', label: '👥 Visitor Management & Passes', icon: <UserPlus size={15} /> },
            { id: 'gate-logs', label: '🚪 Gate Activity & Exits', icon: <Shield size={15} /> },
            { id: 'exit', label: '📋 Exit Permissions', icon: <Clock size={15} /> },
            { id: 'departments', label: '🏢 Department Summary', icon: <Building size={15} /> },
            { id: 'audit', label: '🛡️ Audit Logs', icon: <FileSpreadsheet size={15} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setReportType(t.id as ReportType); setSearch(''); setStatusFilter('ALL'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, marginBottom: -2,
                borderBottom: reportType === t.id ? '2px solid var(--blue-700)' : '2px solid transparent',
                color: reportType === t.id ? 'var(--blue-700)' : 'var(--slate-500)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* 4. Filter & Search Bar */}
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="filter-bar-responsive">
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--slate-400)' }} />
              <input
                className="form-control"
                placeholder={`Search in ${reportType} report...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 auto' }}>
              {reportType !== 'departments' && reportType !== 'audit' && (
                <select
                  className="form-control"
                  style={{ flex: '1 1 140px', padding: '6px 10px', fontSize: '0.8rem' }}
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}

              {reportType === 'visitors' && (
                <select
                  className="form-control"
                  style={{ flex: '1 1 140px', padding: '6px 10px', fontSize: '0.8rem' }}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_HOST">Pending Host</option>
                  <option value="APPROVED">Approved Pass</option>
                  <option value="CHECKED_IN">Checked In (Inside)</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              )}

              <button
                className="btn btn-outline btn-sm"
                onClick={downloadExcelCSV}
                disabled={loading || filteredData.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={13} /> Export Filtered View
              </button>
            </div>
          </div>
        </div>

        {/* 5. Data Preview Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={16} /> {intervalLabel} Report Preview ({filteredData.length} records)
            </h3>
            <span className="badge badge-blue">Excel Compatible</span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Spinner size="md" />
              <div style={{ marginTop: 12, color: 'var(--slate-500)', fontSize: '0.85rem' }}>Loading report data...</div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={36} style={{ color: 'var(--slate-400)' }} />
              <h4>No Records in this Timeframe</h4>
              <p>Try switching to Weekly, Monthly or Yearly interval, or modify filters.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                {/* VISITORS TABLE */}
                {reportType === 'visitors' && (
                  <>
                    <thead>
                      <tr>
                        <th>Visit Code</th>
                        <th>Pass #</th>
                        <th>Visitor Details</th>
                        <th>Host / Department</th>
                        <th>Purpose</th>
                        <th>Date & Timing</th>
                        <th>Status</th>
                        <th>Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((d: any) => {
                        const checkIn = d.checkIns?.[0];
                        const checkOut = d.checkOuts?.[0];
                        return (
                          <tr key={d.id}>
                            <td className="font-mono" style={{ color: 'var(--blue-700)', fontWeight: 700 }}>{d.visitId}</td>
                            <td className="font-mono" style={{ fontWeight: 600 }}>{d.visitorPass?.passNumber || '—'}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{d.visitor?.fullName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>
                                {d.visitor?.mobile} {d.visitor?.organization ? `· ${d.visitor.organization}` : ''}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.8125rem' }}>{d.hostUser?.employee?.firstName} {d.hostUser?.employee?.lastName}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{d.department?.name || 'General'}</div>
                            </td>
                            <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.purpose}>
                              {d.purpose}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{fmtDate(d.visitDate)}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', fontFamily: 'monospace' }}>
                                {d.expectedEntryTime} – {d.expectedExitTime}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${statusBadgeClass(d.status)}`}>
                                {statusLabel(d.status)}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.72rem' }}>
                              {checkIn && <div>In: {fmtTime(checkIn.actualEntryTime)}</div>}
                              {checkOut && <div>Out: {fmtTime(checkOut.actualExitTime)}</div>}
                              {!checkIn && !checkOut && <span style={{ color: 'var(--slate-400)' }}>No gate scan</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {/* GATE LOGS TABLE */}
                {reportType === 'gate-logs' && (
                  <>
                    <thead>
                      <tr>
                        <th>Pass ID</th>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Exit Time</th>
                        <th>Expected Return</th>
                        <th>Actual Return</th>
                        <th>Status</th>
                        <th>Late</th>
                        <th>Security Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((d: any) => (
                        <tr key={d.id}>
                          <td className="font-mono" style={{ color: 'var(--blue-700)', fontWeight: 700 }}>{d.gatePass?.passNumber || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{d.employee?.firstName} {d.employee?.lastName} ({d.employee?.employeeCode})</td>
                          <td>{d.employee?.department?.name || '—'}</td>
                          <td className="font-mono">{d.actualExitTime ? fmtTime(d.actualExitTime) : fmtTime(d.approvedExitTime)}</td>
                          <td className="font-mono">{fmtTime(d.expectedReturnTime)}</td>
                          <td className="font-mono">{d.actualReturnTime ? fmtTime(d.actualReturnTime) : '—'}</td>
                          <td>
                            <span className={`badge ${d.exitStatus === 'EXITED' && d.returnStatus === 'PENDING' ? 'badge-amber' : 'badge-green'}`}>
                              {d.exitStatus === 'EXITED' && d.returnStatus === 'PENDING' ? 'OUTSIDE' : 'RETURNED'}
                            </span>
                          </td>
                          <td>
                            {d.lateMinutes > 0 ? (
                              <span className="badge badge-red">{d.lateMinutes}m Late</span>
                            ) : (
                              <span className="badge badge-green">On Time</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--slate-500)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* EXIT PERMISSIONS TABLE */}
                {reportType === 'exit' && (
                  <>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Date</th>
                        <th>Exit Window</th>
                        <th>Destination</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((d: any) => (
                        <tr key={d.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{d.employee?.firstName} {d.employee?.lastName}</div>
                            <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{d.employee?.employeeCode}</div>
                          </td>
                          <td>{d.employee?.department?.name || '—'}</td>
                          <td>{fmtDate(d.exitDate)}</td>
                          <td className="font-mono" style={{ fontSize: '0.78rem' }}>{d.exitTime} – {d.expectedReturnTime}</td>
                          <td>{d.destination}</td>
                          <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.reason}</td>
                          <td><span className={`badge ${statusBadgeClass(d.status)}`}>{statusLabel(d.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* DEPARTMENTS TABLE */}
                {reportType === 'departments' && (
                  <>
                    <thead>
                      <tr>
                        <th>Department Code</th>
                        <th>Department Name</th>
                        <th>Total Staff</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((d: any) => (
                        <tr key={d.id}>
                          <td className="font-mono" style={{ fontWeight: 700, color: 'var(--blue-700)' }}>{d.code || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{d.name}</td>
                          <td><span className="badge badge-blue">{d.employees?.length || 0} Employees</span></td>
                          <td>{fmtDate(d.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* AUDIT LOGS TABLE */}
                {reportType === 'audit' && (
                  <>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>User Email</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((l: any) => (
                        <tr key={l.id}>
                          <td style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                          <td><span className="font-mono" style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--blue-700)' }}>{l.action}</span></td>
                          <td>{l.entity}</td>
                          <td className="font-mono" style={{ fontSize: '0.78rem' }}>{l.userEmail || 'System'}</td>
                          <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{l.ipAddress || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
