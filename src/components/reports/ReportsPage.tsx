/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileBarChart,
  Download,
  Calendar,
  Filter,
  FileText,
  HandCoins,
  Scale,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  Expense,
  CashReceived,
  SettlementRecord,
  ExpenseStatement,
  CashReconciliation,
  AppSettings,
  FinancialSummary,
} from '../../types/index.ts';
import { formatINR, formatDate, getTodayKolkata } from '../../utils/currency.ts';
import { computeMonthlyLedger } from '../../utils/calculations.ts';
import {
  exportExpenseStatementPDF,
  exportMonthlyReportPDF,
  exportFullExcelWorkbook,
} from '../../utils/exports.ts';

interface ReportsPageProps {
  expenses: Expense[];
  cashReceived: CashReceived[];
  settlements: SettlementRecord[];
  statements: ExpenseStatement[];
  reconciliations: CashReconciliation[];
  summary: FinancialSummary;
  settings: AppSettings;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  expenses,
  cashReceived,
  settlements,
  statements,
  reconciliations,
  summary,
  settings,
}) => {
  const [activeReport, setActiveReport] = useState<'statement' | 'cash' | 'monthly' | 'reconciliation'>(
    'monthly'
  );
  const [datePreset, setDatePreset] = useState<'all' | 'this-month' | 'last-month' | 'this-year' | 'custom'>(
    'all'
  );
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedStatementId, setSelectedStatementId] = useState<string>(
    statements[0]?.id || ''
  );

  // Derive date bounds from preset
  const dateBounds = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (datePreset === 'this-month') {
      const start = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const end = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (datePreset === 'last-month') {
      const start = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const end = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (datePreset === 'this-year') {
      const start = `${currentYear}-01-01`;
      const end = `${currentYear}-12-31`;
      return { start, end };
    }
    if (datePreset === 'custom') {
      return { start: customStart, end: customEnd };
    }
    return { start: '', end: '' };
  }, [datePreset, customStart, customEnd]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (dateBounds.start && e.date < dateBounds.start) return false;
      if (dateBounds.end && e.date > dateBounds.end) return false;
      return true;
    });
  }, [expenses, dateBounds]);

  // Filtered cash
  const filteredCash = useMemo(() => {
    return cashReceived.filter((c) => {
      if (dateBounds.start && c.date < dateBounds.start) return false;
      if (dateBounds.end && c.date > dateBounds.end) return false;
      return true;
    });
  }, [cashReceived, dateBounds]);

  // Monthly ledger
  const monthlyLedger = useMemo(() => {
    return computeMonthlyLedger(expenses, cashReceived, settlements, settings);
  }, [expenses, cashReceived, settlements, settings]);

  const activeStatement = statements.find((s) => s.id === selectedStatementId) || statements[0];
  const statementExpenses = activeStatement
    ? expenses.filter((e) => e.statementId === activeStatement.id)
    : [];

  const handleDownloadFullExcel = () => {
    exportFullExcelWorkbook({
      expenses: filteredExpenses,
      cashReceived: filteredCash,
      settlements,
      statements,
      monthlyLedger,
      reconciliations,
      summary,
      settings,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-emerald-600" />
            Financial & Accounting Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade reporting, PDF print statements, and Excel workbooks
          </p>
        </div>

        <button
          onClick={handleDownloadFullExcel}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-xs transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Full Excel (.XLSX)</span>
        </button>
      </div>

      {/* Preset Filters and Report Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Report Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveReport('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeReport === 'monthly'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Monthly Ledger Summary
          </button>
          <button
            onClick={() => setActiveReport('statement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeReport === 'statement'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Expense Statements
          </button>
          <button
            onClick={() => setActiveReport('cash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeReport === 'cash'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Cash Received History
          </button>
          <button
            onClick={() => setActiveReport('reconciliation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeReport === 'reconciliation'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Replenishment Reconciliation
          </button>
        </div>

        {/* Date presets */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Period:</span>
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as any)}
            className="p-1.5 rounded-md border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Records</option>
            <option value="this-month">Current Month</option>
            <option value="last-month">Previous Month</option>
            <option value="this-year">Current Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {datePreset === 'custom' && (
            <div className="flex items-center space-x-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="p-1 rounded border border-slate-300 text-xs"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="p-1 rounded border border-slate-300 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* REPORT CONTENT VIEW */}
      {/* A. MONTHLY LEDGER SUMMARY */}
      {activeReport === 'monthly' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Monthly Accounting Ledger & Balances
              </h3>
              <p className="text-[11px] text-slate-500">
                Opening cash, advances received, expenses recorded, settled, and closing cash
              </p>
            </div>
            <button
              onClick={() => exportMonthlyReportPDF(monthlyLedger, settings)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Month</th>
                  <th className="py-3 px-3.5 text-right">Opening Cash</th>
                  <th className="py-3 px-3.5 text-right">Advances Received</th>
                  <th className="py-3 px-3.5 text-right">Expenses Recorded</th>
                  <th className="py-3 px-3.5 text-right">Expenses Settled</th>
                  <th className="py-3 px-3.5 text-right">Closing Cash</th>
                  <th className="py-3 px-3.5 text-right">Outstanding Advance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthlyLedger.map((row) => (
                  <tr key={row.monthKey} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3.5 font-bold text-slate-900">{row.monthLabel}</td>
                    <td className="py-3 px-3.5 text-right text-slate-600">
                      {formatINR(row.openingCash)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-emerald-700 font-semibold">
                      +{formatINR(row.cashReceived)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-rose-600 font-semibold">
                      -{formatINR(row.expensesRecorded)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-indigo-700 font-semibold">
                      {formatINR(row.expensesSettled)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-extrabold text-slate-900">
                      {formatINR(row.closingCalculatedCash)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-blue-700">
                      {formatINR(row.outstandingAdvance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B. EXPENSE STATEMENTS REPORT */}
      {activeReport === 'statement' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-slate-700">Select Statement:</span>
              <select
                value={selectedStatementId}
                onChange={(e) => setSelectedStatementId(e.target.value)}
                className="text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium"
              >
                {statements.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} ({formatDate(s.startDate)} - {formatDate(s.endDate)}) — {formatINR(s.totalSubmitted)}
                  </option>
                ))}
              </select>
            </div>

            {activeStatement && (
              <button
                onClick={() =>
                  exportExpenseStatementPDF(activeStatement, statementExpenses, settings)
                }
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Print-Ready PDF</span>
              </button>
            )}
          </div>

          {activeStatement ? (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Statement ID</span>
                  <p className="font-bold text-slate-900">{activeStatement.id}</p>
                </div>
                <div>
                  <span className="text-slate-400">Submission Date</span>
                  <p className="font-bold text-slate-900">{formatDate(activeStatement.submissionDate)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Total Submitted</span>
                  <p className="font-extrabold text-blue-800">{formatINR(activeStatement.totalSubmitted)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Settled Amount</span>
                  <p className="font-extrabold text-emerald-800">{formatINR(activeStatement.totalSettled)}</p>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Vendor</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3">Approval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {statementExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">{formatDate(e.date)}</td>
                        <td className="py-2.5 px-3">{e.category}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{e.description}</td>
                        <td className="py-2.5 px-3">{e.vendor}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{formatINR(e.amount)}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                            {e.approvalStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-center py-10 text-xs text-slate-400">
              No statements created yet. Go to Advance Settlement to create one!
            </p>
          )}
        </div>
      )}

      {/* C. CASH RECEIVED HISTORY REPORT */}
      {activeReport === 'cash' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Chronological Cash Advances & Receipts
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              Period Total: {formatINR(filteredCash.reduce((s, c) => s + c.amount, 0))}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">ID</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5">Received From</th>
                  <th className="py-3 px-3.5">Reference</th>
                  <th className="py-3 px-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCash.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">{c.id}</td>
                    <td className="py-3 px-3.5">{formatDate(c.date)}</td>
                    <td className="py-3 px-3.5">{c.transactionType}</td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">{c.receivedFrom}</td>
                    <td className="py-3 px-3.5 text-slate-500">{c.referenceNumber || '-'}</td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-700">
                      {formatINR(c.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* D. REPLENISHMENT RECONCILIATION */}
      {activeReport === 'reconciliation' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">
              Comprehensive Advance Reconciliation Statement
            </h3>
            <p className="text-xs text-slate-500">
              Complete proof reconciling advances received against expenses accounted for
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Cash In Hand Proof */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <HandCoins className="w-4 h-4 text-emerald-600" />
                Physical Cash In Hand Proof
              </h4>
              <div className="divide-y divide-slate-200 text-xs">
                <div className="py-2 flex justify-between">
                  <span>Opening Cash Balance:</span>
                  <span className="font-semibold">{formatINR(summary.openingCash)}</span>
                </div>
                <div className="py-2 flex justify-between text-emerald-700">
                  <span>(+) Total Cash Advances Received:</span>
                  <span className="font-bold">+{formatINR(summary.totalCashReceived)}</span>
                </div>
                <div className="py-2 flex justify-between text-rose-600">
                  <span>(−) Total Cash Expenses Paid:</span>
                  <span className="font-bold">−{formatINR(summary.totalExpensesRecorded)}</span>
                </div>
                <div className="py-2.5 flex justify-between font-extrabold text-sm border-t-2 border-slate-300 text-slate-900">
                  <span>(=) Current Calculated Cash:</span>
                  <span className="text-emerald-700">{formatINR(summary.currentCalculatedCash)}</span>
                </div>
              </div>
            </div>

            {/* Outstanding Advance Proof */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                Manager Advance Liability Proof
              </h4>
              <div className="divide-y divide-slate-200 text-xs">
                <div className="py-2 flex justify-between">
                  <span>Opening Outstanding Advance:</span>
                  <span className="font-semibold">{formatINR(settings.openingAdvanceBalance)}</span>
                </div>
                <div className="py-2 flex justify-between text-blue-700">
                  <span>(+) Total Advances Received:</span>
                  <span className="font-bold">+{formatINR(summary.totalCashReceived)}</span>
                </div>
                <div className="py-2 flex justify-between text-emerald-700">
                  <span>(−) Formally Settled Expenses:</span>
                  <span className="font-bold">−{formatINR(summary.totalExpensesSettled)}</span>
                </div>
                <div className="py-2.5 flex justify-between font-extrabold text-sm border-t-2 border-slate-300 text-slate-900">
                  <span>(=) Outstanding Advance Liability:</span>
                  <span className="text-blue-800">{formatINR(summary.outstandingAdvanceBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
