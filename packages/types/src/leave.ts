import { RequestStatus } from './enums';
import { Employee } from './user';
import { ApprovalRecord } from './exit-request';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  defaultDaysPerYear: number;
  requiresHrApproval: boolean;
  color?: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType?: LeaveType;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveTypeId: string;
  leaveType?: LeaveType;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: RequestStatus;
  approvals?: ApprovalRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveDto {
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
}
