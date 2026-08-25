import { ConnectionType, ConnectionStatus, UserRole } from './enums';

export interface AuthorityConnection {
  id: string;
  userId: string;           // The junior/requestor
  authorityUserId: string;  // The person in authority above
  connectionType: ConnectionType;
  status: ConnectionStatus;
  startDate?: string | null;
  endDate?: string | null;
  isTemporary: boolean;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  // populated relations
  authorityUser?: {
    id: string;
    email: string;
    role: UserRole;
    employee?: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      designation: string;
      department?: { name: string };
      avatarUrl?: string | null;
    };
  };
  user?: {
    id: string;
    email: string;
    role: UserRole;
    employee?: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      designation: string;
      department?: { name: string };
      avatarUrl?: string | null;
    };
  };
}

export interface TemporaryDelegation {
  id: string;
  fromUserId: string;       // Original authority going away
  toUserId: string;         // Temporary replacement
  connectionType: ConnectionType;
  startDate: string;
  endDate: string;
  reason?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleEntry {
  id: string;
  userId: string;
  role: UserRole;
  assignedAt: string;
  assignedBy?: string | null;
}

export interface EmployeeJourneyEntry {
  type: 'JOINING' | 'ROLE_CHANGE' | 'DEPT_CHANGE' | 'AUTHORITY_CHANGE' | 'LEAVE' | 'EXIT_PERMISSION' | 'GATE_ACTION' | 'AUDIT';
  date: string;
  title: string;
  description: string;
  actor?: string;
  metadata?: Record<string, any>;
}
