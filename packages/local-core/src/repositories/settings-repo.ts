import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';

export interface NotificationEntity {
  id: string;
  title: string;
  message: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  readFlag: boolean;
  createdAt: string;
}

export class SettingsRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public get(key: string): string | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT setting_value FROM local_settings WHERE setting_key = ?`).get(key) as { setting_value: string } | undefined;
    return row ? row.setting_value : null;
  }

  public set(key: string, value: string): void {
    const raw = this.connection.getRawDb();
    const now = new Date().toISOString();
    raw.prepare(`
      INSERT INTO local_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at
    `).run(key, value, now);
  }

  public getAll(): Record<string, string> {
    const raw = this.connection.getRawDb();
    const rows = raw.prepare(`SELECT setting_key, setting_value FROM local_settings`).all() as Array<{ setting_key: string; setting_value: string }>;
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.setting_key] = r.setting_value;
    }
    return result;
  }

  public addNotification(title: string, message: string, level: NotificationEntity['level'] = 'INFO'): NotificationEntity {
    const raw = this.connection.getRawDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    raw.prepare(`
      INSERT INTO local_notifications (id, title, message, level, read_flag, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, title, message, level, now);

    return {
      id,
      title,
      message,
      level,
      readFlag: false,
      createdAt: now,
    };
  }

  public getNotifications(limit = 20): NotificationEntity[] {
    const raw = this.connection.getRawDb();
    const rows = raw.prepare(`
      SELECT * FROM local_notifications
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      level: r.level,
      readFlag: r.read_flag === 1,
      createdAt: r.created_at,
    }));
  }

  public markNotificationAsRead(id: string): void {
    const raw = this.connection.getRawDb();
    raw.prepare(`UPDATE local_notifications SET read_flag = 1 WHERE id = ?`).run(id);
  }
}
