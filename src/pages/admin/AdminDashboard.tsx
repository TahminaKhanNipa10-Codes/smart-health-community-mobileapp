import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  Users, 
  UserCheck, 
  Droplet, 
  HeartHandshake, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Siren, 
  BookOpen, 
  ArrowUpRight, 
  Clock, 
  Activity, 
  ShieldCheck,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface StatCounts {
  users: number;
  doctors: number;
  bloodDonors: number;
  bloodRequests: number;
  appointments: number;
  posts: number;
  medicalRecords: number;
  emergencyRequests: number;
  articles: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  time: string;
  badgeColor: string;
}

export default function AdminDashboard({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const [stats, setStats] = useState<StatCounts>({
    users: 0,
    doctors: 0,
    bloodDonors: 0,
    bloodRequests: 0,
    appointments: 0,
    posts: 0,
    medicalRecords: 0,
    emergencyRequests: 0,
    articles: 0
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      const [
        usersSnap,
        doctorsSnap,
        donorsSnap,
        bloodReqSnap,
        apptsSnap,
        postsSnap,
        recordsSnap,
        emergencySnap,
        articlesSnap
      ] = await Promise.all([
        getDocs(collection(db, 'users')).catch(() => null),
        getDocs(collection(db, 'doctors')).catch(() => null),
        getDocs(collection(db, 'donors')).catch(() => null),
        getDocs(collection(db, 'blood_requests')).catch(() => null),
        getDocs(collection(db, 'appointments')).catch(() => null),
        getDocs(collection(db, 'posts')).catch(() => null),
        getDocs(collection(db, 'medical_reports')).catch(() => null),
        getDocs(collection(db, 'emergency_requests')).catch(() => null),
        getDocs(collection(db, 'articles')).catch(() => null)
      ]);

      const usersCount = usersSnap ? usersSnap.size : 0;
      const doctorsCount = doctorsSnap ? doctorsSnap.size : 0;
      const donorsCount = donorsSnap ? donorsSnap.size : 0;
      const bloodRequestsCount = bloodReqSnap ? bloodReqSnap.size : 0;
      const appointmentsCount = apptsSnap ? apptsSnap.size : 0;
      const postsCount = postsSnap ? postsSnap.size : 0;
      const recordsCount = recordsSnap ? recordsSnap.size : 0;
      
      // Count emergency requests + emergency blood requests
      let emergencyCount = emergencySnap ? emergencySnap.size : 0;
      if (bloodReqSnap) {
        bloodReqSnap.forEach((doc) => {
          if (doc.data().isEmergency || doc.data().urgency === 'Emergency') {
            emergencyCount++;
          }
        });
      }

      const articlesCount = articlesSnap ? articlesSnap.size : 0;

      setStats({
        users: usersCount,
        doctors: doctorsCount,
        bloodDonors: donorsCount,
        bloodRequests: bloodRequestsCount,
        appointments: appointmentsCount,
        posts: postsCount,
        medicalRecords: recordsCount,
        emergencyRequests: emergencyCount,
        articles: articlesCount
      });

      // Assemble recent activities
      const activities: RecentActivity[] = [];

      if (apptsSnap) {
        apptsSnap.forEach((d) => {
          const data = d.data();
          activities.push({
            id: d.id,
            type: 'Appointment',
            title: `Appointment: ${data.patientName || 'Patient'} with Dr. ${data.doctorName || 'Doctor'}`,
            subtitle: `Date: ${data.date || 'TBD'} (${data.status || 'PENDING'})`,
            time: formatTime(data.createdAt),
            badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
          });
        });
      }

      if (bloodReqSnap) {
        bloodReqSnap.forEach((d) => {
          const data = d.data();
          activities.push({
            id: d.id,
            type: 'Blood Request',
            title: `Blood Request (${data.bloodGroup || 'Any'}): ${data.patientName || 'Patient'}`,
            subtitle: `${data.hospital || 'Hospital'} • Urgency: ${data.urgency || 'Normal'}`,
            time: formatTime(data.createdAt),
            badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
          });
        });
      }

      if (postsSnap) {
        postsSnap.forEach((d) => {
          const data = d.data();
          activities.push({
            id: d.id,
            type: 'Community Post',
            title: `Post by ${data.authorName || 'User'}: "${(data.content || '').substring(0, 45)}..."`,
            subtitle: `Category: ${data.category || 'General'}`,
            time: formatTime(data.createdAt),
            badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
          });
        });
      }

      // Sort activities newest first
      activities.sort((a, b) => b.id.localeCompare(a.id));
      setRecentActivities(activities.slice(0, 8));

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'Recent';
    if (ts instanceof Timestamp) {
      return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return String(ts).substring(0, 10);
  };

  const statCards = [
    { id: 'users', label: 'Total Users', count: stats.users, icon: Users, color: 'from-blue-600 to-indigo-600', iconBg: 'bg-blue-50 text-blue-600' },
    { id: 'doctors', label: 'Doctors', count: stats.doctors, icon: UserCheck, color: 'from-sky-500 to-teal-600', iconBg: 'bg-sky-50 text-sky-600' },
    { id: 'donors', label: 'Blood Donors', count: stats.bloodDonors, icon: Droplet, color: 'from-rose-500 to-red-600', iconBg: 'bg-rose-50 text-rose-600' },
    { id: 'blood-requests', label: 'Blood Requests', count: stats.bloodRequests, icon: HeartHandshake, color: 'from-pink-500 to-rose-600', iconBg: 'bg-pink-50 text-pink-600' },
    { id: 'appointments', label: 'Appointments', count: stats.appointments, icon: Calendar, color: 'from-purple-600 to-indigo-600', iconBg: 'bg-purple-50 text-purple-600' },
    { id: 'posts', label: 'Community Posts', count: stats.posts, icon: MessageSquare, color: 'from-teal-500 to-emerald-600', iconBg: 'bg-teal-50 text-teal-600' },
    { id: 'medical-records', label: 'Medical Records', count: stats.medicalRecords, icon: FileText, color: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-50 text-amber-600' },
    { id: 'emergency', label: 'Emergency Requests', count: stats.emergencyRequests, icon: Siren, color: 'from-red-600 to-rose-700', iconBg: 'bg-red-50 text-red-600' },
    { id: 'articles', label: 'Health Articles', count: stats.articles, icon: BookOpen, color: 'from-emerald-500 to-teal-700', iconBg: 'bg-emerald-50 text-emerald-600' }
  ];

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-rose-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Smart Health Admin Control Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Operations Overview</h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Real-time monitoring and administrative control across all healthcare services, appointments, users, emergency dispatches, and medical content.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardStats}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              id="btn-admin-refresh-stats"
            >
              <Activity className={`w-4 h-4 text-teal-400 ${loading ? 'animate-spin' : ''}`} />
              Refresh Real-time Data
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => onNavigateTab(card.id)}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 group cursor-pointer flex flex-col justify-between"
              id={`stat-card-${card.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                  <div className="text-3xl font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                    {loading ? (
                      <span className="inline-block w-12 h-8 bg-slate-100 rounded-md animate-pulse" />
                    ) : (
                      card.count
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-2xl ${card.iconBg} border border-slate-100 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-600">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-500" /> Active System Records
                </span>
                <span className="font-bold text-rose-600 group-hover:underline flex items-center gap-0.5">
                  Manage <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Operations Log */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Platform Operations</h3>
                <p className="text-xs text-slate-500">Latest activity across appointments, blood requests, and community</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">Live Feed</span>
          </div>

          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No recent platform activity found.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${act.badgeColor}`}>
                        {act.type}
                      </span>
                      <p className="text-xs font-bold text-slate-900 truncate">{act.title}</p>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{act.subtitle}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">{act.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Quick Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Quick Admin Actions</h3>
              <p className="text-xs text-slate-500">Instant management shortcuts</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigateTab('users')}
              className="w-full text-left p-3 rounded-xl border border-slate-150 hover:border-blue-300 hover:bg-blue-50/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Manage Users & Roles</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </button>

            <button
              onClick={() => onNavigateTab('doctors')}
              className="w-full text-left p-3 rounded-xl border border-slate-150 hover:border-sky-300 hover:bg-sky-50/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">Verify Doctors & Profiles</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
            </button>

            <button
              onClick={() => onNavigateTab('blood-requests')}
              className="w-full text-left p-3 rounded-xl border border-slate-150 hover:border-rose-300 hover:bg-rose-50/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HeartHandshake className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-slate-800">Review Blood Requests</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
            </button>

            <button
              onClick={() => onNavigateTab('emergency')}
              className="w-full text-left p-3 rounded-xl border border-slate-150 hover:border-red-300 hover:bg-red-50/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Siren className="w-4 h-4 text-red-600" />
                <span className="text-xs font-bold text-slate-800">Emergency Dispatches</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
            </button>

            <button
              onClick={() => onNavigateTab('articles')}
              className="w-full text-left p-3 rounded-xl border border-slate-150 hover:border-emerald-300 hover:bg-emerald-50/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Publish Health Article</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
