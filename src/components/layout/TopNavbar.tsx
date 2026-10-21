/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Menu,
  Plus,
  HandCoins,
  RefreshCw,
  Scale,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  FolderOpen,
} from 'lucide-react';
import { PageId } from './Sidebar.tsx';
import { formatINR } from '../../utils/currency.ts';
import { AppSettings } from '../../types/index.ts';

interface TopNavbarProps {
  onOpenMobileMenu: () => void;
  onNavigate: (page: PageId) => void;
  calculatedCash: number;
  lowCashThreshold: number;
  isConnectedToSheets: boolean;
  onSync: () => void;
  isSyncing: boolean;
  lastSyncTime?: string;
  onOpenReconcileModal: () => void;
  userEmail?: string | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  isSigningIn: boolean;
  settings: AppSettings;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenMobileMenu,
  onNavigate,
  calculatedCash,
  lowCashThreshold,
  isConnectedToSheets,
  onSync,
  isSyncing,
  lastSyncTime,
  onOpenReconcileModal,
  userEmail,
  onGoogleSignIn,
  onGoogleSignOut,
  isSigningIn,
  settings,
}) => {
  const isLowCash = calculatedCash <= lowCashThreshold;
  const isNegativeCash = calculatedCash < 0;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Cash in Hand Badge */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Available Cash Pill */}
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all ${
            isNegativeCash
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : isLowCash
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium hidden sm:inline">
            Cash in Hand:
          </span>
          <span className="font-bold text-base tracking-tight">{formatINR(calculatedCash)}</span>
          {isNegativeCash ? (
            <span className="text-[10px] bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded font-bold">
              Deficit
            </span>
          ) : isLowCash ? (
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold">
              Low Cash
            </span>
          ) : null}
        </div>
      </div>

      {/* Right: Quick Actions & Auth status */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Add Expense */}
        <button
          onClick={() => onNavigate('add-expense')}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Expense</span>
        </button>

        {/* Quick Record Cash In */}
        <button
          onClick={() => onNavigate('cash-received')}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium border border-slate-300/80 transition-colors"
        >
          <HandCoins className="w-4 h-4 text-blue-600" />
          <span className="hidden md:inline">Record Cash</span>
        </button>

        {/* Quick Reconcile */}
        <button
          onClick={onOpenReconcileModal}
          className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium border border-slate-300/80 transition-colors"
          title="Reconcile Physical Cash"
        >
          <Scale className="w-4 h-4 text-amber-600" />
          <span className="hidden lg:inline">Reconcile</span>
        </button>

        {/* Cloud Sync Button */}
        {isConnectedToSheets && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors ${
              isSyncing ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            title={`Sync with Google Sheets. ${lastSyncTime ? `Last sync: ${lastSyncTime}` : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        )}

        {/* Google Auth Button (Official Google button styling per workspace skill) */}
        {userEmail ? (
          <div className="flex items-center space-x-2 pl-1 border-l border-slate-200">
            <div className="hidden xl:block text-right">
              <p className="text-[11px] font-semibold text-slate-700 leading-none truncate max-w-[140px]">
                {userEmail}
              </p>
              <span className="text-[9px] text-emerald-600 font-medium flex items-center justify-end gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Connected
              </span>
            </div>
            <button
              onClick={onGoogleSignOut}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onGoogleSignIn}
            disabled={isSigningIn}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 shadow-2xs transition-all"
          >
            {/* Google G icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
