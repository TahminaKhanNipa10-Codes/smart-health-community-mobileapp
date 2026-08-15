import React from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Link } from 'react-router-dom';
import { 
  HeartPulse, 
  User, 
  Activity, 
  Calendar, 
  Stethoscope, 
  Plus, 
  ArrowRight,
  TrendingUp,
  Droplet
} from 'lucide-react';

export default function Dashboard() {
  const { userData } = useAuth();

  // Dynamic BMI Calculation helper
  const heightInMeters = userData?.height ? Number(userData.height) / 100 : 0;
  const weight = userData?.weight ? Number(userData.weight) : 0;
  const bmi = heightInMeters > 0 && weight > 0 ? (weight / (heightInMeters * heightInMeters)).toFixed(1) : null;
  const bmiNumber = bmi ? Number(bmi) : 0;

  const getBmiCategory = (bmiVal: number) => {
    if (bmiVal < 18.5) return { label: 'Underweight', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    if (bmiVal < 25) return { label: 'Normal Weight', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (bmiVal < 30) return { label: 'Overweight', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Obese', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
  };

  const bmiCategory = bmiNumber ? getBmiCategory(bmiNumber) : null;

  return (
    <div className="min-h-screen bg-slate-50 md:pl-64 flex flex-col">
      <Sidebar />
      <div className="p-6 max-w-6xl w-full mx-auto flex-1">
        
        {/* Welcome Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Community Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Unified summary of your clinical measurements, practitioner consultations, and support forums.</p>
        </header>

        {/* Highlight Banner */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-sky-700 rounded-3xl p-6 md:p-8 text-white mb-8 shadow-xl relative overflow-hidden">
          {/* Ambient circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl"></div>

          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white uppercase tracking-wider mb-3">
              Phase 1 Active
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Hello, {userData?.name || 'Valued Member'}!</h2>
            <p className="text-teal-100 text-sm md:text-base leading-relaxed mb-6">
              Welcome to the Smart Health Community. Your database node and authentication scopes are now securely provisioned. Review or update your profile metrics to customize recommendations.
            </p>
            <Link 
              to="/profile" 
              className="inline-flex items-center gap-2 bg-white text-teal-700 hover:bg-slate-100 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-teal-900/10 cursor-pointer"
            >
              <span>Manage My Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main profile vitals summary */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-500" />
              <span>Personal Vitals Summary</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Blood Group</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2 flex items-center gap-1">
                  <Droplet className="w-5 h-5 text-rose-500 fill-rose-500" />
                  <span>{userData?.bloodGroup || 'Not set'}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Height</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2">
                  {userData?.height ? `${userData.height} cm` : 'Not set'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weight</span>
                <p className="text-xl font-extrabold text-slate-800 mt-2">
                  {userData?.weight ? `${userData.weight} kg` : 'Not set'}
                </p>
              </div>

            </div>

            {/* Dynamic Calculated BMI display */}
            {bmi ? (
              <div className="mt-6 p-4 rounded-2xl bg-teal-50/50 border border-teal-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
                    <Activity className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Calculated Body Mass Index (BMI)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Based on your latest profile metrics</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-850 tracking-tight">{bmi}</p>
                    {bmiCategory && (
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded border mt-0.5 uppercase tracking-wide ${bmiCategory.color}`}>
                        {bmiCategory.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-sm text-slate-500">
                Provide both your <strong>height</strong> and <strong>weight</strong> in your profile settings to dynamically compute your BMI score here.
              </div>
            )}
          </div>

          {/* Upcoming features queue / Community links */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-500" />
                <span>Next Milestones</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-teal-600">P2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Health Tracker Logs</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Water, Blood Sugar, and Blood Pressure logs visualised dynamically.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-sky-600">P3</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Doctor & Appointment Services</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Find nearby practitioners and book slots securely.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-indigo-600">P4</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Blood & Organ Community</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Register as donors and submit emergency requests.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
              Milestone roadmap is verified & secure.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
