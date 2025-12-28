"use client";

import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  APPLICATION_SOURCES,
  SOURCE_LABELS,
} from "@/lib/utils/applicationStatus";

/**
 * ApplicationFilters component
 * Provides filter controls for status, source, search, and date range.
 */
export function ApplicationFilters({ filters, onFilterChange }) {
  const handleStatusChange = (e) => {
    onFilterChange({ ...filters, status: e.target.value || null });
  };

  const handleSourceChange = (e) => {
    onFilterChange({ ...filters, source: e.target.value || null });
  };

  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, q: e.target.value || null });
  };

  const handleFromChange = (e) => {
    onFilterChange({ ...filters, from: e.target.value || null });
  };

  const handleToChange = (e) => {
    onFilterChange({ ...filters, to: e.target.value || null });
  };

  const handleClearFilters = () => {
    onFilterChange({
      status: null,
      source: null,
      q: null,
      from: null,
      to: null,
    });
  };

  const hasActiveFilters =
    filters.status || filters.source || filters.q || filters.from || filters.to;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search company or role..."
          value={filters.q || ""}
          onChange={handleSearchChange}
          className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {/* Status and Source filters */}
      <div className="flex gap-2">
        <select
          value={filters.status || ""}
          onChange={handleStatusChange}
          className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="">All Status</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={filters.source || ""}
          onChange={handleSourceChange}
          className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="">All Sources</option>
          {APPLICATION_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={filters.from || ""}
          onChange={handleFromChange}
          className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="From"
        />
        <span className="text-zinc-400 text-sm">to</span>
        <input
          type="date"
          value={filters.to || ""}
          onChange={handleToChange}
          className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="To"
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
