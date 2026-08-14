import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { 
  UserCheck, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  RefreshCw, 
  Star, 
  Building, 
  Award, 
  AlertCircle, 
  Check, 
  X,
  User,
  ShieldCheck,
  Mail,
  Phone
} from 'lucide-react';

export interface DoctorRecord {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  degree: string;
  rating: number;
  consultations: number;
  fee: number;
  image: string;
  hospital: string;
  verified: boolean;
  availableDays?: string[];
  availableHours?: string;
  schedules?: any[];
  userId?: string;
  doctorUserId?: string;
  email?: string;
}

export interface RegisteredDoctorUser {
  uid: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  photoURL?: string;
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [registeredDoctorUsers, setRegisteredDoctorUsers] = useState<RegisteredDoctorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDoctorUsers, setLoadingDoctorUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [isAdding, setIsAdding] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRecord | null>(null);

  // Form State
  const [selectedDoctorUid, setSelectedDoctorUid] = useState<string>('');
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    specialty: string;
    experience: string;
    degree: string;
    rating: number;
    consultations: number;
    fee: number;
    image: string;
    hospital: string;
    verified: boolean;
    availableHours: string;
    userId: string;
  }>({
    name: '',
    email: '',
    specialty: 'General Medicine',
    experience: '5 years',
    degree: 'MBBS, FCPS',
    rating: 4.8,
    consultations: 100,
    fee: 500,
    image: '',
    hospital: 'Central Community Health Center',
    verified: true,
    availableHours: '09:00 AM - 05:00 PM',
    userId: ''
  });

  const DEFAULT_DOCTOR_AVATAR = 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        if (isEdit && editingDoctor) {
          setEditingDoctor({ ...editingDoctor, image: base64Str });
        } else {
          setFormData((prev) => ({ ...prev, image: base64Str }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchRegisteredDoctorUsers();
  }, []);

  const fetchRegisteredDoctorUsers = async () => {
    try {
      setLoadingDoctorUsers(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const docUsers: RegisteredDoctorUser[] = [];
      usersSnap.forEach((d) => {
        const u = d.data();
        if (u.role === 'doctor' || (u.role && u.role.toLowerCase() === 'doctor')) {
          docUsers.push({
            uid: d.id,
            name: u.name || u.displayName || 'Doctor',
            displayName: u.displayName || u.name,
            email: u.email || '',
            role: u.role,
            photoURL: u.photoURL || u.image
          });
        }
      });
      setRegisteredDoctorUsers(docUsers);
    } catch (err) {
      console.error('Error fetching registered doctor users:', err);
    } finally {
      setLoadingDoctorUsers(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError('');
      const snap = await getDocs(collection(db, 'doctors'));
      const list: DoctorRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as DoctorRecord);
      });
      setDoctors(list);
    } catch (err: any) {
      console.error('Error fetching doctors:', err);
      setError('Failed to fetch doctor profiles.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = async () => {
    setError('');
    setSuccess('');
    await fetchRegisteredDoctorUsers();
    setIsAdding(true);
    setSelectedDoctorUid('');
    setFormData({
      name: '',
      email: '',
      specialty: 'General Medicine',
      experience: '5 years',
      degree: 'MBBS, FCPS',
      rating: 4.8,
      consultations: 100,
      fee: 500,
      image: '',
      hospital: 'Central Community Health Center',
      verified: true,
      availableHours: '09:00 AM - 05:00 PM',
      userId: ''
    });
  };

  const handleSelectDoctorUser = (uid: string) => {
    setSelectedDoctorUid(uid);
    const selectedUser = registeredDoctorUsers.find(u => u.uid === uid);
    if (selectedUser) {
      setFormData(prev => ({
        ...prev,
        userId: selectedUser.uid,
        name: selectedUser.name || selectedUser.displayName || prev.name || 'Dr.',
        email: selectedUser.email || prev.email || '',
        image: selectedUser.photoURL || prev.image || ''
      }));
    }
  };

  const handleToggleVerified = async (docId: string, currentVerified: boolean) => {
    try {
      setError('');
      setSuccess('');
      await updateDoc(doc(db, 'doctors', docId), {
        verified: !currentVerified
      });
      setDoctors((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, verified: !currentVerified } : d))
      );
      setSuccess(`Doctor verification status set to ${!currentVerified ? 'VERIFIED' : 'UNVERIFIED'}.`);
    } catch (err: any) {
      console.error('Error updating doctor verification:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `doctors/${docId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to update verification status.');
      }
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorUid) {
      setError('Please select a registered doctor account to link with this profile.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const finalImage = (formData.image || '').trim() || DEFAULT_DOCTOR_AVATAR;
      
      const payload: any = {
        ...formData,
        userId: selectedDoctorUid,
        doctorUserId: selectedDoctorUid,
        image: finalImage,
        availableDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
        schedules: [
          {
            id: 'sched-1',
            days: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
            startTime: '09:00 AM',
            endTime: '05:00 PM',
            consultationType: 'Video & In-Person'
          }
        ],
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      // Set document using doctor's user UID so it directly corresponds to their account
      await setDoc(doc(db, 'doctors', selectedDoctorUid), payload, { merge: true });
      
      setDoctors((prev) => {
        const filtered = prev.filter(d => d.id !== selectedDoctorUid);
        return [{ id: selectedDoctorUid, ...payload } as DoctorRecord, ...filtered];
      });
      
      setSuccess(`Doctor profile successfully linked and published for ${formData.name}!`);
      setIsAdding(false);
    } catch (err: any) {
      console.error('Error creating doctor:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'doctors');
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to add doctor.');
      }
    }
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    try {
      setError('');
      setSuccess('');
      const finalImage = (editingDoctor.image || '').trim() || DEFAULT_DOCTOR_AVATAR;
      const updatedFields: any = {
        name: editingDoctor.name,
        specialty: editingDoctor.specialty,
        experience: editingDoctor.experience,
        degree: editingDoctor.degree,
        hospital: editingDoctor.hospital,
        fee: editingDoctor.fee,
        rating: editingDoctor.rating,
        verified: editingDoctor.verified,
        image: finalImage,
        updatedAt: serverTimestamp(),
        ...(editingDoctor.email ? { email: editingDoctor.email } : {}),
        ...(editingDoctor.userId ? { userId: editingDoctor.userId, doctorUserId: editingDoctor.userId } : {})
      };
      await updateDoc(doc(db, 'doctors', editingDoctor.id), updatedFields);
      setDoctors((prev) =>
        prev.map((d) => (d.id === editingDoctor.id ? { ...d, ...updatedFields } : d))
      );
      setSuccess('Doctor details updated successfully.');
      setEditingDoctor(null);
    } catch (err: any) {
      console.error('Error updating doctor:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `doctors/${editingDoctor.id}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to update doctor.');
      }
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const matchesSearch =
      (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.specialty || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.hospital || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.degree || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVer =
      verifiedFilter === 'ALL' ||
      (verifiedFilter === 'VERIFIED' && d.verified) ||
      (verifiedFilter === 'UNVERIFIED' && !d.verified);

    return matchesSearch && matchesVer;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-600" /> Doctors & Medical Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage registered medical specialists, verify credentials, set consultation fees, and publish doctor listings.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchDoctors();
              fetchRegisteredDoctorUsers();
            }}
            disabled={loading || loadingDoctorUsers}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingDoctorUsers ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            id="btn-add-new-doctor"
          >
            <Plus className="w-4 h-4" /> Add & Link Doctor
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

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctor by name, specialty, degree, or hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
            id="input-search-admin-doctors"
          />
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
          {(['ALL', 'VERIFIED', 'UNVERIFIED'] as const).map((vf) => (
            <button
              key={vf}
              onClick={() => setVerifiedFilter(vf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer capitalize ${
                verifiedFilter === vf
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {vf.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading doctor profiles...
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No doctors found matching search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-4">Doctor Info</th>
                  <th className="p-4">Degree & Hospital</th>
                  <th className="p-4">Consultation Fee</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDoctors.map((docItem) => (
                  <tr key={docItem.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={docItem.image || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=100'}
                          alt={docItem.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {docItem.name}
                            {docItem.verified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 fill-sky-100" />}
                          </div>
                          <div className="text-slate-500 text-xs font-semibold">{docItem.specialty} • {docItem.experience || '5 yrs exp'}</div>
                          <div className="text-[10px] text-sky-600 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-sky-500" />
                            <span>Linked UID: {docItem.userId || docItem.doctorUserId || docItem.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{docItem.degree}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" /> {docItem.hospital || 'General Hospital'}
                      </div>
                      {docItem.email && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-300" /> {docItem.email}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      ৳{docItem.fee || 500}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleVerified(docItem.id, docItem.verified)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer inline-flex items-center gap-1 ${
                          docItem.verified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                        id={`btn-toggle-verify-${docItem.id}`}
                      >
                        {docItem.verified ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {docItem.verified ? 'VERIFIED' : 'UNVERIFIED'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingDoctor(docItem)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                          title="Edit Doctor"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Doctor Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleCreateDoctor} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Link & Add Doctor Profile</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Link an existing registered doctor account to create their public profile.</p>
              </div>
              <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Registered Doctor User Selection */}
              <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-150 space-y-2">
                <label className="block font-black text-sky-900 uppercase tracking-wider text-[10px]">
                  1. Select Registered Doctor Account <span className="text-rose-500">*</span>
                </label>
                
                {loadingDoctorUsers ? (
                  <div className="text-slate-400 text-xs py-2 font-medium">Loading registered doctor accounts...</div>
                ) : registeredDoctorUsers.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px] font-medium">
                    ⚠️ No registered users with role &quot;doctor&quot; were found. A user must first register an account with role &quot;doctor&quot; before their profile can be published.
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedDoctorUid}
                      onChange={(e) => handleSelectDoctorUser(e.target.value)}
                      className="w-full p-2.5 bg-white border border-sky-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-800 cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Registered Doctor User --</option>
                      {registeredDoctorUsers.map((u) => {
                        const alreadyLinked = doctors.some(d => d.id === u.uid || d.userId === u.uid);
                        return (
                          <option key={u.uid} value={u.uid}>
                            {u.name || u.displayName || 'Doctor'} ({u.email || 'No email'}) {alreadyLinked ? '[Already Linked]' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedDoctorUid && (
                      <div className="text-[10px] text-sky-700 font-semibold mt-1">
                        Linked UID: <span className="font-mono">{selectedDoctorUid}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Dr. Full Name"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Fee (BDT)</label>
                  <input
                    type="number"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Degrees & Credentials</label>
                  <input
                    type="text"
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hospital / Clinic</label>
                <input
                  type="text"
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="doctor@example.com"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Profile Photo (Optional)</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="Paste Image URL (or upload below)"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, false)}
                      className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                    />
                    {formData.image && (
                      <span className="text-[10px] text-emerald-600 font-bold">Image selected ✓</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">If left blank, a professional default avatar will be automatically assigned.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedDoctorUid}
                className={`px-4 py-2 text-white rounded-xl font-bold text-xs shadow-sm ${
                  !selectedDoctorUid ? 'bg-slate-300 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 cursor-pointer'
                }`}
              >
                Save & Link Doctor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUpdateDoctor} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Doctor Info</h3>
              <button type="button" onClick={() => setEditingDoctor(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={editingDoctor.name}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={editingDoctor.specialty}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, specialty: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fee (BDT)</label>
                  <input
                    type="number"
                    value={editingDoctor.fee}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, fee: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Email</label>
                <input
                  type="email"
                  value={editingDoctor.email || ''}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, email: e.target.value })}
                  placeholder="doctor@example.com"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Profile Photo (Optional)</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingDoctor.image || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, image: e.target.value })}
                    placeholder="Image URL"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDoctor(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 cursor-pointer text-xs shadow-sm"
              >
                Save Doctor Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
