import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle, Clock, MapPin, Phone, Shield, User as UserIcon } from './icons';
import { api } from '../services/api';
import { Appointment, User } from '../types';
// The stylesheet is handled by the bundler and has no TypeScript module declaration.
// @ts-ignore -- keep the side-effect stylesheet import without requiring a global CSS declaration.
import './AppointmentsPage.css';

interface AppointmentsPageProps {
  currentUser: User;
}

const todayLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const formatSubmittedDate = (value: string) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeZone: 'Asia/Kolkata'
}).format(new Date(value));

const formatSubmittedTime = (value: string) => new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata'
}).format(new Date(value));

const appointmentHours = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const appointmentMinutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

const toTwentyFourHourTime = (hourText: string, minute: string, period: 'AM' | 'PM') => {
  const hour = Number(hourText) % 12 + (period === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${minute}`;
};

const formatAppointmentTime = (value?: string | null) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return value || '';
  const [hourText, minute] = value.split(':');
  const hour = Number(hourText);
  return `${String(hour % 12 || 12).padStart(2, '0')}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const statusStyles: Record<Appointment['status'], string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  CONFIRMED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-700'
};

export const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ currentUser }) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<Appointment | null>(null);
  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject'>('approve');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentHour, setAppointmentHour] = useState('');
  const [appointmentMinute, setAppointmentMinute] = useState('');
  const [appointmentPeriod, setAppointmentPeriod] = useState<'AM' | 'PM'>('AM');

  const loadAppointments = async (background = false) => {
    if (!background) {
      setLoading(true);
      setError('');
    }
    try {
      const result = await api.getAppointments();
      setAppointments(result.appointments);
    } catch (err) {
      if (!background) setError(err instanceof Error ? err.message : 'Unable to load appointments.');
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
    const unsubscribe = api.subscribeToAppointmentEvents(() => void loadAppointments(true));
    const refreshOnFocus = () => void loadAppointments(true);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  const counts = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter(item => item.status === 'PENDING').length,
    confirmed: appointments.filter(item => item.status === 'CONFIRMED').length,
    rejected: appointments.filter(item => item.status === 'REJECTED').length
  }), [appointments]);

  const submitVisitor = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.createAppointment({ visitorName, phone, address, purpose });
      setVisitorName('');
      setPhone('');
      setAddress('');
      setPurpose('');
      setSuccess('Visitor appointment request submitted to the administrator.');
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDecision = async () => {
    if (!decisionTarget) return;
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const savedAppointmentTime = decisionMode === 'approve'
        ? toTwentyFourHourTime(appointmentHour, appointmentMinute, appointmentPeriod)
        : undefined;
      await api.decideAppointment(decisionTarget.id, decisionMode === 'approve'
        ? { decision: 'APPROVE', appointmentDate, appointmentTime: savedAppointmentTime }
        : { decision: 'REJECT' });
      setSuccess(decisionMode === 'approve'
        ? `Appointment confirmed for ${appointmentDate} at ${appointmentHour}:${appointmentMinute} ${appointmentPeriod}.`
        : 'Appointment request rejected.');
      setDecisionTarget(null);
      setAppointmentDate('');
      setAppointmentHour('');
      setAppointmentMinute('');
      setAppointmentPeriod('AM');
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDecision = (appointment: Appointment, mode: 'approve' | 'reject') => {
    setDecisionTarget(appointment);
    setDecisionMode(mode);
    setAppointmentDate('');
    setAppointmentHour('');
    setAppointmentMinute('');
    setAppointmentPeriod('AM');
    setError('');
  };

  return (
    <section className="appointments-page min-h-[60vh] bg-[#f4f7fb] px-4 py-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="appointments-hero flex flex-col gap-4 rounded-2xl px-6 py-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="appointments-hero-icon grid h-12 w-12 place-items-center rounded-2xl"><Calendar className="h-5 w-5 text-amber-300" /></span>
            <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-blue-200">Visitor Management</p><h1 className="text-2xl font-black">{isAdmin ? 'Appointments' : 'Visitor Appointments'}</h1><p className="text-sm text-blue-100">{isAdmin ? 'Review and schedule visitor requests from all operators.' : 'Register visitors and track appointment decisions.'}</p></div>
          </div>
        </header>

        <div className="appointment-stats grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([['Total', counts.total, 'text-blue-700'], ['Pending', counts.pending, 'text-amber-700'], ['Confirmed', counts.confirmed, 'text-emerald-700'], ['Rejected', counts.rejected, 'text-red-700']] as const).map(([label, value, tone]) => <div key={label} className="appointment-stat-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><strong className={`mt-1 block text-2xl font-black ${tone}`}>{value}</strong></div>)}
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{success}</div>}

        {!isAdmin && (
          <form onSubmit={submitVisitor} className="appointment-surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5"><h2 className="text-lg font-black text-slate-900">Register a visitor</h2><p className="text-xs text-slate-500">All fields are required. The request will remain pending until an administrator decides it.</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-700">Visitor Name *</span><div className="flex items-center rounded-xl border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-blue-200"><UserIcon className="h-4 w-4 text-slate-400" /><input required value={visitorName} onChange={event => setVisitorName(event.target.value)} maxLength={100} className="min-w-0 flex-1 border-0 px-2 py-3 outline-none" placeholder="Enter visitor name" /></div></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-700">Phone Number *</span><div className="flex items-center rounded-xl border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-blue-200"><Phone className="h-4 w-4 text-slate-400" /><input required inputMode="numeric" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} pattern="[6-9][0-9]{9}" className="min-w-0 flex-1 border-0 px-2 py-3 outline-none" placeholder="10-digit mobile number" /></div></label>
              <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-bold text-slate-700">Address *</span><div className="flex items-start rounded-xl border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-blue-200"><MapPin className="mt-3.5 h-4 w-4 text-slate-400" /><textarea required value={address} onChange={event => setAddress(event.target.value)} maxLength={300} rows={2} className="min-w-0 flex-1 resize-none border-0 px-2 py-3 outline-none" placeholder="Complete residential address" /></div></label>
              <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-bold text-slate-700">Purpose of Visit *</span><textarea required value={purpose} onChange={event => setPurpose(event.target.value)} maxLength={500} rows={3} className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200" placeholder="Briefly explain why the visitor wants to meet the Chief Minister" /></label>
            </div>
            <button disabled={submitting} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C35504] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#a64700] disabled:cursor-not-allowed disabled:opacity-60"><Calendar className="h-4 w-4" />{submitting ? 'Submitting...' : 'Request Appointment'}</button>
          </form>
        )}

        <div className="appointment-surface-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-black text-slate-900">{isAdmin ? 'All visitor requests' : 'My visitor requests'}</h2><p className="text-xs text-slate-500">Newest requests appear first.</p></div></div>
          {loading ? <div className="p-12 text-center text-sm font-semibold text-slate-500">Loading appointments...</div> : appointments.length === 0 ? <div className="p-12 text-center"><Calendar className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No appointment requests found</p><p className="text-xs text-slate-500">{isAdmin ? 'New operator requests will appear here.' : 'Register the first visitor using the form above.'}</p></div> : (
            <div className="appointment-table-wrap">
              <table className="appointment-table">
                <thead><tr><th>Visitor</th><th>Address</th><th>Purpose</th><th>Operator / Block</th><th>Submitted Date</th><th>Submitted Time</th><th>Appointment</th><th>Status</th>{isAdmin && <th>Action</th>}</tr></thead>
                <tbody>
                  {appointments.map(item => <tr key={item.id}>
                    <td><strong>{item.visitorName}</strong><span className="appointment-cell-detail"><Phone className="h-3 w-3" />{item.phone}</span></td>
                    <td><span className="appointment-cell-detail"><MapPin className="h-3 w-3" />{item.address}</span></td>
                    <td className="appointment-purpose-cell">{item.purpose}</td>
                    <td><strong>{item.operatorName}</strong><span className="appointment-cell-muted">{item.operatorBlockName || 'Block not assigned'}{item.operatorBlockLgdCode ? ` · LGD ${item.operatorBlockLgdCode}` : ''}</span></td>
                    <td className="appointment-nowrap">{formatSubmittedDate(item.createdAt)}</td>
                    <td className="appointment-nowrap">{formatSubmittedTime(item.createdAt)}</td>
                    <td>{item.status === 'CONFIRMED' ? <span className="appointment-schedule"><Calendar className="h-3 w-3" />{item.appointmentDate}<Clock className="h-3 w-3" />{formatAppointmentTime(item.appointmentTime)}</span> : <span className="appointment-cell-muted">Not scheduled</span>}</td>
                    <td><span className={`rounded-full border px-3 py-1 text-[10px] font-black ${statusStyles[item.status]}`}>{item.status}</span></td>
                    {isAdmin && <td>{item.status === 'PENDING' ? <div className="appointment-table-actions"><button onClick={() => openDecision(item, 'approve')} className="appointment-approve">Approve</button><button onClick={() => openDecision(item, 'reject')} className="appointment-reject">Reject</button></div> : <span className="appointment-cell-muted">Completed</span>}</td>}
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {decisionTarget && <div className="appointment-modal-overlay fixed inset-0 grid place-items-center p-4" role="dialog" aria-modal="true">
        <div className="appointment-decision-card w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className={`appointment-decision-header ${decisionMode === 'approve' ? 'is-approve' : 'is-reject'}`}><span className="appointment-decision-icon">{decisionMode === 'approve' ? <CheckCircle /> : <Shield />}</span><div><p className="appointment-decision-eyebrow">Visitor request</p><h3>{decisionMode === 'approve' ? 'Schedule Meeting' : 'Reject Appointment?'}</h3><span>Visitor: {decisionTarget.visitorName}</span></div></div>
          <div className="appointment-decision-body">{decisionMode === 'approve' ? <><p className="appointment-decision-copy">Choose the confirmed meeting date and time. The assigned operator will see the updated schedule immediately.</p><div className="appointment-decision-fields"><label><span>Date *</span><input type="date" min={todayLocal()} required value={appointmentDate} onChange={event => setAppointmentDate(event.target.value)} /></label><label><span>Time (12-hour) *</span><div className="appointment-time-input"><select required value={appointmentHour} onChange={event => setAppointmentHour(event.target.value)} aria-label="Appointment hour"><option value="">H</option>{appointmentHours.map(hour => <option key={hour} value={hour}>{hour}</option>)}</select><select required value={appointmentMinute} onChange={event => setAppointmentMinute(event.target.value)} aria-label="Appointment minute"><option value="">M</option>{appointmentMinutes.map(minute => <option key={minute} value={minute}>{minute}</option>)}</select><select value={appointmentPeriod} onChange={event => setAppointmentPeriod(event.target.value as 'AM' | 'PM')} aria-label="AM or PM"><option value="AM">AM</option><option value="PM">PM</option></select></div></label></div></> : <p className="appointment-reject-notice">This will mark the visitor request as rejected. The operator will see the updated status.</p>}
            <div className="appointment-decision-actions"><button type="button" onClick={() => setDecisionTarget(null)} className="appointment-cancel-button">Cancel</button><button type="button" disabled={submitting || (decisionMode === 'approve' && (!appointmentDate || !appointmentHour || !appointmentMinute))} onClick={() => void submitDecision()} className={`appointment-confirm-button ${decisionMode === 'approve' ? 'is-approve' : 'is-reject'}`}>{submitting ? 'Saving...' : decisionMode === 'approve' ? 'Confirm Schedule' : 'Reject Request'}</button></div>
          </div>
        </div>
      </div>}
    </section>
  );
};
