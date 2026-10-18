import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  HardDrive,
  Download,
  RefreshCw,
  Server,
  Layers,
  Table,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Activity
} from 'lucide-react';
import { CompanySession, UserSession } from '../types/hr-types';

interface Props {
  session: {
    user: UserSession;
    company: CompanySession;
    accessToken?: string;
  };
  serverUrl: string;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onAudit: (action: string, details: string) => void;
}

interface TableStat {
  tableName: string;
  tableRows: number;
  dataLength: number;
  indexLength: number;
  totalBytes: number;
  formattedSize: string;
}

interface DbStatsResponse {
  databaseName: string;
  companySlug: string;
  companyName: string;
  totalBytes: number;
  formattedSize: string;
  tableCount: number;
  tables: TableStat[];
  queriedAt: string;
}

export const DatabaseManagementModule: React.FC<Props> = ({
  session,
  serverUrl,
  apiFetch,
  onAudit,
}) => {
  const cleanUrl = serverUrl.replace(/\/$/, '');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [stats, setStats] = useState<DbStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = session.accessToken || localStorage.getItem('hr360_access_token');
      const res = await apiFetch(`${cleanUrl}/api/v1/tenant/database`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-company-id': session.company.id,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to fetch database metrics from server.');
      }

      const json = await res.json();
      setStats(json.data);
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to tenant database metrics endpoint.');
    } finally {
      setLoading(false);
    }
  }, [cleanUrl, session]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExportSql = async () => {
    setExporting(true);
    try {
      const token = session.accessToken || localStorage.getItem('hr360_access_token');
      const res = await apiFetch(`${cleanUrl}/api/v1/tenant/database?action=export`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-company-id': session.company.id,
        },
      });

      if (!res.ok) {
        throw new Error('Database export failed on server.');
      }

      const sqlText = await res.text();
      const filename = `${session.company.slug || 'company'}_database_${new Date().toISOString().slice(0, 10)}.sql`;

      // Download file to client
      const blob = new Blob([sqlText], { type: 'application/sql' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      onAudit('EXPORT_DATABASE_SQL', `Exported full database SQL dump (${(sqlText.length / 1024).toFixed(2)} KB)`);
      showNotice(`Successfully exported ${filename} (${(sqlText.length / 1024).toFixed(2)} KB).`);
    } catch (err: any) {
      showNotice(err?.message || 'Failed to export database dump.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const totalRowsCount = stats?.tables.reduce((acc, t) => acc + (t.tableRows || 0), 0) || 0;
  const storageLimitMb = session.company.limits?.storageMb || 10000;
  const occupiedMb = stats ? (stats.totalBytes / (1024 * 1024)) : 0;
  const usagePercentage = Math.min(100, Math.max(0.1, (occupiedMb / storageLimitMb) * 100));

  return (
    <div className="space-y-5">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3 text-xs flex items-center justify-between border shadow-sm rounded-lg ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="font-bold text-xs text-slate-500 hover:text-slate-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            Allocated Database & Storage Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated multi-tenant database allocation for <strong className="text-slate-700">{session.company.name}</strong> ({session.company.slug})
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs flex items-center transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh Size
          </button>

          <button
            onClick={handleExportSql}
            disabled={exporting || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center transition-all disabled:opacity-50"
          >
            {exporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                Generating SQL Dump...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 mr-2" />
                Export Database (.sql)
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Occupied Size */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Occupied DB Size</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {loading ? 'Calculating...' : stats?.formattedSize || '0 Bytes'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Data: {stats ? (stats.tables.reduce((a, b) => a + b.dataLength, 0) / 1024).toFixed(2) : 0} KB | Index: {stats ? (stats.tables.reduce((a, b) => a + b.indexLength, 0) / 1024).toFixed(2) : 0} KB
          </p>

          <div className="mt-3.5">
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
              <span>Quota Used: {usagePercentage.toFixed(2)}%</span>
              <span>10,000 MB Limit</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Cluster & Storage Isolation */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Architecture</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
            <span>Dedicated Clustered DB</span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">ONLINE</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-2 space-y-1 font-mono">
            <div className="truncate">Allocated DB: <strong className="text-slate-800">{stats?.databaseName || session.company.databaseName || 'Cloud Dedicated'}</strong></div>
            <div>Isolation: <span className="text-emerald-700 font-semibold">100% Dedicated Schema</span></div>
            <div>Encryption: <span className="text-slate-700">AES-256 Envelope</span></div>
          </div>
        </div>

        {/* Card 3: Tables & Schema */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Schema Structure</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {stats ? `${stats.tableCount} Tables` : 'Loading...'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total Records Across Tables: <strong className="text-slate-800 font-mono">{totalRowsCount.toLocaleString()}</strong>
          </p>
          <div className="mt-3 flex items-center space-x-2 text-[11px] text-blue-600 font-medium">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Real-time Dynamic Two-Way Sync Active</span>
          </div>
        </div>
      </div>

      {/* SQL Export Callout Card */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-cyan-300" />
            <h3 className="font-bold text-sm">Full SQL Database Dump & Portability</h3>
          </div>
          <p className="text-xs text-blue-100/90 leading-relaxed">
            Export a complete, self-contained <strong>.sql</strong> database file containing all table structures (DDL) and customer records (DML) formatted for instant restore in MySQL or compatible SQL database servers.
          </p>
        </div>

        <button
          onClick={handleExportSql}
          disabled={exporting || loading}
          className="px-5 py-2.5 bg-white text-blue-950 hover:bg-blue-50 active:bg-blue-100 font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center transition-all shrink-0 cursor-pointer disabled:opacity-60"
        >
          {exporting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin text-blue-900" />
              Generating .sql File...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2 text-blue-900" />
              Export .sql Dump
            </>
          )}
        </button>
      </div>

      {/* Table Breakdown Detail */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-slate-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Allocated Database Tables Breakdown
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {stats?.tables.length || 0} Tables Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Table Name</th>
                <th className="py-2.5 px-4 text-right">Row Count</th>
                <th className="py-2.5 px-4 text-right">Data Size</th>
                <th className="py-2.5 px-4 text-right">Index Size</th>
                <th className="py-2.5 px-4 text-right">Total Occupied</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading && !stats ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-blue-500" />
                    Calculating table metrics from tenant cluster...
                  </td>
                </tr>
              ) : stats?.tables && stats.tables.length > 0 ? (
                stats.tables.map((table) => (
                  <tr key={table.tableName} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>{table.tableName}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700">
                      {table.tableRows.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {(table.dataLength / 1024).toFixed(2)} KB
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {(table.indexLength / 1024).toFixed(2)} KB
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {table.formattedSize}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-sans font-medium">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-sans">
                    No table statistics returned from database cluster.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
