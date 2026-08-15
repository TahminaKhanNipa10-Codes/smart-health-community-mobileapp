import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  User, 
  Building, 
  UserCheck, 
  Calendar, 
  ExternalLink, 
  AlertCircle, 
  Check 
} from 'lucide-react';

export interface MedicalRecordItem {
  id: string;
  userId: string;
  title: string;
  type: string;
  date: string;
  doctor?: string;
  hospital?: string;
  fileUrl?: string;
  fileType?: string;
  notes?: string;
  createdAt?: any;
}

export default function AdminMedicalRecords() {
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const snap = await getDocs(collection(db, 'medical_reports'));
      const list: MedicalRecordItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as MedicalRecordItem);
      });

      // Sort newest records first
      list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setRecords(list);
    } catch (err: any) {
      console.error('Error fetching medical records:', err);
      setError('Failed to fetch medical records repository.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.userId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.doctor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.hospital || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.type || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" /> Patient Medical Records Repository
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit uploaded lab reports, prescriptions, and medical files uploaded by registered patient accounts.
          </p>
        </div>
        <button
          onClick={fetchRecords}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Records
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

      {/* Search & Type Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search report title, patient UID, doctor, or hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            id="input-search-admin-medical-records"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
        >
          <option value="ALL">All Report Types</option>
          <option value="Lab Result">Lab Result</option>
          <option value="Prescription">Prescription</option>
          <option value="Imaging">Imaging / X-Ray</option>
          <option value="Summary">Discharge Summary</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading medical records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No medical records found matching search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-4">Report Details</th>
                  <th className="p-4">Patient UID</th>
                  <th className="p-4">Doctor & Hospital</th>
                  <th className="p-4">Report Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{r.title}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                        {r.type || 'General'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {r.userId}
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">
                      <div className="font-semibold">{r.doctor ? `Dr. ${r.doctor}` : 'Unassigned Doctor'}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" /> {r.hospital || 'General Clinic'}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {r.date || 'TBD'}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.fileUrl && (
                          <a
                            href={r.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="View Attached Report"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
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
