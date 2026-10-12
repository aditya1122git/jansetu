import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet
} from './icons';
import { api } from '../services/api';
import { District, AssemblyConstituency, User } from '../types';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageMode?: boolean;
  currentUser: User | null;
  language: 'hi' | 'en';
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({
  isOpen,
  onClose,
  pageMode = false,
  currentUser,
  language
}) => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [constituencies, setConstituencies] = useState<AssemblyConstituency[]>([]);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reservationFilter, setReservationFilter] = useState('');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [distRes, acRes, valRes] = await Promise.all([
        api.getDistricts(),
        api.getConstituencies(),
        api.getValidationReport()
      ]);
      setDistricts(distRes.districts);
      setConstituencies(acRes.constituencies);
      setValidationReport(valRes);
    } catch (e) {
      console.error('Error loading master data:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredConstituencies = constituencies.filter((ac) => {
    if (selectedDistrictId && ac.districtId !== selectedDistrictId) return false;
    if (reservationFilter && ac.reservation !== reservationFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = ac.name.toLowerCase().includes(q);
      const matchCode = ac.acCode.toLowerCase().includes(q);
      const matchNum = String(ac.acNumber) === q;
      const matchDist = ac.district?.name.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchNum && !matchDist) return false;
    }
    return true;
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImportFile(file);

    const formData = new FormData();
    formData.append('file', file);
    setIsImporting(true);
    try {
      const preview = await api.previewImportConstituencies(formData);
      setImportPreview(preview);
    } catch (err: any) {
      alert('Import validation failed: ' + err.message);
      setImportPreview(null);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={pageMode ? 'workspace-page' : 'fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'}>
      <div className="workspace-page-panel bg-white rounded-2xl max-w-7xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp my-4 max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#1C4D8D] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#C35504] flex items-center justify-center font-bold text-sm shadow">
              05
            </span>
            <div>
              <h3 className="text-lg font-bold">
                {language === 'hi'
                  ? 'बिहार जिला एवं विधानसभा निर्वाचन क्षेत्र मास्टर डेटाबेस'
                  : 'Bihar 38 Districts & 243 Assembly Constituencies Master Database'}
              </h3>
              <p className="text-xs text-blue-200">
                Official Election Commission Delimitation Data (AC 001 - Valmiki Nagar to AC 243 - Chakai)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('/api/master/export/constituencies-csv', '_blank')}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download Master CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Export CSV</span>
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Validation Report Banner */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between text-xs flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              {validationReport?.isFullyCompliant ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              )}
              <span className="font-bold text-gray-800">
                Master Compliance Status: {validationReport?.isFullyCompliant ? 'Verified (100% Complete)' : 'Warning'}
              </span>
            </div>
            <div className="text-gray-600">
              Districts: <strong>{validationReport?.totalDistricts ?? 0} / 38</strong>
            </div>
            <div className="text-gray-600">
              Constituencies: <strong>{validationReport?.totalConstituencies ?? 0} / 243</strong>
            </div>
            <div className="text-gray-600">
              General: <strong>{validationReport?.breakdown?.generalSeats ?? 0}</strong> | 
              SC: <strong>{validationReport?.breakdown?.scReservedSeats ?? 0}</strong> | 
              ST: <strong>{validationReport?.breakdown?.stReservedSeats ?? 0}</strong>
            </div>
          </div>

          {currentUser?.role === 'ADMIN' && (
            <label className="bg-[#1C4D8D] text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#163c6f] transition flex items-center gap-1.5 shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV Master</span>
              <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            </label>
          )}
        </div>

        {/* Search & Filters */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3 flex-wrap text-xs flex-shrink-0">
          <div className="relative flex-grow max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search AC Name, AC Code, or Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#1C4D8D]"
            />
          </div>

          <div className="w-56">
            <select
              value={selectedDistrictId}
              onChange={(e) => setSelectedDistrictId(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-2 bg-white outline-none"
            >
              <option value="">All 38 Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.assemblySeatsCount} seats)
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <select
              value={reservationFilter}
              onChange={(e) => setReservationFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-2 bg-white outline-none"
            >
              <option value="">All Categories</option>
              <option value="GEN">General</option>
              <option value="SC">SC Reserved</option>
              <option value="ST">ST Reserved</option>
            </select>
          </div>

          <div className="text-gray-500 font-semibold ml-auto">
            Showing <strong>{filteredConstituencies.length}</strong> Constituencies
          </div>
        </div>

        {/* CSV Import Preview Drawer if open */}
        {importPreview && (
          <div className="bg-amber-50 p-4 border-b border-amber-200 text-xs">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                CSV Import Validation Report ({importFile?.name})
              </h5>
              <button onClick={() => setImportPreview(null)} className="text-gray-500 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-white p-2 rounded border">Total: <strong>{importPreview.totalRowsInFile}</strong></div>
              <div className="bg-white p-2 rounded border text-green-700">Valid: <strong>{importPreview.validCount}</strong></div>
              <div className="bg-white p-2 rounded border text-red-700">Invalid: <strong>{importPreview.invalidCount}</strong></div>
              <div className="bg-white p-2 rounded border text-amber-700">Duplicates: <strong>{importPreview.duplicateCount}</strong></div>
            </div>
            {importPreview.invalidRows?.length > 0 && (
              <div className="text-red-700 bg-red-100 p-2 rounded mb-2">
                <strong>Errors:</strong> {importPreview.invalidRows.map((r: any) => `Line ${r.line}: ${r.reason}`).join('; ')}
              </div>
            )}
          </div>
        )}

        {/* Master Data Grid Table */}
        <div className="overflow-x-auto flex-grow text-xs">
          {loading ? (
            <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1C4D8D]" />
              <p className="text-sm">Loading Bihar delimitation records...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 uppercase font-bold sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3">AC No.</th>
                  <th className="py-3 px-3">Verified AC Code</th>
                  <th className="py-3 px-3">Assembly Constituency Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">District</th>
                  <th className="py-3 px-3">Lok Sabha Constituency</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredConstituencies.map((ac) => (
                  <tr key={ac.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                      #{ac.acNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block bg-blue-100 text-[#1C4D8D] font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                        {ac.acCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-gray-900 text-sm">
                      {ac.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          ac.reservation === 'SC'
                            ? 'bg-purple-100 text-purple-700'
                            : ac.reservation === 'ST'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ac.reservation}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-800">
                      {ac.district?.name}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {ac.lokSabhaConstituency || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

