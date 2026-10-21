/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  HandCoins,
  PlusCircle,
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Download,
} from 'lucide-react';
import { CashReceived, AppSettings, TransactionType } from '../../types/index.ts';
import {
  generateId,
  getTodayKolkata,
  formatINR,
  formatDate,
  toPaise,
} from '../../utils/currency.ts';

interface CashReceivedPageProps {
  cashReceived: CashReceived[];
  settings: AppSettings;
  onSaveCashReceived: (entry: CashReceived) => Promise<void>;
}

export const CashReceivedPage: React.FC<CashReceivedPageProps> = ({
  cashReceived,
  settings,
  onSaveCashReceived,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionId, setTransactionId] = useState(() => generateId('CR'));
  const [date, setDate] = useState(getTodayKolkata());
  const [amountStr, setAmountStr] = useState('');
  const [receivedFrom, setReceivedFrom] = useState(settings.managerName);
  const [transactionType, setTransactionType] = useState<TransactionType>('Additional advance');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [relatedStatementId, setRelatedStatementId] = useState('');
  const [notes, setNotes] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amountStr);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAmountValid) {
      setError('Amount must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const entry: CashReceived = {
        id: transactionId,
        date,
        amount: Number(parsedAmount.toFixed(2)),
        amountPaise: toPaise(parsedAmount),
        receivedFrom: receivedFrom.trim() || settings.managerName,
        transactionType,
        referenceNumber: referenceNumber.trim() || undefined,
        relatedStatementId: relatedStatementId.trim() || undefined,
        notes: notes.trim() || undefined,
        recordedBy: settings.userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveCashReceived(entry);
      setIsFormOpen(false);
      setTransactionId(generateId('CR'));
      setAmountStr('');
      setReferenceNumber('');
      setRelatedStatementId('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to record cash inflow.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered entries
  const filteredList = useMemo(() => {
    return cashReceived.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.id.toLowerCase().includes(q) ||
          item.receivedFrom.toLowerCase().includes(q) ||
          (item.referenceNumber && item.referenceNumber.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (filterType !== 'All' && item.transactionType !== filterType) {
        return false;
      }

      return true;
    });
  }, [cashReceived, searchQuery, filterType]);

  const totalReceived = useMemo(() => {
    return cashReceived
      .filter((c) => c.transactionType !== 'Repayment to manager')
      .reduce((sum, c) => sum + c.amount, 0);
  }, [cashReceived]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-blue-600" />
            Cash Received & Advances Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record advances handed over by the manager and cash replenishment inflows
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Total Cash Received
            </span>
            <span className="font-bold text-base text-blue-700">{formatINR(totalReceived)}</span>
          </div>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isFormOpen ? 'Close Form' : 'Record Cash Received'}</span>
          </button>
        </div>
      </div>

      {/* Entry Form Card */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-blue-200 shadow-xs p-6 space-y-4 animate-in fade-in duration-200"
        >
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              New Cash Inflow / Advance Entry
            </h3>
            <span className="text-xs font-mono text-slate-400 font-semibold">{transactionId}</span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date Received <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Received (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full text-sm font-bold pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
              >
                <option value="Initial advance">Initial advance</option>
                <option value="Additional advance">Additional advance</option>
                <option value="Replenishment">Replenishment</option>
                <option value="Other cash inflow">Other cash inflow</option>
                <option value="Repayment to manager">Repayment to manager</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Received From <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference / Bank Slip # <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CHEQ-49201 or ATM Withdrawal"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Related Statement ID <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. STMT-20261005-XXXX"
                value={relatedStatementId}
                onChange={(e) => setRelatedStatementId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Handover in office for regional travel expenses"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isAmountValid}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Cash Received'}
            </button>
          </div>
        </form>
      )}

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, received from, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Initial advance">Initial advance</option>
              <option value="Additional advance">Additional advance</option>
              <option value="Replenishment">Replenishment</option>
              <option value="Other cash inflow">Other cash inflow</option>
              <option value="Repayment to manager">Repayment to manager</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Transaction ID</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Received From</th>
                <th className="py-3 px-3.5">Reference / Notes</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
                <th className="py-3 px-3.5">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No cash received transactions found.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      {item.id}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-800">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          item.transactionType === 'Repayment to manager'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">
                      {item.receivedFrom}
                    </td>
                    <td className="py-3 px-3.5 max-w-[240px]">
                      {item.referenceNumber && (
                        <p className="font-mono text-[11px] text-slate-600 font-medium">
                          Ref: {item.referenceNumber}
                        </p>
                      )}
                      <p className="text-slate-500 text-[11px] truncate">{item.notes || '-'}</p>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <span
                        className={`font-bold text-sm ${
                          item.transactionType === 'Repayment to manager'
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {item.transactionType === 'Repayment to manager' ? '-' : '+'}
                        {formatINR(item.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {item.recordedBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
