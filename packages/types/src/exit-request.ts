import { RequestStatus, RequestType, UserRole } from './enums';
import { Employee } from './user';
import { GatePass } from './gate-pass';

export interface ApprovalRecord {
  id: string;
  requestId: string;
  requestType: RequestType;
  approverId: string;
  approverRole: UserRole;
  status: RequestStatus;
  comments?: string | null;
  approvedAt?: string | null;
  approver?: {
    id: string;
    email: string;
    employee?: {
      firstName: string;
      lastName: string;
      designation: string;
    };
  };
}

export interface ExitRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  exitDate: string;
  exitTime: string;
  expectedReturnTime: string;
  destination: string;
  reason: string;
  description?: string | null;
  requiresHrApproval: boolean;
  status: RequestStatus;
  approvals?: ApprovalRecord[];
  gatePass?: GatePass | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExitRequestDto {
  exitDate: string;
  exitTime: string;
  expectedReturnTime: string;
  destination: string;
  reason: string;
  description?: string;
  requiresHrApproval?: boolean;
}

export interface ReviewRequestDto {
  action: 'APPROVE' | 'REJECT';
  comments?: string;
}
