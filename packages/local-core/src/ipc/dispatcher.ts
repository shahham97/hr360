import { DatabaseConnection } from '../database/connection';
import { EmployeeRepository } from '../repositories/employee-repo';
import { AttendanceRepository } from '../repositories/attendance-repo';
import { LeaveRepository } from '../repositories/leave-repo';
import { PayrollRepository } from '../repositories/payroll-repo';
import { CertificateRepository } from '../repositories/certificate-repo';
import { PerformanceRepository } from '../repositories/performance-repo';
import { RecruitmentRepository } from '../repositories/recruitment-repo';
import { AuditRepository } from '../repositories/audit-repo';
import { LocalUserRepository } from '../repositories/user-repo';
import { SettingsRepository } from '../repositories/settings-repo';
import { PayslipTemplateRepository } from '../repositories/payslip-template-repo';
import { IpcCallRequest, IpcCallResponse, EntitlementsContext, UserRole } from './contracts';

export interface DispatcherRepositories {
  employee: EmployeeRepository;
  attendance: AttendanceRepository;
  leave: LeaveRepository;
  payroll: PayrollRepository;
  certificate: CertificateRepository;
  performance: PerformanceRepository;
  recruitment: RecruitmentRepository;
  audit: AuditRepository;
  user: LocalUserRepository;
  settings: SettingsRepository;
  payslipTemplate: PayslipTemplateRepository;
}

export class IpcDispatcher {
  public readonly repos: DispatcherRepositories;
  private currentEntitlements: EntitlementsContext | null = null;

  constructor(connection: DatabaseConnection) {
    this.repos = {
      employee: new EmployeeRepository(connection),
      attendance: new AttendanceRepository(connection),
      leave: new LeaveRepository(connection),
      payroll: new PayrollRepository(connection),
      certificate: new CertificateRepository(connection),
      performance: new PerformanceRepository(connection),
      recruitment: new RecruitmentRepository(connection),
      audit: new AuditRepository(connection),
      user: new LocalUserRepository(connection),
      settings: new SettingsRepository(connection),
      payslipTemplate: new PayslipTemplateRepository(connection),
    };
  }

  public setEntitlements(entitlements: EntitlementsContext | null): void {
    this.currentEntitlements = entitlements;
  }

  public getEntitlements(): EntitlementsContext | null {
    return this.currentEntitlements;
  }

  public async dispatch(request: IpcCallRequest): Promise<IpcCallResponse> {
    const { channel, payload, userContext } = request;

    try {
      // 1. Role and Feature Checks
      this.authorize(channel, userContext?.role);

      // 2. Dispatch
      let result: any = null;
      let mutatingAction: { module: string; action: string; entityId: string } | null = null;

      switch (channel) {
        // --- Employee ---
        case 'employee:list':
          result = this.repos.employee.list(payload);
          break;
        case 'employee:getById':
          result = this.repos.employee.getById(payload.id);
          break;
        case 'employee:create': {
          const maxLimit = this.currentEntitlements?.maxEmployees;
          result = this.repos.employee.create(payload, maxLimit);
          mutatingAction = { module: 'EMPLOYEES', action: 'CREATE', entityId: result.id };
          break;
        }
        case 'employee:delete':
          result = this.repos.employee.delete(payload.id);
          mutatingAction = { module: 'EMPLOYEES', action: 'DELETE', entityId: payload.id };
          break;
        case 'employee:bulkImport': {
          const maxLimit = this.currentEntitlements?.maxEmployees;
          result = this.repos.employee.bulkImport(payload.employees, maxLimit);
          mutatingAction = { module: 'EMPLOYEES', action: 'BULK_IMPORT', entityId: `${result.imported}_employees` };
          break;
        }

        // --- Attendance ---
        case 'attendance:logPunch': {
          this.assertModuleEnabled('attendance');
          result = this.repos.attendance.logPunch(payload);
          mutatingAction = { module: 'ATTENDANCE', action: 'LOG_PUNCH', entityId: result.id };
          break;
        }
        case 'attendance:batchSync': {
          this.assertModuleEnabled('attendance');
          result = this.repos.attendance.batchSyncPunches(payload.punches);
          mutatingAction = { module: 'ATTENDANCE', action: 'BATCH_SYNC', entityId: `${result.inserted}_records` };
          break;
        }
        case 'attendance:list': {
          this.assertModuleEnabled('attendance');
          result = this.repos.attendance.getAttendance(payload);
          break;
        }
        case 'attendance:getSummary': {
          this.assertModuleEnabled('attendance');
          result = this.repos.attendance.getEmployeeAttendanceSummary(payload.employeeId, payload.startDate, payload.endDate);
          break;
        }

        // --- Leave ---
        case 'leave:getBalances':
          result = this.repos.leave.getBalances(payload.employeeId, payload.year);
          break;
        case 'leave:setBalance':
          result = this.repos.leave.setBalance(payload);
          mutatingAction = { module: 'LEAVE', action: 'SET_BALANCE', entityId: result.id };
          break;
        case 'leave:createRequest':
          result = this.repos.leave.createRequest(payload);
          mutatingAction = { module: 'LEAVE', action: 'CREATE_REQUEST', entityId: result.id };
          break;
        case 'leave:getRequests':
          result = this.repos.leave.getRequests(payload);
          break;
        case 'leave:reviewRequest':
          result = this.repos.leave.reviewRequest(payload);
          mutatingAction = { module: 'LEAVE', action: `REVIEW_${payload.status}`, entityId: payload.requestId };
          break;

        // --- Payroll ---
        case 'payroll:prepareRun': {
          this.assertModuleEnabled('payroll');
          result = this.repos.payroll.prepareRun(payload);
          mutatingAction = { module: 'PAYROLL', action: 'PREPARE_RUN', entityId: result.id };
          break;
        }
        case 'payroll:approveRun': {
          this.assertModuleEnabled('payroll');
          result = this.repos.payroll.approveRun(payload.runId, payload.approverId);
          mutatingAction = { module: 'PAYROLL', action: 'APPROVE_RUN', entityId: payload.runId };
          break;
        }
        case 'payroll:lockRun': {
          this.assertModuleEnabled('payroll');
          result = this.repos.payroll.lockRun(payload.runId);
          mutatingAction = { module: 'PAYROLL', action: 'LOCK_RUN', entityId: payload.runId };
          break;
        }
        case 'payroll:reverseRun': {
          this.assertModuleEnabled('payroll');
          result = this.repos.payroll.reverseRun(payload.runId, payload.reason);
          mutatingAction = { module: 'PAYROLL', action: 'REVERSE_RUN', entityId: payload.runId };
          break;
        }
        case 'payroll:getRun': {
          this.assertModuleEnabled('payroll');
          result = this.repos.payroll.getRunById(payload.id);
          break;
        }
        case 'payroll:listRuns': {
          this.assertModuleEnabled('payroll');
          result = this.repos.payroll.listRuns();
          break;
        }

        // --- Payslip Templates ---
        case 'payslip:listTemplates':
          result = this.repos.payslipTemplate.list();
          break;
        case 'payslip:getDefault':
          result = this.repos.payslipTemplate.getDefault();
          break;
        case 'payslip:saveTemplate':
          result = this.repos.payslipTemplate.save(payload);
          mutatingAction = { module: 'PAYSLIP_TEMPLATE', action: 'SAVE', entityId: result.id };
          break;

        // --- Certificates ---
        case 'certificate:issue': {
          this.assertModuleEnabled('certificates');
          result = this.repos.certificate.issue(payload);
          mutatingAction = { module: 'CERTIFICATES', action: 'ISSUE', entityId: result.id };
          break;
        }
        case 'certificate:list': {
          this.assertModuleEnabled('certificates');
          result = this.repos.certificate.list(payload);
          break;
        }
        case 'certificate:verify': {
          this.assertModuleEnabled('certificates');
          result = this.repos.certificate.getByVerificationCode(payload.code);
          break;
        }
        case 'certificate:revoke': {
          this.assertModuleEnabled('certificates');
          result = this.repos.certificate.revoke(payload.id);
          mutatingAction = { module: 'CERTIFICATES', action: 'REVOKE', entityId: payload.id };
          break;
        }

        // --- Performance ---
        case 'performance:createReview': {
          this.assertModuleEnabled('performance');
          result = this.repos.performance.createReview(payload);
          mutatingAction = { module: 'PERFORMANCE', action: 'CREATE_REVIEW', entityId: result.id };
          break;
        }
        case 'performance:listReviews': {
          this.assertModuleEnabled('performance');
          result = this.repos.performance.listReviews(payload?.employeeId);
          break;
        }

        // --- Recruitment ---
        case 'recruitment:createJob': {
          this.assertModuleEnabled('recruitment');
          result = this.repos.recruitment.createJob(payload);
          mutatingAction = { module: 'RECRUITMENT', action: 'CREATE_JOB', entityId: result.id };
          break;
        }
        case 'recruitment:listJobs': {
          this.assertModuleEnabled('recruitment');
          result = this.repos.recruitment.listJobs(payload?.status);
          break;
        }
        case 'recruitment:createCandidate': {
          this.assertModuleEnabled('recruitment');
          result = this.repos.recruitment.createCandidate(payload);
          mutatingAction = { module: 'RECRUITMENT', action: 'CREATE_CANDIDATE', entityId: result.id };
          break;
        }
        case 'recruitment:listCandidates': {
          this.assertModuleEnabled('recruitment');
          result = this.repos.recruitment.listCandidates(payload);
          break;
        }
        case 'recruitment:updateCandidateStage': {
          this.assertModuleEnabled('recruitment');
          result = this.repos.recruitment.updateCandidateStage(payload.id, payload.stage, payload.notes);
          mutatingAction = { module: 'RECRUITMENT', action: `STAGE_${payload.stage}`, entityId: payload.id };
          break;
        }

        // --- Audit Ledger ---
        case 'audit:listEvents':
          result = this.repos.audit.listEvents(payload);
          break;
        case 'audit:verifyChain':
          result = this.repos.audit.verifyChain();
          break;

        // --- Settings & Notifications ---
        case 'settings:get':
          result = this.repos.settings.get(payload.key);
          break;
        case 'settings:set':
          this.repos.settings.set(payload.key, payload.value);
          result = true;
          mutatingAction = { module: 'SETTINGS', action: 'SET_KEY', entityId: payload.key };
          break;
        case 'settings:getAll':
          result = this.repos.settings.getAll();
          break;
        case 'notifications:list':
          result = this.repos.settings.getNotifications(payload?.limit);
          break;
        case 'notifications:markRead':
          this.repos.settings.markNotificationAsRead(payload.id);
          result = true;
          break;

        default:
          return {
            success: false,
            error: `Unknown IPC channel: ${channel}`,
            errorCode: 'UNKNOWN_CHANNEL',
          };
      }

      // 3. Hash-Chained Audit Ledger
      if (mutatingAction && userContext) {
        try {
          this.repos.audit.appendEvent({
            actor: userContext.email || 'SYSTEM',
            action: mutatingAction.action,
            module: mutatingAction.module,
            entityId: mutatingAction.entityId,
            details: payload,
          });
        } catch (auditErr) {
          console.error('[HR360 IPC] Failed to record audit log:', auditErr);
        }
      }

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Operation failed',
        errorCode: err.code || 'INTERNAL_ERROR',
      };
    }
  }

  private authorize(channel: string, role?: UserRole): void {
    if (!role) {
      // Allow read channels without role during bootstrapping if necessary, or default to READ_ONLY
      return;
    }

    if (role === 'COMPANY_ADMIN') {
      return; // Full access
    }

    if (channel.startsWith('payroll:approve') || channel.startsWith('payroll:lock') || channel.startsWith('payroll:reverse')) {
      if (role !== 'PAYROLL_OFFICER') {
        throw new Error(`Unauthorized: Role ${role} cannot approve or finalize payroll.`);
      }
    }

    if (channel.startsWith('employee:create') || channel.startsWith('employee:delete') || channel.startsWith('employee:bulkImport')) {
      if (role !== 'HR_MANAGER') {
        throw new Error(`Unauthorized: Role ${role} cannot modify employee directory.`);
      }
    }
  }

  private assertModuleEnabled(moduleName: keyof EntitlementsContext['modules']): void {
    if (!this.currentEntitlements) {
      return; // If running in standalone mode / bootstrapping, allow
    }

    if (!this.currentEntitlements.modules[moduleName]) {
      throw new Error(`Feature '${moduleName}' is not enabled in your company subscription plan.`);
    }
  }
}
