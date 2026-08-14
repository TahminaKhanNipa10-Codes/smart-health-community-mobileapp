import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Vaccination } from '../types';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Save, 
  Sparkles,
  Award,
  Clock,
  ShieldCheck,
  Building
} from 'lucide-react';

export default function VaccinationTracker() {
  const { currentUser } = useAuth();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [doseNumber, setDoseNumber] = useState('1st Dose');
  const [dateTaken, setDateTaken] = useState('');
  const [nextDoseDate, setNextDoseDate] = useState('');
  const [hospital, setHospital] = useState('');

  // Helper to get today's date string in local timezone YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  // Load vaccination records from Firestore
  const loadVaccinations = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');
      const q = query(
        collection(db, 'vaccinations'),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const list: Vaccination[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Vaccination);
      });
      
      // Sort: newest taken first
      list.sort((a, b) => b.dateTaken.localeCompare(a.dateTaken));
      setVaccinations(list);
    } catch (err: any) {
      console.error('Error fetching vaccinations:', err);
      setError('Failed to load vaccination records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVaccinations();
  }, [currentUser]);

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name || !doseNumber || !dateTaken || !hospital) {
      setError('Please fill in all required fields.');
      return;
    }
    if (nextDoseDate && nextDoseDate < dateTaken) {
      setError('Next dose date cannot be before the date taken.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const payload = {
        userId: currentUser.uid,
        name,
        doseNumber,
        dateTaken,
        nextDoseDate: nextDoseDate || '',
        hospital,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'vaccinations'), payload);
      setSuccess(`Vaccination record for ${name} (${doseNumber}) saved successfully!`);
      
      // Reset form and reload
      resetForm();
      await loadVaccinations();
    } catch (err: any) {
      console.error('Error adding vaccination:', err);
      setError('Failed to save vaccination record.');
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteVacId, setDeleteVacId] = useState<string | null>(null);
  const [deletingVac, setDeletingVac] = useState(false);

  // Trigger Delete Confirmation Modal
  const handleDelete = (id: string) => {
    setDeleteVacId(id);
  };

  // Perform Firestore Document Deletion and Refresh State
  const confirmDeleteVaccination = async () => {
    if (!deleteVacId) return;
    const id = deleteVacId;
    try {
      setDeletingVac(true);
      setError('');
      setSuccess('');
      await deleteDoc(doc(db, 'vaccinations', id));
      setSuccess('Vaccination record deleted successfully.');
      setVaccinations(prev => prev.filter(v => v.id !== id));
      setDeleteVacId(null);
      await loadVaccinations();
    } catch (err: any) {
      console.error('Error deleting vaccination:', err);
      setError('Failed to delete vaccination record.');
    } finally {
      setDeletingVac(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDoseNumber('1st Dose');
    setDateTaken('');
    setNextDoseDate('');
    setHospital('');
    setShowForm(false);
  };

  // Classify Schedules
  const todayStr = getTodayStr();

  // Completed vaccines are all logged records
  const completedVaccines = vaccinations;

  // Upcoming: nextDoseDate is on or after today
  const upcomingVaccines = vaccinations.filter(v => v.nextDoseDate && v.nextDoseDate >= todayStr);

  // Overdue: nextDoseDate is before today
  const overdueVaccines = vaccinations.filter(v => v.nextDoseDate && v.nextDoseDate < todayStr);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 flex items-start gap-2 text-sm shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-teal-50 text-teal-800 p-4 rounded-xl border border-teal-100 flex items-start gap-2 text-sm shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-teal-500 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteVacId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Vaccination Record</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this vaccination record? This will remove it from your immunization history permanently.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteVacId(null)}
                disabled={deletingVac}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteVaccination}
                disabled={deletingVac}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                {deletingVac ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vaccination Tracker</h2>
          <p className="text-slate-500 text-xs">Record your immunization history and track upcoming booster schedules.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
            showForm 
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'
          }`}
        >
          {showForm ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Log Vaccination</span>
            </>
          )}
        </button>
      </div>

      {/* Add Form Card */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm animate-fade-in">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Record New Vaccination</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vaccine Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="vac-name">
                  Vaccine / Immunization Name *
                </label>
                <input
                  id="vac-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Covid-19, Influenza, Hepatitis B"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs font-semibold"
                  required
                />
              </div>

              {/* Dose Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="vac-dose">
                  Dose / Stage *
                </label>
                <select
                  id="vac-dose"
                  value={doseNumber}
                  onChange={(e) => setDoseNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition text-xs font-semibold cursor-pointer"
                >
                  <option value="1st Dose">1st Dose</option>
                  <option value="2nd Dose">2nd Dose</option>
                  <option value="3rd Dose">3rd Dose</option>
                  <option value="Booster Shot">Booster Shot</option>
                  <option value="Annual / Seasonal">Annual / Seasonal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Taken */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="vac-date-taken">
                  Date Administered *
                </label>
                <input
                  id="vac-date-taken"
                  type="date"
                  value={dateTaken}
                  onChange={(e) => setDateTaken(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs font-semibold cursor-pointer"
                  required
                />
              </div>

              {/* Next Dose Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="vac-next-date">
                  Next Dose / Booster Date <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="vac-next-date"
                  type="date"
                  value={nextDoseDate}
                  onChange={(e) => setNextDoseDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs font-semibold cursor-pointer"
                />
              </div>
            </div>

            {/* Hospital */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="vac-hospital">
                Hospital / Clinic *
              </label>
              <input
                id="vac-hospital"
                type="text"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                placeholder="e.g. City General Hospital, Central Health Clinic"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs font-semibold"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Clear / Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{submitting ? 'Saving...' : 'Save Record'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-150 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Loading immunization records...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* SECTION 1: OVERDUE VACCINES (ALERT BANNER IF ANY EXIST) */}
          {overdueVaccines.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-500 animate-bounce" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Overdue Vaccinations ({overdueVaccines.length})</h3>
                  <p className="text-[10px] text-rose-600 mt-0.5">Please schedule booster doses with your primary care provider.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overdueVaccines.map((v) => (
                  <div key={`overdue-${v.id}`} className="bg-white border-2 border-rose-200 rounded-xl p-4 shadow-xs relative overflow-hidden group">
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-rose-500" />
                    <div className="pl-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs">{v.name}</h4>
                          <p className="text-[10px] text-rose-600 font-bold mt-0.5">Next Dose Overdue</p>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Overdue
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-[10px] text-slate-600">
                        <p className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span><strong>Scheduled for:</strong> {v.nextDoseDate ? new Date(v.nextDoseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-slate-400" />
                          <span><strong>Previous dose:</strong> {v.doseNumber} taken on {new Date(v.dateTaken).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-rose-100 flex justify-end">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: UPCOMING SCHEDULE */}
          {upcomingVaccines.length > 0 && (
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-indigo-900">
                <Clock className="w-4 h-4 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Upcoming Immunization Schedule</h3>
                  <p className="text-[10px] text-indigo-500 mt-0.5">Doses scheduled for future dates.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingVaccines.map((v) => (
                  <div key={`upcoming-${v.id}`} className="bg-white border border-indigo-100 rounded-xl p-4 shadow-xs relative overflow-hidden group">
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />
                    <div className="pl-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs">{v.name}</h4>
                          <p className="text-[9px] text-indigo-600 font-bold mt-0.5">Next Booster Scheduled</p>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Upcoming
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-[10px] text-slate-600">
                        <p className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span><strong>Scheduled date:</strong> {v.nextDoseDate ? new Date(v.nextDoseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-slate-400" />
                          <span><strong>Previous dose:</strong> {v.doseNumber}</span>
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-indigo-100 flex justify-end">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: COMPLETED VACCINES */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Completed Immunizations ({completedVaccines.length})</h3>
            
            {completedVaccines.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-150 flex flex-col items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-slate-500 text-xs font-semibold">No vaccination history logged yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">Add your vaccines to keep an organized timeline of your immune records.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedVaccines.map((v) => (
                  <div key={v.id} className="bg-white rounded-xl border border-slate-150 p-4 shadow-xs flex flex-col justify-between hover:shadow-sm transition duration-150">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs truncate max-w-[150px]">{v.name}</h4>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{v.doseNumber}</p>
                        </div>
                        <span className="text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Completed
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-[10px] text-slate-600">
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span><strong>Date Taken:</strong> {new Date(v.dateTaken).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate"><strong>Facility:</strong> {v.hospital}</span>
                        </p>
                        {v.nextDoseDate && (
                          <p className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50/55 p-1 px-1.5 rounded">
                            <Clock className="w-3 h-3 shrink-0 text-indigo-500" />
                            <span><strong>Next Booster:</strong> {new Date(v.nextDoseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
