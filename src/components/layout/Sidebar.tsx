/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  HandCoins,
  Scale,
  FileBarChart,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { AppSettings } from '../../types/index.ts';

export type PageId =
  | 'dashboard'
  | 'add-expense'
  | 'expense-history'
  | 'cash-received'
  | 'advance-settlement'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  settings: AppSettings;
  isConnectedToSheets: boolean;
  userEmail?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  settings,
  isConnectedToSheets,
  userEmail,
}) => {
  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'add-expense', label: 'Add Expense', icon: <PlusCircle className="w-5 h-5 text-emerald-600" /> },
    { id: 'expense-history', label: 'Expense History', icon: <Receipt className="w-5 h-5" /> },
    { id: 'cash-received', label: 'Cash Received', icon: <HandCoins className="w-5 h-5 text-blue-600" /> },
    { id: 'advance-settlement', label: 'Advance Settlement', icon: <Scale className="w-5 h-5 text-amber-600" /> },
    { id: 'reports', label: 'Reports', icon: <FileBarChart className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
              ₹
            </div>
            <div>
              <span className="font-bold tracking-tight text-base text-white">CashFlow</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                Petty Cash & Advances
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
              {settings.userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{settings.userName}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {userEmail || 'Employee Account'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-white' : ''}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Connection Status Footer */}
        <div className="p-3 m-3 rounded-lg border border-slate-800 bg-slate-950/40 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Google Sheets Sync</span>
            {isConnectedToSheets ? (
              <span className="inline-flex items-center text-[10px] text-emerald-400 font-semibold gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] text-amber-400 font-semibold gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Local Mode
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {isConnectedToSheets
              ? `Syncing with dedicated sheet`
              : `Storage in browser. Link Sheets in Settings.`}
          </p>
        </div>

        {/* Bottom Compliance tag */}
        <div className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Audit Ledger Active
          </span>
          <span>Asia/Kolkata</span>
        </div>
      </aside>
    </>
  );
};
