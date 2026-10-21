/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Expense,
  CashReceived,
  SettlementRecord,
  ExpenseStatement,
  CashReconciliation,
  AppSettings,
  FinancialSummary,
} from '../types/index.ts';
import { formatINR, formatDate, formatDateTime } from './currency.ts';
import { MonthlyLedgerRow } from './calculations.ts';

/**
 * Generate and download an executive Expense Statement PDF
 */
export function exportExpenseStatementPDF(
  statement: ExpenseStatement,
  statementExpenses: Expense[],
  settings: AppSettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH ADVANCE EXPENSE STATEMENT', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Statement ID: ${statement.id}`, 14, 23);
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, pageWidth - 14, 23, { align: 'right' });

  // Metadata Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('STATEMENT DETAILS', 14, 38);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee: ${settings.userName}`, 14, 44);
  doc.text(`Manager: ${settings.managerName}`, 14, 50);
  doc.text(`Period: ${formatDate(statement.startDate)} to ${formatDate(statement.endDate)}`, 14, 56);

  doc.text(`Submission Date: ${formatDate(statement.submissionDate)}`, 110, 44);
  doc.text(`Status: ${statement.status.toUpperCase()}`, 110, 50);
  if (statement.notes) {
    doc.text(`Notes: ${statement.notes}`, 110, 56);
  }

  // Financial Summary Cards
  const summaryY = 63;
  const colWidth = (pageWidth - 28) / 4;

  const cards = [
    { label: 'Submitted', val: formatINR(statement.totalSubmitted), color: [241, 245, 249] },
    { label: 'Approved', val: formatINR(statement.totalApproved), color: [236, 253, 245] },
    { label: 'Settled', val: formatINR(statement.totalSettled), color: [238, 242, 255] },
    { label: 'Remaining', val: formatINR(statement.remainingAmount), color: [254, 242, 242] },
  ];

  cards.forEach((card, idx) => {
    const x = 14 + idx * colWidth;
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.roundedRect(x, summaryY, colWidth - 3, 14, 2, 2, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + 4, summaryY + 5);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(card.val, x + 4, summaryY + 11);
  });

  // Expenses Table
  const tableRows = statementExpenses.map((exp, idx) => [
    (idx + 1).toString(),
    formatDate(exp.date),
    exp.category,
    exp.description,
    exp.vendor || '-',
    exp.approvalStatus,
    exp.receiptUrl ? 'Yes' : 'No',
    formatINR(exp.amount),
  ]);

  autoTable(doc, {
    startY: 83,
    head: [['#', 'Date', 'Category', 'Description', 'Vendor', 'Approval', 'Receipt', 'Amount']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 20 },
      2: { cellWidth: 28 },
      3: { cellWidth: 45 },
      4: { cellWidth: 28 },
      5: { cellWidth: 20 },
      6: { cellWidth: 14 },
      7: { cellWidth: 23, halign: 'right' },
    },
    foot: [
      [
        '',
        '',
        '',
        'Total Statement Expenses',
        '',
        '',
        '',
        formatINR(statement.totalSubmitted),
      ],
    ],
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'right',
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} — CashFlow Expense Management`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  // Signature Block at bottom
  const finalY = (doc as any).lastAutoTable.finalY || 180;
  if (finalY + 40 < doc.internal.pageSize.getHeight() - 15) {
    const signY = finalY + 20;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, signY, 70, signY);
    doc.line(pageWidth - 70, signY, pageWidth - 14, signY);

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Submitted by: ${settings.userName}`, 14, signY + 5);
    doc.text(`Approved by: ${settings.managerName}`, pageWidth - 70, signY + 5);
  }

  doc.save(`${statement.id}_Expense_Statement.pdf`);
}

/**
 * Generate and download Monthly Ledger Report PDF
 */
export function exportMonthlyReportPDF(
  monthlyData: MonthlyLedgerRow[],
  settings: AppSettings
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH ADVANCE & EXPENSE MONTHLY LEDGER REPORT', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`User: ${settings.userName}  |  Manager: ${settings.managerName}`, 14, 21);
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, pageWidth - 14, 21, {
    align: 'right',
  });

  const tableRows = monthlyData.map((row) => [
    row.monthLabel,
    formatINR(row.openingCash),
    formatINR(row.cashReceived),
    formatINR(row.expensesRecorded),
    formatINR(row.expensesApproved),
    formatINR(row.expensesSettled),
    formatINR(row.closingCalculatedCash),
    formatINR(row.outstandingAdvance),
  ]);

  autoTable(doc, {
    startY: 34,
    head: [
      [
        'Month',
        'Opening Cash',
        'Cash Advances Received',
        'Expenses Recorded',
        'Expenses Approved',
        'Expenses Settled',
        'Closing Cash Balance',
        'Outstanding Advance Balance',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      halign: 'right',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} — CashFlow Accounting System`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  doc.save(`Monthly_CashFlow_Ledger_${new Date().getFullYear()}.pdf`);
}

/**
 * Generate full, comprehensive multi-tab Excel workbook (.xlsx)
 */
export function exportFullExcelWorkbook(data: {
  expenses: Expense[];
  cashReceived: CashReceived[];
  settlements: SettlementRecord[];
  statements: ExpenseStatement[];
  monthlyLedger: MonthlyLedgerRow[];
  reconciliations: CashReconciliation[];
  summary: FinancialSummary;
  settings: AppSettings;
}): void {
  const wb = XLSX.utils.book_new();

  // 1. Financial Summary Sheet
  const summarySheetData = [
    ['CASHFLOW FINANCIAL SUMMARY', ''],
    ['Generated On', formatDateTime(new Date().toISOString())],
    ['User Name', data.settings.userName],
    ['Manager Name', data.settings.managerName],
    ['Currency', `${data.settings.currency} (${data.settings.currencySymbol})`],
    ['Time Zone', data.settings.timeZone],
    ['', ''],
    ['Metric', 'Amount (INR)'],
    ['Opening Cash Balance', data.summary.openingCash],
    ['Total Cash Advances Received', data.summary.totalCashReceived],
    ['Total Expenses Recorded', data.summary.totalExpensesRecorded],
    ['Total Expenses Submitted', data.summary.totalExpensesSubmitted],
    ['Total Expenses Approved', data.summary.totalExpensesApproved],
    ['Total Expenses Settled', data.summary.totalExpensesSettled],
    ['Awaiting Submission or Approval', data.summary.totalAwaitingSubmissionOrApproval],
    ['Current Calculated Cash Balance', data.summary.currentCalculatedCash],
    ['Latest Physical Cash Counted', data.summary.physicalCashCounted ?? 'Not entered'],
    ['Cash Discrepancy', data.summary.cashDiscrepancy ?? 0],
    ['Outstanding Advance Balance', data.summary.outstandingAdvanceBalance],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // 2. Expenses Sheet
  const expensesData = data.expenses.map((e) => ({
    'Expense ID': e.id,
    Date: e.date,
    'Amount (INR)': e.amount,
    Category: e.category,
    Description: e.description,
    Vendor: e.vendor || '-',
    Purpose: e.purpose,
    'Payment Method': e.paymentMethod,
    'Recorded By': e.recordedBy,
    'Statement ID': e.statementId || '-',
    'Approval Status': e.approvalStatus,
    'Settlement Status': e.settlementStatus,
    'Settled Amount (INR)': e.settledAmount,
    'Receipt Link': e.receiptUrl || '',
    'Created At': e.createdAt,
  }));
  const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

  // 3. Cash Received Sheet
  const cashData = data.cashReceived.map((c) => ({
    'Transaction ID': c.id,
    Date: c.date,
    'Amount (INR)': c.amount,
    'Received From': c.receivedFrom,
    'Transaction Type': c.transactionType,
    'Reference Number': c.referenceNumber || '-',
    'Related Statement': c.relatedStatementId || '-',
    Notes: c.notes || '-',
    'Recorded By': c.recordedBy,
    'Created At': c.createdAt,
  }));
  const wsCash = XLSX.utils.json_to_sheet(cashData);
  XLSX.utils.book_append_sheet(wb, wsCash, 'Cash Received');

  // 4. Settlements Sheet
  const settlementsData = data.settlements.map((s) => ({
    'Settlement ID': s.id,
    Date: s.date,
    'Statement ID': s.statementId,
    'Expense ID': s.expenseId,
    'Amount Settled (INR)': s.amountSettled,
    'Settlement Type': s.settlementType,
    Reference: s.referenceNumber || '-',
    Notes: s.notes || '-',
    'Created At': s.createdAt,
  }));
  const wsSettlements = XLSX.utils.json_to_sheet(settlementsData);
  XLSX.utils.book_append_sheet(wb, wsSettlements, 'Settlements');

  // 5. Statements Sheet
  const statementsData = data.statements.map((s) => ({
    'Statement ID': s.id,
    'Start Date': s.startDate,
    'End Date': s.endDate,
    'Submission Date': s.submissionDate,
    'Total Submitted (INR)': s.totalSubmitted,
    'Total Approved (INR)': s.totalApproved,
    'Total Rejected (INR)': s.totalRejected,
    'Total Settled (INR)': s.totalSettled,
    'Remaining Amount (INR)': s.remainingAmount,
    Status: s.status,
    Notes: s.notes || '-',
  }));
  const wsStatements = XLSX.utils.json_to_sheet(statementsData);
  XLSX.utils.book_append_sheet(wb, wsStatements, 'Statements');

  // 6. Monthly Ledger Sheet
  const monthlyData = data.monthlyLedger.map((m) => ({
    Month: m.monthLabel,
    'Opening Cash': m.openingCash,
    'Advances Received': m.cashReceived,
    'Expenses Recorded': m.expensesRecorded,
    'Expenses Approved': m.expensesApproved,
    'Expenses Settled': m.expensesSettled,
    'Closing Cash Balance': m.closingCalculatedCash,
    'Outstanding Advance': m.outstandingAdvance,
  }));
  const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Ledger');

  // 7. Reconciliations Sheet
  if (data.reconciliations.length > 0) {
    const recData = data.reconciliations.map((r) => ({
      'Reconciliation ID': r.id,
      Date: r.date,
      'Calculated Balance (INR)': r.calculatedCashBalance,
      'Physical Cash Counted (INR)': r.physicalCashCounted,
      'Discrepancy (INR)': r.discrepancy,
      Notes: r.notes || '-',
      'Recorded By': r.recordedBy,
    }));
    const wsRec = XLSX.utils.json_to_sheet(recData);
    XLSX.utils.book_append_sheet(wb, wsRec, 'Reconciliations');
  }

  // Write and trigger download
  XLSX.writeFile(wb, `CashFlow_Financial_Report_${Date.now()}.xlsx`);
}
