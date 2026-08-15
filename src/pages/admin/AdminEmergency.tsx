import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { 
  Siren, 
  Search, 
  RefreshCw, 
  Plus, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Check, 
  X, 
  Building2, 
  Truck, 
  Pill 
} from 'lucide-react';

export interface EmergencyRequestItem {
  id: string;
  userId?: string;
  userName?: string;
  phone?: string;
  location?: string;
  type?: string;
  description?: string;
  status?: 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED';
  createdAt?: any;
}

export interface EmergencyDirectoryItem {
  id: string;
  category: 'HOSPITAL' | 'AMBULANCE' | 'PHARMACY';
  name: string;
  address: string;
  phone: string;
  available24h: boolean;
}

export default function AdminEmergency() {
  const [sosRequests, setSosRequests] = useState<EmergencyRequestItem[]>([]);
  const [directoryItems, setDirectoryItems] = useState<EmergencyDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SOS' | 'DIRECTORY'>('SOS');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Directory Modal
  const [isAddingDirectory, setIsAddingDirectory] = useState(false);
  const [dirForm, setDirForm] = useState({
    category: 'HOSPITAL' as 'HOSPITAL' | 'AMBULANCE' | 'PHARMACY',
    name: '',
    address: '',
    phone: '',
    available24h: true
  });

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  const fetchEmergencyData = async () => {
    try {
      setLoading(true);
      setError('');

      const [sosSnap, dirSnap] = await Promise.all([
        getDocs(collection(db, 'emergency_requests')).catch(() => null),
        getDocs(collection(db, 'emergency_directory')).catch(() => null)
      ]);

      const sosList: EmergencyRequestItem[] = [];
      if (sosSnap) {
        sosSnap.forEach((d) => {
          sosList.push({ id: d.id, ...d.data() } as EmergencyRequestItem);
        });
      }
      setSosRequests(sosList);

      const dirList: EmergencyDirectoryItem[] = [];
      if (dirSnap) {
        dirSnap.forEach((d) => {
          dirList.push({ id: d.id, ...d.data() } as EmergencyDirectoryItem);
        });
      }
      setDirectoryItems(dirList);

    } catch (err: any) {
      console.error('Error fetching emergency data:', err);
      setError('Failed to fetch emergency dispatch logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSosStatus = async (sosId: string, newStatus: 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED') => {
    try {
      setError('');
      setSuccess('');
      await updateDoc(doc(db, 'emergency_requests', sosId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      setSosRequests((prev) =>
        prev.map((s) => (s.id === sosId ? { ...s, status: newStatus } : s))
      );
      setSuccess(`Emergency request status set to ${newStatus}.`);
    } catch (err: any) {
      console.error('Error updating SOS request:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `emergency_requests/${sosId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to update emergency request.');
      }
    }
  };

  const handleAddDirectoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const payload = {
        ...dirForm,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'emergency_directory'), payload);
      setDirectoryItems((prev) => [{ id: ref.id, ...payload }, ...prev]);
      setSuccess('New emergency service provider listed successfully!');
      setIsAddingDirectory(false);
      setDirForm({
        category: 'HOSPITAL',
        name: '',
        address: '',
        phone: '',
        available24h: true
      });
    } catch (err: any) {
      console.error('Error adding emergency service:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'emergency_directory');
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to add emergency provider.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Siren className="w-6 h-6 text-red-600 animate-pulse" /> Emergency Dispatches & Hospital Services
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time SOS call control, ambulance dispatching, emergency hospital listings, and 24/7 hotline management.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchEmergencyData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setIsAddingDirectory(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Emergency Service
          </button>
        </div>
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('SOS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'SOS'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Active SOS Dispatches ({sosRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('DIRECTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'DIRECTORY'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Emergency Directory ({directoryItems.length})
        </button>
      </div>

      {/* Active SOS Requests View */}
      {activeTab === 'SOS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              Loading emergency request logs...
            </div>
          ) : sosRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No active SOS emergency dispatches reported.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="p-4">Caller / Patient</th>
                    <th className="p-4">Phone & Location</th>
                    <th className="p-4">Emergency Type</th>
                    <th className="p-4">Dispatch Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sosRequests.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{s.userName || 'Emergency Caller'}</div>
                        <div className="text-[10px] text-slate-400">UID: {s.userId || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-slate-700 font-semibold">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {s.phone || 'No phone'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" /> {s.location || 'Location shared'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold text-xs border border-red-200">
                          {s.type || 'General Ambulance SOS'}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={s.status || 'PENDING'}
                          onChange={(e) => handleUpdateSosStatus(s.id, e.target.value as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                            s.status === 'DISPATCHED'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : s.status === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : s.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="DISPATCHED">DISPATCHED</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Emergency Directory View */}
      {activeTab === 'DIRECTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {directoryItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No emergency directory service providers listed yet. Click "Add Emergency Service" above to list one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="p-4">Service Category</th>
                    <th className="p-4">Facility Name</th>
                    <th className="p-4">Hotline & Address</th>
                    <th className="p-4">24/7 Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {directoryItems.map((dir) => (
                    <tr key={dir.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs uppercase border border-slate-200">
                          {dir.category}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 text-sm">
                        {dir.name}
                      </td>
                      <td className="p-4 text-slate-700">
                        <div className="font-bold text-red-600">{dir.phone}</div>
                        <div className="text-[11px] text-slate-500">{dir.address}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dir.available24h ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {dir.available24h ? '24/7 OPEN' : 'REGULAR HOURS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Add Directory Provider */}
      {isAddingDirectory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddDirectoryItem} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Emergency Service Provider</h3>
              <button type="button" onClick={() => setIsAddingDirectory(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Category</label>
                <select
                  value={dirForm.category}
                  onChange={(e) => setDirForm({ ...dirForm, category: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="HOSPITAL">Hospital</option>
                  <option value="AMBULANCE">Ambulance Service</option>
                  <option value="PHARMACY">Pharmacy</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Facility / Provider Name</label>
                <input
                  type="text"
                  value={dirForm.name}
                  onChange={(e) => setDirForm({ ...dirForm, name: e.target.value })}
                  placeholder="e.g. Central Emergency Hospital / Square Ambulance"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hotline / Phone Number</label>
                <input
                  type="text"
                  value={dirForm.phone}
                  onChange={(e) => setDirForm({ ...dirForm, phone: e.target.value })}
                  placeholder="e.g. +880 1700-000000"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address / Region</label>
                <input
                  type="text"
                  value={dirForm.address}
                  onChange={(e) => setDirForm({ ...dirForm, address: e.target.value })}
                  placeholder="e.g. Dhanmondi, Dhaka"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddingDirectory(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 cursor-pointer text-xs shadow-sm"
              >
                Add Service Listing
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
