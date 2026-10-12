import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';

export interface PayslipTemplateEntity {
  id: string;
  templateName: string;
  isDefault: boolean;
  configJson: string;
  createdAt: string;
  updatedAt: string;
}

export class PayslipTemplateRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public list(): PayslipTemplateEntity[] {
    const raw = this.connection.getRawDb();
    const rows = raw.prepare(`SELECT * FROM payslip_templates ORDER BY is_default DESC, template_name ASC`).all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public getById(id: string): PayslipTemplateEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT * FROM payslip_templates WHERE id = ?`).get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  public getDefault(): PayslipTemplateEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT * FROM payslip_templates WHERE is_default = 1 LIMIT 1`).get() as any;
    return row ? this.mapRow(row) : null;
  }

  public save(input: {
    id?: string;
    templateName: string;
    isDefault?: boolean;
    configJson: string;
  }): PayslipTemplateEntity {
    return this.connection.transaction(() => {
      const raw = this.connection.getRawDb();
      const now = new Date().toISOString();
      const isDefault = input.isDefault ? 1 : 0;

      if (isDefault) {
        raw.prepare(`UPDATE payslip_templates SET is_default = 0`).run();
      }

      if (input.id) {
        raw.prepare(`
          UPDATE payslip_templates
          SET template_name = ?, is_default = ?, config_json = ?, updated_at = ?
          WHERE id = ?
        `).run(input.templateName, isDefault, input.configJson, now, input.id);

        return {
          id: input.id,
          templateName: input.templateName,
          isDefault: !!isDefault,
          configJson: input.configJson,
          createdAt: now, // will be preserved if read
          updatedAt: now,
        };
      }

      const id = crypto.randomUUID();
      raw.prepare(`
        INSERT INTO payslip_templates (id, template_name, is_default, config_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, input.templateName, isDefault, input.configJson, now, now);

      return {
        id,
        templateName: input.templateName,
        isDefault: !!isDefault,
        configJson: input.configJson,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  public delete(id: string): boolean {
    const raw = this.connection.getRawDb();
    const res = raw.prepare(`DELETE FROM payslip_templates WHERE id = ?`).run(id);
    return res.changes > 0;
  }

  private mapRow(r: any): PayslipTemplateEntity {
    return {
      id: r.id,
      templateName: r.template_name,
      isDefault: r.is_default === 1,
      configJson: r.config_json,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
