export type VisitorGender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
export type VisitorIdType = "AADHAR" | "PAN" | "PASSPORT" | "DRIVING_LICENSE" | "OTHER";
export type VisitorVisitType = "WALK_IN" | "PRE_REGISTERED";
export type VisitorPassStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
export type VisitorGroupMemberStatus = "PENDING" | "CHECKED_IN" | "CHECKED_OUT";

export type VisitorVisitStatus =
  | "PENDING_HOST"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "WAITING"
  | "CHECKED_IN"
  | "OVERDUE"
  | "CHECKED_OUT"
  | "EXPIRED"
  | "COMPLETED";

export interface Visitor {
  id: string;
  fullName: string;
  gender?: VisitorGender | null;
  mobile: string;
  email?: string | null;
  organization?: string | null;
  idType?: VisitorIdType | null;
  idVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorVisit {
  id: string;
  visitId: string;
  visitorId: string;
  visitor?: Visitor;
  hostUserId: string;
  hostUser?: {
    id: string;
    email: string;
    employee?: {
      firstName: string;
      lastName: string;
      designation: string;
      department?: { name: string };
      avatarUrl?: string | null;
    };
  };
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  purpose: string;
  description?: string | null;
  visitDate: string;
  expectedEntryTime: string;
  expectedExitTime: string;
  numberOfVisitors: number;
  vehicleNumber?: string | null;
  vehicleType?: string | null;
  requiresParkingSlot: boolean;
  requiresHostApproval: boolean;
  requiresHrApproval: boolean;
  visitType: VisitorVisitType;
  status: VisitorVisitStatus;
  createdByUserId: string;
  createdByUser?: {
    id: string;
    email: string;
    employee?: { firstName: string; lastName: string };
  };
  rejectionReason?: string | null;
  hostNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  visitorPass?: VisitorPass | null;
  groupMembers?: VisitorGroupMember[];
  checkIns?: VisitorCheckIn[];
  checkOuts?: VisitorCheckOut[];
}

export interface VisitorGroupMember {
  id: string;
  visitId: string;
  visitorId: string;
  visitor?: Visitor;
  status: VisitorGroupMemberStatus;
  createdAt: string;
}

export interface VisitorPass {
  id: string;
  passNumber: string;
  visitId: string;
  qrToken: string;
  validFrom: string;
  validUntil: string;
  status: VisitorPassStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorCheckIn {
  id: string;
  visitId: string;
  passId?: string | null;
  actualEntryTime: string;
  securityUserId: string;
  securityUser?: { id: string; email: string; employee?: { firstName: string; lastName: string } };
  gate?: string | null;
  idVerified: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface VisitorCheckOut {
  id: string;
  visitId: string;
  passId?: string | null;
  actualExitTime: string;
  securityUserId: string;
  securityUser?: { id: string; email: string; employee?: { firstName: string; lastName: string } };
  gate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InviteVisitorDto {
  fullName: string;
  gender?: VisitorGender;
  mobile: string;
  email?: string;
  organization?: string;
  idType?: VisitorIdType;
  hostUserId: string;
  departmentId?: string;
  purpose: string;
  description?: string;
  visitDate: string;
  expectedEntryTime: string;
  expectedExitTime: string;
  numberOfVisitors?: number;
  vehicleNumber?: string;
  vehicleType?: string;
  requiresParkingSlot?: boolean;
  additionalVisitors?: Array<{ fullName: string; mobile: string; gender?: VisitorGender }>;
}

export interface WalkInVisitDto {
  fullName: string;
  gender?: VisitorGender;
  mobile: string;
  email?: string;
  organization?: string;
  idType?: VisitorIdType;
  hostUserId: string;
  departmentId?: string;
  purpose: string;
  description?: string;
  visitDate?: string;
  expectedEntryTime?: string;
  expectedExitTime: string;
  numberOfVisitors?: number;
  vehicleNumber?: string;
  vehicleType?: string;
  additionalVisitors?: Array<{ fullName: string; mobile: string; gender?: VisitorGender }>;
}

export interface RespondToVisitDto {
  action: "APPROVE" | "REJECT" | "WAIT";
  notes?: string;
  rejectionReason?: string;
}

export interface VisitorCheckInDto {
  gate?: string;
  idVerified?: boolean;
  notes?: string;
}

export interface VisitorCheckOutDto {
  gate?: string;
  notes?: string;
}

export interface VerifyVisitorDto {
  identifier: string;
}

export interface VisitorStats {
  total: number;
  today: number;
  inside: number;
  waiting: number;
  completed: number;
  rejected: number;
  cancelled: number;
  expired: number;
  overdue: number;
}
