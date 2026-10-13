import React from 'react';
import { BarChart3, Calendar, CheckCircle, Clock, Database, Envelope, FileText, MapPin, Phone, PlusCircle, Shield, User as UserIcon } from './icons';
import { DashboardStats, User } from '../types';

interface PortalDashboardProps {
  currentUser: User;
  stats: DashboardStats | null;
  onOpenSection: (section: 'form' | 'table' | 'reports' | 'admin' | 'appointments') => void;
  onOpenFilter: (filter: 'all' | 'important' | 'normal' | 'active_followups' | 'disposed') => void;
}

export const PortalDashboard: React.FC<PortalDashboardProps> = ({
  currentUser,
  stats,
  onOpenSection,
  onOpenFilter
}) => {
  const metrics = [
    { label: 'Total Applications', value: stats?.total ?? 0, icon: Database, tone: 'text-blue-700 bg-blue-50', filter: 'all' as const },
    { label: 'Important', value: stats?.important ?? 0, icon: Shield, tone: 'text-red-700 bg-red-50', filter: 'important' as const },
    { label: 'Active Follow-ups', value: stats?.activeFollowUps ?? ((stats?.pending ?? 0) + (stats?.inProgress ?? 0)), icon: Clock, tone: 'text-amber-700 bg-amber-50', filter: 'active_followups' as const },
    { label: 'Disposed', value: stats?.disposed ?? stats?.completed ?? 0, icon: CheckCircle, tone: 'text-emerald-700 bg-emerald-50', filter: 'disposed' as const }
  ];

  return (
    <main className="flex-grow bg-[#f4f7fb] px-4 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="rounded-2xl bg-gradient-to-r from-[#0f2d57] to-[#1C4D8D] px-6 py-6 sm:px-8 text-white shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Secure Operations Workspace</p>
              <h1 className="mt-1 text-2xl font-black">Welcome, {currentUser.name}</h1>
              <p className="mt-1 text-sm text-blue-100">{currentUser.role === 'DATA_ENTRY' ? `Manage applications, visitors and reports for your assigned ${currentUser.blockName || 'service'} block.` : 'Manage applications, visitor appointments, follow-ups and reports from one place.'}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold">
              <Shield className="h-4 w-4 text-amber-300" /> {currentUser.role === 'DATA_ENTRY' ? `OPERATOR · ${currentUser.blockName || 'BLOCK NOT SET'}` : currentUser.role}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon, tone, filter }) => (
            <button
              key={label}
              type="button"
              onClick={() => onOpenFilter(filter)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
              <strong className="mt-4 block text-2xl font-black text-slate-900">{value}</strong>
              <span className="text-xs font-semibold text-slate-500">{label}</span>
            </button>
          ))}
        </section>

        {currentUser.role === 'DATA_ENTRY' && (
          <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-50 to-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1C4D8D] text-white shadow-md"><UserIcon className="h-5 w-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-blue-700">Operator Profile</p><h2 className="text-lg font-black text-slate-900">{currentUser.name}</h2><p className="text-xs text-slate-500">Authorized intake operator for E-Sewak Tarapur</p></div></div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800"><MapPin className="h-3.5 w-3.5" />{currentUser.blockName || 'Block not assigned'} {currentUser.blockLgdCode ? `· LGD ${currentUser.blockLgdCode}` : ''}</span>
            </div>
            <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 bg-white p-4"><Envelope className="h-4 w-4 text-blue-700" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email</p><p className="break-all text-xs font-semibold text-slate-800">{currentUser.email}</p></div></div>
              <div className="flex items-center gap-3 bg-white p-4"><Phone className="h-4 w-4 text-blue-700" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Phone</p><p className="text-xs font-semibold text-slate-800">{currentUser.phone || 'Not provided'}</p></div></div>
              <div className="flex items-center gap-3 bg-white p-4"><MapPin className="h-4 w-4 text-blue-700" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">District</p><p className="text-xs font-semibold text-slate-800">{currentUser.districtName || 'Munger'}</p></div></div>
              <div className="flex items-center gap-3 bg-white p-4"><Shield className="h-4 w-4 text-blue-700" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Constituency</p><p className="text-xs font-semibold text-slate-800">{currentUser.constituencyName || 'Tarapur'}</p></div></div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-900">Quick actions</h2>
            <p className="text-xs text-slate-500">Open a workspace directly.</p>
          </div>
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${currentUser.role === 'ADMIN' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <button onClick={() => onOpenSection('form')} className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-left font-bold text-orange-800 transition hover:bg-orange-100"><PlusCircle className="h-5 w-5" /> New Application</button>
            <button onClick={() => onOpenSection('table')} className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left font-bold text-blue-800 transition hover:bg-blue-100"><FileText className="h-5 w-5" /> Application Database</button>
            <button onClick={() => onOpenSection('reports')} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left font-bold text-emerald-800 transition hover:bg-emerald-100"><BarChart3 className="h-5 w-5" /> Reports & Analytics</button>
            {(currentUser.role === 'ADMIN' || currentUser.role === 'DATA_ENTRY') && <button onClick={() => onOpenSection('appointments')} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left font-bold text-amber-800 transition hover:bg-amber-100"><Calendar className="h-5 w-5" /> {currentUser.role === 'ADMIN' ? 'Appointments' : 'Visitor Appointments'}</button>}
          </div>
          {currentUser.role === 'ADMIN' && (
            <button onClick={() => onOpenSection('admin')} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white transition hover:bg-slate-800"><Shield className="h-4 w-4 text-amber-300" /> System Administration</button>
          )}
        </section>
      </div>
    </main>
  );
};
