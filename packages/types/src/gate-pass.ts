import { GatePassStatus, ExitStatus, ReturnStatus } from './enums';
import { Employee } from './user';
import { ExitRequest } from './exit-request';

export interface GatePass {
  id: string;
  passNumber: string;
  exitRequestId: string;
  exitRequest?: ExitRequest;
  employeeId: string;
  employee?: Employee;
  qrPayload: string;
  validFrom: string;
  validUntil: string;
  status: GatePassStatus;
  gateLogs?: GateLog[];
  createdAt: string;
  updatedAt: string;
}

export interface GateLog {
  id: string;
  gatePassId: string;
  gatePass?: GatePass;
  employeeId: string;
  employee?: Employee;
  approvedExitTime: string;
  actualExitTime?: string | null;
  expectedReturnTime: string;
  actualReturnTime?: string | null;
  exitStatus: ExitStatus;
  returnStatus: ReturnStatus;
  securityUserId?: string | null;
  securityUser?: {
    id: string;
    email: string;
    employee?: {
      firstName: string;
      lastName: string;
    };
  };
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyPassDto {
  identifier: string; // QR payload or PassNumber or EmployeeCode
}

export interface LogExitDto {
  gatePassId: string;
  notes?: string;
}

export interface LogReturnDto {
  gatePassId: string;
  notes?: string;
}
