'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import {
  FileSpreadsheet, Download, Calendar, Filter, RefreshCw,
  Clock, Shield, UserPlus, Users, CheckCircle2, AlertCircle
} from 'lucide-react';
import { fmtDate, fmtTime } from '@/lib/utils';

type ReportType = 'gate-logs' | 'leave' | 'exit' | 'visitors';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('gate-logs');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('ALL');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedDept !== 'ALL') params.append('departmentId', selectedDept);
      const query = params.toString() ? `?${params.toString()}` : '';

      if (reportType === 'gate-logs') {
        const res = await api.get(`/gate-logs${query}`);
        setData(res.data?.data || []);
      } else if (reportType === 'leave') {
        const res = await api.get(`/leave/requests${query}`);
        setData(res.data?.data || []);
      } else if (reportType === 'exit') {
        const res = await api.get(`/exit-requests${query}`);
        setData(res.data?.data || []);
      } else if (reportType === 'visitors') {
        const res = await api.get(`/visitors${query}`);
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
    fetchReports();
  }, [reportType]);


  const downloadCSV = () => {
    if (data.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `smartgate-${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'gate-logs') {
      headers = ['Log ID', 'Date', 'Employee Name', 'Employee Code', 'Department', 'Pass Number', 'Approved Exit', 'Actual Exit', 'Expected Return', 'Actual Return', 'Exit Status', 'Return Status', 'Late (Mins)', 'Security Notes'];
      rows = data.map(d => [
        d.id,
        new Date(d.createdAt).toLocaleDateString(),
        `"${d.employee?.firstName} ${d.employee?.lastName}"`,
        d.employee?.employeeCode || '',
        `"${d.employee?.department?.name || ''}"`,
        d.gatePass?.passNumber || '',
        fmtTime(d.approvedExitTime),
        d.actualExitTime ? fmtTime(d.actualExitTime) : '—',
        fmtTime(d.expectedReturnTime),
        d.actualReturnTime ? fmtTime(d.actualReturnTime) : '—',
        d.exitStatus,
        d.returnStatus,
        d.lateMinutes || '0',
        `"${d.notes || ''}"`
      ]);
    } else if (reportType === 'leave') {
      headers = ['Request ID', 'Employee Name', 'Employee Code', 'Department', 'Leave Type', 'From Date', 'To Date', 'Total Days', 'Status', 'Reason', 'Created At'];
      rows = data.map(d => [
        d.id,
        `"${d.employee?.firstName} ${d.employee?.lastName}"`,
        d.employee?.employeeCode || '',
        `"${d.employee?.department?.name || ''}"`,
        d.leaveType?.name || '',
        fmtDate(d.fromDate),
        fmtDate(d.toDate),
        String(d.totalDays),
        d.status,
        `"${(d.reason || '').replace(/"/g, '""')}"`,
        new Date(d.createdAt).toLocaleDateString()
      ]);
    } else if (reportType === 'exit') {
      headers = ['Request ID', 'Employee Name', 'Employee Code', 'Department', 'Exit Date', 'Exit Time', 'Expected Return', 'Destination', 'Status', 'Reason'];
      rows = data.map(d => [
        d.id,
        `"${d.employee?.firstName} ${d.employee?.lastName}"`,
        d.employee?.employeeCode || '',
        `"${d.employee?.department?.name || ''}"`,
        fmtDate(d.exitDate),
        d.exitTime,
        d.expectedReturnTime,
        `"${(d.destination || '').replace(/"/g, '""')}"`,
        d.status,
        `"${(d.reason || '').replace(/"/g, '""')}"`
      ]);
    } else if (reportType === 'visitors') {
      headers = ['Visit Code', 'Pass Number', 'Visitor Name', 'Organization', 'Contact', 'Host Name', 'Department', 'Purpose', 'Date', 'Expected Entry', 'Expected Exit', 'Actual Check-In', 'Actual Check-Out', 'Gate', 'ID Verified', 'Vehicle Number', 'Status', 'Group Size'];
      rows = data.map(d => {
        const checkIn = d.checkIns?.[0];
        const checkOut = d.checkOuts?.[0];
        return [
          d.visitId,
          d.visitorPass?.passNumber || '—',
          `"${d.visitor?.fullName || ''}"`,
          `"${d.visitor?.organization || ''}"`,
          d.visitor?.mobile || '',
          `"${d.hostUser?.employee?.firstName || ''} ${d.hostUser?.employee?.lastName || ''}"`,
          `"${d.department?.name || ''}"`,
          `"${(d.purpose || '').replace(/"/g, '""')}"`,
          fmtDate(d.visitDate),
          d.expectedEntryTime,
          d.expectedExitTime,
          checkIn?.actualEntryTime ? fmtTime(checkIn.actualEntryTime) : '—',
          checkOut?.actualExitTime ? fmtTime(checkOut.actualExitTime) : '—',
          checkIn?.gate || '—',
          checkIn?.idVerified ? 'Yes' : 'No',
          d.vehicleNumber || '—',
          d.status,
          String(d.numberOfVisitors || 1)
        ];
      });
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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
        {/* Header */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={24} style={{ color: 'var(--blue-700)' }} /> Reports & Excel Export
              </h1>
              <p>Generate authorized audit trails, gate pass logs, leave summaries & visitor logs with one-click export</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={downloadCSV}
                disabled={loading || data.length === 0}
              >
                <Download size={14} /> Export to Excel (.CSV)
              </button>
              <button className="btn btn-outline btn-sm" onClick={fetchReports} disabled={loading}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Report Type Selector Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--blue-100)', gap: 8 }}>
          {[
            { id: 'gate-logs', label: 'Gate Pass & Entry/Exit Activity', icon: <Shield size={15} /> },
            { id: 'leave', label: 'Leave Requests & Balances', icon: <Calendar size={15} /> },
            { id: 'exit', label: 'Exit Permissions', icon: <Clock size={15} /> },
            { id: 'visitors', label: 'Visitor Management Roster', icon: <UserPlus size={15} /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id as ReportType)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, marginBottom: -2,
                borderBottom: reportType === t.id ? '2px solid var(--blue-700)' : '2px solid transparent',
                color: reportType === t.id ? 'var(--blue-700)' : 'var(--slate-500)',
                transition: 'all 0.15s'
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Dynamic Filter Bar */}
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={14} style={{ color: 'var(--slate-500)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate-600)' }}>Filter:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>From</label>
              <input
                type="date"
                className="form-control"
                style={{ padding: '5px 10px', fontSize: '0.8125rem', width: 145 }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>To</label>
              <input
                type="date"
                className="form-control"
                style={{ padding: '5px 10px', fontSize: '0.8125rem', width: 145 }}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>Dept</label>
              <select
                className="form-control"
                style={{ padding: '5px 10px', fontSize: '0.8125rem', width: 160 }}
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={fetchReports}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} /> Apply Filters
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
                setSelectedDept('ALL');
                setTimeout(fetchReports, 0);
              }}
              style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Preview */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FileSpreadsheet size={16} /> Preview Report ({data.length} records)
            </h3>
            <span className="badge badge-blue">Live Filtered Data</span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Spinner size="md" />
              <div style={{ marginTop: 12, color: 'var(--slate-500)', fontSize: '0.85rem' }}>Loading report data...</div>
            </div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={36} style={{ color: 'var(--slate-400)' }} />
              <h4>No Records Found</h4>
              <p>No activity logs recorded matching the selected report type.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
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
                        <th>Notes / Gate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d: any) => (
                        <tr key={d.id}>
                          <td className="font-mono" style={{ color: 'var(--blue-700)', fontWeight: 700 }}>{d.gatePass?.passNumber || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{d.employee?.firstName} {d.employee?.lastName} ({d.employee?.employeeCode})</td>
                          <td>{d.employee?.department?.name || '—'}</td>
                          <td className="font-mono">{d.actualExitTime ? fmtTime(d.actualExitTime) : '—'}</td>
                          <td className="font-mono">{fmtTime(d.expectedReturnTime)}</td>
                          <td className="font-mono">{d.actualReturnTime ? fmtTime(d.actualReturnTime) : '—'}</td>
                          <td>
                            <span className={`badge ${d.returnStatus === 'LATE_RETURN' ? 'badge-danger' : d.exitStatus === 'EXITED' && d.returnStatus === 'PENDING' ? 'badge-amber' : 'badge-success'}`}>
                              {d.returnStatus === 'LATE_RETURN' ? 'LATE RETURN' : d.exitStatus === 'EXITED' && d.returnStatus === 'PENDING' ? 'OUTSIDE' : 'RETURNED'}
                            </span>
                          </td>
                          <td>{d.lateMinutes ? `${d.lateMinutes}m` : '—'}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--slate-600)' }}>{d.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {reportType === 'leave' && (
                  <>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Code</th>
                        <th>Department</th>
                        <th>Leave Type</th>
                        <th>From Date</th>
                        <th>To Date</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d: any) => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.employee?.firstName} {d.employee?.lastName}</td>
                          <td className="font-mono">{d.employee?.employeeCode}</td>
                          <td>{d.employee?.department?.name || '—'}</td>
                          <td><span className="badge badge-blue">{d.leaveType?.name}</span></td>
                          <td className="font-mono">{fmtDate(d.fromDate)}</td>
                          <td className="font-mono">{fmtDate(d.toDate)}</td>
                          <td style={{ fontWeight: 700 }}>{d.totalDays}</td>
                          <td><span className={`badge ${d.status === 'APPROVED' ? 'badge-success' : d.status === 'REJECTED' ? 'badge-danger' : 'badge-amber'}`}>{d.status}</span></td>
                          <td style={{ fontSize: '0.8rem' }}>{d.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {reportType === 'exit' && (
                  <>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Code</th>
                        <th>Department</th>
                        <th>Date</th>
                        <th>Exit Time</th>
                        <th>Expected Return</th>
                        <th>Destination</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d: any) => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.employee?.firstName} {d.employee?.lastName}</td>
                          <td className="font-mono">{d.employee?.employeeCode}</td>
                          <td>{d.employee?.department?.name || '—'}</td>
                          <td className="font-mono">{fmtDate(d.exitDate)}</td>
                          <td className="font-mono">{d.exitTime}</td>
                          <td className="font-mono">{d.expectedReturnTime}</td>
                          <td>{d.destination}</td>
                          <td><span className={`badge ${d.status === 'APPROVED' ? 'badge-success' : d.status === 'REJECTED' ? 'badge-danger' : 'badge-amber'}`}>{d.status}</span></td>
                          <td style={{ fontSize: '0.8rem' }}>{d.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {reportType === 'visitors' && (
                  <>
                    <thead>
                      <tr>
                        <th>Visit ID</th>
                        <th>Pass No.</th>
                        <th>Visitor</th>
                        <th>Organization</th>
                        <th>Host Employee</th>
                        <th>Department</th>
                        <th>Date</th>
                        <th>Schedule</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d: any) => {
                        const checkIn = d.checkIns?.[0];
                        const checkOut = d.checkOuts?.[0];
                        return (
                          <tr key={d.id}>
                            <td className="font-mono" style={{ color: 'var(--blue-700)', fontWeight: 700 }}>{d.visitId}</td>
                            <td className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{d.visitorPass?.passNumber || '—'}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{d.visitor?.fullName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{d.visitor?.mobile}</div>
                            </td>
                            <td>{d.visitor?.organization || '—'}</td>
                            <td>{d.hostUser?.employee ? `${d.hostUser.employee.firstName} ${d.hostUser.employee.lastName}` : (d.hostUser?.email || '—')}</td>
                            <td>{d.department?.name || d.hostUser?.employee?.department?.name || '—'}</td>
                            <td className="font-mono">{fmtDate(d.visitDate)}</td>
                            <td className="font-mono" style={{ fontSize: '0.78rem' }}>{d.expectedEntryTime} – {d.expectedExitTime}</td>
                            <td className="font-mono" style={{ fontSize: '0.78rem', color: checkIn?.actualEntryTime ? 'var(--green-700)' : 'var(--slate-400)' }}>
                              {checkIn?.actualEntryTime ? fmtTime(checkIn.actualEntryTime) : '—'}
                              {checkIn?.gate && <span style={{ fontSize: '0.7rem', color: 'var(--slate-500)', display: 'block' }}>{checkIn.gate}</span>}
                            </td>
                            <td className="font-mono" style={{ fontSize: '0.78rem', color: checkOut?.actualExitTime ? 'var(--slate-700)' : 'var(--slate-400)' }}>
                              {checkOut?.actualExitTime ? fmtTime(checkOut.actualExitTime) : '—'}
                            </td>
                            <td>
                              <span className={`badge ${
                                d.status === 'CHECKED_IN' ? 'badge-success' :
                                d.status === 'COMPLETED' || d.status === 'CHECKED_OUT' ? 'badge-blue' :
                                d.status === 'OVERDUE' ? 'badge-danger' :
                                d.status === 'APPROVED' ? 'badge-purple' :
                                d.status === 'REJECTED' ? 'badge-danger' : 'badge-amber'
                              }`}>
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
