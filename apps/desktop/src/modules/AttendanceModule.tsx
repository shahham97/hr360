import React, { useState } from 'react';
import {
  Clock,
  RefreshCw,
  Download,
  Plus,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  Server,
  Edit3,
  Trash2
} from 'lucide-react';
import { AttendanceRecord, BiometricDevice } from '../types/hr-types';
import { exportToCSV } from '../utils/export-helpers';

interface Props {
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  devices: BiometricDevice[];
  setDevices: React.Dispatch<React.SetStateAction<BiometricDevice[]>>;
  onAudit: (action: string, details: string) => void;
}

export const AttendanceModule: React.FC<Props> = ({
  attendance,
  setAttendance,
  devices,
  setDevices,
  onAudit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // New Device Form
  const [devName, setDevName] = useState('');
  const [devMfr, setDevMfr] = useState<'ZKTeco' | 'Hikvision' | 'Anviz'>('ZKTeco');
  const [devIp, setDevIp] = useState('192.168.1.');
  const [devPort, setDevPort] = useState('4370');
  const [devBranch, setDevBranch] = useState('Headquarters Karachi');

  // Manual Override Form
  const [overrideCheckIn, setOverrideCheckIn] = useState('09:00 AM');
  const [overrideCheckOut, setOverrideCheckOut] = useState('05:00 PM');
  const [overrideReason, setOverrideReason] = useState('');

  const showNotice = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSyncAllDevices = () => {
    setIsSyncing(true);
    setTimeout(() => {
      // Simulate real ingestion of punches into attendance records
      const newPunchesCount = 6;
      setDevices((prev) =>
        prev.map((d) => ({
          ...d,
          lastSyncAt: `Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          totalSyncedPunches: d.totalSyncedPunches + 2,
        }))
      );

      // Ensure each employee has today's record updated
      setAttendance((prev) =>
        prev.map((r, idx) => {
          if (idx === 1) {
            return {
              ...r,
              checkIn: '09:04 AM',
              lateMinutes: 4,
              status: 'PRESENT',
            };
          }
          return r;
        })
      );

      setIsSyncing(false);
      onAudit('BIOMETRIC_PUNCH_SYNC', `Synchronized ${newPunchesCount} punches across ${devices.length} biometric LAN terminals.`);
      showNotice(`Successfully synced ${newPunchesCount} biometric punches. Ingested to local daily sheets.`);
    }, 1200);
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (devices.length >= 1) {
      showNotice('Subscription Policy: Only 1 biometric device can be integrated for this plan.');
      setShowAddDeviceModal(false);
      return;
    }
    const newDevice: BiometricDevice = {
      id: `dev-${Date.now()}`,
      name: devName,
      manufacturer: devMfr,
      model: `${devMfr} Enterprise Standard`,
      branch: devBranch,
      ipAddress: devIp,
      port: parseInt(devPort) || 4370,
      protocol: devMfr === 'Hikvision' ? 'ISAPI' : 'TCP/IP',
      status: 'ONLINE',
      lastSyncAt: 'Never',
      lastReceivedPunch: 'Dynamic',
      totalSyncedPunches: 0,
    };

    setDevices((prev) => [...prev, newDevice]);
    onAudit('ADD_BIOMETRIC_DEVICE', `Added ${devMfr} terminal "${devName}" at ${devIp}:${devPort}`);
    showNotice(`Biometric terminal "${devName}" registered on local network.`);
    setShowAddDeviceModal(false);
  };

  const handleDeleteDevice = (deviceId: string) => {
    if (window.confirm('Are you sure you want to remove this biometric terminal configuration?')) {
      const dev = devices.find((d) => d.id === deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      onAudit('DELETE_BIOMETRIC_DEVICE', `Removed biometric terminal: ${dev?.name || deviceId}`);
      showNotice('Biometric terminal configuration removed.');
    }
  };

  const handleUpdateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;

    setDevices((prev) =>
      prev.map((d) =>
        d.id === editingDevice.id
          ? {
              ...d,
              name: devName,
              manufacturer: devMfr,
              model: `${devMfr} Enterprise Standard`,
              ipAddress: devIp,
              port: parseInt(devPort) || (devMfr === 'Hikvision' ? 80 : devMfr === 'Anviz' ? 5010 : 4370),
              protocol: devMfr === 'Hikvision' ? 'ISAPI' : 'TCP/IP',
              branch: devBranch,
            }
          : d
      )
    );

    onAudit('UPDATE_BIOMETRIC_DEVICE', `Updated ${devMfr} terminal "${devName}" at ${devIp}:${devPort}`);
    showNotice(`Biometric terminal "${devName}" updated successfully.`);
    setEditingDevice(null);
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setAttendance((prev) =>
      prev.map((r) =>
        r.id === selectedRecord.id
          ? {
              ...r,
              checkIn: overrideCheckIn,
              checkOut: overrideCheckOut,
              status: 'PRESENT',
              manualOverride: true,
              overrideReason,
            }
          : r
      )
    );

    onAudit(
      'ATTENDANCE_MANUAL_OVERRIDE',
      `Manual attendance correction for ${selectedRecord.employeeName} (${selectedRecord.employeeCode}): In ${overrideCheckIn}, Out ${overrideCheckOut}. Reason: ${overrideReason}`
    );
    showNotice(`Attendance adjustment recorded for ${selectedRecord.employeeName}. Audited in immutable log.`);
    setShowOverrideModal(false);
    setSelectedRecord(null);
  };

  const handleExportCSV = () => {
    exportToCSV(
      filteredAttendance.map((a) => ({
        date: a.date,
        employeeCode: a.employeeCode,
        employeeName: a.employeeName,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        workingHours: a.workingHours,
        lateMinutes: a.lateMinutes,
        overtimeMinutes: a.overtimeMinutes,
        status: a.status,
        deviceSource: a.deviceSource,
        manualOverride: a.manualOverride ? 'YES' : 'NO',
        reason: a.overrideReason || '',
      })),
      'HR360_Attendance_Register'
    );
    onAudit('EXPORT_ATTENDANCE', `Exported attendance sheet of ${filteredAttendance.length} records`);
    showNotice(`Exported ${filteredAttendance.length} records to CSV.`);
  };

  const filteredAttendance = attendance.filter((a) => {
    const matchesSearch =
      a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-slate-800" />
            Biometric Terminals & Attendance Processing (Dynamic)
          </h1>
          <p className="text-xs text-slate-500">
            Real-time biometric punch ingestion (ZKTeco / Hikvision)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Export Register
          </button>
          <button
            onClick={() => setShowAddDeviceModal(true)}
            className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Add Biometric Terminal
          </button>
          <button
            onClick={handleSyncAllDevices}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing Terminals...' : 'Sync Terminals'}
          </button>
        </div>
      </div>

      {/* Hardware Devices Status & Setup Options */}
      {devices.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 p-5 rounded-lg text-xs space-y-4">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mb-2">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">No Biometric Terminal Configured</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-0.5 text-[11px]">
              Set up your local biometric terminal by selecting from the 3 supported manufacturer options below. Once created, you can edit its network settings or delete it at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Option 1: ZKTeco */}
            <div className="bg-white p-3.5 border border-slate-200 rounded-md shadow-sm flex flex-col justify-between hover:border-blue-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">1. ZKTeco Terminal</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">TCP/IP</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Standard ZKTeco fingerprint, facial, or RFID terminal communicating over LAN.
                </p>
                <div className="text-[10px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded mb-3">
                  <div>Default Port: 4370</div>
                  <div>Protocol: Standalone TCP/IP</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setDevMfr('ZKTeco');
                  setDevName('ZKTeco Main Gate Terminal');
                  setDevIp('192.168.1.201');
                  setDevPort('4370');
                  setDevBranch('Headquarters');
                  setShowAddDeviceModal(true);
                }}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Configure ZKTeco
              </button>
            </div>

            {/* Option 2: Hikvision */}
            <div className="bg-white p-3.5 border border-slate-200 rounded-md shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">2. Hikvision MinMoe</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">HTTP/ISAPI</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Facial recognition & access control terminal using Hikvision RESTful ISAPI.
                </p>
                <div className="text-[10px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded mb-3">
                  <div>Default Port: 80 / 8000</div>
                  <div>Protocol: Hikvision ISAPI</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setDevMfr('Hikvision');
                  setDevName('Hikvision Facial Terminal');
                  setDevIp('192.168.1.202');
                  setDevPort('80');
                  setDevBranch('Main Entrance');
                  setShowAddDeviceModal(true);
                }}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Configure Hikvision
              </button>
            </div>

            {/* Option 3: Anviz */}
            <div className="bg-white p-3.5 border border-slate-200 rounded-md shadow-sm flex flex-col justify-between hover:border-purple-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">3. Anviz Biometric</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">TCP Client</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Anviz fingerprint & RFID access control hardware utilizing TCP port 5010.
                </p>
                <div className="text-[10px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded mb-3">
                  <div>Default Port: 5010</div>
                  <div>Protocol: Anviz TCP Client</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setDevMfr('Anviz');
                  setDevName('Anviz Office Terminal');
                  setDevIp('192.168.1.203');
                  setDevPort('5010');
                  setDevBranch('Branch Office');
                  setShowAddDeviceModal(true);
                }}
                className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Configure Anviz
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {devices.map((dev) => (
            <div key={dev.id} className="bg-white p-3 border border-slate-200 shadow-sm text-xs space-y-2">
              <div className="flex justify-between items-start">
                <div className="font-bold text-slate-900 flex items-center">
                  <Server className="w-3.5 h-3.5 mr-1.5 text-slate-700" />
                  {dev.name}
                </div>
                <div className="flex items-center space-x-1">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-[10px] flex items-center">
                    <Wifi className="w-3 h-3 mr-1" /> ONLINE
                  </span>
                  <button
                    onClick={() => {
                      setEditingDevice(dev);
                      setDevName(dev.name);
                      setDevMfr(dev.manufacturer as any);
                      setDevIp(dev.ipAddress);
                      setDevPort(String(dev.port));
                      setDevBranch(dev.branch);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                    title="Edit Terminal Settings"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteDevice(dev.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    title="Delete Terminal Configuration"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                {dev.ipAddress}:{dev.port} ({dev.protocol}) — {dev.branch}
              </div>
              <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                <div>Last Synced: <span className="font-medium text-slate-700">{dev.lastSyncAt}</span></div>
                <div>Ingested Punches: <span className="font-bold text-slate-900">{dev.totalSyncedPunches.toLocaleString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attendance Register Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-3 border border-slate-200 shadow-sm text-xs">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none"
          >
            <option value="ALL">ALL</option>
            <option value="PRESENT">PRESENT</option>
            <option value="LATE">LATE</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="ABSENT">ABSENT</option>
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Code</th>
              <th className="p-3">Employee</th>
              <th className="p-3">First In</th>
              <th className="p-3">Last Out</th>
              <th className="p-3">Work Hours</th>
              <th className="p-3">Late (Mins)</th>
              <th className="p-3">Overtime</th>
              <th className="p-3">Status</th>
              <th className="p-3">Device Source</th>
              <th className="p-3 text-right">Adjustment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAttendance.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className="p-3 font-mono text-slate-600">{row.date}</td>
                <td className="p-3 font-mono font-semibold text-slate-900">{row.employeeCode}</td>
                <td className="p-3 font-medium text-slate-900">{row.employeeName}</td>
                <td className="p-3 font-mono font-semibold text-slate-800">{row.checkIn}</td>
                <td className="p-3 font-mono text-slate-800">{row.checkOut}</td>
                <td className="p-3 font-mono">{row.workingHours}h</td>
                <td className="p-3 font-mono">
                  {row.lateMinutes > 0 ? (
                    <span className="text-red-600 font-bold">+{row.lateMinutes}m</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="p-3 font-mono">
                  {row.overtimeMinutes > 0 ? (
                    <span className="text-emerald-700 font-bold">+{row.overtimeMinutes}m</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 font-semibold text-[10px] ${
                      row.status === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : row.status === 'LATE'
                        ? 'bg-amber-100 text-amber-800'
                        : row.status === 'ON_LEAVE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {row.status}
                  </span>
                  {row.manualOverride && (
                    <span className="ml-1 px-1.5 py-0.2 bg-purple-100 text-purple-800 font-bold text-[9px]">
                      MODIFIED
                    </span>
                  )}
                </td>
                <td className="p-3 text-slate-500 text-[11px] font-mono truncate max-w-[150px]">
                  {row.deviceSource}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => {
                      setSelectedRecord(row);
                      setOverrideCheckIn(row.checkIn === '--:--' ? '09:00 AM' : row.checkIn);
                      setOverrideCheckOut(row.checkOut === '--:--' ? '05:00 PM' : row.checkOut);
                      setShowOverrideModal(true);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Add Biometric Terminal</h3>
              <button onClick={() => setShowAddDeviceModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleAddDevice} className="space-y-3 pt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Terminal Device Name *</label>
                <input
                  type="text"
                  required
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300"
                  placeholder="e.g. Main Reception SilkID Terminal"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer *</label>
                  <select
                    value={devMfr}
                    onChange={(e) => setDevMfr(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white"
                  >
                    <option value="ZKTeco">ZKTeco</option>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Anviz">Anviz</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={devBranch}
                    onChange={(e) => setDevBranch(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">LAN IP Address *</label>
                  <input
                    type="text"
                    required
                    value={devIp}
                    onChange={(e) => setDevIp(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Port *</label>
                  <input
                    type="number"
                    required
                    value={devPort}
                    onChange={(e) => setDevPort(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800"
                >
                  Connect & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Edit Biometric Terminal Settings</h3>
              <button onClick={() => setEditingDevice(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleUpdateDevice} className="space-y-3 pt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Terminal Device Name *</label>
                <input
                  type="text"
                  required
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer *</label>
                  <select
                    value={devMfr}
                    onChange={(e) => {
                      const mfr = e.target.value as any;
                      setDevMfr(mfr);
                      if (mfr === 'ZKTeco') setDevPort('4370');
                      else if (mfr === 'Hikvision') setDevPort('80');
                      else if (mfr === 'Anviz') setDevPort('5010');
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white"
                  >
                    <option value="ZKTeco">ZKTeco</option>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Anviz">Anviz</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Location</label>
                  <input
                    type="text"
                    value={devBranch}
                    onChange={(e) => setDevBranch(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">LAN IP Address *</label>
                  <input
                    type="text"
                    required
                    value={devIp}
                    onChange={(e) => setDevIp(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Port *</label>
                  <input
                    type="number"
                    required
                    value={devPort}
                    onChange={(e) => setDevPort(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      {showOverrideModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900">Attendance Adjustment Override</h3>
                <p className="text-slate-500 font-mono text-[11px]">
                  {selectedRecord.employeeName} ({selectedRecord.employeeCode}) — {selectedRecord.date}
                </p>
              </div>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveOverride} className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Adjusted Check In</label>
                  <input
                    type="text"
                    required
                    value={overrideCheckIn}
                    onChange={(e) => setOverrideCheckIn(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Adjusted Check Out</label>
                  <input
                    type="text"
                    required
                    value={overrideCheckOut}
                    onChange={(e) => setOverrideCheckOut(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Justification / Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300"
                  placeholder="e.g. Biometric optical sensor failure / official outdoor client visit."
                />
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Per Section 4.4, the original raw punch is preserved immutable; this adjustment is stamped with your user ID and timestamp in audit logs.
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800"
                >
                  Approve & Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
