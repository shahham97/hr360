export type UserRole =
  | 'COMPANY_ADMIN'
  | 'HR_MANAGER'
  | 'PAYROLL_OFFICER'
  | 'RECRUITER'
  | 'LINE_MANAGER'
  | 'READ_ONLY';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
}

export interface EntitlementsContext {
  companyId: string;
  maxEmployees: number;
  modules: {
    payroll: boolean;
    attendance: boolean;
    recruitment: boolean;
    performance: boolean;
    certificates: boolean;
  };
  expiresAt: string;
}

export interface IpcCallRequest<T = any> {
  channel: string;
  payload: T;
  userContext?: UserContext;
}

export interface IpcCallResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}
