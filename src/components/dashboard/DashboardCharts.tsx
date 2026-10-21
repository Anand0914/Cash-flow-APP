/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Expense, CashReceived, SettlementRecord, AppSettings } from '../../types/index.ts';
import { formatINR } from '../../utils/currency.ts';
import { computeMonthlyLedger } from '../../utils/calculations.ts';

interface DashboardChartsProps {
  expenses: Expense[];
  cashReceived: CashReceived[];
  settlements: SettlementRecord[];
  settings: AppSettings;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  expenses,
  cashReceived,
  settlements,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'category' | 'settlement'>('monthly');

  // Compute monthly data
  const monthlyLedger = useMemo(() => {
    return computeMonthlyLedger(expenses, cashReceived, settlements, settings);
  }, [expenses, cashReceived, settlements, settings]);

  // Compute category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    expenses.forEach((e) => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + e.amount;
      total += e.amount;
    });

    const entries = Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));

    return entries.sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Compute settlement status breakdown
  const settlementBreakdown = useMemo(() => {
    let unsubmitted = 0;
    let submitted = 0;
    let approved = 0;
    let settled = 0;
    let rejected = 0;

    expenses.forEach((e) => {
      if (e.settlementStatus === 'Settled') {
        settled += e.amount;
      } else if (e.approvalStatus === 'Approved') {
        approved += e.amount;
      } else if (e.approvalStatus === 'Submitted') {
        submitted += e.amount;
      } else if (e.approvalStatus === 'Rejected') {
        rejected += e.amount;
      } else {
        unsubmitted += e.amount;
      }
    });

    return [
      { label: 'Settled Against Advance', amount: settled, color: 'bg-emerald-500' },
      { label: 'Approved (Pending Settle)', amount: approved, color: 'bg-blue-500' },
      { label: 'Submitted to Manager', amount: submitted, color: 'bg-indigo-500' },
      { label: 'Recorded (Not Submitted)', amount: unsubmitted, color: 'bg-amber-500' },
      { label: 'Rejected', amount: rejected, color: 'bg-rose-500' },
    ];
  }, [expenses]);

  // Max value for monthly chart scaling
  const maxMonthlyVal = useMemo(() => {
    let max = 1000;
    monthlyLedger.forEach((m) => {
      if (m.cashReceived > max) max = m.cashReceived;
      if (m.expensesRecorded > max) max = m.expensesRecorded;
      if (m.closingCalculatedCash > max) max = m.closingCalculatedCash;
    });
    return max * 1.15;
  }, [monthlyLedger]);

  const CATEGORY_COLORS = [
    '#10B981', // emerald-500
    '#3B82F6', // blue-500
    '#F59E0B', // amber-500
    '#8B5CF6', // purple-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#64748B', // slate-500
    '#14B8A6', // teal-500
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header and View Selector */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-sm">Financial Trends & Analysis</h3>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg self-start sm:self-center">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'monthly'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cash vs Expenses
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'category'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => setActiveTab('settlement')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'settlement'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settlement Status
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* VIEW 1: MONTHLY CASH VS EXPENSES BAR & BALANCE CHART */}
        {activeTab === 'monthly' && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-6 flex-wrap gap-3">
              <span className="font-medium text-slate-700">Monthly Cash Inflow vs Expenses vs Closing Cash Balance</span>
              <div className="flex items-center space-x-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                  Advances Received
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" />
                  Expenses Paid
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                  Closing Cash
                </span>
              </div>
            </div>

            {monthlyLedger.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No monthly transactions recorded yet.
              </div>
            ) : (
              <div className="h-64 flex items-end space-x-6 sm:space-x-10 px-2 sm:px-6 pt-4 border-b border-slate-200">
                {monthlyLedger.map((row) => {
                  const receivedHeight = (row.cashReceived / maxMonthlyVal) * 200;
                  const expenseHeight = (row.expensesRecorded / maxMonthlyVal) * 200;
                  const cashHeight = (Math.max(0, row.closingCalculatedCash) / maxMonthlyVal) * 200;

                  return (
                    <div key={row.monthKey} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-md">
                        <p className="font-semibold">{row.monthLabel}</p>
                        <p className="text-emerald-300">Recv: {formatINR(row.cashReceived)}</p>
                        <p className="text-rose-300">Exp: {formatINR(row.expensesRecorded)}</p>
                        <p className="text-blue-300">Cash: {formatINR(row.closingCalculatedCash)}</p>
                      </div>

                      {/* Bars Group */}
                      <div className="w-full max-w-[80px] flex items-end justify-center space-x-1 sm:space-x-2 h-full pb-2">
                        {/* Received Bar */}
                        <div
                          style={{ height: `${Math.max(4, receivedHeight)}px` }}
                          className="w-1/3 bg-emerald-500 rounded-t-xs hover:brightness-110 transition-all"
                        />
                        {/* Expense Bar */}
                        <div
                          style={{ height: `${Math.max(4, expenseHeight)}px` }}
                          className="w-1/3 bg-rose-500 rounded-t-xs hover:brightness-110 transition-all"
                        />
                        {/* Closing Cash Bar */}
                        <div
                          style={{ height: `${Math.max(4, cashHeight)}px` }}
                          className="w-1/3 bg-blue-600 rounded-t-xs hover:brightness-110 transition-all"
                        />
                      </div>

                      {/* Month Label */}
                      <span className="text-[11px] font-medium text-slate-600 mt-2">
                        {row.monthLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: EXPENSE BREAKDOWN BY CATEGORY */}
        {activeTab === 'category' && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span className="font-medium text-slate-700">Expense Distribution by Category</span>
              <span>Total Recorded: {formatINR(expenses.reduce((s, e) => s + e.amount, 0))}</span>
            </div>

            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No categorized expenses available.
              </div>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map((item, idx) => {
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {item.name}
                        </span>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-slate-900">{formatINR(item.amount)}</span>
                          <span className="text-[11px] text-slate-400 w-12 text-right">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(2, item.percentage))}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SETTLEMENT STATUS BREAKDOWN */}
        {activeTab === 'settlement' && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span className="font-medium text-slate-700">Expense Accountability Lifecycle</span>
              <span>All Recorded Expenses</span>
            </div>

            <div className="space-y-4">
              {settlementBreakdown.map((item) => {
                const total = expenses.reduce((s, e) => s + e.amount, 0);
                const pct = total > 0 ? (item.amount / total) * 100 : 0;
                return (
                  <div key={item.label} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-xs ${item.color}`} />
                        <span className="font-semibold text-slate-800">{item.label}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-900">{formatINR(item.amount)}</span>
                        <span className="text-[11px] text-slate-500 font-medium">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(item.amount > 0 ? 3 : 0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
