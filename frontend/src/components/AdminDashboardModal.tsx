import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Shield,
  Users,
  Settings,
  FolderPlus,
  Lock,
  UserPlus,
  CheckCircle,
  Save,
  AlertCircle,
  Edit2,
  Eye,
  EyeOff,
  Trash2
} from './icons';
import { api } from '../services/api';
import { User, ComplaintCategory, SystemSettings } from '../types';
import './AdminDashboardModal.css';

const OPERATOR_BLOCKS = [
  { name: 'Tarapur', lgdCode: '2458' },
  { name: 'Sangrampur', lgdCode: '2457' },
  { name: 'Asarganj', lgdCode: '2451' }
] as const;

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageMode?: boolean;
  currentUser: User | null;
  language: 'hi' | 'en';
  onSettingsUpdated?: (settings: SystemSettings) => void;
  onProfileUpdated?: (user: User) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  pageMode = false,
  currentUser,
  language,
  onSettingsUpdated,
  onProfileUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'create-user' | 'users' | 'categories' | 'settings'>('profile');
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);

  // Admin profile and password state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profileRecoveryEmail, setProfileRecoveryEmail] = useState(currentUser?.recoveryEmail || currentUser?.email || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

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

  // Operator account creation
  const [operatorName, setOperatorName] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [operatorPhone, setOperatorPhone] = useState('');
  const [operatorBlock, setOperatorBlock] = useState('');
  const [operatorPassword, setOperatorPassword] = useState('');
  const [operatorConfirmPassword, setOperatorConfirmPassword] = useState('');
  const [isCreatingOperator, setIsCreatingOperator] = useState(false);
  const [operatorMsg, setOperatorMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showOperatorPassword, setShowOperatorPassword] = useState(false);
  const [showOperatorConfirmPassword, setShowOperatorConfirmPassword] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<User | null>(null);
  const [deleteOperatorPassword, setDeleteOperatorPassword] = useState('');
  const [deleteOperatorError, setDeleteOperatorError] = useState<string | null>(null);
  const [isDeletingOperator, setIsDeletingOperator] = useState(false);
  const [userAccountMsg, setUserAccountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingOperatorId, setUpdatingOperatorId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    setProfileName(currentUser?.name || '');
    setProfileEmail(currentUser?.email || '');
    setProfileRecoveryEmail(currentUser?.recoveryEmail || currentUser?.email || '');
    setProfilePhone(currentUser?.phone || '');
  }, [currentUser]);

  const loadAdminData = async () => {
    try {
      if (activeTab === 'users') {
        const res = await api.getUsers();
        setUsers(res.users.filter(user => user.role === 'DATA_ENTRY'));
      } else if (activeTab === 'categories') {
        const res = await api.getCategories();
        setCategories(res.categories);
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

  const handleProfileUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMsg(null);
    setIsSavingProfile(true);
    try {
      const result = await api.updateAdminProfile({ name: profileName.trim(), email: profileEmail.trim(), recoveryEmail: profileRecoveryEmail.trim(), phone: profilePhone.trim() });
      setProfileMsg({ type: 'success', text: result.message });
      onProfileUpdated?.(result.user);
      setIsEditingProfile(false);
    } catch (error: any) {
      setProfileMsg({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMsg(null);
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const result = await api.changeAdminPassword({ currentPassword, newPassword: newAdminPassword, confirmPassword: confirmAdminPassword });
      setPasswordMsg({ type: 'success', text: result.message });
      setCurrentPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      setShowChangePassword(false);
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: error.message || 'Failed to change password.' });
    } finally {
      setIsChangingPassword(false);
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

  const handleCreateOperator = async (event: React.FormEvent) => {
    event.preventDefault();
    setOperatorMsg(null);
    const block = OPERATOR_BLOCKS.find(item => item.name === operatorBlock);
    if (!block) return setOperatorMsg({ type: 'error', text: 'Please select an operator block.' });
    if (!/^\d{10}$/.test(operatorPhone)) return setOperatorMsg({ type: 'error', text: 'Enter a valid 10-digit phone number.' });
    if (operatorPassword.length < 8) return setOperatorMsg({ type: 'error', text: 'Password must contain at least 8 characters.' });
    if (operatorPassword !== operatorConfirmPassword) return setOperatorMsg({ type: 'error', text: 'Password and confirm password do not match.' });

    setIsCreatingOperator(true);
    try {
      await api.createOperator({
        name: operatorName.trim(),
        email: operatorEmail.trim(),
        phone: operatorPhone,
        blockName: block.name,
        blockLgdCode: block.lgdCode,
        password: operatorPassword,
        confirmPassword: operatorConfirmPassword
      });
      setOperatorName('');
      setOperatorEmail('');
      setOperatorPhone('');
      setOperatorBlock('');
      setOperatorPassword('');
      setOperatorConfirmPassword('');
      setShowOperatorPassword(false);
      setShowOperatorConfirmPassword(false);
      setOperatorMsg({ type: 'success', text: 'Operator account created successfully. The operator can now login with this email and password.' });
      await loadAdminData();
    } catch (error: any) {
      setOperatorMsg({ type: 'error', text: error.message || 'Failed to create operator.' });
    } finally {
      setIsCreatingOperator(false);
    }
  };

  const closeDeleteOperator = () => {
    if (isDeletingOperator) return;
    setOperatorToDelete(null);
    setDeleteOperatorPassword('');
    setDeleteOperatorError(null);
  };

  const handleDeleteOperator = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!operatorToDelete) return;
    if (!deleteOperatorPassword) {
      setDeleteOperatorError('Enter your admin password to continue.');
      return;
    }
    setIsDeletingOperator(true);
    setDeleteOperatorError(null);
    try {
      const result = await api.deleteOperator(operatorToDelete.id, deleteOperatorPassword);
      setUsers(items => items.filter(item => item.id !== operatorToDelete.id));
      setUserAccountMsg({ type: 'success', text: result.message });
      setOperatorToDelete(null);
      setDeleteOperatorPassword('');
    } catch (error: any) {
      setDeleteOperatorError(error.message || 'Failed to delete operator account.');
    } finally {
      setIsDeletingOperator(false);
    }
  };

  const handleOperatorBlockChange = async (operator: User, blockName: string) => {
    if (!blockName) return;
    setUpdatingOperatorId(operator.id);
    setUserAccountMsg(null);
    try {
      const result = await api.updateOperatorBlock(operator.id, blockName);
      setUsers(items => items.map(item => item.id === operator.id ? { ...item, ...result.user } : item));
      setUserAccountMsg({ type: 'success', text: result.message });
    } catch (error: any) {
      setUserAccountMsg({ type: 'error', text: error.message || 'Failed to update block mapping.' });
    } finally {
      setUpdatingOperatorId(null);
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
                {language === 'hi' ? 'प्रशासनिक नियंत्रण कक्ष' : 'System Administration Console'}
              </h3>
              <p className="text-xs text-amber-100">
                Admin Profile, User Access, Category Governance & System Configuration
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
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white text-gray-900 border-t-2 border-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('create-user')}
            className={`px-4 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'create-user'
                ? 'bg-white text-gray-900 border-t-2 border-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-white text-gray-900 border-t-2 border-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts</span>
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

        </div>

        {/* Body Content */}
        <div className="admin-dashboard-body p-6 overflow-y-auto flex-grow text-xs">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <form onSubmit={handleProfileUpdate} className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1C4D8D] text-lg font-black text-white">{profileName.charAt(0).toUpperCase() || 'A'}</div>
                  <div><h4 className="text-sm font-black text-gray-950">Admin Profile</h4><p className="text-[11px] text-gray-500">Update the administrator's account information.</p></div>
                </div>
                {profileMsg && <div className={`mb-4 flex items-center gap-2 rounded-xl border p-3 font-semibold ${profileMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{profileMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}<span>{profileMsg.text}</span></div>}
                <div className="space-y-4">
                  <label className="block space-y-1"><span className="font-bold text-gray-700">Admin Name *</span><input required disabled={!isEditingProfile} value={profileName} onChange={event => setProfileName(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700" /></label>
                  <label className="block space-y-1"><span className="font-bold text-gray-700">Admin Email *</span><input required disabled={!isEditingProfile} type="email" value={profileEmail} onChange={event => setProfileEmail(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700" /></label>
                  <label className="block space-y-1"><span className="font-bold text-gray-700">Password Reset Email *</span><input required disabled={!isEditingProfile} type="email" value={profileRecoveryEmail} onChange={event => setProfileRecoveryEmail(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700" /><span className="block text-[11px] leading-relaxed text-gray-500">Admin forgot-password links will be delivered here. This can be different from the login email.</span></label>
                  <label className="block space-y-1"><span className="font-bold text-gray-700">Phone Number</span><input disabled={!isEditingProfile} inputMode="numeric" maxLength={10} value={profilePhone} onChange={event => setProfilePhone(event.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700" /></label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600"><strong>Role:</strong> ADMIN</div>
                  {!isEditingProfile ? (
                    <button type="button" onClick={() => { setProfileMsg(null); setIsEditingProfile(true); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C4D8D] px-4 py-2.5 font-bold text-white hover:bg-[#163c6f]"><Edit2 className="h-4 w-4" />Edit Profile</button>
                  ) : (
                    <div className="flex gap-2"><button type="button" onClick={() => { setProfileName(currentUser?.name || ''); setProfileEmail(currentUser?.email || ''); setProfileRecoveryEmail(currentUser?.recoveryEmail || currentUser?.email || ''); setProfilePhone(currentUser?.phone || ''); setProfileMsg(null); setIsEditingProfile(false); }} className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={isSavingProfile} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1C4D8D] px-4 py-2.5 font-bold text-white hover:bg-[#163c6f] disabled:opacity-60"><Save className="h-4 w-4" />{isSavingProfile ? 'Saving…' : 'Save Changes'}</button></div>
                  )}
                </div>
              </form>

              {showChangePassword ? <form onSubmit={handlePasswordChange} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-600 text-white"><Lock className="h-5 w-5" /></div><div><h4 className="text-sm font-black text-gray-950">Change Password</h4><p className="text-[11px] text-gray-500">Verify the current password before setting a new one.</p></div></div>
                {passwordMsg && <div className={`mb-4 flex items-center gap-2 rounded-xl border p-3 font-semibold ${passwordMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{passwordMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}<span>{passwordMsg.text}</span></div>}
                <div className="space-y-4">
                  <label className="block space-y-1"><span className="font-bold text-gray-700">Current Password *</span><input required type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-200" /></label>
                  <label className="block space-y-1"><span className="font-bold text-gray-700">New Password *</span><input required minLength={8} type="password" autoComplete="new-password" value={newAdminPassword} onChange={event => setNewAdminPassword(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-200" /></label>
                  <label className="block space-y-1"><span className="font-bold text-gray-700">Confirm New Password *</span><input required minLength={8} type="password" autoComplete="new-password" value={confirmAdminPassword} onChange={event => setConfirmAdminPassword(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-200" /></label>
                  <p className="text-[11px] text-gray-500">Use at least 8 characters. Your password is stored as a bcrypt hash.</p>
                  <button type="submit" disabled={isChangingPassword} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 font-bold text-white hover:bg-amber-800 disabled:opacity-60"><Lock className="h-4 w-4" />{isChangingPassword ? 'Changing…' : 'Change Password'}</button>
                  <button type="button" onClick={() => { setCurrentPassword(''); setNewAdminPassword(''); setConfirmAdminPassword(''); setPasswordMsg(null); setShowChangePassword(false); }} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                </div>
              </form> : <section className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 text-center shadow-sm"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-600 text-white shadow-lg shadow-amber-100"><Lock className="h-6 w-6" /></div><h4 className="mt-4 text-base font-black text-gray-950">Account Password</h4><p className="mt-2 max-w-xs text-xs leading-relaxed text-gray-500">Change your password securely after verifying the current password.</p><button type="button" onClick={() => { setPasswordMsg(null); setShowChangePassword(true); }} className="mt-5 flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 font-bold text-white hover:bg-amber-800"><Lock className="h-4 w-4" />Change Password</button></section>}
            </div>
          )}

          {/* Create User and User Accounts are intentionally separate pages. */}
          {(activeTab === 'users' || activeTab === 'create-user') && (
            <div className="space-y-6">
              {activeTab === 'create-user' && (
              <form onSubmit={handleCreateOperator} className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1C4D8D] text-white"><UserPlus className="h-5 w-5" /></div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-950">Create Operator Account</h4>
                    <p className="text-[11px] text-gray-500">Operators can create and access their own entries; administrative controls remain hidden.</p>
                  </div>
                </div>

                {operatorMsg && <div className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${operatorMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{operatorMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}<span>{operatorMsg.text}</span></div>}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <label className="space-y-1"><span className="font-bold text-gray-700">Name *</span><input required value={operatorName} onChange={e => setOperatorName(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" /></label>
                  <label className="space-y-1"><span className="font-bold text-gray-700">Email *</span><input required type="email" value={operatorEmail} onChange={e => setOperatorEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" /></label>
                  <label className="space-y-1"><span className="font-bold text-gray-700">Phone No. *</span><input required inputMode="numeric" maxLength={10} value={operatorPhone} onChange={e => setOperatorPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" /></label>
                  <label className="space-y-1"><span className="font-bold text-gray-700">District</span><input readOnly value="Munger" className="w-full rounded-lg border border-green-200 bg-green-50 px-3 py-2 font-bold text-green-900" /></label>
                  <label className="space-y-1"><span className="font-bold text-gray-700">Constituency</span><input readOnly value="Tarapur" className="w-full rounded-lg border border-green-200 bg-green-50 px-3 py-2 font-bold text-green-900" /></label>
                  <label className="space-y-1"><span className="font-bold text-gray-700">Block *</span><select required value={operatorBlock} onChange={e => setOperatorBlock(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"><option value="">-- Select Block --</option>{OPERATOR_BLOCKS.map(block => <option key={block.name} value={block.name}>{block.name} · LGD {block.lgdCode}</option>)}</select></label>
                  <label className="space-y-1"><span className="font-bold text-gray-700">Password *</span><div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 focus-within:ring-2 focus-within:ring-blue-200"><Lock className="h-4 w-4 text-gray-400" /><input required minLength={8} type={showOperatorPassword ? 'text' : 'password'} value={operatorPassword} onChange={e => setOperatorPassword(e.target.value)} className="min-w-0 flex-1 border-0 px-2 py-2 outline-none" /><button type="button" onClick={() => setShowOperatorPassword(value => !value)} className="p-1 text-gray-500 hover:text-[#1C4D8D]" aria-label={showOperatorPassword ? 'Hide password' : 'Show password'}>{showOperatorPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
                  <label className="space-y-1"><span className="font-bold text-gray-700">Confirm Password *</span><div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 focus-within:ring-2 focus-within:ring-blue-200"><Lock className="h-4 w-4 text-gray-400" /><input required minLength={8} type={showOperatorConfirmPassword ? 'text' : 'password'} value={operatorConfirmPassword} onChange={e => setOperatorConfirmPassword(e.target.value)} className="min-w-0 flex-1 border-0 px-2 py-2 outline-none" /><button type="button" onClick={() => setShowOperatorConfirmPassword(value => !value)} className="p-1 text-gray-500 hover:text-[#1C4D8D]" aria-label={showOperatorConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}>{showOperatorConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
                  <div className="flex items-end"><button type="submit" disabled={isCreatingOperator} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1C4D8D] px-4 py-2.5 font-bold text-white hover:bg-[#163c6f] disabled:opacity-60"><UserPlus className="h-4 w-4" />{isCreatingOperator ? 'Creating…' : 'Create Operator'}</button></div>
                </div>
              </form>
              )}

              {activeTab === 'users' && (
              <div className="space-y-3">
                {userAccountMsg && <div className={`flex items-center justify-between rounded-xl border p-3 font-semibold ${userAccountMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}><span className="flex items-center gap-2">{userAccountMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{userAccountMsg.text}</span><button type="button" onClick={() => setUserAccountMsg(null)} className="p-1"><X className="h-3.5 w-3.5" /></button></div>}
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Role / Block</th>
                      <th className="py-2.5 px-3 text-center">Entries</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                       <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{u.name}</td>
                        <td className="py-2.5 px-3 text-gray-600 font-mono">{u.email}</td>
                        <td className="py-2.5 px-3 text-gray-600 font-mono">{u.phone || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                            u.role === 'REVIEWER' ? 'bg-amber-100 text-amber-800' :
                            u.role === 'DATA_ENTRY' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role === 'DATA_ENTRY' ? 'OPERATOR' : u.role}
                          </span>
                          <select value={u.blockName || ''} disabled={updatingOperatorId === u.id} onChange={event => handleOperatorBlockChange(u, event.target.value)} className="mt-2 w-full min-w-[150px] rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] font-bold text-blue-800 outline-none disabled:opacity-60"><option value="">Assign block</option>{OPERATOR_BLOCKS.map(block => <option key={block.lgdCode} value={block.name}>{block.name} · LGD {block.lgdCode}</option>)}</select>
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-[#1C4D8D]">{u._count?.applications || 0}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right"><button type="button" onClick={() => { setOperatorToDelete(u); setDeleteOperatorPassword(''); setDeleteOperatorError(null); setUserAccountMsg(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-bold text-red-700 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" />Delete</button></td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-gray-500">No operator accounts found.</td></tr>}
                  </tbody>
                </table>
              </div>
              </div>
              )}
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

        </div>
      </div>
      {operatorToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md" onMouseDown={event => { if (event.target === event.currentTarget) closeDeleteOperator(); }}>
          <form onSubmit={handleDeleteOperator} className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(2,6,23,.45)]">
            <div className="flex items-center gap-4 border-b border-red-100 bg-gradient-to-r from-red-50 to-orange-50 px-6 py-5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200"><Trash2 className="h-5 w-5" /></div><div><h4 className="font-black text-gray-950">Delete operator account?</h4><p className="mt-1 text-xs text-red-700">{operatorToDelete.name} · {operatorToDelete.blockName} Block</p></div></div>
            <div className="space-y-5 p-6"><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">The login account will be permanently removed. Applications entered by this operator will remain available to the admin with the operator name and block preserved.</p><div><label htmlFor="delete-operator-password" className="mb-1.5 block text-xs font-bold text-gray-700">Admin password</label><div className="flex items-center gap-2 rounded-xl border border-gray-300 px-3 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100"><Lock className="h-4 w-4 text-gray-400" /><input id="delete-operator-password" type="password" autoFocus autoComplete="current-password" value={deleteOperatorPassword} onChange={event => { setDeleteOperatorPassword(event.target.value); setDeleteOperatorError(null); }} className="h-11 min-w-0 flex-1 border-0 bg-transparent outline-none" placeholder="Enter your password" /></div>{deleteOperatorError && <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><AlertCircle className="h-3.5 w-3.5" />{deleteOperatorError}</div>}</div><div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={isDeletingOperator} onClick={closeDeleteOperator} className="rounded-xl border border-gray-300 px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={isDeletingOperator || !deleteOperatorPassword} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{isDeletingOperator ? 'Deleting…' : 'Delete operator'}</button></div></div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

