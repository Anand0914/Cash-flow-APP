/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  ExternalLink,
  Download,
  Calendar,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Expense, AppSettings, AuditLogEntry } from '../../types/index.ts';
import { formatINR, formatDate } from '../../utils/currency.ts';
import { exportFullExcelWorkbook } from '../../utils/exports.ts';

interface ExpenseHistoryPageProps {
  expenses: Expense[];
  settings: AppSettings;
  onOpenDetail: (expense: Expense) => void;
  onOpenEdit: (expense: Expense) => void;
  auditLogs: AuditLogEntry[];
}

export const ExpenseHistoryPage: React.FC<ExpenseHistoryPageProps> = ({
  expenses,
  settings,
  onOpenDetail,
  onOpenEdit,
  auditLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedApproval, setSelectedApproval] = useState<string>('All');
  const [selectedSettlement, setSelectedSettlement] = useState<string>('All');
  const [selectedReceipt, setSelectedReceipt] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'id'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          exp.description.toLowerCase().includes(query) ||
          exp.vendor.toLowerCase().includes(query) ||
          exp.id.toLowerCase().includes(query) ||
          exp.purpose.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Category
      if (selectedCategory !== 'All' && exp.category !== selectedCategory) {
        return false;
      }

      // Approval Status
      if (selectedApproval !== 'All' && exp.approvalStatus !== selectedApproval) {
        return false;
      }

      // Settlement Status
      if (selectedSettlement !== 'All' && exp.settlementStatus !== selectedSettlement) {
        return false;
      }

      // Receipt Filter
      if (selectedReceipt === 'With Receipt' && !exp.receiptUrl) return false;
      if (selectedReceipt === 'Missing Receipt' && exp.receiptUrl) return false;

      // Date Range
      if (startDate && exp.date < startDate) return false;
      if (endDate && exp.date > endDate) return false;

      return true;
    });
  }, [
    expenses,
    searchQuery,
    selectedCategory,
    selectedApproval,
    selectedSettlement,
    selectedReceipt,
    startDate,
    endDate,
  ]);

  // Sort logic
  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'id') {
        comparison = a.id.localeCompare(b.id);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [filteredExpenses, sortField, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(sortedExpenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedExpenses.slice(start, start + pageSize);
  }, [sortedExpenses, currentPage, pageSize]);

  const toggleSort = (field: 'date' | 'amount' | 'id') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-4">
      {/* Page Title & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Expense Ledger History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse, filter, audit, and inspect all recorded cash expenses
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">
              Filtered Total: <strong className="text-slate-900">{formatINR(filteredTotal)}</strong> ({filteredExpenses.length} records)
            </span>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description, vendor, purpose, or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="All">All Categories</option>
              {settings.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Approval Filter */}
          <div>
            <select
              value={selectedApproval}
              onChange={(e) => {
                setSelectedApproval(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="All">All Approval Statuses</option>
              <option value="Recorded">Recorded (Draft)</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Settlement Filter */}
          <div>
            <select
              value={selectedSettlement}
              onChange={(e) => {
                setSelectedSettlement(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="All">All Settlement Statuses</option>
              <option value="Unsettled">Unsettled</option>
              <option value="Partially Settled">Partially Settled</option>
              <option value="Settled">Settled</option>
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Dates:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs p-1.5 rounded-md border border-slate-300"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs p-1.5 rounded-md border border-slate-300"
          />

          <select
            value={selectedReceipt}
            onChange={(e) => {
              setSelectedReceipt(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs p-1.5 rounded-md border border-slate-300 bg-white"
          >
            <option value="All">All Receipts</option>
            <option value="With Receipt">Has Receipt Attached</option>
            <option value="Missing Receipt">Missing Receipt</option>
          </select>

          {(searchQuery ||
            selectedCategory !== 'All' ||
            selectedApproval !== 'All' ||
            selectedSettlement !== 'All' ||
            selectedReceipt !== 'All' ||
            startDate ||
            endDate) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedApproval('All');
                setSelectedSettlement('All');
                setSelectedReceipt('All');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="text-emerald-700 font-semibold hover:underline text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th
                  onClick={() => toggleSort('id')}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900"
                >
                  <span className="flex items-center gap-1">
                    ID <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => toggleSort('date')}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900"
                >
                  <span className="flex items-center gap-1">
                    Date <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Description & Vendor</th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900"
                >
                  <span className="flex items-center justify-end gap-1">
                    Amount <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-3.5 text-center">Receipt</th>
                <th className="py-3 px-3.5">Approval</th>
                <th className="py-3 px-3.5">Settlement</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching expenses found for selected filters.
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID */}
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      {exp.id}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-800">
                      {formatDate(exp.date)}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {exp.category}
                      </span>
                    </td>

                    {/* Description & Vendor */}
                    <td className="py-3 px-3.5 max-w-[200px]">
                      <p className="font-semibold text-slate-900 truncate">{exp.description}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {exp.vendor ? `Paid to: ${exp.vendor}` : exp.purpose}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatINR(exp.amount)}
                    </td>

                    {/* Receipt */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {exp.receiptUrl ? (
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-semibold gap-1 text-[11px]"
                          title="Open attached receipt"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Approval */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          exp.approvalStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : exp.approvalStatus === 'Submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : exp.approvalStatus === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {exp.approvalStatus}
                      </span>
                    </td>

                    {/* Settlement */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          exp.settlementStatus === 'Settled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : exp.settlementStatus === 'Partially Settled'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {exp.settlementStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenDetail(exp)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenEdit(exp)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit with Audit Log"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing page <strong className="text-slate-900">{currentPage}</strong> of{' '}
            <strong className="text-slate-900">{totalPages}</strong> ({sortedExpenses.length} items)
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
