import React, { useState, useEffect } from 'react';
import {
  X,
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
  Eye,
  Download,
  ExternalLink,
  Image as ImageIcon,
  FileText
} from './icons';
import { api } from '../services/api';
import { Application, User } from '../types';

interface ApplicationDetailDrawerProps {
  application: Application | null;
  onClose: () => void;
  currentUser: User | null;
  onRefresh: () => void;
  language: 'hi' | 'en';
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  application: initialApp,
  onClose,
  currentUser,
  onRefresh,
  language
}) => {
  const [app, setApp] = useState<Application | null>(initialApp);
  const [loading, setLoading] = useState(false);
  const [reopenModal, setReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    name: string;
    isImage: boolean;
    isPdf: boolean;
    size?: number;
  } | null>(null);

  useEffect(() => {
    if (initialApp) {
      loadFullDetails(initialApp.id);
    }
  }, [initialApp]);

  const loadFullDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.getApplication(id);
      setApp(res.application);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !reopenReason.trim()) return;

    setIsReopening(true);
    try {
      await api.reopenApplication(app.id, { reopenReason });
      alert('Application reopened successfully!');
      setReopenModal(false);
      setReopenReason('');
      loadFullDetails(app.id);
      onRefresh();
    } catch (err: any) {
      alert('Error reopening: ' + err.message);
    } finally {
      setIsReopening(false);
    }
  };

  if (!initialApp) return null;

  const current = app || initialApp;
  const canReopen =
    currentUser &&
    currentUser.role !== 'READONLY' &&
    (current.status === 'COMPLETED' || current.status === 'REJECTED');

  let parsedDocs: any[] = [];
  if (current?.documents) {
    let raw: any = current.documents;
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
        {/* Header */}
        <div className="bg-[#1C4D8D] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg">{current.applicationId}</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  current.priority === 'IMPORTANT'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-400 text-white'
                }`}
              >
                {current.priority}
              </span>
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-semibold">
                {current.status}
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-1">
              Recorded on {new Date(current.dateReceived).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6 text-xs text-gray-800">
          {/* Quick Details Banner */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-gray-500 font-semibold">Applicant Name</div>
              <div className="font-bold text-gray-900 text-sm mt-0.5">{current.applicantName}</div>
              <div className="font-mono text-gray-600 mt-0.5">{current.mobileNumber}</div>
            </div>
            <div>
              <div className="text-gray-500 font-semibold">Assembly Mapping</div>
              <div className="font-bold text-gray-900 mt-0.5">
                {current.constituency?.name || current.customConstituency || 'Unassigned'} ({current.verifiedAcCode})
              </div>
              <div className="text-gray-600">{current.district?.name} District</div>
            </div>
            <div className="col-span-2 pt-2 border-t">
              <div className="text-gray-500 font-semibold">Residential Address</div>
              <div className="text-gray-900 mt-0.5">{current.address}</div>
            </div>
          </div>

          {/* Subject & Description */}
          <div>
            <div className="font-bold text-gray-500 uppercase text-[11px] tracking-wider mb-1">
              Subject
            </div>
            <div className="text-sm font-bold text-gray-900 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              {current.subject}
            </div>
          </div>

          <div>
            <div className="font-bold text-gray-500 uppercase text-[11px] tracking-wider mb-1">
              Detailed Grievance Narration
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 leading-relaxed whitespace-pre-wrap">
              {current.description}
            </div>
          </div>

          {/* Operational Details */}
          <div className="grid grid-cols-2 gap-3 bg-amber-50/50 border border-amber-200 rounded-xl p-3.5">
            <div>
              <div className="text-gray-500 font-semibold">Complaint Category</div>
              <div className="font-bold text-gray-900 mt-0.5">{current.categoryName || current.category?.name || 'General'}</div>
            </div>
            <div>
              <div className="text-gray-500 font-semibold">Assigned Desk / Official</div>
              <div className="font-bold text-gray-900 mt-0.5">{current.assignedEmployee || 'Unassigned'}</div>
            </div>
            <div>
              <div className="text-gray-500 font-semibold">Next Follow-Up Target</div>
              <div className="font-bold text-gray-900 mt-0.5">
                {current.nextFollowUpDate ? new Date(current.nextFollowUpDate).toLocaleDateString() : 'None Scheduled'}
              </div>
            </div>
            <div>
              <div className="text-gray-500 font-semibold">Internal Remarks</div>
              <div className="text-gray-700 mt-0.5">{current.internalRemarks || 'None'}</div>
            </div>
          </div>

          {/* Reopen Action Button if completed */}
          {canReopen && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-emerald-900 text-sm">Application is marked as Completed</div>
                <div className="text-[11px] text-emerald-700">
                  Authorized staff may reopen this case if citizen submits further representations.
                </div>
              </div>
              <button
                onClick={() => setReopenModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Application</span>
              </button>
            </div>
          )}

          {/* Attached Documents */}
          {parsedDocs.length > 0 && (
            <div>
              <div className="font-bold text-gray-500 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                <span>
                  {language === 'hi' ? 'संलग्न सहायक दस्तावेज व फोटो' : 'Attached Supporting Documents & Photos'} ({parsedDocs.length})
                </span>
              </div>
              <div className="space-y-2">
                {parsedDocs.map((doc: any, idx: number) => {
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
                      `attachment_${idx + 1}`;
                    docName = doc.originalName || doc.originalname || doc.fileName || filename || `Attachment ${idx + 1}`;
                  }

                  const rawUrl = (doc && typeof doc === 'object' && doc.url && doc.url.startsWith('/api/documents/'))
                    ? doc.url
                    : `/api/documents/${encodeURIComponent(filename)}`;
                  const viewHref = token ? `${rawUrl}?token=${encodeURIComponent(token)}` : rawUrl;
                  const downloadHref = token ? `${rawUrl}?token=${encodeURIComponent(token)}&download=1` : `${rawUrl}?download=1`;

                  const isPic = (mimetype && mimetype.startsWith('image/')) ||
                    /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(docName) ||
                    /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(filename);

                  const isPdf = (mimetype && mimetype.includes('pdf')) ||
                    /\.pdf$/i.test(docName) ||
                    /\.pdf$/i.test(filename);

                  return (
                    <div
                      key={idx}
                      onClick={() =>
                        setPreviewDoc({
                          url: viewHref,
                          name: docName,
                          isImage: isPic,
                          isPdf: isPdf,
                          size
                        })
                      }
                      className="p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                      title={language === 'hi' ? 'दस्तावेज / साक्ष्य खोलने के लिए क्लिक करें' : 'Click to open attachment & evidence'}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isPic ? (
                          <div
                            className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-300 flex items-center justify-center flex-shrink-0 group hover:opacity-90 relative"
                            title="Click to view full photo"
                          >
                            <img
                              src={viewHref}
                              alt={docName}
                              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (img.src !== rawUrl) {
                                  img.src = rawUrl;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : isPdf ? (
                          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0 text-red-600 font-bold">
                            <FileText className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-600">
                            <Paperclip className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isPic && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                PHOTO
                              </span>
                            )}
                            {isPdf && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                                PDF
                              </span>
                            )}
                            {!isPic && !isPdf && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                                DOC
                              </span>
                            )}
                            <div className="font-semibold text-gray-800 text-xs truncate group-hover:text-[#1C4D8D] transition" title={docName}>
                              {docName}
                            </div>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {size ? `${(size / 1024).toFixed(1)} KB` : (isPic ? 'Image File' : isPdf ? 'PDF Document' : 'Document')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              url: viewHref,
                              name: docName,
                              isImage: isPic,
                              isPdf: isPdf,
                              size
                            })
                          }
                          className="bg-[#1C4D8D] hover:bg-[#163c6f] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Open document in viewer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{language === 'hi' ? 'खोलें' : 'Open'}</span>
                        </button>
                        <a
                          href={downloadHref}
                          download={docName}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                          title="Download document to device"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chronological Action History */}
          <div>
            <div className="font-bold text-gray-500 uppercase text-[11px] tracking-wider mb-3 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#1C4D8D]" />
              <span>Chronological Action & Follow-Up History</span>
            </div>
            {current.followUps && current.followUps.length > 0 ? (
              <div className="relative border-l-2 border-blue-200 ml-3 space-y-4 py-1">
                {current.followUps.map((fu, idx) => (
                  <div key={fu.id || idx} className="relative pl-5">
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#1C4D8D] ring-4 ring-white"></div>
                    <div className="text-[11px] text-gray-400 font-mono">
                      {new Date(fu.createdAt).toLocaleString()} &bull; by <strong>{fu.actionBy}</strong>
                    </div>
                    <div className="font-bold text-gray-900 mt-0.5 text-xs">{fu.actionTaken}</div>
                    <div className="text-gray-600 bg-gray-50 p-2 rounded mt-1 border text-xs">
                      {fu.reminderNotes}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-xs italic">No follow-ups recorded yet.</p>
            )}
          </div>
        </div>

        {/* Reopen Modal Dialog */}
        {reopenModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl animate-scaleUp">
              <h4 className="font-bold text-red-700 text-base mb-1">
                Authorized Reopening Authorization
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                Please provide official justification to revert status back to In Progress.
              </p>
              <form onSubmit={handleReopenSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Reason for Reopening <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter citizen's supplementary representation details or audit inquiry..."
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    className="w-full border rounded-lg p-2 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReopenModal(false)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReopening}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg"
                  >
                    {isReopening ? 'Reopening...' : 'Confirm Reopening'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Document, PDF & Photo Preview Lightbox Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
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
                  title="Download file"
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

