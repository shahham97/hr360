import { DatabaseConnection } from '@hr360/local-core';
import {
  EmployeeRepository,
  AttendanceRepository,
  LeaveRepository,
  PayrollRepository,
  PayslipTemplateRepository,
  CertificateRepository,
  PerformanceRepository,
  RecruitmentRepository,
  AuditRepository,
  SettingsRepository,
  LocalUserRepository,
  deduplicatePunches,
} from '@hr360/local-core';
import {
  ITenantServices,
  IEmployeeService,
  IAttendanceService,
  ILeaveService,
  IPayrollService,
  IPayslipTemplateService,
  ICertificateService,
  IPerformanceService,
  IRecruitmentService,
  IAuditService,
  ISettingsService,
  IUserService,
  ActorContext,
  EmployeeDTO,
  CreateEmployeeDTO,
  AttendanceRecordDTO,
  PunchInput,
  LeaveBalanceDTO,
  LeaveRequestDTO,
  CreateLeaveRequestDTO,
  SalaryStructureDTO,
  PayrollRunDTO,
  PayrollItemDTO,
  PayslipTemplateDTO,
  CertificateDTO,
  PerformanceReviewDTO,
  JobOpeningDTO,
  CandidateDTO,
  AuditRecordDTO,
  CompanySettingsDTO,
  UserDTO,
} from '../../types';

export class SqliteTenantServices implements ITenantServices {
  private readonly conn: DatabaseConnection;
  public readonly employee: IEmployeeService;
  public readonly attendance: IAttendanceService;
  public readonly leave: ILeaveService;
  public readonly payroll: IPayrollService;
  public readonly payslipTemplate: IPayslipTemplateService;
  public readonly certificate: ICertificateService;
  public readonly performance: IPerformanceService;
  public readonly recruitment: IRecruitmentService;
  public readonly audit: IAuditService;
  public readonly settings: ISettingsService;
  public readonly user: IUserService;

  constructor(connection: DatabaseConnection) {
    this.conn = connection;
    const empRepo = new EmployeeRepository(connection);
    const attRepo = new AttendanceRepository(connection);
    const leaveRepo = new LeaveRepository(connection);
    const payRepo = new PayrollRepository(connection);
    const tplRepo = new PayslipTemplateRepository(connection);
    const certRepo = new CertificateRepository(connection);
    const perfRepo = new PerformanceRepository(connection);
    const recRepo = new RecruitmentRepository(connection);
    const auditRepo = new AuditRepository(connection);
    const setRepo = new SettingsRepository(connection);
    const userRepo = new LocalUserRepository(connection);

    this.employee = {
      async list(_ctx: ActorContext, options?: any): Promise<EmployeeDTO[]> {
        const res = empRepo.list(options);
        return res.items.map((r: any) => ({
          id: r.id,
          employeeCode: r.employeeCode,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          phone: r.phone,
          department: r.department,
          designation: r.designation,
          branch: r.branch,
          employmentType: r.employmentType,
          baseSalaryMinor: r.baseSalaryMinor,
          nationalId: r.nationalId,
          dateOfBirth: r.dateOfBirth,
          gender: r.gender,
          joiningDate: r.joiningDate,
          probationEndDate: r.probationEndDate,
          contractEndDate: r.contractEndDate,
          status: r.status,
          address: r.address,
          emergencyContactName: r.emergencyContactName,
          emergencyContactPhone: r.emergencyContactPhone,
          bankAccountNumber: r.bankAccountNumber,
          bankName: r.bankName,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      },
      async getById(_ctx: ActorContext, id: string): Promise<EmployeeDTO | null> {
        return empRepo.getById(id) as any;
      },
      async create(_ctx: ActorContext, data: CreateEmployeeDTO): Promise<EmployeeDTO> {
        const input: any = {
          ...data,
          probationEndDate: data.probationEndDate || undefined,
          contractEndDate: data.contractEndDate || undefined,
        };
        return empRepo.create(input) as any;
      },
      async update(_ctx: ActorContext, id: string, data: Partial<CreateEmployeeDTO>): Promise<EmployeeDTO> {
        const raw = connection.getRawDb();
        const now = new Date().toISOString();
        if (data.status) {
          raw.prepare(`UPDATE employees SET status = ?, updated_at = ? WHERE id = ?`).run(data.status, now, id);
        }
        return empRepo.getById(id) as any;
      },
      async terminate(_ctx: ActorContext, id: string): Promise<boolean> {
        const raw = connection.getRawDb();
        const now = new Date().toISOString();
        const res = raw.prepare(`UPDATE employees SET status = 'TERMINATED', updated_at = ? WHERE id = ?`).run(now, id);
        return res.changes > 0;
      },
      async count(_ctx: ActorContext): Promise<number> {
        return empRepo.count('ACTIVE');
      },
    };

    this.attendance = {
      async recordPunch(_ctx: ActorContext, punch: PunchInput): Promise<AttendanceRecordDTO> {
        return attRepo.recordPunch({
          employeeId: punch.employeeId,
          punchTimeIso: punch.punchTime,
          punchType: punch.punchType,
          terminalId: punch.terminalId,
          verifiedMode: punch.verifiedMode,
        }) as any;
      },
      async syncBatch(_ctx: ActorContext, punches: PunchInput[]): Promise<{ synced: number; deduped: number }> {
        const formatted = punches.map((p) => ({
          employeeId: p.employeeId,
          punchTimeIso: p.punchTime,
          punchType: p.punchType,
          terminalId: p.terminalId,
          verifiedMode: p.verifiedMode,
        }));
        const deduped = deduplicatePunches(formatted);
        for (const p of deduped) {
          attRepo.recordPunch(p);
        }
        return { synced: deduped.length, deduped: punches.length - deduped.length };
      },
      async listRecords(_ctx: ActorContext, employeeId?: string, _startDate?: string, _endDate?: string): Promise<AttendanceRecordDTO[]> {
        const res = attRepo.listRecent({ employeeId, limit: 100 });
        return res.items as any;
      },
    };

    this.leave = {
      async getBalances(_ctx: ActorContext, employeeId: string, year: number): Promise<LeaveBalanceDTO[]> {
        return leaveRepo.getBalances(employeeId, year) as any;
      },
      async setBalance(_ctx: ActorContext, data: any): Promise<void> {
        leaveRepo.setBalance(data);
      },
      async createRequest(_ctx: ActorContext, data: CreateLeaveRequestDTO): Promise<LeaveRequestDTO> {
        return leaveRepo.createRequest(data) as any;
      },
      async listRequests(_ctx: ActorContext, status?: string): Promise<LeaveRequestDTO[]> {
        const res = leaveRepo.getRequests({ status });
        return res.items as any;
      },
      async reviewRequest(_ctx: ActorContext, id: string, action: 'APPROVED' | 'REJECTED', notes?: string): Promise<LeaveRequestDTO> {
        return leaveRepo.reviewRequest({ requestId: id, status: action, actionNotes: notes, approvedBy: _ctx.userId }) as any;
      },
    };

    this.payroll = {
      async getSalaryStructure(_ctx: ActorContext, employeeId: string): Promise<SalaryStructureDTO | null> {
        const raw = connection.getRawDb();
        const row = raw.prepare(`SELECT * FROM salary_structures WHERE employee_id = ?`).get(employeeId) as any;
        if (!row) return null;
        return {
          id: row.id,
          employeeId: row.employee_id,
          baseSalaryMinor: Number(row.base_salary_minor),
          houseRentMinor: Number(row.house_rent_minor || 0),
          medicalAllowanceMinor: Number(row.medical_allowance_minor || 0),
          conveyanceMinor: Number(row.conveyance_minor || 0),
          specialAllowanceMinor: Number(row.special_allowance_minor || 0),
          providentFundRate: Number(row.provident_fund_rate || 0.0833),
          taxExemptMinor: Number(row.tax_exempt_minor || 0),
          effectiveFrom: row.effective_from,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      },
      async setSalaryStructure(_ctx: ActorContext, data: any): Promise<SalaryStructureDTO> {
        const raw = connection.getRawDb();
        const existing = raw.prepare(`SELECT id FROM salary_structures WHERE employee_id = ?`).get(data.employeeId) as any;
        const now = new Date().toISOString();
        if (existing) {
          raw.prepare(`
            UPDATE salary_structures SET
              base_salary_minor = ?, house_rent_minor = ?, medical_allowance_minor = ?,
              conveyance_minor = ?, special_allowance_minor = ?, provident_fund_rate = ?,
              tax_exempt_minor = ?, effective_from = ?, updated_at = ?
            WHERE id = ?
          `).run(
            data.baseSalaryMinor,
            data.houseRentMinor || 0,
            data.medicalAllowanceMinor || 0,
            data.conveyanceMinor || 0,
            data.specialAllowanceMinor || 0,
            data.providentFundRate || 0.0833,
            data.taxExemptMinor || 0,
            data.effectiveFrom || now,
            now,
            existing.id
          );
          return { id: existing.id, ...data, createdAt: now, updatedAt: now };
        } else {
          const cryptoMod = require('node:crypto');
          const id = cryptoMod.randomUUID();
          raw.prepare(`
            INSERT INTO salary_structures (
              id, employee_id, base_salary_minor, house_rent_minor, medical_allowance_minor,
              conveyance_minor, special_allowance_minor, provident_fund_rate, tax_exempt_minor,
              effective_from, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            data.employeeId,
            data.baseSalaryMinor,
            data.houseRentMinor || 0,
            data.medicalAllowanceMinor || 0,
            data.conveyanceMinor || 0,
            data.specialAllowanceMinor || 0,
            data.providentFundRate || 0.0833,
            data.taxExemptMinor || 0,
            data.effectiveFrom || now,
            now,
            now
          );
          return { id, ...data, createdAt: now, updatedAt: now };
        }
      },
      async executePayrollRun(_ctx: ActorContext, month: number, year: number): Promise<PayrollRunDTO> {
        const raw = connection.getRawDb();
        const activeEmps = raw.prepare(`SELECT id, base_salary_minor FROM employees WHERE status = 'ACTIVE'`).all() as any[];

        const items = activeEmps.map((e) => ({
          employeeId: e.id,
          baseSalaryMinor: e.base_salary_minor,
          daysWorked: 30,
          daysInMonth: 30,
        }));

        const prepared = payRepo.prepareRun({
          periodMonth: month,
          periodYear: year,
          preparedBy: _ctx.userId,
          items,
        });

        const checkerId = _ctx.userId === 'SYSTEM' ? 'SYSTEM_CHECKER' : `${_ctx.userId}-approver`;
        const approved = payRepo.approveRun(prepared.id, checkerId);

        // Fetch tax and contributions total
        const runItems = raw.prepare(`SELECT * FROM payroll_items WHERE payroll_run_id = ?`).all(approved.id) as any[];
        let totalTax = 0;
        let totalEobi = 0;
        let totalPf = 0;
        for (const item of runItems) {
          totalTax += item.tax_minor || 0;
          totalEobi += item.eobi_employee_minor || 0;
          totalPf += item.provident_fund_minor || 0;
        }

        return {
          id: approved.id,
          month: approved.periodMonth,
          year: approved.periodYear,
          status: approved.status as any,
          totalGrossMinor: approved.totalGrossMinor,
          totalDeductionsMinor: approved.totalDeductionsMinor,
          totalNetMinor: approved.totalNetMinor,
          totalTaxMinor: totalTax,
          totalEobiMinor: totalEobi,
          totalProvidentFundMinor: totalPf,
          employeeCount: activeEmps.length,
          processedBy: approved.preparedBy,
          createdAt: approved.createdAt,
          updatedAt: approved.updatedAt,
        };
      },
      async listRuns(_ctx: ActorContext): Promise<PayrollRunDTO[]> {
        const runs = payRepo.listRuns();
        return runs.map((r: any) => ({
          id: r.id,
          month: r.periodMonth,
          year: r.periodYear,
          status: r.status as any,
          totalGrossMinor: r.totalGrossMinor,
          totalDeductionsMinor: r.totalDeductionsMinor,
          totalNetMinor: r.totalNetMinor,
          totalTaxMinor: 0,
          totalEobiMinor: 0,
          totalProvidentFundMinor: 0,
          employeeCount: 0,
          processedBy: r.preparedBy,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      },
      async getRunItems(_ctx: ActorContext, runId: string): Promise<PayrollItemDTO[]> {
        const raw = connection.getRawDb();
        const rows = raw.prepare(`SELECT * FROM payroll_items WHERE payroll_run_id = ?`).all(runId) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          payrollRunId: r.payroll_run_id,
          employeeId: r.employee_id,
          baseSalaryMinor: r.base_salary_minor,
          allowancesMinor: r.allowances_minor,
          grossSalaryMinor: r.gross_pay_minor,
          taxDeductionMinor: r.tax_minor,
          eobiEmployeeMinor: r.eobi_employee_minor,
          eobiEmployerMinor: r.eobi_employer_minor,
          providentFundEmployeeMinor: r.provident_fund_minor,
          providentFundEmployerMinor: r.provident_fund_minor,
          unpaidLeaveDeductionMinor: 0,
          otherDeductionsMinor: r.other_deductions_minor,
          netSalaryMinor: r.net_pay_minor,
          status: 'PENDING',
          createdAt: r.created_at,
        }));
      },
    };

    this.payslipTemplate = {
      async getTemplate(_ctx: ActorContext): Promise<PayslipTemplateDTO | null> {
        return tplRepo.getDefault() as any;
      },
      async saveTemplate(_ctx: ActorContext, template: any): Promise<PayslipTemplateDTO> {
        return tplRepo.save(template) as any;
      },
    };

    this.certificate = {
      async createCertificate(_ctx: ActorContext, data: any): Promise<CertificateDTO> {
        const issued = certRepo.issue({
          employeeId: data.employeeId,
          certificateType: data.certificateType,
          title: data.content || 'Certificate of Employment',
          detailsJson: JSON.stringify(data),
          issueDate: data.issueDate,
        });
        return {
          id: issued.id,
          employeeId: issued.employeeId,
          certificateType: issued.certificateType as any,
          issueDate: issued.issueDate,
          verificationCode: issued.verificationCode,
          issuedBy: _ctx.userId,
          content: issued.title,
          createdAt: issued.createdAt,
        };
      },
      async listCertificates(_ctx: ActorContext, employeeId?: string): Promise<CertificateDTO[]> {
        const list = certRepo.list({ employeeId });
        return list.items.map((c: any) => ({
          id: c.id,
          employeeId: c.employeeId,
          certificateType: c.certificateType as any,
          issueDate: c.issueDate,
          verificationCode: c.verificationCode,
          issuedBy: _ctx.userId,
          content: c.title,
          createdAt: c.createdAt,
        }));
      },
    };

    this.performance = {
      async createReview(_ctx: ActorContext, data: any): Promise<PerformanceReviewDTO> {
        const review = perfRepo.createReview({
          employeeId: data.employeeId,
          reviewerId: _ctx.userId,
          reviewCycle: data.cycleName || 'ANNUAL',
          rating: data.ratingScore ?? 5,
          strengths: data.feedbackText,
          areasForGrowth: '',
          goalsJson: undefined,
          status: 'COMPLETED',
        });
        return {
          id: review.id,
          employeeId: review.employeeId,
          reviewerId: review.reviewerId,
          cycleName: review.reviewCycle,
          periodStart: review.createdAt,
          periodEnd: review.createdAt,
          ratingScore: review.rating,
          feedbackText: review.strengths || '',
          status: review.status as any,
          createdAt: review.createdAt,
          updatedAt: review.createdAt,
        };
      },
      async listReviews(_ctx: ActorContext, employeeId?: string): Promise<PerformanceReviewDTO[]> {
        const reviews = perfRepo.listReviews(employeeId);
        return reviews.map((r: any) => ({
          id: r.id,
          employeeId: r.employeeId,
          reviewerId: r.reviewerId,
          cycleName: r.reviewCycle,
          periodStart: r.createdAt,
          periodEnd: r.createdAt,
          ratingScore: r.rating,
          feedbackText: r.strengths || '',
          status: r.status as any,
          createdAt: r.createdAt,
          updatedAt: r.createdAt,
        }));
      },
    };

    this.recruitment = {
      async createJob(_ctx: ActorContext, data: any): Promise<JobOpeningDTO> {
        const job = recRepo.createJob({
          jobTitle: data.title,
          department: data.department,
          branch: data.location || 'HQ',
          openingsCount: data.headcount || 1,
          status: data.status || 'OPEN',
          minExperienceYears: 0,
          requirementsJson: JSON.stringify({ description: data.jobDescription }),
        });
        return {
          id: job.id,
          title: job.jobTitle,
          department: job.department,
          location: job.branch,
          status: job.status as any,
          headcount: job.openingsCount,
          jobDescription: data.jobDescription || '',
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        };
      },
      async listJobs(_ctx: ActorContext, status?: string): Promise<JobOpeningDTO[]> {
        const jobs = recRepo.listJobs(status);
        return jobs.map((j: any) => ({
          id: j.id,
          title: j.jobTitle,
          department: j.department,
          location: j.branch,
          status: j.status as any,
          headcount: j.openingsCount,
          jobDescription: j.requirementsJson,
          createdAt: j.createdAt,
          updatedAt: j.updatedAt,
        }));
      },
      async addCandidate(_ctx: ActorContext, data: any): Promise<CandidateDTO> {
        const cand = recRepo.createCandidate({
          jobId: data.jobOpeningId,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          notes: data.blindResumeText,
        });
        return {
          id: cand.id,
          jobOpeningId: cand.jobId,
          fullName: cand.fullName,
          email: cand.email,
          phone: cand.phone,
          currentStage: cand.recruitmentStage as any,
          blindResumeText: cand.notes,
          score: cand.matchScore,
          notes: cand.notes,
          createdAt: cand.createdAt,
          updatedAt: cand.updatedAt,
        };
      },
      async listCandidates(_ctx: ActorContext, jobId?: string): Promise<CandidateDTO[]> {
        const cands = recRepo.listCandidates({ jobId });
        return cands.map((c: any) => ({
          id: c.id,
          jobOpeningId: c.jobId,
          fullName: c.fullName,
          email: c.email,
          phone: c.phone,
          currentStage: c.recruitmentStage as any,
          blindResumeText: c.notes,
          score: c.matchScore,
          notes: c.notes,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
      },
    };

    this.audit = {
      async logAction(_ctx: ActorContext, action: string, entityType: string, entityId: string, metadata?: any): Promise<AuditRecordDTO> {
        const record = auditRepo.appendEvent({
          actor: _ctx.userId,
          action,
          module: entityType,
          entityId,
          details: metadata,
        });
        return {
          id: record.id,
          prevHash: record.prevHash,
          hash: record.hash,
          timestamp: record.timestamp,
          actorId: record.actor,
          actorRole: _ctx.role,
          action: record.action,
          entityType: record.module,
          entityId: record.entityId,
          metadata,
        };
      },
      async listLogs(_ctx: ActorContext, options?: any): Promise<AuditRecordDTO[]> {
        const logs = auditRepo.listEvents(options);
        return logs.items.map((l: any) => ({
          id: l.id,
          prevHash: l.prevHash,
          hash: l.hash,
          timestamp: l.timestamp,
          actorId: l.actor,
          actorRole: _ctx.role,
          action: l.action,
          entityType: l.module,
          entityId: l.entityId,
          metadata: l.details,
        }));
      },
    };

    this.settings = {
      async getSettings(_ctx: ActorContext): Promise<CompanySettingsDTO | null> {
        const raw = connection.getRawDb();
        const row = raw.prepare(`SELECT * FROM company_settings LIMIT 1`).get() as any;
        if (!row) return null;
        return {
          id: row.id,
          companyName: row.company_name,
          contactEmail: row.contact_email,
          contactPhone: row.contact_phone,
          country: row.country,
          fiscalYearStartMonth: row.fiscal_year_start_month,
          standardWorkingHoursPerDay: row.standard_working_hours_per_day,
          probationDurationMonths: row.probation_duration_months,
          updatedAt: row.updated_at,
        };
      },
      async updateSettings(_ctx: ActorContext, data: any): Promise<CompanySettingsDTO> {
        const cur = await this.getSettings(_ctx);
        const raw = connection.getRawDb();
        const now = new Date().toISOString();
        if (cur) {
          raw.prepare(`
            UPDATE company_settings SET
              company_name = ?, contact_email = ?, contact_phone = ?, country = ?,
              fiscal_year_start_month = ?, standard_working_hours_per_day = ?,
              probation_duration_months = ?, updated_at = ?
            WHERE id = ?
          `).run(
            data.companyName ?? cur.companyName,
            data.contactEmail ?? cur.contactEmail,
            data.contactPhone ?? cur.contactPhone,
            data.country ?? cur.country,
            data.fiscalYearStartMonth ?? cur.fiscalYearStartMonth,
            data.standardWorkingHoursPerDay ?? cur.standardWorkingHoursPerDay,
            data.probationDurationMonths ?? cur.probationDurationMonths,
            now,
            cur.id
          );
        }
        return (await this.getSettings(_ctx))!;
      },
    };

    this.user = {
      async listUsers(_ctx: ActorContext): Promise<UserDTO[]> {
        const raw = connection.getRawDb();
        const rows = raw.prepare(`SELECT * FROM local_users ORDER BY created_at ASC`).all() as any[];
        return rows.map((r: any) => ({
          id: r.id,
          email: r.email,
          fullName: r.full_name,
          role: r.role,
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },
      async createUser(_ctx: ActorContext, data: any): Promise<UserDTO> {
        const u = userRepo.createUser(data);
        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      },
      async updateUser(_ctx: ActorContext, id: string, data: any): Promise<UserDTO> {
        const raw = connection.getRawDb();
        const now = new Date().toISOString();
        if (data.fullName) {
          raw.prepare(`UPDATE local_users SET full_name = ?, updated_at = ? WHERE id = ?`).run(data.fullName, now, id);
        }
        if (data.role) {
          raw.prepare(`UPDATE local_users SET role = ?, updated_at = ? WHERE id = ?`).run(data.role, now, id);
        }
        if (data.isActive !== undefined) {
          raw.prepare(`UPDATE local_users SET is_active = ?, updated_at = ? WHERE id = ?`).run(data.isActive ? 1 : 0, now, id);
        }
        const u = userRepo.findById(id)!;
        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      },
    };
  }
}
