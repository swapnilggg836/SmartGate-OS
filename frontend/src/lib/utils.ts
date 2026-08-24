export function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function fmtTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

export function fmtDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return `${fmtDate(date)}, ${fmtTime(date)}`;
}

export function timeAgo(date: string | Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U';
}

export function statusBadgeClass(status: string): string {
  const s = status?.toUpperCase();
  if (['APPROVED', 'ACTIVE', 'RETURNED', 'COMPLETED', 'PRESENT'].includes(s)) return 'badge-green';
  if (['PENDING_MANAGER', 'PENDING_HR', 'PENDING_SUPER_ADMIN', 'PENDING'].includes(s)) return 'badge-amber';
  if (['REJECTED', 'CANCELLED', 'EXPIRED', 'LATE_RETURN'].includes(s)) return 'badge-red';
  if (['EXITED', 'ON_EXIT_PERMISSION', 'USED'].includes(s)) return 'badge-blue';
  return 'badge-slate';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_MANAGER: 'Pending Manager',
    PENDING_HR: 'Pending HR',
    PENDING_SUPER_ADMIN: 'Pending Admin',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    ACTIVE: 'Active',
    USED: 'Used',
    EXPIRED: 'Expired',
    EXITED: 'Exited',
    RETURNED: 'Returned',
    LATE_RETURN: 'Late Return',
    COMPLETED: 'Completed',
    PRESENT: 'Present',
    ABSENT: 'Absent',
    ON_LEAVE: 'On Leave',
    ON_EXIT_PERMISSION: 'On Exit'
  };
  return map[status] || status;
}

// Aliases for backward compatibility (must be after function definitions)
export const formatDate = fmtDate;
export const formatTime = fmtTime;
export const formatDateTime = fmtDateTime;
export const getStatusBadgeClass = statusBadgeClass;
