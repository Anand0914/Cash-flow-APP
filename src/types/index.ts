/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExpenseCategory =
  | 'Tea and refreshments'
  | 'Printing and Xerox'
  | 'Office supplies'
  | 'Transportation'
  | 'Courier and delivery'
  | 'Repairs and maintenance'
  | 'Purchases'
  | 'Other'
  | string;

export type ApprovalStatus = 'Draft' | 'Recorded' | 'Submitted' | 'Approved' | 'Rejected';
export type SettlementStatus = 'Unsettled' | 'Partially Settled' | 'Settled';

export interface Expense {
  id: string; // EXP-YYYYMMDD-XXXX
  date: string; // YYYY-MM-DD
  amount: number; // In Rupees (e.g. 20.50)
  amountPaise: number; // Integer paise (e.g. 2050)
  category: ExpenseCategory;
  description: string;
  vendor: string;
  purpose: string;
  receiptFileId?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  paymentMethod: 'Cash' | 'Online/UPI' | 'Other';
  recordedBy: string;
  statementId?: string;
  approvalStatus: ApprovalStatus;
  settlementStatus: SettlementStatus;
  settledAmount: number; // In Rupees
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'Initial advance'
  | 'Additional advance'
  | 'Replenishment'
  | 'Other cash inflow'
  | 'Repayment to manager';

export interface CashReceived {
  id: string; // CR-YYYYMMDD-XXXX
  date: string; // YYYY-MM-DD
  amount: number;
  amountPaise: number;
  receivedFrom: string;
  transactionType: TransactionType;
  referenceNumber?: string;
  relatedStatementId?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type StatementStatus = 'Draft' | 'Submitted' | 'Partially Approved' | 'Approved' | 'Partially Settled' | 'Settled' | 'Rejected';

export interface ExpenseStatement {
  id: string; // STMT-YYYYMMDD-XXXX
  startDate: string;
  endDate: string;
  submissionDate: string;
  expenseIds: string[];
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  totalSettled: number;
  remainingAmount: number;
  status: StatementStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementRecord {
  id: string; // SETTL-YYYYMMDD-XXXX
  date: string; // YYYY-MM-DD
  statementId: string;
  expenseId: string;
  amountSettled: number;
  amountSettledPaise: number;
  settlementType: 'Advance Offset' | 'Direct Reimbursement' | 'Balance Adjustment';
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface CashReconciliation {
  id: string; // REC-YYYYMMDD-XXXX
  date: string; // YYYY-MM-DD
  calculatedCashBalance: number;
  physicalCashCounted: number;
  discrepancy: number; // Physical - Calculated
  notes?: string;
  recordedBy: string;
  adjustmentTransactionId?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string; // AUD-YYYYMMDD-XXXX
  timestamp: string;
  entityType: 'Expense' | 'CashReceived' | 'Statement' | 'Settlement' | 'Reconciliation' | 'Settings';
  entityId: string;
  action: 'Create' | 'Update' | 'StatusChange' | 'Settle' | 'Reconcile' | 'Delete';
  previousValues?: Record<string, any>;
  newValues: Record<string, any>;
  reason: string;
  performedBy: string;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  timeZone: string;
  userName: string;
  managerName: string;
  lowCashThreshold: number; // default ₹2,000
  receiptMandatory: boolean;
  receiptThresholdAmount: number; // e.g. receipt required for expenses > this amount, 0 means all
  categories: string[];
  spreadsheetId?: string;
  spreadsheetName?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  openingCashBalance: number;
  openingAdvanceBalance: number;
  openingBalanceDate: string;
  lastSyncTime?: string;
}

export interface FinancialSummary {
  openingCash: number;
  totalCashReceived: number;
  totalExpensesRecorded: number;
  totalExpensesSubmitted: number;
  totalExpensesApproved: number;
  totalExpensesRejected: number;
  totalExpensesSettled: number;
  totalAwaitingSubmissionOrApproval: number;
  currentCalculatedCash: number;
  physicalCashCounted: number | null;
  cashDiscrepancy: number | null;
  outstandingAdvanceBalance: number;
  replenishmentReceivedPeriod: number;
  amountAwaitingApproval: number;
  amountApprovedAwaitingSettlement: number;
}
