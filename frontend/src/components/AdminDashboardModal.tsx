import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Users,
  Settings,
  FolderPlus,
  History,
  Lock,
  UserPlus,
  CheckCircle,
  FileText,
  Save,
  AlertCircle
} from './icons';
import { api } from '../services/api';
import { User, ComplaintCategory, AuditLogRecord, SystemSettings } from '../types';
import './AdminDashboardModal.css';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageMode?: boolean;
  currentUser: User | null;
  language: 'hi' | 'en';
  onSettingsUpdated?: (settings: SystemSettings) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  pageMode = false,
  currentUser,
  language,
  onSettingsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'audit' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Settings State
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState<number>(200);
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [supportPhone, setSupportPhone] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<string>('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && currentUser?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [isOpen, activeTab]);

  const loadAdminData = async () => {
    try {
      if (activeTab === 'users') {
        const res = await api.getUsers();
        setUsers(res.users);
      } else if (activeTab === 'categories') {
        const res = await api.getCategories();
        setCategories(res.categories);
      } else if (activeTab === 'audit') {
        const res = await api.getAuditLogs();
        setAuditLogs(res.logs);
      } else if (activeTab === 'settings') {
        const res = await api.getSettings();
        if (res.settings) {
          setMaxUploadSizeMb(res.settings.maxUploadSizeMb || 200);
          setSupportEmail(res.settings.supportEmail || '');
          setSupportPhone(res.settings.supportPhone || '');
          setWorkingHours(res.settings.workingHours || '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCategory({
        name: newCatName.trim(),
        code: newCatCode.trim().toUpperCase(),
        description: newCatDesc.trim() || undefined
      });
      alert('Category added successfully!');
      setNewCatName('');
      setNewCatCode('');
      setNewCatDesc('');
      loadAdminData();
    } catch (err: any) {
      alert('Failed to create category: ' + err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMsg(null);

    // Email validation if provided
    if (supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim())) {
      setSettingsMsg({ type: 'error', text: 'Please enter a valid support email address or leave blank.' });
      setIsSavingSettings(false);
      return;
    }

    try {
      const res = await api.updateSettings({
        maxUploadSizeMb: Number(maxUploadSizeMb) || 200,
        supportEmail: supportEmail.trim() || null,
        supportPhone: supportPhone.trim() || null,
        workingHours: workingHours.trim() || null
      });
      setSettingsMsg({ type: 'success', text: 'System settings successfully updated and saved!' });
      if (onSettingsUpdated && res.settings) {
        onSettingsUpdated(res.settings);
      }
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message || 'Failed to update system settings' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={pageMode ? 'workspace-page admin-dashboard-page' : 'admin-dashboard-backdrop fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'}>
      <div className="workspace-page-panel admin-dashboard-panel bg-white rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="admin-dashboard-header bg-amber-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-200" />
            <div>
              <h3 className="text-lg font-bold">
                {language === 'hi' ? 'प्रशासनिक नियंत्रण कक्ष' : 'Section 7 — System Administration Console'}
              </h3>
              <p className="text-xs text-amber-100">
                User Security, Category Governance, System Configuration & Tamper-Evident Audit Logs
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="admin-dashboard-tabs bg-gray-100 border-b border-gray-200 px-6 pt-2 flex items-center gap-2 text-xs flex-shrink-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-white text-gray-900 border-t-2 border-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Users & Roles (4 Tiers)</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-white text-gray-900 border-t-2 border-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Complaint Categories Manager</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white text-gray-900 border-t-2 border-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>System Settings & Limits</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white text-gray-900 border-t-2 border-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Security Audit Logs</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="admin-dashboard-body p-6 overflow-y-auto flex-grow text-xs">
          {/* TAB 1: Users */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Assigned Role</th>
                      <th className="py-2.5 px-3">Secretariat Department</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{u.name}</td>
                        <td className="py-2.5 px-3 text-gray-600 font-mono">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                            u.role === 'REVIEWER' ? 'bg-amber-100 text-amber-800' :
                            u.role === 'DATA_ENTRY' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">{u.department || 'General Administration'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Categories */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Form to add category */}
              <form onSubmit={handleCreateCategory} className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
                <div className="w-56">
                  <label className="block font-bold text-gray-700 mb-1">New Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Forest & Environment"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-white outline-none"
                  />
                </div>
                <div className="w-36">
                  <label className="block font-bold text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="CAT-FOREST"
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-white outline-none font-mono"
                  />
                </div>
                <div className="flex-grow">
                  <label className="block font-bold text-gray-700 mb-1">Scope / Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of grievances handled under this category"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-4 py-2 rounded-lg transition"
                >
                  + Add Category
                </button>
              </form>

              {/* Existing Categories Table */}
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Category Name</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Associated Applications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-800">{c.code}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{c.name}</td>
                        <td className="py-2.5 px-3 text-gray-600">{c.description || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-700">{c._count?.applications || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: System Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1">
                  <Settings className="w-4 h-4 text-amber-700" />
                  <span>Configurable Support & Storage Settings</span>
                </div>
                <p className="text-gray-500 text-xs mb-4">
                  Manage file upload limits and public contact information. Support email, phone, and working hours will only appear across the top header and footer once configured here.
                </p>

                {settingsMsg && (
                  <div className={`p-3 rounded-lg text-xs mb-4 flex items-center gap-2 ${
                    settingsMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {settingsMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                    <span>{settingsMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Maximum File Upload Size (MB per attachment) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        required
                        value={maxUploadSizeMb}
                        onChange={(e) => setMaxUploadSizeMb(Number(e.target.value))}
                        className="w-36 border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-600 font-mono font-bold"
                      />
                      <span className="text-gray-500 text-xs">MB (Default: 200 MB per file, configurable up to 1000 MB. Allowed: PDF, JPG, PNG, DOC, XLS)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Support Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. contact@portal.local"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-600"
                    />
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Leave empty to hide email from public portal.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Support Contact Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Contact helpline number (Optional)"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-600"
                    />
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Optional contact phone number. Displayed only if configured.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Office Working Hours
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mon - Fri: 9:30 AM - 5:30 PM (IST)"
                      value={workingHours}
                      onChange={(e) => setWorkingHours(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-600"
                    />
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Displayed in top bar and footer only when provided.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-6 py-2.5 rounded-lg transition flex items-center gap-2 shadow"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingSettings ? 'Saving Settings...' : 'Save Configuration'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: Audit Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action Type</th>
                      <th className="py-2.5 px-3">Performed By</th>
                      <th className="py-2.5 px-3">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            log.action === 'REOPEN' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-700">{log.performedBy}</td>
                        <td className="py-2.5 px-3 text-gray-900">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

