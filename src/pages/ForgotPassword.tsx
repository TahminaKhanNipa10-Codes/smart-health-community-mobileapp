import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      let friendlyError = "Failed to send password reset email.";
      if (err.code === 'auth/user-not-found') {
        friendlyError = "No account found with this email address.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Please enter a valid email address.";
      } else if (err.message) {
        friendlyError = err.message.replace("Firebase: ", "");
      }
      setError(friendlyError);
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
            <HeartPulse className="h-8 w-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reset Password</h2>
          <p className="text-slate-500 text-center text-sm mt-1">Enter your email to receive recovery instructions</p>
        </div>
        
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm mb-5 border border-rose-100 flex items-start gap-2" id="forgot-error">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
        
        {message && (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm mb-5 border border-emerald-100 flex items-start gap-2 animate-fadeIn" id="forgot-success">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="forgot-email">Email Address</label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all bg-slate-50/50"
              placeholder="name@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-teal-600/10 hover:shadow-teal-600/20"
            id="forgot-submit"
          >
            <Mail className="w-5 h-5" />
            {loading ? "Processing..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Remember credentials?{' '}
          <Link to="/login" className="text-teal-600 hover:text-teal-700 hover:underline font-bold" id="link-to-login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
