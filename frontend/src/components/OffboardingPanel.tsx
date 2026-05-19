import React, { useState } from 'react';
import api from '../api/axios';
import { User, Assignment } from './Dashboard';
import { ShieldAlert, UserX, CheckCircle, Package } from 'lucide-react';

interface OffboardingPanelProps {
  users: User[];
  assignments: Assignment[];
  onRefresh: () => void;
}

export default function OffboardingPanel({ users, assignments, onRefresh }: OffboardingPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filter out IT Admins (only Standard Employees and HR Managers should be selectable, usually)
  const selectableUsers = users.filter((u) => u.is_active);

  const selectedUser = users.find((u) => u.id === Number(selectedUserId));

  // An assignment is active if actual_return_date is null OR is in the future
  const now = new Date();
  const activeAssignments = selectedUser
    ? assignments.filter(
        (a) =>
          a.user === selectedUser.id &&
          (a.actual_return_date === null || new Date(a.actual_return_date) > now)
      )
    : [];

  const handleOffboard = async () => {
    if (!selectedUserId) return;
    
    const confirmAction = window.confirm(
      `Are you sure you want to offboard ${selectedUser?.username}? This will return all checked-out assets and terminate their access to the system.`
    );
    if (!confirmAction) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await api.post(`/api/users/${selectedUserId}/offboard/`, {
        condition: 'Good (Auto-offboarded)',
      });
      setFeedback(response.data.detail);
      setSelectedUserId('');
      onRefresh(); // Refresh parent data
    } catch (err: any) {
      console.error(err);
      setFeedback(err.response?.data?.detail || 'An error occurred during offboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Employee Offboarding</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Checked-out ledger checklist & immediate access termination</p>
      </div>

      {/* Selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Select Employee
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => {
            setSelectedUserId(e.target.value);
            setFeedback(null);
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-hidden focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <option value="">-- Choose active employee --</option>
          {selectableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username} ({u.department || 'No Dept'})
            </option>
          ))}
        </select>
      </div>

      {/* Success / Error Feedback */}
      {feedback && (
        <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs font-medium text-emerald-500 flex items-start gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{feedback}</span>
        </div>
      )}

      {selectedUser ? (
        <div className="space-y-6">
          {/* Asset checklist */}
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Device Checklist ({activeAssignments.length} Items)
            </span>

            {activeAssignments.length === 0 ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-center text-xs text-slate-500 dark:border-slate-800/60 dark:bg-slate-950/20">
                No active assets checked out.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/30 p-3 dark:border-slate-800 dark:bg-slate-950/20"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-indigo-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">{assignment.asset_details.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{assignment.asset_details.asset_tag}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono rounded-sm bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {assignment.asset_details.serial_number}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning Message */}
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-500 flex gap-2.5">
            <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <span className="font-semibold block mb-0.5">Critical Offboarding Actions:</span>
              Checking in assets automatically alters their status to <code className="bg-rose-500/10 px-1 rounded font-mono">Available</code>. 
              This employee's Active User status will be set to <code className="bg-rose-500/10 px-1 rounded font-mono">Inactive</code>, immediately terminating DRF authentication cookies.
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleOffboard}
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 py-3 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:bg-rose-500 active:scale-[0.98] disabled:opacity-50"
          >
            <UserX className="h-4 w-4" />
            <span>{isSubmitting ? 'Terminating & Checking-In...' : 'Check-in Devices & Terminate Access'}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
          <UserX className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
          <span className="text-xs">No active employee selected for offboarding.</span>
        </div>
      )}
    </div>
  );
}
