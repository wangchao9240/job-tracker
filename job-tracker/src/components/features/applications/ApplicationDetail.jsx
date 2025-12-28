"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  requiresAppliedDate,
} from "@/lib/utils/applicationStatus";
import { reasonsToMessages } from "@/lib/utils/lowSignalMessages";

/**
 * Format a timestamp for display
 */
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format an event for display
 */
function formatEvent(event) {
  if (event.eventType === "status_changed") {
    const from = STATUS_LABELS[event.payload.from] || event.payload.from;
    const to = STATUS_LABELS[event.payload.to] || event.payload.to;
    return `Status: ${from} → ${to}`;
  }

  if (event.eventType === "field_changed") {
    const field = event.payload.field;
    const from = event.payload.from || "(empty)";
    const to = event.payload.to || "(empty)";
    const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
    return `${fieldLabel}: "${from}" → "${to}"`;
  }

  if (event.eventType === "jd_snapshot_updated") {
    const fromLength = event.payload.fromLength || 0;
    const toLength = event.payload.toLength || 0;
    if (fromLength === 0) {
      return `Job Description added (${toLength.toLocaleString()} characters)`;
    }
    if (toLength === 0) {
      return `Job Description removed`;
    }
    return `Job Description updated (${fromLength.toLocaleString()} → ${toLength.toLocaleString()} characters)`;
  }

  if (event.eventType === "requirements_extracted") {
    const responsibilitiesCount = event.payload.responsibilitiesCount || 0;
    const requirementsCount = event.payload.requirementsCount || 0;
    return `Requirements extracted (${responsibilitiesCount} responsibilities, ${requirementsCount} requirements)`;
  }

  if (event.eventType === "requirements_updated") {
    const responsibilitiesCount = event.payload.responsibilitiesCount || 0;
    const requirementsCount = event.payload.requirementsCount || 0;
    return `Requirements updated (${responsibilitiesCount} responsibilities, ${requirementsCount} requirements)`;
  }

  if (event.eventType === "interview_prep_generated") {
    const questionsCount = event.payload.questionsCount || 0;
    return `Interview prep generated (${questionsCount} questions)`;
  }

  return event.eventType;
}

/**
 * ApplicationDetail component
 * Displays and edits a single application in the detail panel.
 * @param {Object} props
 * @param {Object} props.application - The application to display/edit
 * @param {Function} props.onUpdate - Callback when application is updated
 * @param {Function} props.onClose - Callback to close the detail panel
 * @param {Object} props.reminder - Active reminder for this application (if any)
 * @param {Function} props.onDismissReminder - Callback when reminder is dismissed
 * @param {Object} props.ingestionResult - Result from URL paste ingestion (if any)
 * @param {Function} props.onClearIngestionResult - Callback to clear ingestion result
 */
export function ApplicationDetail({
  application,
  onUpdate,
  onClose,
  reminder,
  onDismissReminder,
  ingestionResult,
  onClearIngestionResult,
}) {
  const router = useRouter();
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  const [timelineRefreshWarning, setTimelineRefreshWarning] = useState(false);
  const [saveDetails, setSaveDetails] = useState(null); // Track what was saved

  // Form state initialized from application
  const [company, setCompany] = useState(application.company || "");
  const [role, setRole] = useState(application.role || "");
  const [link, setLink] = useState(application.link || "");
  const [appStatus, setAppStatus] = useState(application.status || "draft");
  const [appliedDate, setAppliedDate] = useState(application.appliedDate || "");
  const [notes, setNotes] = useState(application.notes || "");
  const [location, setLocation] = useState(application.location || "");
  const [jdSnapshot, setJdSnapshot] = useState(application.jdSnapshot || "");

  // Validation state
  const [errors, setErrors] = useState({});

  // Timeline state
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState(null);

  // Requirements extraction state
  const [extractionStatus, setExtractionStatus] = useState("idle"); // idle | extracting | error
  const [extractionError, setExtractionError] = useState(null);
  const [extractedRequirements, setExtractedRequirements] = useState(
    application.extractedRequirements || null
  );
  const extractionAbortControllerRef = useRef(null);
  const requirementsSaveAbortControllerRef = useRef(null);
  const focusSaveAbortControllerRef = useRef(null);

  // Requirements editing state
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [editedResponsibilities, setEditedResponsibilities] = useState([]);
  const [editedRequirementsList, setEditedRequirementsList] = useState([]);
  const [requirementsSaveStatus, setRequirementsSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [requirementsSaveError, setRequirementsSaveError] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null); // { list: "responsibilities" | "requirements", index: number }
  const [editingItemValue, setEditingItemValue] = useState("");
  const [newItemList, setNewItemList] = useState(null); // "responsibilities" | "requirements" | null
  const [newItemValue, setNewItemValue] = useState("");

  // Focus selection state (for low-signal JD handling)
  const [showFocusSelection, setShowFocusSelection] = useState(false);
  const [selectedFocusItems, setSelectedFocusItems] = useState([]);
  const [focusSaveStatus, setFocusSaveStatus] = useState("idle"); // idle | saving | error

  // Interview prep state
  const [interviewPrepPack, setInterviewPrepPack] = useState(application.interviewPrepPack || null);
  const [interviewPrepNotes, setInterviewPrepNotes] = useState(application.interviewPrepNotes || "");
  const [interviewPrepStatus, setInterviewPrepStatus] = useState("idle"); // idle | generating | error
  const [interviewPrepError, setInterviewPrepError] = useState(null);
  const [interviewPrepNotesSaveStatus, setInterviewPrepNotesSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [companyContextNotes, setCompanyContextNotes] = useState(""); // Optional context for generation
  const interviewPrepAbortControllerRef = useRef(null);
  const interviewPrepNotesSaveAbortControllerRef = useRef(null);

  // Sync form state when application prop changes
  useEffect(() => {
    setCompany(application.company || "");
    setRole(application.role || "");
    setLink(application.link || "");
    setAppStatus(application.status || "draft");
    setAppliedDate(application.appliedDate || "");
    setNotes(application.notes || "");
    setLocation(application.location || "");
    setJdSnapshot(application.jdSnapshot || "");
    setExtractedRequirements(application.extractedRequirements || null);
    setExtractionStatus("idle");
    setExtractionError(null);
    // Reset editing state when application changes
    setEditingRequirements(false);
    setEditedResponsibilities([]);
    setEditedRequirementsList([]);
    setRequirementsSaveStatus("idle");
    setRequirementsSaveError(null);
    setEditingItemIndex(null);
    setNewItemList(null);
    // Reset focus selection state
    setShowFocusSelection(false);
    setSelectedFocusItems([]);
    setFocusSaveStatus("idle");
    // Reset interview prep state
    setInterviewPrepPack(application.interviewPrepPack || null);
    setInterviewPrepNotes(application.interviewPrepNotes || "");
    setInterviewPrepStatus("idle");
    setInterviewPrepError(null);
    setInterviewPrepNotesSaveStatus("idle");
    setCompanyContextNotes("");
  }, [application]);

  // Fetch timeline on mount and when application changes
  useEffect(() => {
    let isMounted = true;

    async function fetchTimeline() {
      try {
        setTimelineLoading(true);
        setTimelineError(null);

        const response = await fetch(`/api/applications/${application.id}/timeline`, {
          cache: "no-store",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          router.replace("/sign-in");
          return;
        }

        if (response.status === 404) {
          setTimeline([]);
          setTimelineLoading(false);
          return;
        }

        const result = await response.json();

        if (!isMounted) return;

        if (result.error) {
          setTimelineError("Failed to load timeline");
          setTimelineLoading(false);
          return;
        }

        setTimeline(result.data || []);
        setTimelineLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.log(
          JSON.stringify({
            level: "error",
            message: "Failed to fetch timeline",
            applicationId: application.id,
            error: err.message,
          })
        );
        setTimelineError("Failed to load timeline");
        setTimelineLoading(false);
      }
    }

    fetchTimeline();

    return () => {
      isMounted = false;
    };
  }, [application.id, router]);

  // Cleanup: abort any in-flight extraction or save on unmount
  useEffect(() => {
    return () => {
      if (extractionAbortControllerRef.current) {
        extractionAbortControllerRef.current.abort();
      }
      if (requirementsSaveAbortControllerRef.current) {
        requirementsSaveAbortControllerRef.current.abort();
      }
      if (focusSaveAbortControllerRef.current) {
        focusSaveAbortControllerRef.current.abort();
      }
      if (interviewPrepAbortControllerRef.current) {
        interviewPrepAbortControllerRef.current.abort();
      }
      if (interviewPrepNotesSaveAbortControllerRef.current) {
        interviewPrepNotesSaveAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Check if this is a draft application (company/role not required)
  const isDraft = appStatus === "draft";

  const validate = () => {
    const newErrors = {};

    // Company and role required only for non-draft status
    if (!isDraft && !company.trim()) {
      newErrors.company = "Company is required";
    }

    if (!isDraft && !role.trim()) {
      newErrors.role = "Role is required";
    }

    if (requiresAppliedDate(appStatus) && !appliedDate) {
      newErrors.appliedDate = "Applied date is required for this status";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDismissReminder = async () => {
    if (!reminder || dismissing) return;

    try {
      setDismissing(true);

      const response = await fetch(`/api/reminders/${reminder.id}/dismiss`, {
        method: "POST",
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (!response.ok) {
        console.log(
          JSON.stringify({
            level: "error",
            message: "Failed to dismiss reminder",
            reminderId: reminder.id,
          })
        );
        return;
      }

      // Notify parent to refresh reminders
      if (onDismissReminder) {
        onDismissReminder(reminder.id);
      }
    } catch (err) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to dismiss reminder",
          reminderId: reminder.id,
          error: err.message,
        })
      );
    } finally {
      setDismissing(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      setStatus("saving");
      setError(null);

      const patch = {
        status: appStatus,
        appliedDate: appliedDate || null,
        notes: notes.trim() || null,
      };

      const nextCompany = company.trim() || null;
      if (nextCompany) patch.company = nextCompany;

      const nextRole = role.trim() || null;
      if (nextRole) patch.role = nextRole;

      const nextLink = link.trim() || null;
      if (nextLink !== (application.link || null)) patch.link = nextLink;

      const nextLocation = location.trim() || null;
      if (nextLocation !== (application.location || null)) patch.location = nextLocation;

      const nextJdSnapshot = jdSnapshot.trim() || null;
      if (nextJdSnapshot !== (application.jdSnapshot || null)) patch.jdSnapshot = nextJdSnapshot;

      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (response.status === 404) {
        setError("Application not found.");
        setStatus("error");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setError(result.error.message || "Failed to save changes. Please try again.");
        setStatus("error");
        return;
      }

      // Track what was saved for enhanced confirmation message
      const jdChanged = jdSnapshot.trim() !== (application.jdSnapshot || "");
      const jdLength = jdSnapshot.trim().length;
      setSaveDetails({
        jdChanged,
        jdLength: jdChanged ? jdLength : null,
      });

      setStatus("saved");
      setTimeout(() => {
        setStatus("idle");
        setSaveDetails(null);
      }, 3000);

      // Refresh timeline after successful save
      try {
        const timelineResponse = await fetch(`/api/applications/${application.id}/timeline`, {
          cache: "no-store",
        });
        const timelineResult = await timelineResponse.json();
        if (!timelineResult.error) {
          setTimeline(timelineResult.data || []);
          setTimelineRefreshWarning(false); // Clear warning on success
        } else {
          setTimelineRefreshWarning(true);
        }
      } catch (timelineErr) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to refresh timeline after save",
            applicationId: application.id,
            error: timelineErr.message,
          })
        );
        setTimelineRefreshWarning(true);
      }

      // Notify parent of update
      if (onUpdate) {
        onUpdate(result.data);
      }
    } catch (err) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to save application",
          applicationId: application.id,
          error: err.message,
        })
      );
      setError("Failed to save changes. Please try again.");
      setStatus("error");
    }
  };

  const handleExtractRequirements = async () => {
    // Prevent concurrent extractions (race condition fix)
    if (extractionStatus === "extracting") {
      return;
    }

    // Check if JD snapshot exists (use current form state, not saved application)
    if (!jdSnapshot.trim()) {
      setExtractionError("Please paste a job description first.");
      setExtractionStatus("error");
      return;
    }

    // Check if there are unsaved JD changes - prompt user to save first
    if (jdSnapshot.trim() !== (application.jdSnapshot || "").trim()) {
      setExtractionError("Please save your changes first before extracting requirements.");
      setExtractionStatus("error");
      return;
    }

    // Abort any previous extraction
    if (extractionAbortControllerRef.current) {
      extractionAbortControllerRef.current.abort();
    }

    // Create new AbortController for this extraction
    const abortController = new AbortController();
    extractionAbortControllerRef.current = abortController;

    try {
      setExtractionStatus("extracting");
      setExtractionError(null);

      const response = await fetch("/api/requirements/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
        }),
        signal: abortController.signal,
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        let errorMessage = "Failed to extract requirements. Please try again.";
        if (result.error.code === "JD_SNAPSHOT_REQUIRED") {
          errorMessage = "Please add a job description first.";
        } else if (result.error.code === "AI_NOT_CONFIGURED") {
          errorMessage = "AI extraction is not available. Please contact support.";
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }
        setExtractionError(errorMessage);
        setExtractionStatus("error");
        return;
      }

      // Update local state with extracted requirements including quality metadata
      const newExtractedRequirements = {
        responsibilities: result.data.responsibilities,
        requirements: result.data.requirements,
        extractedAt: result.data.extractedAt,
        quality: result.data.quality || null,
        focusResponsibilities: null,
        focusSetUpdatedAt: null,
        focusDismissed: false,
      };
      setExtractedRequirements(newExtractedRequirements);
      setExtractionStatus("idle");

      // If low-signal, automatically show focus selection prompt
      if (result.data.quality?.isLowSignal) {
        setShowFocusSelection(true);
        setSelectedFocusItems([]);
      }

      // Notify parent of update (the application now has extractedRequirements)
      if (onUpdate) {
        onUpdate({
          ...application,
          extractedRequirements: newExtractedRequirements,
        });
      }
    } catch (err) {
      // Ignore abort errors (user navigated away or new extraction started)
      if (err.name === "AbortError") {
        return;
      }

      console.log(
        JSON.stringify({
          level: "error",
          message: "Requirements extraction failed",
          applicationId: application.id,
          error: err.message,
        })
      );
      setExtractionError("Failed to extract requirements. Please try again.");
      setExtractionStatus("error");
    } finally {
      // Clean up ref if this was the active controller
      if (extractionAbortControllerRef.current === abortController) {
        extractionAbortControllerRef.current = null;
      }
    }
  };

  // Start editing requirements
  const handleStartEditingRequirements = () => {
    setEditedResponsibilities([...(extractedRequirements?.responsibilities || [])]);
    setEditedRequirementsList([...(extractedRequirements?.requirements || [])]);
    setEditingRequirements(true);
    setRequirementsSaveStatus("idle");
    setRequirementsSaveError(null);
  };

  // Cancel editing requirements
  const handleCancelEditingRequirements = () => {
    setEditingRequirements(false);
    setEditedResponsibilities([]);
    setEditedRequirementsList([]);
    setEditingItemIndex(null);
    setNewItemList(null);
    setRequirementsSaveStatus("idle");
    setRequirementsSaveError(null);
  };

  // Delete an item from a list
  const handleDeleteItem = (list, index) => {
    if (list === "responsibilities") {
      setEditedResponsibilities((prev) => prev.filter((_, i) => i !== index));
    } else {
      setEditedRequirementsList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Move item up in the list
  const handleMoveUp = (list, index) => {
    if (index === 0) return;
    const setter = list === "responsibilities" ? setEditedResponsibilities : setEditedRequirementsList;
    setter((prev) => {
      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList;
    });
  };

  // Move item down in the list
  const handleMoveDown = (list, index) => {
    const currentList = list === "responsibilities" ? editedResponsibilities : editedRequirementsList;
    if (index === currentList.length - 1) return;
    const setter = list === "responsibilities" ? setEditedResponsibilities : setEditedRequirementsList;
    setter((prev) => {
      const newList = [...prev];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      return newList;
    });
  };

  // Start inline editing an item
  const handleStartEditItem = (list, index, value) => {
    setEditingItemIndex({ list, index });
    setEditingItemValue(value);
  };

  // Save inline edit
  const handleSaveEditItem = () => {
    if (!editingItemIndex) return;
    const value = editingItemValue.trim();
    if (!value) {
      // If empty, delete the item
      handleDeleteItem(editingItemIndex.list, editingItemIndex.index);
    } else {
      const setter = editingItemIndex.list === "responsibilities" ? setEditedResponsibilities : setEditedRequirementsList;
      setter((prev) => {
        const newList = [...prev];
        newList[editingItemIndex.index] = value;
        return newList;
      });
    }
    setEditingItemIndex(null);
    setEditingItemValue("");
  };

  // Cancel inline edit
  const handleCancelEditItem = () => {
    setEditingItemIndex(null);
    setEditingItemValue("");
  };

  // Start adding a new item
  const handleStartAddItem = (list) => {
    setNewItemList(list);
    setNewItemValue("");
  };

  // Save new item
  const handleSaveNewItem = () => {
    if (!newItemList) return;
    const value = newItemValue.trim();
    if (value) {
      const setter = newItemList === "responsibilities" ? setEditedResponsibilities : setEditedRequirementsList;
      setter((prev) => [...prev, value]);
    }
    setNewItemList(null);
    setNewItemValue("");
  };

  // Cancel adding new item
  const handleCancelNewItem = () => {
    setNewItemList(null);
    setNewItemValue("");
  };

  // Save edited requirements to server
  const handleSaveRequirements = async () => {
    try {
      // Abort any previous save request
      if (requirementsSaveAbortControllerRef.current) {
        requirementsSaveAbortControllerRef.current.abort();
      }

      // Create new abort controller
      requirementsSaveAbortControllerRef.current = new AbortController();

      setRequirementsSaveStatus("saving");
      setRequirementsSaveError(null);

      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedRequirements: {
            responsibilities: editedResponsibilities,
            requirements: editedRequirementsList,
            extractedAt: extractedRequirements?.extractedAt || null,
          },
        }),
        signal: requirementsSaveAbortControllerRef.current.signal,
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (response.status === 404) {
        setRequirementsSaveError("Application not found.");
        setRequirementsSaveStatus("error");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setRequirementsSaveError(result.error.message || "Failed to save requirements. Please try again.");
        setRequirementsSaveStatus("error");
        return;
      }

      // Update local state with saved requirements
      setExtractedRequirements(result.data.extractedRequirements);
      setEditingRequirements(false);
      setEditedResponsibilities([]);
      setEditedRequirementsList([]);
      setRequirementsSaveStatus("saved");

      setTimeout(() => {
        setRequirementsSaveStatus("idle");
      }, 3000);

      // Refresh timeline after successful save
      try {
        const timelineResponse = await fetch(`/api/applications/${application.id}/timeline`, {
          cache: "no-store",
        });
        const timelineResult = await timelineResponse.json();
        if (!timelineResult.error) {
          setTimeline(timelineResult.data || []);
          setTimelineRefreshWarning(false);
        } else {
          setTimelineRefreshWarning(true);
        }
      } catch (timelineErr) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to refresh timeline after requirements save",
            applicationId: application.id,
            error: timelineErr.message,
          })
        );
        setTimelineRefreshWarning(true);
      }

      // Notify parent of update
      if (onUpdate) {
        onUpdate(result.data);
      }
    } catch (err) {
      // Ignore abort errors (user navigated away or new save started)
      if (err.name === "AbortError") {
        return;
      }

      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to save requirements",
          applicationId: application.id,
          error: err.message,
        })
      );
      setRequirementsSaveError("Failed to save requirements. Please try again.");
      setRequirementsSaveStatus("error");
    }
  };

  // Toggle a responsibility in the focus selection
  const handleToggleFocusItem = (item) => {
    setSelectedFocusItems((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    );
  };

  // Save the focus set
  const handleSaveFocusSet = async () => {
    if (selectedFocusItems.length === 0) return;

    try {
      // Abort any previous save request
      if (focusSaveAbortControllerRef.current) {
        focusSaveAbortControllerRef.current.abort();
      }

      // Create new abort controller
      focusSaveAbortControllerRef.current = new AbortController();

      setFocusSaveStatus("saving");

      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedRequirements: {
            ...extractedRequirements,
            focusResponsibilities: selectedFocusItems,
          },
        }),
        signal: focusSaveAbortControllerRef.current.signal,
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setFocusSaveStatus("error");
        return;
      }

      // Update local state
      setExtractedRequirements(result.data.extractedRequirements);
      setShowFocusSelection(false);
      setSelectedFocusItems([]);
      setFocusSaveStatus("idle");

      // Refresh timeline after successful save
      try {
        const timelineResponse = await fetch(`/api/applications/${application.id}/timeline`, {
          cache: "no-store",
        });
        const timelineResult = await timelineResponse.json();
        if (!timelineResult.error) {
          setTimeline(timelineResult.data || []);
          setTimelineRefreshWarning(false);
        } else {
          setTimelineRefreshWarning(true);
        }
      } catch (timelineErr) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to refresh timeline after focus set save",
            applicationId: application.id,
            error: timelineErr.message,
          })
        );
        setTimelineRefreshWarning(true);
      }

      // Notify parent
      if (onUpdate) {
        onUpdate(result.data);
      }
    } catch (err) {
      // Ignore abort errors (user navigated away or new save started)
      if (err.name === "AbortError") {
        return;
      }

      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to save focus set",
          applicationId: application.id,
          error: err.message,
        })
      );
      setFocusSaveStatus("error");
    }
  };

  // Skip/dismiss the focus selection prompt
  const handleSkipFocusSelection = async () => {
    try {
      // Abort any previous save request
      if (focusSaveAbortControllerRef.current) {
        focusSaveAbortControllerRef.current.abort();
      }

      // Create new abort controller
      focusSaveAbortControllerRef.current = new AbortController();

      setFocusSaveStatus("saving");

      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedRequirements: {
            ...extractedRequirements,
            focusDismissed: true,
          },
        }),
        signal: focusSaveAbortControllerRef.current.signal,
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setFocusSaveStatus("error");
        return;
      }

      // Update local state
      setExtractedRequirements(result.data.extractedRequirements);
      setShowFocusSelection(false);
      setFocusSaveStatus("idle");

      // Refresh timeline after successful save
      try {
        const timelineResponse = await fetch(`/api/applications/${application.id}/timeline`, {
          cache: "no-store",
        });
        const timelineResult = await timelineResponse.json();
        if (!timelineResult.error) {
          setTimeline(timelineResult.data || []);
          setTimelineRefreshWarning(false);
        } else {
          setTimelineRefreshWarning(true);
        }
      } catch (timelineErr) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to refresh timeline after dismissing focus selection",
            applicationId: application.id,
            error: timelineErr.message,
          })
        );
        setTimelineRefreshWarning(true);
      }

      // Notify parent
      if (onUpdate) {
        onUpdate(result.data);
      }
    } catch (err) {
      // Ignore abort errors (user navigated away or new save started)
      if (err.name === "AbortError") {
        return;
      }

      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to dismiss focus selection",
          applicationId: application.id,
          error: err.message,
        })
      );
      setFocusSaveStatus("error");
    }
  };

  // Start editing the focus set
  const handleEditFocusSet = () => {
    setSelectedFocusItems([...(extractedRequirements?.focusResponsibilities || [])]);
    setShowFocusSelection(true);
  };

  // Clear the focus set
  const handleClearFocusSet = async () => {
    try {
      // Abort any previous save request
      if (focusSaveAbortControllerRef.current) {
        focusSaveAbortControllerRef.current.abort();
      }

      // Create new abort controller
      focusSaveAbortControllerRef.current = new AbortController();

      setFocusSaveStatus("saving");

      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedRequirements: {
            ...extractedRequirements,
            focusResponsibilities: null,
          },
        }),
        signal: focusSaveAbortControllerRef.current.signal,
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setFocusSaveStatus("error");
        return;
      }

      // Update local state
      setExtractedRequirements(result.data.extractedRequirements);
      setFocusSaveStatus("idle");

      // Refresh timeline after successful save
      try {
        const timelineResponse = await fetch(`/api/applications/${application.id}/timeline`, {
          cache: "no-store",
        });
        const timelineResult = await timelineResponse.json();
        if (!timelineResult.error) {
          setTimeline(timelineResult.data || []);
          setTimelineRefreshWarning(false);
        } else {
          setTimelineRefreshWarning(true);
        }
      } catch (timelineErr) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to refresh timeline after clearing focus set",
            applicationId: application.id,
            error: timelineErr.message,
          })
        );
        setTimelineRefreshWarning(true);
      }

      // Notify parent
      if (onUpdate) {
        onUpdate(result.data);
      }
    } catch (err) {
      // Ignore abort errors (user navigated away or new save started)
      if (err.name === "AbortError") {
        return;
      }

      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to clear focus set",
          applicationId: application.id,
          error: err.message,
        })
      );
      setFocusSaveStatus("error");
    }
  };

  // Generate interview prep pack
  const handleGenerateInterviewPrep = async () => {
    if (!extractedRequirements?.responsibilities || extractedRequirements.responsibilities.length === 0) {
      setInterviewPrepError("Please extract requirements first before generating interview prep.");
      setInterviewPrepStatus("error");
      return;
    }

    // Abort any previous generation
    if (interviewPrepAbortControllerRef.current) {
      interviewPrepAbortControllerRef.current.abort();
    }

    // Create new AbortController for this generation
    const abortController = new AbortController();
    interviewPrepAbortControllerRef.current = abortController;

    try {
      setInterviewPrepStatus("generating");
      setInterviewPrepError(null);

      const response = await fetch("/api/interview-prep/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          companyContextNotes: companyContextNotes.trim() || null,
        }),
        signal: abortController.signal,
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        let errorMessage = "Failed to generate interview prep. Please try again.";
        if (result.error.code === "REQUIREMENTS_REQUIRED") {
          errorMessage = "Please extract requirements first.";
        } else if (result.error.code === "AI_NOT_CONFIGURED") {
          errorMessage = "AI generation is not available. Please contact support.";
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }
        setInterviewPrepError(errorMessage);
        setInterviewPrepStatus("error");
        return;
      }

      // Update local state with generated pack
      setInterviewPrepPack(result.data.pack);
      setInterviewPrepStatus("idle");
      setCompanyContextNotes(""); // Clear context after successful generation

      // Refresh timeline
      try {
        const timelineResponse = await fetch(`/api/applications/${application.id}/timeline`, {
          cache: "no-store",
        });
        const timelineResult = await timelineResponse.json();
        if (!timelineResult.error) {
          setTimeline(timelineResult.data || []);
          setTimelineRefreshWarning(false);
        } else {
          setTimelineRefreshWarning(true);
        }
      } catch (timelineErr) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to refresh timeline after interview prep generation",
            applicationId: application.id,
            error: timelineErr.message,
          })
        );
        setTimelineRefreshWarning(true);
      }

      // Notify parent of update
      if (onUpdate) {
        onUpdate({
          ...application,
          interviewPrepPack: result.data.pack,
        });
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === "AbortError") {
        return;
      }

      console.log(
        JSON.stringify({
          level: "error",
          message: "Interview prep generation failed",
          applicationId: application.id,
          error: err.message,
        })
      );
      setInterviewPrepError("Failed to generate interview prep. Please try again.");
      setInterviewPrepStatus("error");
    } finally {
      // Clean up ref if this was the active controller
      if (interviewPrepAbortControllerRef.current === abortController) {
        interviewPrepAbortControllerRef.current = null;
      }
    }
  };

  // Save interview prep notes
  const handleSaveInterviewPrepNotes = async () => {
    // Abort any previous save request
    if (interviewPrepNotesSaveAbortControllerRef.current) {
      interviewPrepNotesSaveAbortControllerRef.current.abort();
    }

    // Create new AbortController for this save
    const abortController = new AbortController();
    interviewPrepNotesSaveAbortControllerRef.current = abortController;

    try {
      setInterviewPrepNotesSaveStatus("saving");

      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewPrepNotes: interviewPrepNotes.trim() || null,
        }),
        signal: abortController.signal,
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setInterviewPrepNotesSaveStatus("error");
        return;
      }

      setInterviewPrepNotesSaveStatus("saved");
      setTimeout(() => {
        setInterviewPrepNotesSaveStatus("idle");
      }, 3000);

      // Refresh timeline after successful save
      try {
        const timelineResponse = await fetch(
          `/api/applications/${application.id}/timeline`,
          {
            cache: "no-store",
          }
        );

        const timelineResult = await timelineResponse.json();

        if (!timelineResult.error) {
          setTimeline(timelineResult.data || []);
          setTimelineRefreshWarning(false);
        } else {
          setTimelineRefreshWarning(true);
        }
      } catch (timelineErr) {
        console.log(
          JSON.stringify({
            level: "warn",
            message: "Failed to refresh timeline after interview prep notes save",
            applicationId: application.id,
            error: timelineErr.message,
          })
        );
        setTimelineRefreshWarning(true);
      }

      // Notify parent of update
      if (onUpdate) {
        onUpdate(result.data);
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === "AbortError") {
        return;
      }

      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to save interview prep notes",
          applicationId: application.id,
          error: err.message,
        })
      );
      setInterviewPrepNotesSaveStatus("error");
    } finally {
      // Clean up ref if this was the active controller
      if (interviewPrepNotesSaveAbortControllerRef.current === abortController) {
        interviewPrepNotesSaveAbortControllerRef.current = null;
      }
    }
  };


  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Application Details
        </h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Status Messages */}
        {status === "saved" && (
          <div className="mb-4 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {saveDetails?.jdChanged && saveDetails?.jdLength > 0
                ? `Saved successfully! Job Description updated (${saveDetails.jdLength.toLocaleString()} characters)`
                : saveDetails?.jdChanged && saveDetails?.jdLength === 0
                ? "Saved successfully! Job Description removed"
                : "Saved successfully!"}
            </p>
          </div>
        )}

        {timelineRefreshWarning && (
          <div className="mb-4 rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Changes saved, but timeline didn&apos;t update
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  Your changes were saved successfully, but we couldn&apos;t refresh the timeline. Reload the page to see the latest history.
                </p>
              </div>
              <button
                onClick={() => setTimelineRefreshWarning(false)}
                className="shrink-0 text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900/70"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={handleSave}
              className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline dark:text-red-400"
            >
              Retry
            </button>
          </div>
        )}

        {/* Follow-up Reminder Alert */}
        {reminder && (
          <div className="mb-4 rounded-md bg-orange-50 p-3 dark:bg-orange-900/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                  Follow-up needed
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">
                  No response received since applying. Consider following up.
                </p>
              </div>
              <button
                onClick={handleDismissReminder}
                disabled={dismissing}
                className="shrink-0 text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-900/70 disabled:opacity-50"
              >
                {dismissing ? "..." : "Mark done"}
              </button>
            </div>
          </div>
        )}

        {/* Ingestion Result Alert */}
        {ingestionResult && ingestionResult.applicationId === application.id && (
          <div className="mb-4 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  {ingestionResult.missing.length === 0
                    ? "Job details extracted successfully"
                    : "Partially extracted from URL"}
                </p>
                {ingestionResult.missing.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-blue-600 dark:text-blue-500">
                      Missing fields: {ingestionResult.missing.map(field => {
                        if (field === "jdSnapshot") return "Job Description";
                        return field.charAt(0).toUpperCase() + field.slice(1);
                      }).join(", ")}
                    </p>
                    {Array.isArray(ingestionResult.warnings) && ingestionResult.warnings.length > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                        {ingestionResult.warnings[0].message}
                      </p>
                    )}
                    {ingestionResult.recoveryAction === "pasteJd" && (
                      <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                        You can paste the job description manually below.
                      </p>
                    )}
                  </div>
                )}
                {Object.keys(ingestionResult.extracted).length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    Extracted: {Object.keys(ingestionResult.extracted).map(field => {
                      if (field === "jdSnapshot") return "Job Description";
                      return field.charAt(0).toUpperCase() + field.slice(1);
                    }).join(", ")}
                  </p>
                )}
              </div>
              <button
                onClick={onClearIngestionResult}
                className="shrink-0 text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/70"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Company */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Company {!isDraft && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
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
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {errors.role && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.role}</p>
            )}
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

          {/* Status */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </label>
            <select
              value={appStatus}
              onChange={(e) => setAppStatus(e.target.value)}
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
              Applied Date {requiresAppliedDate(appStatus) && <span className="text-red-500">*</span>}
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
              rows={4}
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {/* Job Description (JD Snapshot) */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Job Description
                {jdSnapshot && (
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    ({jdSnapshot.length.toLocaleString()} characters)
                  </span>
                )}
              </label>

              {/* JD Needed Warning */}
              {!jdSnapshot.trim() && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mb-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Job description needed
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Paste the job description below for requirements extraction and cover letter generation.
                  </p>
                </div>
              )}

              <textarea
                value={jdSnapshot}
                onChange={(e) => setJdSnapshot(e.target.value)}
                rows={10}
                placeholder="Paste the full job description here..."
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 font-mono text-sm"
              />

              {/* Length validation warnings */}
              {jdSnapshot.length > 50000 && jdSnapshot.length <= 100000 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Job description is large ({jdSnapshot.length.toLocaleString()} characters). Consider summarizing for better performance.
                </p>
              )}
              {jdSnapshot.length > 100000 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Job description exceeds maximum length ({jdSnapshot.length.toLocaleString()}/100,000 characters). Please reduce content before saving.
                </p>
              )}
            </div>
          </div>

          {/* Requirements Section */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Requirements
              </h3>
              <div className="flex items-center gap-2">
                {extractedRequirements?.updatedAt && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Updated {formatTimestamp(extractedRequirements.updatedAt)}
                  </span>
                )}
                {extractedRequirements?.source && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {extractedRequirements.source === "ai" ? "AI" : extractedRequirements.source === "manual" ? "Manual" : "Mixed"}
                  </span>
                )}
              </div>
            </div>

            {/* Requirements Save Status */}
            {requirementsSaveStatus === "saved" && (
              <div className="mb-4 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Requirements saved successfully!
                </p>
              </div>
            )}

            {requirementsSaveStatus === "error" && requirementsSaveError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">{requirementsSaveError}</p>
                <button
                  onClick={handleSaveRequirements}
                  className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline dark:text-red-400"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Extraction Error */}
            {extractionStatus === "error" && extractionError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">{extractionError}</p>
                <button
                  onClick={handleExtractRequirements}
                  className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline dark:text-red-400"
                >
                  Retry
                </button>
              </div>
            )}

            {/* No JD Snapshot Warning */}
            {!application.jdSnapshot?.trim() && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mb-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Job description required
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Paste a job description above and save to enable requirements extraction.
                </p>
              </div>
            )}

            {/* Extract Button */}
            {application.jdSnapshot?.trim() && !editingRequirements && (
              <div className="mb-4 flex gap-2">
                <Button
                  onClick={handleExtractRequirements}
                  disabled={extractionStatus === "extracting" || !application.jdSnapshot?.trim()}
                  variant="outline"
                  size="sm"
                >
                  {extractionStatus === "extracting" ? (
                    <>
                      <span className="mr-2 inline-block w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      Extracting...
                    </>
                  ) : extractedRequirements ? (
                    "Re-extract"
                  ) : (
                    "Extract requirements"
                  )}
                </Button>
                {extractedRequirements && (
                  <Button
                    onClick={handleStartEditingRequirements}
                    variant="outline"
                    size="sm"
                  >
                    Edit
                  </Button>
                )}
                {extractionStatus === "extracting" && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 self-center">
                    Analyzing job description...
                  </p>
                )}
              </div>
            )}

            {/* Editing Mode */}
            {editingRequirements && (
              <div className="space-y-4">
                {/* Editing toolbar */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={handleSaveRequirements}
                    disabled={requirementsSaveStatus === "saving"}
                    size="sm"
                  >
                    {requirementsSaveStatus === "saving" ? "Saving..." : "Save requirements"}
                  </Button>
                  <Button
                    onClick={handleCancelEditingRequirements}
                    variant="outline"
                    size="sm"
                    disabled={requirementsSaveStatus === "saving"}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Editable Responsibilities List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                      Responsibilities ({editedResponsibilities.length})
                    </h4>
                    <button
                      onClick={() => handleStartAddItem("responsibilities")}
                      disabled={newItemList !== null}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {editedResponsibilities.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 group"
                      >
                        {editingItemIndex?.list === "responsibilities" && editingItemIndex?.index === index ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={editingItemValue}
                              onChange={(e) => setEditingItemValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEditItem();
                                if (e.key === "Escape") handleCancelEditItem();
                              }}
                              className="flex-1 text-sm px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              autoFocus
                            />
                            <button onClick={handleSaveEditItem} className="text-xs text-green-600 dark:text-green-400">Save</button>
                            <button onClick={handleCancelEditItem} className="text-xs text-zinc-500">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span
                              onClick={() => handleStartEditItem("responsibilities", index, item)}
                              className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded -mx-2"
                            >
                              {item}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleMoveUp("responsibilities", index)}
                                disabled={index === 0}
                                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 px-1"
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveDown("responsibilities", index)}
                                disabled={index === editedResponsibilities.length - 1}
                                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 px-1"
                                title="Move down"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => handleDeleteItem("responsibilities", index)}
                                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 px-1"
                                title="Delete"
                              >
                                ×
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                    {/* Add new item input */}
                    {newItemList === "responsibilities" && (
                      <li className="flex gap-2">
                        <input
                          type="text"
                          value={newItemValue}
                          onChange={(e) => setNewItemValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNewItem();
                            if (e.key === "Escape") handleCancelNewItem();
                          }}
                          placeholder="New responsibility..."
                          className="flex-1 text-sm px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          autoFocus
                        />
                        <button onClick={handleSaveNewItem} className="text-xs text-green-600 dark:text-green-400">Add</button>
                        <button onClick={handleCancelNewItem} className="text-xs text-zinc-500">Cancel</button>
                      </li>
                    )}
                  </ul>
                  {editedResponsibilities.length === 0 && newItemList !== "responsibilities" && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">No responsibilities. Click &quot;+ Add&quot; to create one.</p>
                  )}
                </div>

                {/* Editable Requirements/Skills List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                      Requirements &amp; Skills ({editedRequirementsList.length})
                    </h4>
                    <button
                      onClick={() => handleStartAddItem("requirements")}
                      disabled={newItemList !== null}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {editedRequirementsList.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 group"
                      >
                        {editingItemIndex?.list === "requirements" && editingItemIndex?.index === index ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={editingItemValue}
                              onChange={(e) => setEditingItemValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEditItem();
                                if (e.key === "Escape") handleCancelEditItem();
                              }}
                              className="flex-1 text-sm px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              autoFocus
                            />
                            <button onClick={handleSaveEditItem} className="text-xs text-green-600 dark:text-green-400">Save</button>
                            <button onClick={handleCancelEditItem} className="text-xs text-zinc-500">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span
                              onClick={() => handleStartEditItem("requirements", index, item)}
                              className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded -mx-2"
                            >
                              {item}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleMoveUp("requirements", index)}
                                disabled={index === 0}
                                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 px-1"
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveDown("requirements", index)}
                                disabled={index === editedRequirementsList.length - 1}
                                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 px-1"
                                title="Move down"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => handleDeleteItem("requirements", index)}
                                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 px-1"
                                title="Delete"
                              >
                                ×
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                    {/* Add new item input */}
                    {newItemList === "requirements" && (
                      <li className="flex gap-2">
                        <input
                          type="text"
                          value={newItemValue}
                          onChange={(e) => setNewItemValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNewItem();
                            if (e.key === "Escape") handleCancelNewItem();
                          }}
                          placeholder="New requirement..."
                          className="flex-1 text-sm px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          autoFocus
                        />
                        <button onClick={handleSaveNewItem} className="text-xs text-green-600 dark:text-green-400">Add</button>
                        <button onClick={handleCancelNewItem} className="text-xs text-zinc-500">Cancel</button>
                      </li>
                    )}
                  </ul>
                  {editedRequirementsList.length === 0 && newItemList !== "requirements" && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">No requirements. Click &quot;+ Add&quot; to create one.</p>
                  )}
                </div>
              </div>
            )}

            {/* Focus Selection Mode - Low-Signal Prompt */}
            {!editingRequirements && extractedRequirements && showFocusSelection && (
              <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Select key responsibilities to focus on
                  </p>
                  {extractedRequirements.quality?.reasons?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {reasonsToMessages(extractedRequirements.quality.reasons).map((msg, i) => (
                        <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                          <span>•</span>
                          <span>{msg}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                    Select 3-8 responsibilities that matter most for this role to help with mapping and cover letter generation.
                  </p>
                </div>

                {/* Checkbox list */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {extractedRequirements.responsibilities?.map((item, index) => (
                    <label
                      key={index}
                      className="flex items-start gap-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 p-1.5 rounded -mx-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFocusItems.includes(item)}
                        onChange={() => handleToggleFocusItem(item)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{item}</span>
                    </label>
                  ))}
                </div>

                {/* Selection count and actions */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {selectedFocusItems.length} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSkipFocusSelection}
                      disabled={focusSaveStatus === "saving"}
                      className="text-xs px-3 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleSaveFocusSet}
                      disabled={selectedFocusItems.length === 0 || focusSaveStatus === "saving"}
                      className="text-xs px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {focusSaveStatus === "saving" ? "Saving..." : "Confirm focus set"}
                    </button>
                  </div>
                </div>

                {focusSaveStatus === "error" && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Failed to save. Please try again.
                  </p>
                )}
              </div>
            )}

            {/* Focus Set Display */}
            {!editingRequirements && extractedRequirements && !showFocusSelection && extractedRequirements.focusResponsibilities?.length > 0 && (
              <div className="mb-4 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                    Focus Set ({extractedRequirements.focusResponsibilities.length})
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditFocusSet}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleClearFocusSet}
                      disabled={focusSaveStatus === "saving"}
                      className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <ul className="space-y-1">
                  {extractedRequirements.focusResponsibilities.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300"
                    >
                      <span className="text-blue-400 dark:text-blue-500 mt-0.5">★</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Low-Signal Indicator (when prompt was dismissed) */}
            {!editingRequirements && extractedRequirements && !showFocusSelection &&
              extractedRequirements.quality?.isLowSignal &&
              !extractedRequirements.focusResponsibilities?.length &&
              extractedRequirements.focusDismissed && (
              <div className="mb-4">
                <button
                  onClick={() => setShowFocusSelection(true)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Select key responsibilities (low-signal JD detected)
                </button>
              </div>
            )}

            {/* Read-only Display Mode */}
            {!editingRequirements && extractedRequirements && !showFocusSelection && (
              <div className="space-y-4">
                {/* Responsibilities */}
                {extractedRequirements.responsibilities?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                      Responsibilities ({extractedRequirements.responsibilities.length})
                    </h4>
                    <ul className="space-y-1.5">
                      {extractedRequirements.responsibilities.map((item, index) => (
                        <li
                          key={index}
                          className={`flex items-start gap-2 text-sm ${
                            extractedRequirements.focusResponsibilities?.includes(item)
                              ? "text-blue-700 dark:text-blue-300 font-medium"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <span className={`mt-0.5 ${
                            extractedRequirements.focusResponsibilities?.includes(item)
                              ? "text-blue-400 dark:text-blue-500"
                              : "text-zinc-400 dark:text-zinc-500"
                          }`}>
                            {extractedRequirements.focusResponsibilities?.includes(item) ? "★" : "•"}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requirements/Skills */}
                {extractedRequirements.requirements?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                      Requirements &amp; Skills ({extractedRequirements.requirements.length})
                    </h4>
                    <ul className="space-y-1.5">
                      {extractedRequirements.requirements.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                        >
                          <span className="text-zinc-400 dark:text-zinc-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Empty state if extraction returned no items */}
                {extractedRequirements.responsibilities?.length === 0 &&
                  extractedRequirements.requirements?.length === 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No requirements extracted. Click &quot;Edit&quot; to add manually.
                    </p>
                  )}
              </div>
            )}

            {/* No extracted requirements yet */}
            {!extractedRequirements && application.jdSnapshot?.trim() && extractionStatus !== "extracting" && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Click &quot;Extract requirements&quot; to analyze the job description.
              </p>
            )}
          </div>

          {/* Interview Prep Section */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Interview Prep
              </h3>
              {interviewPrepPack?.generatedAt && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Generated {formatTimestamp(interviewPrepPack.generatedAt)}
                </span>
              )}
            </div>

            {/* Notes Save Status */}
            {interviewPrepNotesSaveStatus === "saved" && (
              <div className="mb-4 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Notes saved successfully!
                </p>
              </div>
            )}

            {interviewPrepNotesSaveStatus === "error" && (
              <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">
                  Failed to save notes. Please try again.
                </p>
              </div>
            )}

            {/* Generation Error */}
            {interviewPrepStatus === "error" && interviewPrepError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">{interviewPrepError}</p>
                <button
                  onClick={handleGenerateInterviewPrep}
                  className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline dark:text-red-400"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Prereq: Need extracted requirements */}
            {!extractedRequirements && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mb-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Requirements needed
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Extract requirements from the job description to enable interview prep generation.
                </p>
              </div>
            )}

            {/* Generate Button and Context Input */}
            {extractedRequirements && (
              <div className="mb-4">
                {/* Optional company context textarea (collapsed by default, expand on click) */}
                <details className="mb-3">
                  <summary className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                    Add company context (optional)
                  </summary>
                  <textarea
                    value={companyContextNotes}
                    onChange={(e) => setCompanyContextNotes(e.target.value)}
                    rows={3}
                    placeholder="Add notes about the company culture, recent news, or specific topics you want to prepare for..."
                    className="mt-2 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 text-sm"
                    maxLength={10000}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {companyContextNotes.length.toLocaleString()}/10,000 characters
                  </p>
                </details>

                <Button
                  onClick={handleGenerateInterviewPrep}
                  disabled={interviewPrepStatus === "generating"}
                  variant="outline"
                  size="sm"
                >
                  {interviewPrepStatus === "generating" ? (
                    <>
                      <span className="mr-2 inline-block w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : interviewPrepPack ? (
                    "Regenerate prep pack"
                  ) : (
                    "Generate interview prep"
                  )}
                </Button>
                {interviewPrepStatus === "generating" && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                    Creating personalized interview questions and talking points...
                  </p>
                )}
              </div>
            )}

            {/* Generated Pack Display */}
            {interviewPrepPack && (
              <div className="space-y-4">
                {/* Questions */}
                {interviewPrepPack.questions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wide">
                      Practice Questions ({interviewPrepPack.questions.length})
                    </h4>
                    <div className="space-y-4">
                      {interviewPrepPack.questions.map((q, index) => (
                        <div
                          key={index}
                          className="rounded-md border border-zinc-200 dark:border-zinc-700 p-3"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {q.question}
                            </p>
                            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              {q.category}
                            </span>
                          </div>
                          {q.talkingPoints?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Talking points:</p>
                              <ul className="space-y-1">
                                {q.talkingPoints.map((point, pIndex) => (
                                  <li
                                    key={pIndex}
                                    className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                                  >
                                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {q.exampleAnswer && (
                            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="font-medium">Example framework:</span> {q.exampleAnswer}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Themes */}
                {interviewPrepPack.keyThemes?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                      Key Themes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {interviewPrepPack.keyThemes.map((theme, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Company Research Tips */}
                {interviewPrepPack.companyResearchTips?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                      Company Research Tips
                    </h4>
                    <ul className="space-y-1">
                      {interviewPrepPack.companyResearchTips.map((tip, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                        >
                          <span className="text-zinc-400 dark:text-zinc-500 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Questions to Ask */}
                {interviewPrepPack.questionsToAsk?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                      Questions to Ask
                    </h4>
                    <ul className="space-y-1">
                      {interviewPrepPack.questionsToAsk.map((question, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                        >
                          <span className="text-zinc-400 dark:text-zinc-500 mt-0.5">•</span>
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Interview Prep Notes */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                  Your Notes
                </label>
                {interviewPrepNotes.trim() !== (application.interviewPrepNotes || "").trim() && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
                )}
              </div>
              <textarea
                value={interviewPrepNotes}
                onChange={(e) => setInterviewPrepNotes(e.target.value)}
                rows={4}
                placeholder="Add your own notes, practice answers, or reminders for the interview..."
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 text-sm"
                maxLength={50000}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {interviewPrepNotes.length.toLocaleString()}/50,000 characters
                </p>
                <Button
                  onClick={handleSaveInterviewPrepNotes}
                  disabled={
                    interviewPrepNotesSaveStatus === "saving" ||
                    interviewPrepNotes.trim() === (application.interviewPrepNotes || "").trim()
                  }
                  variant="outline"
                  size="sm"
                >
                  {interviewPrepNotesSaveStatus === "saving" ? "Saving..." : "Save notes"}
                </Button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Timeline
            </h3>

            {timelineLoading && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading timeline...
              </p>
            )}

            {timelineError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {timelineError}
              </p>
            )}

            {!timelineLoading && !timelineError && timeline.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No changes recorded yet.
              </p>
            )}

            {!timelineLoading && !timelineError && timeline.length > 0 && (
              <div className="space-y-3">
                {timeline.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {formatEvent(event)}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                        {formatTimestamp(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 px-6 py-4">
        <Button onClick={handleSave} disabled={status === "saving"} className="w-full">
          {status === "saving" ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
