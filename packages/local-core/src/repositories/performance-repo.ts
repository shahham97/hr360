import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';

export interface PerformanceReviewEntity {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewCycle: string;
  rating: number;
  strengths?: string | null;
  areasForGrowth?: string | null;
  goalsJson?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'COMPLETED';
  createdAt: string;
  employeeName?: string;
}

export interface CreatePerformanceReviewInput {
  employeeId: string;
  reviewerId: string;
  reviewCycle: string;
  rating: number;
  strengths?: string;
  areasForGrowth?: string;
  goalsJson?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'COMPLETED';
}

export class PerformanceRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public createReview(input: CreatePerformanceReviewInput): PerformanceReviewEntity {
    const raw = this.connection.getRawDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = input.status || 'COMPLETED';

    raw.prepare(`
      INSERT INTO performance_reviews (
        id, employee_id, reviewer_id, review_cycle, rating,
        strengths, areas_for_growth, goals_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.employeeId,
      input.reviewerId,
      input.reviewCycle,
      input.rating,
      input.strengths ?? null,
      input.areasForGrowth ?? null,
      input.goalsJson ?? null,
      status,
      now
    );

    return {
      id,
      employeeId: input.employeeId,
      reviewerId: input.reviewerId,
      reviewCycle: input.reviewCycle,
      rating: input.rating,
      strengths: input.strengths ?? null,
      areasForGrowth: input.areasForGrowth ?? null,
      goalsJson: input.goalsJson ?? null,
      status,
      createdAt: now,
    };
  }

  public listReviews(employeeId?: string): PerformanceReviewEntity[] {
    const raw = this.connection.getRawDb();
    const whereClause = employeeId ? 'WHERE r.employee_id = ?' : '';
    const params = employeeId ? [employeeId] : [];

    const rows = raw.prepare(`
      SELECT r.*, (e.first_name || ' ' || e.last_name) as emp_name
      FROM performance_reviews r
      LEFT JOIN employees e ON r.employee_id = e.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `).all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      reviewerId: r.reviewer_id,
      reviewCycle: r.review_cycle,
      rating: r.rating,
      strengths: r.strengths,
      areasForGrowth: r.areas_for_growth,
      goalsJson: r.goals_json,
      status: r.status,
      createdAt: r.created_at,
      employeeName: r.emp_name,
    }));
  }

  public getById(id: string): PerformanceReviewEntity | null {
    const raw = this.connection.getRawDb();
    const r = raw.prepare(`
      SELECT r.*, (e.first_name || ' ' || e.last_name) as emp_name
      FROM performance_reviews r
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.id = ?
    `).get(id) as any;

    if (!r) return null;
    return {
      id: r.id,
      employeeId: r.employee_id,
      reviewerId: r.reviewer_id,
      reviewCycle: r.review_cycle,
      rating: r.rating,
      strengths: r.strengths,
      areasForGrowth: r.areas_for_growth,
      goalsJson: r.goals_json,
      status: r.status,
      createdAt: r.created_at,
      employeeName: r.emp_name,
    };
  }
}
