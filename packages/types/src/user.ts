import { UserRole } from './enums';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  managerId?: string | null;
  createdAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  department?: Department;
  designation: string;
  phone: string;
  avatarUrl?: string | null;
  joiningDate: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    email: string;
    role: UserRole;
    isActive: boolean;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentName: string;
    departmentId: string;
    designation: string;
    phone: string;
    avatarUrl?: string | null;
  } | null;
}
