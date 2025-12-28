"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

/**
 * MappingWorkbench component
 * Allows users to review, edit, and confirm requirement → bullet mapping
 * @param {string} applicationId - Application ID to work with
 * @param {Object} application - Full application object (optional, for initial load)
 */
export function MappingWorkbench({ applicationId, application: initialApplication, onUpdate }) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [proposal, setProposal] = useState(null);
  const [availableBullets, setAvailableBullets] = useState([]);
  const [mappingState, setMappingState] = useState([]); // Working state for edits
  const [status, setStatus] = useState("idle"); // idle | loading | saving | saved | error
  const [bulletsStatus, setBulletsStatus] = useState("idle"); // idle | loading | loaded | error
  const [error, setError] = useState(null);
  const [errorContext, setErrorContext] = useState(null); // loadApplication | loadBullets | loadProposal | saveMapping
  const didAutoLoadProposal = useRef(false);

  useEffect(() => {
    didAutoLoadProposal.current = false;
    setApplication(initialApplication || null);
    setProposal(null);
    setAvailableBullets([]);
    setMappingState([]);
    setStatus("idle");
    setBulletsStatus("idle");
    setError(null);
    setErrorContext(null);
  }, [applicationId, initialApplication]);

  // Load application if not provided
  useEffect(() => {
    if (!initialApplication && applicationId) {
      loadApplication();
    }
  }, [applicationId, initialApplication]);

  useEffect(() => {
    if (applicationId) {
      loadBullets();
    }
  }, [applicationId]);

  // Initialize mapping state when application or proposal loads
  useEffect(() => {
    if (application) {
      initializeMappingState();
    }
  }, [application, proposal]);

  useEffect(() => {
    const hasRequirements =
      application?.extractedRequirements &&
      (application.extractedRequirements.responsibilities?.length > 0 ||
        application.extractedRequirements.requirements?.length > 0);

    const hasBullets = bulletsStatus === "loaded" && availableBullets.length > 0;

    if (!applicationId || !application || !hasRequirements || !hasBullets) return;
    if (proposal) return;
    if (didAutoLoadProposal.current) return;

    didAutoLoadProposal.current = true;
    loadProposal();
  }, [applicationId, application, bulletsStatus, availableBullets.length, proposal]);

  async function loadApplication() {
    try {
      setErrorContext("loadApplication");
      setStatus("loading");
      const response = await fetch(`/api/applications/${applicationId}`);

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();
      if (result.error) {
        setError("Failed to load application.");
        setStatus("error");
        return;
      }

      setApplication(result.data);
      setStatus("idle");
    } catch (err) {
      console.error("Failed to load application:", err);
      setError("Failed to load application.");
      setStatus("error");
    }
  }

  async function loadBullets() {
    try {
      setErrorContext("loadBullets");
      if (status !== "saving") {
        setStatus("loading");
      }
      setError(null);
      setBulletsStatus("loading");

      const bulletsResponse = await fetch("/api/project-bullets");
      if (bulletsResponse.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const bulletsResult = await bulletsResponse.json();
      if (bulletsResult.error) {
        setAvailableBullets([]);
        setBulletsStatus("error");
        setError("Failed to load bullets.");
        setStatus("error");
        return;
      }

      setAvailableBullets(bulletsResult.data || []);
      setBulletsStatus("loaded");
      if (status !== "saving") {
        setStatus("idle");
      }
    } catch (err) {
      console.error("Failed to load bullets:", err);
      setAvailableBullets([]);
      setBulletsStatus("error");
      setError("Failed to load bullets.");
      setStatus("error");
    }
  }

  async function loadProposal() {
    try {
      setErrorContext("loadProposal");
      setStatus("loading");
      setError(null);

      const propResponse = await fetch("/api/mapping/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      if (propResponse.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const propResult = await propResponse.json();
      if (propResult.error) {
        setError(propResult.error.message || `Error: ${propResult.error.code}`);
        setStatus("error");
        return;
      }

      setProposal(propResult.data.proposal);
      setStatus("idle");
    } catch (err) {
      console.error("Failed to load proposal:", err);
      setError("Failed to load mapping proposal.");
      setStatus("error");
    }
  }

  function initializeMappingState() {
    if (!application) return;
    if (mappingState.length > 0) return;

    // If confirmed mapping exists, use it
    if (application.confirmedMapping && application.confirmedMapping.items) {
      setMappingState(application.confirmedMapping.items);
      return;
    }

    // Otherwise, initialize from proposal or extracted requirements
    if (proposal && proposal.length > 0) {
      const initialState = proposal.map((item) => ({
        itemKey: item.itemKey,
        kind: item.kind,
        text: item.text,
        bulletIds: item.suggestedBulletIds || [],
        uncovered: item.suggestedBulletIds.length === 0, // Auto-mark as uncovered if no suggestions
      }));
      setMappingState(initialState);
    } else if (application.extractedRequirements) {
      // Fallback: create from extracted requirements without proposal
      const items = [];
      const reqs = application.extractedRequirements;

      if (reqs.responsibilities && Array.isArray(reqs.responsibilities)) {
        reqs.responsibilities.forEach((text, index) => {
          items.push({
            itemKey: `responsibility-${index}`,
            kind: "responsibility",
            text,
            bulletIds: [],
            uncovered: true, // No suggestions available
          });
        });
      }

      if (reqs.requirements && Array.isArray(reqs.requirements)) {
        reqs.requirements.forEach((text, index) => {
          items.push({
            itemKey: `requirement-${index}`,
            kind: "requirement",
            text,
            bulletIds: [],
            uncovered: true,
          });
        });
      }

      setMappingState(items);
    }
  }

  function handleToggleUncovered(itemKey) {
    setMappingState((prev) =>
      prev.map((item) => (item.itemKey === itemKey ? { ...item, uncovered: !item.uncovered } : item))
    );
  }

  function handleAddBullet(itemKey, bulletId) {
    setMappingState((prev) =>
      prev.map((item) =>
        item.itemKey === itemKey
          ? {
              ...item,
              bulletIds: item.bulletIds.includes(bulletId) ? item.bulletIds : [...item.bulletIds, bulletId],
              uncovered: false, // Clear uncovered when adding a bullet
            }
          : item
      )
    );
  }

  function handleRemoveBullet(itemKey, bulletId) {
    setMappingState((prev) =>
      prev.map((item) =>
        item.itemKey === itemKey
          ? { ...item, bulletIds: item.bulletIds.filter((id) => id !== bulletId) }
          : item
      )
    );
  }

  async function handleConfirmMapping() {
    try {
      setErrorContext("saveMapping");
      setStatus("saving");
      setError(null);

      // Build confirmed mapping payload
      const confirmedMapping = {
        version: 1,
        confirmedAt: new Date().toISOString(),
        items: mappingState,
      };

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedMapping }),
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();
      if (result.error) {
        setError(result.error.message || "Failed to save mapping.");
        setStatus("error");
        return;
      }

      setApplication(result.data);
      onUpdate?.(result.data);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to confirm mapping:", err);
      setError("Failed to save mapping. Please try again.");
      setStatus("error");
    }
  }

  function handleRetry() {
    if (errorContext === "loadApplication") {
      loadApplication();
      return;
    }
    if (errorContext === "loadBullets") {
      loadBullets();
      return;
    }
    if (errorContext === "loadProposal") {
      loadProposal();
      return;
    }
    handleConfirmMapping();
  }

  // Check for blocking conditions
  const hasRequirements =
    application?.extractedRequirements &&
    (application.extractedRequirements.responsibilities?.length > 0 ||
      application.extractedRequirements.requirements?.length > 0);

  const bulletsMissing = bulletsStatus === "loaded" && availableBullets.length === 0;

  if (!application && status === "loading") {
    return <p className="text-muted-foreground">Loading application...</p>;
  }

  if (!hasRequirements) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mapping Workbench</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive mb-4">
              This application has no extracted requirements. Please extract requirements first before mapping.
            </p>
            <Button onClick={() => router.push("/")}>Go to Applications</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bulletsMissing) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mapping Workbench</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive mb-4">
              You have no project bullets yet. Create bullets first, then return to confirm your mapping.
            </p>
            <Button onClick={() => router.push("/bullets")}>Create Bullets</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mappingState.length === 0 && status === "idle") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mapping Workbench</h2>
        <Card>
          <CardContent className="p-6">
            <p className="mb-4">No mapping proposal loaded. Generate a proposal to get started.</p>
            <Button onClick={loadProposal} disabled={status === "loading"}>
              {status === "loading" ? "Loading..." : "Generate Proposal"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mapping Workbench</h2>
        <div className="flex gap-2">
          <Button onClick={loadProposal} variant="outline" size="sm" disabled={status === "loading" || status === "saving"}>
            {status === "loading" && errorContext === "loadProposal" ? "Loading..." : "Load Proposal"}
          </Button>
          <Button onClick={handleConfirmMapping} disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Confirm Mapping"}
          </Button>
        </div>
      </div>

      {status === "error" && (
        <div className="space-y-2">
          <p className="text-destructive">{error}</p>
          <Button onClick={handleRetry} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}

      {status === "saved" && <p className="text-green-600 dark:text-green-400">Mapping saved successfully!</p>}

      <div className="space-y-4">
        {mappingState.map((item, index) => (
          <MappingItem
            key={item.itemKey}
            item={item}
            index={index}
            proposal={proposal}
            availableBullets={availableBullets}
            onToggleUncovered={handleToggleUncovered}
            onAddBullet={handleAddBullet}
            onRemoveBullet={handleRemoveBullet}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * MappingItem component
 * Displays a single requirement/responsibility with mapping controls
 */
function MappingItem({ item, index, proposal, availableBullets, onToggleUncovered, onAddBullet, onRemoveBullet }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Find suggestions from proposal
  const proposalItem =
    proposal?.find((p) => p.itemKey === item.itemKey) ||
    proposal?.find((p) => p.kind === item.kind && p.text === item.text);
  const suggestedBulletIds = proposalItem?.suggestedBulletIds || [];
  const unselectedSuggestions = suggestedBulletIds.filter((id) => !item.bulletIds.includes(id));

  // Get bullet details
  function getBulletDetails(bulletId) {
    return availableBullets.find((b) => b.id === bulletId);
  }

  return (
    <Card className={item.uncovered ? "border-yellow-500 dark:border-yellow-600" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-start justify-between">
          <div className="flex-1">
            <span className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground mr-2">
              {item.kind === "responsibility" ? "Responsibility" : "Requirement"} #{index + 1}
            </span>
            <span className="text-base">{item.text}</span>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <input
              type="checkbox"
              id={`uncovered-${item.itemKey}`}
              checked={item.uncovered}
              onChange={() => onToggleUncovered(item.itemKey)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label
              htmlFor={`uncovered-${item.itemKey}`}
              className="text-sm font-normal cursor-pointer whitespace-nowrap"
            >
              Mark as Uncovered
            </Label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.uncovered && (
          <div className="p-2 rounded bg-yellow-100 dark:bg-yellow-900/30 text-sm">
            ⚠️ This item is marked as uncovered (no suitable evidence). You can add bullets or leave it uncovered for now.
          </div>
        )}

        {/* Selected Bullets */}
        {item.bulletIds.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Bullets ({item.bulletIds.length}):</p>
            {item.bulletIds.map((bulletId) => {
              const bullet = getBulletDetails(bulletId);
              return (
                <div key={bulletId} className="flex items-start justify-between p-2 rounded bg-muted text-sm">
                  <div className="flex-1">
                    {bullet ? (
                      <>
                        {bullet.title && <p className="font-medium">{bullet.title}</p>}
                        <p className="text-muted-foreground">{bullet.text}</p>
                        {bullet.tags && bullet.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {bullet.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-1 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Bullet ID: {bulletId}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => onRemoveBullet(item.itemKey, bulletId)}
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Suggestions */}
        {unselectedSuggestions.length > 0 && (
          <div className="space-y-2">
            <Button onClick={() => setShowSuggestions(!showSuggestions)} variant="outline" size="sm">
              {showSuggestions ? "Hide" : "Show"} Suggested Bullets ({unselectedSuggestions.length})
            </Button>
            {showSuggestions &&
              unselectedSuggestions.map((bulletId) => {
                const bullet = getBulletDetails(bulletId);
                const score = proposalItem?.scoreByBulletId[bulletId];
                return (
                  <div key={bulletId} className="flex items-start justify-between p-2 rounded bg-muted/50 text-sm">
                    <div className="flex-1">
                      {bullet ? (
                        <>
                          {bullet.title && <p className="font-medium">{bullet.title}</p>}
                          <p className="text-muted-foreground">{bullet.text}</p>
                          {score && <p className="text-xs text-muted-foreground mt-1">Match score: {score}</p>}
                        </>
                      ) : (
                        <p className="text-muted-foreground italic">Bullet ID: {bulletId}</p>
                      )}
                    </div>
                    <Button onClick={() => onAddBullet(item.itemKey, bulletId)} size="sm" className="ml-2">
                      Add
                    </Button>
                  </div>
                );
              })}
          </div>
        )}

        {/* No suggestions and no selections */}
        {item.bulletIds.length === 0 && unselectedSuggestions.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No suggested bullets. You can manually search and add bullets, or mark this as uncovered.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
