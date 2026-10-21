/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Scale,
  PlusCircle,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Coins,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Info,
  DollarSign,
  Download,
} from 'lucide-react';
import {
  Expense,
  ExpenseStatement,
  SettlementRecord,
  AppSettings,
  FinancialSummary,
} from '../../types/index.ts';
import {
  formatINR,
  formatDate,
  generateId,
  getTodayKolkata,
  toPaise,
} from '../../utils/currency.ts';
import { exportExpenseStatementPDF } from '../../utils/exports.ts';

interface AdvanceSettlementPageProps {
  expenses: Expense[];
  statements: ExpenseStatement[];
  settlements: SettlementRecord[];
  summary: FinancialSummary;
  settings: AppSettings;
  onSaveStatement: (stmt: ExpenseStatement, expenseIds: string[]) => Promise<void>;
  onApproveAndSettle: (
    statementId: string,
    approvedExpenseIds: string[],
    rejectedExpenseIds: string[],
    settleNow: boolean
  ) => Promise<void>;
}

export const AdvanceSettlementPage: React.FC<AdvanceSettlementPageProps> = ({
  expenses,
  statements,
  settlements,
  summary,
  settings,
  onSaveStatement,
  onApproveAndSettle,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'new-statement' | 'statements' | 'ledger'>(
    'overview'
  );

  // New Statement state
  const [statementId, setStatementId] = useState(() => generateId('STMT'));
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [stmtStartDate, setStmtStartDate] = useState('');
  const [stmtEndDate, setStmtEndDate] = useState(getTodayKolkata());
  const [stmtSubmissionDate, setStmtSubmissionDate] = useState(getTodayKolkata());
  const [stmtNotes, setStmtNotes] = useState('');
  const [isSubmittingStmt, setIsSubmittingStmt] = useState(false);

  // Review & Settle modal state
  const [reviewStatement, setReviewStatement] = useState<ExpenseStatement | null>(null);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);
  const [settleImmediately, setSettleImmediately] = useState(true);
  const [isProcessingSettlement, setIsProcessingSettlement] = useState(false);

  // Unsubmitted expenses available for new statement
  const unsubmittedExpenses = useMemo(() => {
    return expenses.filter(
      (e) => !e.statementId && (e.approvalStatus === 'Recorded' || e.approvalStatus === 'Draft')
    );
  }, [expenses]);

  // Handle select all unsubmitted
  const handleToggleSelectAll = () => {
    if (selectedExpenseIds.length === unsubmittedExpenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(unsubmittedExpenses.map((e) => e.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedTotal = useMemo(() => {
    return unsubmittedExpenses
      .filter((e) => selectedExpenseIds.includes(e.id))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [unsubmittedExpenses, selectedExpenseIds]);

  const handleCreateStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedExpenseIds.length === 0) {
      alert('Please select at least one expense to include in this statement.');
      return;
    }

    try {
      setIsSubmittingStmt(true);
      const selectedExps = unsubmittedExpenses.filter((e) => selectedExpenseIds.includes(e.id));
      const dates = selectedExps.map((e) => e.date).sort();
      const derivedStart = stmtStartDate || dates[0] || getTodayKolkata();
      const derivedEnd = stmtEndDate || dates[dates.length - 1] || getTodayKolkata();

      const newStmt: ExpenseStatement = {
        id: statementId,
        startDate: derivedStart,
        endDate: derivedEnd,
        submissionDate: stmtSubmissionDate,
        expenseIds: selectedExpenseIds,
        totalSubmitted: Number(selectedTotal.toFixed(2)),
        totalApproved: 0,
        totalRejected: 0,
        totalSettled: 0,
        remainingAmount: Number(selectedTotal.toFixed(2)),
        status: 'Submitted',
        notes: stmtNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveStatement(newStmt, selectedExpenseIds);
      setSelectedExpenseIds([]);
      setStatementId(generateId('STMT'));
      setStmtNotes('');
      setActiveTab('statements');
    } catch (err: any) {
      alert(err.message || 'Failed to submit statement.');
    } finally {
      setIsSubmittingStmt(false);
    }
  };

  // Open Review & Settle modal for a statement
  const openReviewModal = (stmt: ExpenseStatement) => {
    setReviewStatement(stmt);
    const stmtExpenses = expenses.filter((e) => e.statementId === stmt.id);
    // By default, approve all currently non-rejected items
    const approved = stmtExpenses
      .filter((e) => e.approvalStatus !== 'Rejected')
      .map((e) => e.id);
    const rejected = stmtExpenses
      .filter((e) => e.approvalStatus === 'Rejected')
      .map((e) => e.id);
    setApprovedIds(approved);
    setRejectedIds(rejected);
    setSettleImmediately(true);
  };

  const handleExecuteSettlement = async () => {
    if (!reviewStatement) return;
    try {
      setIsProcessingSettlement(true);
      await onApproveAndSettle(
        reviewStatement.id,
        approvedIds,
        rejectedIds,
        settleImmediately
      );
      setReviewStatement(null);
    } catch (err: any) {
      alert(err.message || 'Settlement failed');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Clear Educational Separation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Scale className="w-6 h-6 text-amber-600" />
              Advance Settlement & Accountability
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit expense statements to {settings.managerName} and formally settle advances
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('new-statement')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Expense Statement</span>
            </button>
          </div>
        </div>

        {/* Vital Accounting Integrity Clarification Banner */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-950">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">
              Accounting Principle: Outstanding Advance vs Unspent Physical Cash
            </p>
            <p className="text-slate-700 leading-relaxed">
              <strong>Available Cash ({formatINR(summary.currentCalculatedCash)}):</strong> Cash
              physically remaining in hand after paying out-of-pocket expenses.
              <br />
              <strong>Outstanding Advance ({formatINR(summary.outstandingAdvanceBalance)}):</strong> Money
              borrowed from {settings.managerName} for which the employee remains accountable until
              expenses are formally settled. Receiving new cash replenishes physical funds, but does
              <strong> NOT</strong> automatically settle prior advances.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold pt-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Reconciliation Overview
          </button>
          <button
            onClick={() => setActiveTab('new-statement')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'new-statement'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Statement ({unsubmittedExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('statements')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'statements'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Expense Statements ({statements.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Settlement Ledger ({settlements.length})
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Advances Received
              </span>
              <p className="text-2xl font-extrabold text-blue-700 mt-1">
                {formatINR(summary.totalCashReceived)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Total company cash given</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Expenses Settled
              </span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                {formatINR(summary.totalExpensesSettled)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Formally cleared in ledger</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Awaiting Approval
              </span>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">
                {formatINR(summary.amountAwaitingApproval)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">In submitted statements</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Outstanding Advance
              </span>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">
                {formatINR(summary.outstandingAdvanceBalance)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Remaining liability to clear</p>
            </div>
          </div>

          {/* Quick statement trigger card */}
          {unsubmittedExpenses.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {unsubmittedExpenses.length} Expenses Ready for Settlement Statement
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  You have{' '}
                  <strong className="text-emerald-800">
                    {formatINR(unsubmittedExpenses.reduce((s, e) => s + e.amount, 0))}
                  </strong>{' '}
                  in recorded petty cash expenses awaiting statement preparation.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('new-statement')}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shrink-0"
              >
                Create Statement Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE STATEMENT FORM */}
      {activeTab === 'new-statement' && (
        <form
          onSubmit={handleCreateStatement}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Prepare Expense Statement for {settings.managerName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Batch individual recorded expenses into a verifiable statement
              </p>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500">Selected: {selectedExpenseIds.length} items</span>
              <span className="font-extrabold text-sm text-emerald-700">
                {formatINR(selectedTotal)}
              </span>
            </div>
          </div>

          {/* Statement metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Statement ID</label>
              <input
                type="text"
                readOnly
                value={statementId}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-100 font-mono text-slate-600 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Period Start</label>
              <input
                type="date"
                value={stmtStartDate}
                onChange={(e) => setStmtStartDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Period End</label>
              <input
                type="date"
                value={stmtEndDate}
                onChange={(e) => setStmtEndDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Submission Date</label>
              <input
                type="date"
                required
                value={stmtSubmissionDate}
                onChange={(e) => setStmtSubmissionDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Statement Summary / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. October 1st - 15th Regional branch client visits and office supplies"
              value={stmtNotes}
              onChange={(e) => setStmtNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-medium"
            />
          </div>

          {/* Expenses Selection Checklist */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Select Unsettled Expenses to Include ({unsubmittedExpenses.length} available)
              </span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-emerald-700 font-semibold hover:underline"
              >
                {selectedExpenseIds.length === unsubmittedExpenses.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            {unsubmittedExpenses.length === 0 ? (
              <div className="text-center py-12 border rounded-xl border-dashed border-slate-300 text-slate-400 text-xs">
                No unsubmitted expenses available. Add expenses first!
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {unsubmittedExpenses.map((exp) => {
                  const isChecked = selectedExpenseIds.includes(exp.id);
                  return (
                    <div
                      key={exp.id}
                      onClick={() => handleToggleSelect(exp.id)}
                      className={`p-3.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{exp.description}</p>
                          <p className="text-slate-500 text-[11px]">
                            {formatDate(exp.date)} • {exp.category} • Paid to: {exp.vendor || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatINR(exp.amount)}
                        </span>
                        {exp.receiptUrl ? (
                          <span className="block text-[10px] text-emerald-600 font-medium">
                            Receipt attached
                          </span>
                        ) : (
                          <span className="block text-[10px] text-slate-400">No receipt</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total to submit:{' '}
              <strong className="text-slate-900 text-sm">{formatINR(selectedTotal)}</strong>
            </span>
            <button
              type="submit"
              disabled={isSubmittingStmt || selectedExpenseIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 disabled:opacity-50 shadow-xs transition-colors"
            >
              {isSubmittingStmt ? 'Submitting Statement...' : 'Submit Statement to Manager'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: STATEMENTS LIST */}
      {activeTab === 'statements' && (
        <div className="space-y-4">
          {statements.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              No expense statements submitted yet.
            </div>
          ) : (
            statements.map((stmt) => {
              const stmtExpenses = expenses.filter((e) => e.statementId === stmt.id);

              return (
                <div
                  key={stmt.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {stmt.id}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                              stmt.status === 'Settled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : stmt.status === 'Approved'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {stmt.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Period: {formatDate(stmt.startDate)} to {formatDate(stmt.endDate)} •
                          Submitted on {formatDate(stmt.submissionDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => exportExpenseStatementPDF(stmt, stmtExpenses, settings)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                        title="Download Statement PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      {stmt.status !== 'Settled' && (
                        <button
                          onClick={() => openReviewModal(stmt)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Review & Settle</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400">Total Submitted</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {formatINR(stmt.totalSubmitted)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Approved</span>
                      <p className="font-bold text-blue-700 text-sm">
                        {formatINR(stmt.totalApproved)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Settled Against Advance</span>
                      <p className="font-bold text-emerald-700 text-sm">
                        {formatINR(stmt.totalSettled)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Remaining Unsettled</span>
                      <p className="font-bold text-amber-700 text-sm">
                        {formatINR(stmt.remainingAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Itemized expenses preview */}
                  <div className="text-xs">
                    <span className="text-slate-500 font-semibold mb-2 block">
                      Statement Line Items ({stmtExpenses.length})
                    </span>
                    <div className="divide-y divide-slate-100 border rounded-lg border-slate-200">
                      {stmtExpenses.map((exp) => (
                        <div
                          key={exp.id}
                          className="p-2.5 px-3 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{exp.description}</span>
                            <span className="text-slate-400 text-[11px] ml-2">
                              {formatDate(exp.date)} • {exp.vendor}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                exp.approvalStatus === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : exp.approvalStatus === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {exp.approvalStatus}
                            </span>
                            <span className="font-bold text-slate-900">{formatINR(exp.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: SETTLEMENT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">
              Advance Settlement Ledger Records
            </h3>
            <span className="text-xs text-slate-500">
              Total Formally Settled: <strong className="text-emerald-700">{formatINR(summary.totalExpensesSettled)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Settlement ID</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Statement Reference</th>
                  <th className="py-3 px-3.5">Expense Reference</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5 text-right">Amount Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No settlement allocations recorded yet.
                    </td>
                  </tr>
                ) : (
                  settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">{s.id}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">{formatDate(s.date)}</td>
                      <td className="py-3 px-3.5 font-mono text-blue-700 font-semibold">
                        {s.statementId}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">{s.expenseId}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[10px] uppercase">
                          {s.settlementType}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatINR(s.amountSettled)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVIEW & SETTLE STATEMENT MODAL */}
      {reviewStatement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Manager Review & Settlement</h3>
                <p className="text-[11px] text-slate-400 font-mono">{reviewStatement.id}</p>
              </div>
              <button
                onClick={() => setReviewStatement(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <p className="text-slate-600">
                Mark line items as <strong>Approved</strong> or <strong>Rejected</strong> following review by {settings.managerName}.
              </p>

              {/* Items checklist */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {expenses
                  .filter((e) => e.statementId === reviewStatement.id)
                  .map((exp) => {
                    const isAppr = approvedIds.includes(exp.id);
                    return (
                      <div
                        key={exp.id}
                        className="p-3 flex items-center justify-between bg-white hover:bg-slate-50"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{exp.description}</p>
                          <p className="text-[11px] text-slate-400">
                            {formatDate(exp.date)} • {exp.vendor}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-slate-900">{formatINR(exp.amount)}</span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setApprovedIds((prev) =>
                                  prev.includes(exp.id) ? prev : [...prev, exp.id]
                                );
                                setRejectedIds((prev) => prev.filter((i) => i !== exp.id));
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                                isAppr
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectedIds((prev) =>
                                  prev.includes(exp.id) ? prev : [...prev, exp.id]
                                );
                                setApprovedIds((prev) => prev.filter((i) => i !== exp.id));
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                                !isAppr
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Settle against advance option */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-2">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settleImmediately}
                    onChange={(e) => setSettleImmediately(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-950 block">
                      Formally Settle Approved Items Against Cash Advance
                    </span>
                    <span className="text-emerald-800 text-[11px]">
                      This will write to the formal Settlement Ledger and reduce the Outstanding Advance balance without altering cash in hand.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setReviewStatement(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSettlement}
                  disabled={isProcessingSettlement}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isProcessingSettlement ? 'Processing...' : 'Confirm Review & Settlement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
