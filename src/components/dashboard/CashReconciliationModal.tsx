/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Scale,
  AlertTriangle,
  CheckCircle2,
  History,
  ShieldAlert,
  Coins,
} from 'lucide-react';
import { CashReconciliation, AppSettings } from '../../types/index.ts';
import { formatINR, getTodayKolkata, generateId, formatDate } from '../../utils/currency.ts';

interface CashReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculatedCashBalance: number;
  reconciliations: CashReconciliation[];
  settings: AppSettings;
  onSaveReconciliation: (rec: CashReconciliation, createAdjustment: boolean, reason?: string) => void;
}

export const CashReconciliationModal: React.FC<CashReconciliationModalProps> = ({
  isOpen,
  onClose,
  calculatedCashBalance,
  reconciliations,
  settings,
  onSaveReconciliation,
}) => {
  const [date, setDate] = useState(getTodayKolkata());
  const [physicalCountedStr, setPhysicalCountedStr] = useState('');
  const [notes, setNotes] = useState('');
  const [createAdjustment, setCreateAdjustment] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [activeTab, setActiveTab] = useState<'audit' | 'history'>('audit');

  if (!isOpen) return null;

  const physicalCounted = parseFloat(physicalCountedStr);
  const isValidNumber = !isNaN(physicalCounted) && physicalCounted >= 0;
  const discrepancy = isValidNumber ? physicalCounted - calculatedCashBalance : 0;
  const hasDiscrepancy = isValidNumber && Math.abs(discrepancy) > 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNumber) return;

    if (createAdjustment && !adjustmentReason.trim()) {
      alert('Please specify a formal accounting justification for creating a balance adjustment.');
      return;
    }

    const rec: CashReconciliation = {
      id: generateId('REC'),
      date,
      calculatedCashBalance,
      physicalCashCounted: physicalCounted,
      discrepancy: Number(discrepancy.toFixed(2)),
      notes: notes.trim() || undefined,
      recordedBy: settings.userName,
      createdAt: new Date().toISOString(),
    };

    onSaveReconciliation(rec, createAdjustment, adjustmentReason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Petty Cash Drawer Reconciliation</h3>
              <p className="text-[11px] text-slate-400">
                Verify physical cash in hand against calculated accounting balance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Perform Drawer Audit
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit History ({reconciliations.length})
          </button>
        </div>

        {activeTab === 'audit' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Balance Reference Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Current Calculated Cash Balance
                </span>
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatINR(calculatedCashBalance)}
                </p>
              </div>
              <Coins className="w-8 h-8 text-slate-400" />
            </div>

            {/* Audit Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Date (Asia/Kolkata) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Physical Cash Counted */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Physical Cash Counted in Drawer (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={physicalCountedStr}
                  onChange={(e) => setPhysicalCountedStr(e.target.value)}
                  className="w-full text-sm pl-8 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Count notes and coins physically present in the cash drawer or envelope.
              </p>
            </div>

            {/* Real-time Discrepancy Indicator */}
            {isValidNumber && (
              <div
                className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
                  hasDiscrepancy
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                {hasDiscrepancy ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {hasDiscrepancy ? (
                      discrepancy > 0 ? (
                        <>Cash Surplus: +{formatINR(discrepancy)}</>
                      ) : (
                        <>Cash Deficit: {formatINR(discrepancy)}</>
                      )
                    ) : (
                      <>Perfect Match! Zero Discrepancy</>
                    )}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Calculated: {formatINR(calculatedCashBalance)} | Counted: {formatINR(physicalCounted)}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reconciliation Notes
              </label>
              <input
                type="text"
                placeholder="e.g. End-of-week verification, petty cash envelope count"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Controlled Correction Checkbox (Section 13 Integrity Safeguard) */}
            {hasDiscrepancy && (
              <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl space-y-2.5">
                <div className="flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <label className="text-xs text-amber-950 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAdjustment}
                      onChange={(e) => setCreateAdjustment(e.target.checked)}
                      className="rounded border-amber-400 text-emerald-600 focus:ring-emerald-500 mr-2"
                    />
                    Create formal auditable adjustment entry to align calculated ledger with physical cash
                  </label>
                </div>

                {createAdjustment && (
                  <div className="pl-6">
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Reason for Correction / Adjustment <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Unrecorded parking toll receipt or verified cash rounding"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValidNumber}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
              >
                Record Reconciliation
              </button>
            </div>
          </form>
        ) : (
          /* AUDIT HISTORY TAB */
          <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
            {reconciliations.length === 0 ? (
              <p className="text-center py-10 text-xs text-slate-400">
                No past drawer reconciliations recorded.
              </p>
            ) : (
              reconciliations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{formatDate(rec.date)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{rec.id}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Counted: {formatINR(rec.physicalCashCounted)} | Expected: {formatINR(rec.calculatedCashBalance)}
                    </p>
                    {rec.notes && (
                      <p className="text-slate-500 italic text-[10px] mt-0.5">"{rec.notes}"</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        Math.abs(rec.discrepancy) < 0.01
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {Math.abs(rec.discrepancy) < 0.01
                        ? '0.00 Match'
                        : `${rec.discrepancy > 0 ? '+' : ''}${formatINR(rec.discrepancy)}`}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{rec.recordedBy}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
