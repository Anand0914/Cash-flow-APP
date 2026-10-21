/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Expense,
  CashReceived,
  SettlementRecord,
  ExpenseStatement,
  AuditLogEntry,
  CashReconciliation,
  AppSettings,
} from '../types/index.ts';

const LOCAL_STORAGE_KEYS = {
  EXPENSES: 'cashflow_expenses_v1',
  CASH_RECEIVED: 'cashflow_cash_received_v1',
  SETTLEMENTS: 'cashflow_settlements_v1',
  STATEMENTS: 'cashflow_statements_v1',
  RECONCILIATIONS: 'cashflow_reconciliations_v1',
  AUDIT_LOGS: 'cashflow_audit_logs_v1',
  SETTINGS: 'cashflow_settings_v1',
};

export const DEFAULT_CATEGORIES: string[] = [
  'Tea and refreshments',
  'Printing and Xerox',
  'Office supplies',
  'Transportation',
  'Courier and delivery',
  'Repairs and maintenance',
  'Purchases',
  'Other',
];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  timeZone: 'Asia/Kolkata',
  userName: 'Anand H (Employee)',
  managerName: 'Finance Manager',
  lowCashThreshold: 2000,
  receiptMandatory: false,
  receiptThresholdAmount: 500,
  categories: DEFAULT_CATEGORIES,
  openingCashBalance: 0,
  openingAdvanceBalance: 0,
  openingBalanceDate: '2026-10-01',
};

export function loadLocalData(): {
  expenses: Expense[];
  cashReceived: CashReceived[];
  settlements: SettlementRecord[];
  statements: ExpenseStatement[];
  reconciliations: CashReconciliation[];
  auditLogs: AuditLogEntry[];
  settings: AppSettings;
} {
  try {
    const rawExp = localStorage.getItem(LOCAL_STORAGE_KEYS.EXPENSES);
    const rawCash = localStorage.getItem(LOCAL_STORAGE_KEYS.CASH_RECEIVED);
    const rawSett = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTLEMENTS);
    const rawStmt = localStorage.getItem(LOCAL_STORAGE_KEYS.STATEMENTS);
    const rawRec = localStorage.getItem(LOCAL_STORAGE_KEYS.RECONCILIATIONS);
    const rawAudit = localStorage.getItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS);
    const rawSettings = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);

    const expenses: Expense[] = rawExp ? JSON.parse(rawExp) : [];
    const cashReceived: CashReceived[] = rawCash ? JSON.parse(rawCash) : [];
    const settlements: SettlementRecord[] = rawSett ? JSON.parse(rawSett) : [];
    const statements: ExpenseStatement[] = rawStmt ? JSON.parse(rawStmt) : [];
    const reconciliations: CashReconciliation[] = rawRec ? JSON.parse(rawRec) : [];
    const auditLogs: AuditLogEntry[] = rawAudit ? JSON.parse(rawAudit) : [];
    const settings: AppSettings = rawSettings
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) }
      : DEFAULT_SETTINGS;

    return {
      expenses,
      cashReceived,
      settlements,
      statements,
      reconciliations,
      auditLogs,
      settings,
    };
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return {
      expenses: [],
      cashReceived: [],
      settlements: [],
      statements: [],
      reconciliations: [],
      auditLogs: [],
      settings: DEFAULT_SETTINGS,
    };
  }
}

export function saveLocalData(data: {
  expenses?: Expense[];
  cashReceived?: CashReceived[];
  settlements?: SettlementRecord[];
  statements?: ExpenseStatement[];
  reconciliations?: CashReconciliation[];
  auditLogs?: AuditLogEntry[];
  settings?: AppSettings;
}): void {
  try {
    if (data.expenses !== undefined) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
    }
    if (data.cashReceived !== undefined) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CASH_RECEIVED, JSON.stringify(data.cashReceived));
    }
    if (data.settlements !== undefined) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SETTLEMENTS, JSON.stringify(data.settlements));
    }
    if (data.statements !== undefined) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.STATEMENTS, JSON.stringify(data.statements));
    }
    if (data.reconciliations !== undefined) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.RECONCILIATIONS,
        JSON.stringify(data.reconciliations)
      );
    }
    if (data.auditLogs !== undefined) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(data.auditLogs));
    }
    if (data.settings !== undefined) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
}

export function clearLocalData(): void {
  Object.values(LOCAL_STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}
