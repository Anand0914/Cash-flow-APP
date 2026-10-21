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

export const SHEET_NAMES = {
  EXPENSES: 'Expenses',
  CASH_RECEIVED: 'CashReceived',
  SETTLEMENTS: 'Settlements',
  STATEMENTS: 'ExpenseStatements',
  SETTINGS: 'Settings',
  AUDIT_LOG: 'AuditLog',
  RECONCILIATIONS: 'Reconciliations',
} as const;

export const EXPENSES_HEADERS = [
  'ExpenseID',
  'ExpenseDate',
  'Amount',
  'Category',
  'Description',
  'Vendor',
  'Purpose',
  'ReceiptFileID',
  'ReceiptURL',
  'PaymentMethod',
  'RecordedBy',
  'StatementID',
  'ApprovalStatus',
  'SettlementStatus',
  'SettledAmount',
  'CreatedAt',
  'UpdatedAt',
];

export const CASH_RECEIVED_HEADERS = [
  'TransactionID',
  'DateReceived',
  'Amount',
  'ReceivedFrom',
  'TransactionType',
  'ReferenceNumber',
  'RelatedStatementID',
  'Notes',
  'RecordedBy',
  'CreatedAt',
  'UpdatedAt',
];

export const SETTLEMENTS_HEADERS = [
  'SettlementID',
  'SettlementDate',
  'StatementID',
  'ExpenseID',
  'AmountSettled',
  'SettlementType',
  'ReferenceNumber',
  'Notes',
  'CreatedAt',
];

export const STATEMENTS_HEADERS = [
  'StatementID',
  'StartDate',
  'EndDate',
  'SubmissionDate',
  'TotalSubmitted',
  'TotalApproved',
  'TotalRejected',
  'TotalSettled',
  'RemainingAmount',
  'Status',
  'Notes',
  'CreatedAt',
  'UpdatedAt',
];

export const SETTINGS_HEADERS = ['Key', 'Value', 'UpdatedAt'];

export const AUDIT_LOG_HEADERS = [
  'AuditID',
  'Timestamp',
  'EntityType',
  'EntityID',
  'Action',
  'PreviousValues',
  'NewValues',
  'Reason',
  'PerformedBy',
];

export const RECONCILIATIONS_HEADERS = [
  'ReconciliationID',
  'ReconciliationDate',
  'CalculatedCashBalance',
  'PhysicalCashCounted',
  'Discrepancy',
  'Notes',
  'RecordedBy',
  'CreatedAt',
];

export interface GoogleSpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

/**
 * Creates a new dedicated Google Spreadsheet with all required sheets & formatted headers
 */
export async function createDedicatedSpreadsheet(
  accessToken: string,
  title: string = 'CashFlow — Cash Advance & Expense Management'
): Promise<GoogleSpreadsheetInfo> {
  const payload = {
    properties: {
      title,
      locale: 'en_IN',
      timeZone: 'Asia/Kolkata',
    },
    sheets: [
      { properties: { title: SHEET_NAMES.EXPENSES, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.CASH_RECEIVED, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.SETTLEMENTS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.STATEMENTS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.SETTINGS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.AUDIT_LOG, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.RECONCILIATIONS, gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create spreadsheet: ${errorText}`);
  }

  const result = await createRes.json();
  const spreadsheetId = result.spreadsheetId;

  // Insert header rows into all tabs
  const headersBatch = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: `${SHEET_NAMES.EXPENSES}!A1:Q1`, values: [EXPENSES_HEADERS] },
      { range: `${SHEET_NAMES.CASH_RECEIVED}!A1:K1`, values: [CASH_RECEIVED_HEADERS] },
      { range: `${SHEET_NAMES.SETTLEMENTS}!A1:I1`, values: [SETTLEMENTS_HEADERS] },
      { range: `${SHEET_NAMES.STATEMENTS}!A1:M1`, values: [STATEMENTS_HEADERS] },
      { range: `${SHEET_NAMES.SETTINGS}!A1:C1`, values: [SETTINGS_HEADERS] },
      { range: `${SHEET_NAMES.AUDIT_LOG}!A1:I1`, values: [AUDIT_LOG_HEADERS] },
      { range: `${SHEET_NAMES.RECONCILIATIONS}!A1:H1`, values: [RECONCILIATIONS_HEADERS] },
    ],
  };

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(headersBatch),
  });

  return {
    id: spreadsheetId,
    name: title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Test connectivity to an existing spreadsheet and ensure required worksheets exist
 */
export async function testSpreadsheetAccess(
  accessToken: string,
  spreadsheetId: string
): Promise<{ success: boolean; title?: string; missingSheets: string[]; message: string }> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, missingSheets: [], message: 'Spreadsheet not found (404)' };
      }
      if (res.status === 403) {
        return { success: false, missingSheets: [], message: 'Access denied (403). Check permissions.' };
      }
      return { success: false, missingSheets: [], message: `Error ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    const existingSheets = (data.sheets || []).map((s: any) => s.properties?.title);
    const requiredSheets = Object.values(SHEET_NAMES);
    const missingSheets = requiredSheets.filter((name) => !existingSheets.includes(name));

    return {
      success: true,
      title: data.properties?.title || 'Spreadsheet',
      missingSheets,
      message:
        missingSheets.length > 0
          ? `Connected, but missing sheets: ${missingSheets.join(', ')}`
          : 'Connected and all 7 accounting sheets are ready.',
    };
  } catch (err: any) {
    return { success: false, missingSheets: [], message: err.message || 'Network error' };
  }
}

/**
 * Ensure missing worksheets are added to an existing spreadsheet
 */
export async function initializeMissingSheets(
  accessToken: string,
  spreadsheetId: string,
  missingSheets: string[]
): Promise<void> {
  if (missingSheets.length === 0) return;

  const requests = missingSheets.map((title) => ({
    addSheet: {
      properties: { title, gridProperties: { frozenRowCount: 1 } },
    },
  }));

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!updateRes.ok) {
    throw new Error('Failed to create missing sheets in spreadsheet');
  }

  // Populate headers for new sheets
  const headerMap: Record<string, string[]> = {
    [SHEET_NAMES.EXPENSES]: EXPENSES_HEADERS,
    [SHEET_NAMES.CASH_RECEIVED]: CASH_RECEIVED_HEADERS,
    [SHEET_NAMES.SETTLEMENTS]: SETTLEMENTS_HEADERS,
    [SHEET_NAMES.STATEMENTS]: STATEMENTS_HEADERS,
    [SHEET_NAMES.SETTINGS]: SETTINGS_HEADERS,
    [SHEET_NAMES.AUDIT_LOG]: AUDIT_LOG_HEADERS,
    [SHEET_NAMES.RECONCILIATIONS]: RECONCILIATIONS_HEADERS,
  };

  const headerData = missingSheets
    .filter((title) => headerMap[title])
    .map((title) => ({
      range: `${title}!A1:Z1`,
      values: [headerMap[title]],
    }));

  if (headerData.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerData,
      }),
    });
  }
}

/**
 * Fetch all records across all sheets in a single batch request
 */
export async function fetchAllDataFromSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  expenses: Expense[];
  cashReceived: CashReceived[];
  settlements: SettlementRecord[];
  statements: ExpenseStatement[];
  reconciliations: CashReconciliation[];
  auditLogs: AuditLogEntry[];
  settings: Partial<AppSettings>;
}> {
  const ranges = [
    `${SHEET_NAMES.EXPENSES}!A2:Q1000`,
    `${SHEET_NAMES.CASH_RECEIVED}!A2:K1000`,
    `${SHEET_NAMES.SETTLEMENTS}!A2:I1000`,
    `${SHEET_NAMES.STATEMENTS}!A2:M1000`,
    `${SHEET_NAMES.SETTINGS}!A2:C100`,
    `${SHEET_NAMES.AUDIT_LOG}!A2:I1000`,
    `${SHEET_NAMES.RECONCILIATIONS}!A2:H1000`,
  ];

  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to load data from Google Sheets (${res.status})`);
  }

  const result = await res.json();
  const valueRanges = result.valueRanges || [];

  const expensesRows = valueRanges[0]?.values || [];
  const cashRows = valueRanges[1]?.values || [];
  const settlementRows = valueRanges[2]?.values || [];
  const statementRows = valueRanges[3]?.values || [];
  const settingsRows = valueRanges[4]?.values || [];
  const auditRows = valueRanges[5]?.values || [];
  const reconciliationRows = valueRanges[6]?.values || [];

  const expenses: Expense[] = expensesRows.map((row: any[]) => ({
    id: row[0] || '',
    date: row[1] || '',
    amount: parseFloat(row[2]) || 0,
    amountPaise: Math.round((parseFloat(row[2]) || 0) * 100),
    category: row[3] || 'Other',
    description: row[4] || '',
    vendor: row[5] || '',
    purpose: row[6] || '',
    receiptFileId: row[7] || undefined,
    receiptUrl: row[8] || undefined,
    paymentMethod: (row[9] as any) || 'Cash',
    recordedBy: row[10] || '',
    statementId: row[11] || undefined,
    approvalStatus: (row[12] as any) || 'Recorded',
    settlementStatus: (row[13] as any) || 'Unsettled',
    settledAmount: parseFloat(row[14]) || 0,
    createdAt: row[15] || '',
    updatedAt: row[16] || '',
  }));

  const cashReceived: CashReceived[] = cashRows.map((row: any[]) => ({
    id: row[0] || '',
    date: row[1] || '',
    amount: parseFloat(row[2]) || 0,
    amountPaise: Math.round((parseFloat(row[2]) || 0) * 100),
    receivedFrom: row[3] || '',
    transactionType: (row[4] as any) || 'Additional advance',
    referenceNumber: row[5] || undefined,
    relatedStatementId: row[6] || undefined,
    notes: row[7] || undefined,
    recordedBy: row[8] || '',
    createdAt: row[9] || '',
    updatedAt: row[10] || '',
  }));

  const settlements: SettlementRecord[] = settlementRows.map((row: any[]) => ({
    id: row[0] || '',
    date: row[1] || '',
    statementId: row[2] || '',
    expenseId: row[3] || '',
    amountSettled: parseFloat(row[4]) || 0,
    amountSettledPaise: Math.round((parseFloat(row[4]) || 0) * 100),
    settlementType: (row[5] as any) || 'Advance Offset',
    referenceNumber: row[6] || undefined,
    notes: row[7] || undefined,
    createdAt: row[8] || '',
  }));

  const statements: ExpenseStatement[] = statementRows.map((row: any[]) => ({
    id: row[0] || '',
    startDate: row[1] || '',
    endDate: row[2] || '',
    submissionDate: row[3] || '',
    expenseIds: [], // mapped in state by matching statementId
    totalSubmitted: parseFloat(row[4]) || 0,
    totalApproved: parseFloat(row[5]) || 0,
    totalRejected: parseFloat(row[6]) || 0,
    totalSettled: parseFloat(row[7]) || 0,
    remainingAmount: parseFloat(row[8]) || 0,
    status: (row[9] as any) || 'Submitted',
    notes: row[10] || undefined,
    createdAt: row[11] || '',
    updatedAt: row[12] || '',
  }));

  const settings: Partial<AppSettings> = {};
  for (const row of settingsRows) {
    if (!row || !row[0]) continue;
    const key = row[0];
    const val = row[1];
    if (key === 'lowCashThreshold') settings.lowCashThreshold = parseFloat(val) || 2000;
    else if (key === 'receiptMandatory') settings.receiptMandatory = val === 'true';
    else if (key === 'receiptThresholdAmount') settings.receiptThresholdAmount = parseFloat(val) || 0;
    else if (key === 'userName') settings.userName = val;
    else if (key === 'managerName') settings.managerName = val;
    else if (key === 'openingCashBalance') settings.openingCashBalance = parseFloat(val) || 0;
    else if (key === 'openingAdvanceBalance') settings.openingAdvanceBalance = parseFloat(val) || 0;
    else if (key === 'openingBalanceDate') settings.openingBalanceDate = val;
    else if (key === 'categories') {
      try {
        settings.categories = JSON.parse(val);
      } catch {
        // fallback
      }
    }
  }

  const auditLogs: AuditLogEntry[] = auditRows.map((row: any[]) => {
    let prev = undefined;
    let next = {};
    try {
      prev = row[5] ? JSON.parse(row[5]) : undefined;
    } catch {
      prev = undefined;
    }
    try {
      next = row[6] ? JSON.parse(row[6]) : {};
    } catch {
      next = {};
    }

    return {
      id: row[0] || '',
      timestamp: row[1] || '',
      entityType: (row[2] as any) || 'Expense',
      entityId: row[3] || '',
      action: (row[4] as any) || 'Update',
      previousValues: prev,
      newValues: next,
      reason: row[7] || '',
      performedBy: row[8] || '',
    };
  });

  const reconciliations: CashReconciliation[] = reconciliationRows.map((row: any[]) => ({
    id: row[0] || '',
    date: row[1] || '',
    calculatedCashBalance: parseFloat(row[2]) || 0,
    physicalCashCounted: parseFloat(row[3]) || 0,
    discrepancy: parseFloat(row[4]) || 0,
    notes: row[5] || undefined,
    recordedBy: row[6] || '',
    createdAt: row[7] || '',
  }));

  return {
    expenses,
    cashReceived,
    settlements,
    statements,
    reconciliations,
    auditLogs,
    settings,
  };
}

/**
 * Save complete dataset to Google Sheets (clearing and rewriting table contents cleanly)
 */
export async function syncAllToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  data: {
    expenses: Expense[];
    cashReceived: CashReceived[];
    settlements: SettlementRecord[];
    statements: ExpenseStatement[];
    reconciliations: CashReconciliation[];
    auditLogs: AuditLogEntry[];
    settings: AppSettings;
  }
): Promise<void> {
  const expenseValues = data.expenses.map((e) => [
    e.id,
    e.date,
    e.amount,
    e.category,
    e.description,
    e.vendor,
    e.purpose,
    e.receiptFileId || '',
    e.receiptUrl || '',
    e.paymentMethod,
    e.recordedBy,
    e.statementId || '',
    e.approvalStatus,
    e.settlementStatus,
    e.settledAmount,
    e.createdAt,
    e.updatedAt,
  ]);

  const cashValues = data.cashReceived.map((c) => [
    c.id,
    c.date,
    c.amount,
    c.receivedFrom,
    c.transactionType,
    c.referenceNumber || '',
    c.relatedStatementId || '',
    c.notes || '',
    c.recordedBy,
    c.createdAt,
    c.updatedAt,
  ]);

  const settlementValues = data.settlements.map((s) => [
    s.id,
    s.date,
    s.statementId,
    s.expenseId,
    s.amountSettled,
    s.settlementType,
    s.referenceNumber || '',
    s.notes || '',
    s.createdAt,
  ]);

  const statementValues = data.statements.map((s) => [
    s.id,
    s.startDate,
    s.endDate,
    s.submissionDate,
    s.totalSubmitted,
    s.totalApproved,
    s.totalRejected,
    s.totalSettled,
    s.remainingAmount,
    s.status,
    s.notes || '',
    s.createdAt,
    s.updatedAt,
  ]);

  const settingsValues = [
    ['currency', data.settings.currency, new Date().toISOString()],
    ['currencySymbol', data.settings.currencySymbol, new Date().toISOString()],
    ['timeZone', data.settings.timeZone, new Date().toISOString()],
    ['userName', data.settings.userName, new Date().toISOString()],
    ['managerName', data.settings.managerName, new Date().toISOString()],
    ['lowCashThreshold', String(data.settings.lowCashThreshold), new Date().toISOString()],
    ['receiptMandatory', String(data.settings.receiptMandatory), new Date().toISOString()],
    ['receiptThresholdAmount', String(data.settings.receiptThresholdAmount), new Date().toISOString()],
    ['categories', JSON.stringify(data.settings.categories), new Date().toISOString()],
    ['openingCashBalance', String(data.settings.openingCashBalance), new Date().toISOString()],
    ['openingAdvanceBalance', String(data.settings.openingAdvanceBalance), new Date().toISOString()],
    ['openingBalanceDate', data.settings.openingBalanceDate, new Date().toISOString()],
  ];

  const auditValues = data.auditLogs.map((a) => [
    a.id,
    a.timestamp,
    a.entityType,
    a.entityId,
    a.action,
    JSON.stringify(a.previousValues || null),
    JSON.stringify(a.newValues || null),
    a.reason,
    a.performedBy,
  ]);

  const reconciliationValues = data.reconciliations.map((r) => [
    r.id,
    r.date,
    r.calculatedCashBalance,
    r.physicalCashCounted,
    r.discrepancy,
    r.notes || '',
    r.recordedBy,
    r.createdAt,
  ]);

  // First clear ranges to avoid stale rows if items were deleted/edited
  const rangesToClear = [
    `${SHEET_NAMES.EXPENSES}!A2:Q1000`,
    `${SHEET_NAMES.CASH_RECEIVED}!A2:K1000`,
    `${SHEET_NAMES.SETTLEMENTS}!A2:I1000`,
    `${SHEET_NAMES.STATEMENTS}!A2:M1000`,
    `${SHEET_NAMES.SETTINGS}!A2:C100`,
    `${SHEET_NAMES.AUDIT_LOG}!A2:I1000`,
    `${SHEET_NAMES.RECONCILIATIONS}!A2:H1000`,
  ];

  await Promise.all(
    rangesToClear.map((range) =>
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
    )
  );

  // Write new data in batch
  const batchData: Array<{ range: string; values: any[][] }> = [];

  if (expenseValues.length > 0) {
    batchData.push({ range: `${SHEET_NAMES.EXPENSES}!A2`, values: expenseValues });
  }
  if (cashValues.length > 0) {
    batchData.push({ range: `${SHEET_NAMES.CASH_RECEIVED}!A2`, values: cashValues });
  }
  if (settlementValues.length > 0) {
    batchData.push({ range: `${SHEET_NAMES.SETTLEMENTS}!A2`, values: settlementValues });
  }
  if (statementValues.length > 0) {
    batchData.push({ range: `${SHEET_NAMES.STATEMENTS}!A2`, values: statementValues });
  }
  if (settingsValues.length > 0) {
    batchData.push({ range: `${SHEET_NAMES.SETTINGS}!A2`, values: settingsValues });
  }
  if (auditValues.length > 0) {
    batchData.push({ range: `${SHEET_NAMES.AUDIT_LOG}!A2`, values: auditValues });
  }
  if (reconciliationValues.length > 0) {
    batchData.push({ range: `${SHEET_NAMES.RECONCILIATIONS}!A2`, values: reconciliationValues });
  }

  if (batchData.length > 0) {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: batchData,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to write batch data to Google Sheets: ${err}`);
    }
  }
}
