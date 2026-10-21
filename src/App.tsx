/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sidebar,
  PageId,
} from './components/layout/Sidebar.tsx';
import { TopNavbar } from './components/layout/TopNavbar.tsx';
import { FinancialSummaryCards } from './components/dashboard/FinancialSummaryCards.tsx';
import { DashboardAlerts } from './components/dashboard/DashboardAlerts.tsx';
import { DashboardCharts } from './components/dashboard/DashboardCharts.tsx';
import { CashReconciliationModal } from './components/dashboard/CashReconciliationModal.tsx';
import { AddExpensePage } from './components/expenses/AddExpensePage.tsx';
import { ExpenseHistoryPage } from './components/expenses/ExpenseHistoryPage.tsx';
import { ExpenseDetailModal } from './components/expenses/ExpenseDetailModal.tsx';
import { ExpenseEditModal } from './components/expenses/ExpenseEditModal.tsx';
import { CashReceivedPage } from './components/cash/CashReceivedPage.tsx';
import { AdvanceSettlementPage } from './components/settlement/AdvanceSettlementPage.tsx';
import { ReportsPage } from './components/reports/ReportsPage.tsx';
import { SettingsPage } from './components/settings/SettingsPage.tsx';

import {
  Expense,
  CashReceived,
  SettlementRecord,
  ExpenseStatement,
  CashReconciliation,
  AuditLogEntry,
  AppSettings,
} from './types/index.ts';
import {
  loadLocalData,
  saveLocalData,
  DEFAULT_SETTINGS,
} from './services/storage.ts';
import {
  calculateFinancialSummary,
} from './utils/calculations.ts';
import {
  generateId,
  getTodayKolkata,
  toPaise,
} from './utils/currency.ts';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessTokenInMemory,
} from './services/auth.ts';
import {
  syncAllToGoogleSheets,
  fetchAllDataFromSheets,
} from './services/googleSheets.ts';
import {
  Plus,
  HandCoins,
  Scale,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Core accounting state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashReceived, setCashReceived] = useState<CashReceived[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [statements, setStatements] = useState<ExpenseStatement[]>([]);
  const [reconciliations, setReconciliations] = useState<CashReconciliation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Auth & Sync state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>();
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Modals state
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    const local = loadLocalData();
    // Seed initial welcome data if empty so the app is immediately alive and functional
    if (local.cashReceived.length === 0 && local.expenses.length === 0) {
      const initialCash: CashReceived = {
        id: generateId('CR'),
        date: getTodayKolkata(),
        amount: 10000,
        amountPaise: 1000000,
        receivedFrom: 'Finance Manager',
        transactionType: 'Initial advance',
        notes: 'Initial operational petty cash advance',
        recordedBy: 'Anand H (Employee)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCashReceived([initialCash]);
      setSettings(local.settings);
      saveLocalData({ cashReceived: [initialCash], settings: local.settings });
    } else {
      setExpenses(local.expenses);
      setCashReceived(local.cashReceived);
      setSettlements(local.settlements);
      setStatements(local.statements);
      setReconciliations(local.reconciliations);
      setAuditLogs(local.auditLogs);
      setSettings(local.settings);
    }
  }, []);

  // 2. Initialize Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUserEmail(user.email || null);
        setAccessToken(token);
        setAccessTokenInMemory(token);
      },
      () => {
        setUserEmail(null);
        setAccessToken(null);
        setAccessTokenInMemory(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const res = await googleSignIn();
      if (res) {
        setUserEmail(res.user.email || null);
        setAccessToken(res.accessToken);
        setAccessTokenInMemory(res.accessToken);

        // If spreadsheet is configured, auto-sync
        if (settings.spreadsheetId) {
          triggerSyncToSheets(res.accessToken, settings.spreadsheetId);
        }
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      alert('Sign in failed: ' + (err.message || 'Please retry.'));
    } finally {
      setIsSigningIn(false);
    }
  };

  // Google Sign Out
  const handleGoogleSignOut = async () => {
    await logout();
    setUserEmail(null);
    setAccessToken(null);
  };

  // Sync Data to Google Sheets
  const triggerSyncToSheets = useCallback(
    async (token?: string, sheetId?: string) => {
      const activeToken = token || accessToken;
      const targetSheetId = sheetId || settings.spreadsheetId;
      if (!activeToken || !targetSheetId) return;

      try {
        setIsSyncing(true);
        await syncAllToGoogleSheets(activeToken, targetSheetId, {
          expenses,
          cashReceived,
          settlements,
          statements,
          reconciliations,
          auditLogs,
          settings,
        });
        const nowTime = new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
        });
        setLastSyncTime(nowTime);
        setSyncStatusMessage('Synced with Google Sheets');
        setTimeout(() => setSyncStatusMessage(null), 3500);
      } catch (err: any) {
        console.error('Sync failed:', err);
        setSyncStatusMessage('Sync error: ' + (err.message || 'Check permissions'));
        setTimeout(() => setSyncStatusMessage(null), 5000);
      } finally {
        setIsSyncing(false);
      }
    },
    [
      accessToken,
      settings,
      expenses,
      cashReceived,
      settlements,
      statements,
      reconciliations,
      auditLogs,
    ]
  );

  // Reload data from Google Sheets
  const handleReloadFromSheets = async () => {
    if (!accessToken || !settings.spreadsheetId) return;
    try {
      setIsSyncing(true);
      const data = await fetchAllDataFromSheets(accessToken, settings.spreadsheetId);
      setExpenses(data.expenses);
      setCashReceived(data.cashReceived);
      setSettlements(data.settlements);
      setStatements(data.statements);
      setReconciliations(data.reconciliations);
      setAuditLogs(data.auditLogs);
      if (data.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
      saveLocalData({
        expenses: data.expenses,
        cashReceived: data.cashReceived,
        settlements: data.settlements,
        statements: data.statements,
        reconciliations: data.reconciliations,
        auditLogs: data.auditLogs,
      });
      alert('Successfully reloaded latest records from Google Sheets!');
    } catch (err: any) {
      alert('Failed to reload from Google Sheets: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Compute live Financial Summary
  const financialSummary = useMemo(() => {
    return calculateFinancialSummary(
      expenses,
      cashReceived,
      settlements,
      reconciliations,
      settings
    );
  }, [expenses, cashReceived, settlements, reconciliations, settings]);

  // Helper to append audit log
  const logAudit = (
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    action: AuditLogEntry['action'],
    reason: string,
    previousValues?: any,
    newValues?: any
  ) => {
    const entry: AuditLogEntry = {
      id: generateId('AUD'),
      timestamp: new Date().toISOString(),
      entityType,
      entityId,
      action,
      reason,
      previousValues,
      newValues: newValues || {},
      performedBy: settings.userName,
    };
    const updated = [entry, ...auditLogs];
    setAuditLogs(updated);
    saveLocalData({ auditLogs: updated });
    return updated;
  };

  // Save new Expense
  const handleSaveExpense = async (newExpense: Expense) => {
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveLocalData({ expenses: updated });

    logAudit('Expense', newExpense.id, 'Create', 'Recorded new business expense', undefined, {
      amount: newExpense.amount,
      category: newExpense.category,
      vendor: newExpense.vendor,
    });

    if (accessToken && settings.spreadsheetId) {
      triggerSyncToSheets();
    }
  };

  // Edit Expense with Audit Reason
  const handleUpdateExpense = async (updatedExpense: Expense, reason: string) => {
    const prev = expenses.find((e) => e.id === updatedExpense.id);
    const updated = expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));
    setExpenses(updated);
    saveLocalData({ expenses: updated });

    logAudit('Expense', updatedExpense.id, 'Update', reason, prev, updatedExpense);

    if (accessToken && settings.spreadsheetId) {
      triggerSyncToSheets();
    }
  };

  // Save new Cash Inflow / Advance
  const handleSaveCashReceived = async (entry: CashReceived) => {
    const updated = [entry, ...cashReceived];
    setCashReceived(updated);
    saveLocalData({ cashReceived: updated });

    logAudit(
      'CashReceived',
      entry.id,
      'Create',
      `Recorded cash inflow (${entry.transactionType})`,
      undefined,
      { amount: entry.amount, type: entry.transactionType, from: entry.receivedFrom }
    );

    if (accessToken && settings.spreadsheetId) {
      triggerSyncToSheets();
    }
  };

  // Save new Statement
  const handleSaveStatement = async (newStmt: ExpenseStatement, expenseIds: string[]) => {
    // Update statement IDs on expenses
    const updatedExpenses = expenses.map((e) => {
      if (expenseIds.includes(e.id)) {
        return {
          ...e,
          statementId: newStmt.id,
          approvalStatus: 'Submitted' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return e;
    });

    const updatedStatements = [newStmt, ...statements];
    setExpenses(updatedExpenses);
    setStatements(updatedStatements);
    saveLocalData({ expenses: updatedExpenses, statements: updatedStatements });

    logAudit(
      'Statement',
      newStmt.id,
      'Create',
      `Submitted statement for ${expenseIds.length} expenses`,
      undefined,
      { totalSubmitted: newStmt.totalSubmitted }
    );

    if (accessToken && settings.spreadsheetId) {
      triggerSyncToSheets();
    }
  };

  // Approve & Settle Statement Line Items
  const handleApproveAndSettle = async (
    statementId: string,
    approvedExpenseIds: string[],
    rejectedExpenseIds: string[],
    settleNow: boolean
  ) => {
    const stmt = statements.find((s) => s.id === statementId);
    if (!stmt) return;

    let totalApprovedPaise = 0;
    let totalRejectedPaise = 0;
    let totalSettledPaise = 0;

    const newSettlementRecords: SettlementRecord[] = [];

    const updatedExpenses = expenses.map((exp) => {
      if (exp.statementId !== statementId) return exp;

      const isApproved = approvedExpenseIds.includes(exp.id);
      const isRejected = rejectedExpenseIds.includes(exp.id);

      if (isApproved) {
        totalApprovedPaise += exp.amountPaise || toPaise(exp.amount);
        let expSettledStatus = exp.settlementStatus;
        let expSettledAmount = exp.settledAmount;

        if (settleNow) {
          expSettledStatus = 'Settled';
          expSettledAmount = exp.amount;
          totalSettledPaise += exp.amountPaise || toPaise(exp.amount);

          newSettlementRecords.push({
            id: generateId('SETTL'),
            date: getTodayKolkata(),
            statementId,
            expenseId: exp.id,
            amountSettled: exp.amount,
            amountSettledPaise: exp.amountPaise || toPaise(exp.amount),
            settlementType: 'Advance Offset',
            notes: `Offset against advance for ${exp.description}`,
            createdAt: new Date().toISOString(),
          });
        }

        return {
          ...exp,
          approvalStatus: 'Approved' as const,
          settlementStatus: expSettledStatus,
          settledAmount: expSettledAmount,
          updatedAt: new Date().toISOString(),
        };
      } else if (isRejected) {
        totalRejectedPaise += exp.amountPaise || toPaise(exp.amount);
        return {
          ...exp,
          approvalStatus: 'Rejected' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return exp;
    });

    const totalApproved = totalApprovedPaise / 100;
    const totalRejected = totalRejectedPaise / 100;
    const totalSettled = totalSettledPaise / 100;
    const remaining = Math.max(0, stmt.totalSubmitted - totalSettled - totalRejected);

    const updatedStatements = statements.map((s) => {
      if (s.id !== statementId) return s;
      return {
        ...s,
        totalApproved,
        totalRejected,
        totalSettled,
        remainingAmount: remaining,
        status: (remaining === 0 ? 'Settled' : totalApproved > 0 ? 'Approved' : 'Submitted') as any,
        updatedAt: new Date().toISOString(),
      };
    });

    const updatedSettlements = [...newSettlementRecords, ...settlements];

    setExpenses(updatedExpenses);
    setStatements(updatedStatements);
    setSettlements(updatedSettlements);

    saveLocalData({
      expenses: updatedExpenses,
      statements: updatedStatements,
      settlements: updatedSettlements,
    });

    logAudit(
      'Statement',
      statementId,
      'Settle',
      `Reviewed statement: ${approvedExpenseIds.length} approved, ${rejectedExpenseIds.length} rejected, ${
        settleNow ? `settled ₹${totalSettled.toFixed(2)}` : 'unsettled'
      }`
    );

    if (accessToken && settings.spreadsheetId) {
      triggerSyncToSheets();
    }
  };

  // Save Cash Reconciliation (with optional adjustment transaction)
  const handleSaveReconciliation = async (
    rec: CashReconciliation,
    createAdjustment: boolean,
    adjustmentReason?: string
  ) => {
    let adjId: string | undefined = undefined;

    if (createAdjustment && Math.abs(rec.discrepancy) > 0.01) {
      adjId = generateId('CR');
      const isSurplus = rec.discrepancy > 0;
      const adjAmount = Math.abs(rec.discrepancy);

      const adjEntry: CashReceived = {
        id: adjId,
        date: rec.date,
        amount: adjAmount,
        amountPaise: toPaise(adjAmount),
        receivedFrom: isSurplus ? 'Cash Drawer Surplus Adjustment' : settings.managerName,
        transactionType: isSurplus ? 'Other cash inflow' : 'Repayment to manager',
        referenceNumber: rec.id,
        notes: `Reconciliation balancing adjustment: ${adjustmentReason || 'Drawer count adjustment'}`,
        recordedBy: settings.userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedCash = [adjEntry, ...cashReceived];
      setCashReceived(updatedCash);
      saveLocalData({ cashReceived: updatedCash });

      rec.adjustmentTransactionId = adjId;
    }

    const updatedRecs = [rec, ...reconciliations];
    setReconciliations(updatedRecs);
    saveLocalData({ reconciliations: updatedRecs });

    logAudit(
      'Reconciliation',
      rec.id,
      'Reconcile',
      `Physical drawer audit: Counted ₹${rec.physicalCashCounted}, discrepancy ₹${rec.discrepancy}`
    );

    if (accessToken && settings.spreadsheetId) {
      triggerSyncToSheets();
    }
  };

  // Save Settings
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveLocalData({ settings: newSettings });

    logAudit('Settings', 'AppConfig', 'Update', 'Updated user/manager settings and thresholds');

    if (accessToken && newSettings.spreadsheetId) {
      triggerSyncToSheets(accessToken, newSettings.spreadsheetId);
    }
  };

  // Load Test Dataset (Section 17)
  const handleLoadTestDataset = (dataset: {
    expenses: Expense[];
    cashReceived: CashReceived[];
    settlements: SettlementRecord[];
    statements: ExpenseStatement[];
    reconciliations: CashReconciliation[];
  }) => {
    setExpenses(dataset.expenses);
    setCashReceived(dataset.cashReceived);
    setSettlements(dataset.settlements);
    setStatements(dataset.statements);
    setReconciliations(dataset.reconciliations);

    saveLocalData(dataset);
    setCurrentPage('dashboard');

    if (accessToken && settings.spreadsheetId) {
      triggerSyncToSheets();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        settings={settings}
        isConnectedToSheets={Boolean(accessToken && settings.spreadsheetId)}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navbar */}
        <TopNavbar
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          onNavigate={setCurrentPage}
          calculatedCash={financialSummary.currentCalculatedCash}
          lowCashThreshold={settings.lowCashThreshold}
          isConnectedToSheets={Boolean(accessToken && settings.spreadsheetId)}
          onSync={() => triggerSyncToSheets()}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
          onOpenReconcileModal={() => setIsReconcileModalOpen(true)}
          userEmail={userEmail}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          isSigningIn={isSigningIn}
          settings={settings}
        />

        {/* Sync Toast Notification */}
        {syncStatusMessage && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 text-center shadow-xs flex items-center justify-center gap-1.5 transition-all">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{syncStatusMessage}</span>
          </div>
        )}

        {/* Main Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* PAGE 1: DASHBOARD */}
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <FinancialSummaryCards
                summary={financialSummary}
                lowCashThreshold={settings.lowCashThreshold}
                onOpenReconcileModal={() => setIsReconcileModalOpen(true)}
                onOpenAddExpense={() => setCurrentPage('add-expense')}
                onOpenRecordCash={() => setCurrentPage('cash-received')}
              />

              {/* Dashboard Alerts Banner */}
              <DashboardAlerts
                summary={financialSummary}
                expenses={expenses}
                settings={settings}
                onNavigate={setCurrentPage}
                onOpenReconcileModal={() => setIsReconcileModalOpen(true)}
              />

              {/* Charts */}
              <DashboardCharts
                expenses={expenses}
                cashReceived={cashReceived}
                settlements={settlements}
                settings={settings}
              />
            </div>
          )}

          {/* PAGE 2: ADD EXPENSE */}
          {currentPage === 'add-expense' && (
            <AddExpensePage
              settings={settings}
              summary={financialSummary}
              accessToken={accessToken}
              onSaveExpense={handleSaveExpense}
              onNavigate={setCurrentPage}
            />
          )}

          {/* PAGE 3: EXPENSE HISTORY */}
          {currentPage === 'expense-history' && (
            <ExpenseHistoryPage
              expenses={expenses}
              settings={settings}
              onOpenDetail={(exp) => setDetailExpense(exp)}
              onOpenEdit={(exp) => setEditExpense(exp)}
              auditLogs={auditLogs}
            />
          )}

          {/* PAGE 4: CASH RECEIVED */}
          {currentPage === 'cash-received' && (
            <CashReceivedPage
              cashReceived={cashReceived}
              settings={settings}
              onSaveCashReceived={handleSaveCashReceived}
            />
          )}

          {/* PAGE 5: ADVANCE SETTLEMENT */}
          {currentPage === 'advance-settlement' && (
            <AdvanceSettlementPage
              expenses={expenses}
              statements={statements}
              settlements={settlements}
              summary={financialSummary}
              settings={settings}
              onSaveStatement={handleSaveStatement}
              onApproveAndSettle={handleApproveAndSettle}
            />
          )}

          {/* PAGE 6: REPORTS */}
          {currentPage === 'reports' && (
            <ReportsPage
              expenses={expenses}
              cashReceived={cashReceived}
              settlements={settlements}
              statements={statements}
              reconciliations={reconciliations}
              summary={financialSummary}
              settings={settings}
            />
          )}

          {/* PAGE 7: SETTINGS */}
          {currentPage === 'settings' && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              accessToken={accessToken}
              userEmail={userEmail}
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleSignOut={handleGoogleSignOut}
              isSigningIn={isSigningIn}
              onSyncToSheets={() => triggerSyncToSheets()}
              onReloadFromSheets={handleReloadFromSheets}
              isSyncing={isSyncing}
              onLoadTestDataset={handleLoadTestDataset}
            />
          )}
        </main>
      </div>

      {/* Cash Drawer Reconciliation Modal */}
      <CashReconciliationModal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        calculatedCashBalance={financialSummary.currentCalculatedCash}
        reconciliations={reconciliations}
        settings={settings}
        onSaveReconciliation={handleSaveReconciliation}
      />

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        expense={detailExpense}
        onClose={() => setDetailExpense(null)}
        onOpenEdit={(exp) => setEditExpense(exp)}
        auditLogs={auditLogs}
        settings={settings}
      />

      {/* Expense Edit Modal */}
      <ExpenseEditModal
        expense={editExpense}
        onClose={() => setEditExpense(null)}
        onSave={handleUpdateExpense}
        settings={settings}
        accessToken={accessToken}
      />
    </div>
  );
}
