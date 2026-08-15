import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, UserPlus, AlertCircle } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'doctor'>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters long");
    }

    try {
      setError('');
      setLoading(true);
      await registerWithEmail(email, password, name, role);
      navigate('/');
    } catch (err: any) {
      let friendlyError = "Failed to create account.";
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = "An account already exists with this email address.";
      } else if (err.code === 'auth/weak-password') {
        friendlyError = "Password is too weak. Must be at least 6 characters.";
      } else if (err.message) {
        friendlyError = err.message.replace("Firebase: ", "");
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "") || "Google Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-teal-500/10 rounded-2xl border border-teal-500/20 mb-3">
            <HeartPulse className="h-8 w-8 text-teal-600 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Account</h2>
          <p className="text-slate-500 text-center text-sm mt-1">Join the Smart Health Community today</p>
        </div>
        
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm mb-5 border border-rose-100 flex items-start gap-2" id="register-error">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all bg-slate-50/50"
              placeholder="Dr. John Doe / John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all bg-slate-50/50"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="register-role">Account Role</label>
            <select
              id="register-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'doctor')}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all bg-white bg-slate-50/50 cursor-pointer"
            >
              <option value="user">General User (Health Tracker, Patient)</option>
              <option value="doctor">Medical Doctor (Consultant, Practitioner)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all bg-slate-50/50"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="register-confirm">Confirm Password</label>
            <input
              id="register-confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all bg-slate-50/50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-teal-600/10 hover:shadow-teal-600/20"
            id="register-submit"
          >
            <UserPlus className="w-5 h-5" />
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">Or register with</span></div>
        </div>

        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 border border-slate-200 hover:bg-slate-50 py-3 rounded-xl transition duration-200 mb-6 font-bold text-slate-700"
          id="register-google"
          type="button"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.13-5.136 4.13A5.72 5.72 0 0 1 8.24 12.8a5.72 5.72 0 0 1 5.751-5.73c2.45 0 4.13 1.41 4.13 1.41l2.91-2.91S18.252 3 13.991 3A9.8 9.8 0 0 0 4.24 12.8a9.8 9.8 0 0 0 9.751 9.8c5.44 0 9.752-4.13 9.752-9.8 0-.67-.08-1.518-.08-1.518H12.24z"/>
          </svg>
          <span>Register with Google</span>
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-600 hover:text-teal-700 hover:underline font-bold" id="link-to-login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
