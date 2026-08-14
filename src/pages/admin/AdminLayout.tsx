import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Droplet, 
  HeartHandshake, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Siren, 
  BookOpen, 
  LogOut, 
  ArrowLeft, 
  Activity, 
  ChevronRight 
} from 'lucide-react';

import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminDoctors from './AdminDoctors';
import AdminBloodDonors from './AdminBloodDonors';
import AdminBloodRequests from './AdminBloodRequests';
import AdminAppointments from './AdminAppointments';
import AdminPosts from './AdminPosts';
import AdminMedicalRecords from './AdminMedicalRecords';
import AdminEmergency from './AdminEmergency';
import AdminArticles from './AdminArticles';

export default function AdminLayout() {
  const { userData, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'doctors', label: 'Doctor Listings', icon: UserCheck },
    { id: 'donors', label: 'Blood Donors', icon: Droplet },
    { id: 'blood-requests', label: 'Blood Requests', icon: HeartHandshake },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'posts', label: 'Community Posts', icon: MessageSquare },
    { id: 'medical-records', label: 'Medical Records', icon: FileText },
    { id: 'emergency', label: 'Emergency Dispatches', icon: Siren },
    { id: 'articles', label: 'Health Articles', icon: BookOpen }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Admin Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-2 text-xs font-bold"
            title="Back to User App"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">User Platform</span>
          </Link>
          <div className="h-5 w-px bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600/20 text-rose-400 rounded-xl border border-rose-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                Smart Health <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] uppercase font-black">Admin Panel</span>
              </h1>
              <p className="text-[11px] text-slate-400">System Governance & Control Center</p>
            </div>
          </div>
        </div>

        {/* Admin Profile Info */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
              {(userData?.name || 'Admin')[0].toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">{userData?.name || 'Administrator'}</div>
              <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wide">{userData?.role || 'admin'}</div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 p-4 shrink-0 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">
            Management Sections
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  id={`admin-nav-tab-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-slate-100 text-slate-900 p-4 sm:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && <AdminDashboard onNavigateTab={setActiveTab} />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'doctors' && <AdminDoctors />}
          {activeTab === 'donors' && <AdminBloodDonors />}
          {activeTab === 'blood-requests' && <AdminBloodRequests />}
          {activeTab === 'appointments' && <AdminAppointments />}
          {activeTab === 'posts' && <AdminPosts />}
          {activeTab === 'medical-records' && <AdminMedicalRecords />}
          {activeTab === 'emergency' && <AdminEmergency />}
          {activeTab === 'articles' && <AdminArticles />}
        </main>
      </div>
    </div>
  );
}
