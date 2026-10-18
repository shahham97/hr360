export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateTenant } from '@/lib/auth-service';
import { executeTenantQuery } from '@/lib/tenant-db';

async function ensureInventoryTable(companyId: string) {
  await executeTenantQuery(
    companyId,
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id VARCHAR(64) PRIMARY KEY,
      item_code VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(64) NOT NULL,
      serial_number VARCHAR(128) NOT NULL,
      purchase_date VARCHAR(32) NOT NULL,
      purchase_value DOUBLE NOT NULL DEFAULT 0,
      item_condition VARCHAR(64) NOT NULL DEFAULT 'NEW',
      status VARCHAR(64) NOT NULL DEFAULT 'AVAILABLE',
      assigned_employee_id VARCHAR(64) NULL,
      assigned_employee_name VARCHAR(255) NULL,
      assigned_at VARCHAR(64) NULL,
      notes TEXT NULL,
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );
}

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    await ensureInventoryTable(companyId);

    const rows = await executeTenantQuery<any>(
      companyId,
      `SELECT id, item_code as itemCode, name, category, serial_number as serialNumber,
              purchase_date as purchaseDate, purchase_value as purchaseValue,
              item_condition as \`condition\`, status,
              assigned_employee_id as assignedEmployeeId,
              assigned_employee_name as assignedEmployeeName,
              assigned_at as assignedAt, notes, created_at as createdAt, updated_at as updatedAt
       FROM inventory_items ORDER BY created_at DESC`
    );

    return apiSuccess(rows, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    await ensureInventoryTable(companyId);
    const body = await req.json();

    const id = body.id || `inv-${Date.now()}`;
    const itemCode = (body.itemCode || `AST-${Date.now().toString().slice(-4)}`).trim();
    const name = (body.name || '').trim();
    const category = body.category || 'LAPTOP';
    const serialNumber = (body.serialNumber || '').trim();
    const purchaseDate = body.purchaseDate || new Date().toISOString().slice(0, 10);
    const purchaseValue = parseFloat(body.purchaseValue || '0') || 0;
    const condition = body.condition || 'NEW';
    const status = body.status || 'AVAILABLE';
    const notes = body.notes || '';
    const now = new Date().toISOString();

    await executeTenantQuery(
      companyId,
      `INSERT INTO inventory_items (
        id, item_code, name, category, serial_number, purchase_date,
        purchase_value, item_condition, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, itemCode, name, category, serialNumber, purchaseDate, purchaseValue, condition, status, notes, now, now]
    );

    const created = {
      id,
      itemCode,
      name,
      category,
      serialNumber,
      purchaseDate,
      purchaseValue,
      condition,
      status,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    return apiSuccess(created, requestId, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function PUT(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    await ensureInventoryTable(companyId);
    const body = await req.json();
    const id = body.id;

    if (!id) {
      return apiError('BAD_REQUEST', 'Missing item id', 400, undefined, requestId);
    }

    const itemCode = body.itemCode;
    const name = body.name;
    const category = body.category;
    const serialNumber = body.serialNumber;
    const purchaseDate = body.purchaseDate;
    const purchaseValue = parseFloat(body.purchaseValue || '0') || 0;
    const condition = body.condition;
    const status = body.status;
    const assignedEmployeeId = body.assignedEmployeeId || null;
    const assignedEmployeeName = body.assignedEmployeeName || null;
    const assignedAt = body.assignedAt || null;
    const notes = body.notes || '';
    const now = new Date().toISOString();

    await executeTenantQuery(
      companyId,
      `UPDATE inventory_items SET
        item_code = ?, name = ?, category = ?, serial_number = ?,
        purchase_date = ?, purchase_value = ?, item_condition = ?,
        status = ?, assigned_employee_id = ?, assigned_employee_name = ?,
        assigned_at = ?, notes = ?, updated_at = ?
      WHERE id = ?`,
      [
        itemCode,
        name,
        category,
        serialNumber,
        purchaseDate,
        purchaseValue,
        condition,
        status,
        assignedEmployeeId,
        assignedEmployeeName,
        assignedAt,
        notes,
        now,
        id,
      ]
    );

    return apiSuccess({ updated: true, id }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    await ensureInventoryTable(companyId);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('BAD_REQUEST', 'Missing item id', 400, undefined, requestId);
    }

    await executeTenantQuery(
      companyId,
      'DELETE FROM inventory_items WHERE id = ?',
      [id]
    );

    return apiSuccess({ deleted: true, id }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
