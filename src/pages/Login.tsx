import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err: any) {
      let friendlyError = "Failed to sign in. Please check your credentials.";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        friendlyError = "Incorrect email or password.";
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

  async function handleGoogleLogin() {
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
        
        {/* Logo/Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-teal-500/10 rounded-2xl border border-teal-500/20 mb-3">
            <HeartPulse className="h-8 w-8 text-teal-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">Smart Health</h2>
          <p className="text-slate-500 text-center text-sm mt-1">Log in to access your secure medical ecosystem</p>
        </div>
        
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm mb-6 border border-rose-100 flex items-start gap-2 animate-shake" id="login-error">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all bg-slate-50/50"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="login-password">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline">Forgot Password?</Link>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all bg-slate-50/50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-teal-600/10 hover:shadow-teal-600/20"
            id="login-submit"
          >
            <LogIn className="w-5 h-5" />
            {loading ? "Signing In..." : "Sign In with Email"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">Or login with</span></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 border border-slate-200 hover:bg-slate-50 py-3 rounded-xl transition duration-200 mb-6 font-bold text-slate-700"
          id="login-google"
          type="button"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.13-5.136 4.13A5.72 5.72 0 0 1 8.24 12.8a5.72 5.72 0 0 1 5.751-5.73c2.45 0 4.13 1.41 4.13 1.41l2.91-2.91S18.252 3 13.991 3A9.8 9.8 0 0 0 4.24 12.8a9.8 9.8 0 0 0 9.751 9.8c5.44 0 9.752-4.13 9.752-9.8 0-.67-.08-1.518-.08-1.518H12.24z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-sm text-slate-600">
          New to the community?{' '}
          <Link to="/register" className="text-teal-600 hover:text-teal-700 hover:underline font-bold" id="link-to-register">Sign Up</Link>
        </p>

        {/* Console Config Alert / Manual Setup Walkthrough */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-[11px] text-slate-400 bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200">
          <p className="font-semibold text-slate-500 mb-1">💡 Console Walkthrough Recommendation:</p>
          <p>
            Please ensure you have enabled the <strong>Email/Password</strong> provider in your Firebase Authentication console 
            (under Authentication &gt; Sign-in method) to permit email registration.
          </p>
        </div>
      </div>
    </div>
  );
}
