import React, { useState, useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { Asset, Assignment } from './Dashboard';
import { Search, Filter, Monitor, Code, Settings, User, ArrowUpRight, Eye } from 'lucide-react';
import { useAuth } from '../App';
import api from '../api/axios';

// Custom Anime.js Animated Status Badge
const StatusBadge = ({ status }: { status: Asset['status'] }) => {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== status) {
      if (badgeRef.current) {
        animate(badgeRef.current, {
          scale: [1, 1.12, 1],
          duration: 350,
          easing: 'easeOutElastic(1, .6)',
        });
      }
      prevStatus.current = status;
    }
  }, [status]);

  const styleMap = {
    Available: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Deployed: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    Maintenance: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Retired: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  return (
    <span
      ref={badgeRef}
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold select-none ${styleMap[status]}`}
    >
      {status}
    </span>
  );
};

interface LedgerProps {
  assets: Asset[];
  assignments: Assignment[];
  onSelectAsset: (id: string) => void;
  onRefresh: () => void;
}

export default function AssetLedger({ assets, assignments, onSelectAsset, onRefresh }: LedgerProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');



  // Helper to find current assignee
  // An assignment is considered active if actual_return_date is null,
  // OR if it's set to a future date (device not yet physically returned).
  const getAssignee = (assetId: string) => {
    const now = new Date();
    const activeAssignment = assignments.find(
      (a) =>
        a.asset === assetId &&
        (a.actual_return_date === null || new Date(a.actual_return_date) > now)
    );
    return activeAssignment ? activeAssignment.user_details : null;
  };

  // Filter logic
  const filteredAssets = assets.filter((asset) => {
    // 1. Category Filter
    if (categoryFilter !== 'All' && asset.category !== categoryFilter) return false;

    // 2. Status Filter
    if (statusFilter !== 'All' && asset.status !== statusFilter) return false;

    // 3. Search Term
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const assignee = getAssignee(asset.id);
    const assigneeName = assignee ? `${assignee.username} ${assignee.email}`.toLowerCase() : '';

    return (
      asset.name.toLowerCase().includes(term) ||
      asset.asset_tag.toLowerCase().includes(term) ||
      asset.serial_number.toLowerCase().includes(term) ||
      asset.category.toLowerCase().includes(term) ||
      assigneeName.includes(term)
    );
  });

  const getCategoryIcon = (category: Asset['category']) => {
    switch (category) {
      case 'Hardware': return <Monitor className="h-4 w-4 text-indigo-400" />;
      case 'Software': return <Code className="h-4 w-4 text-emerald-400" />;
      case 'Peripherals': return <Settings className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/50">
      
      {/* Ledger Toolbar */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Active Asset Registry</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Search hardware specifications and relational states</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Global Text Search */}
          <div className="relative w-full sm:max-w-xs flex-1 sm:flex-initial">
            <Search className="absolute inset-y-0 left-3 h-4 w-4 self-center text-slate-400" />
            <input
              type="text"
              placeholder="Search Serial, Tag, Assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs placeholder-slate-400 outline-hidden transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950/40 dark:focus:bg-slate-950"
            />
          </div>


        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium outline-hidden focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <option value="All">All Categories</option>
          <option value="Hardware">Hardware</option>
          <option value="Software">Software</option>
          <option value="Peripherals">Peripherals</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium outline-hidden focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <option value="All">All Statuses</option>
          <option value="Available">Available</option>
          <option value="Deployed">Deployed</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Retired">Retired</option>
        </select>

        {/* Count display */}
        <span className="ml-auto text-xs font-semibold text-slate-400">
          Showing {filteredAssets.length} of {assets.length} assets
        </span>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-150 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
              <th className="pb-3 pr-4">Asset Info</th>
              <th className="pb-3 pr-4">Category</th>
              <th className="pb-3 pr-4">Serial Number</th>
              <th className="pb-3 pr-4">Current Assignee</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                  No matching assets found inside active index.
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => {
                const assignee = getAssignee(asset.id);
                return (
                  <tr
                    key={asset.id}
                    className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                  >
                    {/* Name & Tag */}
                    <td className="py-4 pr-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                          {asset.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {asset.asset_tag}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {getCategoryIcon(asset.category)}
                        <span>{asset.category}</span>
                      </div>
                    </td>

                    {/* Serial */}
                    <td className="py-4 pr-4">
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                        {asset.serial_number}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-4 pr-4">
                      {assignee ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                          <User className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="font-medium">{assignee.username}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 pr-4">
                      <StatusBadge status={asset.status} />
                    </td>

                    {/* Trigger Detail Drawer */}
                    <td className="py-4 text-right">
                      <button
                        onClick={() => onSelectAsset(asset.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold shadow-xs transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-indigo-950/30"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>



    </div>
  );
}
