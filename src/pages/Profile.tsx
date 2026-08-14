import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth, UserProfile } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { User, ShieldAlert, CheckCircle, Save, X, Edit, Phone, MapPin, HeartHandshake, UserCircle } from 'lucide-react';

export default function Profile() {
  const { userData, currentUser, refreshUserData } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    age: '' as number | '',
    gender: '' as 'Male' | 'Female' | 'Other' | '',
    height: '' as number | '',
    weight: '' as number | '',
    bloodGroup: '' as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '',
    phoneNumber: '',
    address: '',
    emergencyContact: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        age: userData.age !== undefined && userData.age !== null ? userData.age : '',
        gender: userData.gender || '',
        height: userData.height !== undefined && userData.height !== null ? userData.height : '',
        weight: userData.weight !== undefined && userData.weight !== null ? userData.weight : '',
        bloodGroup: userData.bloodGroup || '',
        phoneNumber: userData.phoneNumber || '',
        address: userData.address || '',
        emergencyContact: userData.emergencyContact || ''
      });
    }
  }, [userData, isEditing]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    if (formData.name.trim().length === 0) {
      return setError('Name is required.');
    }
    if (formData.name.length > 100) {
      return setError('Name cannot exceed 100 characters.');
    }
    if (formData.phoneNumber.length > 20) {
      return setError('Phone number cannot exceed 20 characters.');
    }
    if (formData.address.length > 500) {
      return setError('Address cannot exceed 500 characters.');
    }
    if (formData.emergencyContact.length > 100) {
      return setError('Emergency contact cannot exceed 100 characters.');
    }

    const ageNum = formData.age !== '' ? Number(formData.age) : '';
    if (ageNum !== '' && (isNaN(ageNum) || ageNum < 0 || ageNum > 150)) {
      return setError('Age must be a valid number between 0 and 150.');
    }

    const heightNum = formData.height !== '' ? Number(formData.height) : '';
    if (heightNum !== '' && (isNaN(heightNum) || heightNum < 0 || heightNum > 300)) {
      return setError('Height must be a valid number between 0 and 300 cm.');
    }

    const weightNum = formData.weight !== '' ? Number(formData.weight) : '';
    if (weightNum !== '' && (isNaN(weightNum) || weightNum < 0 || weightNum > 1000)) {
      return setError('Weight must be a valid number between 0 and 1000 kg.');
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        // Create initial document using authenticated user's UID if it does not exist
        const createPayload = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          name: formData.name.trim(),
          role: userData?.role || 'user',
          age: ageNum,
          gender: formData.gender,
          height: heightNum,
          weight: weightNum,
          bloodGroup: formData.bloodGroup,
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          emergencyContact: formData.emergencyContact.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(userDocRef, createPayload, { merge: true });
      } else {
        // Merge update existing document using setDoc with merge: true
        const updatePayload = {
          name: formData.name.trim(),
          age: ageNum,
          gender: formData.gender,
          height: heightNum,
          weight: weightNum,
          bloodGroup: formData.bloodGroup,
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          emergencyContact: formData.emergencyContact.trim(),
          updatedAt: serverTimestamp()
        };
        await setDoc(userDocRef, updatePayload, { merge: true });
      }

      await refreshUserData();
      
      setSuccess('Profile updated successfully.');
      setIsEditing(false);
    } catch (err: any) {
      setError('An error occurred. Failed to save profile changes.');
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 md:pl-64 flex flex-col">
      <Sidebar />
      <div className="p-6 max-w-4xl w-full mx-auto flex-1">
        
        {/* Header section */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCircle className="w-8 h-8 text-teal-600 shrink-0" />
              <span>Personal Profile</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage your vital metrics, role identities, and contact directories securely.</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-md shadow-teal-600/10 cursor-pointer"
              id="edit-profile-btn"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </header>

        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 border border-rose-100 flex items-start gap-2" id="profile-error">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl mb-6 border border-emerald-100 flex items-start gap-2" id="profile-success">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section 1: Demographics */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">1. Core Demographics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="field-name">Full Name</label>
                  <input
                    id="field-name"
                    type="text"
                    name="name"
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Full Name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="field-age">Age</label>
                  <input
                    id="field-age"
                    type="number"
                    name="age"
                    disabled={!isEditing}
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Age (years)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="field-gender">Gender</label>
                  <select
                    id="field-gender"
                    name="gender"
                    disabled={!isEditing}
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500 bg-white cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="field-bloodGroup">Blood Group</label>
                  <select
                    id="field-bloodGroup"
                    name="bloodGroup"
                    disabled={!isEditing}
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500 bg-white cursor-pointer"
                  >
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Vital Metrics */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">2. Vital Health Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="field-height">Height (cm)</label>
                  <input
                    id="field-height"
                    type="number"
                    name="height"
                    disabled={!isEditing}
                    value={formData.height}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Height in cm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="field-weight">Weight (kg)</label>
                  <input
                    id="field-weight"
                    type="number"
                    name="weight"
                    disabled={!isEditing}
                    value={formData.weight}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Weight in kg"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Contact Details */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">3. Security & Emergency Contacts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1" htmlFor="field-phone">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    id="field-phone"
                    type="text"
                    name="phoneNumber"
                    disabled={!isEditing}
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1" htmlFor="field-emergency">
                    <HeartHandshake className="w-3.5 h-3.5 text-slate-400" />
                    <span>Emergency Contact</span>
                  </label>
                  <input
                    id="field-emergency"
                    type="text"
                    name="emergencyContact"
                    disabled={!isEditing}
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Jane Doe (Spouse) - +1 (555) 111-2222"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1" htmlFor="field-address">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Residential Address</span>
                </label>
                <textarea
                  id="field-address"
                  name="address"
                  disabled={!isEditing}
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Street Address, City, State, ZIP"
                />
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer"
                  id="cancel-profile-btn"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-md shadow-teal-600/10 disabled:opacity-50 cursor-pointer"
                  id="save-profile-btn"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
