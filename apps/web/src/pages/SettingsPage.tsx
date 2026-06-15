import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/api';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Clean UI error message container block.
 */
function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center space-x-2 text-red-500 text-xs bg-red-500/10 rounded-xl p-3.5 border border-red-500/15">
      <AlertCircle size={14} />
      <span>{msg}</span>
    </div>
  );
}

/**
 * SettingsPage React Component.
 * Implements form states to modify user name, contact details,
 * monthly target limits, and execute password security rotations.
 */
export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  
  // Local form control states
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [monthlyLimitKg, setMonthlyLimitKg] = useState(String(user?.monthlyLimitKg ?? 1000));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI Notification States
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Dispatches the update profile API request.
   * Performs basic validators on password match credentials beforehand.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Enforce matching confirmation passwords.
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const data = await auth.updateProfile({
        name,
        email,
        monthlyLimitKg: parseFloat(monthlyLimitKg),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      // Synchronize changes to global AuthContext state.
      updateUser(data.user);
      setSuccess('Profile updated successfully!');
      
      // Clean password inputs after success.
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bento-card p-8 w-full max-w-2xl mx-auto animate-fade-in-up border-slate-200 dark:border-slate-800 shadow-md pb-10">
      <div className="mb-6">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account settings</span>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">Profile Settings</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Profile Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="bento-input" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="bento-input" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Carbon Limit (kg CO₂e)</label>
            <input type="number" min="1" value={monthlyLimitKg} onChange={(e) => setMonthlyLimitKg(e.target.value)} required
              className="bento-input" />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">Track your monthly operations budget. We will warn you when approaching this limit.</p>
          </div>
        </div>

        {/* Password Rotation Credentials */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6">
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4 tracking-tight">Security Credentials</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Verify identity"
                className="bento-input text-xs" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters" minLength={6}
                className="bento-input text-xs" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="bento-input text-xs" />
            </div>
          </div>
        </div>

        {error && <ErrorMsg msg={error} />}
        {success && (
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-500/10 rounded-xl p-3.5 border border-emerald-500/15">
            <CheckCircle size={14} />
            <span className="font-bold">{success}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-bento-primary w-full py-3.5 text-sm font-bold">
          {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
