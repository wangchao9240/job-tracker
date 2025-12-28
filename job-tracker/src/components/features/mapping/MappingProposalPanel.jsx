"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * MappingProposalPanel component
 * Generates and displays rule-based mapping proposal from requirements to bullets
 * @param {string} applicationId - Application ID to generate mapping for
 */
export function MappingProposalPanel({ applicationId }) {
  const router = useRouter();
  const [proposal, setProposal] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState(null);

  async function handleProposeMapping() {
    try {
      setStatus("loading");
      setError(null);

      const response = await fetch("/api/mapping/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        // Keep previous proposal visible on error
        setError(result.error.message || `Error: ${result.error.code}`);
        setStatus("error");
        return;
      }

      setProposal(result.data.proposal);
      setStatus("success");
    } catch (err) {
      console.error("Failed to propose mapping:", err);
      // Keep previous proposal visible on error
      setError("Failed to generate mapping proposal. Please try again.");
      setStatus("error");
    }
  }

  function handleRetry() {
    handleProposeMapping();
  }

  function handleProceedToAdjust() {
    // Story 5.5 will implement full mapping workbench
    // For now, this is just a navigation stub
    alert("Mapping workbench will be available in Story 5.5");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mapping Proposal</h2>
        {!proposal && (
          <Button
            onClick={handleProposeMapping}
            disabled={status === "loading" || !applicationId}
          >
            {status === "loading" ? "Generating..." : "Propose Mapping"}
          </Button>
        )}
      </div>

      {!applicationId && (
        <p className="text-muted-foreground">
          No application selected. Please select an application to generate mapping proposal.
        </p>
      )}

      {status === "loading" && <p className="text-muted-foreground">Generating mapping proposal...</p>}

      {status === "error" && (
        <div className="space-y-2">
          <p className="text-destructive">{error}</p>
          <div className="flex gap-2">
            <Button onClick={handleRetry} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </div>
      )}

      {proposal && proposal.length === 0 && (
        <p className="text-muted-foreground">
          No requirements found for this application. Please extract requirements first.
        </p>
      )}

      {proposal && proposal.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {proposal.length} requirement{proposal.length !== 1 ? "s" : ""} mapped
            </p>
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline" size="sm">
                Regenerate
              </Button>
              <Button onClick={handleProceedToAdjust} size="sm">
                Proceed to Adjust
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {proposal.map((item) => (
              <Card key={item.itemKey}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <span className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground mr-2">
                      {item.kind === "responsibility" ? "Responsibility" : "Requirement"}
                    </span>
                    {item.text}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {item.suggestedBulletIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No strong matches found. You can manually add bullets in the workbench.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Suggested Bullets ({item.suggestedBulletIds.length}):
                      </p>
                      {item.suggestedBulletIds.map((bulletId) => (
                        <div
                          key={bulletId}
                          className="p-2 rounded bg-muted text-sm flex items-start justify-between"
                        >
                          <span className="flex-1">
                            Bullet ID: {bulletId}
                            <span className="text-xs text-muted-foreground ml-2">
                              (Score: {item.scoreByBulletId[bulletId]})
                            </span>
                          </span>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        💡 Tip: Scores are based on keyword overlap and tag matches. Higher scores indicate better matches.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
