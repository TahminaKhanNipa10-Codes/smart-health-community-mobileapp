import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { 
  Calendar, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Check, 
  User, 
  UserCheck, 
  Video, 
  Phone, 
  MapPin 
} from 'lucide-react';

export interface AppointmentRecord {
  id: string;
  patientId?: string;
  userId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  date: string;
  time: string;
  type: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt?: any;
}

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const snap = await getDocs(collection(db, 'appointments'));
      const list: AppointmentRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AppointmentRecord);
      });

      // Sort by newest
      list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setAppointments(list);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError('Failed to fetch appointment schedules.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      (a.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.doctorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.date || '').includes(searchQuery) ||
      (a.type || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" /> Doctor Appointment Consultations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitor patient bookings, view assigned doctor details, and track clinical consultation statuses.
          </p>
        </div>
        <button
          onClick={fetchAppointments}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Bookings
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-semibold">
          <Check className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, doctor name, date, or consultation type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            id="input-search-admin-appointments"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No appointment records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-4">Patient Info</th>
                  <th className="p-4">Doctor Assigned</th>
                  <th className="p-4">Schedule & Type</th>
                  <th className="p-4">Consultation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAppointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {a.patientName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{a.patientEmail || a.patientPhone || 'No contact email'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-purple-500" /> Dr. {a.doctorName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">{a.doctorSpecialty || 'Specialist'}</div>
                    </td>
                    <td className="p-4 text-slate-700">
                      <div className="font-semibold">{a.date || 'TBD'} @ {a.time || 'TBD'}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 capitalize">
                        {a.type === 'video' ? <Video className="w-3 h-3 text-indigo-500" /> : <MapPin className="w-3 h-3 text-emerald-500" />}
                        {a.type || 'Standard'} Consultation
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          (a.status || 'PENDING').toUpperCase() === 'CONFIRMED' || (a.status || '').toUpperCase() === 'APPROVED'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : (a.status || '').toUpperCase() === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : (a.status || '').toUpperCase() === 'CANCELLED' || (a.status || '').toUpperCase() === 'REJECTED'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                        id={`span-appt-status-${a.id}`}
                      >
                        {(a.status || 'PENDING').toUpperCase() === 'CONFIRMED' ? 'APPROVED' : (a.status || 'PENDING').toUpperCase() === 'CANCELLED' ? 'REJECTED' : (a.status || 'PENDING').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
