/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Receipt,
  ExternalLink,
  Edit,
  Clock,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Expense, AuditLogEntry, AppSettings } from '../../types/index.ts';
import { formatINR, formatDate, formatDateTime } from '../../utils/currency.ts';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  onClose: () => void;
  onOpenEdit: (expense: Expense) => void;
  auditLogs: AuditLogEntry[];
  settings: AppSettings;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  onClose,
  onOpenEdit,
  auditLogs,
  settings,
}) => {
  if (!expense) return null;

  // Filter audit logs for this specific expense
  const expenseLogs = auditLogs.filter(
    (a) => a.entityType === 'Expense' && a.entityId === expense.id
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-bold">
                  {expense.id}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                    expense.approvalStatus === 'Approved'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : expense.approvalStatus === 'Submitted'
                      ? 'bg-blue-500/20 text-blue-300'
                      : expense.approvalStatus === 'Rejected'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {expense.approvalStatus}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                    expense.settlementStatus === 'Settled'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {expense.settlementStatus}
                </span>
              </div>
              <h3 className="font-bold text-base mt-1 text-slate-100">{expense.description}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Amount & Vendor banner */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Expense Amount
              </span>
              <p className="text-3xl font-extrabold text-slate-900">{formatINR(expense.amount)}</p>
              {expense.settledAmount > 0 && (
                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                  Settled: {formatINR(expense.settledAmount)} | Remaining:{' '}
                  {formatINR(expense.amount - expense.settledAmount)}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                Expense Date
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">{formatDate(expense.date)}</p>
              <span className="text-[11px] text-slate-500">{expense.paymentMethod}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Category</span>
              <p className="font-semibold text-slate-800">{expense.category}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Paid to / Vendor</span>
              <p className="font-semibold text-slate-800">{expense.vendor || '-'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Business Purpose</span>
              <p className="font-semibold text-slate-800">{expense.purpose}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Recorded By</span>
              <p className="font-semibold text-slate-800">{expense.recordedBy}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Statement Reference</span>
              <p className="font-semibold text-slate-800">
                {expense.statementId ? (
                  <span className="font-mono text-blue-700">{expense.statementId}</span>
                ) : (
                  'Not yet linked to statement'
                )}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Created Timestamp</span>
              <p className="text-slate-600">{formatDateTime(expense.createdAt)}</p>
            </div>
          </div>

          {/* Receipt Section */}
          <div className="border-t border-slate-200 pt-4">
            <span className="text-xs font-semibold text-slate-700 block mb-2">
              Receipt / Voucher Document
            </span>
            {expense.receiptUrl ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {expense.receiptUrl.startsWith('data:image') ? (
                    <img
                      src={expense.receiptUrl}
                      alt="Receipt"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                      <Receipt className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {expense.receiptFileName || 'Attached Receipt File'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {expense.receiptFileId ? 'Google Drive File' : 'Embedded Attachment'}
                    </p>
                  </div>
                </div>

                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                >
                  <span>Open Receipt</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No receipt attached to this expense.</p>
            )}
          </div>

          {/* Audit History Log */}
          {expenseLogs.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Change & Audit History
              </span>
              <div className="space-y-2">
                {expenseLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-700">{log.action}</span>
                      <span>{formatDateTime(log.timestamp)}</span>
                    </div>
                    <p className="text-slate-600 font-medium">Reason: {log.reason}</p>
                    <span className="text-[10px] text-slate-400">By: {log.performedBy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenEdit(expense);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Expense</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
