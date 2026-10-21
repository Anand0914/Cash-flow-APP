/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FolderOpen,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { AppSettings, Expense, CashReceived, SettlementRecord, ExpenseStatement, CashReconciliation } from '../../types/index.ts';
import { DEFAULT_CATEGORIES } from '../../services/storage.ts';
import { formatINR } from '../../utils/currency.ts';
import {
  createDedicatedSpreadsheet,
  testSpreadsheetAccess,
  initializeMissingSheets,
} from '../../services/googleSheets.ts';
import { getOrCreateReceiptsFolder } from '../../services/googleDrive.ts';
import { runAccountingScenarioTests, TestSuiteResult } from '../../utils/testRunner.ts';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void>;
  accessToken: string | null;
  userEmail?: string | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  isSigningIn: boolean;
  onSyncToSheets: () => Promise<void>;
  onReloadFromSheets: () => Promise<void>;
  isSyncing: boolean;
  onLoadTestDataset: (dataset: {
    expenses: Expense[];
    cashReceived: CashReceived[];
    settlements: SettlementRecord[];
    statements: ExpenseStatement[];
    reconciliations: CashReconciliation[];
  }) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  accessToken,
  userEmail,
  onGoogleSignIn,
  onGoogleSignOut,
  isSigningIn,
  onSyncToSheets,
  onReloadFromSheets,
  isSyncing,
  onLoadTestDataset,
}) => {
  const [userName, setUserName] = useState(settings.userName);
  const [managerName, setManagerName] = useState(settings.managerName);
  const [lowCashThreshold, setLowCashThreshold] = useState(String(settings.lowCashThreshold));
  const [receiptMandatory, setReceiptMandatory] = useState(settings.receiptMandatory);
  const [receiptThresholdAmount, setReceiptThresholdAmount] = useState(
    String(settings.receiptThresholdAmount)
  );
  const [categories, setCategories] = useState<string[]>([...settings.categories]);
  const [newCategory, setNewCategory] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState(settings.spreadsheetId || '');
  const [driveFolderId, setDriveFolderId] = useState(settings.driveFolderId || '');

  const [openingCash, setOpeningCash] = useState(String(settings.openingCashBalance));
  const [openingAdvance, setOpeningAdvance] = useState(String(settings.openingAdvanceBalance));
  const [openingDate, setOpeningDate] = useState(settings.openingBalanceDate || '2026-10-01');

  // Status indicators
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test suite modal
  const [testSuiteResult, setTestSuiteResult] = useState<TestSuiteResult | null>(null);

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    if (categories.length > 1) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      alert('You must have at least one expense category.');
    }
  };

  const handleResetCategories = () => {
    setCategories([...DEFAULT_CATEGORIES]);
  };

  // 1-Click Create Spreadsheet in Google Sheets
  const handleCreateSpreadsheet = async () => {
    if (!accessToken) {
      alert('Please sign in with your Google account first to create a spreadsheet.');
      return;
    }

    try {
      setIsCreatingSheet(true);
      setTestResult(null);
      const sheet = await createDedicatedSpreadsheet(accessToken);
      setSpreadsheetId(sheet.id);

      // Also create receipts folder in Drive
      const folder = await getOrCreateReceiptsFolder(accessToken);
      setDriveFolderId(folder.id);

      // Save directly to settings
      const updated: AppSettings = {
        ...settings,
        spreadsheetId: sheet.id,
        spreadsheetName: sheet.name,
        driveFolderId: folder.id,
        driveFolderName: folder.name,
      };
      await onUpdateSettings(updated);

      setTestResult({
        success: true,
        message: `Created & initialized "${sheet.name}" with all 7 worksheets!`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to create spreadsheet.',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Test Spreadsheet Connectivity
  const handleTestConnection = async () => {
    if (!accessToken) {
      alert('Please sign in with Google first.');
      return;
    }
    if (!spreadsheetId.trim()) {
      alert('Please provide a Google Spreadsheet ID.');
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await testSpreadsheetAccess(accessToken, spreadsheetId.trim());

      if (res.success && res.missingSheets.length > 0) {
        // Automatically offer to initialize missing worksheets
        await initializeMissingSheets(accessToken, spreadsheetId.trim(), res.missingSheets);
        setTestResult({
          success: true,
          message: `Connected! Initialized missing sheets: ${res.missingSheets.join(', ')}`,
        });
      } else {
        setTestResult({
          success: res.success,
          message: res.message,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save all settings
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated: AppSettings = {
        ...settings,
        userName: userName.trim() || settings.userName,
        managerName: managerName.trim() || settings.managerName,
        lowCashThreshold: parseFloat(lowCashThreshold) || 2000,
        receiptMandatory,
        receiptThresholdAmount: parseFloat(receiptThresholdAmount) || 0,
        categories,
        spreadsheetId: spreadsheetId.trim() || undefined,
        driveFolderId: driveFolderId.trim() || undefined,
        openingCashBalance: parseFloat(openingCash) || 0,
        openingAdvanceBalance: parseFloat(openingAdvance) || 0,
        openingBalanceDate: openingDate,
      };

      await onUpdateSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Run Test Suite
  const handleRunTests = () => {
    const results = runAccountingScenarioTests();
    setTestSuiteResult(results);
  };

  const handleApplyTestDataset = () => {
    if (!testSuiteResult) return;
    onLoadTestDataset(testSuiteResult.dataset);
    alert('Section 17 verified test dataset has been loaded into your application!');
    setTestSuiteResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-slate-700" />
            Configuration & Database Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Google Workspace connections, opening balances, policies, and verification
          </p>
        </div>

        <button
          onClick={handleRunTests}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs hover:bg-indigo-100 transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Run Section 17 Test Suite</span>
        </button>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* 1. GOOGLE WORKSPACE & SHEETS INTEGRATION CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Google Sheets Database & Google Drive Integration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your Google account to sync all transactions to a dedicated Google Sheet
              </p>
            </div>

            {/* Auth status pill */}
            {userEmail ? (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full gap-1 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {userEmail}
                </span>
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  className="text-xs text-slate-500 hover:text-rose-600 underline"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>

          {/* 1-Click Setup Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Automated Cloud Spreadsheet Setup
                </p>
                <p className="text-[11px] text-slate-500">
                  Automatically provisions all 7 financial worksheets (Expenses, CashReceived, Settlements, ExpenseStatements, Settings, AuditLog, Reconciliations) and a dedicated receipts folder in Google Drive.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateSpreadsheet}
                disabled={isCreatingSheet || !accessToken}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 disabled:opacity-50 shrink-0 shadow-2xs"
              >
                {isCreatingSheet ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Provisioning Sheets...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>1-Click Create Spreadsheet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Spreadsheet ID & Drive folder ID input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Google Spreadsheet ID
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. 1BxiMVs0XR..."
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-emerald-700 hover:bg-slate-50 shrink-0"
                    title="Open Spreadsheet in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Google Drive Receipts Folder ID
              </label>
              <input
                type="text"
                placeholder="e.g. 1a2b3c..."
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Connectivity Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !accessToken || !spreadsheetId}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{isTesting ? 'Testing Access...' : 'Test Database Connectivity'}</span>
            </button>

            {spreadsheetId && accessToken && (
              <>
                <button
                  type="button"
                  onClick={onSyncToSheets}
                  disabled={isSyncing}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Local Data to Google Sheets</span>
                </button>

                <button
                  type="button"
                  onClick={onReloadFromSheets}
                  disabled={isSyncing}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reload Data from Sheets</span>
                </button>
              </>
            )}
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* 2. USER & MANAGER PROFILES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">User & Manager Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Employee Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Manager Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>
          </div>
        </div>

        {/* 3. OPENING BALANCES & THRESHOLDS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">Opening Balances & Policy Thresholds</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Opening Cash Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Opening Outstanding Advance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingAdvance}
                onChange={(e) => setOpeningAdvance(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Opening Balance Setup Date
              </label>
              <input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Low-Cash Alert Threshold (₹)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={lowCashThreshold}
                onChange={(e) => setLowCashThreshold(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Shows warning on dashboard when cash balance drops to or below this amount.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mandatory Receipt Threshold (₹)
              </label>
              <input
                type="number"
                step="50"
                min="0"
                value={receiptThresholdAmount}
                onChange={(e) => setReceiptThresholdAmount(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Receipt upload mandatory for single expenses at or above this amount (e.g. ₹500).
              </p>
            </div>
          </div>
        </div>

        {/* 4. EXPENSE CATEGORIES MANAGER */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">Manage Expense Categories</h3>
              <p className="text-xs text-slate-500">Configure allowable categories for expense entry</p>
            </div>

            <button
              type="button"
              onClick={handleResetCategories}
              className="text-xs text-emerald-700 font-semibold hover:underline"
            >
              Reset to Defaults
            </button>
          </div>

          {/* Add new category */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter new category name..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              className="flex-1 p-2 rounded-lg border border-slate-300 text-xs"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Save Bar */}
        <div className="sticky bottom-4 bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-slate-200 shadow-md flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Settings...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* SECTION 17 TEST SUITE RESULTS MODAL */}
      {testSuiteResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Section 17 Accounting Scenario Verification</h3>
                <p className="text-[11px] text-slate-400">
                  Automated validation of all 15 accounting steps and formulas
                </p>
              </div>
              <button
                onClick={() => setTestSuiteResult(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between font-bold ${
                  testSuiteResult.allPassed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <span>
                  {testSuiteResult.allPassed ? '✓ ALL 15 ACCOUNTING TESTS PASSED' : 'SOME TESTS FAILED'}
                </span>
                <span>
                  {testSuiteResult.passedCount} / {testSuiteResult.totalSteps} passed
                </span>
              </div>

              <div className="space-y-2">
                {testSuiteResult.steps.map((st) => (
                  <div
                    key={st.step}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-500">Step {st.step}</span>
                        <span className="font-bold text-slate-900">{st.title}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{st.description}</p>
                      <p className="text-slate-400 text-[10px] mt-1">
                        Expected: {st.expected} | Actual: {st.actual}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                        st.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {st.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleApplyTestDataset}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs"
                >
                  Load This Test Scenario into App
                </button>
                <button
                  type="button"
                  onClick={() => setTestSuiteResult(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
