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
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Eye, 
  ExternalLink, 
  Hospital, 
  User, 
  Calendar, 
  Tag, 
  Sparkles, 
  X, 
  CheckCircle, 
  ShieldAlert, 
  FlaskConical, 
  Pill, 
  ClipboardCheck, 
  Scan, 
  Folder,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Bot,
  Activity,
  HeartPulse,
  Info,
  Stethoscope
} from 'lucide-react';
import { 
  analyzePrescriptionWithGemini, 
  analyzeLabReportWithGemini, 
  analyzeImagingReportWithGemini,
  PrescriptionAnalysisResult, 
  LabReportAnalysisResult,
  ImagingReportAnalysisResult
} from '../services/gemini';

export interface MedicalReport {
  id: string;
  userId: string;
  title: string;
  category: 'Lab Report' | 'Prescription' | 'Imaging Report' | 'Other';
  hospital: string;
  doctor: string;
  reportDate: string;
  notes: string;
  externalLink: string;
  createdAt: any;
}

const CATEGORIES = [
  'Lab Report',
  'Prescription',
  'Imaging Report',
  'Other'
] as const;

export default function MedicalRecords() {
  const { currentUser } = useAuth();

  // State Management
  const [records, setRecords] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalReport | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<MedicalReport | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // AI Analysis State
  const [analyzingRecord, setAnalyzingRecord] = useState<MedicalReport | null>(null);
  const [analysisType, setAnalysisType] = useState<'prescription' | 'labReport' | 'imagingReport'>('prescription');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PrescriptionAnalysisResult | null>(null);
  const [labAnalysisResult, setLabAnalysisResult] = useState<LabReportAnalysisResult | null>(null);
  const [imagingAnalysisResult, setImagingAnalysisResult] = useState<ImagingReportAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  const handleAnalyzePrescription = async (record: MedicalReport) => {
    setAnalyzingRecord(record);
    setAnalysisType('prescription');
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setLabAnalysisResult(null);
    setImagingAnalysisResult(null);
    setAnalysisError('');
    setIsAnalysisModalOpen(true);

    try {
      const result = await analyzePrescriptionWithGemini({
        title: record.title,
        doctor: record.doctor,
        hospital: record.hospital,
        reportDate: record.reportDate,
        notes: record.notes,
        externalLink: record.externalLink,
      });
      setAnalysisResult(result);
    } catch (err: any) {
      console.error('Prescription analysis error:', err);
      setAnalysisError(err.message || 'Unable to connect to AI analysis service.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeLabReport = async (record: MedicalReport) => {
    setAnalyzingRecord(record);
    setAnalysisType('labReport');
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setLabAnalysisResult(null);
    setImagingAnalysisResult(null);
    setAnalysisError('');
    setIsAnalysisModalOpen(true);

    try {
      const result = await analyzeLabReportWithGemini({
        title: record.title,
        doctor: record.doctor,
        hospital: record.hospital,
        reportDate: record.reportDate,
        notes: record.notes,
        externalLink: record.externalLink,
      });
      setLabAnalysisResult(result);
    } catch (err: any) {
      console.error('Lab report analysis error:', err);
      setAnalysisError(err.message || 'Unable to analyze this lab report. Please upload a clearer report.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeImagingReport = async (record: MedicalReport) => {
    setAnalyzingRecord(record);
    setAnalysisType('imagingReport');
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setLabAnalysisResult(null);
    setImagingAnalysisResult(null);
    setAnalysisError('');
    setIsAnalysisModalOpen(true);

    try {
      const result = await analyzeImagingReportWithGemini({
        title: record.title,
        doctor: record.doctor,
        hospital: record.hospital,
        reportDate: record.reportDate,
        notes: record.notes,
        externalLink: record.externalLink,
      });
      setImagingAnalysisResult(result);
    } catch (err: any) {
      console.error('Imaging report analysis error:', err);
      setAnalysisError(err.message || 'Unable to analyze this imaging report. Please upload a clearer report.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MedicalReport['category']>('Lab Report');
  const [hospital, setHospital] = useState('');
  const [doctor, setDoctor] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [externalLink, setExternalLink] = useState('');

  // Fetch Medical Records
  const loadMedicalRecords = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const q = query(
        collection(db, 'medical_reports'),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const fetched: MedicalReport[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          userId: data.userId || '',
          title: data.title || '',
          category: data.category || 'Other',
          hospital: data.hospital || '',
          doctor: data.doctor || '',
          reportDate: data.reportDate || '',
          notes: data.notes || '',
          externalLink: data.externalLink || '',
          createdAt: data.createdAt
        });
      });
      setRecords(fetched);
    } catch (err) {
      console.error('Error loading medical records:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'medical_reports');
      } catch (fErr: any) {
        setError('Failed to load medical records from database.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicalRecords();
  }, [currentUser]);

  // Open Form for Create
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setTitle('');
    setCategory('Lab Report');
    setHospital('');
    setDoctor('');
    setReportDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setExternalLink('');
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditModal = (rec: MedicalReport) => {
    setEditingRecord(rec);
    setTitle(rec.title);
    setCategory(rec.category);
    setHospital(rec.hospital);
    setDoctor(rec.doctor);
    setReportDate(rec.reportDate || new Date().toISOString().split('T')[0]);
    setNotes(rec.notes);
    setExternalLink(rec.externalLink);
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  // Close Form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  // Helper to validate link
  const isValidShareUrl = (urlStr: string): boolean => {
    if (!urlStr.trim()) return true;
    try {
      const parsed = new URL(urlStr.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Save (Create / Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!title.trim()) {
      setError('Report Name is required.');
      return;
    }
    if (!reportDate) {
      setError('Report Date is required.');
      return;
    }
    if (externalLink.trim() && !isValidShareUrl(externalLink)) {
      setError('Invalid Google Drive Share Link. Please enter a valid link starting with http:// or https://');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        userId: currentUser.uid,
        title: title.trim(),
        category,
        hospital: hospital.trim(),
        doctor: doctor.trim(),
        reportDate,
        notes: notes.trim(),
        externalLink: externalLink.trim(),
      };

      if (editingRecord) {
        // Update existing document
        const recRef = doc(db, 'medical_reports', editingRecord.id);
        await updateDoc(recRef, payload);
        setSuccess('Medical record updated successfully!');
      } else {
        // Create new document
        await addDoc(collection(db, 'medical_reports'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setSuccess('New medical record added successfully!');
      }

      handleCloseForm();
      await loadMedicalRecords();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Error saving medical record:', err);
      try {
        handleFirestoreError(err, editingRecord ? OperationType.UPDATE : OperationType.CREATE, 'medical_reports');
      } catch (fErr: any) {
        setError(`Failed to save record: ${fErr.message || fErr}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (id: string) => {
    if (!currentUser) return;
    setError('');
    setSuccess('');
    try {
      await deleteDoc(doc(db, 'medical_reports', id));
      setSuccess('Medical record removed successfully.');
      if (selectedDetails?.id === id) {
        setSelectedDetails(null);
      }
      setDeletingId(null);
      await loadMedicalRecords();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Error deleting medical record:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, 'medical_reports');
      } catch (fErr: any) {
        setError('Failed to delete medical record.');
      }
    }
  };

  // Category Icon Resolver
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Lab Report':
        return <FlaskConical className="w-4 h-4 text-emerald-500" />;
      case 'Prescription':
        return <Pill className="w-4 h-4 text-sky-500" />;
      case 'Imaging Report':
        return <Scan className="w-4 h-4 text-amber-500" />;
      default:
        return <Folder className="w-4 h-4 text-slate-500" />;
    }
  };

  // Category Badge Colors
  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Lab Report':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Prescription':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Imaging Report':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Filter & Search Logic
  const filteredRecords = records
    .filter((rec) => {
      const matchesCategory = selectedCategory === 'All' || rec.category === selectedCategory;
      const queryLower = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !queryLower ||
        rec.title.toLowerCase().includes(queryLower) ||
        rec.hospital.toLowerCase().includes(queryLower) ||
        rec.doctor.toLowerCase().includes(queryLower) ||
        rec.notes.toLowerCase().includes(queryLower);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  return (
    <div className="min-h-screen bg-slate-50 md:pl-64 flex flex-col font-sans">
      <Sidebar />

      <div className="p-4 md:p-8 max-w-6xl w-full mx-auto flex-1 relative space-y-6">
        {/* Hub Header */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-600/10 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Medical Records
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Personal Archive
                </span>
              </h1>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                Store, organize, and view your lab reports, prescriptions, and health documents securely.
              </p>
            </div>
          </div>

          <button
            id="add-medical-record-btn"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medical Record</span>
          </button>
        </header>

        {/* Notifications / Alerts */}
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 flex items-center gap-2 text-sm shadow-sm animate-fade-in" id="medical-records-error-banner">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex items-center gap-2 text-sm shadow-sm animate-fade-in" id="medical-records-success-banner">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        {/* AI Readiness Feature Banner */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                AI Prescription Reader & Health Assistant Ready
                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200 uppercase tracking-wider">
                  Next-Gen AI
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your uploaded records are structured with standard schemas compatible with automated AI document extraction and diagnostic summarization.
              </p>
            </div>
          </div>
        </div>

        {/* Search, Filter & Sort Bar */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-150 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-records-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by report name, hospital, or doctor..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === 'All'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({records.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = records.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  <span>{cat}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="sort-records-select"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 transition cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="title">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Records Display Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent mb-3" />
            <p className="text-slate-500 text-sm font-medium">Loading your medical records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white border border-slate-150 rounded-xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No Medical Records Found</h3>
              <p className="text-slate-500 text-sm mt-1">
                {searchQuery || selectedCategory !== 'All'
                  ? 'No records match your current search criteria or category filter.'
                  : 'You have not added any medical reports or prescriptions yet.'}
              </p>
            </div>
            {(searchQuery || selectedCategory !== 'All') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={handleOpenCreateModal}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
              >
                Add Your First Record
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRecords.map((rec) => (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-150 hover:border-slate-300 rounded-xl p-5 flex flex-col justify-between transition group shadow-sm hover:shadow-md space-y-3"
                id={`medical-record-card-${rec.id}`}
              >
                <div className="space-y-3">
                  {/* Header line: Category badge & Actions */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getCategoryBadgeClass(rec.category)}`}>
                      {getCategoryIcon(rec.category)}
                      <span>{rec.category}</span>
                    </span>

                    <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setSelectedDetails(rec)}
                        title="View Details"
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-teal-600 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(rec)}
                        title="Edit Record"
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-sky-600 rounded-lg transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(rec.id)}
                        title="Delete Record"
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-teal-600 transition line-clamp-1">
                      {rec.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Date: {rec.reportDate}</span>
                    </div>
                  </div>

                  {/* Metadata details */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    {rec.hospital && (
                      <div className="flex items-center gap-2 truncate">
                        <Hospital className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{rec.hospital}</span>
                      </div>
                    )}
                    {rec.doctor && (
                      <div className="flex items-center gap-2 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Dr. {rec.doctor}</span>
                      </div>
                    )}
                    {rec.notes && (
                      <p className="text-slate-500 text-xs italic line-clamp-2 mt-1">
                        "{rec.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action Links */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col space-y-2.5">
                  {rec.category === 'Prescription' && (
                    <button
                      onClick={() => handleAnalyzePrescription(rec)}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Analyze Prescription</span>
                    </button>
                  )}

                  {rec.category === 'Lab Report' && (
                    <button
                      onClick={() => handleAnalyzeLabReport(rec)}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                      <span>Analyze Lab Report</span>
                    </button>
                  )}

                  {rec.category === 'Imaging Report' && (
                    <button
                      onClick={() => handleAnalyzeImagingReport(rec)}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      <Scan className="w-3.5 h-3.5 text-sky-600" />
                      <span>Analyze Imaging Report</span>
                    </button>
                  )}

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    {rec.externalLink ? (
                      <a
                        href={rec.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-teal-600 hover:text-teal-700 font-bold transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Document</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center space-x-1.5 text-slate-400 font-medium opacity-60 cursor-not-allowed"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>No document link available.</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedDetails(rec)}
                      className="text-slate-500 hover:text-slate-900 font-semibold transition cursor-pointer"
                    >
                      Details &rarr;
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-150 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {editingRecord ? 'Edit Medical Record' : 'Add New Medical Record'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Enter full details for secure archival in your health portfolio.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Report Name / Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Complete Blood Count (CBC) or Lipitor Prescription"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  />
                </div>

                {/* Category & Report Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e: any) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Report Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition cursor-pointer"
                    />
                  </div>
                </div>

                {/* Hospital & Doctor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Hospital / Clinic Name
                    </label>
                    <input
                      type="text"
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      placeholder="e.g. City General Hospital"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Doctor / Specialist Name
                    </label>
                    <input
                      type="text"
                      value={doctor}
                      onChange={(e) => setDoctor(e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                {/* How to add instructions & Google Drive Share Link */}
                <div className="space-y-3 pt-1">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-teal-700">How to add a medical report:</p>
                    <ol className="list-decimal list-inside text-slate-600 space-y-0.5 text-[11px] leading-relaxed">
                      <li>Upload your PDF or image to Google Drive.</li>
                      <li>Set sharing to "Anyone with the link can view".</li>
                      <li>Copy the share link.</li>
                      <li>Paste the link here.</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Google Drive Share Link
                    </label>
                    <input
                      type="url"
                      value={externalLink}
                      onChange={(e) => setExternalLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Clinical Notes & Summary
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Key observations, prescribed dosage instructions, follow-up recommendations..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                  >
                    {isSubmitting ? 'Saving Record...' : editingRecord ? 'Update Record' : 'Save Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Details Modal */}
      <AnimatePresence>
        {selectedDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-150 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
                    {getCategoryIcon(selectedDetails.category)}
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${getCategoryBadgeClass(selectedDetails.category)}`}>
                      {selectedDetails.category}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{selectedDetails.title}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDetails(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Report Date</span>
                    <span className="font-semibold text-teal-700">{selectedDetails.reportDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                    <span className="font-semibold text-slate-800">{selectedDetails.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hospital / Clinic</span>
                    <span className="font-semibold text-slate-800">{selectedDetails.hospital || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Doctor</span>
                    <span className="font-semibold text-slate-800">{selectedDetails.doctor ? `Dr. ${selectedDetails.doctor}` : 'N/A'}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created Date</span>
                    <span className="font-medium text-slate-500">
                      {selectedDetails.createdAt 
                        ? (typeof selectedDetails.createdAt === 'string'
                            ? selectedDetails.createdAt.split('T')[0]
                            : new Date(selectedDetails.createdAt).toLocaleDateString())
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {selectedDetails.notes && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Clinical Notes & Observations</h4>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words overflow-hidden max-w-full">
                      {selectedDetails.notes}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Google Drive Share Link</h4>
                  {selectedDetails.externalLink ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-teal-600 break-all overflow-hidden max-w-full">
                      <a 
                        href={selectedDetails.externalLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline text-teal-600 font-medium break-all"
                      >
                        {selectedDetails.externalLink}
                      </a>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 italic">
                      No document link available.
                    </div>
                  )}
                </div>

                <div className="pt-1 space-y-2">
                  {selectedDetails.category === 'Prescription' && (
                    <button
                      onClick={() => {
                        const rec = selectedDetails;
                        setSelectedDetails(null);
                        handleAnalyzePrescription(rec);
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Prescription</span>
                    </button>
                  )}

                  {selectedDetails.category === 'Lab Report' && (
                    <button
                      onClick={() => {
                        const rec = selectedDetails;
                        setSelectedDetails(null);
                        handleAnalyzeLabReport(rec);
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                    >
                      <FlaskConical className="w-4 h-4" />
                      <span>Analyze Lab Report</span>
                    </button>
                  )}

                  {selectedDetails.category === 'Imaging Report' && (
                    <button
                      onClick={() => {
                        const rec = selectedDetails;
                        setSelectedDetails(null);
                        handleAnalyzeImagingReport(rec);
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                    >
                      <Scan className="w-4 h-4" />
                      <span>Analyze Imaging Report</span>
                    </button>
                  )}

                  {selectedDetails.externalLink ? (
                    <a
                      href={selectedDetails.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Document</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>No document link available.</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100">
                <button
                  onClick={() => {
                    setDeletingId(selectedDetails.id);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs font-bold cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Record</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const rec = selectedDetails;
                      setSelectedDetails(null);
                      handleOpenEditModal(rec);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Edit Record
                  </button>
                  <button
                    onClick={() => setSelectedDetails(null)}
                    className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs rounded-xl transition cursor-pointer border border-teal-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-150 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Medical Record?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This action cannot be undone. This record will be permanently deleted from your profile.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteRecord(deletingId)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Analysis Modal (Prescription & Lab Report) */}
      <AnimatePresence>
        {isAnalysisModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-150 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6 text-slate-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl border ${
                    analysisType === 'labReport' 
                      ? 'bg-teal-50 text-teal-600 border-teal-200' 
                      : analysisType === 'imagingReport'
                      ? 'bg-sky-50 text-sky-600 border-sky-200'
                      : 'bg-purple-50 text-purple-600 border-purple-200'
                  }`}>
                    {analysisType === 'labReport' ? (
                      <FlaskConical className="w-5 h-5 text-teal-600" />
                    ) : analysisType === 'imagingReport' ? (
                      <Scan className="w-5 h-5 text-sky-600" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {analysisType === 'labReport' 
                        ? 'AI Lab Report Reader & Health Explanation' 
                        : analysisType === 'imagingReport'
                        ? 'AI Imaging Report Reader'
                        : 'AI Prescription Analysis'}
                    </h2>
                    <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                      {analyzingRecord?.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAnalysisModalOpen(false);
                    setAnalyzingRecord(null);
                    setAnalysisResult(null);
                    setLabAnalysisResult(null);
                    setImagingAnalysisResult(null);
                    setAnalysisError('');
                  }}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Loading State */}
              {isAnalyzing && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full border-4 ${
                      analysisType === 'labReport'
                        ? 'border-teal-500/20 border-t-teal-500'
                        : analysisType === 'imagingReport'
                        ? 'border-sky-500/20 border-t-sky-500'
                        : 'border-purple-500/20 border-t-purple-500'
                    } animate-spin`} />
                    {analysisType === 'labReport' ? (
                      <FlaskConical className="w-6 h-6 text-teal-400 absolute inset-0 m-auto animate-pulse" />
                    ) : analysisType === 'imagingReport' ? (
                      <Scan className="w-6 h-6 text-sky-400 absolute inset-0 m-auto animate-pulse" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-pulse" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">
                      {analysisType === 'labReport'
                        ? 'Analyzing Lab Report with Gemini AI...'
                        : analysisType === 'imagingReport'
                        ? 'Analyzing Imaging Report with Gemini AI...'
                        : 'Analyzing Prescription with Gemini AI...'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {analysisType === 'labReport'
                        ? 'Extracting test names, values, units, reference ranges, and analyzing health indicators from Google Drive link.'
                        : analysisType === 'imagingReport'
                        ? 'Extracting radiology findings, radiologist impression, imaging type, body part, and plain language explanations from Google Drive link.'
                        : 'Extracting medicine details, dosages, frequency, and instructions from Google Drive link and medical context.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {!isAnalyzing && analysisError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-rose-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Unable to analyze this report</span>
                  </div>
                  <p>{analysisError}</p>
                  <p className="text-slate-400 text-[11px] italic">
                    Please ensure your Google Drive link has sharing set to "Anyone with the link can view" and points to a clear document or image.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (analyzingRecord) {
                          if (analysisType === 'labReport') {
                            handleAnalyzeLabReport(analyzingRecord);
                          } else if (analysisType === 'imagingReport') {
                            handleAnalyzeImagingReport(analyzingRecord);
                          } else {
                            handleAnalyzePrescription(analyzingRecord);
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold rounded-lg transition text-xs cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* IMAGING REPORT ANALYSIS RENDERER                          */}
              {/* ========================================================= */}
              {!isAnalyzing && !analysisError && analysisType === 'imagingReport' && imagingAnalysisResult && (
                <div>
                  {!imagingAnalysisResult.canAnalyze ? (
                    <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-xs space-y-3">
                      <div className="flex items-center space-x-2 font-bold text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Unable to analyze this imaging report</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed font-medium">
                        {imagingAnalysisResult.errorMessage || 'Unable to analyze this imaging report. Please upload a clearer report.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Overall Confidence Badge & Verification Warning */}
                      {(() => {
                        const confStr = imagingAnalysisResult.overallConfidence || '90%';
                        const confNum = parseFloat(confStr.replace(/[^0-9.]/g, ''));
                        const isLowConf = isNaN(confNum) || confNum < 80;

                        return (
                          <div className="flex flex-wrap items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs gap-3">
                            <div className="flex flex-wrap items-center gap-2.5 text-slate-300">
                              <div className="flex items-center space-x-2 font-bold text-sky-400">
                                <Scan className="w-4 h-4 text-sky-400 shrink-0" />
                                <span>Imaging Report Analysis</span>
                              </div>
                              <span className={`px-2.5 py-0.5 border text-[11px] font-bold rounded-full ${
                                isLowConf
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              }`}>
                                Confidence: {confStr}
                              </span>
                              {isLowConf && (
                                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold rounded-full flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>⚠ Needs Manual Verification</span>
                                </span>
                              )}
                            </div>
                            {analyzingRecord?.externalLink && (
                              <a
                                href={analyzingRecord.externalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline inline-flex items-center space-x-1 text-[11px] font-medium"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Original Document Link</span>
                              </a>
                            )}
                          </div>
                        );
                      })()}

                      {/* Image-Only Scan Information Card */}
                      {(imagingAnalysisResult.isImageOnly || imagingAnalysisResult.findings === 'No radiologist report detected.') && (
                        <div className="p-4 bg-sky-950/40 border border-sky-500/30 rounded-2xl flex items-start space-x-3 text-sky-200 text-xs">
                          <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-sky-300">No written radiology report was detected.</p>
                            <p className="text-slate-300 leading-relaxed font-medium">
                              Upload the written radiology report or a PDF containing the radiologist's findings for detailed AI explanation.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Summary (3-4 concise bullet points) */}
                      {imagingAnalysisResult.summaryBullets && imagingAnalysisResult.summaryBullets.length > 0 && (
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                              AI Summary
                            </h3>
                          </div>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {imagingAnalysisResult.summaryBullets.slice(0, 4).map((bullet, bIdx) => (
                              <li key={bIdx} className="flex items-start space-x-2">
                                <span className="text-sky-400 font-bold text-sm leading-none mt-0.5">•</span>
                                <span className="leading-relaxed">{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Section 1 & 2: Imaging Type & Body Part */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            1. Imaging Type
                          </span>
                          <span className="font-bold text-sky-300 text-sm block">
                            {imagingAnalysisResult.imagingType || 'Not detected.'}
                          </span>
                        </div>

                        <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            2. Body Part
                          </span>
                          <span className="font-bold text-slate-200 text-sm block">
                            {imagingAnalysisResult.bodyPart || 'Not detected.'}
                          </span>
                        </div>
                      </div>

                      {/* Render Findings, Impression, Plain Language Explanation, and Possible Meaning ONLY if report text was detected */}
                      {!imagingAnalysisResult.isImageOnly && imagingAnalysisResult.findings !== 'No radiologist report detected.' && (
                        <>
                          {/* Section 3: Findings */}
                          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                              <Activity className="w-3.5 h-3.5 text-sky-400" />
                              <span>3. Findings</span>
                            </h4>
                            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {imagingAnalysisResult.findings || 'Not detected.'}
                            </div>
                          </div>

                          {/* Section 4: Impression */}
                          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                              <FileText className="w-3.5 h-3.5 text-sky-400" />
                              <span>4. Impression</span>
                            </h4>
                            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {imagingAnalysisResult.impression || 'Not detected.'}
                            </div>
                          </div>

                          {/* Section 5: Plain Language Explanation */}
                          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                              <Info className="w-3.5 h-3.5 text-sky-400" />
                              <span>5. Plain Language Explanation</span>
                            </h4>
                            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {imagingAnalysisResult.plainLanguageExplanation || 'Not detected.'}
                            </div>
                          </div>

                          {/* Section 6: Possible Meaning */}
                          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                              <HeartPulse className="w-3.5 h-3.5 text-sky-400" />
                              <span>6. Possible Meaning</span>
                            </h4>
                            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {imagingAnalysisResult.possibleMeaning || 'Not detected.'}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Section 7: When should you consult a doctor? */}
                      {imagingAnalysisResult.whenToSeeDoctor && imagingAnalysisResult.whenToSeeDoctor.length > 0 && (
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                          <div className="flex items-center space-x-2">
                            <Stethoscope className="w-4 h-4 text-sky-400 shrink-0" />
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                              7. When should you consult a doctor?
                            </h3>
                          </div>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {imagingAnalysisResult.whenToSeeDoctor.map((item, dIdx) => (
                              <li key={dIdx} className="flex items-start space-x-2">
                                <span className="text-sky-400 font-bold text-sm leading-none mt-0.5">•</span>
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Disclaimer */}
                      <div className="p-4 bg-sky-950/40 border border-sky-500/30 rounded-2xl text-xs space-y-1.5 text-sky-200">
                        <div className="flex items-center space-x-2 font-bold text-sky-300">
                          <Stethoscope className="w-4 h-4 shrink-0 text-sky-400" />
                          <span>Medical Disclaimer</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed font-medium">
                          {imagingAnalysisResult.disclaimer || "This AI analysis is for educational purposes only and is not a medical diagnosis. Please consult a qualified radiologist or physician."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* LAB REPORT ANALYSIS RENDERER                              */}
              {/* ========================================================= */}
              {!isAnalyzing && !analysisError && analysisType === 'labReport' && labAnalysisResult && (
                <div>
                  {!labAnalysisResult.canAnalyze || labAnalysisResult.tests.length === 0 ? (
                    <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-xs space-y-3">
                      <div className="flex items-center space-x-2 font-bold text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Unable to analyze this lab report</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed font-medium">
                        Unable to analyze this lab report. Please upload a clearer report.
                      </p>
                      {labAnalysisResult.errorMessage && (
                        <p className="text-slate-400 italic text-[11px]">
                          Details: {labAnalysisResult.errorMessage}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* 1. Overall Health Status Card */}
                      {(() => {
                        const status = labAnalysisResult.overallHealthStatus || (
                          labAnalysisResult.abnormalExplanations.length === 0
                            ? 'Normal'
                            : labAnalysisResult.abnormalExplanations.length <= 2
                            ? 'Attention Needed'
                            : 'Consult Doctor'
                        );

                        const defaultReason = status === 'Normal'
                          ? 'All detected lab test values are within normal reference ranges.'
                          : status === 'Attention Needed'
                          ? `${labAnalysisResult.abnormalExplanations.length} parameter(s) detected outside normal reference range. Clinical correlation is recommended.`
                          : 'Multiple lab parameters are outside normal reference ranges. Consultation with a doctor is recommended.';

                        const reason = labAnalysisResult.overallHealthReason || defaultReason;

                        const getStatusStyles = () => {
                          switch (status) {
                            case 'Normal':
                              return {
                                bg: 'bg-slate-950/90 border-slate-800',
                                badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                                dot: '🟢',
                                title: 'Normal',
                                text: 'text-emerald-400'
                              };
                            case 'Attention Needed':
                              return {
                                bg: 'bg-slate-950/90 border-slate-800',
                                badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                                dot: '🟡',
                                title: 'Attention Needed',
                                text: 'text-amber-300'
                              };
                            case 'Consult Doctor':
                            default:
                              return {
                                bg: 'bg-slate-950/90 border-slate-800',
                                badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                                dot: '🔴',
                                title: 'Consult Doctor',
                                text: 'text-rose-400'
                              };
                          }
                        };

                        const st = getStatusStyles();

                        return (
                          <div className={`p-4 sm:p-5 rounded-2xl border ${st.bg} space-y-2 transition shadow-sm`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-base">{st.dot}</span>
                                <h3 className={`font-extrabold text-sm sm:text-base ${st.text}`}>
                                  Overall Health Status: {st.title}
                                </h3>
                              </div>
                              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${st.badge}`}>
                                {st.dot} {status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium pl-6">
                              {reason}
                            </p>
                          </div>
                        );
                      })()}

                      {/* 2. Compact AI Summary Section */}
                      {(() => {
                        let bullets: string[] = labAnalysisResult.summaryBullets && labAnalysisResult.summaryBullets.length > 0
                          ? labAnalysisResult.summaryBullets
                          : [];

                        if (bullets.length === 0) {
                          const abnormalCount = labAnalysisResult.abnormalExplanations.length;
                          if (abnormalCount === 0) {
                            bullets = [
                              'All visible lab test parameters are within normal reference ranges.',
                              'No abnormal parameters were detected in this report.',
                              'Routine health checkup recommended.'
                            ];
                          } else {
                            const names = labAnalysisResult.abnormalExplanations.map(e => e.testName).join(', ');
                            bullets = [
                              `${abnormalCount} abnormal parameter(s) detected (${names}).`,
                              ...labAnalysisResult.abnormalExplanations.map(e => `${e.testName} is ${e.status.toLowerCase()} (${e.valueWithUnit}).`),
                              'Clinical evaluation recommended.'
                            ].slice(0, 4);
                          }
                        }

                        return (
                          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                AI Summary
                              </h3>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-300">
                              {bullets.slice(0, 4).map((bullet, bIdx) => (
                                <li key={bIdx} className="flex items-start space-x-2">
                                  <span className="text-teal-400 font-bold text-sm leading-none mt-0.5">•</span>
                                  <span className="leading-relaxed">{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}

                      {/* Context Info Pill */}
                      <div className="flex flex-wrap items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs gap-2">
                        <div className="flex items-center space-x-3 text-slate-300">
                          <div className="flex items-center space-x-1.5 font-semibold text-teal-300">
                            <FlaskConical className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>{labAnalysisResult.tests.length} Test Parameter(s) Extracted</span>
                          </div>
                          {labAnalysisResult.overallDocumentConfidence && (
                            <span className="px-2.5 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[11px] font-bold rounded-full">
                              OCR Confidence: {labAnalysisResult.overallDocumentConfidence}
                            </span>
                          )}
                        </div>
                        {analyzingRecord?.externalLink && (
                          <a
                            href={analyzingRecord.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-400 hover:underline inline-flex items-center space-x-1 text-[11px] font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Original Google Drive Link</span>
                          </a>
                        )}
                      </div>

                      {/* 3. Extracted Lab Test Results Table */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                            <span>Extracted Lab Test Results</span>
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {labAnalysisResult.tests.map((test, idx) => {
                            const confNum = parseFloat((test.confidenceScore || '100%').replace(/[^0-9.]/g, ''));
                            const isLowConfidence = isNaN(confNum) || confNum < 80 || test.status === 'Unknown';

                            const getStatusBadge = (status: string) => {
                              switch (status) {
                                case 'Low':
                                  return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                                case 'High':
                                  return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                                case 'Normal':
                                  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                                default:
                                  return 'bg-slate-800 text-slate-300 border-slate-700';
                              }
                            };

                            return (
                              <div
                                key={idx}
                                className={`p-4 bg-slate-950/90 border ${
                                  isLowConfidence ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                                } rounded-2xl space-y-3 transition shadow-sm`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                                    <h4 className="font-bold text-white text-sm">
                                      {test.testName || 'Not detected.'}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadge(test.status)}`}>
                                      Status: {test.status || 'Unknown'}
                                    </span>

                                    {isLowConfidence && (
                                      <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold rounded-full flex items-center space-x-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                        <span>Needs Manual Verification</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                      Test Result
                                    </span>
                                    <span className="font-bold text-teal-300 text-sm">
                                      {test.result ? `${test.result} ${test.unit !== 'N/A' ? test.unit : ''}`.trim() : 'Not detected.'}
                                    </span>
                                  </div>

                                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                      Reference Range
                                    </span>
                                    <span className="font-semibold text-slate-300">
                                      {test.referenceRange && test.referenceRange !== 'N/A' ? test.referenceRange : 'Not specified'}
                                    </span>
                                  </div>

                                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 col-span-2 sm:col-span-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                      OCR Confidence
                                    </span>
                                    <span className={`font-semibold ${isLowConfidence ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      {test.confidenceScore || '85%'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3.5 Compact Abnormal Parameters Summary */}
                      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Abnormal Parameters</span>
                        </h4>
                        {(() => {
                          const abnormalItems = labAnalysisResult.tests.filter(
                            t => t.status === 'High' || t.status === 'Low'
                          );
                          if (abnormalItems.length === 0) {
                            return (
                              <p className="text-xs text-emerald-400 font-medium">
                                No abnormal parameters detected.
                              </p>
                            );
                          }
                          return (
                            <div className="flex flex-wrap gap-2 pt-0.5">
                              {abnormalItems.map((item, aIdx) => (
                                <span
                                  key={aIdx}
                                  className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                                    item.status === 'High'
                                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  <span>{item.status === 'High' ? '🔴' : '🟡'}</span>
                                  <span>{item.testName} — {item.status}</span>
                                  {item.result && (
                                    <span className="opacity-80 font-normal">({item.result} {item.unit !== 'N/A' ? item.unit : ''})</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* 4 & 5 & 6. Health Explanation Section */}
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-teal-400 shrink-0" />
                          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Health Explanation & Insights
                          </h3>
                        </div>

                        {labAnalysisResult.abnormalExplanations && labAnalysisResult.abnormalExplanations.length > 0 ? (
                          <div className="space-y-3">
                            {labAnalysisResult.abnormalExplanations.map((exp, eIdx) => (
                              <div key={eIdx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                                  <h4 className="font-bold text-teal-300 text-sm flex items-center gap-2">
                                    <Info className="w-4 h-4 text-teal-400" />
                                    <span>{exp.testName}</span>
                                  </h4>
                                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                                    exp.status === 'High' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}>
                                    {exp.valueWithUnit ? `${exp.valueWithUnit} (${exp.status})` : exp.status}
                                  </span>
                                </div>

                                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                                  <div>
                                    <span className="font-bold text-slate-200 block mb-0.5">What it means:</span>
                                    <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                                      {exp.whatItMeans}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="font-bold text-slate-200 block mb-0.5">Possible Causes:</span>
                                    <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                                      {exp.possibleCauses}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="font-bold text-slate-200 block mb-0.5">General Health Advice:</span>
                                    <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                                      {exp.healthAdvice}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>All detected test values are within normal reference ranges. Maintain a healthy lifestyle and routine checkups.</span>
                          </div>
                        )}

                        {/* 7. When should you see a doctor? Section */}
                        {(() => {
                          let docAdviceList: string[] = labAnalysisResult.whenToSeeDoctor && labAnalysisResult.whenToSeeDoctor.length > 0
                            ? labAnalysisResult.whenToSeeDoctor
                            : [];

                          if (docAdviceList.length === 0 && labAnalysisResult.abnormalExplanations.length > 0) {
                            docAdviceList = [
                              'Symptoms are getting worse or new symptoms develop.',
                              'Persistent or repeated abnormal test results.',
                              'Difficulty breathing, severe fatigue, or chest discomfort.',
                              'Doctor recommends additional testing or clinical follow-up.'
                            ];
                          }

                          if (docAdviceList.length === 0) return null;

                          return (
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                              <div className="flex items-center space-x-2">
                                <Stethoscope className="w-4 h-4 text-teal-400 shrink-0" />
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                  When should you see a doctor?
                                </h3>
                              </div>
                              <ul className="space-y-1.5 text-xs text-slate-300">
                                {docAdviceList.map((item, dIdx) => (
                                  <li key={dIdx} className="flex items-start space-x-2">
                                    <span className="text-teal-400 font-bold text-sm leading-none mt-0.5">•</span>
                                    <span className="leading-relaxed">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}

                        {/* 8. Medical Disclaimer Banner */}
                        <div className="p-4 bg-teal-950/40 border border-teal-500/30 rounded-2xl text-xs space-y-1.5 text-teal-200">
                          <div className="flex items-center space-x-2 font-bold text-teal-300">
                            <Stethoscope className="w-4 h-4 shrink-0 text-teal-400" />
                            <span>Medical Doctor Consultation Required</span>
                          </div>
                          <p className="text-slate-300 leading-relaxed font-medium">
                            {labAnalysisResult.doctorReminder || "This AI explanation is for educational reference only. Do not diagnose or self-treat. Always consult a qualified medical doctor or physician for clinical diagnosis and professional health guidance."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* PRESCRIPTION ANALYSIS RENDERER (EXISTING)                  */}
              {/* ========================================================= */}
              {!isAnalyzing && !analysisError && analysisType === 'prescription' && (
                <>
                  {/* Unanalyzable / Unsuccessful State */}
                  {analysisResult && (!analysisResult.canAnalyze || analysisResult.medicines.length === 0) && (
                    <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-xs space-y-3">
                      <div className="flex items-center space-x-2 font-bold text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Unable to analyze</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed font-medium">
                        Unable to analyze this prescription. Please check the Google Drive link or upload a clearer document.
                      </p>
                      {analysisResult.errorMessage && (
                        <p className="text-slate-400 italic text-[11px]">
                          Details: {analysisResult.errorMessage}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Successful Analysis State */}
                  {analysisResult && analysisResult.canAnalyze && analysisResult.medicines.length > 0 && (
                    <div className="space-y-5">
                      {/* Context Info Pill */}
                      <div className="flex flex-wrap items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs gap-2">
                        <div className="flex items-center space-x-3 text-slate-300">
                          <div className="flex items-center space-x-1.5 font-semibold">
                            <Pill className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>{analysisResult.medicines.length} Medicine(s) Extracted</span>
                          </div>
                          {analysisResult.confidenceScore && (
                            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold rounded-full">
                              Confidence: {analysisResult.confidenceScore}
                            </span>
                          )}
                        </div>
                        {analyzingRecord?.externalLink && (
                          <a
                            href={analyzingRecord.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-400 hover:underline inline-flex items-center space-x-1 text-[11px] font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Google Drive Link</span>
                          </a>
                        )}
                      </div>

                      {/* Medicines Cards List */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Extracted Prescription Items
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          {analysisResult.medicines.map((med, idx) => {
                            const getVal = (field: any, defaultVal = '') => {
                              if (!field) return defaultVal;
                              if (typeof field === 'string') return field;
                              return field.value || defaultVal;
                            };

                            const medNameVal = getVal(med.medicineName, 'Unspecified Medicine');
                            const dosageFormRaw = getVal(med.dosageForm, '');
                            const dosageFormVal =
                              dosageFormRaw && dosageFormRaw.trim() !== ''
                                ? dosageFormRaw
                                : 'Dosage form could not be determined.';
                            const frequencyVal = getVal(med.frequency, '');
                            const durationVal = getVal(med.duration, '');
                            const instructionsVal = getVal(med.instructions, '');
                            const warningsVal = getVal(med.warnings, '');

                            // Determine single overall medicine confidence score
                            const getOverallScoreStr = () => {
                              if (med.overallMedicineConfidence) return med.overallMedicineConfidence;
                              if (med.confidenceScore) return med.confidenceScore;
                              if (typeof med.medicineName === 'object' && med.medicineName?.confidenceScore) {
                                return med.medicineName.confidenceScore;
                              }
                              return '85%';
                            };

                            const scoreStr = getOverallScoreStr();
                            const confNum = parseFloat(scoreStr.replace(/[^0-9.]/g, ''));
                            const isLowConfidence =
                              isNaN(confNum) ||
                              confNum < 80 ||
                              dosageFormVal.includes('could not be determined');

                            return (
                              <div
                                key={idx}
                                className={`p-5 bg-slate-950/90 border ${
                                  isLowConfidence ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                                } rounded-2xl space-y-4 transition shadow-sm`}
                              >
                                {/* Card Header: Medicine Name, Dosage Form & Badges */}
                                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2.5">
                                      <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl shrink-0">
                                        <Pill className="w-4 h-4" />
                                      </div>
                                      <h4 className="font-bold text-white text-base">
                                        {medNameVal}
                                      </h4>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium pl-9">
                                      Dosage Form:{' '}
                                      <span
                                        className={
                                          dosageFormVal.includes('could not be determined')
                                            ? 'text-amber-400 font-semibold'
                                            : 'text-purple-300 font-semibold'
                                        }
                                      >
                                        {dosageFormVal}
                                      </span>
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`px-3 py-1 border text-xs font-bold rounded-full shrink-0 ${
                                        isLowConfidence
                                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      }`}
                                    >
                                      Confidence: {scoreStr}
                                    </span>

                                    {isLowConfidence && (
                                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-full shrink-0 flex items-center space-x-1">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 inline mr-1" />
                                        <span>⚠ Needs Manual Verification</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Clean Attributes List: Frequency, Duration, Instructions */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                  {frequencyVal &&
                                    frequencyVal !== 'Not specified' &&
                                    frequencyVal !== 'Could not be determined' && (
                                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                          Frequency
                                        </span>
                                        <span className="font-semibold text-slate-200">{frequencyVal}</span>
                                      </div>
                                    )}

                                  {durationVal &&
                                    durationVal !== 'Not specified' &&
                                    durationVal !== 'Could not be determined' && (
                                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                          Duration
                                        </span>
                                        <span className="font-semibold text-slate-200">{durationVal}</span>
                                      </div>
                                    )}

                                  {instructionsVal &&
                                    instructionsVal !== 'Not specified' &&
                                    instructionsVal !== 'Could not be determined' && (
                                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1 sm:col-span-2 lg:col-span-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                          Instructions
                                        </span>
                                        <span className="font-semibold text-slate-200 break-words">
                                          {instructionsVal}
                                        </span>
                                      </div>
                                    )}
                                </div>

                                {/* Warnings & Precautions - ONLY if extracted */}
                                {warningsVal &&
                                  warningsVal !== 'N/A' &&
                                  warningsVal !== 'None' &&
                                  warningsVal !== 'Not specified' &&
                                  warningsVal !== 'Could not be determined' && (
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1 text-amber-200">
                                      <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Warnings & Precautions</span>
                                      </div>
                                      <p className="font-medium break-words text-amber-100">{warningsVal}</p>
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary Note - Short 3-4 Bullet Points */}
                      {analysisResult.summaryNote && (
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            AI Summary & Clinical Guidance
                          </span>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {(() => {
                              const note = analysisResult.summaryNote || '';
                              let lines = note
                                .split(/(?:\r?\n|•|-|\d+\.)/)
                                .map((s) => s.trim())
                                .filter((s) => s.length > 0);

                              if (lines.length <= 1) {
                                lines = note
                                  .split(/(?<=[.!?])\s+/)
                                  .map((s) => s.trim())
                                  .filter((s) => s.length > 0);
                              }

                              return lines.slice(0, 4).map((bullet, bIdx) => (
                                <li key={bIdx} className="flex items-start space-x-2">
                                  <span className="text-purple-400 font-bold text-sm leading-none mt-0.5">•</span>
                                  <span>{bullet}</span>
                                </li>
                              ));
                            })()}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <p className="text-[11px] text-slate-500 italic">
                  Note: AI-generated summaries are for informational reference only.
                </p>
                <button
                  onClick={() => {
                    setIsAnalysisModalOpen(false);
                    setAnalyzingRecord(null);
                    setAnalysisResult(null);
                    setLabAnalysisResult(null);
                    setImagingAnalysisResult(null);
                    setAnalysisError('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
