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
  HeartHandshake, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Check, 
  MapPin, 
  Building, 
  Phone, 
  Siren 
} from 'lucide-react';

export interface BloodRequestRecord {
  id: string;
  userId: string;
  patientName: string;
  bloodGroup: string;
  units: number;
  hospital: string;
  location: string;
  contactPhone: string;
  urgency: string;
  isEmergency?: boolean;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  description?: string;
  createdAt?: any;
}

export default function AdminBloodRequests() {
  const [requests, setRequests] = useState<BloodRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'FULFILLED' | 'CANCELLED'>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const snap = await getDocs(collection(db, 'blood_requests'));
      const list: BloodRequestRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as BloodRequestRecord);
      });

      // Sort newest requests first
      list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setRequests(list);
    } catch (err: any) {
      console.error('Error fetching blood requests:', err);
      setError('Failed to fetch blood request logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reqId: string, newStatus: 'PENDING' | 'FULFILLED' | 'CANCELLED') => {
    try {
      setError('');
      setSuccess('');
      await updateDoc(doc(db, 'blood_requests', reqId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
      );
      setSuccess(`Blood request status updated to ${newStatus}.`);
    } catch (err: any) {
      console.error('Error updating blood request status:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `blood_requests/${reqId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to update request status.');
      }
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      (r.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.bloodGroup || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.hospital || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.contactPhone || '').includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'ALL' || r.urgency === urgencyFilter;

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-pink-600" /> Blood Emergency Requests
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review patient blood requirements, monitor emergency status, mark fulfilled requests, and handle cancellations.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Requests
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

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, blood group, hospital, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pink-500 outline-none"
            id="input-search-admin-blood-requests"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="FULFILLED">FULFILLED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Urgency</option>
            <option value="Emergency">Emergency</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading blood requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No blood requests found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-4">Patient & Blood Details</th>
                  <th className="p-4">Hospital & Location</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">Urgency & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1.5 bg-rose-50 text-rose-700 font-extrabold rounded-xl border border-rose-200 text-xs">
                          {req.bloodGroup} ({req.units || 1} Bag)
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {req.patientName}
                            {req.isEmergency && (
                              <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-extrabold uppercase animate-pulse">
                                Emergency
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">UID: {req.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" /> {req.hospital}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {req.location}
                      </div>
                    </td>
                    <td className="p-4 text-slate-900 font-bold">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {req.contactPhone}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <select
                          value={req.status || 'PENDING'}
                          onChange={(e) => handleUpdateStatus(req.id, e.target.value as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                            req.status === 'FULFILLED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : req.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                          id={`select-blood-req-status-${req.id}`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="FULFILLED">FULFILLED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
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
