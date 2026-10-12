import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Upload, AlertTriangle, FileText, Check, Paperclip, Trash2, HelpCircle, Eye, ExternalLink, Image as ImageIcon, Download } from './icons';
import { api } from '../services/api';
import { District, AssemblyConstituency, ComplaintCategory, Application, SystemSettings } from '../types';

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageMode?: boolean;
  onApplicationCreated: (app: Application) => void;
  language: 'hi' | 'en';
  settings?: SystemSettings | null;
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  onClose,
  pageMode = false,
  onApplicationCreated,
  language,
  settings: initialSettings
}) => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [constituencies, setConstituencies] = useState<AssemblyConstituency[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(initialSettings || null);

  // Form State
  const [dateReceived, setDateReceived] = useState<string>(new Date().toISOString().split('T')[0]);
  const [applicantName, setApplicantName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [address, setAddress] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | ''>('');
  
  // Constituency Selection & Manual Entry
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<number | ''>('');
  const [manualConstituencyName, setManualConstituencyName] = useState('');
  const [isManualAcEntry, setIsManualAcEntry] = useState(false);
  const [isUnmatchedAc, setIsUnmatchedAc] = useState(false);
  const [verifiedAcCode, setVerifiedAcCode] = useState('');

  // Complaint Category (Manual Text Entry)
  const [categoryName, setCategoryName] = useState('');

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'IMPORTANT' | 'NORMAL'>('NORMAL');
  const [assignedEmployee, setAssignedEmployee] = useState('');
  const [internalRemarks, setInternalRemarks] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [previewPic, setPreviewPic] = useState<{ url: string; name: string } | null>(null);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successApp, setSuccessApp] = useState<Application | null>(null);

  const maxUploadSizeMb = settings?.maxUploadSizeMb || 200;
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const loadInitialData = async () => {
    try {
      const [distRes, catRes, setRes] = await Promise.all([
        api.getDistricts(),
        api.getCategories(),
        api.getSettings().catch(() => ({ settings: null }))
      ]);
      setDistricts(distRes.districts);
      setCategories(catRes.categories);
      if (setRes?.settings) {
        setSettings(setRes.settings);
      }
    } catch (e: any) {
      setErrorMsg('Failed to load districts and categories.');
    }
  };

  // When District changes, load mapped Assembly Constituencies
  const handleDistrictChange = async (distId: number) => {
    setSelectedDistrictId(distId);
    setSelectedConstituencyId('');
    setManualConstituencyName('');
    setVerifiedAcCode('');
    setIsUnmatchedAc(false);
    try {
      const res = await api.getConstituencies(distId);
      setConstituencies(res.constituencies);
    } catch (e) {
      setConstituencies([]);
    }
  };

  // When Constituency selected from Master Dropdown
  const handleConstituencySelect = (acId: number) => {
    setSelectedConstituencyId(acId);
    const found = constituencies.find(c => c.id === acId);
    if (found) {
      setVerifiedAcCode(`${String(found.acNumber).padStart(3, '0')} · ${found.acCode}`);
      setManualConstituencyName(found.name);
      setIsUnmatchedAc(false);
    } else {
      setVerifiedAcCode('');
      setManualConstituencyName('');
      setIsUnmatchedAc(false);
    }
  };

  // When Constituency entered manually
  const handleManualConstituencyInput = (text: string) => {
    setManualConstituencyName(text);
    const trimmed = text.trim().toLowerCase();
    if (!trimmed) {
      setSelectedConstituencyId('');
      setVerifiedAcCode('');
      setIsUnmatchedAc(false);
      return;
    }

    // Check if matches a verified constituency in the current district
    const matched = constituencies.find(c => c.name.toLowerCase() === trimmed);
    if (matched) {
      setSelectedConstituencyId(matched.id);
      setVerifiedAcCode(`${String(matched.acNumber).padStart(3, '0')} · ${matched.acCode}`);
      setIsUnmatchedAc(false);
    } else {
      // Flag unmatched manual entry for administrative review
      setSelectedConstituencyId('');
      setVerifiedAcCode('UNVERIFIED');
      setIsUnmatchedAc(true);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const filesToUpload = Array.from(e.target.files);
    const maxSizeBytes = maxUploadSizeMb * 1024 * 1024;

    // Client-side file validation
    for (const file of filesToUpload) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setUploadError(`File "${file.name}" has an unsupported format (${ext}). Allowed formats: ${allowedExtensions.join(', ').toUpperCase()}`);
        e.target.value = '';
        return;
      }
      if (file.size > maxSizeBytes) {
        setUploadError(`File "${file.name}" (${formatFileSize(file.size)}) exceeds the maximum allowed limit of ${maxUploadSizeMb} MB.`);
        e.target.value = '';
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const res = await api.uploadFiles(filesToUpload, (pct) => {
        setUploadProgress(pct);
      });
      setUploadedFiles(prev => [...prev, ...res.files]);
      e.target.value = '';
    } catch (err: any) {
      setUploadError('Upload failed: ' + (err.message || 'Error communicating with server'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setUploadedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!applicantName.trim()) {
      setErrorMsg(language === 'hi' ? 'कृपया आवेदक का नाम दर्ज करें।' : 'Please enter applicant name.');
      return;
    }
    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      setErrorMsg(language === 'hi' ? 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!selectedDistrictId) {
      setErrorMsg(language === 'hi' ? 'कृपया जिला चुनें।' : 'Please select a district.');
      return;
    }

    // Assembly Constituency is Mandatory
    if (!selectedConstituencyId && !manualConstituencyName.trim()) {
      setErrorMsg('Please enter or select Assembly Constituency.');
      return;
    }

    // Complaint Category is Mandatory (Manual text entry)
    if (!categoryName.trim()) {
      setErrorMsg(language === 'hi' ? 'कृपया शिकायत श्रेणी दर्ज करें।' : 'Please enter a complaint category.');
      return;
    }

    if (!subject.trim()) {
      setErrorMsg(language === 'hi' ? 'कृपया विषय दर्ज करें।' : 'Please provide a subject.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg(language === 'hi' ? 'कृपया विस्तृत विवरण दर्ज करें।' : 'Please provide a detailed description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        applicantName: applicantName.trim(),
        mobileNumber: mobileNumber.trim(),
        alternateMobile: alternateMobile ? alternateMobile.trim() : null,
        address: address.trim(),
        districtId: selectedDistrictId,
        constituencyId: selectedConstituencyId || undefined,
        constituencyName: manualConstituencyName.trim() || undefined,
        categoryName: categoryName.trim(),
        subject: subject.trim(),
        description: description.trim(),
        priority,
        assignedEmployee: assignedEmployee ? assignedEmployee.trim() : 'Pending Assignment',
        internalRemarks: internalRemarks ? internalRemarks.trim() : null,
        documents: uploadedFiles.length > 0 ? uploadedFiles : null,
        dateReceived: dateReceived ? new Date(dateReceived).toISOString() : new Date().toISOString()
      };

      const res = await api.createApplication(payload);
      setSuccessApp(res.application);
      onApplicationCreated(res.application);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setApplicantName('');
    setMobileNumber('');
    setAlternateMobile('');
    setAddress('');
    setSelectedDistrictId('');
    setSelectedConstituencyId('');
    setManualConstituencyName('');
    setIsManualAcEntry(false);
    setIsUnmatchedAc(false);
    setVerifiedAcCode('');
    setCategoryName('');
    setSubject('');
    setDescription('');
    setPriority('NORMAL');
    setAssignedEmployee('');
    setInternalRemarks('');
    setUploadedFiles([]);
    setSuccessApp(null);
    setErrorMsg(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  if (!isOpen) return null;

  return (
    <div className={pageMode ? 'workspace-page' : 'fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5'}>
      <div className={`workspace-page-panel bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp my-6 max-h-[92vh] flex flex-col ${pageMode ? 'workspace-page-panel--form' : ''}`}>
        {/* Modal Header */}
        <div className="bg-[#1C4D8D] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#C35504] flex items-center justify-center font-bold text-sm shadow">
              01
            </span>
            <div>
              <h3 className="text-lg font-bold">
                {language === 'hi' ? 'नया आवेदन / शिकायत पंजीकरण' : 'Section 1 — New Application / Complaint Entry'}
              </h3>
              <p className="text-xs text-blue-200">
                {language === 'hi'
                  ? '38 जिले व 243 निर्वाचन क्षेत्र आधारित आधिकारिक प्रविष्टि प्रपत्र'
                  : 'Official Intake Form with Verified Bihar AC Mapping'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-grow">
          {successApp ? (
            /* Success Voucher Screen */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-black text-gray-900">
                {language === 'hi' ? 'आवेदन सफलतापूर्वक दर्ज हो गया!' : 'Application Successfully Registered!'}
              </h4>
              <p className="text-gray-600 max-w-md mx-auto text-sm">
                {language === 'hi'
                  ? 'नागरिक को यह संदर्भ संख्या एसएमएस व पावती के लिए प्रदान करें।'
                  : 'A unique reference identifier has been generated and saved permanently in the database.'}
              </p>

              <div className="bg-blue-50 border-2 border-dashed border-[#1C4D8D] rounded-xl p-6 max-w-lg mx-auto text-left shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Permanent Reference ID
                </div>
                <div className="text-3xl font-extrabold text-[#1C4D8D] tracking-wide mb-3">
                  {successApp.applicationId}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 pt-2 border-t border-blue-200">
                  <div><strong>Applicant:</strong> {successApp.applicantName}</div>
                  <div><strong>Mobile:</strong> {successApp.mobileNumber}</div>
                  <div><strong>District:</strong> {successApp.district?.name}</div>
                  <div>
                    <strong>Constituency:</strong> {successApp.constituency?.name || successApp.customConstituency || 'Unassigned'} ({successApp.verifiedAcCode})
                  </div>
                  <div>
                    <strong>Category:</strong> <span className="font-bold text-[#1C4D8D]">{successApp.categoryName || successApp.category?.name}</span>
                  </div>
                  <div>
                    <strong>Priority:</strong> <span className={`font-bold ${successApp.priority === 'IMPORTANT' ? 'text-red-600' : 'text-blue-700'}`}>{successApp.priority}</span>
                  </div>
                  <div><strong>Status:</strong> {successApp.status}</div>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    resetForm();
                  }}
                  className="bg-[#1C4D8D] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#163c6f] transition shadow"
                >
                  {language === 'hi' ? '+ अन्य नया आवेदन दर्ज करें' : '+ Record Another Application'}
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                >
                  {language === 'hi' ? 'डैशबोर्ड पर लौटें' : 'Close & Return'}
                </button>
              </div>
            </div>
          ) : (
            /* Form Screen */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 1: Basic Information */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <h4 className="text-sm font-bold text-[#1C4D8D] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C35504]" />
                  1. Applicant Details & Receipt Info
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Date Received <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateReceived}
                      onChange={(e) => setDateReceived(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Applicant Full Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      required
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mobile Number (10 digits) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="98XXXXXXXX"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Alternate Mobile (Optional)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Alternate contact"
                      value={alternateMobile}
                      onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Complete Residential Address <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Village / Mohalla, Post, Panchayat / Ward"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Bihar Delimitation Mapping (Assembly Constituency is Mandatory) */}
              <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/40">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#1C4D8D] uppercase tracking-wider">
                    2. Bihar Assembly Constituency Mapping
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualAcEntry(!isManualAcEntry);
                        if (!isManualAcEntry) {
                          setManualConstituencyName('');
                          setVerifiedAcCode('');
                        }
                      }}
                      className="text-[11px] text-[#1C4D8D] underline hover:text-[#C35504] font-medium"
                    >
                      {isManualAcEntry ? 'Switch to Master Dropdown' : 'Manual Entry / Unlisted Area'}
                    </button>
                    <span className="text-[11px] bg-blue-100 text-[#1C4D8D] px-2 py-0.5 rounded font-normal">
                      38 Districts & 243 ACs
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      District (Select from 38) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      value={selectedDistrictId}
                      onChange={(e) => handleDistrictChange(Number(e.target.value))}
                      required
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                    >
                      <option value="">-- Select District --</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assembly Constituency * - Required Field */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Assembly Constituency <span className="text-red-500 font-bold text-sm">*</span>
                    </label>

                    {!isManualAcEntry ? (
                      <select
                        value={selectedConstituencyId}
                        onChange={(e) => handleConstituencySelect(Number(e.target.value))}
                        disabled={!selectedDistrictId}
                        required
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {selectedDistrictId ? '-- Select Constituency --' : 'First select district'}
                        </option>
                        {constituencies.map((ac) => (
                          <option key={ac.id} value={ac.id}>
                            {ac.acNumber}. {ac.name} {ac.reservation !== 'GEN' ? `(${ac.reservation})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        list="master-constituency-list"
                        placeholder="Type constituency name"
                        value={manualConstituencyName}
                        onChange={(e) => handleManualConstituencyInput(e.target.value)}
                        required
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                      />
                    )}

                    <datalist id="master-constituency-list">
                      {constituencies.map((ac) => (
                        <option key={ac.id} value={ac.name}>
                          {ac.acCode} - {ac.name}
                        </option>
                      ))}
                    </datalist>

                    {isUnmatchedAc && (
                      <p className="text-[11px] text-amber-700 font-semibold mt-1">
                        ⚠️ Unmatched name: Flagged for administrative verification
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Verified AC No. / Code
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={verifiedAcCode}
                        readOnly
                        placeholder="AC number appears automatically"
                        className={`w-full text-sm border font-bold rounded-lg px-3 py-2 outline-none font-mono ${
                          isUnmatchedAc
                            ? 'border-amber-400 bg-amber-50 text-amber-800'
                            : verifiedAcCode
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                      />
                      {verifiedAcCode && !isUnmatchedAc && (
                        <span className="text-green-600 bg-green-100 p-1.5 rounded-lg" title="Verified against official ECI/Assembly Master">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Complaint Classification & Details (Manual Editable Complaint Category) */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <h4 className="text-sm font-bold text-[#1C4D8D] uppercase tracking-wider mb-3">
                  3. Complaint Details & Priority Classification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Complaint Category * - Manual Text Entry */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Complaint Category <span className="text-red-500 font-bold text-sm">*</span>
                    </label>
                    <input
                      type="text"
                      list="category-autocomplete-suggestions"
                      placeholder="Enter complaint category"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none text-gray-900 font-medium"
                    />
                    <datalist id="category-autocomplete-suggestions">
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name} />
                      ))}
                    </datalist>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Type any category in your own words. Not restricted to predefined options.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Required Priority Classification <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer font-bold text-xs transition ${
                        priority === 'NORMAL'
                          ? 'bg-blue-50 border-[#1C4D8D] text-[#1C4D8D] shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name="priority"
                          value="NORMAL"
                          checked={priority === 'NORMAL'}
                          onChange={() => setPriority('NORMAL')}
                          className="sr-only"
                        />
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${priority === 'NORMAL' ? 'bg-[#1C4D8D]' : 'bg-gray-300'}`}></span>
                          <span>Normal Priority</span>
                        </span>
                      </label>

                      <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer font-bold text-xs transition ${
                        priority === 'IMPORTANT'
                          ? 'bg-red-50 border-red-600 text-red-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name="priority"
                          value="IMPORTANT"
                          checked={priority === 'IMPORTANT'}
                          onChange={() => setPriority('IMPORTANT')}
                          className="sr-only"
                        />
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${priority === 'IMPORTANT' ? 'bg-red-600 animate-pulse' : 'bg-gray-300'}`}></span>
                          <span>Important Priority</span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subject / Short Summary <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief headline of the grievance or request"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Detailed Application or Grievance Description <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Detailed narrative describing location, history of issue, prior representations, affected citizens, and specific relief requested..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                  />
                </div>
              </div>

              {/* Step 4: Assignment, Supporting Documents & Internal Remarks */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <h4 className="text-sm font-bold text-[#1C4D8D] uppercase tracking-wider mb-3">
                  4. Assignment, Attachments & Internal Remarks
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Assigned Officer / Department Desk
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Executive Engineer, PHED / Circle Officer"
                      value={assignedEmployee}
                      onChange={(e) => setAssignedEmployee(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                    />
                  </div>

                  {/* Configurable Multi-Attachment Upload with 200 MB default */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Supporting Documents
                      </label>
                      <span className="text-[11px] text-[#C35504] font-bold">
                        Maximum file size: {maxUploadSizeMb} MB per file
                      </span>
                    </div>

                    <label className={`flex flex-col items-center justify-center border-2 border-dashed ${isUploading ? 'border-blue-400 bg-blue-50/30' : 'border-gray-300 hover:border-[#1C4D8D] bg-white'} rounded-xl p-3 cursor-pointer transition`}>
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <Upload className={`w-4 h-4 ${isUploading ? 'text-blue-600 animate-bounce' : 'text-[#1C4D8D]'}`} />
                        <span>{isUploading ? `Uploading file(s)... (${uploadProgress}%)` : 'Click to Browse & Select Attachments'}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Allowed formats: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX
                      </div>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>

                    {isUploading && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-gray-600 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#1C4D8D] animate-ping" />
                            Streaming upload to secure storage...
                          </span>
                          <span className="font-mono text-[#1C4D8D] font-bold">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#1C4D8D] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs mt-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {/* Attached files list with size, image thumbnail, preview and removal button */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                          <span>Attached Documents ({uploadedFiles.length}):</span>
                          <span className="text-[10px] text-blue-600 font-medium">Click thumbnail or "View" to open pic</span>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {uploadedFiles.map((file, idx) => {
                            const isImg = file.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalName || file.name || '');
                            const token = localStorage.getItem('bacms_token') || '';
                            const rawUrl = file.url || (file.filename ? `/api/documents/${file.filename}` : '');
                            const viewHref = rawUrl ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : '';
                            const fileName = file.originalName || file.name || `Attachment ${idx + 1}`;

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-2 text-xs text-gray-800 shadow-xs hover:border-blue-300 transition"
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden mr-2">
                                  {isImg && viewHref ? (
                                    <div
                                      onClick={() => setPreviewPic({ url: viewHref, name: fileName })}
                                      className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 cursor-pointer border border-gray-200 relative group"
                                      title="Click to view full photo"
                                    >
                                      <img
                                        src={viewHref}
                                        alt={fileName}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                        <Eye className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1C4D8D] flex items-center justify-center flex-shrink-0 border border-blue-100">
                                      <Paperclip className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold truncate text-gray-800" title={fileName}>
                                      {fileName}
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                      <span className="bg-gray-100 px-1.5 py-0.2 rounded font-mono">
                                        {formatFileSize(file.size)}
                                      </span>
                                      {isImg && (
                                        <span className="text-emerald-600 font-bold">Photo Attached</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {viewHref && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isImg) {
                                          setPreviewPic({ url: viewHref, name: fileName });
                                        } else {
                                          window.open(viewHref, '_blank');
                                        }
                                      }}
                                      className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#1C4D8D] font-bold text-[11px] flex items-center gap-1 transition"
                                      title={isImg ? "Open and view photo" : "Open document"}
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>{language === 'hi' ? 'देखें' : 'View'}</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeAttachment(idx)}
                                    className="text-gray-400 hover:text-red-600 p-1.5 rounded transition"
                                    title="Remove attachment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Internal Office Remarks (Not visible publicly)
                  </label>
                  <input
                    type="text"
                    placeholder="Internal guidance, routing directions, special notes"
                    value={internalRemarks}
                    onChange={(e) => setInternalRemarks(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#1C4D8D] outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="bg-[#C35504] hover:bg-[#a64700] text-white px-7 py-2.5 rounded-lg text-sm font-bold shadow-lg transition duration-200 transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Application...' : 'Submit & Generate Application ID'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Photo Preview Lightbox Modal */}
      {previewPic && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setPreviewPic(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1C4D8D] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-5 h-5 text-amber-300 flex-shrink-0" />
                <span className="font-bold text-sm truncate">{previewPic.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${previewPic.url}${previewPic.url.includes('?') ? '&' : '?'}download=1`}
                  download={previewPic.name}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  title="Download photo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
                </a>
                <a
                  href={previewPic.url}
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
                  onClick={() => setPreviewPic(null)}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center overflow-auto flex-grow max-h-[78vh]">
              <img
                src={previewPic.url}
                alt={previewPic.name}
                className="max-h-[74vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

