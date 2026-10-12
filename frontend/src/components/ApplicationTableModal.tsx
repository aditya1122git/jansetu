import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Trash2,
  Database,
  Paperclip,
  Lock
} from './icons';
import { api } from '../services/api';
import { ComplaintCategory, Application, User } from '../types';

const TARAPUR_BLOCKS = [
  { name: 'Tarapur', lgdCode: '2458' },
  { name: 'Sangrampur', lgdCode: '2457' },
  { name: 'Asarganj', lgdCode: '2451' }
] as const;

interface ApplicationTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageMode?: boolean;
  currentUser: User | null;
  onSelectApplication: (app: Application) => void;
  language: 'hi' | 'en';
  initialTab?: 'all' | 'important' | 'normal' | 'pending' | 'in_progress' | 'completed' | 'overdue' | 'active_followups' | 'disposed';
  onDataChanged?: () => void;
}

type DestructiveAction =
  | { kind: 'single'; application: Application }
  | { kind: 'all' };

export const ApplicationTableModal: React.FC<ApplicationTableModalProps> = ({
  isOpen,
  onClose,
  pageMode = false,
  currentUser,
  onSelectApplication,
  language,
  initialTab,
  onDataChanged
}) => {
  // View Tabs
  const [activeTab, setActiveTab] = useState<
    'all' | 'important' | 'normal' | 'pending' | 'in_progress' | 'completed' | 'overdue' | 'active_followups' | 'disposed'
  >(initialTab || 'all');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlockName, setSelectedBlockName] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [assignedEmployeeFilter, setAssignedEmployeeFilter] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('dateReceived');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Data
  const [applications, setApplications] = useState<Application[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);

  // Edit State
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState<'IMPORTANT' | 'NORMAL'>('NORMAL');
  const [editStatus, setEditStatus] = useState<string>('PENDING');
  const [editEmployee, setEditEmployee] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [destructiveAction, setDestructiveAction] = useState<DestructiveAction | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFilterData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchApplications();
    }
  }, [
    isOpen,
    activeTab,
    page,
    sortBy,
    sortOrder,
    selectedBlockName,
    selectedCategoryId,
    selectedPriority,
    selectedStatus,
    dateFrom,
    dateTo,
    selectedOperatorId
  ]);

  const loadFilterData = async () => {
    try {
      const cRes = await api.getCategories();
      setCategories(cRes.categories);
      if (currentUser?.role === 'ADMIN') {
        const userRes = await api.getUsers();
        setOperators(userRes.users.filter(user => user.role === 'DATA_ENTRY'));
      }
    } catch (e) {
      console.error('Error loading master filters', e);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        sortBy,
        sortOrder,
        search: searchTerm,
        blockName: selectedBlockName,
        categoryId: selectedCategoryId,
        priority: selectedPriority,
        status: selectedStatus,
        assignedEmployee: assignedEmployeeFilter,
        createdById: selectedOperatorId,
        dateFrom,
        dateTo
      };

      if (activeTab !== 'all') {
        params.viewType = activeTab;
      }

      const res = await api.getApplications(params);
      setApplications(res.applications);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const handleExportCsv = () => {
    const params: Record<string, any> = {
      blockName: selectedBlockName,
      categoryId: selectedCategoryId,
      priority: selectedPriority || (activeTab === 'important' ? 'IMPORTANT' : activeTab === 'normal' ? 'NORMAL' : ''),
      status: selectedStatus || (['pending', 'in_progress', 'completed'].includes(activeTab) ? activeTab.toUpperCase() : ''),
      createdById: selectedOperatorId
    };
    window.open(api.getExportCsvUrl(params), '_blank');
  };

  const openEditModal = (app: Application) => {
    setEditApp(app);
    setEditCategory(app.categoryName || app.category?.name || '');
    setEditPriority(app.priority);
    setEditStatus(app.status);
    setEditEmployee(app.assignedEmployee || '');
    setEditRemarks(app.internalRemarks || '');
  };

  const saveEdit = async () => {
    if (!editApp) return;
    setIsSavingEdit(true);
    try {
      await api.updateApplication(editApp.id, {
        categoryName: editCategory.trim() || undefined,
        priority: editPriority,
        status: editStatus,
        assignedEmployee: editEmployee,
        internalRemarks: editRemarks
      });
      setEditApp(null);
      fetchApplications();
    } catch (e: any) {
      alert('Error updating record: ' + (e.message || 'Error'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openDeleteConfirmation = (action: DestructiveAction) => {
    setDestructiveAction(action);
    setDeletePassword('');
    setDeleteError(null);
    setActionNotice(null);
  };

  const closeDeleteConfirmation = () => {
    if (isDeleting) return;
    setDestructiveAction(null);
    setDeletePassword('');
    setDeleteError(null);
  };

  const confirmDestructiveAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destructiveAction) return;
    if (!deletePassword) {
      setDeleteError(language === 'hi' ? 'कृपया अपना अकाउंट पासवर्ड दर्ज करें।' : 'Please enter your account password.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const isClearAll = destructiveAction.kind === 'all';
      if (isClearAll) {
        await api.clearAllApplications(deletePassword);
      } else {
        await api.deleteApplication(destructiveAction.application.id, deletePassword);
      }
      await fetchApplications();
      if (onDataChanged) onDataChanged();
      setDestructiveAction(null);
      setDeletePassword('');
      setActionNotice({
        type: 'success',
        message: isClearAll
          ? (language === 'hi' ? 'सभी आवेदन रिकॉर्ड सफलतापूर्वक हटा दिए गए।' : 'All application records were permanently cleared.')
          : (language === 'hi' ? 'आवेदन रिकॉर्ड सफलतापूर्वक हटा दिया गया।' : 'Application record was permanently deleted.')
      });
    } catch (e: any) {
      setDeleteError(e.message || 'Unable to complete the deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'DATA_ENTRY' || currentUser?.role === 'REVIEWER';
  const canClearAll = currentUser?.role === 'ADMIN';

  if (!isOpen) return null;

  return (
    <div className={pageMode ? 'workspace-page' : 'fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'}>
      {actionNotice && (
        <div className="fixed right-4 top-24 z-[80] w-[min(92vw,390px)] rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl" role="status">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">Action completed</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{actionNotice.message}</p>
            </div>
            <button type="button" onClick={() => setActionNotice(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" aria-label="Close message">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="workspace-page-panel bg-white rounded-2xl max-w-7xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp my-4 max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#1C4D8D] text-white px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C35504] flex items-center justify-center font-bold text-sm shadow">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {language === 'hi' ? 'आवेदन स्थिति व डेटाबेस' : 'Application Status & Database'}
              </h3>
              <p className="text-xs text-blue-200">
                {language === 'hi'
                  ? 'बहु-मानदंड फ़िल्टर, क्रमबद्धता, निर्यात व डेटा प्रबंधन'
                  : 'Multi-parameter Search, Filter Engine, Sorting & Excel/CSV Exports'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canClearAll && (
              <>
                <button
                  onClick={() => openDeleteConfirmation({ kind: 'all' })}
                  className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  title="Permanently clear all application data"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'सभी डेटा हटाएं' : 'Clear All Data'}</span>
                </button>
              </>
            )}
            <button
              onClick={handleExportCsv}
              className="bg-white/10 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download filtered records to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>{language === 'hi' ? 'CSV डाउनलोड' : 'Download CSV'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (7 Views) */}
        <div className="bg-gray-100 border-b border-gray-200 px-6 pt-2 flex items-center gap-1 overflow-x-auto flex-shrink-0">
          {[
            { id: 'all', label: 'All Applications' },
            { id: 'important', label: 'Important (High Priority)', badgeColor: 'bg-red-500' },
            { id: 'normal', label: 'Normal Priority' },
            { id: 'active_followups', label: 'Active Follow-Ups', badgeColor: 'bg-amber-500' },
            { id: 'pending', label: 'Pending' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed / Disposed', badgeColor: 'bg-emerald-500' },
            { id: 'overdue', label: 'Overdue (SLA Exceeded)', badgeColor: 'bg-purple-500' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id || (tab.id === 'completed' && activeTab === 'disposed')
                  ? 'bg-white text-[#1C4D8D] border-t-2 border-[#C35504] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {tab.badgeColor && <span className={`w-2 h-2 rounded-full ${tab.badgeColor}`}></span>}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3 flex-shrink-0 text-xs">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Application ID, Applicant Name, Mobile Number, Subject, or Assembly Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#1C4D8D]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#1C4D8D] text-white px-5 py-2 rounded-lg font-semibold hover:bg-[#163c6f] transition flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedBlockName('');
                setSelectedCategoryId('');
                setSelectedPriority('');
                setSelectedStatus('');
                setDateFrom('');
                setDateTo('');
                setAssignedEmployeeFilter('');
                setSelectedOperatorId('');
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-200 transition"
              title="Reset Filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Secondary Filter Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
            {currentUser?.role === 'ADMIN' && (
              <div>
                <select value={selectedOperatorId} onChange={(event) => { setSelectedOperatorId(event.target.value); setPage(1); }} className="w-full border border-blue-300 rounded-lg px-2 py-1.5 bg-blue-50 text-[#1C4D8D] font-semibold outline-none">
                  <option value="">All Operators</option>
                  {operators.map(operator => <option key={operator.id} value={operator.id}>{operator.name} · {operator.blockName || 'No block'}</option>)}
                </select>
              </div>
            )}
            <div>
              <select
                value={selectedBlockName}
                onChange={(e) => {
                  setSelectedBlockName(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
              >
                <option value="">All Blocks</option>
                {TARAPUR_BLOCKS.map((block) => (
                  <option key={block.lgdCode} value={block.name}>
                    {block.name} · LGD {block.lgdCode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
              >
                <option value="">All Priorities</option>
                <option value="IMPORTANT">Important</option>
                <option value="NORMAL">Normal</option>
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AWAITING_INFO">Awaiting Info</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
              />
            </div>

            <div>
              <input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Applications Data Table */}
        <div className="overflow-x-auto flex-grow">
          {loading ? (
            <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1C4D8D]" />
              <p className="text-sm">Querying database records...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center text-gray-500 space-y-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-700 text-sm">
                  {language === 'hi' ? 'डेटाबेस में कोई आवेदन रिकॉर्ड मौजूद नहीं है' : 'No applications found in database'}
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  {language === 'hi'
                    ? 'कोई रिकॉर्ड उपलब्ध नहीं है। नया आवेदन दर्ज करने के लिए Application Services का उपयोग करें।'
                    : 'No records are available. Use Application Services to register a new application.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs transition border border-gray-200"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'hi' ? 'CSV डाउनलोड' : 'Download CSV'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 text-gray-700 uppercase font-bold sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3">App ID</th>
                  <th className="py-3 px-3">Applicant Name</th>
                  <th className="py-3 px-3">District</th>
                  <th className="py-3 px-3">Assembly (Code)</th>
                  <th className="py-3 px-3">Block (LGD)</th>
                  {currentUser?.role === 'ADMIN' && <th className="py-3 px-3">Entered By</th>}
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Desk</th>
                  <th className="py-3 px-3">Received</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-blue-50/50 transition cursor-pointer"
                    onClick={() => onSelectApplication(app)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-[#1C4D8D] flex items-center gap-1.5 flex-wrap">
                        <span>{app.applicationId}</span>
                        {app.documents && app.documents !== '[]' && app.documents !== 'null' && (
                          <span
                            className="inline-flex items-center gap-0.5 bg-blue-100 text-[#1C4D8D] text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs"
                            title="Attached evidence / documents present"
                          >
                            <Paperclip className="w-2.5 h-2.5" />
                            <span>साक्ष्य</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900">{app.applicantName}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{app.mobileNumber}</div>
                    </td>
                    <td className="py-3 px-3 text-gray-700">
                      {app.district?.name}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-900">
                        {app.constituency?.name || app.customConstituency || 'Unassigned'}
                      </div>
                      <span className="inline-block bg-blue-100 text-[#1C4D8D] text-[10px] font-mono px-1.5 py-0.2 rounded font-bold">
                        {app.verifiedAcCode}
                      </span>
                    </td>
                    <td className="py-3 px-3"><div className="font-semibold text-gray-900">{app.blockName || '—'}</div><div className="font-mono text-[10px] text-gray-500">{app.blockLgdCode || '—'}</div></td>
                    {currentUser?.role === 'ADMIN' && <td className="py-3 px-3"><div className="font-semibold text-gray-900">{app.createdByName || 'Legacy record'}</div><div className="text-[10px] text-gray-500">{app.createdByEmail || '—'}</div></td>}
                    <td className="py-3 px-3 text-gray-700 font-medium">
                      {app.categoryName || app.category?.name || 'General'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          app.priority === 'IMPORTANT'
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {app.priority === 'IMPORTANT' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                        )}
                        {app.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          app.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'AWAITING_INFO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 max-w-[140px] truncate" title={app.assignedEmployee}>
                      {app.assignedEmployee || 'Unassigned'}
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(app.dateReceived).toLocaleDateString()}
                    </td>
                    <td
                      className="py-3 px-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectApplication(app)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"
                          title="View Application Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEditModal(app)}
                              className="p-1.5 text-amber-600 hover:bg-amber-100 rounded transition"
                              title="Edit / Change Priority / Reassign"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirmation({ kind: 'single', application: app })}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"
                              title="Delete Application"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination & Status Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-600 flex-shrink-0">
          <div>
            Showing <strong>{applications.length}</strong> of <strong>{total}</strong> applications recorded
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Password-protected destructive action confirmation */}
        {destructiveAction && createPortal((
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDeleteConfirmation();
            }}
          >
            <form
              onSubmit={confirmDestructiveAction}
              className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(2,6,23,.45)] animate-scaleUp"
            >
              <div className="flex items-center gap-4 border-b border-red-100 bg-gradient-to-r from-red-50 to-orange-50 px-6 py-5">
                <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-950">
                    {destructiveAction.kind === 'all' ? 'Clear all application data?' : 'Delete application?'}
                  </h4>
                  <p className="truncate text-xs text-red-700">
                    {destructiveAction.kind === 'all'
                      ? `${total} application record${total === 1 ? '' : 's'} will be removed`
                      : `${destructiveAction.application.applicationId} · ${destructiveAction.application.applicantName}`}
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  This action is permanent. Enter the password for <strong>{currentUser?.email}</strong> to confirm that you authorize this deletion.
                </p>

                <div>
                  <label htmlFor="delete-confirm-password" className="mb-1.5 block text-xs font-bold text-gray-700">
                    Account password
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100">
                    <Lock className="h-4 w-4 flex-none text-gray-400" />
                    <input
                      id="delete-confirm-password"
                      type="password"
                      autoFocus
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={(event) => {
                        setDeletePassword(event.target.value);
                        setDeleteError(null);
                      }}
                      className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                      placeholder="Enter your password"
                    />
                  </div>
                  {deleteError && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                      <span>{deleteError}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                  <button type="button" disabled={isDeleting} onClick={closeDeleteConfirmation} className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={isDeleting || !deletePassword} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeleting ? 'Verifying & deleting…' : destructiveAction.kind === 'all' ? 'Clear all data' : 'Delete permanently'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ), document.body)}

        {/* Quick Edit Modal */}
        {editApp && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setEditApp(null)}
          >
            <div
              className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-gray-200 animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h4 className="font-bold text-[#1C4D8D] text-base">
                  Authorized Edit: {editApp.applicationId}
                </h4>
                <button
                  onClick={() => setEditApp(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Complaint Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full border rounded-lg p-2 font-medium text-gray-900"
                    placeholder="Enter complaint category"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Original category is preserved. You can update or refine this text as needed.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Priority (Maintains Audit Trail)
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full border rounded-lg p-2 font-bold"
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="IMPORTANT">Important (High Priority)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Status Transition
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border rounded-lg p-2 font-bold"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="AWAITING_INFO">Awaiting Information</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Assigned Employee / Department
                  </label>
                  <input
                    type="text"
                    value={editEmployee}
                    onChange={(e) => setEditEmployee(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Internal Remarks / Action Justification
                  </label>
                  <textarea
                    rows={3}
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="w-full border rounded-lg p-2"
                    placeholder="Enter reason for changes (recorded in audit logs)..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5 pt-3 border-t">
                <button
                  onClick={() => setEditApp(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSavingEdit}
                  className="bg-[#1C4D8D] text-white px-5 py-2 rounded-lg font-bold hover:bg-[#163c6f] disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

