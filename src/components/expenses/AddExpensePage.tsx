/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Wallet,
  Calendar,
  Building,
  Tag,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Expense, AppSettings, FinancialSummary } from '../../types/index.ts';
import {
  generateId,
  getTodayKolkata,
  formatINR,
  toPaise,
} from '../../utils/currency.ts';
import { ReceiptUploader } from './ReceiptUploader.tsx';
import { PageId } from '../layout/Sidebar.tsx';

interface AddExpensePageProps {
  settings: AppSettings;
  summary: FinancialSummary;
  accessToken: string | null;
  onSaveExpense: (expense: Expense) => Promise<void>;
  onNavigate: (page: PageId) => void;
}

export const AddExpensePage: React.FC<AddExpensePageProps> = ({
  settings,
  summary,
  accessToken,
  onSaveExpense,
  onNavigate,
}) => {
  // Auto-generated immutable Expense ID
  const [expenseId, setExpenseId] = useState(() => generateId('EXP'));
  const [date, setDate] = useState(getTodayKolkata());
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(settings.categories[0] || 'Office supplies');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [purpose, setPurpose] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online/UPI' | 'Other'>('Cash');
  const [notes, setNotes] = useState('');
  const [receiptInfo, setReceiptInfo] = useState<{
    fileId?: string;
    url?: string;
    fileName?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedExpense, setLastSavedExpense] = useState<Expense | null>(null);

  // If settings categories change and current category is invalid
  useEffect(() => {
    if (!settings.categories.includes(category) && settings.categories.length > 0) {
      setCategory(settings.categories[0]);
    }
  }, [settings.categories]);

  const parsedAmount = parseFloat(amountStr);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  // Check receipt requirement
  const isReceiptMandatory =
    settings.receiptMandatory ||
    (settings.receiptThresholdAmount > 0 &&
      isAmountValid &&
      parsedAmount >= settings.receiptThresholdAmount);

  const resetForm = () => {
    setExpenseId(generateId('EXP'));
    setDate(getTodayKolkata());
    setAmountStr('');
    setDescription('');
    setVendor('');
    setPurpose('');
    setNotes('');
    setReceiptInfo({});
    setErrorMessage(null);
    setLastSavedExpense(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!isAmountValid) {
      setErrorMessage('Please enter a valid expense amount greater than zero.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please provide a description for the expense.');
      return;
    }

    if (!vendor.trim()) {
      setErrorMessage('Please provide the vendor or person paid.');
      return;
    }

    if (!purpose.trim()) {
      setErrorMessage('Please specify the business purpose for this expense.');
      return;
    }

    if (isReceiptMandatory && !receiptInfo.url) {
      setErrorMessage(
        `Receipt is required for expenses of ${formatINR(
          settings.receiptThresholdAmount
        )} or higher per company policy.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const newExpense: Expense = {
        id: expenseId,
        date,
        amount: Number(parsedAmount.toFixed(2)),
        amountPaise: toPaise(parsedAmount),
        category,
        description: description.trim(),
        vendor: vendor.trim(),
        purpose: purpose.trim(),
        receiptFileId: receiptInfo.fileId,
        receiptUrl: receiptInfo.url,
        receiptFileName: receiptInfo.fileName,
        paymentMethod,
        recordedBy: settings.userName,
        approvalStatus: 'Recorded',
        settlementStatus: 'Unsettled',
        settledAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveExpense(newExpense);
      setLastSavedExpense(newExpense);
    } catch (err: any) {
      console.error('Save failed:', err);
      setErrorMessage(err.message || 'Failed to save expense. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (lastSavedExpense) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {lastSavedExpense.id}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
              Expense Successfully Recorded!
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Amount of <span className="font-bold text-slate-900">{formatINR(lastSavedExpense.amount)}</span> for{' '}
              <span className="font-medium text-slate-800">{lastSavedExpense.description}</span> has been entered into the ledger.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-left grid grid-cols-2 gap-3 max-w-md mx-auto">
            <div>
              <span className="text-slate-400">Date:</span>
              <p className="font-semibold text-slate-800">{lastSavedExpense.date}</p>
            </div>
            <div>
              <span className="text-slate-400">Category:</span>
              <p className="font-semibold text-slate-800">{lastSavedExpense.category}</p>
            </div>
            <div>
              <span className="text-slate-400">Paid to:</span>
              <p className="font-semibold text-slate-800">{lastSavedExpense.vendor}</p>
            </div>
            <div>
              <span className="text-slate-400">New Cash Balance:</span>
              <p className="font-bold text-emerald-700">{formatINR(summary.currentCalculatedCash)}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Another Expense
            </button>
            <button
              onClick={() => onNavigate('expense-history')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              View in History <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner with live balance context */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            Add Business Expense
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log cash out-of-pocket transactions with bills and business purpose
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 px-3.5 rounded-lg border border-slate-200 text-xs">
          <Wallet className="w-4 h-4 text-slate-500" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Available Cash
            </span>
            <span
              className={`font-bold text-sm ${
                summary.currentCalculatedCash < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {formatINR(summary.currentCalculatedCash)}
            </span>
          </div>
        </div>
      </div>

      {/* Expense Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5"
      >
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Row 1: ID, Date, Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expense ID <span className="text-[10px] text-slate-400 font-normal">(Auto)</span>
            </label>
            <input
              type="text"
              readOnly
              value={expenseId}
              className="w-full text-xs font-mono font-semibold p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 bg-white"
            >
              <option value="Cash">Cash (Petty Cash)</option>
              <option value="Online/UPI">Online / UPI</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Row 2: Amount & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-base">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full text-base font-bold pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
            {isAmountValid && (
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                Will reduce cash balance to: {formatINR(summary.currentCalculatedCash - parsedAmount)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 bg-white"
            >
              {settings.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Refreshments for client visit, 500 copies project brochure"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
          />
        </div>

        {/* Row 4: Paid to / Vendor & Purpose */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Paid to / Vendor <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Tea Stall, QuickPrint Xerox"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purpose of Expense <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Client meeting refreshment, office filing documents"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            />
          </div>
        </div>

        {/* Row 5: Receipt Attachment */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Receipt / Bill Photo{' '}
              {isReceiptMandatory ? (
                <span className="text-rose-600 font-bold">* (Mandatory per policy)</span>
              ) : (
                <span className="text-slate-400 font-normal">(Optional)</span>
              )}
            </label>
            {settings.receiptThresholdAmount > 0 && (
              <span className="text-[10px] text-slate-400">
                Required for amounts ≥ {formatINR(settings.receiptThresholdAmount)}
              </span>
            )}
          </div>
          <ReceiptUploader
            receiptUrl={receiptInfo.url}
            receiptFileId={receiptInfo.fileId}
            receiptFileName={receiptInfo.fileName}
            onChange={(info) => setReceiptInfo(info)}
            accessToken={accessToken}
            driveFolderId={settings.driveFolderId}
          />
        </div>

        {/* Row 6: Recorded By & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recorded By
            </label>
            <input
              type="text"
              readOnly
              value={settings.userName}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Additional Info
            </label>
            <input
              type="text"
              placeholder="e.g. Cash paid from desk drawer box"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isAmountValid}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Recording Expense...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Save Expense to Ledger</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
