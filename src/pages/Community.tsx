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
  Timestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Send, 
  Trash2, 
  Edit3, 
  Droplet, 
  Stethoscope, 
  BookOpen, 
  Bell, 
  Plus, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Info, 
  Sparkles, 
  CheckCircle, 
  ShieldAlert, 
  ChevronRight,
  Filter,
  User,
  HeartPulse,
  Eye,
  Search,
  Bold,
  Italic,
  List,
  Image,
  Smile,
  X,
  Pin,
  Flag,
  Building2,
  Pill,
  PhoneCall,
  Navigation,
  ExternalLink,
  AlertTriangle,
  Activity,
  Compass,
  Video,
  Mic,
  Wifi,
  VideoOff,
  MicOff,
  PhoneOff
} from 'lucide-react';

// Interfaces matching Firestore schemas
interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  likes: string[]; // array of user UIDs
  createdAt: any;
  commentsCount?: number;
  category?: string;
  imageUrl?: string;
  authorRole?: 'user' | 'doctor' | 'admin';
  reactions?: {
    love?: string[];
    surprise?: string[];
    insight?: string[];
    care?: string[];
  };
  pinned?: boolean;
  reportedBy?: string[];
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: any;
}

interface BloodRequest {
  id: string;
  userId: string;
  patientName: string;
  bloodGroup: string;
  unitsRequired: number;
  hospital: string;
  contactNumber: string;
  isEmergency: boolean;
  description: string;
  createdAt: any;
}

export interface DoctorScheduleItem {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
  consultationType: string;
}

interface Doctor {
  id: string;
  userId?: string;
  doctorUserId?: string;
  name: string;
  specialty: string;
  hospital: string;
  experience: string;
  degree?: string;
  email: string;
  description: string;
  consultationFee?: string;
  fee?: number;
  avatarUrl?: string;
  image?: string;
  isOnline?: boolean;
  videoAvailable?: boolean;
  voiceAvailable?: boolean;
  inPersonAvailable?: boolean;
  schedules?: DoctorScheduleItem[];
  availableDays?: string[];
  availableHours?: string;
  workingHours?: {
    [day: string]: string;
  };
  videoWorkingHours?: {
    [day: string]: string;
  };
  voiceWorkingHours?: {
    [day: string]: string;
  };
  schedule?: {
    [day: string]: string[];
  };
}

interface Appointment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  doctorId: string;
  doctorUserId?: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationType?: 'in_person' | 'video' | 'voice';
  reason: string;
  status: 'pending' | 'Pending' | 'approved' | 'Approved' | 'declined' | 'Declined' | 'completed' | 'Completed' | 'rejected' | 'Rejected' | 'cancelled' | 'Cancelled';
  createdAt: any;
  patientId: string;
  patientUid?: string;
  patientName: string;
  specialization: string;
  hospital: string;
  symptoms: string;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  readTime: string;
  createdAt: any;
}

interface UserNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  type: 'like' | 'comment' | 'blood_request' | 'appointment';
  message: string;
  relatedId: string;
  read: boolean;
  createdAt: any;
}

const DAY_ABBR_TO_FULL: { [key: string]: string } = {
  sat: 'Saturday',
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday'
};

function normalizeDayName(day: string): string {
  if (!day) return '';
  const clean = day.trim().toLowerCase().replace('.', '');
  return DAY_ABBR_TO_FULL[clean] || (day.charAt(0).toUpperCase() + day.slice(1).toLowerCase());
}

function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const timePart = clean.replace('AM', '').replace('PM', '').trim();
  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return 0;
  const minutes = minutesStr ? parseInt(minutesStr, 10) || 0 : 0;
  
  if (isPM && hours !== 12) {
    hours += 12;
  }
  if (isAM && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function formatTime(minutesFromMidnight: number): string {
  let hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hourStr = hours < 10 ? `0${hours}` : `${hours}`;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hourStr}:${minStr} ${ampm}`;
}

function isSameTimeSlot(timeA?: string, timeB?: string): boolean {
  if (!timeA || !timeB) return false;
  return timeA.trim().toLowerCase() === timeB.trim().toLowerCase() || parseTime(timeA) === parseTime(timeB);
}

function matchesConsultationType(scheduleType: string, requestedType: 'in_person' | 'video' | 'voice'): boolean {
  if (!scheduleType) return false;
  const raw = scheduleType.trim().toLowerCase();

  if (requestedType === 'in_person') {
    // If schedule contains video, voice, audio, or online, it is strictly NOT in_person
    if (raw.includes('video') || raw.includes('voice') || raw.includes('audio') || raw.includes('telemedicine') || raw.includes('virtual')) {
      return false;
    }
    return (
      raw.includes('in-person') ||
      raw.includes('in_person') ||
      raw.includes('in person') ||
      raw.includes('hospital') ||
      raw.includes('clinic') ||
      raw.includes('physical')
    );
  }

  if (requestedType === 'video') {
    // Video schedule matching
    if (raw.includes('voice') || raw.includes('audio')) {
      return false;
    }
    return (
      raw.includes('video') ||
      raw.includes('telemedicine') ||
      raw.includes('online') ||
      raw.includes('virtual')
    );
  }

  if (requestedType === 'voice') {
    return (
      raw.includes('voice') ||
      raw.includes('audio') ||
      raw.includes('phone')
    );
  }

  return false;
}

function getDoctorSchedulesForTypeAndDay(
  docItem: any,
  consultationType: 'in_person' | 'video' | 'voice',
  dayName: string
): { startTime: string; endTime: string }[] {
  if (!docItem || !dayName) return [];
  const targetDay = normalizeDayName(dayName);

  // SINGLE SOURCE OF TRUTH: If doctor has `schedules` array from DoctorPanel
  if (Array.isArray(docItem.schedules)) {
    const matching: { startTime: string; endTime: string }[] = [];
    for (const sched of docItem.schedules) {
      if (!sched) continue;
      if (!matchesConsultationType(sched.consultationType, consultationType)) continue;

      const days = Array.isArray(sched.days) ? sched.days : [];
      const hasDay = days.some((d: string) => normalizeDayName(d) === targetDay);
      if (hasDay && sched.startTime && sched.endTime) {
        matching.push({
          startTime: sched.startTime,
          endTime: sched.endTime
        });
      }
    }
    return matching;
  }

  // Fallback for legacy doctor records without schedules array
  if (Array.isArray(docItem.availableDays) && docItem.availableHours) {
    const hasDay = docItem.availableDays.some((d: string) => normalizeDayName(d) === targetDay);
    if (hasDay) {
      const parts = docItem.availableHours.split('-');
      if (parts.length === 2) {
        return [{ startTime: parts[0].trim(), endTime: parts[1].trim() }];
      }
    }
  }

  return [];
}

function getDoctorSlotsForDayAndType(
  docItem: any,
  consultationType: 'in_person' | 'video' | 'voice',
  dayName: string
): string[] {
  const matchingSchedules = getDoctorSchedulesForTypeAndDay(docItem, consultationType, dayName);
  if (matchingSchedules.length === 0) return [];

  const allSlotsSet = new Set<string>();
  const slotMinutes: number[] = [];

  for (const sched of matchingSchedules) {
    const startMin = parseTime(sched.startTime);
    const endMin = parseTime(sched.endTime);
    if (startMin >= endMin) continue;

    for (let m = startMin; m < endMin; m += 30) {
      const formatted = formatTime(m);
      if (!allSlotsSet.has(formatted)) {
        allSlotsSet.add(formatted);
        slotMinutes.push(m);
      }
    }
  }

  slotMinutes.sort((a, b) => a - b);
  return slotMinutes.map((m) => formatTime(m));
}

function getDoctorWorkingHours(
  docItem: any,
  consultationType: 'in_person' | 'video' | 'voice'
): { [day: string]: string } {
  const result: { [day: string]: string } = {};
  if (!docItem) return result;

  // Single Source of Truth from Firestore schedules
  if (Array.isArray(docItem.schedules)) {
    const dayRangesMap: { [day: string]: string[] } = {};

    for (const sched of docItem.schedules) {
      if (!sched || !Array.isArray(sched.days)) continue;
      if (!matchesConsultationType(sched.consultationType, consultationType)) continue;

      const timeRange = `${sched.startTime || '09:00 AM'} - ${sched.endTime || '05:00 PM'}`;
      for (const d of sched.days) {
        const fullDay = normalizeDayName(d);
        if (!fullDay) continue;
        if (!dayRangesMap[fullDay]) {
          dayRangesMap[fullDay] = [];
        }
        if (!dayRangesMap[fullDay].includes(timeRange)) {
          dayRangesMap[fullDay].push(timeRange);
        }
      }
    }

    const weekdaysOrder = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const w of weekdaysOrder) {
      if (dayRangesMap[w] && dayRangesMap[w].length > 0) {
        result[w] = dayRangesMap[w].join(', ');
      }
    }
    return result;
  }

  // Fallback for legacy doctors without `schedules` array
  if (Array.isArray(docItem.availableDays) && docItem.availableHours) {
    for (const d of docItem.availableDays) {
      const fullDay = normalizeDayName(d);
      if (fullDay) {
        result[fullDay] = docItem.availableHours;
      }
    }
    return result;
  }

  return {};
}

function getDayNameFromDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dateObj = new Date(y, m - 1, d);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays[dateObj.getDay()];
}

interface CalendarDateOption {
  dateStr: string;
  dayName: string;
  label: string;
  isAvailable: boolean;
}

function getAllUpcomingCalendarDatesForDoctor(
  docItem: any,
  consultationType: 'in_person' | 'video' | 'voice',
  daysCount: number = 14
): CalendarDateOption[] {
  if (!docItem) return [];
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const list: CalendarDateOption[] = [];
  const today = new Date();

  for (let i = 0; i < daysCount; i++) {
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dayName = weekdays[current.getDay()];

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const dateVal = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateVal}`;

    const slots = getDoctorSlotsForDayAndType(docItem, consultationType, dayName);
    const isAvailable = slots.length > 0;

    const relativePrefix = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayName;
    const baseLabel = `${relativePrefix} (${dayName}, ${months[current.getMonth()]} ${current.getDate()})`;
    const label = isAvailable ? baseLabel : `${baseLabel} [LOCKED]`;

    list.push({ dateStr, dayName, label, isAvailable });
  }
  return list;
}

export default function Community() {
  const { currentUser, userData } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'feed' | 'blood' | 'blood_donors' | 'doctors' | 'articles'>('feed');

  // UI Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Community Feed Upgrades States
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('ALL');
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [visiblePostsCount, setVisiblePostsCount] = useState(10);
  const [revealedReportedPosts, setRevealedReportedPosts] = useState<Set<string>>(new Set());
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const [highlightedDonorGroupId, setHighlightedDonorGroupId] = useState<string | null>(null);
  
  // Data State
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [expandedPostComments, setExpandedPostComments] = useState<string | null>(null);
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  // Open/Close Forms and Modals
  const [showCreateBloodRequest, setShowCreateBloodRequest] = useState(false);
  const [showBookAppointment, setShowBookAppointment] = useState<Doctor | null>(null);
  const [showFullArticle, setShowFullArticle] = useState<Article | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Loading States
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingBlood, setLoadingBlood] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Post Inputs
  const [newPostContent, setNewPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState('');
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [newCommentText, setNewCommentText] = useState<{ [postId: string]: string }>({});

  // Blood Request Form Inputs
  const [bloodPatientName, setBloodPatientName] = useState('');
  const [bloodGroupSelect, setBloodGroupSelect] = useState('A+');
  const [bloodUnits, setBloodUnits] = useState<number | ''>('');
  const [bloodHospital, setBloodHospital] = useState('');
  const [bloodContact, setBloodContact] = useState('');
  const [bloodIsEmergency, setBloodIsEmergency] = useState(false);
  const [bloodDesc, setBloodDesc] = useState('');
  const [bloodFilter, setBloodFilter] = useState('ALL');
  const [deleteBloodRequestId, setDeleteBloodRequestId] = useState<string | null>(null);
  const [deletingBloodRequest, setDeletingBloodRequest] = useState(false);
  const [deleteAppointmentId, setDeleteAppointmentId] = useState<string | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState(false);

  // Appointment Booking Inputs
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [apptReason, setApptReason] = useState('');
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [selectedBookingDateStr, setSelectedBookingDateStr] = useState('');
  const [selectedBookingTime, setSelectedBookingTime] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [selectedConsultationType, setSelectedConsultationType] = useState<'in_person' | 'video' | 'voice'>('in_person');

  // Telemedicine Active Call Room State
  const [activeTelemedicineCall, setActiveTelemedicineCall] = useState<Appointment | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Blood Donor States
  const [donors, setDonors] = useState<any[]>([]);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [isEditingDonor, setIsEditingDonor] = useState(false);
  const [isEditingMyProfile, setIsEditingMyProfile] = useState(false);
  
  const getNextAvailableAppointment = (docItem: any, appointmentsList: Appointment[]) => {
    if (!docItem) return 'No schedule configured';

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const consultationTypes: ('in_person' | 'video' | 'voice')[] = ['in_person', 'video', 'voice'];

    let hasAnyConfiguredSchedule = false;

    // Search starting from today (i = 0) up to 14 days
    for (let i = 0; i < 14; i++) {
      const current = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const dayName = weekdays[current.getDay()];
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const dateVal = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateVal}`;

      for (const cType of consultationTypes) {
        const slots = getDoctorSlotsForDayAndType(docItem, cType, dayName);
        if (slots.length > 0) {
          hasAnyConfiguredSchedule = true;
          for (const slot of slots) {
            // Check if booked
            const isBooked = appointmentsList.some((appt) =>
              appt.doctorId === docItem.id &&
              appt.appointmentDate === dateStr &&
              isSameTimeSlot(appt.appointmentTime, slot) &&
              (appt.consultationType || 'in_person') === cType &&
              appt.status !== 'declined' &&
              appt.status !== 'Declined' &&
              appt.status !== 'cancelled' &&
              appt.status !== 'rejected'
            );

            if (!isBooked) {
              const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayName}, ${months[current.getMonth()]} ${current.getDate()}`;
              return `${dayLabel} • ${slot}`;
            }
          }
        }
      }
    }

    if (!hasAnyConfiguredSchedule) {
      return 'No schedule configured';
    }

    return 'Fully booked';
  };
  
  const [editMyPhone, setEditMyPhone] = useState('');
  const [editMyDistrict, setEditMyDistrict] = useState('');
  const [editMyLastDonationDate, setEditMyLastDonationDate] = useState('');
  const [editMyAvailableNow, setEditMyAvailableNow] = useState(true);
  const [editMyEmergencyDonation, setEditMyEmergencyDonation] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  
  const [donorFullName, setDonorFullName] = useState('');
  const [donorBloodGroup, setDonorBloodGroup] = useState('A+');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorDistrict, setDonorDistrict] = useState('');
  const [donorLastDonationDate, setDonorLastDonationDate] = useState('');
  const [donorAvailableNow, setDonorAvailableNow] = useState(true);
  const [donorEmergencyDonation, setDonorEmergencyDonation] = useState(false);

  const [donorBloodFilter, setDonorBloodFilter] = useState('ALL');
  const [donorDistrictFilter, setDonorDistrictFilter] = useState('ALL');
  const [donorOnlyAvailableFilter, setDonorOnlyAvailableFilter] = useState(true);

  // Article Filter
  const [articleCategoryFilter, setArticleCategoryFilter] = useState('ALL');

  // Load User Notifications
  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      setLoadingNotifications(true);
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      const list: UserNotification[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as UserNotification);
      });
      // Sort newest first
      const sorted = list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setNotifications(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Helper to send a notification to another user
  const sendNotification = async (
    recipientId: string,
    type: 'like' | 'comment' | 'blood_request' | 'appointment',
    message: string,
    relatedId: string
  ) => {
    if (!currentUser || recipientId === currentUser.uid) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId,
        senderId: currentUser.uid,
        senderName: userData?.name || 'Community Member',
        type,
        message,
        relatedId,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending notification', err);
    }
  };

  // Helper to send emergency blood alerts to everyone!
  const sendGroupBloodNotification = async (bloodGroup: string, requestId: string, hospital: string) => {
    if (!currentUser) return;
    try {
      // Find other users who match this blood group or might be interested
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(async (uDoc) => {
        const uData = uDoc.data();
        if (uDoc.id !== currentUser.uid && (uData.bloodGroup === bloodGroup || uData.role === 'admin')) {
          await addDoc(collection(db, 'notifications'), {
            recipientId: uDoc.id,
            senderId: currentUser.uid,
            senderName: userData?.name || 'Emergency Dispatch',
            type: 'blood_request',
            message: `URGENT: ${bloodGroup} Blood needed at ${hospital} immediately!`,
            relatedId: requestId,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      });
    } catch (err) {
      console.error('Failed to dispatch emergency alerts', err);
    }
  };

  // --- TAB 1: FEED ACTIONS ---
  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      setError('');
      const snap = await getDocs(collection(db, 'posts'));
      const list: Post[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Post);
      });

      // Load all comments to maintain accurate comment counts and pre-populate comments map
      let commentsMap: { [postId: string]: Comment[] } = {};
      let commentCounts: { [postId: string]: number } = {};
      try {
        const commentsSnap = await getDocs(collection(db, 'comments'));
        commentsSnap.forEach((cDoc) => {
          const cData = cDoc.data() as Comment;
          const c = { id: cDoc.id, ...cData };
          if (cData.postId) {
            if (!commentsMap[cData.postId]) {
              commentsMap[cData.postId] = [];
            }
            commentsMap[cData.postId].push(c);
            commentCounts[cData.postId] = (commentCounts[cData.postId] || 0) + 1;
          }
        });

        // Sort comments in commentsMap chronologically
        Object.keys(commentsMap).forEach((pId) => {
          commentsMap[pId].sort((a, b) => {
            const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return tA - tB;
          });
        });

        setComments(commentsMap);
      } catch (cErr) {
        console.warn('Could not fetch comments collection on loadPosts:', cErr);
      }

      // Sort newest posts first & compute commentsCount
      const sorted = list
        .sort((a, b) => {
          const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
          return tB - tA;
        })
        .map((p) => ({
          ...p,
          commentsCount: commentCounts[p.id] !== undefined ? commentCounts[p.id] : (p.commentsCount || 0)
        }));

      setPosts(sorted);
    } catch (err) {
      console.error(err);
      setError('Could not download community feed posts.');
    } finally {
      setLoadingPosts(false);
    }
  };

  // Deterministic background gradient for user avatars
  const getAvatarGradient = (name: string) => {
    const colors = [
      'from-pink-500 to-rose-500 text-white',
      'from-purple-600 to-indigo-600 text-white',
      'from-blue-500 to-teal-500 text-white',
      'from-emerald-500 to-teal-600 text-white',
      'from-amber-500 to-orange-500 text-white',
      'from-fuchsia-500 to-purple-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Safe client-side regex-based rich text renderer (Bold, Italic, Bullet Lists)
  const renderPostContent = (content: string) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const renderedElements: React.ReactNode[] = [];
    let inList = false;
    let listItems: string[] = [];

    const parseInlineMarkdown = (text: string) => {
      let safeText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
      // Bold **text**
      safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic *text*
      safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      return <span dangerouslySetInnerHTML={{ __html: safeText }} />;
    };

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${key}`} className="list-disc list-inside ml-4 my-2 space-y-1 text-slate-700">
            {listItems.map((item, idx) => (
              <li key={idx} className="font-medium text-sm">
                {parseInlineMarkdown(item)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const listMatch = trimmed.match(/^[-*•]\s+(.*)$/);
      
      if (listMatch) {
        inList = true;
        listItems.push(listMatch[1]);
      } else {
        if (inList) {
          flushList(index);
          inList = false;
        }
        
        if (trimmed === '') {
          renderedElements.push(<div key={`empty-${index}`} className="h-2" />);
        } else {
          renderedElements.push(
            <p key={`p-${index}`} className="text-slate-700 text-sm leading-relaxed font-medium">
              {parseInlineMarkdown(line)}
            </p>
          );
        }
      }
    });

    if (inList) {
      flushList(lines.length);
    }

    return <div className="space-y-1.5">{renderedElements}</div>;
  };

  // Rich Text Editor insertion helper
  const handleInsertStyle = (type: 'bold' | 'italic' | 'bullet', isEdit: boolean = false) => {
    const textarea = document.getElementById(isEdit ? 'edit-post-textarea' : 'create-post-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = isEdit ? editingPostContent : newPostContent;
    const selectedText = text.substring(start, end);

    let replacement = '';
    if (type === 'bold') {
      replacement = `**${selectedText || 'bold text'}**`;
    } else if (type === 'italic') {
      replacement = `*${selectedText || 'italic text'}*`;
    } else if (type === 'bullet') {
      replacement = `\n- ${selectedText || 'list item'}`;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    if (isEdit) {
      setEditingPostContent(newText);
    } else {
      setNewPostContent(newText);
    }

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Base64 file reader for image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image is too large. Please upload an image smaller than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newPostContent.trim()) return;
    try {
      setError('');
      setSuccess('');
      const newPost = {
        userId: currentUser.uid,
        authorName: userData?.name || 'Community Member',
        authorEmail: currentUser.email || '',
        content: newPostContent.trim(),
        likes: [],
        category: selectedCategory || '',
        imageUrl: newPostImage || '',
        authorRole: userData?.role || 'user',
        reactions: {
          love: [],
          surprise: [],
          insight: [],
          care: []
        },
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'posts'), newPost);
      setNewPostContent('');
      setSelectedCategory('');
      setNewPostImage(null);
      setSuccess('Post published to Community Feed!');
      await loadPosts();
    } catch (err) {
      console.error(err);
      setError('Failed to publish post.');
    }
  };

  const handleReactPost = async (post: Post, reactionType: 'like' | 'love' | 'surprise' | 'insight' | 'care') => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', post.id);

    const uid = currentUser.uid;
    const currentLikes = post.likes || [];
    const currentReactions = post.reactions || {};

    // Determine user's active reaction type if any
    let activeReactionType: 'like' | 'love' | 'surprise' | 'insight' | 'care' | null = null;
    if (currentLikes.includes(uid)) {
      activeReactionType = 'like';
    } else if (currentReactions.love?.includes(uid)) {
      activeReactionType = 'love';
    } else if (currentReactions.surprise?.includes(uid)) {
      activeReactionType = 'surprise';
    } else if (currentReactions.insight?.includes(uid)) {
      activeReactionType = 'insight';
    } else if (currentReactions.care?.includes(uid)) {
      activeReactionType = 'care';
    }

    // Prepare clean copies without currentUser.uid across ALL reaction lists (enforce 1 reaction per user)
    const newLikes = currentLikes.filter(id => id !== uid);
    const newReactions = {
      love: (currentReactions.love || []).filter(id => id !== uid),
      surprise: (currentReactions.surprise || []).filter(id => id !== uid),
      insight: (currentReactions.insight || []).filter(id => id !== uid),
      care: (currentReactions.care || []).filter(id => id !== uid)
    };

    // If user clicked a different reaction than active, add them to the target reaction.
    // If user clicked the same active reaction, it remains toggled off.
    const isAddingNewReaction = activeReactionType !== reactionType;
    if (isAddingNewReaction) {
      if (reactionType === 'like') {
        newLikes.push(uid);
      } else {
        newReactions[reactionType].push(uid);
      }
    }

    // Immediately update local UI state
    setPosts(prev => prev.map(p => p.id === post.id ? {
      ...p,
      likes: newLikes,
      reactions: newReactions
    } : p));

    try {
      // Sync document in Firestore
      await updateDoc(postRef, {
        userId: post.userId,
        likes: newLikes,
        reactions: newReactions
      });

      if (isAddingNewReaction && post.userId !== uid) {
        const charMap = { like: '👍', love: '❤️', surprise: '😮', insight: '💡', care: '🏥' };
        sendNotification(
          post.userId, 
          'like', 
          `reacted ${charMap[reactionType]} to your post: "${post.content.substring(0, 30)}..."`, 
          post.id
        );
      }
    } catch (err: any) {
      console.error('Error reacting to post:', err);
      // Rollback local state on error
      setPosts(prev => prev.map(p => p.id === post.id ? post : p));
      try {
        handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to update reaction.');
      }
    }
  };

  const handleLikePost = async (post: Post) => {
    // Retain legacy method for backward compatibility if called
    await handleReactPost(post, 'like');
  };

  const handleStartEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditingPostContent(post.content);
  };

  const handleSaveEditPost = async (postId: string) => {
    if (!editingPostContent.trim()) return;
    try {
      setError('');
      setSuccess('');
      await updateDoc(doc(db, 'posts', postId), {
        content: editingPostContent.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingPostId(null);
      setSuccess('Post updated successfully!');
      await loadPosts();
    } catch (err) {
      console.error(err);
      setError('Could not update post.');
    }
  };

  const handleDeletePost = (postId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost || !currentUser) return;
    const canDelete = targetPost.userId === currentUser.uid || userData?.role === 'admin';
    if (!canDelete) {
      setError('You are not authorized to delete this post.');
      return;
    }
    setDeletePostId(postId);
  };

  const confirmDeletePost = async () => {
    if (!deletePostId || !currentUser) return;
    const postId = deletePostId;
    const targetPost = posts.find(p => p.id === postId);

    if (!targetPost) {
      setDeletePostId(null);
      return;
    }

    const canDelete = targetPost.userId === currentUser.uid || userData?.role === 'admin';
    if (!canDelete) {
      setError('You are not authorized to delete this post.');
      setDeletePostId(null);
      return;
    }

    try {
      setDeletingPost(true);
      setError('');
      setSuccess('');

      // Clean up comments owned by current user for this post if any
      try {
        const q = query(collection(db, 'comments'), where('postId', '==', postId));
        const commentsSnap = await getDocs(q);
        const deletePromises: Promise<void>[] = [];
        commentsSnap.forEach((cDoc) => {
          const cData = cDoc.data();
          if (cData.userId === currentUser.uid) {
            deletePromises.push(deleteDoc(doc(db, 'comments', cDoc.id)));
          }
        });
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      } catch (commentErr) {
        console.warn('Non-fatal error clearing comments on post deletion:', commentErr);
      }

      // Delete post document from Firestore
      await deleteDoc(doc(db, 'posts', postId));

      setSuccess('Post deleted successfully.');
      setPosts(prev => prev.filter(p => p.id !== postId));
      setComments(prev => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
      if (expandedPostComments === postId) {
        setExpandedPostComments(null);
      }

      setDeletePostId(null);

      // Re-sync feed from Firestore so deleted post does not return
      await loadPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, 'posts');
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to delete post.');
      }
    } finally {
      setDeletingPost(false);
    }
  };

  const handleTogglePinPost = async (post: Post) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', post.id);
    try {
      setError('');
      setSuccess('');
      const isPinned = !post.pinned;
      await updateDoc(postRef, {
        likes: post.likes || [],
        pinned: isPinned
      });
      setSuccess(isPinned ? 'Post pinned to the top of the feed!' : 'Post unpinned.');
    } catch (err) {
      console.error('Error toggling pin status:', err);
      setError('Failed to update pin status. Ensure you have the required permission.');
    }
  };

  const handleReportPost = async (post: Post) => {
    if (!currentUser) return;
    const isAlreadyReported = post.reportedBy?.includes(currentUser.uid);
    if (isAlreadyReported) {
      setError('You have already reported this post.');
      return;
    }

    if (!window.confirm('Are you sure you want to report this post as inappropriate?')) return;

    const postRef = doc(db, 'posts', post.id);
    try {
      setError('');
      setSuccess('');
      const newReportedBy = [...(post.reportedBy || []), currentUser.uid];
      await updateDoc(postRef, {
        likes: post.likes || [],
        reportedBy: newReportedBy
      });
      setSuccess('Post reported. Thank you for helping keep our community safe!');
    } catch (err) {
      console.error('Error reporting post:', err);
      setError('Failed to submit report.');
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const q = query(collection(db, 'comments'), where('postId', '==', postId));
      const snap = await getDocs(q);
      const list: Comment[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Comment);
      });
      // Sort chronologically
      const sorted = list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tA - tB;
      });
      setComments(prev => ({ ...prev, [postId]: sorted }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: sorted.length } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedPostComments === postId) {
      setExpandedPostComments(null);
    } else {
      setExpandedPostComments(postId);
      await loadComments(postId);
    }
  };

  const handleAddComment = async (postId: string, postAuthorId: string) => {
    const text = newCommentText[postId]?.trim();
    if (!currentUser || !text) return;
    try {
      const payload = {
        postId,
        userId: currentUser.uid,
        authorName: userData?.name || 'Community Member',
        content: text,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'comments'), payload);
      setNewCommentText(prev => ({ ...prev, [postId]: '' }));

      // Reload comments for this post
      await loadComments(postId);

      // Immediately update post comment count in local UI state
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const currentCount = comments[postId] ? comments[postId].length : (p.commentsCount || 0);
          return { ...p, commentsCount: currentCount + 1 };
        }
        return p;
      }));

      // Update post document in Firestore
      const targetPost = posts.find(p => p.id === postId);
      if (targetPost) {
        try {
          const currentCount = comments[postId] ? comments[postId].length : (targetPost.commentsCount || 0);
          await updateDoc(doc(db, 'posts', postId), {
            userId: targetPost.userId,
            likes: targetPost.likes || [],
            commentsCount: currentCount + 1
          });
        } catch (uErr) {
          console.warn('Non-fatal error updating commentsCount on post:', uErr);
        }
      }

      // Notify author of post
      if (postAuthorId !== currentUser.uid) {
        sendNotification(postAuthorId, 'comment', `commented on your post: "${text.substring(0, 30)}..."`, postId);
      }
    } catch (err: any) {
      console.error('Error adding comment:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'comments');
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to post comment.');
      }
    }
  };

  // --- TAB 2: BLOOD DONATION ACTIONS ---
  const loadBloodRequests = async () => {
    try {
      setLoadingBlood(true);
      const snap = await getDocs(collection(db, 'blood_requests'));
      const list: BloodRequest[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as BloodRequest);
      });
      const sorted = list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setBloodRequests(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBlood(false);
    }
  };

  const handleCreateBloodRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !bloodPatientName || !bloodUnits || !bloodHospital || !bloodContact) return;
    try {
      setError('');
      setSuccess('');
      const payload = {
        userId: currentUser.uid,
        patientName: bloodPatientName,
        bloodGroup: bloodGroupSelect,
        unitsRequired: Number(bloodUnits),
        hospital: bloodHospital,
        contactNumber: bloodContact,
        isEmergency: bloodIsEmergency,
        description: bloodDesc,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'blood_requests'), payload);
      
      setSuccess('Blood donation request successfully posted!');
      setShowCreateBloodRequest(false);
      
      // Clear Inputs
      setBloodPatientName('');
      setBloodUnits('');
      setBloodHospital('');
      setBloodContact('');
      setBloodDesc('');
      setBloodIsEmergency(false);

      // Dispatch emergency notifications to matching blood group donors
      if (bloodIsEmergency) {
        await sendGroupBloodNotification(bloodGroupSelect, docRef.id, bloodHospital);
      }

      await loadBloodRequests();
    } catch (err) {
      console.error(err);
      setError('Could not post blood request.');
    }
  };

  const handleDeleteBloodRequest = (reqId: string) => {
    const targetReq = bloodRequests.find(r => r.id === reqId);
    if (!targetReq || !currentUser) return;
    const canDelete = targetReq.userId === currentUser.uid || userData?.role === 'admin';
    if (!canDelete) {
      setError('You are not authorized to delete this blood request.');
      return;
    }
    setDeleteBloodRequestId(reqId);
  };

  const confirmDeleteBloodRequest = async () => {
    if (!deleteBloodRequestId || !currentUser) return;
    const reqId = deleteBloodRequestId;
    const targetReq = bloodRequests.find(r => r.id === reqId);

    if (!targetReq) {
      setDeleteBloodRequestId(null);
      return;
    }

    const canDelete = targetReq.userId === currentUser.uid || userData?.role === 'admin';
    if (!canDelete) {
      setError('You are not authorized to delete this blood request.');
      setDeleteBloodRequestId(null);
      return;
    }

    try {
      setDeletingBloodRequest(true);
      setError('');
      setSuccess('');

      await deleteDoc(doc(db, 'blood_requests', reqId));
      setSuccess('Blood request removed successfully.');
      setBloodRequests(prev => prev.filter(r => r.id !== reqId));
      setDeleteBloodRequestId(null);

      await loadBloodRequests();
    } catch (err: any) {
      console.error('Error deleting blood request:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `blood_requests/${reqId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to delete blood request.');
      }
    } finally {
      setDeletingBloodRequest(false);
    }
  };

  const handleViewEmergencyRequests = () => {
    const firstEmergency = bloodRequests.find(r => r.isEmergency);
    if (!firstEmergency) {
      setError('No active emergency blood requests found.');
      // Auto-clear error after 4 seconds
      setTimeout(() => {
        setError('');
      }, 4000);
      return;
    }

    setError('');

    // Automatically filter to display ONLY High Emergency requests
    setBloodFilter('EMERGENCY');

    // Use a small delay to let the filter change render
    setTimeout(() => {
      const element = document.getElementById(`blood-card-${firstEmergency.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight card for 3 seconds
        setHighlightedRequestId(firstEmergency.id);
        setTimeout(() => {
          setHighlightedRequestId(null);
        }, 3000);
      }
    }, 150);
  };

  const handleFindMatchingDonors = (bloodGroup: string) => {
    setActiveTab('blood_donors');
    setDonorBloodFilter(bloodGroup);
    setDonorOnlyAvailableFilter(true);

    const hasMatch = donors.some(d => d.isActive !== false && d.bloodGroup === bloodGroup && d.availableNow === true);
    if (!hasMatch) {
      setError('No matching donors are currently available.');
      setTimeout(() => {
        setError('');
      }, 5000);
    } else {
      setError('');
    }

    setHighlightedDonorGroupId(bloodGroup);
    setTimeout(() => {
      setHighlightedDonorGroupId(null);
    }, 3000);

    setTimeout(() => {
      const element = document.getElementById('donor-directory-filters') || document.getElementById('donor-directory-grid');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // --- BLOOD DONORS SYSTEM HANDLERS ---
  const currentUserDonorProfile = donors.find(d => d.userId === currentUser?.uid && d.isActive !== false);

  const resetDonorForm = () => {
    setDonorFullName('');
    setDonorBloodGroup('A+');
    setDonorPhone('');
    setDonorDistrict('');
    setDonorLastDonationDate('');
    setDonorAvailableNow(true);
    setDonorEmergencyDonation(false);
  };

  const openDonorModal = () => {
    if (currentUserDonorProfile) {
      setIsEditingDonor(true);
      setDonorFullName(currentUserDonorProfile.fullName || '');
      setDonorBloodGroup(currentUserDonorProfile.bloodGroup || 'A+');
      setDonorPhone(currentUserDonorProfile.phoneNumber || '');
      setDonorDistrict(currentUserDonorProfile.district || '');
      setDonorLastDonationDate(currentUserDonorProfile.lastDonationDate || '');
      setDonorAvailableNow(currentUserDonorProfile.availableNow ?? true);
      setDonorEmergencyDonation(currentUserDonorProfile.emergencyDonation ?? false);
    } else {
      setIsEditingDonor(false);
      resetDonorForm();
    }
    setShowDonorModal(true);
  };

  const handleRegisterDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Prevent duplicate active donor registration
    const existingProfile = donors.find(d => d.userId === currentUser.uid);
    if (existingProfile && existingProfile.isActive !== false) {
      setError('You are already registered as a blood donor.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const payload = {
        userId: currentUser.uid,
        fullName: donorFullName,
        bloodGroup: donorBloodGroup,
        phoneNumber: donorPhone,
        district: donorDistrict,
        lastDonationDate: donorLastDonationDate,
        availableNow: donorAvailableNow,
        emergencyDonation: donorEmergencyDonation,
        isActive: true,
        createdAt: existingProfile?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const path = `donors/${currentUser.uid}`;
      try {
        await setDoc(doc(db, 'donors', currentUser.uid), payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      
      setSuccess('Successfully registered as a blood donor!');
      setShowDonorModal(false);
      resetDonorForm();
    } catch (err) {
      console.error(err);
      setError('Could not register as a donor.');
    }
  };

  const handleUpdateDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserDonorProfile) return;
    try {
      setError('');
      setSuccess('');
      
      const payload = {
        userId: currentUser.uid,
        fullName: donorFullName,
        bloodGroup: donorBloodGroup,
        phoneNumber: donorPhone,
        district: donorDistrict,
        lastDonationDate: donorLastDonationDate,
        availableNow: donorAvailableNow,
        emergencyDonation: donorEmergencyDonation,
        isActive: true,
        createdAt: currentUserDonorProfile.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const path = `donors/${currentUser.uid}`;
      try {
        await setDoc(doc(db, 'donors', currentUser.uid), payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      
      setSuccess('Donor profile successfully updated!');
      setShowDonorModal(false);
      resetDonorForm();
    } catch (err) {
      console.error(err);
      setError('Could not update donor profile.');
    }
  };

  const handleDeleteDonor = () => {
    setShowLeaveConfirmation(true);
  };

  const handleConfirmLeaveRegistry = async () => {
    if (!currentUser) return;
    try {
      setError('');
      setSuccess('');
      
      const path = `donors/${currentUser.uid}`;
      try {
         await updateDoc(doc(db, 'donors', currentUser.uid), {
           isActive: false,
           updatedAt: serverTimestamp()
         });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      
      setSuccess('Successfully left the blood donor registry.');
      setTimeout(() => setSuccess(''), 4000);
      setShowDonorModal(false);
      setShowMyProfileModal(false);
      setIsEditingMyProfile(false);
      resetDonorForm();
    } catch (err) {
      console.error(err);
      setError('Could not remove donor profile.');
    }
  };

  const handleSaveMyProfile = async () => {
    if (!currentUser || !currentUserDonorProfile) return;
    if (!editMyPhone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!editMyDistrict.trim()) {
      setError('District is required.');
      return;
    }
    try {
      setError('');
      setSuccess('');
      
      const path = `donors/${currentUser.uid}`;
      try {
        await updateDoc(doc(db, 'donors', currentUser.uid), {
          phoneNumber: editMyPhone.trim(),
          district: editMyDistrict.trim(),
          lastDonationDate: editMyLastDonationDate.trim(),
          availableNow: editMyAvailableNow,
          emergencyDonation: editMyEmergencyDonation,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      
      setSuccess('Donor profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      setIsEditingMyProfile(false);
    } catch (err) {
      console.error(err);
      setError('Could not update donor profile.');
    }
  };

  // --- TAB 3: DOCTOR CONSULTATIONS ---
  const seedDoctorsAndArticles = async () => {
    try {
      // 1. Check if doctors exists, if not seed them
      const docSnap = await getDocs(collection(db, 'doctors'));
      if (docSnap.empty) {
        const dummyDocs = [
          {
            name: 'Dr. Sarah Jenkins',
            specialty: 'Cardiology & Heart Health',
            hospital: 'St. Mary\'s General Hospital',
            experience: '12 years exp',
            email: 'sarah.jenkins@smarthealth.org',
            description: 'Specializes in lifestyle-based arterial therapies, hypertension diagnostics, and pediatric cardiograms.',
            consultationFee: '$60',
            fee: 60,
            avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
            isOnline: true,
            schedules: [
              {
                id: 'sched-sj-1',
                days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                startTime: '09:00 AM',
                endTime: '01:00 PM',
                consultationType: 'Video & In-Person'
              }
            ]
          },
          {
            name: 'Dr. Marcus Vance',
            specialty: 'Endocrinology & Diabetes Care',
            hospital: 'City Wellness Center',
            experience: '8 years exp',
            email: 'marcus.vance@smarthealth.org',
            description: 'Focused on comprehensive diabetes care plans, nutrition-driven glucose maintenance, and thyroid therapies.',
            consultationFee: '$65',
            fee: 65,
            avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
            isOnline: true,
            schedules: [
              {
                id: 'sched-mv-1',
                days: ['Sat', 'Sun', 'Mon', 'Wed'],
                startTime: '10:00 AM',
                endTime: '02:00 PM',
                consultationType: 'Video & In-Person'
              }
            ]
          },
          {
            name: 'Dr. Priya Patel',
            specialty: 'General Family Medicine',
            hospital: 'Green Valley Clinical Group',
            experience: '15 years exp',
            email: 'priya.patel@smarthealth.org',
            description: 'General physicals, chronic symptom checkups, wellness advice, and preventative medicine for all age ranges.',
            consultationFee: '$70',
            fee: 70,
            avatarUrl: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
            isOnline: true,
            schedules: [
              {
                id: 'sched-pp-1',
                days: ['Mon', 'Tue', 'Thu', 'Fri'],
                startTime: '09:00 AM',
                endTime: '01:00 PM',
                consultationType: 'Video & In-Person'
              }
            ]
          },
          {
            name: 'Dr. Daniel Kim',
            specialty: 'Therapy & Mental Wellness',
            hospital: 'Mind Care Psychiatric Center',
            experience: '10 years exp',
            email: 'daniel.kim@smarthealth.org',
            description: 'Cognitive behavioral therapies, clinical depression relief strategies, post-traumatic counseling, and stress-coping guidelines.',
            consultationFee: '$50',
            fee: 50,
            avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
            isOnline: true,
            schedules: [
              {
                id: 'sched-dk-1',
                days: ['Tue', 'Wed', 'Fri', 'Sat'],
                startTime: '02:00 PM',
                endTime: '06:00 PM',
                consultationType: 'Video & In-Person'
              }
            ]
          }
        ];
        for (const item of dummyDocs) {
          await addDoc(collection(db, 'doctors'), item);
        }
      }

      // 2. Check if articles exists, if not seed them
      const artSnap = await getDocs(collection(db, 'articles'));
      if (artSnap.empty) {
        const dummyArticles = [
          {
            title: 'Understanding Heart Health: Diet & Lifestyle Tips',
            category: 'Cardiology',
            summary: 'Practical, everyday steps to strengthen your heart muscle, manage systemic blood pressure, and eat a cardiac-safe diet.',
            content: `A healthy heart is the absolute foundation of long-term physical vigor. Cardiovascular diseases remain a leading health risk, yet they are highly preventable through structured diet and lifestyle adjustments.

To promote heart strength:
1. Emphasize unsaturated fats: Cook with olive oil and eat nuts/seeds. Avoid hydrogenated trans fats.
2. Moderate sodium: Keeping sodium below 2,000mg daily preserves arterial flexibility.
3. Aerobic exercise: 150 minutes of weekly moderate cardio (such as brisk walking) optimizes circulatory health.
4. Stress regulation: Deep diaphragmatic breathing decreases modern adrenaline-spurred arterial fatigue.

Partner with your care physician to run seasonal blood panels monitoring LDL cholesterol and resting heart indices.`,
            author: 'Dr. Sarah Jenkins',
            readTime: '5 min',
            createdAt: new Date().toISOString()
          },
          {
            title: 'Managing Blood Sugar: A Comprehensive Guide',
            category: 'Diabetes',
            summary: 'Learn how glucose monitoring, glycemic index, and cellular insulin regulation work to prevent chronic metabolic complications.',
            content: `Maintaining steady blood glucose levels is critical to cellular metabolism and physical stamina. When glycemic values spike and crash erratically, it accelerates cellular fatigue and risks pancreas insulin-resistance.

Strategies for optimal glucose levels:
- Choose complex carbohydrates: Whole oats, quinoa, and legumes digests slowly without trigger-happy insulin spikes.
- Pair carbohydrates with healthy fats and protein: This mechanical buffering delays glucose dump into the blood.
- Standardize meal timing: Consistent eating slots prevent late-day caloric overconsumption.
- Leverage daily tracker logs: Log post-meal indices in our Health Tracker to discover custom glycemic sensitivities.

For those tracking borderline pre-diabetic states, monitoring fasting blood levels daily holds incredible therapeutic value.`,
            author: 'Dr. Marcus Vance',
            readTime: '7 min',
            createdAt: new Date().toISOString()
          },
          {
            title: 'The Critical Importance of Daily Hydration',
            category: 'Nutrition',
            summary: 'The scientific mechanics behind targeted water intake, intracellular homeostasis, and daily metabolic energy conversion.',
            content: `Water represents roughly 60% of total body volume and acts as the crucial transport highway for oxygen, nutrients, and immune cells. Proper hydration preserves joint cartilage elasticity, protects critical spinal tissue, and flushes metabolic waste.

Optimal hydration routines:
- Target standard metabolic ranges: 2,000ml to 3,000ml of clean liquid daily depending on your ambient humidity and workouts.
- Hydrate consistently: Settle for steady hourly sips rather than massive singular intakes to optimize kidney absorption.
- Notice signs: Dehydration results in decreased mental focus, muscle cramping, and headaches.

Use the Water Tracker tab inside our suite to configure goals and maintain active hydration.`,
            author: 'Editorial Team',
            readTime: '3 min',
            createdAt: new Date().toISOString()
          },
          {
            title: 'Combating Anxiety in a Hyper-Connected World',
            category: 'Mental Health',
            summary: 'Mindfulness breathing patterns, screen time limits, and cognitive grounding mechanics to restore nervous system balance.',
            content: `In our modern era of high-speed screens and constant push notifications, the human sympathetic nervous system remains on alert. Chronic activation of cortisol pathways can lead to fatigue, sleep disruptions, and cognitive fog.

Evidence-based stress recovery:
- Implement digital sunset: Power down screens 1 hour before bed to support natural melatonin synthesis.
- Practice Box Breathing: Inhale for 4 seconds, hold for 4, exhale for 4, and pause for 4. This activates the calming parasympathetic pathway.
- Grounding exercises: Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste when feeling overwhelmed.

Do not hesitate to reach out to our licensed community counseling directory for private appointment consultations.`,
            author: 'Dr. Daniel Kim',
            readTime: '6 min',
            createdAt: new Date().toISOString()
          }
        ];
        for (const item of dummyArticles) {
          await addDoc(collection(db, 'articles'), item);
        }
      }
    } catch (err) {
      console.error('Seeding error', err);
    }
  };

  const loadDoctorsAndAppointments = async () => {
    try {
      setLoadingDoctors(true);
      await seedDoctorsAndArticles();
      
      // Load Doctors
      const dSnap = await getDocs(collection(db, 'doctors'));
      const dList: Doctor[] = [];

      const defaultFees: { [key: string]: string } = {
        'Dr. Sarah Jenkins': '৳ 600',
        'Dr. Marcus Vance': '৳ 650',
        'Dr. Priya Patel': '৳ 700',
        'Dr. Daniel Kim': '৳ 500'
      };

      const defaultAvatars: { [key: string]: string } = {
        'Dr. Sarah Jenkins': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
        'Dr. Marcus Vance': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
        'Dr. Priya Patel': 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
        'Dr. Daniel Kim': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200'
      };

      for (const d of dSnap.docs) {
        const data = d.data();
        let feeDisplay = '৳ 500';
        if (data.fee !== undefined && data.fee !== null && data.fee !== '') {
          feeDisplay = typeof data.fee === 'number' || !isNaN(Number(data.fee)) ? `৳ ${data.fee}` : String(data.fee);
        } else if (data.consultationFee) {
          feeDisplay = String(data.consultationFee).replace('$', '৳ ');
        } else if (defaultFees[data.name]) {
          feeDisplay = defaultFees[data.name];
        }

        dList.push({ 
          id: d.id, 
          ...data,
          avatarUrl: data.avatarUrl || data.image || defaultAvatars[data.name] || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300',
          consultationFee: feeDisplay,
          isOnline: data.isOnline !== undefined ? data.isOnline : true,
          schedules: Array.isArray(data.schedules) ? data.schedules : [],
          availableDays: Array.isArray(data.availableDays) ? data.availableDays : [],
          availableHours: data.availableHours || ''
        } as any as Doctor);
      }
      setDoctors(dList);

      // Load All Appointments to check booking slots for all doctors
      const allAppSnap = await getDocs(collection(db, 'appointments'));
      const allApptsList: Appointment[] = [];
      allAppSnap.forEach(d => {
        allApptsList.push({ id: d.id, ...d.data() } as Appointment);
      });
      setAllAppointments(allApptsList);

      // Load User Appointments for History
      if (currentUser) {
        const myAppts = allApptsList.filter(a => 
          a.patientId === currentUser.uid || 
          a.userId === currentUser.uid || 
          (a as any).patientUid === currentUser.uid
        );
        const sorted = myAppts.sort((a, b) => {
          const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setAppointments(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !showBookAppointment || isBookingSubmitting) return;

    const upcomingDates = getAllUpcomingCalendarDatesForDoctor(showBookAppointment, selectedConsultationType);
    const selectedDateOpt = upcomingDates.find(d => d.dateStr === selectedBookingDateStr);
    const isSelectedDateValid = selectedDateOpt && selectedDateOpt.isAvailable;
    const firstAvailableDate = upcomingDates.find(d => d.isAvailable);
    const targetDateStr = isSelectedDateValid
      ? selectedBookingDateStr
      : (firstAvailableDate ? firstAvailableDate.dateStr : (upcomingDates.length > 0 ? upcomingDates[0].dateStr : ''));

    if (!targetDateStr || !selectedBookingTime || !apptReason) {
      setError('Please select consultation date, time slot, and describe your medical concern.');
      return;
    }

    setIsBookingSubmitting(true);
    // Mutually exclusive clear: reset both before processing
    setError('');
    setSuccess('');

    try {
      const dayName = getDayNameFromDateStr(targetDateStr);
      if (!dayName) {
        setError('Invalid appointment date selection.');
        setIsBookingSubmitting(false);
        return;
      }
      
      const validSlots = getDoctorSlotsForDayAndType(showBookAppointment, selectedConsultationType, dayName);
      if (validSlots.length === 0) {
        setError('Doctor has no available schedule for this consultation format on this day.');
        setIsBookingSubmitting(false);
        return;
      }

      // Check if time is in valid slots
      if (!validSlots.some(s => isSameTimeSlot(s, selectedBookingTime))) {
        setError('Selected time is outside doctor\'s configured working hours.');
        setIsBookingSubmitting(false);
        return;
      }

      // Prevent double booking: check local state first
      const isAlreadyBookedLocally = allAppointments.some(appt => 
        appt.doctorId === showBookAppointment.id &&
        appt.appointmentDate === targetDateStr &&
        isSameTimeSlot(appt.appointmentTime, selectedBookingTime) &&
        (appt.consultationType || 'in_person') === selectedConsultationType &&
        appt.status !== 'declined' &&
        appt.status !== 'Declined' &&
        appt.status !== 'cancelled' &&
        appt.status !== 'rejected'
      );
      if (isAlreadyBookedLocally) {
        setError('This appointment slot is no longer available.');
        setIsBookingSubmitting(false);
        return;
      }

      // Double-check against latest Firestore data safely
      const latestAppSnap = await getDocs(
        query(
          collection(db, 'appointments'),
          where('doctorId', '==', showBookAppointment.id),
          where('appointmentDate', '==', targetDateStr)
        )
      );
      const isAlreadyBookedInDb = latestAppSnap.docs.some(docSnap => {
        const data = docSnap.data();
        const typeMatch = (data.consultationType || 'in_person') === selectedConsultationType;
        const isOccupied = data.status !== 'declined' && data.status !== 'Declined' && data.status !== 'cancelled' && data.status !== 'rejected';
        return isSameTimeSlot(data.appointmentTime, selectedBookingTime) && typeMatch && isOccupied;
      });
      if (isAlreadyBookedInDb) {
        setError('This appointment slot is no longer available.');
        setIsBookingSubmitting(false);
        return;
      }

      const doctorAuthUid = (showBookAppointment as any).userId || (showBookAppointment as any).doctorUserId || showBookAppointment.id;

      const payload = {
        doctorId: showBookAppointment.id,
        doctorUserId: doctorAuthUid,
        doctorName: showBookAppointment.name,
        doctorEmail: (showBookAppointment as any).email || '',
        patientId: currentUser.uid,
        patientUid: currentUser.uid,
        patientName: userData?.name || currentUser.displayName || 'Community Member',
        patientEmail: currentUser.email || '',
        patientPhone: userData?.phone || '',
        specialization: showBookAppointment.specialty,
        hospital: showBookAppointment.hospital || 'Central Community Health Center',
        appointmentDate: targetDateStr,
        appointmentTime: selectedBookingTime,
        consultationType: selectedConsultationType,
        symptoms: apptReason,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Maintain backward compatibility properties for queries and UI rendering
        userId: currentUser.uid,
        userName: userData?.name || currentUser.displayName || 'Community Member',
        userEmail: currentUser.email || '',
        doctorSpecialty: showBookAppointment.specialty,
        reason: apptReason
      };

      const docRef = await addDoc(collection(db, 'appointments'), payload);
      
      // Construct local representation with generated ID to update state instantly
      const localNewAppt: Appointment = {
        id: docRef.id,
        doctorId: showBookAppointment.id,
        doctorUserId: doctorAuthUid,
        doctorName: showBookAppointment.name,
        patientId: currentUser.uid,
        patientUid: currentUser.uid,
        patientName: userData?.name || currentUser.displayName || 'Community Member',
        patientEmail: currentUser.email || '',
        specialization: showBookAppointment.specialty,
        hospital: showBookAppointment.hospital || 'Central Community Health Center',
        appointmentDate: targetDateStr,
        appointmentTime: selectedBookingTime,
        consultationType: selectedConsultationType,
        symptoms: apptReason,
        status: 'pending',
        createdAt: Timestamp.now(),
        // Backward compatibility
        userId: currentUser.uid,
        userName: userData?.name || currentUser.displayName || 'Community Member',
        userEmail: currentUser.email || '',
        doctorSpecialty: showBookAppointment.specialty,
        reason: apptReason
      } as any;

      // Instantly update states to remove slot, update next available, and show in history
      setAllAppointments(prev => [localNewAppt, ...prev]);
      setAppointments(prev => [localNewAppt, ...prev]);

      // Save notification for booking submission in Firestore
      const notifPayload = {
        recipientId: currentUser.uid,
        senderId: showBookAppointment.id,
        senderName: showBookAppointment.name,
        type: 'appointment',
        message: `Your consultation request with ${showBookAppointment.name} has been submitted.`,
        relatedId: docRef.id,
        read: false,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'notifications'), notifPayload);

      // Instantly add the notification locally too
      const localNotif = {
        id: 'notif-local-' + Date.now(),
        ...notifPayload,
        createdAt: Timestamp.now()
      };
      setNotifications(prev => [localNotif as any, ...prev]);

      const bookedDoctorId = showBookAppointment.id;
      const bookedDoctorName = showBookAppointment.name;

      // Ensure error is cleared and show only success message
      setError('');
      setSuccess(`Consultation successfully booked! Request submitted to ${bookedDoctorName}. Awaiting doctor confirmation.`);

      // Reset all transient booking inputs and close modal
      setShowBookAppointment(null);
      setSelectedBookingDateStr('');
      setSelectedBookingTime('');
      setApptReason('');
      setSelectedSlot(null);

      // Reload appointments and notifications to sync with the backend
      await loadDoctorsAndAppointments();
      await loadNotifications();
    } catch (err) {
      console.error('Detailed Booking Failure Error:', err);
      setSuccess('');
      try {
        handleFirestoreError(err, OperationType.CREATE, 'appointments');
      } catch (firestoreErr: any) {
        console.error('Firestore Error details:', firestoreErr);
        setError(`Could not book appointment. Error: ${firestoreErr.message || firestoreErr}`);
      }
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleDeleteAppointment = (apptId: string) => {
    const targetAppt = appointments.find(a => a.id === apptId) || allAppointments.find(a => a.id === apptId);
    if (!targetAppt || !currentUser) return;
    const canDelete = targetAppt.patientId === currentUser.uid || 
                      targetAppt.userId === currentUser.uid || 
                      (targetAppt as any).patientUid === currentUser.uid || 
                      userData?.role === 'admin';
    if (!canDelete) {
      setError('You are not authorized to cancel this appointment.');
      return;
    }
    setDeleteAppointmentId(apptId);
  };

  const confirmDeleteAppointment = async () => {
    if (!deleteAppointmentId || !currentUser) return;
    const apptId = deleteAppointmentId;
    const targetAppt = appointments.find(a => a.id === apptId) || allAppointments.find(a => a.id === apptId);

    if (!targetAppt) {
      setDeleteAppointmentId(null);
      return;
    }

    const canDelete = targetAppt.patientId === currentUser.uid || 
                      targetAppt.userId === currentUser.uid || 
                      (targetAppt as any).patientUid === currentUser.uid || 
                      userData?.role === 'admin';
    if (!canDelete) {
      setError('You are not authorized to cancel this appointment.');
      setDeleteAppointmentId(null);
      return;
    }

    try {
      setDeletingAppointment(true);
      setError('');
      setSuccess('');

      await deleteDoc(doc(db, 'appointments', apptId));
      setSuccess('Appointment request cancelled successfully.');
      setAppointments(prev => prev.filter(a => a.id !== apptId));
      setAllAppointments(prev => prev.filter(a => a.id !== apptId));
      setDeleteAppointmentId(null);

      await loadDoctorsAndAppointments();
    } catch (err: any) {
      console.error('Error deleting appointment:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `appointments/${apptId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to cancel appointment.');
      }
    } finally {
      setDeletingAppointment(false);
    }
  };

  // --- TAB 4: ARTICLES ACTIONS ---
  const loadArticles = async () => {
    try {
      setLoadingArticles(true);
      const snap = await getDocs(collection(db, 'articles'));
      const list: Article[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Article);
      });
      setArticles(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingArticles(false);
    }
  };

  // --- NOTIFICATIONS MANAGEMENT ---
  const handleMarkAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), {
        read: true
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearNotifications = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      const deletePromises = notifications.map(n => deleteDoc(doc(db, 'notifications', n.id)));
      await Promise.all(deletePromises);
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Real-time Blood Donors Sync
  useEffect(() => {
    if (!currentUser) return;
    setLoadingDonors(true);
    const unsubscribeDonors = onSnapshot(collection(db, 'donors'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDonors(list);
      setLoadingDonors(false);
    }, (err) => {
      console.error('Real-time donors connection error:', err);
      setError('Could not connect to live blood donors directory.');
      setLoadingDonors(false);
    });

    return () => {
      unsubscribeDonors();
    };
  }, [currentUser]);

  // Sync Tabs data
  useEffect(() => {
    loadNotifications();
    let unsubscribePosts = () => {};

    if (activeTab === 'feed') {
      setLoadingPosts(true);
      unsubscribePosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
        const list: Post[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Post);
        });
        // Sort: Pinned first, then newest first
        const sorted = list.sort((a, b) => {
          const pinA = a.pinned ? 1 : 0;
          const pinB = b.pinned ? 1 : 0;
          if (pinA !== pinB) return pinB - pinA;

          const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setPosts(sorted);
        setLoadingPosts(false);
      }, (err) => {
        console.error('Real-time feed connection error:', err);
        setError('Could not connect to live community posts feed.');
        setLoadingPosts(false);
      });
    } else if (activeTab === 'blood') {
      loadBloodRequests();
    } else if (activeTab === 'doctors') {
      loadDoctorsAndAppointments();
    } else if (activeTab === 'articles') {
      loadArticles();
    }

    return () => {
      unsubscribePosts();
    };
  }, [activeTab, currentUser]);

  // Count Unread Notifications
  const unreadCount = notifications.filter(n => !n.read).length;
  const hasActiveEmergency = bloodRequests.some(r => r.isEmergency);

  return (
    <div className="min-h-screen bg-slate-50 md:pl-64 flex flex-col font-sans">
      <Sidebar />
      <div className="p-4 md:p-8 max-w-6xl w-full mx-auto flex-1 relative">
        
        {/* Hub Header with Notification Bell */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/10 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Smart Health Community</h1>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">Discuss vitals, search emergency blood donors, and book consultations with clinicians.</p>
            </div>
          </div>

          {/* Quick Notification Bell */}
          <div className="relative self-end sm:self-auto shrink-0">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-2 text-slate-700 shadow-sm font-bold text-xs"
              id="community-notifications-bell"
            >
              <Bell className="w-4.5 h-4.5 text-indigo-600 animate-swing" />
              <span>Inbox</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-150 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  id="notifications-dropdown-panel"
                >
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-teal-400" />
                      <h3 className="font-bold text-sm">Community Notifications</h3>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearNotifications}
                        className="text-[10px] text-slate-400 hover:text-rose-400 font-extrabold uppercase tracking-wider bg-white/5 px-2 py-1 rounded"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                    {loadingNotifications ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-semibold">Synchronizing inbox...</div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs font-semibold">Your health community inbox is empty.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-3.5 text-xs transition-colors flex items-start gap-2.5 ${notif.read ? 'bg-white' : 'bg-indigo-50/40'}`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            notif.type === 'like' ? 'bg-rose-50 text-rose-500' :
                            notif.type === 'comment' ? 'bg-teal-50 text-teal-600' :
                            notif.type === 'blood_request' ? 'bg-amber-50 text-amber-500' :
                            'bg-indigo-50 text-indigo-600'
                          }`}>
                            {notif.type === 'like' && <Heart className="w-3.5 h-3.5 fill-rose-500" />}
                            {notif.type === 'comment' && <MessageSquare className="w-3.5 h-3.5" />}
                            {notif.type === 'blood_request' && <Droplet className="w-3.5 h-3.5 fill-amber-500" />}
                            {notif.type === 'appointment' && <Calendar className="w-3.5 h-3.5" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 leading-tight">
                              <span className="font-black text-slate-900">{notif.senderName}</span> {notif.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {notif.createdAt instanceof Timestamp ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>

                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 shrink-0 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Delete Post Confirmation Modal */}
        {deletePostId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Delete Post</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete this post? This action cannot be undone and will remove it permanently from the community feed.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletePostId(null)}
                  disabled={deletingPost}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePost}
                  disabled={deletingPost}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {deletingPost ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Blood Request Confirmation Modal */}
        {deleteBloodRequestId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Delete Blood Request</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete this blood request? This action cannot be undone and will remove it permanently from the system.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteBloodRequestId(null)}
                  disabled={deletingBloodRequest}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteBloodRequest}
                  disabled={deletingBloodRequest}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {deletingBloodRequest ? 'Deleting...' : 'Delete Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Appointment Confirmation Modal */}
        {deleteAppointmentId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Cancel Appointment Request</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to cancel and delete this appointment request? This action cannot be undone and will remove it permanently from the system.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteAppointmentId(null)}
                  disabled={deletingAppointment}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAppointment}
                  disabled={deletingAppointment}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer flex items-center gap-2 shadow-sm"
                  id="btn-confirm-delete-appointment"
                >
                  {deletingAppointment ? 'Cancelling...' : 'Cancel Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Notifications */}
        {error && !success && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl mb-4 border border-rose-100 flex items-start gap-2 text-sm shadow-sm" id="community-error-banner">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && !error && (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl mb-4 border border-emerald-100 flex items-start gap-2 text-sm shadow-sm animate-fade-in" id="community-success-banner">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* --- DYNAMIC COMMUNITY PLATFORM NAVIGATION TABS --- */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-150 mb-6 flex overflow-x-auto space-x-1" id="community-modules-navbar">
          {[
            { id: 'feed', label: 'Community Feed', icon: MessageSquare, color: 'text-indigo-600' },
            { id: 'blood', label: 'Blood Donation', icon: Droplet, color: 'text-rose-500' },
            { id: 'blood_donors', label: '🩸 Blood Donors', icon: Droplet, color: 'text-red-600' },
            { id: 'doctors', label: 'Clinician consultations', icon: Stethoscope, color: 'text-sky-500' },
            { id: 'articles', label: 'Health Articles', icon: BookOpen, color: 'text-emerald-600' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setShowCreateBloodRequest(false);
                  setShowBookAppointment(null);
                  setShowFullArticle(null);
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center cursor-pointer ${
                  isSel 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id={`community-tab-${tab.id}`}
              >
                <Icon className={`w-4 h-4 ${isSel ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* --- DYNAMIC MODULE PANELS VIEW --- */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            
            {/* 1. COMMUNITY FEED TAB */}
            {activeTab === 'feed' && (() => {
              const filteredPosts = posts.filter(post => {
                const matchesSearch = searchQuery.trim() === '' || 
                  post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (post.category && post.category.toLowerCase().includes(searchQuery.toLowerCase()));
                  
                const matchesCategory = selectedFilterCategory === 'ALL' || post.category === selectedFilterCategory;
                
                return matchesSearch && matchesCategory;
              });

              return (
                <motion.div
                  key="feed-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Search & Topic Filters */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm space-y-3" id="community-search-filters">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search discussions by author, topic, or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs sm:text-sm font-semibold"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Topics:</span>
                      <button
                        onClick={() => setSelectedFilterCategory('ALL')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                          selectedFilterCategory === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        All Discussions
                      </button>
                      {['Nutrition', 'Diabetes', 'Heart', 'Mental Health', 'Fitness'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedFilterCategory(cat)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                            selectedFilterCategory === cat
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Create Post Form */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm space-y-4" id="create-post-form">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-800">Publish to forum</h3>
                    </div>

                    <form onSubmit={handleCreatePost} className="space-y-4">
                      {/* Rich Text Editor Toolbar */}
                      <div className="flex items-center gap-1.5 border border-slate-150 bg-slate-50 px-2 py-1.5 rounded-lg text-slate-500">
                        <button
                          type="button"
                          onClick={() => handleInsertStyle('bold')}
                          className="p-1.5 hover:bg-slate-200 hover:text-slate-800 rounded transition cursor-pointer"
                          title="Bold Text (**bold**)"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertStyle('italic')}
                          className="p-1.5 hover:bg-slate-200 hover:text-slate-800 rounded transition cursor-pointer"
                          title="Italic Text (*italic*)"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertStyle('bullet')}
                          className="p-1.5 hover:bg-slate-200 hover:text-slate-800 rounded transition cursor-pointer"
                          title="Bullet List (- item)"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Rich Text Editor Ready</span>
                      </div>

                      <textarea
                        id="create-post-textarea"
                        placeholder={`What is on your mind, ${userData?.name || 'Community Member'}? Share wellness advice or questions... Use toolbar for formatting!`}
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium resize-none bg-slate-50/50"
                        maxLength={1000}
                        required
                      />

                      {/* Category Selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Topic Tag:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['Nutrition', 'Diabetes', 'Heart', 'Mental Health', 'Fitness'].map(cat => (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                              className={`px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                                selectedCategory === cat
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Media Upload and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer text-xs font-bold">
                            <Image className="w-3.5 h-3.5 text-slate-500" />
                            <span>{newPostImage ? 'Change Image' : 'Attach Image'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>
                          
                          {newPostImage && (
                            <div className="relative group rounded-lg overflow-hidden border border-slate-200 h-10 w-16 shadow-sm shrink-0">
                              <img src={newPostImage} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setNewPostImage(null)}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white cursor-pointer font-bold text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {1000 - newPostContent.length} left
                          </span>
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg transition-all text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer shrink-0"
                            id="btn-publish-post"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Posts List */}
                  {loadingPosts ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-150">
                      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-slate-400 text-xs font-semibold">Syncing forum with Firestore secure database...</p>
                    </div>
                  ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-150 flex flex-col items-center justify-center">
                      <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                      <h4 className="font-bold text-slate-700">No discussion threads found.</h4>
                      <p className="text-xs text-slate-400 mt-1">Refine your filters, search queries, or publish a new post!</p>
                    </div>
                  ) : (
                    <div className="space-y-4" id="community-posts-feed-container">
                      {filteredPosts.slice(0, visiblePostsCount).map((post) => {
                        const isLiked = currentUser ? post.likes?.includes(currentUser.uid) : false;
                        const isOwnPost = currentUser ? post.userId === currentUser.uid : false;
                        const isEditing = editingPostId === post.id;
                        const isDoctor = post.authorRole === 'doctor' || post.authorName.toLowerCase().startsWith('dr.') || post.authorEmail?.endsWith('@smarthealth.org');
                        const date = post.createdAt instanceof Timestamp 
                          ? post.createdAt.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Recent';

                        const isReportedByMe = currentUser && post.reportedBy?.includes(currentUser.uid);
                        const isHighlyReported = post.reportedBy && post.reportedBy.length >= 3;
                        const shouldHideContent = (isReportedByMe || isHighlyReported) && !revealedReportedPosts.has(post.id);

                        return (
                          <div 
                            key={post.id} 
                            className={`rounded-2xl border p-5 shadow-sm space-y-4 hover:border-slate-350 transition-all ${
                              post.pinned 
                                ? 'bg-amber-50/15 border-amber-200/80 shadow-amber-500/5' 
                                : 'bg-white border-slate-150'
                            }`} 
                            id={`post-card-${post.id}`}
                          >
                            {/* Post Author / Date Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {/* Premium deterministically styled avatar */}
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarGradient(post.authorName)} flex items-center justify-center border border-slate-200 uppercase font-extrabold text-sm shadow-sm shrink-0`}>
                                  {post.authorName.substring(0, 2)}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-extrabold text-sm text-slate-900">
                                      {post.authorName}
                                    </h4>
                                    
                                    {/* Doctor Verified Badge */}
                                    {isDoctor && (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                                        <CheckCircle className="w-3 h-3 text-emerald-500 fill-emerald-100" />
                                        <span>Doctor Verified</span>
                                      </span>
                                    )}

                                    {post.userId === currentUser?.uid && (
                                      <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-bold px-1.5 py-0.25 rounded uppercase">you</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                      <Clock className="w-3 h-3 text-slate-300" />
                                      <span>{date}</span>
                                    </span>
                                    
                                    {/* Category tag */}
                                    {post.category && (
                                      <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md">
                                        {post.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Edit/Delete / Pin Actions */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Pinned Badge */}
                                {post.pinned && (
                                  <span className="flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-100 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                    <Pin className="w-3 h-3 fill-amber-500 rotate-45" />
                                    <span>Pinned</span>
                                  </span>
                                )}

                                {/* Pin Toggle Button */}
                                {currentUser && (userData?.role === 'admin' || userData?.role === 'doctor' || post.userId === currentUser.uid) && (
                                  <button
                                    onClick={() => handleTogglePinPost(post)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      post.pinned 
                                        ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100/50' 
                                        : 'text-slate-400 hover:text-amber-500 border-transparent hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title={post.pinned ? "Unpin Post" : "Pin Post to top"}
                                  >
                                    <Pin className={`w-3.5 h-3.5 ${post.pinned ? 'fill-amber-500' : ''}`} />
                                  </button>
                                )}

                                {isOwnPost && (
                                  <button
                                    onClick={() => handleStartEditPost(post)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                                    title="Edit Post"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {(isOwnPost || userData?.role === 'admin') && (
                                  <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                                    title="Delete Post"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Post Content */}
                            {shouldHideContent ? (
                              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner">
                                <div className="flex items-start gap-2.5 text-rose-700">
                                  <Flag className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 fill-rose-500/10" />
                                  <div>
                                    <p className="font-extrabold text-rose-800">This post has been flagged as inappropriate.</p>
                                    <p className="text-rose-600 mt-0.5 leading-relaxed">
                                      {isReportedByMe 
                                        ? "You have reported this post. Our moderators are reviewing the content." 
                                        : `This post received multiple community reports (${post.reportedBy?.length} flags) and is hidden by default.`}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    const updated = new Set(revealedReportedPosts);
                                    updated.add(post.id);
                                    setRevealedReportedPosts(updated);
                                  }}
                                  className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm text-[11px] shrink-0 self-start sm:self-auto"
                                >
                                  Reveal Content
                                </button>
                              </div>
                            ) : isEditing ? (
                              <div className="space-y-3">
                                {/* Insertion toolbar inside editing mode */}
                                <div className="flex items-center gap-1.5 border border-slate-150 bg-slate-50 px-2 py-1 rounded-lg text-slate-500">
                                  <button
                                    type="button"
                                    onClick={() => handleInsertStyle('bold', true)}
                                    className="p-1 hover:bg-slate-200 hover:text-slate-800 rounded transition cursor-pointer"
                                    title="Bold Selection"
                                  >
                                    <Bold className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertStyle('italic', true)}
                                    className="p-1 hover:bg-slate-200 hover:text-slate-800 rounded transition cursor-pointer"
                                    title="Italic Selection"
                                  >
                                    <Italic className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertStyle('bullet', true)}
                                    className="p-1 hover:bg-slate-200 hover:text-slate-800 rounded transition cursor-pointer"
                                    title="Insert Bullet"
                                  >
                                    <List className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <textarea
                                  id="edit-post-textarea"
                                  value={editingPostContent}
                                  onChange={(e) => setEditingPostContent(e.target.value)}
                                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium resize-none"
                                  rows={3}
                                  required
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingPostId(null)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveEditPost(post.id)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                                  >
                                    Save Changes
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Rich Text Rendered Content */}
                                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                  {renderPostContent(post.content)}
                                </div>

                                {/* Post Image Attachment */}
                                {post.imageUrl && (
                                  <div className="rounded-xl overflow-hidden border border-slate-150 max-h-96 relative group shadow-sm">
                                    <img
                                      src={post.imageUrl}
                                      alt="Attached Health Topic"
                                      className="w-full h-auto object-cover max-h-96"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Active reactions summaries */}
                            {!shouldHideContent && (
                              <div className="flex flex-wrap gap-2 pt-2 items-center">
                                {/* Standard Likes */}
                                {post.likes && post.likes.length > 0 && (
                                  <button
                                    onClick={() => handleReactPost(post, 'like')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                                      currentUser && post.likes.includes(currentUser.uid)
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>👍</span>
                                    <span>{post.likes.length}</span>
                                  </button>
                                )}
                                
                                {/* Other Reaction Types */}
                                {['love', 'surprise', 'insight', 'care'].map(type => {
                                  const charMap = { love: '❤️', surprise: '😮', insight: '💡', care: '🏥' };
                                  const list = post.reactions?.[type] || [];
                                  if (list.length === 0) return null;
                                  
                                  const hasReacted = currentUser ? list.includes(currentUser.uid) : false;
                                  return (
                                    <button
                                      key={type}
                                      onClick={() => handleReactPost(post, type as any)}
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                                        hasReacted
                                          ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm'
                                          : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>{charMap[type as keyof typeof charMap]}</span>
                                      <span>{list.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Interaction Action Buttons Footer */}
                            <div className="flex items-center gap-6 pt-3 border-t border-slate-100 text-xs">
                              {/* Reactions Group with hover trigger */}
                              <div className="relative">
                                <button
                                  onClick={() => setActiveReactionMenu(activeReactionMenu === post.id ? null : post.id)}
                                  onMouseEnter={() => setActiveReactionMenu(post.id)}
                                  className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 font-bold cursor-pointer"
                                >
                                  <Smile className="w-4 h-4" />
                                  <span>React</span>
                                </button>
                                
                                <AnimatePresence>
                                  {activeReactionMenu === post.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      onMouseLeave={() => setActiveReactionMenu(null)}
                                      className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-full py-1.5 px-3.5 shadow-xl flex items-center gap-3 z-30 shrink-0"
                                    >
                                      {[
                                        { type: 'like', char: '👍', label: 'Like' },
                                        { type: 'love', char: '❤️', label: 'Love' },
                                        { type: 'surprise', char: '😮', label: 'Wow' },
                                        { type: 'insight', char: '💡', label: 'Smart' },
                                        { type: 'care', char: '🏥', label: 'Care' }
                                      ].map(emoji => {
                                        const list = emoji.type === 'like' ? post.likes : (post.reactions?.[emoji.type] || []);
                                        const hasReacted = currentUser ? list.includes(currentUser.uid) : false;
                                        
                                        return (
                                          <button
                                            key={emoji.type}
                                            onClick={() => {
                                              handleReactPost(post, emoji.type as any);
                                              setActiveReactionMenu(null);
                                            }}
                                            className={`text-xl hover:scale-125 transition duration-150 cursor-pointer p-1 rounded-full ${
                                              hasReacted ? 'bg-slate-100 scale-110' : ''
                                            }`}
                                            title={emoji.label}
                                          >
                                            {emoji.char}
                                          </button>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <button
                                onClick={() => handleToggleComments(post.id)}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 font-bold cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Comments ({comments[post.id] !== undefined ? comments[post.id].length : (post.commentsCount || 0)})</span>
                              </button>

                              {/* Flag / Report Action Button */}
                              {currentUser && (
                                <button
                                  onClick={() => handleReportPost(post)}
                                  className={`flex items-center gap-1.5 font-bold cursor-pointer transition ${
                                    post.reportedBy?.includes(currentUser.uid)
                                      ? 'text-rose-600 font-extrabold'
                                      : 'text-slate-400 hover:text-rose-600'
                                  }`}
                                  title="Report this post as inappropriate"
                                >
                                  <Flag className={`w-4 h-4 ${post.reportedBy?.includes(currentUser.uid) ? 'fill-rose-500 text-rose-600' : ''}`} />
                                  <span>{post.reportedBy?.includes(currentUser.uid) ? 'Reported' : 'Report'}</span>
                                </button>
                              )}
                            </div>

                            {/* Nested Comments Drawer Panel */}
                            <AnimatePresence>
                              {expandedPostComments === post.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-3 overflow-hidden"
                                >
                                  <h5 className="font-extrabold text-[11px] text-slate-400 uppercase tracking-wider">Comments Forum</h5>
                                  
                                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                                    {comments[post.id] && comments[post.id].length > 0 ? (
                                      comments[post.id].map((comment) => (
                                        <div key={comment.id} className="bg-white p-2.5 rounded-lg border border-slate-150 text-xs shadow-inner">
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="font-black text-slate-800">{comment.authorName}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                              {comment.createdAt instanceof Timestamp ? comment.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
                                            </span>
                                          </div>
                                          <p className="text-slate-600 font-medium">{comment.content}</p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-center text-[11px] text-slate-400 font-semibold py-4">No comments posted yet.</p>
                                    )}
                                  </div>

                                  {/* Write Comment Input Box */}
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Write a comment..."
                                      value={newCommentText[post.id] || ''}
                                      onChange={(e) => {
                                        const text = e.target.value;
                                        setNewCommentText(prev => ({ ...prev, [post.id]: text }));
                                      }}
                                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-xs font-semibold"
                                    />
                                    <button
                                      onClick={() => handleAddComment(post.id, post.userId)}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer text-xs shrink-0"
                                    >
                                      Post
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      {/* Pagination: Load More Action Button */}
                      {filteredPosts.length > visiblePostsCount && (
                        <div className="text-center pt-6 pb-2" id="community-load-more-section">
                          <button
                            onClick={() => setVisiblePostsCount(prev => prev + 10)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold px-6 py-3 rounded-xl transition shadow-sm text-xs cursor-pointer inline-flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4 text-indigo-600" />
                            <span>Load More Discussions ({filteredPosts.length - visiblePostsCount} remaining)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* 2. BLOOD DONATION MODULE */}
            {activeTab === 'blood' && (
              <motion.div
                key="blood-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Emergency Warning Banner */}
                {(() => {
                  const activeEmergencies = bloodRequests.filter(r => r.isEmergency);
                  if (activeEmergencies.length === 0) return null;
                  const latestEmergency = activeEmergencies[0];

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl p-4 sm:p-5 shadow-xl shadow-red-600/20 border border-red-500 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden"
                      id="emergency-blood-warning-banner"
                    >
                      {/* Background subtle glowing effect */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] animate-pulse" />
                      
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="bg-white/10 text-xl sm:text-2xl p-2.5 rounded-xl border border-white/25 animate-bounce shrink-0 shadow-inner">
                          🚨
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-white text-red-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shadow-sm animate-[pulse_1s_infinite]">
                              CRITICAL ALERT
                            </span>
                            <h4 className="font-extrabold text-sm sm:text-base tracking-tight">🚨 Active Emergency Blood Requests: {activeEmergencies.length}</h4>
                          </div>
                          <p className="text-white/90 text-xs mt-1 max-w-xl font-medium leading-relaxed">
                            Patient lives are currently in critical condition. Immediate compatible donors are urgently requested to contact clinical facilities below.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 relative z-10 shrink-0 w-full md:w-auto">
                        <button
                          onClick={handleViewEmergencyRequests}
                          className="flex-1 md:flex-none bg-white hover:bg-rose-50 text-red-700 font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-black/10 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>🚨 View Emergency Requests</span>
                        </button>
                        <button
                          onClick={() => handleFindMatchingDonors(latestEmergency.bloodGroup)}
                          className="flex-1 md:flex-none bg-white hover:bg-rose-50 text-red-700 font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-black/10 cursor-pointer flex items-center justify-center gap-1"
                          id="btn-find-matching-donors"
                        >
                          <span>🔍 Find Matching Donors</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Header Actions Grid */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-150 shadow-sm" id="blood-donation-bar">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Blood Group Filter:</span>
                    <select
                      value={bloodFilter}
                      onChange={(e) => setBloodFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="ALL">Show All Blood Groups</option>
                      <option value="EMERGENCY">🚨 Emergency Requests Only</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg} Group Only</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setShowCreateBloodRequest(!showCreateBloodRequest)}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-rose-500/10 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    id="btn-toggle-create-blood-request"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Blood Request</span>
                  </button>
                </div>

                {/* Create Blood Request Form Expansion */}
                <AnimatePresence>
                  {showCreateBloodRequest && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm overflow-hidden"
                      id="blood-request-creation-form"
                    >
                      <h3 className="font-extrabold text-sm text-slate-800 mb-4 flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-rose-500 fill-rose-500" />
                        <span>Post Emergency Blood Request</span>
                      </h3>

                      <form onSubmit={handleCreateBloodRequest} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="blood-patient-input">
                              Patient Full Name
                            </label>
                            <input
                              id="blood-patient-input"
                              type="text"
                              value={bloodPatientName}
                              onChange={(e) => setBloodPatientName(e.target.value)}
                              placeholder="e.g. Robert Smith"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="blood-group-input-select">
                              Blood Group Needed
                            </label>
                            <select
                              id="blood-group-input-select"
                              value={bloodGroupSelect}
                              onChange={(e) => setBloodGroupSelect(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-bold text-slate-700 cursor-pointer"
                              required
                            >
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="blood-units-input">
                              Units Required (Bags)
                            </label>
                            <input
                              id="blood-units-input"
                              type="number"
                              value={bloodUnits}
                              onChange={(e) => setBloodUnits(e.target.value !== '' ? Number(e.target.value) : '')}
                              placeholder="e.g. 2"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
                              required
                              min="1"
                              max="10"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="blood-hospital-input">
                              Hospital / Clinical Facility Location
                            </label>
                            <input
                              id="blood-hospital-input"
                              type="text"
                              value={bloodHospital}
                              onChange={(e) => setBloodHospital(e.target.value)}
                              placeholder="e.g. Memorial General, Ward 4"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="blood-contact-input">
                              Direct Contact Number
                            </label>
                            <input
                              id="blood-contact-input"
                              type="tel"
                              value={bloodContact}
                              onChange={(e) => setBloodContact(e.target.value)}
                              placeholder="e.g. +1 (555) 019-2834"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold"
                              required
                            />
                          </div>

                          <div className="flex items-center gap-2 mt-4 sm:mt-6 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                            <input
                              id="blood-emergency-checkbox"
                              type="checkbox"
                              checked={bloodIsEmergency}
                              onChange={(e) => setBloodIsEmergency(e.target.checked)}
                              className="w-4.5 h-4.5 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                            />
                            <label htmlFor="blood-emergency-checkbox" className="text-xs font-extrabold text-rose-700 uppercase tracking-wider cursor-pointer select-none">
                              Mark as HIGH EMERGENCY (Will trigger Alerts)
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="blood-desc-textarea">
                            Clinical Reason / Notes
                          </label>
                          <textarea
                            id="blood-desc-textarea"
                            value={bloodDesc}
                            onChange={(e) => setBloodDesc(e.target.value)}
                            placeholder="Provide details about patient diagnosis, bypass surgery, or urgency parameters..."
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCreateBloodRequest(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                            id="btn-submit-blood-request"
                          >
                            Publish Request
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Blood Requests Display List */}
                {loadingBlood ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-150">
                    <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 text-xs font-semibold">Connecting to blood donor database...</p>
                  </div>
                ) : (
                  (() => {
                    const filteredList = bloodRequests.filter(r => {
                      if (bloodFilter === 'EMERGENCY') return r.isEmergency;
                      return bloodFilter === 'ALL' || r.bloodGroup === bloodFilter;
                    });
                    if (filteredList.length === 0) {
                      return (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-150 flex flex-col items-center justify-center">
                          <Droplet className="w-10 h-10 text-slate-300 mb-2" />
                          <h4 className="font-bold text-slate-700">No active blood requests found.</h4>
                          <p className="text-xs text-slate-400 mt-1">Adjust your filters or submit a new request.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="blood-requests-grid">
                        {filteredList.map((req) => {
                          const date = req.createdAt instanceof Timestamp 
                            ? req.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Active';
                          const isOwnReq = currentUser ? (req.userId === currentUser.uid || userData?.role === 'admin') : false;

                          return (
                            <div 
                              key={req.id} 
                              className={`bg-white rounded-2xl border-2 p-5 shadow-sm space-y-4 relative transition-all duration-300 ${
                                highlightedRequestId === req.id
                                  ? 'border-red-600 bg-rose-50/20 ring-4 ring-red-600/50 scale-[1.02] shadow-xl shadow-red-500/35 animate-pulse z-20'
                                  : req.isEmergency 
                                    ? 'border-red-500 bg-rose-50/10 ring-2 ring-red-500/10 shadow-md shadow-red-500/5 animate-[pulse_2.5s_infinite]' 
                                    : 'border-slate-150'
                              }`}
                              id={`blood-card-${req.id}`}
                            >
                              {/* Urgent Tag Indicator - Bold Critical Emergency Badge */}
                              {req.isEmergency && (
                                <span className={`absolute -top-2.5 ${isOwnReq ? 'right-14' : 'right-4'} bg-red-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md border border-red-500 tracking-wider animate-[pulse_1.5s_infinite] flex items-center gap-1.5 z-10`}>
                                  <span className="animate-ping text-[8px]">🚨</span>
                                  <span>Critical Emergency</span>
                                </span>
                              )}

                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  {/* Giant Blood Icon */}
                                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border uppercase font-black ${
                                    req.isEmergency 
                                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/15' 
                                      : 'bg-rose-50 text-rose-500 border-rose-100'
                                  }`}>
                                    <span className="text-[10px] leading-none mt-1">Group</span>
                                    <span className="text-lg leading-none -mt-0.5">{req.bloodGroup}</span>
                                  </div>
                                  
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="font-extrabold text-sm text-slate-900">{req.patientName}</h4>
                                      {req.isEmergency && (
                                        <span className="text-sm animate-[pulse_1s_infinite] font-black" title="Critical Request">🚨</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium">Posted on {date}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {req.isEmergency && (
                                    <span className="text-2xl animate-[pulse_1s_infinite] inline-block shrink-0 select-none" title="Critical Emergency Active">
                                      🚨
                                    </span>
                                  )}
                                  {isOwnReq && (
                                    <button
                                      onClick={() => handleDeleteBloodRequest(req.id)}
                                      className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                                      title="Delete Blood Request"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2 text-xs font-medium text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Plus className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <span>Units requested: <strong className="text-slate-800 font-extrabold">{req.unitsRequired} blood bags</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Location: <strong className="text-slate-800 font-extrabold">{req.hospital}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>Contact Phone: <strong className="text-slate-800 font-extrabold">{req.contactNumber}</strong></span>
                                </div>
                              </div>

                              {req.description && (
                                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 font-medium italic">
                                  "{req.description}"
                                </p>
                              )}

                              <div className="pt-2">
                                <a
                                  href={`tel:${req.contactNumber}`}
                                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-2.5 px-4 rounded-xl transition text-center flex items-center justify-center gap-2 shadow-sm text-xs"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>Contact Emergency Donor Line</span>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </motion.div>
            )}

            {/* 2.5. BLOOD DONORS TAB */}
            {activeTab === 'blood_donors' && (
              <motion.div
                key="donors-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Status Card */}
                {currentUserDonorProfile ? (
                  <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="blood-donors-status-card">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl shrink-0">🩸</span>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-800">You are a Registered Blood Donor</h3>
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                          Status: <span className="font-extrabold">{currentUserDonorProfile.availableNow ? "Available 🟢" : "Busy 🔴"}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMyProfileModal(true)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black px-4 py-2 rounded-xl text-xs transition cursor-pointer self-start sm:self-center shrink-0 shadow-sm border border-rose-100"
                      id="btn-my-donor-profile"
                    >
                      My Donor Profile
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="blood-donors-status-card">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl shrink-0">🩸</span>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-800">Become an Emergency Blood Donor</h3>
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                          Status: <span className="font-extrabold text-slate-400">Unregistered ⚪</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={openDonorModal}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-black px-4 py-2 rounded-xl text-xs transition cursor-pointer self-start sm:self-center shrink-0 shadow-sm shadow-rose-500/15"
                      id="btn-register-as-donor"
                    >
                      Become a Donor
                    </button>
                  </div>
                )}

                {/* My Donor Profile Detail Modal */}
                <AnimatePresence>
                  {showMyProfileModal && currentUserDonorProfile && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl border border-slate-150 p-6 max-w-md w-full shadow-2xl relative overflow-y-auto max-h-[90vh]"
                        id="my-donor-profile-modal"
                      >
                        <button
                          onClick={() => {
                            setShowMyProfileModal(false);
                            setIsEditingMyProfile(false);
                          }}
                          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-full transition font-extrabold cursor-pointer"
                          id="btn-close-my-profile-modal-top"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
                          <span className="text-4xl mb-2">🩸</span>
                          <h3 className="text-lg font-black text-slate-900">My Blood Donor Profile</h3>
                          <p className="text-xs text-slate-400 mt-1">Your registered life-saving credentials</p>
                        </div>

                        <div className="py-5 space-y-4 text-xs font-semibold">
                          <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Name</span>
                            <span className="text-slate-800 font-extrabold text-sm">{currentUserDonorProfile.fullName}</span>
                          </div>

                          <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Blood Group</span>
                            <span className="bg-rose-50 text-rose-600 border border-rose-100 font-black px-2.5 py-1 rounded-lg text-xs shadow-sm">
                              {currentUserDonorProfile.bloodGroup}
                            </span>
                          </div>

                          {isEditingMyProfile ? (
                            <>
                              <div className="flex flex-col gap-1 py-1 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Phone Number</span>
                                <input
                                  type="tel"
                                  value={editMyPhone}
                                  onChange={(e) => setEditMyPhone(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold text-slate-800 bg-slate-50"
                                  placeholder="e.g. +1 (555) 012-3456"
                                  required
                                />
                              </div>

                              <div className="flex flex-col gap-1 py-1 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">District Location</span>
                                <input
                                  type="text"
                                  value={editMyDistrict}
                                  onChange={(e) => setEditMyDistrict(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold text-slate-800 bg-slate-50"
                                  placeholder="e.g. Manhattan, Bronx"
                                  required
                                />
                              </div>

                              <div className="flex flex-col gap-1 py-1 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Last Donation Date</span>
                                <input
                                  type="text"
                                  value={editMyLastDonationDate}
                                  onChange={(e) => setEditMyLastDonationDate(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold text-slate-800 bg-slate-50"
                                  placeholder="e.g. May 12, 2026 or 'None'"
                                />
                              </div>

                              <div className="flex flex-col gap-1 py-1 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Availability</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    id="my-profile-edit-available-now"
                                    type="checkbox"
                                    checked={editMyAvailableNow}
                                    onChange={(e) => setEditMyAvailableNow(e.target.checked)}
                                    className="w-4.5 h-4.5 text-rose-500 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                                  />
                                  <label htmlFor="my-profile-edit-available-now" className="text-xs font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer select-none">
                                    Available Now
                                  </label>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1 py-1 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Emergency calls</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    id="my-profile-edit-emergency-donation"
                                    type="checkbox"
                                    checked={editMyEmergencyDonation}
                                    onChange={(e) => setEditMyEmergencyDonation(e.target.checked)}
                                    className="w-4.5 h-4.5 text-rose-500 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                                  />
                                  <label htmlFor="my-profile-edit-emergency-donation" className="text-xs font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer select-none">
                                    Emergency calls (Willing to be called 24/7)
                                  </label>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Phone Number</span>
                                <span className="text-slate-800 font-extrabold select-all">{currentUserDonorProfile.phoneNumber}</span>
                              </div>

                              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">District Location</span>
                                <span className="text-slate-800 font-extrabold">{currentUserDonorProfile.district}</span>
                              </div>

                              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Last Donation Date</span>
                                <span className="text-slate-800 font-extrabold">{currentUserDonorProfile.lastDonationDate || 'First time / Unspecified'}</span>
                              </div>

                              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Availability</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  currentUserDonorProfile.availableNow 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${currentUserDonorProfile.availableNow ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  {currentUserDonorProfile.availableNow ? 'Available Now' : 'Busy'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Emergency calls</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                                  currentUserDonorProfile.emergencyDonation 
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                    : 'bg-slate-50 text-slate-400'
                                }`}>
                                  {currentUserDonorProfile.emergencyDonation ? '🚨 YES' : 'NO'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                          {isEditingMyProfile ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveMyProfile}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer text-center"
                                id="btn-my-profile-save"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setIsEditingMyProfile(false)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition cursor-pointer text-center"
                                id="btn-my-profile-cancel-edit"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditMyPhone(currentUserDonorProfile.phoneNumber || '');
                                    setEditMyDistrict(currentUserDonorProfile.district || '');
                                    setEditMyLastDonationDate(currentUserDonorProfile.lastDonationDate || '');
                                    setEditMyAvailableNow(currentUserDonorProfile.availableNow ?? true);
                                    setEditMyEmergencyDonation(currentUserDonorProfile.emergencyDonation ?? false);
                                    setIsEditingMyProfile(true);
                                  }}
                                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer text-center"
                                  id="btn-my-profile-edit"
                                >
                                  Edit Profile
                                </button>
                                <button
                                  onClick={handleDeleteDonor}
                                  className="flex-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 font-bold text-xs py-3 rounded-xl transition cursor-pointer text-center"
                                  id="btn-my-profile-leave"
                                >
                                  Leave Registry
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowMyProfileModal(false)}
                                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer text-center"
                                id="btn-my-profile-close"
                              >
                                Close
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Leave Registry Confirmation Modal */}
                <AnimatePresence>
                  {showLeaveConfirmation && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl border border-slate-150 p-6 max-w-sm w-full shadow-2xl relative"
                        id="leave-registry-confirm-modal"
                      >
                        <h3 className="text-lg font-black text-slate-900 mb-2">Leave Blood Donor Registry?</h3>
                        <p className="text-slate-500 text-xs mb-6">
                          You will no longer appear in the public donor directory.
                        </p>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowLeaveConfirmation(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition cursor-pointer text-center"
                            id="btn-confirm-leave-cancel"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setShowLeaveConfirmation(false);
                              handleConfirmLeaveRegistry();
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer text-center shadow-sm"
                            id="btn-confirm-leave-submit"
                          >
                            Leave Registry
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Directory Filters Toolbar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm space-y-4" id="donor-directory-filters">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                      <Filter className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-800">Filter Donor Directory</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Blood Group Filter */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider" htmlFor="donor-blood-filter-select">
                        Blood Group Filter
                      </label>
                      <select
                        id="donor-blood-filter-select"
                        value={donorBloodFilter}
                        onChange={(e) => setDonorBloodFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                      >
                        <option value="ALL">Show All Blood Groups</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    {/* District Filter */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider" htmlFor="donor-district-filter-select">
                        District Filter
                      </label>
                      <select
                        id="donor-district-filter-select"
                        value={donorDistrictFilter}
                        onChange={(e) => setDonorDistrictFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                      >
                        <option value="ALL">Show All Districts</option>
                        {(Array.from(new Set(donors.filter(d => d.isActive !== false).map(d => d.district?.trim()).filter(Boolean))) as string[]).map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>

                    {/* Availability Toggle Box */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-xl self-end h-10">
                      <input
                        id="donor-available-only-toggle"
                        type="checkbox"
                        checked={donorOnlyAvailableFilter}
                        onChange={(e) => setDonorOnlyAvailableFilter(e.target.checked)}
                        className="w-4.5 h-4.5 text-rose-500 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                      />
                      <label htmlFor="donor-available-only-toggle" className="text-[11px] font-black text-rose-700 uppercase tracking-wider cursor-pointer select-none">
                        Only Available Donors By Default
                      </label>
                    </div>
                  </div>
                </div>

                {/* Directory List View */}
                {loadingDonors ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm">
                    Querying community donors database...
                  </div>
                ) : (() => {
                  const filteredDonors = donors.filter(d => {
                    if (d.isActive === false) return false;
                    const matchesBlood = donorBloodFilter === 'ALL' || d.bloodGroup === donorBloodFilter;
                    const matchesDistrict = donorDistrictFilter === 'ALL' || d.district?.toLowerCase().trim() === donorDistrictFilter.toLowerCase().trim();
                    const matchesAvailability = !donorOnlyAvailableFilter || d.availableNow === true;
                    return matchesBlood && matchesDistrict && matchesAvailability;
                  });

                  if (filteredDonors.length === 0) {
                    return (
                      <div className="bg-white p-12 text-center rounded-2xl border border-slate-150 shadow-sm">
                        <Droplet className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <h3 className="font-extrabold text-slate-700 text-sm">No Matching Donors Found</h3>
                        <p className="text-slate-400 text-xs mt-1">Try relaxing your filters or check back later.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="donor-directory-grid">
                      {filteredDonors.map(donor => {
                        const isOwnCard = currentUser && donor.userId === currentUser.uid;
                        const isHighlighted = highlightedDonorGroupId && donor.bloodGroup === highlightedDonorGroupId && donor.availableNow;
                        return (
                          <div
                            key={donor.id}
                            className={`bg-white rounded-2xl border transition-all duration-300 p-5 shadow-sm hover:shadow-md relative ${
                              isHighlighted
                                ? 'border-rose-500 ring-4 ring-rose-500/30 bg-rose-50/20 scale-[1.03] shadow-lg shadow-rose-500/10'
                                : isOwnCard 
                                  ? 'border-indigo-500/40 ring-1 ring-indigo-500/10' 
                                  : 'border-slate-150'
                            }`}
                            id={`donor-card-${donor.id}`}
                          >
                            {/* Own Profile Badge */}
                            {isOwnCard && (
                              <span className="absolute -top-2.5 right-4 bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm">
                                My Profile
                              </span>
                            )}

                            {/* Top Card Info */}
                            <div className="flex justify-between items-start gap-2 mb-4">
                              <div className="space-y-1 min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="truncate">{donor.fullName}</span>
                                </h4>
                                
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{donor.district}</span>
                                </div>
                              </div>

                              {/* Large Blood Group Emblem */}
                              <span className="bg-rose-50 text-rose-600 border border-rose-100 font-black text-sm h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ml-2">
                                {donor.bloodGroup}
                              </span>
                            </div>

                            {/* Key Attributes List */}
                            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
                              <div className="flex justify-between items-center gap-2">
                                <span>Availability:</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  donor.availableNow 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${donor.availableNow ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  {donor.availableNow ? 'Available Now' : 'Busy'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center gap-2">
                                <span>Emergency calls:</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                                  donor.emergencyDonation 
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                    : 'bg-slate-50 text-slate-400'
                                }`}>
                                  {donor.emergencyDonation ? '🚨 YES' : 'NO'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center gap-2">
                                <span>Last Donation:</span>
                                <span className="text-slate-800 font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {donor.lastDonationDate || 'First time'}
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center gap-2">
                                <span>Phone Number:</span>
                                <span className="text-slate-800 font-bold flex items-center gap-1 select-all">
                                  {donor.phoneNumber}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                              <a
                                href={`tel:${donor.phoneNumber}`}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 flex-1 shadow-sm cursor-pointer text-center"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call Donor</span>
                              </a>

                              {isOwnCard && (
                                <button
                                  onClick={openDonorModal}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                                  title="Edit profile details"
                                  id={`btn-edit-donor-card-${donor.id}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Register/Update Donor Modal Overlay */}
                <AnimatePresence>
                  {showDonorModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl border border-slate-150 p-6 max-w-lg w-full shadow-2xl relative overflow-y-auto max-h-[90vh]"
                        id="donor-registration-modal"
                      >
                        <button
                          onClick={() => setShowDonorModal(false)}
                          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-full transition font-extrabold"
                          id="btn-close-donor-modal"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                          <Droplet className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
                          <span>{isEditingDonor ? 'Update Donor Profile' : 'Become a Blood Donor'}</span>
                        </h3>
                        <p className="text-slate-500 text-xs mb-6">
                          {isEditingDonor 
                            ? 'Keep your availability state and district coordinates up to date for emergency alerts.' 
                            : 'Save lives by adding your credentials to the direct community search index.'}
                        </p>

                        <form onSubmit={isEditingDonor ? handleUpdateDonor : handleRegisterDonor} className="space-y-4">
                          {/* Full Name */}
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="donor-fullname-input">
                              Full Name
                            </label>
                            <input
                              id="donor-fullname-input"
                              type="text"
                              value={donorFullName}
                              onChange={(e) => setDonorFullName(e.target.value)}
                              placeholder="e.g. Alice Cooper"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold text-slate-800"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Blood Group Select */}
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="donor-blood-select">
                                Blood Group
                              </label>
                              <select
                                id="donor-blood-select"
                                value={donorBloodGroup}
                                onChange={(e) => setDonorBloodGroup(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-bold text-slate-700 cursor-pointer"
                                required
                              >
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                  <option key={bg} value={bg}>{bg}</option>
                                ))}
                              </select>
                            </div>

                            {/* Phone Number */}
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="donor-phone-input">
                                Phone Number
                              </label>
                              <input
                                id="donor-phone-input"
                                type="tel"
                                value={donorPhone}
                                onChange={(e) => setDonorPhone(e.target.value)}
                                placeholder="e.g. +1 (555) 012-3456"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold text-slate-800"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* District */}
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="donor-district-input">
                                District
                              </label>
                              <input
                                id="donor-district-input"
                                type="text"
                                value={donorDistrict}
                                onChange={(e) => setDonorDistrict(e.target.value)}
                                placeholder="e.g. Manhattan, Bronx"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold text-slate-800"
                                required
                              />
                            </div>

                            {/* Last Donation Date */}
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="donor-last-donation-input">
                                Last Donation Date
                              </label>
                              <input
                                id="donor-last-donation-input"
                                type="text"
                                value={donorLastDonationDate}
                                onChange={(e) => setDonorLastDonationDate(e.target.value)}
                                placeholder="e.g. May 12, 2026 or 'None'"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold text-slate-800"
                              />
                            </div>
                          </div>

                          {/* Checkboxes for Toggles */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                            {/* Available Now */}
                            <div className="flex items-start gap-2">
                              <input
                                id="donor-availablenow-checkbox"
                                type="checkbox"
                                checked={donorAvailableNow}
                                onChange={(e) => setDonorAvailableNow(e.target.checked)}
                                className="w-4.5 h-4.5 text-rose-500 border-slate-300 rounded focus:ring-rose-500 cursor-pointer mt-0.5"
                              />
                              <div>
                                <label htmlFor="donor-availablenow-checkbox" className="text-xs font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer">
                                  Available Now
                                </label>
                                <p className="text-[10px] text-slate-400 leading-tight font-medium">Ready to respond and travel immediately.</p>
                              </div>
                            </div>

                            {/* Emergency Donation */}
                            <div className="flex items-start gap-2">
                              <input
                                id="donor-emergencydonation-checkbox"
                                type="checkbox"
                                checked={donorEmergencyDonation}
                                onChange={(e) => setDonorEmergencyDonation(e.target.checked)}
                                className="w-4.5 h-4.5 text-rose-500 border-slate-300 rounded focus:ring-rose-500 cursor-pointer mt-0.5"
                              />
                              <div>
                                <label htmlFor="donor-emergencydonation-checkbox" className="text-xs font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer">
                                  Emergency Calls
                                </label>
                                <p className="text-[10px] text-slate-400 leading-tight font-medium">Willing to be called 24/7 during crisis.</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setShowDonorModal(false)}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm shadow-rose-500/10"
                              id="btn-donor-submit"
                            >
                              {isEditingDonor ? 'Save Updates' : 'Register Profile'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 3. CLINICIAN CONSULTATION MODULE */}
            {activeTab === 'doctors' && (
              <motion.div
                key="doctors-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Doctor Booking Modal / Overlay Form */}
                <AnimatePresence>
                  {showBookAppointment && (() => {
                    const upcomingDates = getAllUpcomingCalendarDatesForDoctor(showBookAppointment, selectedConsultationType);
                    const selectedDateOpt = upcomingDates.find(d => d.dateStr === selectedBookingDateStr);
                    const isSelectedDateValid = selectedDateOpt && selectedDateOpt.isAvailable;
                    const firstAvailableDate = upcomingDates.find(d => d.isAvailable);
                    const activeBookingDateStr = isSelectedDateValid
                      ? selectedBookingDateStr
                      : (firstAvailableDate ? firstAvailableDate.dateStr : (upcomingDates.length > 0 ? upcomingDates[0].dateStr : ''));
                    const activeDateOpt = upcomingDates.find(d => d.dateStr === activeBookingDateStr);
                    const isDateAvailable = activeDateOpt ? activeDateOpt.isAvailable : false;
                    const activeDayName = activeDateOpt ? activeDateOpt.dayName : (activeBookingDateStr ? getDayNameFromDateStr(activeBookingDateStr) : '');
                    const generatedTimeSlots = (isDateAvailable && activeDayName)
                      ? getDoctorSlotsForDayAndType(showBookAppointment, selectedConsultationType, activeDayName)
                      : [];
                    const activeDoctorWorkingHours = getDoctorWorkingHours(showBookAppointment, selectedConsultationType);
                    const activeHoursStr = (isDateAvailable && activeDayName) ? activeDoctorWorkingHours[activeDayName] : '';
                    
                    return (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white rounded-2xl border border-slate-150 p-6 max-w-lg w-full shadow-2xl relative my-8"
                          id="appointment-booking-modal"
                        >
                          <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                            <Stethoscope className="w-5 h-5 text-sky-500" />
                            <span>Book Clinician Consultation</span>
                          </h3>
                          <p className="text-slate-500 text-xs mb-4">Choose your preferred consultation format and schedule.</p>

                          {/* Doctor Brief Info */}
                          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-2xl mb-4">
                            {showBookAppointment.avatarUrl ? (
                              <img 
                                src={showBookAppointment.avatarUrl} 
                                alt={showBookAppointment.name} 
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-black text-lg shrink-0">
                                {showBookAppointment.name.substring(4, 6)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-xs text-slate-900">{showBookAppointment.name}</h4>
                                {showBookAppointment.isOnline !== false && (
                                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Online</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">{showBookAppointment.specialty}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{showBookAppointment.hospital} • {showBookAppointment.experience} Experience</p>
                              {showBookAppointment.consultationFee && (
                                <p className="text-[10px] text-emerald-600 font-bold">Consultation Fee: {showBookAppointment.consultationFee}</p>
                              )}
                            </div>
                          </div>

                          <form onSubmit={handleBookAppointment} className="space-y-4">
                            {error && !success && (
                              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2" id="booking-error-msg">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                              </div>
                            )}
                            {success && !error && (
                              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold rounded-xl flex items-center gap-2" id="booking-success-msg">
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                <span>{success}</span>
                              </div>
                            )}

                            {/* 🩺 Step 1: Choose Consultation Type */}
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">
                                🩺 1. Choose Consultation Type
                              </label>
                              <div className="grid grid-cols-3 gap-2" id="consultation-type-selector">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedConsultationType('in_person');
                                    setSelectedBookingDateStr('');
                                    setSelectedBookingTime('');
                                    setError('');
                                    setSuccess('');
                                  }}
                                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                    selectedConsultationType === 'in_person'
                                      ? 'bg-sky-50 border-sky-500 text-sky-900 ring-2 ring-sky-500/20 shadow-sm'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                  id="btn-select-inperson"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <Building2 className={`w-4 h-4 ${selectedConsultationType === 'in_person' ? 'text-sky-600' : 'text-slate-400'}`} />
                                    {showBookAppointment.inPersonAvailable !== false && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    )}
                                  </div>
                                  <div className="font-extrabold text-xs">🏥 In-person Visit</div>
                                  <div className="text-[9px] text-slate-400 font-medium">Clinic / Hospital</div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedConsultationType('video');
                                    setSelectedBookingDateStr('');
                                    setSelectedBookingTime('');
                                    setError('');
                                    setSuccess('');
                                  }}
                                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                    selectedConsultationType === 'video'
                                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                  id="btn-select-video"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <Video className={`w-4 h-4 ${selectedConsultationType === 'video' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    {showBookAppointment.videoAvailable !== false && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    )}
                                  </div>
                                  <div className="font-extrabold text-xs">📹 Video Call</div>
                                  <div className="text-[9px] text-slate-400 font-medium">HD Encrypted</div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedConsultationType('voice');
                                    setSelectedBookingDateStr('');
                                    setSelectedBookingTime('');
                                    setError('');
                                    setSuccess('');
                                  }}
                                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                    selectedConsultationType === 'voice'
                                      ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-sm'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                  id="btn-select-voice"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <Mic className={`w-4 h-4 ${selectedConsultationType === 'voice' ? 'text-purple-600' : 'text-slate-400'}`} />
                                    {showBookAppointment.voiceAvailable !== false && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    )}
                                  </div>
                                  <div className="font-extrabold text-xs">🎤 Voice Call</div>
                                  <div className="text-[9px] text-slate-400 font-medium">Audio Session</div>
                                </button>
                              </div>
                            </div>

                            {/* 📅 Step 2: Select Consultation Date */}
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="appt-date-input">
                                📅 2. Select Date ({activeDayName || 'Choose Date'})
                              </label>
                              <select
                                id="appt-date-input"
                                value={activeBookingDateStr}
                                onChange={(e) => {
                                  setError('');
                                  setSuccess('');
                                  setSelectedBookingDateStr(e.target.value);
                                  setSelectedBookingTime(''); // reset slot when date changes
                                }}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-bold text-slate-700 cursor-pointer"
                                required
                              >
                                {upcomingDates.map((d) => (
                                  <option 
                                    key={d.dateStr} 
                                    value={d.dateStr}
                                    disabled={!d.isAvailable}
                                    className={!d.isAvailable ? 'text-slate-400 bg-slate-100 italic' : 'text-slate-800 font-bold'}
                                  >
                                    {d.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* 🕒 Step 3: Select 30-Min Time Slot */}
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">
                                🕒 3. Select Time Slot {activeHoursStr ? `(${activeHoursStr})` : ''}
                              </label>
                              {generatedTimeSlots.length === 0 ? (
                                <p className="text-slate-400 text-xs py-2 font-medium bg-slate-50 p-3 rounded-xl border border-slate-150">No available hours configured for this day.</p>
                              ) : (
                                <div className="grid grid-cols-4 gap-2">
                                  {generatedTimeSlots.map((slot) => {
                                    const isBooked = allAppointments.some(appt => 
                                      appt.doctorId === showBookAppointment.id &&
                                      appt.appointmentDate === activeBookingDateStr &&
                                      isSameTimeSlot(appt.appointmentTime, slot) &&
                                      (appt.consultationType || 'in_person') === selectedConsultationType &&
                                      appt.status !== 'declined' &&
                                      appt.status !== 'Declined' &&
                                      appt.status !== 'cancelled' &&
                                      appt.status !== 'rejected'
                                    );
                                    const isSelected = isSameTimeSlot(selectedBookingTime, slot);
                                    
                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => {
                                          setError('');
                                          setSuccess('');
                                          setSelectedBookingTime(slot);
                                        }}
                                        className={`py-2 px-1 rounded-xl text-[10px] font-bold border text-center transition cursor-pointer ${
                                          isBooked 
                                            ? 'bg-rose-50 text-rose-300 border-rose-100 line-through cursor-not-allowed'
                                            : isSelected
                                              ? 'bg-sky-500 text-white border-sky-500 shadow-md ring-2 ring-sky-500/25'
                                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                      >
                                        <div>{slot}</div>
                                        {isBooked && <div className="text-[8px] font-normal text-rose-300">Booked</div>}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              <input 
                                type="hidden" 
                                value={selectedBookingTime} 
                                required 
                              />
                            </div>

                            {/* Symptoms / Medical Concern */}
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1" htmlFor="appt-reason-input">
                                📝 Describe Symptoms / Medical Concern
                              </label>
                              <textarea
                                id="appt-reason-input"
                                value={apptReason}
                                onChange={(e) => setApptReason(e.target.value)}
                                placeholder="Please describe symptoms, ongoing medications, or medical concerns..."
                                rows={3}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-semibold resize-none"
                                required
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setError('');
                                  setSuccess('');
                                  setShowBookAppointment(null);
                                  setSelectedBookingDateStr('');
                                  setSelectedBookingTime('');
                                  setApptReason('');
                                  setSelectedSlot(null);
                                }}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isBookingSubmitting || !isDateAvailable || !activeBookingDateStr || !selectedBookingTime}
                                className={`px-4 py-2 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition ${
                                  isBookingSubmitting || !isDateAvailable || !activeBookingDateStr || !selectedBookingTime
                                    ? 'bg-slate-300 cursor-not-allowed'
                                    : 'bg-sky-500 hover:bg-sky-600 cursor-pointer shadow-sm'
                                }`}
                                id="btn-submit-appointment"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Submit Request</span>
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      </div>
                    );
                  })()}
                </AnimatePresence>

                {/* Main Doctor Directory Grid */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-sky-500" />
                      <span>Clinicians & Telemedicine Specialists Directory</span>
                    </h3>
                  </div>

                  {loadingDoctors ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-150">
                      <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-slate-400 text-xs font-semibold">Retrieving provider directories...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="doctors-directory-grid">
                      {doctors.map((docItem) => {
                        const inPersonHours = getDoctorWorkingHours(docItem, 'in_person');
                        const videoHours = getDoctorWorkingHours(docItem, 'video');
                        const voiceHours = getDoctorWorkingHours(docItem, 'voice');
                        const hasInPerson = Object.keys(inPersonHours).length > 0;
                        const hasVideo = Object.keys(videoHours).length > 0;
                        const hasVoice = Object.keys(voiceHours).length > 0;
                        const hasAnySchedule = hasInPerson || hasVideo || hasVoice;

                        return (
                          <div key={docItem.id} className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between space-y-4" id={`doctor-card-${docItem.id}`}>
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  {docItem.avatarUrl ? (
                                    <img 
                                      src={docItem.avatarUrl} 
                                      alt={docItem.name} 
                                      referrerPolicy="no-referrer"
                                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" 
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-black text-lg shrink-0">
                                      {docItem.name.substring(4, 6)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-sm text-slate-900 truncate">{docItem.name}</h4>
                                    <p className="text-[11px] text-sky-600 font-black uppercase tracking-wider">{docItem.specialty}</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{docItem.hospital}</p>
                                  </div>
                                </div>
                              </div>

                              {/* 🟢 Telemedicine Badges Bar */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {docItem.isOnline !== false && (
                                  <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>🟢 Online Now</span>
                                  </span>
                                )}
                                {hasVideo && (
                                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Video className="w-3 h-3 text-indigo-600" />
                                    <span>📹 Video Available</span>
                                  </span>
                                )}
                                {hasVoice && (
                                  <span className="text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Mic className="w-3 h-3 text-purple-600" />
                                    <span>🎤 Voice Available</span>
                                  </span>
                                )}
                                {hasInPerson && (
                                  <span className="text-[9px] font-black bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-sky-600" />
                                    <span>🏥 In-person</span>
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                {docItem.description}
                              </p>

                              {/* 📅 Available Working Days and Hours per Type */}
                              <div className="text-[11px] font-semibold text-slate-600 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-sky-500" />
                                  <span>📅 Available Schedules</span>
                                </div>

                                {!hasAnySchedule && (
                                  <p className="text-[10px] text-slate-400 font-medium">No active working schedules configured yet.</p>
                                )}

                                {hasInPerson && (
                                  <div>
                                    <div className="text-[9px] text-sky-700 font-extrabold uppercase flex items-center gap-1 mb-0.5">
                                      <Building2 className="w-3 h-3" /> In-person Visit:
                                    </div>
                                    {Object.entries(inPersonHours).map(([day, hours]) => (
                                      <div key={day} className="flex justify-between items-center text-[10px] pl-2 text-slate-600">
                                        <span className="font-bold">{day}</span>
                                        <span className="font-medium">{hours}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {hasVideo && (
                                  <div className="pt-1 border-t border-slate-200/60">
                                    <div className="text-[9px] text-indigo-700 font-extrabold uppercase flex items-center gap-1 mb-0.5">
                                      <Video className="w-3 h-3" /> Video Consultation:
                                    </div>
                                    {Object.entries(videoHours).map(([day, hours]) => (
                                      <div key={day} className="flex justify-between items-center text-[10px] pl-2 text-slate-600">
                                        <span className="font-bold">{day}</span>
                                        <span className="font-medium">{hours}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {hasVoice && (
                                  <div className="pt-1 border-t border-slate-200/60">
                                    <div className="text-[9px] text-purple-700 font-extrabold uppercase flex items-center gap-1 mb-0.5">
                                      <Mic className="w-3 h-3" /> Voice Consultation:
                                    </div>
                                    {Object.entries(voiceHours).map(([day, hours]) => (
                                      <div key={day} className="flex justify-between items-center text-[10px] pl-2 text-slate-600">
                                        <span className="font-bold">{day}</span>
                                        <span className="font-medium">{hours}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 📅 Dynamic Next Available Appointment Display */}
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                                <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">🌟 Next Available Slot</div>
                                  <div className="text-emerald-600 font-extrabold truncate">{getNextAvailableAppointment(docItem, allAppointments)}</div>
                                </div>
                              </div>
                            </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 font-extrabold uppercase tracking-wide px-2 py-0.5 rounded">
                                {docItem.experience}
                              </span>
                              {docItem.consultationFee && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 font-extrabold uppercase tracking-wide px-2 py-0.5 rounded">
                                  {docItem.consultationFee} Fee
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setShowBookAppointment(docItem);
                                setSelectedConsultationType('in_person');
                                setSelectedBookingDateStr('');
                                setSelectedBookingTime('');
                                setApptReason('');
                              }}
                              className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold px-3 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                              id={`btn-book-doctor-${docItem.id}`}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Book Consultation</span>
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Appointments Log / Request List */}
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <span>My Appointment Requests & Consultation History</span>
                    </h3>
                  </div>

                  {appointments.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200" id="no-appointments-history">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-xs font-semibold">No appointment consultation records.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Book slots above with certified clinic practitioners.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-sm overflow-x-auto" id="appointments-table-container">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                            <th className="p-3.5 font-bold">Doctor</th>
                            <th className="p-3.5 font-bold">Specialty</th>
                            <th className="p-3.5 font-bold">Type</th>
                            <th className="p-3.5 font-bold text-center">Session Date / Slot</th>
                            <th className="p-3.5 font-bold">Status</th>
                            <th className="p-3.5 text-right font-bold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {appointments.map((appt) => {
                            const isOnlineAppt = appt.consultationType === 'video' || appt.consultationType === 'voice';
                            
                            return (
                              <tr key={appt.id} className="text-xs hover:bg-slate-50/40 transition">
                                <td className="p-3.5 font-extrabold text-slate-900">{appt.doctorName}</td>
                                <td className="p-3.5 font-medium text-slate-500">{appt.doctorSpecialty}</td>
                                <td className="p-3.5">
                                  {appt.consultationType === 'video' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      <Video className="w-3 h-3 text-indigo-600" />
                                      <span>Video Call</span>
                                    </span>
                                  ) : appt.consultationType === 'voice' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                      <Mic className="w-3 h-3 text-purple-600" />
                                      <span>Voice Call</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                                      <Building2 className="w-3 h-3 text-sky-600" />
                                      <span>In-person</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 text-center font-bold text-slate-700">
                                  <div>{appt.appointmentDate}</div>
                                  <div className="text-[9px] text-slate-400 font-normal">{appt.appointmentTime}</div>
                                </td>
                                <td className="p-3.5">
                                  {(() => {
                                    const raw = (appt.status || 'pending').toLowerCase();
                                    const isApproved = raw === 'approved' || raw === 'confirmed';
                                    const isCompleted = raw === 'completed';
                                    const isRejected = raw === 'rejected' || raw === 'cancelled' || raw === 'declined';
                                    const text = isApproved ? 'APPROVED' : isCompleted ? 'COMPLETED' : isRejected ? 'REJECTED' : 'PENDING';
                                    const badgeClass = isApproved
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isCompleted
                                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                                      : isRejected
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';

                                    return (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${badgeClass}`}>
                                        {text}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="p-3.5 text-right flex items-center justify-end gap-1.5">
                                  {/* Join Buttons for Online Appointments (Active when Approved) */}
                                  {isOnlineAppt && (() => {
                                    const raw = (appt.status || 'pending').toLowerCase();
                                    const isApproved = raw === 'approved' || raw === 'confirmed';
                                    if (!isApproved) return null;

                                    return appt.consultationType === 'video' ? (
                                      <button
                                        onClick={() => {
                                          setActiveTelemedicineCall(appt);
                                          setIsMicMuted(false);
                                          setIsVideoOff(false);
                                        }}
                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1 shadow-sm transition cursor-pointer"
                                        title="Join HD Video Call"
                                        id={`btn-join-video-${appt.id}`}
                                      >
                                        <Video className="w-3 h-3 animate-pulse" />
                                        <span>Join Video</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setActiveTelemedicineCall(appt);
                                          setIsMicMuted(false);
                                          setIsVideoOff(false);
                                        }}
                                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1 shadow-sm transition cursor-pointer"
                                        title="Join Voice Call"
                                        id={`btn-join-voice-${appt.id}`}
                                      >
                                        <Mic className="w-3 h-3 animate-pulse" />
                                        <span>Join Voice</span>
                                      </button>
                                    );
                                  })()}
                                  <button
                                    onClick={() => handleDeleteAppointment(appt.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                    title="Cancel Request"
                                    id={`btn-delete-appt-${appt.id}`}
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

                {/* 📹 Telemedicine Interactive Room Simulation Modal */}
                <AnimatePresence>
                  {activeTelemedicineCall && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full text-white shadow-2xl relative space-y-6"
                        id="telemedicine-call-room-modal"
                      >
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                              {activeTelemedicineCall.consultationType === 'video' ? (
                                <Video className="w-6 h-6 animate-pulse" />
                              ) : (
                                <Mic className="w-6 h-6 animate-pulse" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                                <span>Encrypted Telehealth Consultation Room</span>
                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  <Wifi className="w-3 h-3" /> Live Connected
                                </span>
                              </h3>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {activeTelemedicineCall.doctorName} • {activeTelemedicineCall.doctorSpecialty}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTelemedicineCall(null)}
                            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Video / Audio Preview Canvas */}
                        <div className="relative aspect-video bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                          {activeTelemedicineCall.consultationType === 'video' ? (
                            isVideoOff ? (
                              <div className="space-y-2">
                                <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
                                  <VideoOff className="w-8 h-8" />
                                </div>
                                <p className="text-slate-400 text-xs font-bold">Your Video Stream is Muted</p>
                              </div>
                            ) : (
                              <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 rounded-xl p-4">
                                <div className="w-20 h-20 rounded-full bg-indigo-600/30 border-2 border-indigo-500 flex items-center justify-center text-white font-black text-xl mb-3 shadow-lg shadow-indigo-500/20 animate-pulse">
                                  {activeTelemedicineCall.doctorName.substring(4, 6)}
                                </div>
                                <h4 className="font-extrabold text-sm text-white">{activeTelemedicineCall.doctorName}</h4>
                                <p className="text-[11px] text-indigo-300 font-medium">{activeTelemedicineCall.hospital}</p>

                                {/* Animated Audio Equalizer Visualizer */}
                                <div className="flex items-center gap-1 mt-4">
                                  <span className="w-1 h-6 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                  <span className="w-1 h-10 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                  <span className="w-1 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                                  <span className="w-1 h-8 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                  <span className="w-1 h-5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="space-y-3">
                              <div className="w-20 h-20 rounded-full bg-purple-600/30 border-2 border-purple-500 flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-purple-500/20 animate-pulse">
                                {activeTelemedicineCall.doctorName.substring(4, 6)}
                              </div>
                              <h4 className="font-extrabold text-sm text-white">{activeTelemedicineCall.doctorName}</h4>
                              <p className="text-[11px] text-purple-300 font-medium">Voice Consultation Session</p>

                              {/* Animated Audio Equalizer Visualizer */}
                              <div className="flex items-center justify-center gap-1 mt-2">
                                <span className="w-1 h-5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <span className="w-1 h-8 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                                <span className="w-1 h-10 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <span className="w-1 h-6 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                <span className="w-1 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              </div>
                            </div>
                          )}

                          {/* Overlay Session info */}
                          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-3 py-1 rounded-xl text-[10px] font-bold text-slate-300 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Session Time: {activeTelemedicineCall.appointmentTime} ({activeTelemedicineCall.appointmentDate})</span>
                          </div>
                        </div>

                        {/* Controls Toolbar */}
                        <div className="flex items-center justify-center gap-4 pt-2">
                          {/* Mic Toggle */}
                          <button
                            onClick={() => setIsMicMuted(!isMicMuted)}
                            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-2 ${
                              isMicMuted 
                                ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                            }`}
                            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                          >
                            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            <span className="text-xs font-extrabold">{isMicMuted ? 'Unmute' : 'Mute'}</span>
                          </button>

                          {/* Video Toggle (Only for video calls) */}
                          {activeTelemedicineCall.consultationType === 'video' && (
                            <button
                              onClick={() => setIsVideoOff(!isVideoOff)}
                              className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-2 ${
                                isVideoOff 
                                  ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                                  : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                              }`}
                              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                            >
                              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                              <span className="text-xs font-extrabold">{isVideoOff ? 'Start Camera' : 'Stop Camera'}</span>
                            </button>
                          )}

                          {/* End Call Button */}
                          <button
                            onClick={() => setActiveTelemedicineCall(null)}
                            className="px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                            id="btn-leave-telemedicine-call"
                          >
                            <PhoneOff className="w-5 h-5" />
                            <span>Leave Call</span>
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 4. HEALTH ARTICLES TAB */}
            {activeTab === 'articles' && (
              <motion.div
                key="articles-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Full Reading Page View (Overlay or inline switcher) */}
                {showFullArticle ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl border border-slate-150 p-6 sm:p-8 shadow-md space-y-6"
                    id="full-article-reading-canvas"
                  >
                    <button
                      onClick={() => setShowFullArticle(null)}
                      className="text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      &larr; Back to Library
                    </button>

                    <div className="space-y-3">
                      <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded">
                        {showFullArticle.category}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                        {showFullArticle.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>By <strong>{showFullArticle.author}</strong></span>
                        <span>&bull;</span>
                        <span>{showFullArticle.readTime} reading time</span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-500 bg-slate-50 p-4 border-l-4 border-slate-300 italic rounded-r-xl">
                      "{showFullArticle.summary}"
                    </p>

                    <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium space-y-4 pt-2">
                      {showFullArticle.content}
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-semibold">
                      <span>Educational medical materials</span>
                      <span>Verified clinical content</span>
                    </div>
                  </motion.div>
                ) : (
                  /* Articles Directory List */
                  <div className="space-y-6">
                    {/* Categories Filter Strip */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1" id="article-categories-filter">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Categories:</span>
                      {['ALL', 'Cardiology', 'Diabetes', 'Nutrition', 'Mental Health'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setArticleCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                            articleCategoryFilter === cat 
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10' 
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Articles Grid list */}
                    {loadingArticles ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-150">
                        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 text-xs font-semibold">Syncing medical directories...</p>
                      </div>
                    ) : (
                      (() => {
                        const filtered = articles.filter(a => articleCategoryFilter === 'ALL' || a.category === articleCategoryFilter);
                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-150">
                              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-400 text-xs font-semibold">No medical articles matching filters.</p>
                            </div>
                          );
                        }
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="articles-directory-grid">
                            {filtered.map((art) => (
                              <div key={art.id} className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition" id={`article-card-${art.id}`}>
                                <div className="space-y-3">
                                  <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 rounded">
                                    {art.category}
                                  </span>
                                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{art.title}</h4>
                                  <p className="text-xs text-slate-500 font-medium line-clamp-3">
                                    {art.summary}
                                  </p>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                  <span className="text-slate-400 font-medium">By {art.author}</span>
                                  <button
                                    onClick={() => setShowFullArticle(art)}
                                    className="text-emerald-600 hover:text-emerald-800 font-black flex items-center gap-1 cursor-pointer"
                                    id={`btn-read-article-${art.id}`}
                                  >
                                    <span>Read Full</span>
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
