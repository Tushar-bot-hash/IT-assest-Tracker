import React, { useState } from 'react';
import { useAuth } from '../App';
import { KeyRound, ShieldAlert, User, Laptop } from 'lucide-react';

export default function Login() {
  const { login, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-md">
        
        {/* Header Branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
            <Laptop className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">IT/HR Asset Ledger</h1>
          <p className="mt-2 text-sm text-slate-400">Enterprise Hardware & Tracking Platform</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <span className="font-semibold">Security Alert:</span> {error}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Username</label>
            <div className="relative mt-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-hidden transition-all focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
            <div className="relative mt-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-hidden transition-all focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying Secure Token...' : 'Authenticate Secure Session'}
          </button>
        </form>

        {/* Demo Helper Box */}
        <div className="mt-8 rounded-lg border border-slate-800/60 bg-slate-900/20 p-4 text-xs text-slate-500">
          <div className="font-semibold text-slate-400 mb-1">Standard Roles Access Codes:</div>
          <div className="grid grid-cols-2 gap-y-1">
            <div>Admin: <code className="text-indigo-400 font-mono">admin</code></div>
            <div>Pass: <code className="text-slate-400 font-mono">password123</code></div>
            <div>HR Manager: <code className="text-indigo-400 font-mono">hr_manager</code></div>
            <div>Pass: <code className="text-slate-400 font-mono">password123</code></div>
          </div>
        </div>

      </div>
    </div>
  );
}
