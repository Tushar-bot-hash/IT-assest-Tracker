import React, { useState, useEffect, useRef } from 'react';
import { animate } from 'animejs';
import api from '../api/axios';
import { X, Calendar, ClipboardList, Info, ArrowRight } from 'lucide-react';

interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  action_by_details: {
    username: string;
    role: string;
  } | null;
  previous_state: any;
  new_state: any;
}

interface AssetDetails {
  id: string;
  name: string;
  asset_tag: string;
  category: string;
  status: string;
  serial_number: string;
  purchase_date: string;
  warranty_expiry: string;
  metadata: any;
}

interface AuditDrawerProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditDrawer({ assetId, isOpen, onClose }: AuditDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch asset details & logs when assetId is updated
  useEffect(() => {
    if (!assetId || !isOpen) return;

    const fetchAssetDetails = async () => {
      setLoading(true);
      try {
        const [assetRes, logsRes] = await Promise.all([
          api.get(`/api/assets/${assetId}/`),
          api.get(`/api/audit-logs/?asset_id=${assetId}`),
        ]);
        setAsset(assetRes.data);
        setLogs(logsRes.data);
      } catch (err) {
        console.error("Failed to load asset details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetDetails();
  }, [assetId, isOpen]);

  // Handle Anime.js sliding transition based on isOpen state
  useEffect(() => {
    if (isOpen) {
      // 1. Animate overlay opacity
      if (overlayRef.current) {
        animate(overlayRef.current, {
          opacity: [0, 0.45],
          duration: 350,
          easing: 'easeOutQuad',
        });
      }

      // 2. Slide in drawer from right with spring physics
      if (drawerRef.current) {
        animate(drawerRef.current, {
          translateX: ['100%', '0%'],
          duration: 650,
          easing: 'spring(1, 85, 14, 0)', // Spring physics
        });
      }
    } else {
      // Animate out
      if (drawerRef.current) {
        animate(drawerRef.current, {
          translateX: ['0%', '100%'],
          duration: 350,
          easing: 'easeInQuad',
        });
      }
      if (overlayRef.current) {
        animate(overlayRef.current, {
          opacity: [0.45, 0],
          duration: 250,
          easing: 'easeInQuad',
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      
      {/* Overlay Background */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className="fixed inset-0 bg-black opacity-0"
      />

      {/* Slide-out Panel */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full max-w-lg border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full"
        style={{ transform: 'translateX(100%)' }}
      >
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex flex-col">
            <h3 className="text-md font-bold tracking-tight text-slate-900 dark:text-white">Asset Specifications & Audit</h3>
            <p className="text-xs text-slate-500">Historical transaction log & raw specs</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-indigo-500 border-slate-700"></div>
              <span className="text-xs text-slate-400">Syncing audit logs...</span>
            </div>
          </div>
        ) : asset ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Core Details */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-indigo-400" />
                <span>Base Attributes</span>
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Asset Name</span>
                  <span className="font-semibold">{asset.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Category</span>
                  <span className="font-semibold">{asset.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Asset Tag</span>
                  <span className="font-mono font-semibold text-indigo-500">{asset.asset_tag}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Serial Number</span>
                  <span className="font-mono font-semibold">{asset.serial_number}</span>
                </div>
              </div>
            </div>

            {/* PostgreSQL JSONB Specs */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <span>JSONB Metadata Schema Specs</span>
              </h4>
              
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-[11px] text-emerald-400 dark:border-slate-800">
                <pre className="overflow-x-auto">
                  {JSON.stringify(asset.metadata, null, 2)}
                </pre>
              </div>
            </div>

            {/* Ledger Audit Trail */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-amber-400" />
                <span>Relational History Ledger ({logs.length})</span>
              </h4>

              {logs.length === 0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/20">
                  No historical audits recorded.
                </div>
              ) : (
                <div className="space-y-4 relative border-l border-slate-150 dark:border-slate-800 ml-2.5 pl-4">
                  {logs.map((log) => (
                    <div key={log.id} className="relative text-xs">
                      {/* Left Dot */}
                      <span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-slate-350 ring-4 ring-white dark:bg-slate-700 dark:ring-slate-900" />
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold tracking-tight text-slate-900 dark:text-white">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span>Action By:</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {log.action_by_details ? `${log.action_by_details.username} (${log.action_by_details.role.replace('_', ' ')})` : 'System'}
                          </span>
                        </div>

                        {/* State difference snippet */}
                        {log.new_state && Object.keys(log.new_state).length > 0 && (
                          <div className="mt-1 rounded-sm bg-slate-50/50 border border-slate-100 p-2 dark:border-slate-850 dark:bg-slate-950/20">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">State Transition</span>
                            <div className="flex items-center gap-1.5 font-mono text-[9px] overflow-x-auto">
                              <span className="text-rose-500">{log.previous_state.status || 'None'}</span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="text-emerald-500">{log.new_state.status || 'None'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-xs text-slate-500">
            Error loading asset specifications.
          </div>
        )}
      </div>
    </div>
  );
}
