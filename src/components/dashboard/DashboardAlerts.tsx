/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertTriangle,
  Receipt,
  FileClock,
  CheckSquare,
  Scale,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Expense, FinancialSummary, AppSettings } from '../../types/index.ts';
import { formatINR } from '../../utils/currency.ts';
import { PageId } from '../layout/Sidebar.tsx';

interface DashboardAlertsProps {
  summary: FinancialSummary;
  expenses: Expense[];
  settings: AppSettings;
  onNavigate: (page: PageId) => void;
  onOpenReconcileModal: () => void;
}

export const DashboardAlerts: React.FC<DashboardAlertsProps> = ({
  summary,
  expenses,
  settings,
  onNavigate,
  onOpenReconcileModal,
}) => {
  const alerts: Array<{
    id: string;
    type: 'danger' | 'warning' | 'info';
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel: string;
    onClick: () => void;
  }> = [];

  // 1. Cash Deficit or Low Cash Alert
  if (summary.currentCalculatedCash < 0) {
    alerts.push({
      id: 'cash-deficit',
      type: 'danger',
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
      title: 'Cash Deficit Detected',
      description: `Current calculated cash is negative (${formatINR(
        summary.currentCalculatedCash
      )}). Employee spent out-of-pocket money beyond available advances.`,
      actionLabel: 'Record Cash Inflow',
      onClick: () => onNavigate('cash-received'),
    });
  } else if (summary.currentCalculatedCash <= settings.lowCashThreshold) {
    alerts.push({
      id: 'low-cash',
      type: 'warning',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      title: 'Low Cash Balance Alert',
      description: `Cash balance of ${formatINR(
        summary.currentCalculatedCash
      )} is below your alert threshold of ${formatINR(
        settings.lowCashThreshold
      )}. Request replenishment from manager.`,
      actionLabel: 'Prepare Expense Statement',
      onClick: () => onNavigate('advance-settlement'),
    });
  }

  // 2. Physical Cash Discrepancy
  if (summary.cashDiscrepancy !== null && summary.cashDiscrepancy !== 0) {
    alerts.push({
      id: 'discrepancy',
      type: 'danger',
      icon: <Scale className="w-5 h-5 text-rose-600" />,
      title: `Cash Discrepancy: ${formatINR(summary.cashDiscrepancy)}`,
      description: `Physical cash counted in drawer differs from calculated balance by ${formatINR(
        summary.cashDiscrepancy
      )}.`,
      actionLabel: 'Audit Cash Drawer',
      onClick: onOpenReconcileModal,
    });
  }

  // 3. Missing Receipts Alert (where required)
  const missingReceipts = expenses.filter((e) => {
    if (e.receiptUrl) return false;
    if (settings.receiptMandatory) return true;
    if (settings.receiptThresholdAmount > 0 && e.amount >= settings.receiptThresholdAmount) {
      return true;
    }
    return false;
  });

  if (missingReceipts.length > 0) {
    alerts.push({
      id: 'missing-receipts',
      type: 'warning',
      icon: <Receipt className="w-5 h-5 text-amber-600" />,
      title: `${missingReceipts.length} Expenses Missing Receipts`,
      description: `Company policy requires receipts for expenses above ${formatINR(
        settings.receiptThresholdAmount
      )}. Upload bills to ensure manager approval.`,
      actionLabel: 'View Expenses',
      onClick: () => onNavigate('expense-history'),
    });
  }

  // 4. Expenses Awaiting Submission
  const unsubmitted = expenses.filter(
    (e) => !e.statementId && (e.approvalStatus === 'Recorded' || e.approvalStatus === 'Draft')
  );
  if (unsubmitted.length > 0) {
    const unsubmittedTotal = unsubmitted.reduce((sum, e) => sum + e.amount, 0);
    alerts.push({
      id: 'unsubmitted-expenses',
      type: 'info',
      icon: <FileClock className="w-5 h-5 text-blue-600" />,
      title: `${unsubmitted.length} Expenses Ready for Submission`,
      description: `${formatINR(
        unsubmittedTotal
      )} in recorded expenses have not yet been batched into an Expense Statement for the manager.`,
      actionLabel: 'Create Statement',
      onClick: () => onNavigate('advance-settlement'),
    });
  }

  // 5. Expenses Awaiting Approval
  if (summary.amountAwaitingApproval > 0) {
    alerts.push({
      id: 'awaiting-approval',
      type: 'info',
      icon: <CheckSquare className="w-5 h-5 text-indigo-600" />,
      title: `${formatINR(summary.amountAwaitingApproval)} Awaiting Manager Approval`,
      description: `Statement has been submitted to ${settings.managerName}. Track approval status and mark settlement once reviewed.`,
      actionLabel: 'Track Settlement',
      onClick: () => onNavigate('advance-settlement'),
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <p className="text-xs text-emerald-900 font-medium">
            <span className="font-bold">Ledger Healthy:</span> All cash advances, expenses, and reconciliations are up to date with no pending discrepancies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {alerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 px-4 rounded-xl border text-xs gap-3 ${
            alert.type === 'danger'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : alert.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className="shrink-0 mt-0.5">{alert.icon}</div>
            <div>
              <p className="font-bold text-sm tracking-tight">{alert.title}</p>
              <p className="text-xs opacity-90 mt-0.5">{alert.description}</p>
            </div>
          </div>
          <button
            onClick={alert.onClick}
            className={`shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors self-start sm:self-center shadow-2xs ${
              alert.type === 'danger'
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : alert.type === 'warning'
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span>{alert.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
