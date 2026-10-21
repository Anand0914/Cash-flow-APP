/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Expense,
  CashReceived,
  SettlementRecord,
  CashReconciliation,
  AppSettings,
  FinancialSummary,
} from '../types/index.ts';
import { toPaise, fromPaise } from './currency.ts';

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Filter items by date range (inclusive)
 */
export function filterByDate<T extends { date: string }>(
  items: T[],
  filter?: DateFilter
): T[] {
  if (!filter || (!filter.startDate && !filter.endDate)) {
    return items;
  }
  return items.filter((item) => {
    if (filter.startDate && item.date < filter.startDate) return false;
    if (filter.endDate && item.date > filter.endDate) return false;
    return true;
  });
}

/**
 * Calculate comprehensive financial metrics using integer paise
 */
export function calculateFinancialSummary(
  expenses: Expense[],
  cashReceived: CashReceived[],
  settlements: SettlementRecord[],
  reconciliations: CashReconciliation[],
  settings: AppSettings,
  filter?: DateFilter
): FinancialSummary {
  // Opening balances
  const openingCashPaise = toPaise(settings.openingCashBalance || 0);
  const openingAdvancePaise = toPaise(settings.openingAdvanceBalance || 0);

  // Cash inflows & outflows (all time for lifetime balances, or filtered for period replenishment)
  let totalCashReceivedPaise = 0;
  let replenishmentPeriodPaise = 0;
  let totalRepaymentsPaise = 0;

  for (const cr of cashReceived) {
    const paise = cr.amountPaise || toPaise(cr.amount);
    if (cr.transactionType === 'Repayment to manager') {
      totalRepaymentsPaise += paise;
    } else {
      totalCashReceivedPaise += paise;
      // Check if within period filter for replenishment
      if (!filter || (!filter.startDate && !filter.endDate)) {
        replenishmentPeriodPaise += paise;
      } else {
        const inStart = !filter.startDate || cr.date >= filter.startDate;
        const inEnd = !filter.endDate || cr.date <= filter.endDate;
        if (inStart && inEnd) {
          replenishmentPeriodPaise += paise;
        }
      }
    }
  }

  // Expenses calculations
  let totalExpensesPaise = 0;
  let totalSubmittedPaise = 0;
  let totalApprovedPaise = 0;
  let totalRejectedPaise = 0;
  let awaitingSubmissionOrApprovalPaise = 0;
  let amountAwaitingApprovalPaise = 0;

  for (const exp of expenses) {
    const paise = exp.amountPaise || toPaise(exp.amount);
    totalExpensesPaise += paise;

    if (exp.approvalStatus === 'Submitted') {
      totalSubmittedPaise += paise;
      amountAwaitingApprovalPaise += paise;
      awaitingSubmissionOrApprovalPaise += paise;
    } else if (exp.approvalStatus === 'Approved') {
      totalApprovedPaise += paise;
    } else if (exp.approvalStatus === 'Rejected') {
      totalRejectedPaise += paise;
    } else {
      // Draft or Recorded
      awaitingSubmissionOrApprovalPaise += paise;
    }
  }

  // Settlements calculation (from actual formal settlement records)
  let totalSettledPaise = 0;
  for (const s of settlements) {
    const paise = s.amountSettledPaise || toPaise(s.amountSettled);
    totalSettledPaise += paise;
  }

  // Outstanding advance calculation:
  // Opening outstanding advance + advances received - expenses formally settled - repayments made
  const outstandingAdvancePaise =
    openingAdvancePaise + totalCashReceivedPaise - totalSettledPaise - totalRepaymentsPaise;

  // Calculated cash balance:
  // Opening cash + advances received - cash expenses paid - repayments
  const calculatedCashPaise =
    openingCashPaise + totalCashReceivedPaise - totalExpensesPaise - totalRepaymentsPaise;

  // Amount approved awaiting settlement
  // Approved expenses paise minus what has been settled from them
  const amountApprovedAwaitingSettlementPaise = Math.max(
    0,
    totalApprovedPaise - totalSettledPaise
  );

  // Latest reconciliation
  let latestPhysicalCounted: number | null = null;
  let latestDiscrepancy: number | null = null;
  if (reconciliations && reconciliations.length > 0) {
    // Sort descending by date / createdAt
    const sorted = [...reconciliations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    latestPhysicalCounted = sorted[0].physicalCashCounted;
    latestDiscrepancy = sorted[0].discrepancy;
  }

  return {
    openingCash: fromPaise(openingCashPaise),
    totalCashReceived: fromPaise(totalCashReceivedPaise),
    totalExpensesRecorded: fromPaise(totalExpensesPaise),
    totalExpensesSubmitted: fromPaise(totalSubmittedPaise),
    totalExpensesApproved: fromPaise(totalApprovedPaise),
    totalExpensesRejected: fromPaise(totalRejectedPaise),
    totalExpensesSettled: fromPaise(totalSettledPaise),
    totalAwaitingSubmissionOrApproval: fromPaise(awaitingSubmissionOrApprovalPaise),
    currentCalculatedCash: fromPaise(calculatedCashPaise),
    physicalCashCounted: latestPhysicalCounted,
    cashDiscrepancy: latestDiscrepancy,
    outstandingAdvanceBalance: fromPaise(outstandingAdvancePaise),
    replenishmentReceivedPeriod: fromPaise(replenishmentPeriodPaise),
    amountAwaitingApproval: fromPaise(amountAwaitingApprovalPaise),
    amountApprovedAwaitingSettlement: fromPaise(amountApprovedAwaitingSettlementPaise),
  };
}

/**
 * Monthly aggregations for reports & charts
 */
export interface MonthlyLedgerRow {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. Oct 2026
  openingCash: number;
  cashReceived: number;
  expensesRecorded: number;
  expensesApproved: number;
  expensesSettled: number;
  closingCalculatedCash: number;
  outstandingAdvance: number;
}

export function computeMonthlyLedger(
  expenses: Expense[],
  cashReceived: CashReceived[],
  settlements: SettlementRecord[],
  settings: AppSettings
): MonthlyLedgerRow[] {
  // Collect all months from transactions or current year
  const monthSet = new Set<string>();

  // Include current month
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  monthSet.add(currentMonthKey);

  expenses.forEach((e) => monthSet.add(e.date.substring(0, 7)));
  cashReceived.forEach((c) => monthSet.add(c.date.substring(0, 7)));
  settlements.forEach((s) => monthSet.add(s.date.substring(0, 7)));

  const sortedMonths = Array.from(monthSet).sort();

  let runningCashPaise = toPaise(settings.openingCashBalance || 0);
  let runningAdvancePaise = toPaise(settings.openingAdvanceBalance || 0);

  const result: MonthlyLedgerRow[] = [];

  for (const mKey of sortedMonths) {
    const monthOpeningCashPaise = runningCashPaise;

    // Filter items for this month
    const mCashReceived = cashReceived.filter((c) => c.date.startsWith(mKey));
    const mExpenses = expenses.filter((e) => e.date.startsWith(mKey));
    const mSettlements = settlements.filter((s) => s.date.startsWith(mKey));

    let mReceivedPaise = 0;
    let mRepaymentsPaise = 0;
    mCashReceived.forEach((c) => {
      const p = c.amountPaise || toPaise(c.amount);
      if (c.transactionType === 'Repayment to manager') {
        mRepaymentsPaise += p;
      } else {
        mReceivedPaise += p;
      }
    });

    let mExpRecordedPaise = 0;
    let mExpApprovedPaise = 0;
    mExpenses.forEach((e) => {
      const p = e.amountPaise || toPaise(e.amount);
      mExpRecordedPaise += p;
      if (e.approvalStatus === 'Approved') {
        mExpApprovedPaise += p;
      }
    });

    let mSettledPaise = 0;
    mSettlements.forEach((s) => {
      mSettledPaise += s.amountSettledPaise || toPaise(s.amountSettled);
    });

    // End of month updates
    runningCashPaise = runningCashPaise + mReceivedPaise - mExpRecordedPaise - mRepaymentsPaise;
    runningAdvancePaise = runningAdvancePaise + mReceivedPaise - mSettledPaise - mRepaymentsPaise;

    const [year, month] = mKey.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthLabel = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      year: 'numeric',
    }).format(dateObj);

    result.push({
      monthKey: mKey,
      monthLabel,
      openingCash: fromPaise(monthOpeningCashPaise),
      cashReceived: fromPaise(mReceivedPaise),
      expensesRecorded: fromPaise(mExpRecordedPaise),
      expensesApproved: fromPaise(mExpApprovedPaise),
      expensesSettled: fromPaise(mSettledPaise),
      closingCalculatedCash: fromPaise(runningCashPaise),
      outstandingAdvance: fromPaise(runningAdvancePaise),
    });
  }

  return result;
}
