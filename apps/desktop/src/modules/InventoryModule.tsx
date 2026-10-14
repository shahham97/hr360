import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  UserCheck,
  UserX,
  Search,
  CheckCircle,
  Trash2,
  Tag,
  Edit3
} from 'lucide-react';
import { Employee, InventoryItem } from '../types/hr-types';

interface InventoryModuleProps {
  employees: Employee[];
  onAudit: (action: string, details: string) => void;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    itemCode: 'AST-LAP-001',
    name: 'Dell Latitude 5420 (Core i7, 16GB)',
    category: 'LAPTOP',
    serialNumber: 'DL-5420-998234',
    purchaseDate: '2025-01-15',
    purchaseValue: 1250,
    condition: 'EXCELLENT',
    status: 'AVAILABLE',
    notes: 'Configured with Ubuntu 24.04 and dev tools.',
  },
  {
    id: 'inv-2',
    itemCode: 'AST-LAP-002',
    name: 'MacBook Pro 14" (M3 Pro, 18GB, 512GB)',
    category: 'LAPTOP',
    serialNumber: 'C02G8712MD6T',
    purchaseDate: '2025-03-10',
    purchaseValue: 1999,
    condition: 'NEW',
    status: 'AVAILABLE',
    notes: 'Primary engineering laptop.',
  },
  {
    id: 'inv-3',
    itemCode: 'AST-PER-001',
    name: 'Dell UltraSharp 27" 4K Monitor U2723QE',
    category: 'PERIPHERAL',
    serialNumber: 'CN-0K791T-74261',
    purchaseDate: '2025-02-01',
    purchaseValue: 550,
    condition: 'EXCELLENT',
    status: 'AVAILABLE',
    notes: 'With USB-C 90W power delivery dock.',
  },
  {
    id: 'inv-4',
    itemCode: 'AST-MOB-001',
    name: 'Samsung Galaxy S24 (Enterprise Edition)',
    category: 'MOBILE',
    serialNumber: 'SM-S921B-45281',
    purchaseDate: '2025-04-20',
    purchaseValue: 799,
    condition: 'NEW',
    status: 'AVAILABLE',
    notes: 'Dedicated on-call duty mobile.',
  },
];

export const InventoryModule: React.FC<InventoryModuleProps> = ({ employees, onAudit }) => {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('hr360_inventory_items');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_INVENTORY;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [assigningItem, setAssigningItem] = useState<InventoryItem | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form State for New Item
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<InventoryItem['category']>('LAPTOP');
  const [newItemSerial, setNewItemSerial] = useState('');
  const [newItemValue, setNewItemValue] = useState<number>(1000);
  const [newItemCondition, setNewItemCondition] = useState<InventoryItem['condition']>('NEW');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem('hr360_inventory_items', JSON.stringify(items));
    } catch {}
  }, [items]);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemSerial.trim()) {
      showNotification('Please enter the asset name and serial number.', 'error');
      return;
    }

    const catPrefix = newItemCategory.slice(0, 3).toUpperCase();
    const itemCode = `AST-${catPrefix}-${String(items.length + 1).padStart(3, '0')}`;

    const created: InventoryItem = {
      id: `inv-${Date.now()}`,
      itemCode,
      name: newItemName.trim(),
      category: newItemCategory,
      serialNumber: newItemSerial.trim(),
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseValue: Number(newItemValue) || 0,
      condition: newItemCondition,
      status: 'AVAILABLE',
      notes: newItemNotes.trim(),
    };

    const updated = [created, ...items];
    setItems(updated);
    setShowCreateModal(false);

    // Reset Form
    setNewItemName('');
    setNewItemSerial('');
    setNewItemValue(1000);
    setNewItemNotes('');

    onAudit('CREATE_INVENTORY_ITEM', `Created asset ${created.itemCode} (${created.name}) with serial ${created.serialNumber}`);
    showNotification(`Asset ${created.itemCode} created and stored successfully!`);
  };

  const handleAssignItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningItem || !selectedEmpId) {
      showNotification('Please select an employee to assign this asset.', 'error');
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmpId);
    if (!emp) return;

    const empName = `${emp.firstName} ${emp.lastName}`.trim();

    const updated = items.map((item) => {
      if (item.id === assigningItem.id) {
        return {
          ...item,
          status: 'ASSIGNED' as const,
          assignedEmployeeId: emp.id,
          assignedEmployeeName: empName,
          assignedDate: new Date().toISOString().slice(0, 10),
        };
      }
      return item;
    });

    setItems(updated);
    setAssigningItem(null);
    setSelectedEmpId('');

    onAudit(
      'ASSIGN_INVENTORY_ITEM',
      `Assigned asset ${assigningItem.itemCode} (${assigningItem.name}) to employee ${empName} (${emp.employeeCode}).`
    );
    showNotification(`Asset ${assigningItem.itemCode} successfully assigned to ${empName}.`);
  };

  const handleUnassignItem = (item: InventoryItem) => {
    const prevHolder = item.assignedEmployeeName || 'Employee';

    const updated = items.map((i) => {
      if (i.id === item.id) {
        return {
          ...i,
          status: 'AVAILABLE' as const,
          assignedEmployeeId: undefined,
          assignedEmployeeName: undefined,
          assignedDate: undefined,
        };
      }
      return i;
    });

    setItems(updated);
    onAudit('UNASSIGN_INVENTORY_ITEM', `Unassigned asset ${item.itemCode} from ${prevHolder}. Returned to available pool.`);
    showNotification(`Asset ${item.itemCode} returned back to inventory.`);
  };

  const handleDeleteItem = (itemId: string, itemCode: string) => {
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    onAudit('DELETE_INVENTORY_ITEM', `Removed asset ${itemCode} from inventory registry.`);
    showNotification(`Asset ${itemCode} deleted.`);
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.assignedEmployeeName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const availableCount = items.filter((i) => i.status === 'AVAILABLE').length;
  const assignedCount = items.filter((i) => i.status === 'ASSIGNED').length;
  const totalValue = items.reduce((acc, i) => acc + (i.purchaseValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Package className="w-5 h-5 mr-2 text-indigo-600" />
            Inventory & Asset Management
          </h1>
          <p className="text-xs text-slate-500">
            Create hardware & IT assets independently and assign them to available employees with verifiable lifecycle tracking.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 flex items-center shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Product / Asset
        </button>
      </div>

      {/* Notifications */}
      {notice && (
        <div
          className={`p-3 text-xs rounded-lg flex items-center justify-between border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          <span className="font-medium">{notice.msg}</span>
          <button onClick={() => setNotice(null)} className="font-bold text-sm ml-2">✕</button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Assets</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{items.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Assets</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{availableCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned to Staff</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{assignedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Inventory Value</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">${totalValue.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, product name, serial, or employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="LAPTOP">Laptops</option>
              <option value="PERIPHERAL">Peripherals</option>
              <option value="MOBILE">Mobile Devices</option>
              <option value="OFFICE_FURNITURE">Office Furniture</option>
              <option value="NETWORKING">Networking Equipment</option>
              <option value="SOFTWARE_LICENSE">Software Licenses</option>
              <option value="OTHER">Other Assets</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Asset Code</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Serial Number</th>
                <th className="p-3">Value</th>
                <th className="p-3">Condition</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned To</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No matching inventory products found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{item.itemCode}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      {item.notes && <div className="text-[11px] text-slate-500 line-clamp-1">{item.notes}</div>}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{item.serialNumber}</td>
                    <td className="p-3 font-semibold text-slate-800">${item.purchaseValue}</td>
                    <td className="p-3">
                      <span className="text-[11px] font-medium text-slate-600">{item.condition}</span>
                    </td>
                    <td className="p-3">
                      {item.status === 'AVAILABLE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          AVAILABLE
                        </span>
                      ) : item.status === 'ASSIGNED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          ASSIGNED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {item.status === 'ASSIGNED' && item.assignedEmployeeName ? (
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center">
                            <UserCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            {item.assignedEmployeeName}
                          </div>
                          <div className="text-[10px] text-slate-400">Assigned: {item.assignedDate}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      {item.status === 'AVAILABLE' ? (
                        <button
                          onClick={() => {
                            setAssigningItem(item);
                            setSelectedEmpId(employees[0]?.id || '');
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold inline-flex items-center"
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          Assign
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnassignItem(item)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold inline-flex items-center"
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          Unassign
                        </button>
                      )}
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1 text-slate-500 hover:text-blue-600 rounded"
                        title="Edit Asset Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.itemCode)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs space-y-4 rounded-xl">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <Plus className="w-4 h-4 mr-1.5 text-indigo-600" />
                Create New Inventory Asset
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="font-bold text-base text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product / Asset Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. ThinkPad T14 Gen 4, 32GB RAM"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:outline-none"
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="PERIPHERAL">Peripheral</option>
                    <option value="MOBILE">Mobile Device</option>
                    <option value="OFFICE_FURNITURE">Office Furniture</option>
                    <option value="NETWORKING">Networking Equipment</option>
                    <option value="SOFTWARE_LICENSE">Software License</option>
                    <option value="OTHER">Other Asset</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Condition</label>
                  <select
                    value={newItemCondition}
                    onChange={(e) => setNewItemCondition(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:outline-none"
                  >
                    <option value="NEW">Brand New</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="DAMAGED">Damaged / Repair Needed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    value={newItemSerial}
                    onChange={(e) => setNewItemSerial(e.target.value)}
                    placeholder="e.g. SN-8829-X01"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Value ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technical Specs / Notes</label>
                <textarea
                  rows={2}
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder="Asset specifications, warranty period, or docking requirements..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
                >
                  Create Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Product Modal */}
      {assigningItem && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs space-y-4 rounded-xl">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <UserCheck className="w-4 h-4 mr-1.5 text-blue-600" />
                Assign Asset: {assigningItem.itemCode}
              </h3>
              <button onClick={() => setAssigningItem(null)} className="font-bold text-base text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <div className="font-bold text-slate-800">{assigningItem.name}</div>
              <div className="text-[11px] text-slate-500 font-mono">Serial: {assigningItem.serialNumber} | Value: ${assigningItem.purchaseValue}</div>
            </div>

            <form onSubmit={handleAssignItem} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Active Employee *</label>
                {employees.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs">
                    No active employees registered in directory. Add employees in the Employee Directory first.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-slate-800"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} — {emp.firstName} {emp.lastName} ({emp.department} - {emp.designation})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAssigningItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedEmpId || employees.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Product / Asset Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs space-y-4 rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center">
                  <Edit3 className="w-4 h-4 mr-1.5 text-blue-600" />
                  Edit Inventory Asset ({editingItem.itemCode})
                </h3>
                <p className="text-slate-500 text-[11px]">Update asset details, value, condition and operational status</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="font-bold text-base text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updated: InventoryItem = {
                  ...editingItem,
                  name: String(formData.get('name') || editingItem.name).trim(),
                  category: (formData.get('category') as any) || editingItem.category,
                  serialNumber: String(formData.get('serialNumber') || editingItem.serialNumber).trim(),
                  purchaseValue: Number(formData.get('purchaseValue')) || editingItem.purchaseValue,
                  condition: (formData.get('condition') as any) || editingItem.condition,
                  status: (formData.get('status') as any) || editingItem.status,
                  notes: String(formData.get('notes') || '').trim(),
                };

                setItems((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)));
                onAudit('UPDATE_INVENTORY_ITEM', `Updated asset ${updated.itemCode} (${updated.name}) with serial ${updated.serialNumber}`);
                showNotification(`Asset ${updated.itemCode} updated successfully.`);
                setEditingItem(null);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product / Asset Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingItem.name}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    name="category"
                    defaultValue={editingItem.category}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-slate-800"
                  >
                    <option value="LAPTOP">Laptop / Notebook</option>
                    <option value="PERIPHERAL">Peripheral / Dock</option>
                    <option value="MOBILE">Mobile / Tablet</option>
                    <option value="FURNITURE">Office Furniture</option>
                    <option value="ACCESSORY">Accessory / Tool</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hardware Serial No *</label>
                  <input
                    type="text"
                    name="serialNumber"
                    required
                    defaultValue={editingItem.serialNumber}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Value ($ / PKR)</label>
                  <input
                    type="number"
                    name="purchaseValue"
                    defaultValue={editingItem.purchaseValue}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asset Condition</label>
                  <select
                    name="condition"
                    defaultValue={editingItem.condition}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-slate-800"
                  >
                    <option value="NEW">Brand New</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good / Fair</option>
                    <option value="DAMAGED">Under Repair / Damaged</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lifecycle Status</label>
                <select
                  name="status"
                  defaultValue={editingItem.status}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-slate-800"
                >
                  <option value="AVAILABLE">AVAILABLE (In Pool)</option>
                  <option value="ASSIGNED">ASSIGNED (In Use)</option>
                  <option value="RETIRED">RETIRED (Disposed)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Configuration Notes / Remarks</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingItem.notes || ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-800"
                  placeholder="OS version, warranty, accessories included..."
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
