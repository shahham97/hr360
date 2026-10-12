export type RoleType =
  | 'SUPER_ADMIN'
  | 'HR_MANAGER'
  | 'DEPARTMENT_HEAD'
  | 'PAYROLL_MANAGER'
  | 'PAYROLL_AUDITOR'
  | 'RECRUITER'
  | 'EMPLOYEE'
  | 'APPROVER';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: RoleType;
  department?: string;
  branch?: string;
}

export interface CompanySession {
  id: string;
  name: string;
  slug: string;
  databaseName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'LOCKED';
  licenseTier: string;
  employeeLimit: number;
  licenseExpires: string;
  offlineGraceDays: number;
  modules?: {
    dashboard: boolean;
    employees: boolean;
    attendance: boolean;
    leaves: boolean;
    payroll: boolean;
    payslipTemplate: boolean;
    certificates: boolean;
    performance: boolean;
    recruitment: boolean;
    system: boolean;
  };
  limits?: {
    employees: number;
    terminals: number;
    adminUsers: number;
    storageMb: number;
  };
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  nationalId: string;
  department: string;
  designation: string;
  branch: string;
  employmentType: 'PERMANENT' | 'CONTRACT' | 'PROBATIONARY' | 'INTERN';
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED';
  joiningDate: string;
  probationEndDate?: string;
  baseSalary: number;
  salaryStructureId?: string;
  leavePolicyId?: string;
  managerName?: string;
  bankName?: string;
  bankAccount?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | 'REST_DAY';
  deviceSource: string;
  manualOverride?: boolean;
  overrideReason?: string;
}

export interface BiometricDevice {
  id: string;
  name: string;
  manufacturer: 'ZKTeco' | 'Hikvision' | 'Anviz';
  model: string;
  branch: string;
  ipAddress: string;
  port: number;
  protocol: 'TCP/IP' | 'ISAPI' | 'SOAP';
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';
  lastSyncAt: string;
  lastReceivedPunch: string;
  totalSyncedPunches: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveType: 'SICK' | 'CASUAL' | 'ANNUAL' | 'UNPAID' | 'MATERNITY';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentApproverStep: 'DEPARTMENT_HEAD' | 'HR_MANAGER' | 'FINAL_APPROVER';
  submittedAt: string;
  reviewedBy?: string;
  reviewComment?: string;
}

export interface SalaryStructure {
  id: string;
  name: string;
  code: string;
  basicSalaryPercent: number; // e.g. 60%
  houseRentPercent: number; // e.g. 25%
  medicalAllowancePercent: number; // e.g. 10%
  transportAllowanceFixed: number;
  taxable: boolean;
  eobiEnabled: boolean;
  pfEnabled: boolean;
  pfPercent: number;
}

export interface PayrollRun {
  id: string;
  periodName: string; // e.g. October 2026
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'CALCULATED' | 'SUBMITTED' | 'APPROVED' | 'LOCKED' | 'PAID';
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNetPayable: number;
  totalEobiEmployer: number;
  isLocked: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PayslipItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  branch: string;
  joiningDate: string;
  bankAccount: string;
  periodName: string;
  basicSalary: number;
  houseRentAllowance: number;
  medicalAllowance: number;
  transportAllowance: number;
  overtimeEarnings: number;
  grossSalary: number;
  incomeTaxDeduction: number;
  eobiEmployeeDeduction: number;
  eobiEmployerContribution: number;
  providentFundDeduction: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netPayable: number;
}

export interface PayslipTemplate {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  primaryColor: string;
  showLogo: boolean;
  showSignatures: boolean;
  showBankDetails: boolean;
  footerNotes: string;
  isDefault: boolean;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  type: 'EMPLOYMENT' | 'SALARY' | 'EXPERIENCE' | 'BENEFITS' | 'PROMOTION' | 'INCREMENT';
  title: string;
  bodyContent: string;
  signatoryName: string;
  signatoryTitle: string;
  isDefault: boolean;
}

export interface BenefitPlan {
  id: string;
  name: string;
  type: 'HEALTH_INSURANCE' | 'LIFE_INSURANCE' | 'PROVIDENT_FUND' | 'TRANSPORT' | 'MEAL_VOUCHERS';
  coverageAmount: number;
  employeeContribution: number;
  employerContribution: number;
  eligibilityMonths: number;
  enrolledCount: number;
}

export interface AppraisalCycle {
  id: string;
  cycleName: string; // e.g. FY 2026 Annual Review
  year: number;
  status: 'PLANNING' | 'ACTIVE' | 'UNDER_REVIEW' | 'COMPLETED';
  totalEligible: number;
  completedReviews: number;
}

export interface AppraisalRecord {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  rating: number; // 1 to 5
  performanceBand: 'OUTSTANDING' | 'EXCEEDS_EXPECTATIONS' | 'MEETS_EXPECTATIONS' | 'NEEDS_IMPROVEMENT';
  proposedIncrementPercent: number;
  proposedBonus: number;
  reviewerNotes: string;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED';
}

export interface JobOpening {
  id: string;
  jobTitle: string;
  department: string;
  branch: string;
  openingsCount: number;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED';
  minExperienceYears: number;
  requiredSkills: string[];
  educationTier: string;
  salaryRange: string;
  applicationDeadline: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  experienceYears: number;
  education: string;
  skills: string[];
  cvFileName: string;
  matchScore: number;
  knockoutStatus: 'PASS' | 'FAIL' | 'REVIEW';
  recruitmentStage: 'NEW' | 'PARSING' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
  blindAnonymized: boolean;
  notes: string;
}

export interface InterviewSchedule {
  id: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  interviewDate: string;
  interviewTime: string;
  interviewerName: string;
  location: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  feedback: string;
  rating: number;
}

export interface OnboardingTask {
  id: string;
  employeeId: string;
  employeeName: string;
  taskName: string;
  category: 'HR_DOCUMENTS' | 'IT_EQUIPMENT' | 'TRAINING' | 'POLICY_ACKNOWLEDGMENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: 'LAPTOP' | 'PERIPHERAL' | 'MOBILE' | 'OFFICE_FURNITURE' | 'NETWORKING' | 'SOFTWARE_LICENSE' | 'OTHER';
  serialNumber: string;
  purchaseDate: string;
  purchaseValue: number;
  condition: 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED';
  status: 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED';
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedDate?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  module: string;
  entityId: string;
  details: string;
  ipAddress: string;
}

