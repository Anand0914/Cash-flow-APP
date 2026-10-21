/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Edit,
  AlertTriangle,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { Expense, AppSettings } from '../../types/index.ts';
import { toPaise } from '../../utils/currency.ts';
import { ReceiptUploader } from './ReceiptUploader.tsx';

interface ExpenseEditModalProps {
  expense: Expense | null;
  onClose: () => void;
  onSave: (updatedExpense: Expense, reason: string) => Promise<void>;
  settings: AppSettings;
  accessToken: string | null;
}

export const ExpenseEditModal: React.FC<ExpenseEditModalProps> = ({
  expense,
  onClose,
  onSave,
  settings,
  accessToken,
}) => {
  if (!expense) return null;

  const [date, setDate] = useState(expense.date);
  const [amountStr, setAmountStr] = useState(String(expense.amount));
  const [category, setCategory] = useState(expense.category);
  const [description, setDescription] = useState(expense.description);
  const [vendor, setVendor] = useState(expense.vendor || '');
  const [purpose, setPurpose] = useState(expense.purpose);
  const [paymentMethod, setPaymentMethod] = useState(expense.paymentMethod);
  const [receiptInfo, setReceiptInfo] = useState<{
    fileId?: string;
    url?: string;
    fileName?: string;
  }>({
    fileId: expense.receiptFileId,
    url: expense.receiptUrl,
    fileName: expense.receiptFileName,
  });
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSettled = expense.settlementStatus === 'Settled';
  const parsedAmount = parseFloat(amountStr);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAmountValid) {
      setError('Amount must be greater than zero.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a mandatory audit reason explaining why this expense is being modified.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated: Expense = {
        ...expense,
        date,
        amount: Number(parsedAmount.toFixed(2)),
        amountPaise: toPaise(parsedAmount),
        category,
        description: description.trim(),
        vendor: vendor.trim(),
        purpose: purpose.trim(),
        paymentMethod,
        receiptFileId: receiptInfo.fileId,
        receiptUrl: receiptInfo.url,
        receiptFileName: receiptInfo.fileName,
        updatedAt: new Date().toISOString(),
      };

      await onSave(updated, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Edit Expense Entry</h3>
              <p className="text-[11px] text-slate-400 font-mono">{expense.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {isSettled && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> This expense has already been settled against cash advances. Modifying its amount will affect the settlement ledger.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
              >
                {settings.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor</label>
              <input
                type="text"
                required
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Business Purpose</label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Attachment</label>
            <ReceiptUploader
              receiptUrl={receiptInfo.url}
              receiptFileId={receiptInfo.fileId}
              receiptFileName={receiptInfo.fileName}
              onChange={(info) => setReceiptInfo(info)}
              accessToken={accessToken}
              driveFolderId={settings.driveFolderId}
            />
          </div>

          {/* Mandatory Reason for Audit Log */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              Reason for Modification <span className="text-rose-500">* (Mandatory Audit Requirement)</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Corrected typo in bill amount from receipt verification"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isAmountValid || !reason.trim()}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Audit Correction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
