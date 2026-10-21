/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Wallet,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  BadgeAlert,
  Coins,
} from 'lucide-react';
import { FinancialSummary } from '../../types/index.ts';
import { formatINR } from '../../utils/currency.ts';

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  lowCashThreshold: number;
  onOpenReconcileModal: () => void;
  onOpenAddExpense: () => void;
  onOpenRecordCash: () => void;
}

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  summary,
  lowCashThreshold,
  onOpenReconcileModal,
  onOpenAddExpense,
  onOpenRecordCash,
}) => {
  const isNegativeCash = summary.currentCalculatedCash < 0;
  const isLowCash = summary.currentCalculatedCash <= lowCashThreshold;
  const hasDiscrepancy = summary.cashDiscrepancy !== null && summary.cashDiscrepancy !== 0;

  return (
    <div className="space-y-4">
      {/* Hero Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Current Calculated Cash in Hand */}
        <div
          className={`relative overflow-hidden rounded-xl p-5 border shadow-xs transition-all ${
            isNegativeCash
              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
              : isLowCash
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : 'bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Calculated Cash Balance
              </p>
              <h2
                className={`text-3xl font-extrabold tracking-tight mt-1 ${
                  isNegativeCash
                    ? 'text-rose-700'
                    : isLowCash
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {formatINR(summary.currentCalculatedCash)}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Opening (₹{summary.openingCash.toFixed(2)}) + Advances Received − Expenses Paid
              </p>
            </div>
            <div
              className={`p-3 rounded-xl ${
                isNegativeCash
                  ? 'bg-rose-100 text-rose-700'
                  : isLowCash
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Low threshold: <span className="font-medium text-slate-700">{formatINR(lowCashThreshold)}</span>
            </span>
            <button
              onClick={onOpenRecordCash}
              className="font-semibold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-400"
            >
              + Replenish Cash
            </button>
          </div>
        </div>

        {/* 2. Outstanding Advance Balance */}
        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200 shadow-xs text-blue-950">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Outstanding Advance Balance
                </p>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1 text-blue-800">
                {formatINR(summary.outstandingAdvanceBalance)}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Advances Received − Formally Settled ({formatINR(summary.totalExpensesSettled)})
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
              <Scale className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Approved awaiting settlement: <span className="font-semibold text-blue-900">{formatINR(summary.amountApprovedAwaitingSettlement)}</span>
            </span>
            <span className="text-[11px] text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded font-medium">
              Accountable
            </span>
          </div>
        </div>

        {/* 3. Physical Cash & Reconciliation */}
        <div
          className={`relative overflow-hidden rounded-xl p-5 border shadow-xs transition-all ${
            hasDiscrepancy
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Physical Cash Counted
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1 text-slate-800">
                {summary.physicalCashCounted !== null
                  ? formatINR(summary.physicalCashCounted)
                  : 'Not Counted'}
              </h2>
              <div className="mt-1">
                {summary.physicalCashCounted !== null ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${
                      hasDiscrepancy
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {hasDiscrepancy ? (
                      <>
                        <BadgeAlert className="w-3.5 h-3.5 text-rose-600" />
                        Discrepancy: {formatINR(summary.cashDiscrepancy)}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Matches Ledger Perfectly
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Count petty cash in drawer to verify</span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Last Drawer Audit</span>
            <button
              onClick={onOpenReconcileModal}
              className="font-semibold text-slate-800 hover:text-emerald-700 underline decoration-slate-300"
            >
              Count Cash Now
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Financial Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Cash Received */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase">Cash Received</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-900">{formatINR(summary.totalCashReceived)}</p>
          <span className="text-[10px] text-slate-400">Advances & Inflows</span>
        </div>

        {/* Total Expenses Recorded */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase">Total Expenses</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-lg font-bold text-slate-900">{formatINR(summary.totalExpensesRecorded)}</p>
          <span className="text-[10px] text-slate-400">All Recorded Outflows</span>
        </div>

        {/* Expenses Submitted */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase">Submitted</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg font-bold text-blue-800">{formatINR(summary.totalExpensesSubmitted)}</p>
          <span className="text-[10px] text-slate-400">In Statements</span>
        </div>

        {/* Expenses Approved */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-emerald-800">{formatINR(summary.totalExpensesApproved)}</p>
          <span className="text-[10px] text-slate-400">By Manager</span>
        </div>

        {/* Expenses Settled */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase">Settled</span>
            <Scale className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg font-bold text-indigo-800">{formatINR(summary.totalExpensesSettled)}</p>
          <span className="text-[10px] text-slate-400">Formal Offset</span>
        </div>

        {/* Awaiting Action */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase">Awaiting Action</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-lg font-bold text-amber-800">{formatINR(summary.totalAwaitingSubmissionOrApproval)}</p>
          <span className="text-[10px] text-slate-400">Unsubmitted / Pending</span>
        </div>
      </div>
    </div>
  );
};
