import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw, 
  FileText, 
  Phone, 
  Mail, 
  Video, 
  MapPin, 
  ShieldCheck, 
  Briefcase, 
  Building
} from 'lucide-react';

export interface DoctorScheduleItem {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
  consultationType: string;
}

export interface DoctorAppointment {
  id: string;
  patientId?: string;
  userId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  specialization?: string;
  date?: string;
  appointmentDate?: string;
  time?: string;
  appointmentTime?: string;
  type?: string;
  consultationType?: string;
  status: string;
  notes?: string;
  symptoms?: string;
  reason?: string;
  hospital?: string;
  createdAt?: any;
}

const ALL_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function DoctorPanel() {
  const { currentUser, userData } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Doctor Profile state
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('General Medicine');
  const [hospital, setHospital] = useState('Central Community Health Center');
  const [degree, setDegree] = useState('MBBS, FCPS');
  const [experience, setExperience] = useState('5+ years');
  const [fee, setFee] = useState(500);

  // Doctor Profile Edit Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editSpecialty, setEditSpecialty] = useState('General Medicine');
  const [editHospital, setEditHospital] = useState('Central Community Health Center');
  const [editDegree, setEditDegree] = useState('MBBS, FCPS');
  const [editExperience, setEditExperience] = useState('5+ years');
  const [editFee, setEditFee] = useState(500);

  // Schedules state
  const [schedules, setSchedules] = useState<DoctorScheduleItem[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Sat', 'Sun', 'Mon', 'Tue', 'Wed']);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [consultationType, setConsultationType] = useState('In-Person Hospital Visit');

  // Appointments state
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadDoctorData();
    }
  }, [currentUser]);

  const loadDoctorData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');

      // 1. Fetch Doctor Profile or find document belonging to this doctor
      let docId: string | null = null;
      const doctorsSnap = await getDocs(collection(db, 'doctors'));
      let docData: any = null;

      doctorsSnap.forEach((d) => {
        const data = d.data();
        if (
          d.id === currentUser.uid ||
          data.userId === currentUser.uid ||
          (data.email && data.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
          (data.name && data.name.toLowerCase().includes((userData?.name || '').toLowerCase()))
        ) {
          docId = d.id;
          docData = data;
        }
      });

      if (docId && docData) {
        setDoctorProfileId(docId);
        setSpecialty(docData.specialty || 'General Medicine');
        setHospital(docData.hospital || 'Central Community Health Center');
        setDegree(docData.degree || 'MBBS, FCPS');
        setExperience(docData.experience || '5+ years');
        setFee(docData.fee || 500);

        if (Array.isArray(docData.schedules) && docData.schedules.length > 0) {
          setSchedules(docData.schedules);
        } else {
          // Default initial schedule if none exists
          const defaultSched: DoctorScheduleItem = {
            id: 'default-1',
            days: docData.availableDays || ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
            startTime: docData.availableHours ? docData.availableHours.split('-')[0]?.trim() || '09:00 AM' : '09:00 AM',
            endTime: docData.availableHours ? docData.availableHours.split('-')[1]?.trim() || '05:00 PM' : '05:00 PM',
            consultationType: 'Video & In-Person'
          };
          setSchedules([defaultSched]);
        }
      } else {
        // Auto-provision initial doctor document if none exists yet
        const newDocRef = doc(db, 'doctors', currentUser.uid);
        const newDocData = {
          userId: currentUser.uid,
          name: userData?.name || currentUser.displayName || 'Dr. Practitioner',
          email: currentUser.email || '',
          specialty: 'General Medicine',
          hospital: 'Central Community Health Center',
          degree: 'MBBS, FCPS',
          experience: '5+ years',
          rating: 4.9,
          consultations: 50,
          fee: 500,
          verified: true,
          image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300',
          availableDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
          availableHours: '09:00 AM - 05:00 PM',
          schedules: [
            {
              id: 'sched-1',
              days: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
              startTime: '09:00 AM',
              endTime: '05:00 PM',
              consultationType: 'Video & In-Person'
            }
          ],
          createdAt: serverTimestamp()
        };

        await setDoc(newDocRef, newDocData);
        setDoctorProfileId(currentUser.uid);
        setSchedules(newDocData.schedules);
        docId = currentUser.uid;
      }

      // 2. Fetch assigned appointments
      await fetchAppointments(docId);
    } catch (err: any) {
      console.error('Error loading doctor data:', err);
      setError('Failed to load doctor workspace information.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (docProfileId?: string | null) => {
    try {
      setRefreshing(true);
      const apptsSnap = await getDocs(collection(db, 'appointments'));
      const list: DoctorAppointment[] = [];
      const currentDocId = docProfileId || doctorProfileId;

      apptsSnap.forEach((d) => {
        const data = d.data();
        const apptDoctorId = data.doctorId || '';
        const apptDoctorUserId = data.doctorUserId || '';
        const apptDoctorEmail = (data.doctorEmail || '').toLowerCase().trim();

        // Check if appointment is assigned to this logged-in doctor
        const isAssignedToDoctor =
          apptDoctorUserId === currentUser?.uid ||
          apptDoctorId === currentUser?.uid ||
          (currentDocId && (apptDoctorId === currentDocId || apptDoctorUserId === currentDocId)) ||
          (currentUser?.email && apptDoctorEmail && apptDoctorEmail === currentUser.email.toLowerCase().trim());

        if (isAssignedToDoctor) {
          list.push({
            id: d.id,
            ...data
          } as DoctorAppointment);
        }
      });

      // Sort newest first
      list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setAppointments(list);
    } catch (err: any) {
      console.error('Error fetching doctor appointments:', err);
      try {
        handleFirestoreError(err, OperationType.GET, 'appointments');
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to sync appointments.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenEditProfile = () => {
    setEditSpecialty(specialty);
    setEditHospital(hospital);
    setEditDegree(degree);
    setEditExperience(experience);
    setEditFee(fee);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setError('');
      setSuccess('');

      const targetDocId = doctorProfileId || currentUser.uid;
      const numericFee = Number(editFee) || 500;

      await setDoc(
        doc(db, 'doctors', targetDocId),
        {
          userId: currentUser.uid,
          doctorUserId: currentUser.uid,
          specialty: editSpecialty,
          hospital: editHospital,
          degree: editDegree,
          experience: editExperience,
          fee: numericFee,
          consultationFee: `৳ ${numericFee}`,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setSpecialty(editSpecialty);
      setHospital(editHospital);
      setDegree(editDegree);
      setExperience(editExperience);
      setFee(numericFee);
      setIsProfileModalOpen(false);
      setSuccess('Doctor profile details updated successfully!');
    } catch (err: any) {
      console.error('Error saving doctor profile:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `doctors/${doctorProfileId || currentUser?.uid}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to save doctor profile.');
      }
    }
  };

  // Schedule Management Handlers
  const handleOpenAddSchedule = () => {
    setEditingScheduleId(null);
    setSelectedDays(['Sat', 'Sun', 'Mon', 'Tue', 'Wed']);
    setStartTime('09:00 AM');
    setEndTime('05:00 PM');
    setConsultationType('In-Person Hospital Visit');
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (sched: DoctorScheduleItem) => {
    setEditingScheduleId(sched.id);
    setSelectedDays(sched.days || []);
    setStartTime(sched.startTime || '09:00 AM');
    setEndTime(sched.endTime || '05:00 PM');
    setConsultationType(sched.consultationType || 'Video & In-Person');
    setIsScheduleModalOpen(true);
  };

  const toggleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      setError('Please select at least one working day.');
      return;
    }

    try {
      setError('');
      setSuccess('');

      let updatedSchedules: DoctorScheduleItem[] = [];

      if (editingScheduleId) {
        updatedSchedules = schedules.map((s) =>
          s.id === editingScheduleId
            ? {
                ...s,
                days: selectedDays,
                startTime,
                endTime,
                consultationType
              }
            : s
        );
      } else {
        const newSchedItem: DoctorScheduleItem = {
          id: `sched-${Date.now()}`,
          days: selectedDays,
          startTime,
          endTime,
          consultationType
        };
        updatedSchedules = [...schedules, newSchedItem];
      }

      // Combine unique days for availableDays field
      const allUniqueDays = Array.from(
        new Set(updatedSchedules.flatMap((s) => s.days))
      );

      const combinedHours = updatedSchedules
        .map((s) => `${s.startTime} - ${s.endTime}`)
        .join(', ');

      const targetDocId = doctorProfileId || currentUser?.uid;

      if (targetDocId) {
        await setDoc(doc(db, 'doctors', targetDocId), {
          userId: currentUser?.uid,
          doctorUserId: currentUser?.uid,
          schedules: updatedSchedules,
          availableDays: allUniqueDays,
          availableHours: combinedHours,
          specialty,
          hospital,
          degree,
          experience,
          fee: Number(fee),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setSchedules(updatedSchedules);
      setSuccess(
        editingScheduleId ? 'Working schedule updated successfully!' : 'New schedule added successfully!'
      );
      setIsScheduleModalOpen(false);
    } catch (err: any) {
      console.error('Error saving doctor schedule:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `doctors/${doctorProfileId || currentUser?.uid}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to save schedule.');
      }
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      setError('');
      setSuccess('');

      const updatedSchedules = schedules.filter((s) => s.id !== scheduleId);
      const allUniqueDays = Array.from(
        new Set(updatedSchedules.flatMap((s) => s.days))
      );
      const combinedHours = updatedSchedules
        .map((s) => `${s.startTime} - ${s.endTime}`)
        .join(', ');

      const targetDocId = doctorProfileId || currentUser?.uid;

      if (targetDocId) {
        await setDoc(doc(db, 'doctors', targetDocId), {
          userId: currentUser?.uid,
          doctorUserId: currentUser?.uid,
          schedules: updatedSchedules,
          availableDays: allUniqueDays,
          availableHours: combinedHours || 'By Appointment',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setSchedules(updatedSchedules);
      setSuccess('Working schedule removed.');
    } catch (err: any) {
      console.error('Error deleting schedule:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `doctors/${doctorProfileId || currentUser?.uid}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to delete schedule.');
      }
    }
  };

  // Appointment Actions
  const handleUpdateAppointmentStatus = async (
    appt: DoctorAppointment,
    newStatus: 'approved' | 'rejected' | 'completed' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  ) => {
    try {
      setError('');
      setSuccess('');

      // Normalize status representation
      const lowerStatus = newStatus.toLowerCase();
      const statusValue =
        lowerStatus === 'confirmed' || lowerStatus === 'approved'
          ? 'approved'
          : lowerStatus === 'cancelled' || lowerStatus === 'rejected'
          ? 'rejected'
          : 'completed';

      await updateDoc(doc(db, 'appointments', appt.id), {
        status: statusValue,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: statusValue } : a))
      );

      // Create patient notification
      const patientRecipientId = appt.patientId || appt.userId || (appt as any).patientUid;
      if (patientRecipientId) {
        const readableStatus = statusValue === 'approved' ? 'Approved' : statusValue === 'rejected' ? 'Rejected' : 'Completed';
        await addDoc(collection(db, 'notifications'), {
          recipientId: patientRecipientId,
          senderId: currentUser?.uid,
          senderName: userData?.name || currentUser?.displayName || 'Your Doctor',
          type: 'appointment_update',
          title: `Appointment ${readableStatus}`,
          message: `Your appointment request with ${userData?.name || 'Dr. ' + (currentUser?.displayName || 'Physician')} for ${appt.appointmentDate || appt.date || 'the scheduled date'} at ${appt.appointmentTime || appt.time || 'the scheduled time'} has been ${readableStatus.toLowerCase()}.`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setSuccess(`Appointment with ${appt.patientName} marked as ${statusValue.toUpperCase()}.`);
    } catch (err: any) {
      console.error('Error updating appointment status:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `appointments/${appt.id}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to update appointment status.');
      }
    }
  };

  // Filter Appointments
  const filteredAppointments = appointments.filter((a) => {
    const normStatus = (a.status || 'PENDING').toUpperCase();

    let matchesTab = true;
    if (statusTab === 'PENDING') {
      matchesTab = normStatus === 'PENDING';
    } else if (statusTab === 'CONFIRMED') {
      matchesTab = normStatus === 'CONFIRMED' || normStatus === 'APPROVED';
    } else if (statusTab === 'COMPLETED') {
      matchesTab = normStatus === 'COMPLETED';
    } else if (statusTab === 'CANCELLED') {
      matchesTab = normStatus === 'CANCELLED' || normStatus === 'REJECTED';
    }

    const queryLower = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !queryLower ||
      (a.patientName || '').toLowerCase().includes(queryLower) ||
      (a.patientEmail || '').toLowerCase().includes(queryLower) ||
      (a.patientPhone || '').includes(queryLower) ||
      (a.symptoms || a.notes || a.reason || '').toLowerCase().includes(queryLower) ||
      (a.appointmentDate || a.date || '').includes(queryLower);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 md:pl-64 flex flex-col">
      <Sidebar />

      <main className="p-6 max-w-7xl w-full mx-auto flex-1 space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Doctor Workspace</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Manage your clinical availability schedules and patient consultation requests.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAppointments()}
              disabled={refreshing}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              id="btn-refresh-doctor-workspace"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Workspace
            </button>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 flex items-center gap-2 text-xs font-semibold" id="doctor-workspace-error">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-200 flex items-center gap-2 text-xs font-semibold" id="doctor-workspace-success">
            <Check className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Doctor Summary & Availability Schedule Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Doctor Profile Overview */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600 font-black text-lg">
                    {userData?.name ? userData.name.charAt(0).toUpperCase() : 'D'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                      {userData?.name || 'Practitioner'}
                      <ShieldCheck className="w-4 h-4 text-sky-500" />
                    </h3>
                    <p className="text-xs text-sky-600 font-bold">{specialty}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition cursor-pointer"
                  title="Edit Profile Details"
                  id="btn-edit-doctor-profile"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Hospital
                  </span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[180px]">{hospital}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Qualification
                  </span>
                  <span className="font-bold text-slate-800">{degree}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Experience
                  </span>
                  <span className="font-bold text-slate-800">{experience}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                  </span>
                  <span className="font-bold text-slate-800 truncate max-w-[180px]">{currentUser?.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Consultation Fee</span>
              <span className="font-black text-sky-600 text-sm">৳ {fee} / session</span>
            </div>
          </div>

          {/* Availability & Schedules Manager */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-600" /> Working Days & Hours
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your weekly availability slots for patient consultation bookings.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddSchedule}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-sm shadow-sky-600/20"
                  id="btn-add-schedule"
                >
                  <Plus className="w-4 h-4" /> Add Working Slot
                </button>
              </div>

              {/* Schedules List */}
              {schedules.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No availability schedules defined yet. Click "Add Working Slot" to publish your working hours.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {schedules.map((sched) => (
                    <div 
                      key={sched.id} 
                      className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-sky-300 transition"
                      id={`schedule-card-${sched.id}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 bg-sky-100/80 px-2.5 py-0.5 rounded-md border border-sky-200">
                            {sched.consultationType || 'Consultation'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditSchedule(sched)}
                              className="p-1 text-slate-400 hover:text-sky-600 transition cursor-pointer"
                              title="Edit Schedule"
                              id={`btn-edit-sched-${sched.id}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(sched.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Schedule"
                              id={`btn-delete-sched-${sched.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                          <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                          <span>{sched.startTime} – {sched.endTime}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {ALL_DAYS.map((day) => {
                            const isWorking = (sched.days || []).includes(day);
                            return (
                              <span
                                key={day}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  isWorking
                                    ? 'bg-sky-600 text-white border-sky-600'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                                }`}
                              >
                                {day}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Appointment Management Panel */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-sky-600" /> Patient Appointment Requests
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review assigned patient consultations, inspect reason notes, and confirm or finalize bookings.
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setStatusTab('ALL')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                id="tab-appointments-all"
              >
                All ({appointments.length})
              </button>
              <button
                onClick={() => setStatusTab('PENDING')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusTab === 'PENDING' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:text-amber-900'
                }`}
                id="tab-appointments-pending"
              >
                Pending ({appointments.filter(a => (a.status || '').toUpperCase() === 'PENDING').length})
              </button>
              <button
                onClick={() => setStatusTab('CONFIRMED')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusTab === 'CONFIRMED' ? 'bg-sky-600 text-white shadow-xs' : 'text-sky-700 hover:text-sky-900'
                }`}
                id="tab-appointments-confirmed"
              >
                Approved ({appointments.filter(a => (a.status || '').toUpperCase() === 'CONFIRMED' || (a.status || '').toUpperCase() === 'APPROVED').length})
              </button>
              <button
                onClick={() => setStatusTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusTab === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
                }`}
                id="tab-appointments-completed"
              >
                Completed ({appointments.filter(a => (a.status || '').toUpperCase() === 'COMPLETED').length})
              </button>
              <button
                onClick={() => setStatusTab('CANCELLED')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusTab === 'CANCELLED' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                id="tab-appointments-cancelled"
              >
                Rejected ({appointments.filter(a => (a.status || '').toUpperCase() === 'CANCELLED' || (a.status || '').toUpperCase() === 'REJECTED').length})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="Search appointments by patient name, contact details, date, or symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              id="input-search-doctor-appointments"
            />
          </div>

          {/* Appointments Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Loading appointment requests...
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No appointments found matching current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="p-4">Patient Information</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Consultation Type</th>
                    <th className="p-4">Symptoms / Reason</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAppointments.map((appt) => {
                    const normStatus = (appt.status || 'PENDING').toUpperCase();

                    return (
                      <tr key={appt.id} className="hover:bg-slate-50/80 transition" id={`appt-row-${appt.id}`}>
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                            <User className="w-4 h-4 text-sky-600" /> {appt.patientName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-col space-y-0.5">
                            {appt.patientEmail && <span>Email: {appt.patientEmail}</span>}
                            {appt.patientPhone && <span>Phone: {appt.patientPhone}</span>}
                          </div>
                        </td>

                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-1 text-slate-900">
                            <Calendar className="w-3.5 h-3.5 text-sky-500" />
                            <span>{appt.appointmentDate || appt.date || 'TBD'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 font-semibold mt-0.5 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{appt.appointmentTime || appt.time || 'TBD'}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 capitalize">
                            {(appt.consultationType || appt.type) === 'video' ? (
                              <Video className="w-3 h-3 text-sky-600" />
                            ) : (
                              <MapPin className="w-3 h-3 text-emerald-600" />
                            )}
                            {appt.consultationType || appt.type || 'In-Person'}
                          </span>
                        </td>

                        <td className="p-4 max-w-xs">
                          <div className="text-slate-700 line-clamp-2 text-xs">
                            {appt.symptoms || appt.notes || appt.reason || 'No specific symptoms noted.'}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border ${
                              normStatus === 'CONFIRMED' || normStatus === 'APPROVED'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : normStatus === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : normStatus === 'CANCELLED' || normStatus === 'REJECTED'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                            }`}
                          >
                            {normStatus === 'CONFIRMED' ? 'APPROVED' : normStatus === 'CANCELLED' ? 'REJECTED' : normStatus}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {normStatus === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleUpdateAppointmentStatus(appt, 'CONFIRMED')}
                                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Approve Appointment"
                                  id={`btn-approve-appt-${appt.id}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateAppointmentStatus(appt, 'CANCELLED')}
                                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Reject Appointment"
                                  id={`btn-reject-appt-${appt.id}`}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </>
                            )}

                            {(normStatus === 'CONFIRMED' || normStatus === 'APPROVED') && (
                              <>
                                <button
                                  onClick={() => handleUpdateAppointmentStatus(appt, 'COMPLETED')}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Mark Completed"
                                  id={`btn-complete-appt-${appt.id}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                                </button>
                                <button
                                  onClick={() => handleUpdateAppointmentStatus(appt, 'CANCELLED')}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Cancel / Reject"
                                  id={`btn-cancel-appt-${appt.id}`}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Cancel
                                </button>
                              </>
                            )}

                            {normStatus === 'COMPLETED' && (
                              <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                              </span>
                            )}

                            {(normStatus === 'CANCELLED' || normStatus === 'REJECTED') && (
                              <span className="text-slate-400 font-bold text-[11px]">
                                Rejected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Add / Edit Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                {editingScheduleId ? 'Edit Availability Schedule' : 'Add Availability Schedule'}
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs font-medium">
              
              {/* Select Working Days */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-2">
                  Select Working Days:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ALL_DAYS.map((day) => {
                    const selected = selectedDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDaySelection(day)}
                        className={`py-2 px-3 rounded-xl border font-extrabold transition cursor-pointer text-center ${
                          selected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        id={`btn-toggle-day-${day}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    Start Time:
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                    id="select-start-time"
                  >
                    {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    End Time:
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                    id="select-end-time"
                  >
                    {['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Consultation Type */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  Consultation Medium:
                </label>
                <select
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                  id="select-consultation-type"
                >
                  <option value="In-Person Hospital Visit">In-Person Hospital Visit</option>
                  <option value="Video Consultation">Video Consultation</option>
                  <option value="Voice Call">Voice Call</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold cursor-pointer shadow-sm shadow-sky-600/20"
                  id="btn-save-schedule-submit"
                >
                  {editingScheduleId ? 'Save Changes' : 'Add Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-sky-600" />
                Edit Doctor Profile
              </h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  Specialty / Department:
                </label>
                <input
                  type="text"
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g. General Medicine, Cardiology"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  Hospital / Clinic:
                </label>
                <input
                  type="text"
                  value={editHospital}
                  onChange={(e) => setEditHospital(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g. Central Community Health Center"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    Qualification / Degrees:
                  </label>
                  <input
                    type="text"
                    value={editDegree}
                    onChange={(e) => setEditDegree(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g. MBBS, FCPS"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    Experience:
                  </label>
                  <input
                    type="text"
                    value={editExperience}
                    onChange={(e) => setEditExperience(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g. 5+ years"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  Consultation Fee (৳ BDT):
                </label>
                <input
                  type="number"
                  value={editFee}
                  onChange={(e) => setEditFee(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  min="0"
                  step="50"
                  placeholder="500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold cursor-pointer shadow-sm shadow-sky-600/20"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
