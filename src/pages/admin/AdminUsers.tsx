import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { UserProfile } from '../../context/AuthContext';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  UserCheck, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Mail, 
  Phone, 
  MapPin, 
  RefreshCw 
} from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'user' | 'doctor' | 'admin'>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as UserProfile);
      });
      setUsers(list);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'doctor' | 'admin') => {
    try {
      setError('');
      setSuccess('');
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      setUsers((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
      );
      setSuccess(`User role updated to "${newRole}".`);
    } catch (err: any) {
      console.error('Error updating role:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to update user role.');
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        name: editingUser.name,
        phoneNumber: editingUser.phoneNumber,
        address: editingUser.address,
        bloodGroup: editingUser.bloodGroup,
        emergencyContact: editingUser.emergencyContact,
        updatedAt: serverTimestamp()
      });

      setUsers((prev) =>
        prev.map((u) => (u.uid === editingUser.uid ? { ...editingUser } : u))
      );
      setSuccess('User details saved successfully.');
      setEditingUser(null);
    } catch (err: any) {
      console.error('Error saving user:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.uid}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to save user updates.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user account "${userName || userId}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await deleteDoc(doc(db, 'users', userId));
      setUsers((prev) => prev.filter((u) => u.uid !== userId));
      setSuccess('User profile deleted successfully.');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to delete user profile.');
      }
    }
  };

  // Filter & Search logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phoneNumber || '').includes(searchQuery) ||
      (u.bloodGroup || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> User Directory & Role Control
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage user accounts, update roles (User, Doctor, Admin), edit contact records, and enforce system access permissions.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Users
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-semibold">
          <Check className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Search & Role Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, phone, or blood group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            id="input-search-admin-users"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto">
          {(['ALL', 'user', 'doctor', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer capitalize ${
                roleFilter === r
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading user records from Firestore...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No user profiles match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Contact & Location</th>
                  <th className="p-4">Blood Group</th>
                  <th className="p-4">Role System</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{u.name || 'Unnamed User'}</div>
                      <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" /> {u.email}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">UID: {u.uid}</div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div>{u.phoneNumber ? <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {u.phoneNumber}</span> : <span className="text-slate-400 italic">No phone</span>}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{u.address || 'No address set'}</div>
                    </td>
                    <td className="p-4">
                      {u.bloodGroup ? (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs border border-rose-100">
                          {u.bloodGroup}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                          u.role === 'admin'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : u.role === 'doctor'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}
                        id={`select-user-role-${u.uid}`}
                      >
                        <option value="user">User</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit User Details"
                          id={`btn-edit-user-${u.uid}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.uid, u.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete User Account"
                          id={`btn-delete-user-${u.uid}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveUser} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit User Details</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingUser.phoneNumber || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={editingUser.bloodGroup || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bloodGroup: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <textarea
                  value={editingUser.address || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 cursor-pointer text-xs shadow-sm"
              >
                {updating ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
