import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { 
  Droplet, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Check, 
  Phone, 
  MapPin, 
  Calendar, 
  Siren 
} from 'lucide-react';

export interface BloodDonorRecord {
  id: string;
  userId: string;
  fullName: string;
  bloodGroup: string;
  phoneNumber: string;
  district: string;
  lastDonationDate: string;
  availableNow: boolean;
  emergencyDonation: boolean;
  createdAt?: any;
}

export default function AdminBloodDonors() {
  const [donors, setDonors] = useState<BloodDonorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'EMERGENCY'>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      setError('');
      const snap = await getDocs(collection(db, 'donors'));
      const list: BloodDonorRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as BloodDonorRecord);
      });
      setDonors(list);
    } catch (err: any) {
      console.error('Error fetching blood donors:', err);
      setError('Failed to fetch blood donor registry.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDonors = donors.filter((d) => {
    const matchesSearch =
      (d.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.district || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.phoneNumber || '').includes(searchQuery) ||
      (d.bloodGroup || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBg = bloodGroupFilter === 'ALL' || d.bloodGroup === bloodGroupFilter;

    const matchesAvail =
      availabilityFilter === 'ALL' ||
      (availabilityFilter === 'AVAILABLE' && d.availableNow) ||
      (availabilityFilter === 'EMERGENCY' && d.emergencyDonation);

    return matchesSearch && matchesBg && matchesAvail;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Droplet className="w-6 h-6 text-rose-600" /> Blood Donor Registry
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            View volunteer blood donors, check real-time availability managed by donors, verify contact details, and view donor records.
          </p>
        </div>
        <button
          onClick={fetchDonors}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Registry
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
            placeholder="Search donors by name, blood group, district, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none"
            id="input-search-admin-donors"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Blood Groups</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>

          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available Now</option>
            <option value="EMERGENCY">Emergency Donors</option>
          </select>
        </div>
      </div>

      {/* Donors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading blood donors...
          </div>
        ) : filteredDonors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No blood donors match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-4">Donor Name & Group</th>
                  <th className="p-4">Contact & Location</th>
                  <th className="p-4">Last Donation</th>
                  <th className="p-4">Instant Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDonors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 font-extrabold text-xs flex items-center justify-center border border-rose-200">
                          {donor.bloodGroup}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{donor.fullName}</div>
                          <div className="text-[11px] text-slate-400">UID: {donor.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1 font-semibold text-slate-900">
                        <Phone className="w-3 h-3 text-slate-400" /> {donor.phoneNumber}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {donor.district}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {donor.lastDonationDate || 'Not specified'}
                      </div>
                    </td>
                    <td className="p-4 space-y-1">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold border items-center gap-1 ${
                          donor.availableNow
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {donor.availableNow ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        Available Now: {donor.availableNow ? 'YES' : 'NO'}
                      </span>

                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold border items-center gap-1 ${
                          donor.emergencyDonation
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <Siren className="w-3 h-3" />
                        Emergency Call: {donor.emergencyDonation ? 'YES' : 'NO'}
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
