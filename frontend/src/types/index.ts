export type UserRole = 'ADMIN' | 'DATA_ENTRY' | 'REVIEWER' | 'READONLY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  districtName?: string;
  constituencyName?: string;
  blockName?: string;
  blockLgdCode?: string;
  isActive: boolean;
  _count?: { applications?: number };
}

export interface District {
  id: number;
  code: string;
  name: string;
  state: string;
  assemblySeatsCount: number;
  isActive: boolean;
  _count?: {
    constituencies?: number;
    applications?: number;
  };
}

export interface AssemblyConstituency {
  id: number;
  acNumber: number;
  acCode: string;
  name: string;
  reservation: 'GEN' | 'SC' | 'ST';
  districtId: number;
  district?: {
    id: number;
    name: string;
    code: string;
  };
  lokSabhaConstituency?: string;
  isActive: boolean;
}

export interface ComplaintCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  _count?: {
    applications?: number;
  };
}

export type ApplicationPriority = 'IMPORTANT' | 'NORMAL';
export type ApplicationStatus = 'PENDING' | 'IN_PROGRESS' | 'AWAITING_INFO' | 'COMPLETED' | 'DISPOSED' | 'REJECTED';

export interface FollowUpRecord {
  id: string;
  applicationId: string;
  actionTaken: string;
  reminderNotes: string;
  previousStatus?: string;
  newStatus?: string;
  assignedTo?: string;
  nextFollowUpDate?: string;
  actionBy: string;
  createdAt: string;
  user?: {
    id?: string;
    name: string;
    email?: string;
  };
}

export interface AuditLogRecord {
  id: string;
  applicationId?: string;
  entityType: string;
  action: string;
  details: string;
  performedBy: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  applicationId: string;
  dateReceived: string;
  applicantName: string;
  fatherOrHusbandName?: string | null;
  mobileNumber: string;
  alternateMobile?: string;
  address: string;
  districtId: number;
  district: District;
  constituencyId?: number | null;
  constituency?: AssemblyConstituency | null;
  assemblyConstituency?: AssemblyConstituency | null;
  customConstituency?: string | null;
  isUnverifiedAc?: boolean;
  verifiedAcCode: string;
  blockName?: string;
  blockLgdCode?: string;
  createdById?: string;
  createdByName?: string;
  createdByEmail?: string;
  categoryId?: string | null;
  category?: ComplaintCategory | null;
  categoryName?: string;
  subject: string;
  description: string;
  priority: ApplicationPriority;
  status: ApplicationStatus;
  assignedEmployee: string;
  internalRemarks?: string;
  documents?: string;
  nextFollowUpDate?: string;
  lastActionTaken?: string;
  completedAt?: string;
  completionNotes?: string;
  reopenedAt?: string;
  reopenReason?: string;
  createdAt: string;
  updatedAt: string;
  followUps?: FollowUpRecord[];
  auditLogs?: AuditLogRecord[];
  // Calculated frontend properties
  daysSinceReceipt?: number;
  daysSinceLastUpdate?: number;
  isOverdue?: boolean;
}

export interface DashboardStats {
  total: number;
  important: number;
  normal: number;
  pending: number;
  inProgress: number;
  awaitingInfo: number;
  completed: number;
  overdue: number;
  receivedToday: number;
  activeFollowUps?: number;
  disposed?: number;
  timestamp: string;
}

export interface DistrictStat {
  districtId: number;
  districtCode: string;
  districtName: string;
  totalSeats: number;
  totalApplications: number;
  importantCount: number;
  normalCount: number;
  pendingCount: number;
  completedCount: number;
  resolutionRate: number;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  total: number;
  importantCount: number;
  normalCount: number;
  pendingCount: number;
  completedCount: number;
}

export interface SystemSettings {
  maxUploadSizeMb: number;
  supportEmail: string | null;
  supportPhone: string | null;
  workingHours: string | null;
  allowedExtensions: string[];
  hasConfiguredEmail: boolean;
  hasConfiguredPhone: boolean;
  hasConfiguredHours: boolean;
}

