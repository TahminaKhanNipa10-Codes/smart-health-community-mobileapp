import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Tracker from './pages/Tracker';
import Community from './pages/Community';
import MedicalRecords from './pages/MedicalRecords';
import EmergencyServices from './pages/EmergencyServices';
import DoctorPanel from './pages/DoctorPanel';
import AdminLayout from './pages/admin/AdminLayout';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Screens */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Secure Internal Protected Workspace */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tracker" 
            element={
              <ProtectedRoute>
                <Tracker />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/medical-records" 
            element={
              <ProtectedRoute>
                <MedicalRecords />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/community" 
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/emergency" 
            element={
              <ProtectedRoute>
                <EmergencyServices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/emergency-services" 
            element={
              <ProtectedRoute>
                <EmergencyServices />
              </ProtectedRoute>
            } 
          />

          {/* Secure Restricted Doctor Workspace Routes */}
          <Route 
            path="/doctor-panel" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/doctor" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPanel />
              </ProtectedRoute>
            } 
          />

          {/* Secure Restricted Admin Panel Route */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            } 
          />

          {/* Fallback Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
