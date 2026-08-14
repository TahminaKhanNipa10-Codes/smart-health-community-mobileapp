import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Droplet, 
  Activity, 
  Heart, 
  Plus, 
  Trash2, 
  History, 
  Calendar, 
  Clock, 
  CheckCircle, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Minus,
  Sparkles,
  Info,
  Pill,
  Syringe
} from 'lucide-react';
import MedicineReminder from '../components/MedicineReminder';
import VaccinationTracker from '../components/VaccinationTracker';

interface HealthLogEntry {
  id: string;
  userId: string;
  type: 'bmi' | 'water' | 'blood_sugar' | 'blood_pressure';
  createdAt: any;
  metrics: {
    height?: number;
    weight?: number;
    bmi?: number;
    category?: string;
    amount?: number;
    dailyGoal?: number;
    date?: string;
    glucose?: number;
    sugarType?: string;
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    dateTime?: string;
  };
}

export default function Tracker() {
  const { currentUser, userData, refreshUserData } = useAuth();

  // Active Tab for Mobile/Single views
  const [activeTab, setActiveTab] = useState<'bmi' | 'water' | 'sugar' | 'pressure' | 'medication' | 'vaccination'>('bmi');

  // Loading & Alerts
  const [logs, setLogs] = useState<HealthLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Today's Date String in local timezone YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  // --- BMI TRACKER STATE ---
  const [bmiHeight, setBmiHeight] = useState<number | ''>('');
  const [bmiWeight, setBmiWeight] = useState<number | ''>('');
  const [liveBmi, setLiveBmi] = useState<number | null>(null);
  const [liveCategory, setLiveCategory] = useState<string>('');

  // --- WATER TRACKER STATE ---
  const [waterGoal, setWaterGoal] = useState<number>(2000); // default ml
  const [waterAmountInput, setWaterAmountInput] = useState<number | ''>('');
  const [todayWaterAmount, setTodayWaterAmount] = useState<number>(0);
  const [historyTab, setHistoryTab] = useState<'all' | 'today' | 'yesterday' | 'previous_7_days'>('all');
  const [submittingWater, setSubmittingWater] = useState(false);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [deletingLog, setDeletingLog] = useState<boolean>(false);

  // Helper date functions for local calendar date grouping
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const getLocalDateStr = (d: Date) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const formatDisplayDateLabel = (dateStr: string) => {
    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }
    return dateStr;
  };

  const formatLogTime = (createdAt: any) => {
    if (!createdAt) return 'Just now';
    if (createdAt instanceof Timestamp) {
      return createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (typeof createdAt?.toDate === 'function') {
      return createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
    return 'Recent';
  };

  // --- BLOOD SUGAR STATE ---
  const [glucose, setGlucose] = useState<number | ''>('');
  const [sugarType, setSugarType] = useState<string>('Fasting');
  const [sugarDateTime, setSugarDateTime] = useState<string>('');

  // --- BLOOD PRESSURE STATE ---
  const [systolic, setSystolic] = useState<number | ''>('');
  const [diastolic, setDiastolic] = useState<number | ''>('');
  const [pulse, setPulse] = useState<number | ''>('');
  const [bpDateTime, setBpDateTime] = useState<string>('');

  // Set default dates and times
  useEffect(() => {
    const now = new Date();
    const localISOString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setSugarDateTime(localISOString);
    setBpDateTime(localISOString);
  }, []);

  // Pre-populate Height & Weight from user profile as dynamic defaults
  useEffect(() => {
    if (userData) {
      if (userData.height && bmiHeight === '') setBmiHeight(Number(userData.height));
      if (userData.weight && bmiWeight === '') setBmiWeight(Number(userData.weight));
    }
  }, [userData]);

  // Live BMI Calculator Auto Effect
  useEffect(() => {
    if (bmiHeight && bmiWeight) {
      const hMeters = Number(bmiHeight) / 100;
      const bmiVal = Number(bmiWeight) / (hMeters * hMeters);
      setLiveBmi(Number(bmiVal.toFixed(1)));

      if (bmiVal < 18.5) {
        setLiveCategory('Underweight');
      } else if (bmiVal >= 18.5 && bmiVal < 25) {
        setLiveCategory('Normal Weight');
      } else if (bmiVal >= 25 && bmiVal < 30) {
        setLiveCategory('Overweight');
      } else {
        setLiveCategory('Obese');
      }
    } else {
      setLiveBmi(null);
      setLiveCategory('');
    }
  }, [bmiHeight, bmiWeight]);

  // Load All User Logs once
  const loadLogs = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');
      
      const q = query(
        collection(db, 'health_logs'),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const rawLogs: HealthLogEntry[] = [];
      
      querySnapshot.forEach((docSnap) => {
        rawLogs.push({
          id: docSnap.id,
          ...docSnap.data()
        } as HealthLogEntry);
      });

      // Sort in-memory to bypass requirements for complex Firestore indexes on compound fields
      const sortedLogs = rawLogs.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setLogs(sortedLogs);

      // Determine today's water amount and water goal from logs
      const todayStr = getTodayStr();
      const waterLogs = sortedLogs.filter((l) => l.type === 'water');
      
      const todayWaterLogs = waterLogs.filter((l) => {
        const logDate = l.metrics?.date || (l.createdAt?.toDate ? getLocalDateStr(l.createdAt.toDate()) : todayStr);
        return logDate === todayStr;
      });

      const todayTotal = todayWaterLogs.reduce((sum, l) => sum + (Number(l.metrics?.amount) || 0), 0);
      setTodayWaterAmount(todayTotal);

      // Preferred dailyGoal from latest water log if present
      const latestWaterLogWithGoal = waterLogs.find((l) => l.metrics?.dailyGoal && l.metrics.dailyGoal > 0);
      if (latestWaterLogWithGoal?.metrics?.dailyGoal) {
        setWaterGoal(latestWaterLogWithGoal.metrics.dailyGoal);
      }

    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch health logs.');
      handleFirestoreError(err, OperationType.GET, 'health_logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentUser]);

  // Handle Log Deletion Confirmation Trigger
  const handleDeleteLog = (logId: string) => {
    setDeleteLogId(logId);
  };

  // Perform Firestore Document Deletion and Refresh State
  const confirmDeleteLog = async () => {
    if (!deleteLogId) return;
    const logId = deleteLogId;
    try {
      setDeletingLog(true);
      setError('');
      setSuccess('');
      
      await deleteDoc(doc(db, 'health_logs', logId));
      setSuccess('Record deleted successfully!');
      
      // Update local state and reload logs to recalculate water amounts
      setLogs((prev) => prev.filter((item) => item.id !== logId));
      setDeleteLogId(null);
      await loadLogs();
    } catch (err: any) {
      console.error(err);
      setError('Could not delete selected log entry.');
      handleFirestoreError(err, OperationType.DELETE, `health_logs/${logId}`);
    } finally {
      setDeletingLog(false);
    }
  };

  // 1. SAVE BMI LOG
  const handleSaveBmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !bmiHeight || !bmiWeight || !liveBmi) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      // Create log document
      const logPayload = {
        userId: currentUser.uid,
        type: 'bmi',
        createdAt: serverTimestamp(),
        metrics: {
          height: Number(bmiHeight),
          weight: Number(bmiWeight),
          bmi: liveBmi,
          category: liveCategory
        }
      };

      await addDoc(collection(db, 'health_logs'), logPayload);

      // Also proactively update the user's main profile height & weight!
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        height: Number(bmiHeight),
        weight: Number(bmiWeight),
        updatedAt: serverTimestamp()
      });

      // Refresh global user context data
      await refreshUserData();
      setSuccess(`BMI of ${liveBmi} (${liveCategory}) logged and profile updated!`);
      
      await loadLogs();
    } catch (err: any) {
      console.error(err);
      setError('Failed to record BMI log.');
      handleFirestoreError(err, OperationType.WRITE, 'health_logs');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. SAVE WATER LOG
  const handleAddWater = async (amount: number) => {
    if (!currentUser || amount <= 0 || submittingWater) return;
    const todayStr = getTodayStr();

    try {
      setSubmittingWater(true);
      setError('');
      setSuccess('');
      
      const logPayload = {
        userId: currentUser.uid,
        type: 'water',
        amount: Number(amount),
        dailyGoal: Number(waterGoal),
        date: todayStr,
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
        metrics: {
          amount: Number(amount),
          dailyGoal: Number(waterGoal),
          date: todayStr
        }
      };

      await addDoc(collection(db, 'health_logs'), logPayload);

      setSuccess(`Successfully added ${amount}ml of water!`);
      await loadLogs();
    } catch (err: any) {
      console.error(err);
      setError('Failed to record water intake.');
      handleFirestoreError(err, OperationType.WRITE, 'health_logs');
    } finally {
      setSubmittingWater(false);
    }
  };

  const handleCustomWaterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waterAmountInput || isNaN(Number(waterAmountInput))) return;
    handleAddWater(Number(waterAmountInput));
    setWaterAmountInput('');
  };

  const handleUpdateWaterGoal = async (newGoal: number) => {
    if (!currentUser || newGoal < 500) return;
    setWaterGoal(newGoal);
    const todayStr = getTodayStr();

    try {
      const logPayload = {
        userId: currentUser.uid,
        type: 'water',
        createdAt: serverTimestamp(),
        metrics: {
          amount: 0,
          dailyGoal: Number(newGoal),
          date: todayStr
        }
      };

      await addDoc(collection(db, 'health_logs'), logPayload);

      setSuccess(`Water goal updated to ${newGoal}ml!`);
      await loadLogs();
    } catch (err: any) {
      console.error(err);
      setError('Failed to update water goal.');
    }
  };

  // Compute Water History Groups by local date
  interface WaterDayGroup {
    dateStr: string;
    label: string;
    category: 'today' | 'yesterday' | 'previous_7_days' | 'older';
    totalConsumed: number;
    dailyGoal: number;
    percentage: number;
    logs: HealthLogEntry[];
  }

  const computeWaterHistoryGroups = () => {
    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();

    const prev7Dates: string[] = [];
    for (let i = 2; i <= 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      prev7Dates.push(`${d.getFullYear()}-${m}-${day}`);
    }

    const waterLogs = logs.filter((l) => l.type === 'water');

    const groupsByDate: Record<string, HealthLogEntry[]> = {};
    waterLogs.forEach((log) => {
      let dStr = log.metrics?.date;
      if (!dStr) {
        if (log.createdAt?.toDate) {
          dStr = getLocalDateStr(log.createdAt.toDate());
        } else if (log.createdAt?.seconds) {
          dStr = getLocalDateStr(new Date(log.createdAt.seconds * 1000));
        } else {
          dStr = todayStr;
        }
      }
      if (!groupsByDate[dStr]) {
        groupsByDate[dStr] = [];
      }
      groupsByDate[dStr].push(log);
    });

    const buildGroup = (dateStr: string, category: 'today' | 'yesterday' | 'previous_7_days' | 'older'): WaterDayGroup => {
      const dayLogs = groupsByDate[dateStr] || [];
      const totalConsumed = dayLogs.reduce((sum, l) => sum + (Number(l.metrics?.amount) || 0), 0);

      let goalForDay = waterGoal;
      const logWithGoal = dayLogs.find((l) => l.metrics?.dailyGoal && l.metrics.dailyGoal > 0);
      if (logWithGoal?.metrics?.dailyGoal) {
        goalForDay = logWithGoal.metrics.dailyGoal;
      }

      const percentage = goalForDay > 0 ? Math.min(100, Math.round((totalConsumed / goalForDay) * 100)) : 0;
      const intakeLogs = dayLogs.filter((l) => Number(l.metrics?.amount) > 0);

      return {
        dateStr,
        label: formatDisplayDateLabel(dateStr),
        category,
        totalConsumed,
        dailyGoal: goalForDay,
        percentage,
        logs: intakeLogs
      };
    };

    const todayGroup = buildGroup(todayStr, 'today');
    const yesterdayGroup = buildGroup(yesterdayStr, 'yesterday');
    const previous7DaysGroups = prev7Dates.map((dStr) => buildGroup(dStr, 'previous_7_days'));

    const knownDates = new Set([todayStr, yesterdayStr, ...prev7Dates]);
    const olderDates = Object.keys(groupsByDate).filter((dStr) => !knownDates.has(dStr));
    const olderGroups = olderDates.map((dStr) => buildGroup(dStr, 'older'));

    return {
      todayGroup,
      yesterdayGroup,
      previous7DaysGroups,
      olderGroups
    };
  };

  // 3. SAVE BLOOD SUGAR LOG
  const handleSaveBloodSugar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !glucose) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const logPayload = {
        userId: currentUser.uid,
        type: 'blood_sugar',
        createdAt: serverTimestamp(),
        metrics: {
          glucose: Number(glucose),
          sugarType: sugarType,
          dateTime: sugarDateTime
        }
      };

      await addDoc(collection(db, 'health_logs'), logPayload);
      setSuccess(`Glucose log of ${glucose} mg/dL (${sugarType}) saved!`);
      setGlucose('');
      
      await loadLogs();
    } catch (err: any) {
      console.error(err);
      setError('Failed to save glucose log.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. SAVE BLOOD PRESSURE LOG
  const handleSaveBloodPressure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !systolic || !diastolic) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const logPayload = {
        userId: currentUser.uid,
        type: 'blood_pressure',
        createdAt: serverTimestamp(),
        metrics: {
          systolic: Number(systolic),
          diastolic: Number(diastolic),
          pulse: pulse !== '' ? Number(pulse) : undefined,
          dateTime: bpDateTime
        }
      };

      await addDoc(collection(db, 'health_logs'), logPayload);
      setSuccess(`Blood pressure log of ${systolic}/${diastolic} mmHg recorded!`);
      setSystolic('');
      setDiastolic('');
      setPulse('');
      
      await loadLogs();
    } catch (err: any) {
      console.error(err);
      setError('Failed to save blood pressure record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Extract type-specific entries
  const bmiLogs = logs.filter(l => l.type === 'bmi');
  const sugarLogs = logs.filter(l => l.type === 'blood_sugar');
  const pressureLogs = logs.filter(l => l.type === 'blood_pressure');
  const waterLogs = logs.filter(l => l.type === 'water' && (Number(l.metrics?.amount) > 0 || Number(l.amount) > 0));

  // Blood sugar indicators matching standard guidelines (ADA ranges)
  const getSugarStatus = (val: number, type: string) => {
    if (type === 'Fasting') {
      if (val < 70) return { label: 'Low (Hypoglycemia)', color: 'text-amber-600 bg-amber-50 border-amber-100' };
      if (val <= 100) return { label: 'Normal Fasting', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
      if (val <= 125) return { label: 'Prediabetes', color: 'text-orange-600 bg-orange-50 border-orange-100' };
      return { label: 'High (Diabetic)', color: 'text-rose-700 bg-rose-50 border-rose-100' };
    } else { // Post Meal or Random
      if (val < 70) return { label: 'Low (Hypoglycemia)', color: 'text-amber-600 bg-amber-50 border-amber-100' };
      if (val < 140) return { label: 'Normal Post-Meal', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
      if (val < 200) return { label: 'Borderline High', color: 'text-orange-600 bg-orange-50 border-orange-100' };
      return { label: 'High Glucose', color: 'text-rose-700 bg-rose-50 border-rose-100' };
    }
  };

  // Blood pressure categories matching AHA guidelines
  const getBpCategory = (sys: number, dia: number) => {
    if (sys < 120 && dia < 80) {
      return { label: 'Normal BP', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    }
    if (sys >= 120 && sys <= 129 && dia < 80) {
      return { label: 'Elevated BP', color: 'text-amber-600 bg-amber-50 border-amber-100' };
    }
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      return { label: 'Stage 1 Hypertension', color: 'text-orange-600 bg-orange-50 border-orange-100' };
    }
    if (sys >= 140 || dia >= 90) {
      return { label: 'Stage 2 Hypertension', color: 'text-rose-600 bg-rose-50 border-rose-100' };
    }
    return { label: 'Hypertensive Crisis', color: 'text-rose-800 bg-rose-100 border-rose-200 animate-pulse' };
  };

  return (
    <div className="min-h-screen bg-slate-50 md:pl-64 flex flex-col font-sans">
      <Sidebar />
      <div className="p-4 md:p-8 max-w-6xl w-full mx-auto flex-1">
        
        {/* Page Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-600/10 shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Biometric Health Tracker</h1>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">Secure, local health statistics tracking synchronized with your personal community profile.</p>
            </div>
          </div>
        </header>

        {/* Global Notifications Panel */}
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl mb-4 border border-rose-100 flex items-start gap-2 text-sm shadow-sm" id="tracker-error-alert">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-teal-50 text-teal-800 p-4 rounded-xl mb-4 border border-teal-100 flex items-start gap-2 text-sm shadow-sm animate-fade-in" id="tracker-success-alert">
            <CheckCircle className="w-4 h-4 shrink-0 text-teal-500 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Delete Record Confirmation Modal */}
        <AnimatePresence>
          {deleteLogId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Delete Record</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete this record? This will remove it from your history and update your totals.
                </p>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteLogId(null)}
                    disabled={deletingLog}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteLog}
                    disabled={deletingLog}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    {deletingLog ? 'Deleting...' : 'Delete Record'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- DESKTOP VS MOBILE LAYOUT DESIGN DIVISION --- */}
        {/* Navigation Tabs for unified mobile viewing and fast switching */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-150 mb-6 flex overflow-x-auto space-x-1" id="tracker-navigation-tabs">
          {[
            { id: 'bmi', label: 'BMI Tracker', icon: Calculator, color: 'text-teal-600' },
            { id: 'water', label: 'Water Tracker', icon: Droplet, color: 'text-sky-500' },
            { id: 'sugar', label: 'Blood Sugar', icon: Activity, color: 'text-indigo-600' },
            { id: 'pressure', label: 'Blood Pressure', icon: Heart, color: 'text-rose-500' },
            { id: 'medication', label: 'Medicine Reminder', icon: Pill, color: 'text-teal-500' },
            { id: 'vaccination', label: 'Vaccination Tracker', icon: Syringe, color: 'text-indigo-500' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center cursor-pointer ${
                  isSel 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id={`tab-btn-${tab.id}`}
              >
                <Icon className={`w-4 h-4 ${isSel ? 'text-teal-400' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Tabs Switcher */}
        <div className="w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-150" id="tracker-loader">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500 text-sm font-semibold">Synchronizing with smart-health-community secure Firestore...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* BMI TAB VIEW */}
              {activeTab === 'bmi' && (
                <motion.div
                  key="bmi"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  {/* Left Column: Form Card */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg border border-teal-100">
                          <Calculator className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Calculate & Log BMI</h2>
                      </div>
                      
                      <form onSubmit={handleSaveBmi} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="bmi-height-input">
                            Height (cm)
                          </label>
                          <input
                            id="bmi-height-input"
                            type="number"
                            value={bmiHeight}
                            onChange={(e) => setBmiHeight(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder="e.g. 175"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                            required
                            min="50"
                            max="300"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="bmi-weight-input">
                            Weight (kg)
                          </label>
                          <input
                            id="bmi-weight-input"
                            type="number"
                            value={bmiWeight}
                            onChange={(e) => setBmiWeight(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder="e.g. 70"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
                            required
                            min="10"
                            max="500"
                          />
                        </div>

                        {/* Live BMI Calculation Result Panel */}
                        {liveBmi !== null && (
                          <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex flex-col items-center justify-center text-center animate-fade-in" id="live-bmi-panel">
                            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-widest">Calculated BMI</span>
                            <span className="text-4xl font-black text-slate-900 my-1">{liveBmi}</span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                              liveCategory === 'Normal Weight' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : liveCategory === 'Overweight' 
                                ? 'bg-orange-100 text-orange-800' 
                                : liveCategory === 'Obese'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {liveCategory}
                            </span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={submitting || liveBmi === null}
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-md shadow-teal-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          id="btn-save-bmi"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{submitting ? 'Recording...' : 'Log & Update Profile'}</span>
                        </button>
                      </form>
                    </div>

                    <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-500 space-y-1">
                        <p className="font-bold text-slate-700">Health Standard Ranges:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li>Underweight: &lt; 18.5</li>
                          <li>Normal weight: 18.5 – 24.9</li>
                          <li>Overweight: 25.0 – 29.9</li>
                          <li>Obese: 30.0 or higher</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: History List */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-7">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-bold text-slate-900">BMI History</h2>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                        {bmiLogs.length} Records
                      </span>
                    </div>

                    {bmiLogs.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center" id="no-bmi-history">
                        <Calculator className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm font-semibold">No BMI logs on file.</p>
                        <p className="text-xs text-slate-400 mt-1">Submit your first measurements above.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto" id="bmi-history-table-container">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                              <th className="pb-3 font-bold">Date & Time</th>
                              <th className="pb-3 font-bold text-center">Height</th>
                              <th className="pb-3 font-bold text-center">Weight</th>
                              <th className="pb-3 font-bold text-center">BMI</th>
                              <th className="pb-3 font-bold">Category</th>
                              <th className="pb-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {bmiLogs.map((log) => {
                              const date = log.createdAt instanceof Timestamp 
                                ? log.createdAt.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Recent';
                              return (
                                <tr key={log.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 font-medium text-slate-600 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    <span>{date}</span>
                                  </td>
                                  <td className="py-3 text-center font-semibold text-slate-700">{log.metrics.height} cm</td>
                                  <td className="py-3 text-center font-semibold text-slate-700">{log.metrics.weight} kg</td>
                                  <td className="py-3 text-center font-black text-slate-900">{log.metrics.bmi}</td>
                                  <td className="py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                      log.metrics.category === 'Normal Weight' 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                        : log.metrics.category === 'Overweight' 
                                        ? 'bg-orange-50 text-orange-700 border border-orange-100' 
                                        : log.metrics.category === 'Obese'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                      {log.metrics.category}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => handleDeleteLog(log.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* WATER TAB VIEW */}
              {activeTab === 'water' && (
                <motion.div
                  key="water"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  {/* Left Column: Intake Actions & Goal */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-5 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-sky-50 text-sky-500 rounded-lg border border-sky-100">
                          <Droplet className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Hydration Logger</h2>
                      </div>

                      {/* Animated Water Cup Fill Visualizer */}
                      <div className="bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100 p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden" id="water-fill-visualizer">
                        {/* Wavy active water animation */}
                        <div className="absolute bottom-0 left-0 right-0 bg-sky-400/10 transition-all duration-700 ease-out" style={{ height: `${Math.min((todayWaterAmount / waterGoal) * 100, 100)}%` }} />

                        <div className="relative z-10 flex flex-col items-center">
                          <Droplet className="w-12 h-12 text-sky-500 mb-2 animate-bounce" />
                          <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Today's Intake</span>
                          <span className="text-4xl font-black text-slate-900 mt-1">{todayWaterAmount} <span className="text-lg font-bold text-slate-500">/ {waterGoal}ml</span></span>
                          
                          {/* Percentage Progress indicator */}
                          <p className="text-xs font-bold text-slate-500 mt-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-100 shadow-sm">
                            {Math.round((todayWaterAmount / waterGoal) * 100)}% of daily goal
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                        <div 
                          className="bg-sky-500 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${Math.min((todayWaterAmount / waterGoal) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Fast logging presets */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Intake presets</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: 250, label: '+250 ml', desc: 'Small glass' },
                          { val: 500, label: '+500 ml', desc: 'Bottle' },
                          { val: 750, label: '+750 ml', desc: 'Large Flask' }
                        ].map((p) => (
                          <button
                            key={p.val}
                            onClick={() => handleAddWater(p.val)}
                            className="bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 rounded-xl p-3 font-bold transition flex flex-col items-center justify-center cursor-pointer shadow-sm shadow-sky-100/50 hover:scale-[1.02]"
                            id={`btn-water-preset-${p.val}`}
                          >
                            <span className="text-sm">{p.label}</span>
                            <span className="text-[9px] text-sky-400 font-semibold">{p.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Water Input Form */}
                    <form onSubmit={handleCustomWaterSubmit} className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Custom amount (e.g. 350)"
                        value={waterAmountInput}
                        onChange={(e) => setWaterAmountInput(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-medium"
                        required
                        min="1"
                        max="5000"
                      />
                      <button
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 rounded-xl transition flex items-center gap-1 shrink-0 cursor-pointer shadow-md shadow-sky-500/10 text-sm"
                        id="btn-custom-water"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </form>

                    {/* Manage Goal Slider/Preset */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configure Goal</label>
                        <span className="text-xs font-black text-slate-700">{waterGoal} ml</span>
                      </div>
                      <input
                        type="range"
                        min="1000"
                        max="5000"
                        step="250"
                        value={waterGoal}
                        onChange={(e) => handleUpdateWaterGoal(Number(e.target.value))}
                        className="w-full accent-sky-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer border border-slate-200"
                        id="water-goal-range"
                      />
                    </div>
                  </div>

                  {/* Right Column: Information Banner */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-7 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                        <h2 className="text-lg font-bold text-slate-900">Optimal Hydration Advice</h2>
                      </div>
                      <div className="space-y-4 text-sm text-slate-600">
                        <p>
                          Water intake regulates body temperature, keeps joints lubricated, prevents infections, delivers nutrients to cells, and keeps organs functioning properly.
                        </p>
                        <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl space-y-3">
                          <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                            Did you know?
                          </p>
                          <p className="text-xs leading-relaxed">
                            Feeling thirsty is already an early indicator of mild dehydration. Aiming for an average of 2,000ml to 3,000ml daily ensures peak metabolic activity, cognitive clarity, and physical performance.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                      <span>Standard Goal recommendation: 2000 ml</span>
                      <span>Target reset frequency: Daily</span>
                    </div>
                  </div>

                  {/* Full-width Water Intake History Section */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-12">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-bold text-slate-900">Water Intake History</h2>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                        {waterLogs.length} {waterLogs.length === 1 ? 'Record' : 'Records'}
                      </span>
                    </div>

                    {waterLogs.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center" id="no-water-history">
                        <Droplet className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm font-semibold">No water intake records on file.</p>
                        <p className="text-xs text-slate-400 mt-1">Log your first water intake using the presets above.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto" id="water-history-table-container">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                              <th className="pb-3 font-bold">DATE & TIME</th>
                              <th className="pb-3 font-bold text-center">AMOUNT</th>
                              <th className="pb-3 font-bold text-center">DAILY GOAL</th>
                              <th className="pb-3 font-bold text-center">PROGRESS</th>
                              <th className="pb-3 text-right">ACTION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {waterLogs.map((log) => {
                              let dateTimeLabel = 'Recent';
                              const ts = log.createdAt || log.timestamp;
                              if (ts instanceof Timestamp) {
                                dateTimeLabel = ts.toDate().toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } else if (ts?.toDate) {
                                dateTimeLabel = ts.toDate().toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } else if (log.metrics?.date || log.date) {
                                dateTimeLabel = log.metrics?.date || log.date;
                              }

                              const amountVal = Number(log.metrics?.amount ?? log.amount ?? 0);
                              const goalVal = Number(log.metrics?.dailyGoal ?? log.dailyGoal ?? waterGoal ?? 2000);
                              const progressPct = goalVal > 0 ? Math.min(100, Math.round((amountVal / goalVal) * 100)) : 0;

                              return (
                                <tr key={log.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 font-medium text-slate-600 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    <span>{dateTimeLabel}</span>
                                  </td>
                                  <td className="py-3 text-center font-bold text-sky-600">+{amountVal} ml</td>
                                  <td className="py-3 text-center font-semibold text-slate-700">{goalVal} ml</td>
                                  <td className="py-3 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                      progressPct >= 100 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                        : 'bg-sky-50 text-sky-700 border border-sky-100'
                                    }`}>
                                      {progressPct}%
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => handleDeleteLog(log.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* BLOOD SUGAR TAB VIEW */}
              {activeTab === 'sugar' && (
                <motion.div
                  key="sugar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  {/* Left Column: Log form */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                          <Activity className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Record Glucose level</h2>
                      </div>

                      <form onSubmit={handleSaveBloodSugar} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="sugar-glucose-input">
                            Glucose Value (mg/dL)
                          </label>
                          <input
                            id="sugar-glucose-input"
                            type="number"
                            value={glucose}
                            onChange={(e) => setGlucose(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder="e.g. 95"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                            required
                            min="20"
                            max="600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="sugar-type-select">
                            Type / State
                          </label>
                          <select
                            id="sugar-type-select"
                            value={sugarType}
                            onChange={(e) => setSugarType(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all text-sm font-medium cursor-pointer"
                          >
                            <option value="Fasting">Fasting</option>
                            <option value="Before Meal">Before Meal</option>
                            <option value="Post Meal">Post Meal (2 hours after)</option>
                            <option value="Random">Random / Bedtime</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="sugar-datetime-input">
                            Date and Time
                          </label>
                          <input
                            id="sugar-datetime-input"
                            type="datetime-local"
                            value={sugarDateTime}
                            onChange={(e) => setSugarDateTime(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium cursor-pointer"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || !glucose}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                          id="btn-save-sugar"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{submitting ? 'Recording...' : 'Save Glucose Record'}</span>
                        </button>
                      </form>
                    </div>

                    <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-500 space-y-1">
                        <p className="font-bold text-slate-700">Clinical Guidelines (ADA):</p>
                        <p className="font-semibold text-indigo-900">Fasting target:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li>Normal: 70–100 mg/dL</li>
                          <li>Prediabetes: 101–125 mg/dL</li>
                          <li>Diabetic: 126+ mg/dL</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: History table */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-7">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-bold text-slate-900">Glucose History</h2>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                        {sugarLogs.length} Records
                      </span>
                    </div>

                    {sugarLogs.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center" id="no-sugar-history">
                        <Activity className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm font-semibold">No blood sugar logs on file.</p>
                        <p className="text-xs text-slate-400 mt-1">Submit your first measurements above.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto" id="sugar-history-table-container">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                              <th className="pb-3 font-bold">Logged Date</th>
                              <th className="pb-3 font-bold text-center">Value</th>
                              <th className="pb-3 font-bold text-center">Condition</th>
                              <th className="pb-3 font-bold">Status</th>
                              <th className="pb-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sugarLogs.map((log) => {
                              const loggedDate = log.metrics.dateTime 
                                ? new Date(log.metrics.dateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Recent';
                              const status = getSugarStatus(log.metrics.glucose || 0, log.metrics.sugarType || 'Fasting');
                              return (
                                <tr key={log.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 font-medium text-slate-600 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    <span>{loggedDate}</span>
                                  </td>
                                  <td className="py-3 text-center font-black text-slate-900 text-sm">{log.metrics.glucose} <span className="text-[9px] font-medium text-slate-400">mg/dL</span></td>
                                  <td className="py-3 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">{log.metrics.sugarType}</td>
                                  <td className="py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${status.color}`}>
                                      {status.label}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => handleDeleteLog(log.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* BLOOD PRESSURE TAB VIEW */}
              {activeTab === 'pressure' && (
                <motion.div
                  key="pressure"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  {/* Left Column: Log form */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-rose-50 text-rose-500 rounded-lg border border-rose-100">
                          <Heart className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Record Blood Pressure</h2>
                      </div>

                      <form onSubmit={handleSaveBloodPressure} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="bp-systolic-input">
                              Systolic (mmHg)
                            </label>
                            <input
                              id="bp-systolic-input"
                              type="number"
                              value={systolic}
                              onChange={(e) => setSystolic(e.target.value !== '' ? Number(e.target.value) : '')}
                              placeholder="e.g. 120"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm font-medium"
                              required
                              min="40"
                              max="300"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="bp-diastolic-input">
                              Diastolic (mmHg)
                            </label>
                            <input
                              id="bp-diastolic-input"
                              type="number"
                              value={diastolic}
                              onChange={(e) => setDiastolic(e.target.value !== '' ? Number(e.target.value) : '')}
                              placeholder="e.g. 80"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm font-medium"
                              required
                              min="30"
                              max="200"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="bp-pulse-input">
                            Pulse / Heart Rate (bpm) - <span className="text-slate-400 font-normal">Optional</span>
                          </label>
                          <input
                            id="bp-pulse-input"
                            type="number"
                            value={pulse}
                            onChange={(e) => setPulse(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder="e.g. 72"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm font-medium"
                            min="20"
                            max="250"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="bp-datetime-input">
                            Date and Time
                          </label>
                          <input
                            id="bp-datetime-input"
                            type="datetime-local"
                            value={bpDateTime}
                            onChange={(e) => setBpDateTime(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm font-medium cursor-pointer"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || !systolic || !diastolic}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-md shadow-rose-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                          id="btn-save-bp"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{submitting ? 'Recording...' : 'Record Blood Pressure'}</span>
                        </button>
                      </form>
                    </div>

                    <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-500 space-y-1">
                        <p className="font-bold text-slate-700">Clinical Guidelines (AHA):</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li>Normal: &lt; 120 / &lt; 80 mmHg</li>
                          <li>Elevated: 120-129 / &lt; 80 mmHg</li>
                          <li>Hypertension Stage 1: 130-139 / or 80-89 mmHg</li>
                          <li>Hypertension Stage 2: 140+ / or 90+ mmHg</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: History table */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm lg:col-span-7">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-bold text-slate-900">Blood Pressure History</h2>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                        {pressureLogs.length} Records
                      </span>
                    </div>

                    {pressureLogs.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center" id="no-bp-history">
                        <Heart className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm font-semibold">No blood pressure logs on file.</p>
                        <p className="text-xs text-slate-400 mt-1">Submit your first measurements above.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto" id="bp-history-table-container">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                              <th className="pb-3 font-bold">Logged Date</th>
                              <th className="pb-3 font-bold text-center">Pressure</th>
                              <th className="pb-3 font-bold text-center">Pulse</th>
                              <th className="pb-3 font-bold">Status</th>
                              <th className="pb-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {pressureLogs.map((log) => {
                              const loggedDate = log.metrics.dateTime 
                                ? new Date(log.metrics.dateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Recent';
                              const status = getBpCategory(log.metrics.systolic || 0, log.metrics.diastolic || 0);
                              return (
                                <tr key={log.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 font-medium text-slate-600 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    <span>{loggedDate}</span>
                                  </td>
                                  <td className="py-3 text-center font-black text-slate-900 text-sm">{log.metrics.systolic}/{log.metrics.diastolic} <span className="text-[9px] font-medium text-slate-400">mmHg</span></td>
                                  <td className="py-3 text-center font-bold text-slate-600">
                                    {log.metrics.pulse ? `${log.metrics.pulse} bpm` : '—'}
                                  </td>
                                  <td className="py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${status.color}`}>
                                      {status.label}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => handleDeleteLog(log.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* MEDICATION REMINDERS TAB VIEW */}
              {activeTab === 'medication' && (
                <motion.div
                  key="medication"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full"
                >
                  <MedicineReminder />
                </motion.div>
              )}

              {/* VACCINATION TRACKER TAB VIEW */}
              {activeTab === 'vaccination' && (
                <motion.div
                  key="vaccination"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full"
                >
                  <VaccinationTracker />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
