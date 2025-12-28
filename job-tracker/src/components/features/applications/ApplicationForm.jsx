"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  requiresAppliedDate,
} from "@/lib/utils/applicationStatus";

/**
 * ApplicationForm component
 * Used for both creating and editing applications.
 */
export function ApplicationForm({
  application = null,
  initialValues = null,
  onSave,
  onCancel,
  isLoading = false,
  onPasteJd = null,
}) {
  const isEditing = !!application;
  const baseValues = application || initialValues || {};

  // Form state initialized from application prop
  const [company, setCompany] = useState(baseValues.company || "");
  const [role, setRole] = useState(baseValues.role || "");
  const [link, setLink] = useState(baseValues.link || "");
  const [status, setStatus] = useState(baseValues.status || "draft");
  const [appliedDate, setAppliedDate] = useState(baseValues.appliedDate || "");
  const [notes, setNotes] = useState(baseValues.notes || "");
  const [location, setLocation] = useState(baseValues.location || "");
  const [jdSnapshot, setJdSnapshot] = useState(baseValues.jdSnapshot || "");

  // Validation state
  const [errors, setErrors] = useState({});

  // Check if this is a draft application (company/role not required)
  const isDraft = status === "draft";

  const validate = () => {
    const newErrors = {};

    // Company and role required only for non-draft status
    if (!isDraft && !company.trim()) {
      newErrors.company = "Company is required";
    }

    if (!isDraft && !role.trim()) {
      newErrors.role = "Role is required";
    }

    if (requiresAppliedDate(status) && !appliedDate) {
      newErrors.appliedDate = "Applied date is required for this status";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSave({
      company: company.trim() || null,
      role: role.trim() || null,
      link: link.trim() || null,
      status,
      appliedDate: appliedDate || null,
      notes: notes.trim() || null,
      location: location.trim() || null,
      jdSnapshot: jdSnapshot.trim() || null,
    });
  };

  // Check for missing fields
  const missingFields = [];
  if (!company.trim()) missingFields.push("company");
  if (!role.trim()) missingFields.push("role");
  if (!location.trim()) missingFields.push("location");
  if (!jdSnapshot.trim()) missingFields.push("jdSnapshot");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Missing Fields Warning */}
      {isEditing && missingFields.length > 0 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">Missing fields:</span>{" "}
            {missingFields.map((f) => f === "jdSnapshot" ? "Job Description" : f).join(", ")}
          </p>
          {missingFields.includes("jdSnapshot") && onPasteJd && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPasteJd}
              className="mt-2"
            >
              Paste Job Description
            </Button>
          )}
        </div>
      )}

      {/* Company */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company {!isDraft && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g., Google"
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {errors.company && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.company}</p>
        )}
      </div>

      {/* Role */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role {!isDraft && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g., Software Engineer"
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {errors.role && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.role}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Sydney, NSW"
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {/* Link */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job Link
        </label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {/* Status */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Applied Date */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Applied Date {requiresAppliedDate(status) && <span className="text-red-500">*</span>}
        </label>
        <input
          type="date"
          value={appliedDate}
          onChange={(e) => setAppliedDate(e.target.value)}
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {errors.appliedDate && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.appliedDate}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional notes..."
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {/* Job Description (JD Snapshot) - shown when editing */}
      {isEditing && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Job Description
            {jdSnapshot && (
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                ({jdSnapshot.length.toLocaleString()} characters)
              </span>
            )}
          </label>
          <textarea
            value={jdSnapshot}
            onChange={(e) => setJdSnapshot(e.target.value)}
            rows={8}
            placeholder="Paste the job description here..."
            className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 font-mono text-sm"
          />
          {!jdSnapshot.trim() && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Job description is needed for requirements extraction and cover letter generation.
            </p>
          )}
          {jdSnapshot.length > 50000 && jdSnapshot.length <= 100000 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Job description is large ({jdSnapshot.length.toLocaleString()} characters). Consider summarizing for better performance.
            </p>
          )}
          {jdSnapshot.length > 100000 && (
            <p className="text-xs text-red-600 dark:text-red-400">
              ❌ Job description exceeds maximum length ({jdSnapshot.length.toLocaleString()}/100,000 characters). Please reduce content before saving.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Create Application"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
