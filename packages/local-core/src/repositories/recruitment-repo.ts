import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';

export interface JobOpeningEntity {
  id: string;
  jobTitle: string;
  department: string;
  branch: string;
  openingsCount: number;
  status: 'OPEN' | 'HOLD' | 'CLOSED';
  minExperienceYears: number;
  salaryRange?: string | null;
  requirementsJson: string;
  applicationDeadline?: string | null;
  createdAt: string;
  updatedAt: string;
  candidateCount?: number;
}

export interface CandidateEntity {
  id: string;
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  experienceYears: number;
  education?: string | null;
  skillsJson?: string | null;
  cvFileName?: string | null;
  matchScore: number;
  recruitmentStage: 'APPLIED' | 'SHORTLISTED' | 'TECHNICAL_ASSESSMENT' | 'INTERVIEW_SCHEDULED' | 'OFFERED' | 'HIRED' | 'REJECTED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  jobTitle?: string;
}

export class RecruitmentRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public createJob(input: {
    jobTitle: string;
    department: string;
    branch: string;
    openingsCount?: number;
    status?: 'OPEN' | 'HOLD' | 'CLOSED';
    minExperienceYears?: number;
    salaryRange?: string;
    requirementsJson: string;
    applicationDeadline?: string;
  }): JobOpeningEntity {
    const raw = this.connection.getRawDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const openings = input.openingsCount ?? 1;
    const status = input.status ?? 'OPEN';
    const minExp = input.minExperienceYears ?? 0;

    raw.prepare(`
      INSERT INTO job_openings (
        id, job_title, department, branch, openings_count, status,
        min_experience_years, salary_range, requirements_json, application_deadline,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.jobTitle,
      input.department,
      input.branch,
      openings,
      status,
      minExp,
      input.salaryRange ?? null,
      input.requirementsJson,
      input.applicationDeadline ?? null,
      now,
      now
    );

    return {
      id,
      jobTitle: input.jobTitle,
      department: input.department,
      branch: input.branch,
      openingsCount: openings,
      status,
      minExperienceYears: minExp,
      salaryRange: input.salaryRange ?? null,
      requirementsJson: input.requirementsJson,
      applicationDeadline: input.applicationDeadline ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  public listJobs(status?: string): JobOpeningEntity[] {
    const raw = this.connection.getRawDb();
    const whereClause = status && status !== 'ALL' ? 'WHERE j.status = ?' : '';
    const params = status && status !== 'ALL' ? [status] : [];

    const rows = raw.prepare(`
      SELECT j.*, COUNT(c.id) as candidate_count
      FROM job_openings j
      LEFT JOIN candidates c ON j.id = c.job_id
      ${whereClause}
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `).all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      jobTitle: r.job_title,
      department: r.department,
      branch: r.branch,
      openingsCount: r.openings_count,
      status: r.status,
      minExperienceYears: r.min_experience_years,
      salaryRange: r.salary_range,
      requirementsJson: r.requirements_json,
      applicationDeadline: r.application_deadline,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      candidateCount: r.candidate_count,
    }));
  }

  public createCandidate(input: {
    jobId: string;
    fullName: string;
    email: string;
    phone: string;
    experienceYears?: number;
    education?: string;
    skillsJson?: string;
    cvFileName?: string;
    matchScore?: number;
    notes?: string;
  }): CandidateEntity {
    const raw = this.connection.getRawDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    raw.prepare(`
      INSERT INTO candidates (
        id, job_id, full_name, email, phone, experience_years,
        education, skills_json, cv_file_name, match_score, recruitment_stage,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPLIED', ?, ?, ?)
    `).run(
      id,
      input.jobId,
      input.fullName,
      input.email,
      input.phone,
      input.experienceYears ?? 0,
      input.education ?? null,
      input.skillsJson ?? null,
      input.cvFileName ?? null,
      input.matchScore ?? 0,
      input.notes ?? null,
      now,
      now
    );

    return {
      id,
      jobId: input.jobId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      experienceYears: input.experienceYears ?? 0,
      education: input.education ?? null,
      skillsJson: input.skillsJson ?? null,
      cvFileName: input.cvFileName ?? null,
      matchScore: input.matchScore ?? 0,
      recruitmentStage: 'APPLIED',
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  public listCandidates(options?: {
    jobId?: string;
    stage?: string;
  }): CandidateEntity[] {
    const raw = this.connection.getRawDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (options?.jobId) {
      conditions.push('c.job_id = ?');
      params.push(options.jobId);
    }
    if (options?.stage && options.stage !== 'ALL') {
      conditions.push('c.recruitment_stage = ?');
      params.push(options.stage);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = raw.prepare(`
      SELECT c.*, j.job_title
      FROM candidates c
      JOIN job_openings j ON c.job_id = j.id
      ${whereClause}
      ORDER BY c.created_at DESC
    `).all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      experienceYears: r.experience_years,
      education: r.education,
      skillsJson: r.skills_json,
      cvFileName: r.cv_file_name,
      matchScore: r.match_score,
      recruitmentStage: r.recruitment_stage,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      jobTitle: r.job_title,
    }));
  }

  public updateCandidateStage(id: string, stage: CandidateEntity['recruitmentStage'], notes?: string): boolean {
    const raw = this.connection.getRawDb();
    const now = new Date().toISOString();
    const res = raw.prepare(`
      UPDATE candidates
      SET recruitment_stage = ?, notes = COALESCE(?, notes), updated_at = ?
      WHERE id = ?
    `).run(stage, notes ?? null, now, id);
    return res.changes > 0;
  }
}
