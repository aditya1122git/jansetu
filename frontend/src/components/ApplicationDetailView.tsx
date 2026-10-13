import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar,
  User as UserIcon,
  Phone,
  MapPin,
  Tag,
  Clock,
  History,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  Download,
  FileText,
  Shield,
  Send,
  Building,
  CheckCircle,
  Trash2,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  X,
  Upload,
  Plus,
  LayoutGrid,
  List,
  ZoomIn,
  Lock
} from './icons';
import { api } from '../services/api';
import { Application, User } from '../types';

interface PreviewDocState {
  url: string;
  name: string;
  isImage: boolean;
  isPdf: boolean;
  size?: number;
}

interface ApplicationDetailViewProps {
  applicationId: number | string;
  onBack: () => void;
  currentUser: User | null;
  onRefreshStats?: () => void;
  language: 'hi' | 'en';
}

export const ApplicationDetailView: React.FC<ApplicationDetailViewProps> = ({
  applicationId,
  onBack,
  currentUser,
  onRefreshStats,
  language
}) => {
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update modal / form
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Follow-up modal / form
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpAction, setFollowUpAction] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpNextDate, setFollowUpNextDate] = useState('');
  const [followUpReassign, setFollowUpReassign] = useState('');
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);

  // Reopen modal / form
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  // Delete modal / form
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Document & Evidence Viewer Modal
  const [previewDoc, setPreviewDoc] = useState<PreviewDocState | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [evidenceViewMode, setEvidenceViewMode] = useState<'gallery' | 'list'>('gallery');

  useEffect(() => {
    loadApplicationData();
  }, [applicationId]);

  const loadApplicationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getApplication(applicationId);
      setApp(res.application);
      setNewStatus(res.application.status);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;
    setIsUpdatingStatus(true);
    try {
      await api.updateApplication(app.id, {
        status: newStatus,
        internalRemarks: statusRemarks ? `${app.internalRemarks ? app.internalRemarks + ' | ' : ''}${statusRemarks}` : undefined
      });
      setShowStatusModal(false);
      setStatusRemarks('');
      await loadApplicationData();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;
    if (!followUpAction.trim() || !followUpNotes.trim()) {
      alert('Action taken and reminder notes are mandatory.');
      return;
    }
    setIsAddingFollowUp(true);
    try {
      await api.addFollowUp(app.id, {
        actionTaken: followUpAction.trim(),
        reminderNotes: followUpNotes.trim(),
        nextFollowUpDate: followUpNextDate ? new Date(followUpNextDate).toISOString() : undefined,
        reassignEmployee: followUpReassign.trim() || undefined
      });
      setShowFollowUpModal(false);
      setFollowUpAction('');
      setFollowUpNotes('');
      setFollowUpNextDate('');
      setFollowUpReassign('');
      await loadApplicationData();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      alert('Error adding follow-up: ' + err.message);
    } finally {
      setIsAddingFollowUp(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !reopenReason.trim()) return;
    setIsReopening(true);
    try {
      await api.reopenApplication(app.id, { reopenReason: reopenReason.trim() });
      setShowReopenModal(false);
      setReopenReason('');
      await loadApplicationData();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      alert('Error reopening application: ' + err.message);
    } finally {
      setIsReopening(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!app) return;
    if (!deletePassword) {
      setDeleteError(language === 'hi' ? 'कृपया अपना अकाउंट पासवर्ड दर्ज करें।' : 'Please enter your account password.');
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteApplication(app.id, deletePassword);
      setShowDeleteModal(false);
      if (onRefreshStats) onRefreshStats();
      onBack();
    } catch (err: any) {
      setDeleteError(err.message || 'Unable to delete this application.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportSummary = () => {
    if (!app) return;
    const summaryText = `E-SEWAK TARAPUR - APPLICATION SUMMARY REPORT
==================================================
Application ID: ${app.applicationId}
Status: ${app.status}
Priority: ${app.priority}
Date Received: ${new Date(app.dateReceived).toLocaleDateString()}
Last Updated: ${new Date(app.updatedAt).toLocaleDateString()}

APPLICANT INFORMATION:
Name: ${app.applicantName}
Father/Husband: ${app.fatherOrHusbandName || 'N/A'}
Mobile: ${app.mobileNumber}
Address: ${app.address || 'N/A'}
District: ${app.district?.name || 'N/A'}
Assembly Constituency: ${app.constituency?.name || app.customConstituency || 'N/A'} (${app.constituency?.acCode || app.verifiedAcCode || 'N/A'})
Block: ${app.blockName || 'N/A'} (LGD ${app.blockLgdCode || 'N/A'})
Entry Created By: ${app.createdByName || 'Legacy record'} (${app.createdByEmail || 'N/A'})

GRIEVANCE DETAILS:
Category: ${app.categoryName || app.category?.name || 'General'}
Subject: ${app.subject}
Details: ${app.description}

ASSIGNMENT & FOLLOW-UP:
Assigned Officer: ${app.assignedEmployee || 'Unassigned'}
Internal Remarks: ${app.internalRemarks || 'None'}

Report Generated: ${new Date().toLocaleString()}
Portal: E-Sewa Tarapur (Application & Grievance Management Portal)
==================================================`;

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `E_Sewak_Tarapur_${app.applicationId}_Summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#1C4D8D] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-600">
          {language === 'hi' ? 'आवेदन विवरण लोड हो रहा है...' : 'Loading application details...'}
        </p>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-900">
            {language === 'hi' ? 'आवेदन प्राप्त नहीं हुआ' : 'Application Not Found'}
          </h2>
          <p className="text-sm text-red-700">{error || 'Requested application record could not be loaded.'}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-[#1C4D8D] text-white px-5 py-2 rounded-xl text-sm font-bold shadow hover:bg-[#163c6f] transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{language === 'hi' ? 'डैशबोर्ड पर वापस जाएं' : 'Back to Dashboard'}</span>
          </button>
        </div>
      </div>
    );
  }

  let parsedDocs: any[] = [];
  if (app?.documents) {
    let raw: any = app.documents;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch {
            // Keep parsed string
          }
        }
      } catch {
        if (raw.includes(',')) {
          raw = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (raw.trim()) {
          raw = [raw.trim()];
        }
      }
    }
    if (Array.isArray(raw)) {
      parsedDocs = raw;
    } else if (raw && typeof raw === 'object') {
      parsedDocs = [raw];
    } else if (typeof raw === 'string' && raw.trim()) {
      parsedDocs = [{ originalName: raw.trim(), filename: raw.trim(), url: `/api/documents/${encodeURIComponent(raw.trim())}` }];
    }
  }

  const getAttachmentInfo = (doc: any, i: number) => {
    const token = localStorage.getItem('bacms_token') || '';
    let filename = '';
    let docName = '';
    let size = doc?.size || 0;
    let mimetype = doc?.mimetype || '';

    if (typeof doc === 'string') {
      filename = doc.split('?')[0].split(/[\\/]/).pop() || doc;
      docName = filename;
    } else if (doc && typeof doc === 'object') {
      filename = doc.filename ||
        (doc.url ? doc.url.split('?')[0].split(/[\\/]/).pop() : '') ||
        (doc.filePath ? doc.filePath.split(/[\\/]/).pop() : '') ||
        (doc.path ? doc.path.split(/[\\/]/).pop() : '') ||
        `attachment_${i + 1}`;
      docName = doc.originalName || doc.originalname || doc.fileName || filename || `Attachment ${i + 1}`;
    }

    const rawUrl = (doc && typeof doc === 'object' && doc.url && doc.url.startsWith('/api/documents/'))
      ? doc.url
      : `/api/documents/${encodeURIComponent(filename)}`;

    const viewHref = token ? `${rawUrl}?token=${encodeURIComponent(token)}` : rawUrl;
    const downloadHref = token ? `${rawUrl}?token=${encodeURIComponent(token)}&download=1` : `${rawUrl}?download=1`;

    const isImg = (mimetype && mimetype.startsWith('image/')) ||
      /\.(jpe?g|png|webp|gif|svg|bmp|jfif)$/i.test(docName) ||
      /\.(jpe?g|png|webp|gif|svg|bmp|jfif)$/i.test(filename);

    const isPdf = (mimetype && mimetype.includes('pdf')) ||
      /\.pdf$/i.test(docName) ||
      /\.pdf$/i.test(filename);

    return {
      filename,
      docName,
      rawUrl,
      viewHref,
      downloadHref,
      isImg,
      isPdf,
      size
    };
  };

  const handleAddAttachments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    if (!e.target.files || e.target.files.length === 0 || !app) return;
    const filesToUpload = Array.from(e.target.files);
    setIsUploadingAttachment(true);
    setAttachmentUploadProgress(0);
    try {
      const res = await api.uploadFiles(filesToUpload, (pct) => {
        setAttachmentUploadProgress(pct);
      });
      const currentDocs = Array.isArray(parsedDocs) ? parsedDocs : [];
      const updatedDocs = [...currentDocs, ...res.files];
      const updateRes = await api.updateApplication(app.id, { documents: updatedDocs });
      if (updateRes && updateRes.application) {
        setApp(updateRes.application);
      } else {
        await loadApplicationData();
      }
      if (onRefreshStats) onRefreshStats();
      e.target.value = '';
    } catch (err: any) {
      setAttachmentError(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
      setAttachmentUploadProgress(0);
    }
  };

  const isDisposedOrCompleted = app.status === 'COMPLETED' || app.status === 'DISPOSED';
  const canModify = currentUser && currentUser.role !== 'READONLY';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16 print:bg-white print:pb-0">
      {/* Top Breadcrumb & Action Header */}
      <div className="bg-white border-b border-gray-200 sticky top-12 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold transition shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 text-[#1C4D8D]" />
              <span>{language === 'hi' ? '← वापस सूची पर जाएं' : '← Back to List'}</span>
            </button>
            <div className="h-4 w-px bg-gray-300 hidden sm:block" />
            <nav className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span className="hover:text-gray-800 cursor-pointer" onClick={onBack}>E-Sewa Tarapur</span>
              <span>&rsaquo;</span>
              <span className="hover:text-gray-800 cursor-pointer" onClick={onBack}>
                {language === 'hi' ? 'आवेदन' : 'Applications'}
              </span>
              <span>&rsaquo;</span>
              <span className="text-[#1C4D8D] font-bold font-mono">{app.applicationId}</span>
            </nav>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {canModify && (
              <>
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="bg-[#1C4D8D] hover:bg-[#163c6f] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'स्थिति बदलें' : 'Update Status'}</span>
                </button>
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'फॉलो-अप जोड़ें' : 'Add Follow-Up'}</span>
                </button>
              </>
            )}

            {canModify && isDisposedOrCompleted && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'पुनः खोलें' : 'Reopen Application'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Print Application Docket"
            >
              <Printer className="w-3.5 h-3.5 text-gray-700" />
              <span>{language === 'hi' ? 'प्रिंट' : 'Print'}</span>
            </button>

            <button
              onClick={handleExportSummary}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Export Text Summary"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'निर्यात सारांश' : 'Export Summary'}</span>
            </button>

            {canModify && (
              <button
                onClick={() => {
                  setDeletePassword('');
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs ml-1"
                title="Permanently Delete Application Record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'डेटा हटाएं' : 'Delete Application'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0b2447] via-[#10305d] to-[#1C4D8D] rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-blue-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xl sm:text-2xl font-black tracking-wider text-amber-300">
                  {app.applicationId}
                </span>
                <span
                  className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    app.priority === 'IMPORTANT'
                      ? 'bg-red-500 text-white ring-2 ring-red-400/40'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {app.priority === 'IMPORTANT' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  {app.priority} PRIORITY
                </span>
                <span
                  className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    app.status === 'COMPLETED' || app.status === 'DISPOSED'
                      ? 'bg-emerald-500 text-white'
                      : app.status === 'IN_PROGRESS'
                      ? 'bg-amber-500 text-gray-950 font-black'
                      : 'bg-blue-400 text-gray-950 font-bold'
                  }`}
                >
                  STATUS: {app.status}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {app.subject}
              </h1>
              <div className="flex items-center gap-4 text-xs text-blue-200 flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Received: {new Date(app.dateReceived).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-300" />
                  <span>Updated: {new Date(app.updatedAt).toLocaleDateString()}</span>
                </div>
                {app.assignedEmployee && (
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Assigned Officer: <strong className="text-white">{app.assignedEmployee}</strong></span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center min-w-[200px] flex-shrink-0">
              <div className="text-[11px] text-blue-200 uppercase font-bold tracking-wider">
                {language === 'hi' ? 'विभाग / श्रेणी' : 'Department / Category'}
              </div>
              <div className="text-base font-black text-amber-300 mt-1">
                {app.categoryName || app.category?.name || 'General Grievance'}
              </div>
              <div className="text-[11px] text-blue-100 mt-1">
                {app.district?.name || 'Bihar'} &bull; {app.constituency?.acCode || app.verifiedAcCode || 'AC'}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Applicant & Grievance Body */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Details Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-[#1C4D8D]">
                <UserIcon className="w-5 h-5 text-[#1C4D8D]" />
                <h2 className="text-base font-bold">
                  {language === 'hi' ? 'आवेदक की संपूर्ण जानकारी' : 'Applicant Information'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-gray-400 uppercase font-semibold text-[10px]">Applicant Full Name</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">{app.applicantName}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-gray-400 uppercase font-semibold text-[10px]">Father's / Husband's Name</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">{app.fatherOrHusbandName || '—'}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-gray-400 uppercase font-semibold text-[10px]">Contact Mobile Number</div>
                  <div className="text-sm font-bold text-[#1C4D8D] font-mono mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{app.mobileNumber}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-gray-400 uppercase font-semibold text-[10px]">District & Constituency</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>{app.district?.name || '—'} &bull; {app.constituency?.name || app.customConstituency || '—'} ({app.constituency?.acCode || app.verifiedAcCode || '—'})</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-gray-400 uppercase font-semibold text-[10px]">Block & LGD Code</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">{app.blockName || '—'} <span className="font-mono text-[#1C4D8D]">({app.blockLgdCode || '—'})</span></div>
                </div>

                {currentUser?.role === 'ADMIN' && (
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <div className="text-blue-500 uppercase font-semibold text-[10px]">Entry Created By</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{app.createdByName || 'Legacy record'}</div>
                    <div className="text-[10px] text-gray-500">{app.createdByEmail || 'Creator information unavailable'}</div>
                  </div>
                )}

                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-gray-400 uppercase font-semibold text-[10px]">Full Postal Address</div>
                  <div className="text-xs text-gray-800 mt-0.5">{app.address || 'Address details on physical dossier'}</div>
                </div>
              </div>
            </div>

            {/* Grievance Statement Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-[#1C4D8D]">
                <FileText className="w-5 h-5 text-[#1C4D8D]" />
                <h2 className="text-base font-bold">
                  {language === 'hi' ? 'आवेदन एवं शिकायत का संपूर्ण विवरण' : 'Application & Grievance Statement'}
                </h2>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Subject / Title</div>
                <div className="text-base font-extrabold text-gray-900 mt-1">{app.subject}</div>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Detailed Grievance Description</div>
                <div className="mt-2 bg-slate-50 p-4 rounded-xl border border-gray-100 text-xs sm:text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                  {app.description}
                </div>
              </div>

              {app.internalRemarks && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-amber-900 uppercase">Internal Administrative Remarks / Action Notes</div>
                  <div className="text-xs text-amber-950 mt-1 font-medium">{app.internalRemarks}</div>
                </div>
              )}
            </div>

            {/* Resolution Summary (Disposed Cases) */}
            {isDisposedOrCompleted && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-base font-bold">
                    {language === 'hi' ? 'मामला निस्तारित / समाधान विवरण (Disposed Case Summary)' : 'Case Resolution & Disposal Summary'}
                  </h3>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  This application has been formally marked as <strong>{app.status}</strong>. All scheduled follow-up reminders have been completed and resolution notes are permanently archived in the official ledger.
                </p>
                <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium">
                  <strong>Resolution Notes:</strong> {app.internalRemarks || 'Successfully inspected and verified with administrative action completed.'}
                </div>
              </div>
            )}

            {/* Uploaded Attachments & Evidence Gallery */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5 text-[#1C4D8D]">
                  <Paperclip className="w-5 h-5 text-[#1C4D8D]" />
                  <h2 className="text-base font-bold text-gray-900">
                    {language === 'hi' ? 'संलग्न दस्तावेज व साक्ष्य' : 'Uploaded Attachments & Evidence'}
                  </h2>
                  <span className="bg-blue-100 text-[#1C4D8D] text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {parsedDocs.length} {language === 'hi' ? 'फ़ाइलें' : 'Files'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Gallery / List View Mode Toggle */}
                  {parsedDocs.length > 0 && (
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">
                      <button
                        type="button"
                        onClick={() => setEvidenceViewMode('gallery')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                          evidenceViewMode === 'gallery'
                            ? 'bg-white text-[#1C4D8D] shadow-xs font-bold'
                            : 'hover:text-gray-900'
                        }`}
                        title="Gallery View"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>{language === 'hi' ? 'गैलरी' : 'Gallery'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvidenceViewMode('list')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                          evidenceViewMode === 'list'
                            ? 'bg-white text-[#1C4D8D] shadow-xs font-bold'
                            : 'hover:text-gray-900'
                        }`}
                        title="List View"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>{language === 'hi' ? 'सूची' : 'List'}</span>
                      </button>
                    </div>
                  )}

                  {canModify && (
                    <div>
                      <input
                        type="file"
                        id="attach-evidence-file-input"
                        multiple
                        onChange={handleAddAttachments}
                        disabled={isUploadingAttachment}
                        className="hidden"
                      />
                      <label
                        htmlFor="attach-evidence-file-input"
                        className="inline-flex items-center gap-1.5 bg-[#1C4D8D] hover:bg-[#163c6f] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition disabled:opacity-50"
                      >
                        {isUploadingAttachment ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{language === 'hi' ? `अपलोड हो रहा है (${attachmentUploadProgress}%)...` : `Uploading (${attachmentUploadProgress}%)...`}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === 'hi' ? '+ नया साक्ष्य संलग्न करें' : '+ Attach New Evidence'}</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {attachmentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
                  <span>{attachmentError}</span>
                  <button type="button" onClick={() => setAttachmentError(null)} className="text-red-500 hover:text-red-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {parsedDocs.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-gray-300 rounded-2xl space-y-3">
                  <div className="w-14 h-14 bg-blue-50 text-[#1C4D8D] rounded-full flex items-center justify-center mx-auto shadow-xs">
                    <Paperclip className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {language === 'hi' ? 'इस आवेदन में अभी कोई डिजिटल साक्ष्य या दस्तावेज संलग्न नहीं है।' : 'No digital attachments or evidence files currently attached.'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      {language === 'hi' ? 'नागरिक द्वारा प्रस्तुत प्रार्थना पत्र, फोटो, या रसीद संलग्न करें।' : 'Supported formats: JPG, PNG, PDF, DOCX, XLSX (up to 200MB)'}
                    </p>
                  </div>
                  {canModify && (
                    <label
                      htmlFor="attach-evidence-file-input"
                      className="inline-flex items-center gap-2 bg-[#1C4D8D] hover:bg-[#163c6f] text-white text-xs font-bold px-4 py-2 rounded-xl shadow cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{language === 'hi' ? 'दस्तावेज या साक्ष्य अपलोड करें' : 'Upload Document or Evidence'}</span>
                    </label>
                  )}
                </div>
              ) : evidenceViewMode === 'gallery' ? (
                /* Prominent High-Visibility Visual Gallery */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {parsedDocs.map((doc: any, i: number) => {
                    const info = getAttachmentInfo(doc, i);

                    if (info.isImg) {
                      return (
                        <div
                          key={i}
                          className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-400 transition flex flex-col group"
                        >
                          {/* Prominent High-Definition Image Preview Container */}
                          <div
                            className="h-64 sm:h-72 bg-slate-950 flex items-center justify-center relative overflow-hidden cursor-pointer"
                            onClick={() =>
                              setPreviewDoc({
                                url: info.viewHref,
                                name: info.docName,
                                isImage: true,
                                isPdf: false,
                                size: info.size
                              })
                            }
                            title={language === 'hi' ? 'पूरा चित्र देखने के लिए क्लिक करें' : 'Click to view full photo'}
                          >
                            <img
                              src={info.viewHref}
                              alt={info.docName}
                              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (img.src !== info.rawUrl) {
                                  img.src = info.rawUrl;
                                }
                              }}
                            />

                            {/* Badges on Image */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                              <span className="bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>PHOTO EVIDENCE</span>
                              </span>
                            </div>

                            {info.size ? (
                              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                                {(info.size / (1024 * 1024) > 1)
                                  ? `${(info.size / (1024 * 1024)).toFixed(2)} MB`
                                  : `${(info.size / 1024).toFixed(1)} KB`}
                              </div>
                            ) : null}

                            {/* Floating Action Hint */}
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5">
                                <ZoomIn className="w-4 h-4 text-[#1C4D8D]" />
                                <span>{language === 'hi' ? 'बड़ा देखें / Full View' : 'Click to View Full Size'}</span>
                              </span>
                            </div>
                          </div>

                          {/* Card Footer with Details & Actions */}
                          <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-gray-900 text-sm truncate" title={info.docName}>
                                {info.docName}
                              </h4>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {language === 'hi' ? 'आवेदन साक्ष्य फोटो' : 'Application Evidence Photograph'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDoc({
                                    url: info.viewHref,
                                    name: info.docName,
                                    isImage: true,
                                    isPdf: false,
                                    size: info.size
                                  })
                                }
                                className="bg-[#1C4D8D] hover:bg-[#163c6f] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                                title="Open in preview modal"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{language === 'hi' ? 'देखें' : 'View'}</span>
                              </button>

                              <a
                                href={info.downloadHref}
                                download={info.docName}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                title="Download file to device"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
                              </a>

                              <a
                                href={info.viewHref}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg text-xs font-bold transition flex items-center"
                                title="Open original in new tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (info.isPdf) {
                      return (
                        <div
                          key={i}
                          className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-red-400 transition flex flex-col group"
                        >
                          <div
                            className="h-64 sm:h-72 bg-gradient-to-br from-red-50 via-white to-red-50/50 flex flex-col items-center justify-center p-6 border-b border-red-100 cursor-pointer relative"
                            onClick={() =>
                              setPreviewDoc({
                                url: info.viewHref,
                                name: info.docName,
                                isImage: false,
                                isPdf: true,
                                size: info.size
                              })
                            }
                            title={language === 'hi' ? 'PDF पढ़ने के लिए क्लिक करें' : 'Click to read PDF document'}
                          >
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform mb-3">
                              <FileText className="w-10 h-10" />
                            </div>

                            <span className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow">
                              PDF DOCUMENT
                            </span>

                            <p className="text-xs text-red-900 font-bold mt-2 text-center max-w-[240px] truncate">
                              {info.docName}
                            </p>

                            <div className="absolute inset-0 bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="bg-white/95 text-red-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5">
                                <Eye className="w-4 h-4 text-red-600" />
                                <span>{language === 'hi' ? 'PDF खोलें / Read PDF' : 'Open PDF Viewer'}</span>
                              </span>
                            </div>
                          </div>

                          <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-gray-900 text-sm truncate" title={info.docName}>
                                {info.docName}
                              </h4>
                              {info.size ? (
                                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                                  {(info.size / 1024).toFixed(1)} KB
                                </p>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDoc({
                                    url: info.viewHref,
                                    name: info.docName,
                                    isImage: false,
                                    isPdf: true,
                                    size: info.size
                                  })
                                }
                                className="bg-[#1C4D8D] hover:bg-[#163c6f] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{language === 'hi' ? 'खोलें' : 'Read'}</span>
                              </button>

                              <a
                                href={info.downloadHref}
                                download={info.docName}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
                              </a>

                              <a
                                href={info.viewHref}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg text-xs font-bold transition"
                                title="Open in new tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Default Generic File Card
                    return (
                      <div
                        key={i}
                        className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-400 transition flex flex-col group"
                      >
                        <div
                          className="h-64 sm:h-72 bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col items-center justify-center p-6 border-b border-gray-100 cursor-pointer"
                          onClick={() =>
                            setPreviewDoc({
                              url: info.viewHref,
                              name: info.docName,
                              isImage: false,
                              isPdf: false,
                              size: info.size
                            })
                          }
                        >
                          <div className="w-20 h-20 bg-blue-100 text-[#1C4D8D] rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform mb-3">
                            <Paperclip className="w-10 h-10" />
                          </div>
                          <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow">
                            ATTACHMENT
                          </span>
                          <p className="text-xs text-gray-900 font-bold mt-2 text-center max-w-[240px] truncate">
                            {info.docName}
                          </p>
                        </div>

                        <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-gray-900 text-sm truncate" title={info.docName}>
                              {info.docName}
                            </h4>
                            {info.size ? (
                              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                                {(info.size / 1024).toFixed(1)} KB
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                              href={info.downloadHref}
                              download={info.docName}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
                            </a>
                            <a
                              href={info.viewHref}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg text-xs font-bold transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Compact List View */
                <div className="space-y-2.5">
                  {parsedDocs.map((doc: any, i: number) => {
                    const info = getAttachmentInfo(doc, i);

                    return (
                      <div
                        key={i}
                        onClick={() =>
                          setPreviewDoc({
                            url: info.viewHref,
                            name: info.docName,
                            isImage: info.isImg,
                            isPdf: info.isPdf,
                            size: info.size
                          })
                        }
                        className="flex items-center justify-between p-3.5 bg-slate-50 border border-gray-200 rounded-xl hover:bg-blue-50/70 hover:border-blue-400 transition text-xs shadow-xs cursor-pointer group"
                        title={language === 'hi' ? 'दस्तावेज / साक्ष्य खोलने के लिए क्लिक करें' : 'Click to open attachment & evidence'}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-grow mr-2">
                          {info.isImg ? (
                            <div className="w-14 h-14 rounded-xl bg-slate-950 overflow-hidden flex-shrink-0 border border-gray-300 relative shadow-xs flex items-center justify-center">
                              <img
                                src={info.viewHref}
                                alt={info.docName}
                                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  if (img.src !== info.rawUrl) {
                                    img.src = info.rawUrl;
                                  }
                                }}
                              />
                            </div>
                          ) : info.isPdf ? (
                            <div className="w-14 h-14 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-200 font-bold">
                              <FileText className="w-7 h-7" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-blue-100/70 text-[#1C4D8D] flex items-center justify-center flex-shrink-0 border border-blue-200">
                              <Paperclip className="w-7 h-7" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <span className="truncate font-bold text-gray-900 block group-hover:text-[#1C4D8D] transition text-sm" title={info.docName}>
                              {info.docName}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {info.isImg && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                                  PHOTO EVIDENCE
                                </span>
                              )}
                              {info.isPdf && (
                                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                                  PDF
                                </span>
                              )}
                              {!info.isImg && !info.isPdf && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                                  DOCUMENT
                                </span>
                              )}
                              {info.size ? (
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {(info.size / 1024).toFixed(1)} KB
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: info.viewHref,
                                name: info.docName,
                                isImage: info.isImg,
                                isPdf: info.isPdf,
                                size: info.size
                              })
                            }
                            className="bg-[#1C4D8D] hover:bg-[#163c6f] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{language === 'hi' ? 'खोलें' : 'Open'}</span>
                          </button>
                          <a
                            href={info.downloadHref}
                            download={info.docName}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tracking Timeline & Case Status */}
          <div className="space-y-6">
            {/* Case Overview Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100">
                {language === 'hi' ? 'प्रक्रिया व समयसीमा' : 'Workflow & SLA Tracking'}
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Submission Date:</span>
                  <span className="font-bold text-gray-800">{new Date(app.dateReceived).toLocaleDateString()}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Priority Tier:</span>
                  <span className={`font-bold ${app.priority === 'IMPORTANT' ? 'text-red-600' : 'text-blue-600'}`}>
                    {app.priority}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Current Status:</span>
                  <span className="font-bold text-gray-800">{app.status}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Assigned Officer:</span>
                  <span className="font-bold text-gray-800">{app.assignedEmployee || 'Unassigned'}</span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-500">Next Follow-Up:</span>
                  <span className="font-bold text-amber-700">
                    {app.nextFollowUpDate ? new Date(app.nextFollowUpDate).toLocaleDateString() : 'None Scheduled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-[#1C4D8D]">
                <History className="w-5 h-5 text-[#1C4D8D]" />
                <h3 className="text-sm font-bold text-gray-900">
                  {language === 'hi' ? 'फॉलो-अप व कार्रवाई इतिहास' : 'Follow-Up & Audit Timeline'}
                </h3>
              </div>

              {(!app.followUps || app.followUps.length === 0) ? (
                <div className="text-xs text-gray-500 py-3 text-center bg-slate-50 rounded-xl border border-gray-100">
                  No subsequent follow-up records logged yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-blue-200 ml-3 space-y-4 pl-4 py-1 text-xs">
                  {app.followUps.map((fu, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#1C4D8D] border-2 border-white" />
                      <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                          <span>{new Date(fu.createdAt).toLocaleString()}</span>
                          <span className="font-semibold text-gray-600">by {fu.user?.name || 'Officer'}</span>
                        </div>
                        <div className="font-bold text-gray-800">{fu.actionTaken}</div>
                        <div className="text-gray-600 text-xs mt-1 whitespace-pre-wrap">{fu.reminderNotes}</div>
                        {fu.nextFollowUpDate && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Next Action: {new Date(fu.nextFollowUpDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Status Modal --- */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-gray-900">Update Application Status</h3>
            <form onSubmit={handleUpdateStatusSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="AWAITING_INFO">AWAITING_INFO</option>
                  <option value="COMPLETED">COMPLETED (Resolved)</option>
                  <option value="DISPOSED">DISPOSED (Closed)</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Administrative Remarks / Action</label>
                <textarea
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl"
                  placeholder="Enter remarks or resolution summary..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="bg-[#1C4D8D] text-white px-5 py-2 rounded-xl text-xs font-bold shadow hover:bg-[#163c6f] disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Follow-Up Modal --- */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-gray-900">Add Follow-Up Record</h3>
            <form onSubmit={handleAddFollowUpSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Action Taken *</label>
                <input
                  type="text"
                  required
                  value={followUpAction}
                  onChange={(e) => setFollowUpAction(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl"
                  placeholder="e.g., Contacted District Officer, Letter dispatched"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reminder Notes *</label>
                <textarea
                  required
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl"
                  placeholder="Detailed notes on the discussion, pending documents..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={followUpNextDate}
                    onChange={(e) => setFollowUpNextDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reassign Officer</label>
                  <input
                    type="text"
                    value={followUpReassign}
                    onChange={(e) => setFollowUpReassign(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-xl"
                    placeholder="Officer name"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingFollowUp}
                  className="bg-amber-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow hover:bg-amber-700 disabled:opacity-50"
                >
                  {isAddingFollowUp ? 'Saving...' : 'Add Follow-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Reopen Modal --- */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-gray-900">Reopen Closed Application</h3>
            <p className="text-xs text-gray-500">
              Reopening will transition this application back to <strong>IN_PROGRESS</strong> and log a permanent audit entry.
            </p>
            <form onSubmit={handleReopenSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Reopening *</label>
                <textarea
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl"
                  placeholder="Explain why further investigation or administrative action is required..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReopening}
                  className="bg-purple-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow hover:bg-purple-700 disabled:opacity-50"
                >
                  {isReopening ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp border border-red-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {language === 'hi' ? 'आवेदन रिकॉर्ड हटाएं?' : 'Delete Application Record?'}
                </h3>
                <p className="text-xs text-gray-500 font-mono">{app.applicationId}</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50 rounded-xl text-xs text-red-800 leading-relaxed border border-red-100">
              {language === 'hi'
                ? 'चेतावनी: यह इस आवेदन को आपके व्यक्तिगत डेटाबेस से स्थायी रूप से हटा देगा। सभी संबंधित विवरण, फॉलो-अप व दस्तावेज रिकॉर्ड मिटा दिए जाएंगे।'
                : 'Warning: This will permanently delete this application record, associated timeline entries, and stored documents from your personal database. This action cannot be undone.'}
            </div>

            <div>
              <label htmlFor="detail-delete-password" className="mb-1.5 block text-xs font-bold text-gray-700">
                {language === 'hi' ? 'अकाउंट पासवर्ड' : 'Account password'}
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-gray-300 px-3 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100">
                <Lock className="h-4 w-4 flex-none text-gray-400" />
                <input
                  id="detail-delete-password"
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
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting || !deletePassword}
                onClick={handleDeleteSubmit}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? (language === 'hi' ? 'हटाया जा रहा है...' : 'Deleting...') : (language === 'hi' ? 'स्थायी रूप से हटाएं' : 'Permanently Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document, PDF & Photo Preview Lightbox Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1C4D8D] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {previewDoc.isImage ? (
                  <ImageIcon className="w-5 h-5 text-amber-300 flex-shrink-0" />
                ) : previewDoc.isPdf ? (
                  <FileText className="w-5 h-5 text-red-300 flex-shrink-0" />
                ) : (
                  <Paperclip className="w-5 h-5 text-blue-200 flex-shrink-0" />
                )}
                <span className="font-bold text-sm truncate" title={previewDoc.name}>
                  {previewDoc.name}
                </span>
                {previewDoc.isPdf && (
                  <span className="bg-red-500/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white uppercase">
                    PDF
                  </span>
                )}
                {previewDoc.isImage && (
                  <span className="bg-emerald-500/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white uppercase">
                    Image
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`${previewDoc.url}${previewDoc.url.includes('?') ? '&' : '?'}download=1`}
                  download={previewDoc.name}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  title="Download file to device"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
                </a>
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  title="Open in new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'नए टैब में' : 'New Tab'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-900 flex items-center justify-center overflow-auto flex-grow max-h-[80vh]">
              {previewDoc.isImage ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[74vh] max-w-full object-contain rounded-lg shadow-lg border border-slate-700"
                />
              ) : previewDoc.isPdf ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[76vh] rounded-lg bg-white shadow-inner border border-slate-700"
                />
              ) : (
                <div className="p-10 text-center bg-slate-800 rounded-xl max-w-md w-full border border-slate-700 space-y-4">
                  <div className="w-16 h-16 bg-blue-900/60 text-blue-300 rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base truncate">{previewDoc.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {language === 'hi'
                        ? 'इस प्रकार के दस्तावेज को देखने के लिए डाउनलोड करें या नए टैब में खोलें।'
                        : 'Click below to download or open this document in a new tab.'}
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-2">
                    <a
                      href={`${previewDoc.url}${previewDoc.url.includes('?') ? '&' : '?'}download=1`}
                      download={previewDoc.name}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>{language === 'hi' ? 'डाउनलोड करें' : 'Download File'}</span>
                    </a>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#1C4D8D] hover:bg-[#163c6f] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{language === 'hi' ? 'नए टैब में खोलें' : 'Open in New Tab'}</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-gray-500">
              <span className="truncate max-w-md font-mono">{previewDoc.name}</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

