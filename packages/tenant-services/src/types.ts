export interface ActorContext {
  companyId: string;
  userId: string;
  role: string;
  entitlements?: Record<string, any>;
  isSupportSession?: boolean;
}

export interface EmployeeDTO {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  branch: string;
  employmentType: 'FULL_TIME' | 'CONTRACT' | 'PROBATION' | 'INTERN';
  baseSalaryMinor: number;
  nationalId: string;
  dateOfBirth: string;
  gender: string;
  joiningDate: string;
  probationEndDate?: string | null;
  contractEndDate?: string | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED';
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeDTO {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  branch: string;
  employmentType: 'FULL_TIME' | 'CONTRACT' | 'PROBATION' | 'INTERN';
  baseSalaryMinor: number;
  nationalId: string;
  dateOfBirth: string;
  gender: string;
  joiningDate: string;
  probationEndDate?: string | null;
  contractEndDate?: string | null;
  status?: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED';
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
}

export interface AttendanceRecordDTO {
  id: string;
  employeeId: string;
  punchTime: string;
  punchType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  terminalId: string;
  verifiedMode: string;
  status: 'ON_TIME' | 'LATE' | 'EARLY_DEPARTURE' | 'HALF_DAY' | 'OVERTIME';
  lateMinutes: number;
  overtimeMinutes: number;
  notes?: string | null;
  createdAt: string;
}

export interface PunchInput {
  employeeId: string;
  punchTime: string;
  punchType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  terminalId: string;
  verifiedMode?: string;
}

export interface LeaveBalanceDTO {
  id: string;
  employeeId: string;
  leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'UNPAID';
  year: number;
  allocatedDays: number;
  usedDays: number;
  availableDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestDTO {
  id: string;
  employeeId: string;
  leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'UNPAID';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string | null;
  actionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestDTO {
  employeeId: string;
  leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'UNPAID';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
}

export interface SalaryStructureDTO {
  id: string;
  employeeId: string;
  baseSalaryMinor: number;
  houseRentMinor: number;
  medicalAllowanceMinor: number;
  conveyanceMinor: number;
  specialAllowanceMinor: number;
  providentFundRate: number;
  taxExemptMinor: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunDTO {
  id: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'LOCKED';
  totalGrossMinor: number;
  totalDeductionsMinor: number;
  totalNetMinor: number;
  totalTaxMinor: number;
  totalEobiMinor: number;
  totalProvidentFundMinor: number;
  employeeCount: number;
  processedBy: string;
  approvedBy?: string | null;
  lockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollItemDTO {
  id: string;
  payrollRunId: string;
  employeeId: string;
  baseSalaryMinor: number;
  allowancesMinor: number;
  grossSalaryMinor: number;
  taxDeductionMinor: number;
  eobiEmployeeMinor: number;
  eobiEmployerMinor: number;
  providentFundEmployeeMinor: number;
  providentFundEmployerMinor: number;
  unpaidLeaveDeductionMinor: number;
  otherDeductionsMinor: number;
  netSalaryMinor: number;
  status: 'PENDING' | 'PAID';
  createdAt: string;
}

export interface PayslipTemplateDTO {
  id: string;
  name: string;
  isDefault: boolean;
  headerLogoUrl?: string | null;
  primaryColor: string;
  companyName: string;
  footerNotes?: string | null;
  showEobi: boolean;
  showProvidentFund: boolean;
  showYtdTotals: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateDTO {
  id: string;
  employeeId: string;
  certificateType: 'EXPERIENCE' | 'EMPLOYMENT' | 'SALARY' | 'NOC';
  issueDate: string;
  verificationCode: string;
  issuedBy: string;
  content: string;
  createdAt: string;
}

export interface JobOpeningDTO {
  id: string;
  title: string;
  department: string;
  location: string;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED';
  headcount: number;
  jobDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateDTO {
  id: string;
  jobOpeningId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  currentStage: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
  blindResumeText?: string | null;
  score?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceReviewDTO {
  id: string;
  employeeId: string;
  reviewerId: string;
  cycleName: string;
  periodStart: string;
  periodEnd: string;
  ratingScore: number;
  feedbackText: string;
  status: 'DRAFT' | 'SUBMITTED' | 'FINALIZED';
  createdAt: string;
  updatedAt: string;
}

export interface AuditRecordDTO {
  id: string;
  prevHash: string;
  hash: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any> | null;
}

export interface CompanySettingsDTO {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string | null;
  country: string;
  fiscalYearStartMonth: number;
  standardWorkingHoursPerDay: number;
  probationDurationMonths: number;
  updatedAt: string;
}

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Service Interfaces
export interface IEmployeeService {
  list(ctx: ActorContext, options?: { department?: string; status?: string; search?: string; limit?: number; offset?: number }): Promise<EmployeeDTO[]>;
  getById(ctx: ActorContext, id: string): Promise<EmployeeDTO | null>;
  create(ctx: ActorContext, data: CreateEmployeeDTO): Promise<EmployeeDTO>;
  update(ctx: ActorContext, id: string, data: Partial<CreateEmployeeDTO>): Promise<EmployeeDTO>;
  terminate(ctx: ActorContext, id: string, reason?: string): Promise<boolean>;
  count(ctx: ActorContext): Promise<number>;
}

export interface IAttendanceService {
  recordPunch(ctx: ActorContext, punch: PunchInput): Promise<AttendanceRecordDTO>;
  syncBatch(ctx: ActorContext, punches: PunchInput[]): Promise<{ synced: number; deduped: number }>;
  listRecords(ctx: ActorContext, employeeId?: string, startDate?: string, endDate?: string): Promise<AttendanceRecordDTO[]>;
}

export interface ILeaveService {
  getBalances(ctx: ActorContext, employeeId: string, year: number): Promise<LeaveBalanceDTO[]>;
  setBalance(ctx: ActorContext, data: { employeeId: string; leaveType: LeaveBalanceDTO['leaveType']; year: number; allocatedDays: number }): Promise<void>;
  createRequest(ctx: ActorContext, data: CreateLeaveRequestDTO): Promise<LeaveRequestDTO>;
  listRequests(ctx: ActorContext, status?: string): Promise<LeaveRequestDTO[]>;
  reviewRequest(ctx: ActorContext, id: string, action: 'APPROVED' | 'REJECTED', notes?: string): Promise<LeaveRequestDTO>;
}

export interface IPayrollService {
  getSalaryStructure(ctx: ActorContext, employeeId: string): Promise<SalaryStructureDTO | null>;
  setSalaryStructure(ctx: ActorContext, data: Omit<SalaryStructureDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalaryStructureDTO>;
  executePayrollRun(ctx: ActorContext, month: number, year: number): Promise<PayrollRunDTO>;
  listRuns(ctx: ActorContext): Promise<PayrollRunDTO[]>;
  getRunItems(ctx: ActorContext, runId: string): Promise<PayrollItemDTO[]>;
}

export interface IPayslipTemplateService {
  getTemplate(ctx: ActorContext): Promise<PayslipTemplateDTO | null>;
  saveTemplate(ctx: ActorContext, template: Omit<PayslipTemplateDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<PayslipTemplateDTO>;
}

export interface ICertificateService {
  createCertificate(ctx: ActorContext, data: Omit<CertificateDTO, 'id' | 'verificationCode' | 'createdAt'>): Promise<CertificateDTO>;
  listCertificates(ctx: ActorContext, employeeId?: string): Promise<CertificateDTO[]>;
}

export interface IPerformanceService {
  createReview(ctx: ActorContext, data: Omit<PerformanceReviewDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<PerformanceReviewDTO>;
  listReviews(ctx: ActorContext, employeeId?: string): Promise<PerformanceReviewDTO[]>;
}

export interface IRecruitmentService {
  createJob(ctx: ActorContext, data: Omit<JobOpeningDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobOpeningDTO>;
  listJobs(ctx: ActorContext, status?: string): Promise<JobOpeningDTO[]>;
  addCandidate(ctx: ActorContext, data: Omit<CandidateDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<CandidateDTO>;
  listCandidates(ctx: ActorContext, jobId?: string): Promise<CandidateDTO[]>;
}

export interface IAuditService {
  logAction(ctx: ActorContext, action: string, entityType: string, entityId: string, metadata?: Record<string, any>): Promise<AuditRecordDTO>;
  listLogs(ctx: ActorContext, options?: { limit?: number; offset?: number }): Promise<AuditRecordDTO[]>;
}

export interface ISettingsService {
  getSettings(ctx: ActorContext): Promise<CompanySettingsDTO | null>;
  updateSettings(ctx: ActorContext, data: Partial<CompanySettingsDTO>): Promise<CompanySettingsDTO>;
}

export interface IUserService {
  listUsers(ctx: ActorContext): Promise<UserDTO[]>;
  createUser(ctx: ActorContext, data: { email: string; fullName: string; role: string; passwordHash: string }): Promise<UserDTO>;
  updateUser(ctx: ActorContext, id: string, data: Partial<{ fullName: string; role: string; isActive: boolean }>): Promise<UserDTO>;
}

export interface ITenantServices {
  employee: IEmployeeService;
  attendance: IAttendanceService;
  leave: ILeaveService;
  payroll: IPayrollService;
  payslipTemplate: IPayslipTemplateService;
  certificate: ICertificateService;
  performance: IPerformanceService;
  recruitment: IRecruitmentService;
  audit: IAuditService;
  settings: ISettingsService;
  user: IUserService;
}
