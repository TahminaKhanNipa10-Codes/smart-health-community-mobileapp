import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  User, 
  LogOut, 
  Menu, 
  X, 
  HeartPulse,
  Activity,
  Calendar,
  Search,
  Users,
  ShieldCheck,
  FileText,
  ShieldAlert,
  Stethoscope
} from 'lucide-react';

import AIAssistantModal from './AIAssistantModal';

export default function Sidebar() {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Health Tracker', path: '/tracker', icon: Activity },
    { name: 'Medical Records', path: '/medical-records', icon: FileText },
    { name: 'Community Hub', path: '/community', icon: Users },
    { name: 'Emergency Services', path: '/emergency', icon: ShieldAlert },
    { name: 'My Profile', path: '/profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white flex justify-between p-4 md:hidden items-center shadow-md">
        <div className="flex items-center space-x-2">
          <HeartPulse className="h-6 w-6 text-teal-400 animate-pulse" />
          <span className="font-bold text-lg tracking-wider text-teal-300">Smart Health</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none p-1 text-slate-400 hover:text-white" id="mobile-menu-toggle">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation Panel */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-100 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between border-r border-slate-900 shadow-2xl`}>
        <div>
          {/* Brand Logo Header */}
          <div className="h-20 flex items-center px-6 bg-slate-900 border-b border-slate-900">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20">
                <HeartPulse className="h-6 w-6 text-teal-400" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white bg-gradient-to-r from-teal-400 to-sky-400 bg-clip-text text-transparent">
                Smart Health
              </span>
            </div>
          </div>

          {/* User Info Overview */}
          {userData && (
            <div className="p-5 bg-slate-900/50 border-b border-slate-900">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Authenticated As</p>
              <p className="font-semibold text-teal-300 truncate text-sm">{userData.name || 'Community Member'}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{userData.email}</p>
              
              <div className="flex items-center gap-1.5 mt-3">
                {userData.role === 'admin' ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                  </span>
                ) : userData.role === 'doctor' ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                    <Users className="w-3 h-3 mr-1" /> Doctor
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase tracking-wider">
                    <Activity className="w-3 h-3 mr-1" /> General User
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="mt-6 px-4 space-y-1.5">
            {userData?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-rose-600 text-white font-medium shadow-md shadow-rose-900/30'
                    : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20'
                }`}
                id="nav-link-admin-panel"
              >
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <span className="font-bold">Admin Panel</span>
              </Link>
            )}
            {userData?.role === 'doctor' && (
              <Link
                to="/doctor-panel"
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2 ${
                  location.pathname.startsWith('/doctor')
                    ? 'bg-sky-600 text-white font-medium shadow-md shadow-sky-900/30'
                    : 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20'
                }`}
                id="nav-link-doctor-workspace"
              >
                <Stethoscope className="w-5 h-5 text-sky-400" />
                <span className="font-bold">Doctor Workspace</span>
              </Link>
            )}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-teal-600 text-white font-medium shadow-md shadow-teal-900/30'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                  id={`nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout section */}
        <div className="p-4 border-t border-slate-900">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-colors duration-200 font-medium text-sm"
            id="logout-button"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay to dismiss open drawer menu on mobile viewports */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden"
          id="sidebar-overlay"
        />
      )}

      {/* Floating AI Health Assistant Modal Component */}
      <AIAssistantModal />
    </>
  );
}
