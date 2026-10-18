export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateTenant } from '@/lib/auth-service';
import { getTenantConnectionPool } from '@/lib/tenant-db';

function formatBytes(bytes: number, decimals = 2) {
  if (bytes <= 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
  }
  // String escaping
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    const { pool, databaseName, companySlug, companyName } = await getTenantConnectionPool(companyId);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // -------------------------------------------------------------
    // EXPORT ACTION: Generate .sql format dump
    // -------------------------------------------------------------
    if (action === 'export') {
      const [tableRows] = await pool.query<any[]>('SHOW TABLES');
      const tableNames: string[] = [];
      for (const row of tableRows) {
        const key = Object.keys(row)[0];
        if (key && row[key]) {
          tableNames.push(row[key]);
        }
      }

      const timestamp = new Date().toISOString();
      const sqlParts: string[] = [
        `-- =============================================================`,
        `-- HR360 Enterprise Dedicated Tenant Database Dump`,
        `-- Company: ${companyName} (${companySlug})`,
        `-- Database: ${databaseName}`,
        `-- Timestamp: ${timestamp}`,
        `-- Server Engine: MySQL / TiDB Clustered Storage`,
        `-- =============================================================\n`,
        `SET FOREIGN_KEY_CHECKS = 0;`,
        `SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n`,
      ];

      for (const table of tableNames) {
        sqlParts.push(`-- -------------------------------------------------------------`);
        sqlParts.push(`-- Table structure for \`${table}\``);
        sqlParts.push(`-- -------------------------------------------------------------`);
        sqlParts.push(`DROP TABLE IF EXISTS \`${table}\`;`);

        try {
          const [createRows] = await pool.query<any[]>(`SHOW CREATE TABLE \`${table}\``);
          if (createRows && createRows[0]) {
            const createSql = createRows[0]['Create Table'] || Object.values(createRows[0])[1];
            if (createSql) {
              sqlParts.push(`${createSql};\n`);
            }
          }
        } catch {}

        sqlParts.push(`-- Dumping data for table \`${table}\``);
        try {
          const [dataRows] = await pool.query<any[]>(`SELECT * FROM \`${table}\``);
          if (dataRows && dataRows.length > 0) {
            const cols = Object.keys(dataRows[0]);
            const colsEscaped = cols.map((c) => `\`${c}\``).join(', ');

            // Chunk inserts into batches of 50
            const batchSize = 50;
            for (let i = 0; i < dataRows.length; i += batchSize) {
              const slice = dataRows.slice(i, i + batchSize);
              const valuesList = slice
                .map((row) => `(${cols.map((col) => escapeSqlValue(row[col])).join(', ')})`)
                .join(',\n  ');

              sqlParts.push(`INSERT INTO \`${table}\` (${colsEscaped}) VALUES\n  ${valuesList};`);
            }
          } else {
            sqlParts.push(`-- (No records in \`${table}\`)`);
          }
        } catch {}

        sqlParts.push('');
      }

      sqlParts.push(`SET FOREIGN_KEY_CHECKS = 1;`);
      sqlParts.push(`-- Dump completed on ${timestamp}`);

      const fullDump = sqlParts.join('\n');
      const filename = `${companySlug}_backup_${timestamp.slice(0, 10)}.sql`;

      return new Response(fullDump, {
        status: 200,
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // -------------------------------------------------------------
    // STATS ACTION: Calculate occupied DB size and table breakdown
    // -------------------------------------------------------------
    const [stats] = await pool.query<any[]>(
      `SELECT table_name AS tableName,
              COALESCE(table_rows, 0) AS tableRows,
              COALESCE(data_length, 0) AS dataLength,
              COALESCE(index_length, 0) AS indexLength,
              COALESCE(data_length + index_length, 0) AS totalBytes
       FROM information_schema.tables
       WHERE table_schema = ?
       ORDER BY totalBytes DESC, tableName ASC`,
      [databaseName]
    );

    let totalBytes = 0;
    const tables = stats.map((s: any) => {
      const bytes = Number(s.totalBytes || 0);
      totalBytes += bytes;
      return {
        tableName: s.tableName,
        tableRows: Number(s.tableRows || 0),
        dataLength: Number(s.dataLength || 0),
        indexLength: Number(s.indexLength || 0),
        totalBytes: bytes,
        formattedSize: formatBytes(bytes),
      };
    });

    const result = {
      databaseName,
      companySlug,
      companyName,
      totalBytes,
      formattedSize: formatBytes(totalBytes),
      tableCount: tables.length,
      tables,
      queriedAt: new Date().toISOString(),
    };

    return apiSuccess(result, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
