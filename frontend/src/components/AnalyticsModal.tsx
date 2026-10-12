import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  X,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from './icons';
import { api } from '../services/api';
import { DashboardStats, DistrictStat, CategoryStat } from '../types';
import './AnalyticsModal.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'hi' | 'en';
  pageMode?: boolean;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  language,
  pageMode = false
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [districtStats, setDistrictStats] = useState<DistrictStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [ageingReport, setAgeingReport] = useState<any>(null);
  const [workloadReport, setWorkloadReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'districts' | 'categories' | 'ageing' | 'workload'>('districts');
  const [districtSearch, setDistrictSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAllReports();
    }
  }, [isOpen]);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const [s, d, c, a, w] = await Promise.all([
        api.getDashboardStats(),
        api.getDistrictReports(),
        api.getCategoryReports(),
        api.getAgeingReport(),
        api.getEmployeeWorkload()
      ]);
      setStats(s);
      setDistrictStats(d.districts);
      setCategoryStats(c.categories);
      setAgeingReport(a);
      setWorkloadReport(w.workload);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredDistricts = districtStats.filter(d =>
    d.districtName.toLowerCase().includes(districtSearch.toLowerCase()) ||
    d.districtCode.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const statusChartData = {
    labels: ['Pending', 'In Progress', 'Awaiting Info', 'Completed', 'Overdue'],
    datasets: [{
      data: [
        stats?.pending ?? 0,
        stats?.inProgress ?? 0,
        stats?.awaitingInfo ?? 0,
        stats?.completed ?? 0,
        stats?.overdue ?? 0
      ],
      backgroundColor: ['#f59e0b', '#2563eb', '#7c3aed', '#059669', '#e11d48'],
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 5
    }]
  };

  const districtChartData = {
    labels: [...districtStats]
      .sort((a, b) => b.totalApplications - a.totalApplications)
      .slice(0, 10)
      .map(item => item.districtName),
    datasets: [{
      label: 'Applications',
      data: [...districtStats]
        .sort((a, b) => b.totalApplications - a.totalApplications)
        .slice(0, 10)
        .map(item => item.totalApplications),
      backgroundColor: '#1d619b',
      borderRadius: 7,
      maxBarThickness: 34
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 8, padding: 16 } }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={pageMode ? 'workspace-page' : 'fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'}>
      <div className="workspace-page-panel bg-white rounded-2xl max-w-7xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp my-4 max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#1C4D8D] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-[#C35504] flex items-center justify-center shadow"><BarChart3 className="h-4 w-4" /></span>
            <div>
              <h3 className="text-lg font-bold">
                {language === 'hi' ? 'रिपोर्ट्स एवं डेटाबेस एनालिटिक्स' : 'Reports and Analytics Dashboard'}
              </h3>
              <p className="text-xs text-blue-200">
                {language === 'hi'
                  ? '38 जिले, 243 निर्वाचन क्षेत्र एवं श्रेणीवार वास्तविक डेटाबेस सांख्यिकी'
                  : 'Database Statistics Across 38 Districts, 243 Constituencies & 14 Sectors'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAllReports}
              className="p-1.5 hover:bg-white/20 rounded-full transition"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real Metrics Cards Grid */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3 text-xs">
            {/* Total */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
              <div className="text-[11px] text-gray-500 font-semibold uppercase">Total Apps</div>
              <div className="text-2xl font-black text-[#1C4D8D] mt-1">{stats?.total ?? 0}</div>
            </div>

            {/* Important */}
            <div className="bg-red-50 p-3 rounded-xl border border-red-200 shadow-sm text-center">
              <div className="text-[11px] text-red-600 font-semibold uppercase">Important</div>
              <div className="text-2xl font-black text-red-700 mt-1">{stats?.important ?? 0}</div>
            </div>

            {/* Normal */}
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm text-center">
              <div className="text-[11px] text-blue-600 font-semibold uppercase">Normal</div>
              <div className="text-2xl font-black text-[#1C4D8D] mt-1">{stats?.normal ?? 0}</div>
            </div>

            {/* Pending */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm text-center">
              <div className="text-[11px] text-amber-700 font-semibold uppercase">Pending</div>
              <div className="text-2xl font-black text-amber-800 mt-1">{stats?.pending ?? 0}</div>
            </div>

            {/* In Progress */}
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 shadow-sm text-center">
              <div className="text-[11px] text-indigo-700 font-semibold uppercase">In Progress</div>
              <div className="text-2xl font-black text-indigo-800 mt-1">{stats?.inProgress ?? 0}</div>
            </div>

            {/* Awaiting Info */}
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 shadow-sm text-center">
              <div className="text-[11px] text-purple-700 font-semibold uppercase">Awaiting Info</div>
              <div className="text-2xl font-black text-purple-800 mt-1">{stats?.awaitingInfo ?? 0}</div>
            </div>

            {/* Completed */}
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm text-center">
              <div className="text-[11px] text-emerald-700 font-semibold uppercase">Completed</div>
              <div className="text-2xl font-black text-emerald-800 mt-1">{stats?.completed ?? 0}</div>
            </div>

            {/* Overdue */}
            <div className="bg-rose-50 p-3 rounded-xl border border-rose-300 shadow-sm text-center">
              <div className="text-[11px] text-rose-700 font-semibold uppercase">Overdue SLA</div>
              <div className="text-2xl font-black text-rose-700 mt-1">{stats?.overdue ?? 0}</div>
            </div>

            {/* Today */}
            <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 shadow-sm text-center">
              <div className="text-[11px] text-teal-700 font-semibold uppercase">Recv Today</div>
              <div className="text-2xl font-black text-teal-800 mt-1">{stats?.receivedToday ?? 0}</div>
            </div>
          </div>
        </div>

        <section className="analytics-chart-grid" aria-label="Application analytics charts">
          <article className="analytics-chart-card analytics-chart-card--wide">
            <div className="analytics-chart-heading">
              <div>
                <span>District performance</span>
                <h4>Top districts by applications</h4>
              </div>
              <BarChart3 />
            </div>
            <div className="analytics-chart-canvas">
              <Bar data={districtChartData} options={{ ...chartOptions, scales: { y: { beginAtZero: true, grid: { color: '#eef2f7' } }, x: { grid: { display: false } } } }} />
            </div>
          </article>

          <article className="analytics-chart-card">
            <div className="analytics-chart-heading">
              <div>
                <span>Live distribution</span>
                <h4>Application status</h4>
              </div>
              <PieChart />
            </div>
            <div className="analytics-chart-canvas">
              <Doughnut data={statusChartData} options={{ ...chartOptions, cutout: '66%' }} />
            </div>
          </article>
        </section>

        {/* Report Sub-Tabs */}
        <div className="bg-white border-b px-6 pt-3 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveReportTab('districts')}
              className={`pb-2 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeReportTab === 'districts'
                  ? 'border-[#C35504] text-[#C35504]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>District-Wise Breakdown (All 38)</span>
            </button>

            <button
              onClick={() => setActiveReportTab('categories')}
              className={`pb-2 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeReportTab === 'categories'
                  ? 'border-[#C35504] text-[#C35504]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Complaint Categories (14 Sectors)</span>
            </button>

            <button
              onClick={() => setActiveReportTab('ageing')}
              className={`pb-2 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeReportTab === 'ageing'
                  ? 'border-[#C35504] text-[#C35504]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Ageing Analysis</span>
            </button>

            <button
              onClick={() => setActiveReportTab('workload')}
              className={`pb-2 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeReportTab === 'workload'
                  ? 'border-[#C35504] text-[#C35504]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Officer Workload</span>
            </button>
          </div>

          <button
            onClick={() => window.open(api.getExportCsvUrl({}), '_blank')}
            className="text-xs text-[#1C4D8D] font-bold hover:underline flex items-center gap-1 pb-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All Data CSV</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-grow text-xs">
          {/* TAB 1: District-Wise */}
          {activeReportTab === 'districts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Filter by district name or code..."
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="w-72 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#1C4D8D]"
                />
                <div className="text-gray-500 font-medium">
                  Showing <strong>{filteredDistricts.length}</strong> of 38 Bihar Districts
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">District Code</th>
                      <th className="py-2.5 px-3">District Name</th>
                      <th className="py-2.5 px-3 text-center">Assembly Seats</th>
                      <th className="py-2.5 px-3 text-center">Total Applications</th>
                      <th className="py-2.5 px-3 text-center">Important</th>
                      <th className="py-2.5 px-3 text-center">Normal</th>
                      <th className="py-2.5 px-3 text-center">Pending</th>
                      <th className="py-2.5 px-3 text-center">Completed</th>
                      <th className="py-2.5 px-3 text-right">Resolution %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDistricts.map((d) => (
                      <tr key={d.districtId} className="hover:bg-blue-50/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-600">{d.districtCode}</td>
                        <td className="py-2.5 px-3 font-bold text-[#1C4D8D]">{d.districtName}</td>
                        <td className="py-2.5 px-3 text-center font-semibold">{d.totalSeats} ACs</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-900">{d.totalApplications}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-red-600">{d.importantCount}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-blue-600">{d.normalCount}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-amber-600">{d.pendingCount}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">{d.completedCount}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            d.resolutionRate >= 50 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {d.resolutionRate}%
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
          {activeReportTab === 'categories' && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Category Code</th>
                      <th className="py-2.5 px-3">Complaint Sector</th>
                      <th className="py-2.5 px-3 text-center">Total Registered</th>
                      <th className="py-2.5 px-3 text-center">Important</th>
                      <th className="py-2.5 px-3 text-center">Normal</th>
                      <th className="py-2.5 px-3 text-center">Pending</th>
                      <th className="py-2.5 px-3 text-center">Resolved</th>
                      <th className="py-2.5 px-3">Share %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categoryStats.map((c) => {
                      const totalAll = stats?.total || 1;
                      const share = Math.round((c.total / totalAll) * 100);
                      return (
                        <tr key={c.categoryId} className="hover:bg-blue-50/40">
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-600">{c.categoryCode}</td>
                          <td className="py-2.5 px-3 font-bold text-[#1C4D8D]">{c.categoryName}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-gray-900">{c.total}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-red-600">{c.importantCount}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-blue-600">{c.normalCount}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-amber-600">{c.pendingCount}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">{c.completedCount}</td>
                          <td className="py-2.5 px-3 w-44">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-[#C35504] h-2 rounded-full"
                                  style={{ width: `${Math.max(4, share)}%` }}
                                ></div>
                              </div>
                              <span className="font-bold text-gray-600 w-8">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Ageing Analysis */}
          {activeReportTab === 'ageing' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-gray-800">
                <h4 className="font-bold text-sm text-[#1C4D8D] mb-1">
                  Active Grievance Ageing & Disposal Timelines
                </h4>
                <p className="text-gray-600 text-xs">
                  Applications pending beyond 30 days trigger automated high-priority executive alerts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {ageingReport?.brackets?.map((b: any, idx: number) => (
                  <div key={idx} className="bg-white border rounded-xl p-5 shadow-sm relative overflow-hidden">
                    <div className="text-xs font-bold text-gray-500 uppercase">{b.label}</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{b.count}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Cases in this age bracket</div>
                    <div
                      className="absolute bottom-0 left-0 w-full h-1.5"
                      style={{ backgroundColor: b.color }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Workload */}
          {activeReportTab === 'workload' && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Assigned Desk / Officer</th>
                      <th className="py-2.5 px-3 text-center">Total Assigned</th>
                      <th className="py-2.5 px-3 text-center">Pending / In-Progress</th>
                      <th className="py-2.5 px-3 text-center">Important Cases</th>
                      <th className="py-2.5 px-3 text-center">Completed</th>
                      <th className="py-2.5 px-3 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {workloadReport.map((w, idx) => {
                      const rate = w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-blue-50/40">
                          <td className="py-2.5 px-3 font-bold text-gray-900">{w.employee}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{w.total}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-amber-600">{w.pending}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-red-600">{w.important}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">{w.completed}</td>
                          <td className="py-2.5 px-3 text-right font-bold">{rate}%</td>
                        </tr>
                      );
                    })}
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

