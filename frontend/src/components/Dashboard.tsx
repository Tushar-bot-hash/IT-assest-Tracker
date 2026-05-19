import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import api from '../api/axios';
import { LogOut, Sun, Moon, Laptop, ShieldCheck, RefreshCw } from 'lucide-react';
import StatGrid from './StatGrid';
import AssetLedger from './AssetLedger';
import OffboardingPanel from './OffboardingPanel';
import AuditDrawer from './AuditDrawer';

interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  category: 'Hardware' | 'Software' | 'Peripherals';
  status: 'Available' | 'Deployed' | 'Maintenance' | 'Retired';
  serial_number: string;
  purchase_date: string;
  warranty_expiry: string;
  metadata: any;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: 'IT_Admin' | 'HR_Manager' | 'Standard_Employee';
  department: string;
  is_active: boolean;
}

interface Assignment {
  id: number;
  user: number;
  asset: string;
  user_details: User;
  asset_details: Asset;
  assigned_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  condition_on_deployment: string;
  condition_on_return: string | null;
}

export default function Dashboard({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (d: boolean) => void }) {
  const { user, logout } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Drawer controls
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetsRes, assignmentsRes] = await Promise.all([
        api.get('/api/assets/'),
        api.get('/api/assignments/'),
      ]);
      setAssets(assetsRes.data);
      setAssignments(assignmentsRes.data);

      // HR Managers and IT Admins can view users
      if (user?.role === 'IT_Admin' || user?.role === 'HR_Manager') {
        const usersRes = await api.get('/api/users/');
        setUsers(usersRes.data);
      }
    } catch (err) {
      console.error("Error loading ledger data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDrawer = (assetId: string) => {
    setSelectedAssetId(assetId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen p-6 font-sans lg:p-8">
      {/* Header Container */}
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Hardware Asset Ledger</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Relational Tracking Ledger & IT Offboarding</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* User Profile Tag */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/50 px-3 py-1.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900/50">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{user?.username} ({user?.role.replace('_', ' ')})</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            title="Refresh Ledger Data"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Terminate Session</span>
          </button>
        </div>
      </header>

      {/* Loading Overlay */}
      {loading && assets.length === 0 ? (
        <div className="flex h-60 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-indigo-500 border-slate-600"></div>
            <p className="text-sm text-slate-500">Querying transaction log...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stat KPI Grid */}
          <StatGrid assets={assets} />

          {/* Main Grid: Ledger & Offboarding */}
          <div className="grid gap-8 xl:grid-cols-3">
            
            {/* Table Ledger Panel */}
            <div className="xl:col-span-2">
              <AssetLedger 
                assets={assets} 
                assignments={assignments}
                onSelectAsset={handleOpenDrawer}
                onRefresh={fetchData}
              />
            </div>

            {/* Offboarding Checklist panel (Admin/HR only) */}
            <div>
              {user?.role !== 'Standard_Employee' ? (
                <OffboardingPanel 
                  users={users} 
                  assignments={assignments}
                  onRefresh={fetchData}
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-md font-bold mb-2">My Active Device Specifications</h3>
                  <p className="text-sm text-slate-500 mb-4">You can view details and specifications of hardware checked out to you by clicking any assigned row in the ledger.</p>
                  <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Security Note</span>
                    <p className="text-xs text-slate-500 mt-1">Access rules are enforced based on role-based authentication cookies. Always lock your terminal when not in use.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Spring Physics Slide-out Drawer */}
      <AuditDrawer 
        assetId={selectedAssetId} 
        isOpen={isDrawerOpen} 
        onClose={handleCloseDrawer} 
      />
    </div>
  );
}
export { Asset, User, Assignment };
