import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Medicine } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Save, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function MedicineReminder() {
  const { currentUser } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [morning, setMorning] = useState(false);
  const [afternoon, setAfternoon] = useState(false);
  const [night, setNight] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper to get today's date string in local timezone YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  // Load medicines from Firestore
  const loadMedicines = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');
      const q = query(
        collection(db, 'medicines'),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const list: Medicine[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Medicine);
      });
      
      // Sort: newly created or by start date
      list.sort((a, b) => b.startDate.localeCompare(a.startDate));
      setMedicines(list);
    } catch (err: any) {
      console.error('Error fetching medicines:', err);
      setError('Failed to load medication reminders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, [currentUser]);

  // Handle Form Submission (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name || !dosage || !startDate || !endDate) {
      setError('Please fill in all required fields.');
      return;
    }
    if (startDate > endDate) {
      setError('Start date cannot be after end date.');
      return;
    }
    if (!morning && !afternoon && !night) {
      setError('Please select at least one time of day (Morning, Afternoon, or Night).');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const payload = {
        userId: currentUser.uid,
        name,
        dosage,
        frequency,
        morning,
        afternoon,
        night,
        startDate,
        endDate,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        // Update existing record
        await updateDoc(doc(db, 'medicines', editingId), payload);
        setSuccess('Medicine reminder updated successfully!');
      } else {
        // Create new record
        await addDoc(collection(db, 'medicines'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        setSuccess('Medicine reminder added successfully!');
      }

      // Reset form and reload
      resetForm();
      await loadMedicines();
    } catch (err: any) {
      console.error('Error saving medicine:', err);
      setError('Failed to save medicine reminder.');
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteMedId, setDeleteMedId] = useState<string | null>(null);
  const [deletingMed, setDeletingMed] = useState(false);

  // Handle Edit Action
  const handleEdit = (med: Medicine) => {
    setEditingId(med.id);
    setName(med.name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setMorning(med.morning);
    setAfternoon(med.afternoon);
    setNight(med.night);
    setStartDate(med.startDate);
    setEndDate(med.endDate);
    setShowForm(true);
    // Scroll to form smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Trigger Delete Confirmation Modal
  const handleDelete = (id: string) => {
    setDeleteMedId(id);
  };

  // Perform Firestore Document Deletion and Refresh State
  const confirmDeleteMedicine = async () => {
    if (!deleteMedId) return;
    const id = deleteMedId;
    try {
      setDeletingMed(true);
      setError('');
      setSuccess('');
      await deleteDoc(doc(db, 'medicines', id));
      setSuccess('Medicine reminder deleted successfully.');
      setMedicines(prev => prev.filter(m => m.id !== id));
      setDeleteMedId(null);
      await loadMedicines();
    } catch (err: any) {
      console.error('Error deleting medicine:', err);
      setError('Failed to delete medicine reminder.');
    } finally {
      setDeletingMed(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDosage('');
    setFrequency('Daily');
    setMorning(false);
    setAfternoon(false);
    setNight(false);
    setStartDate('');
    setEndDate('');
    setShowForm(false);
  };

  // Separate today's active medicines
  const todayStr = getTodayStr();
  const todayMedicines = medicines.filter(med => {
    return med.startDate <= todayStr && todayStr <= med.endDate;
  });

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
      {deleteMedId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Medicine Reminder</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this medicine reminder? This will remove it from your schedule permanently.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteMedId(null)}
                disabled={deletingMed}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedicine}
                disabled={deletingMed}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                {deletingMed ? 'Deleting...' : 'Delete Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Medication Reminders</h2>
          <p className="text-slate-500 text-xs">Plan, edit, and keep track of your daily prescription schedules.</p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
            showForm 
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/10'
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
              <span>Add New Medicine</span>
            </>
          )}
        </button>
      </div>

      {/* Add/Edit Form Card */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm animate-fade-in">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Sparkles className="w-4 h-4 text-teal-500" />
            <span>{editingId ? 'Edit Medicine Reminder' : 'Add New Medication'}</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Medicine Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="med-name">
                  Medicine Name *
                </label>
                <input
                  id="med-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paracetamol, Metformin"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition text-xs font-semibold"
                  required
                />
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="med-dosage">
                  Dosage / Strength *
                </label>
                <input
                  id="med-dosage"
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 500mg, 1 Tablet"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition text-xs font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Frequency */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="med-freq">
                  Frequency *
                </label>
                <select
                  id="med-freq"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition text-xs font-semibold cursor-pointer"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="As Needed (PRN)">As Needed (PRN)</option>
                  <option value="Every Other Day">Every Other Day</option>
                </select>
              </div>

              {/* Timing Checklist */}
              <div>
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Intake Times * <span className="text-slate-400 font-normal">(Select all that apply)</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition select-none ${
                    morning 
                      ? 'bg-amber-50 border-amber-200 text-amber-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={morning}
                      onChange={(e) => setMorning(e.target.checked)}
                      className="sr-only"
                    />
                    <span>Morning</span>
                  </label>

                  <label className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition select-none ${
                    afternoon 
                      ? 'bg-orange-50 border-orange-200 text-orange-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={afternoon}
                      onChange={(e) => setAfternoon(e.target.checked)}
                      className="sr-only"
                    />
                    <span>Afternoon</span>
                  </label>

                  <label className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition select-none ${
                    night 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={night}
                      onChange={(e) => setNight(e.target.checked)}
                      className="sr-only"
                    />
                    <span>Night</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="med-start-date">
                  Start Date *
                </label>
                <input
                  id="med-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition text-xs font-semibold cursor-pointer"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="med-end-date">
                  End Date *
                </label>
                <input
                  id="med-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition text-xs font-semibold cursor-pointer"
                  required
                />
              </div>
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
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-md shadow-teal-600/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{submitting ? 'Saving...' : editingId ? 'Update Reminder' : 'Save Reminder'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-150 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Fetching your medicine inventory...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SECTION 1: TODAY'S MEDICINES */}
          <div className="bg-gradient-to-br from-teal-50/40 via-white to-sky-50/30 rounded-2xl border border-teal-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-teal-500 text-white rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Today's Medication Schedule</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Active reminders for {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>

            {todayMedicines.length === 0 ? (
              <div className="text-center py-8 bg-white/60 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-slate-600 text-xs font-bold">No Medications Scheduled for Today</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Take a moment to relax, or add reminders to stay on track.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayMedicines.map((med) => (
                  <div key={`today-${med.id}`} className="bg-white rounded-xl border border-slate-150 p-4 shadow-xs flex flex-col justify-between hover:border-teal-300 transition duration-200 relative overflow-hidden group">
                    {/* Ambient subtle green indicator bar */}
                    <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-teal-500" />
                    
                    <div className="pl-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">{med.name}</h4>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{med.dosage} • {med.frequency}</p>
                        </div>
                        <span className="text-[9px] font-bold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                          Active Today
                        </span>
                      </div>

                      <div className="mt-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Intake Schedule:</span>
                        <div className="flex gap-2">
                          {med.morning && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Morning
                            </span>
                          )}
                          {med.afternoon && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              Afternoon
                            </span>
                          )}
                          {med.night && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              Night
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 pl-2 flex justify-between items-center text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        Ends {new Date(med.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(med)}
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(med.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: ALL REMINDERS */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">All Active Reminders ({medicines.length})</h3>
            
            {medicines.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-150 flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-500 text-xs font-semibold">No reminders configured yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">Add your medicines above to configure scheduled notifications.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {medicines.map((med) => {
                  const isActive = todayMedicines.some(t => t.id === med.id);
                  return (
                    <div key={med.id} className="bg-white rounded-xl border border-slate-150 p-4 shadow-xs flex flex-col justify-between hover:shadow-sm transition duration-150">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs truncate max-w-[140px]">{med.name}</h4>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{med.dosage}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {isActive ? 'Active Today' : 'Inactive Today'}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-[10px] text-slate-600">
                          <p className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span><strong>Frequency:</strong> {med.frequency}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              <strong>Duration:</strong> {new Date(med.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(med.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {med.morning && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-bold rounded">Morning</span>
                          )}
                          {med.afternoon && (
                            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[8px] font-bold rounded">Afternoon</span>
                          )}
                          {med.night && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-bold rounded">Night</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(med)}
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(med.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
