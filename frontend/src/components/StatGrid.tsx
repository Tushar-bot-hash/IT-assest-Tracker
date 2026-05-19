import React, { useLayoutEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { Asset } from './Dashboard';
import { Package, Send, ShieldAlert, Wrench } from 'lucide-react';

export default function StatGrid({ assets }: { assets: Asset[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stagger entry animation on mount using Anime.js
  useLayoutEffect(() => {
    if (containerRef.current) {
      // Setup initial styles to avoid FOUC (flash of unstyled content)
      animate('.metric-card', {
        opacity: 0,
        translateY: 20,
        duration: 0
      });

      animate('.metric-card', {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: stagger(60), // Sequential entry staggering
        duration: 800,
        easing: 'easeOutQuad',
      });
    }
  }, [assets.length]); // Re-trigger only when assets are loaded

  // Calculations
  const totalAssets = assets.length;
  const deployed = assets.filter(a => a.status === 'Deployed').length;
  const maintenance = assets.filter(a => a.status === 'Maintenance').length;

  const expiringWarranties = assets.filter(a => {
    if (!a.warranty_expiry) return false;
    const expiry = new Date(a.warranty_expiry);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return expiry >= today && expiry <= thirtyDaysFromNow;
  }).length;

  const stats = [
    {
      title: 'Total Tracked Assets',
      value: totalAssets,
      icon: Package,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      description: 'Active hard & soft specs',
    },
    {
      title: 'Currently Deployed',
      value: deployed,
      icon: Send,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      description: 'Assigned to active roles',
    },
    {
      title: 'Maintenance & Repairs',
      value: maintenance,
      icon: Wrench,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      description: 'Offline for diagnostics',
    },
    {
      title: 'Expiring Warranties',
      value: expiringWarranties,
      icon: ShieldAlert,
      color: expiringWarranties > 0 
        ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse' 
        : 'text-slate-500 bg-slate-500/10 border-slate-500/20',
      description: 'Expiring within 30 days',
    },
  ];

  return (
    <div ref={containerRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            className="metric-card rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                {stat.title}
              </span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">{stat.value}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.description}</p>
          </div>
        );
      })}
    </div>
  );
}
