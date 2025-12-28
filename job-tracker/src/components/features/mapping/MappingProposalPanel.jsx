"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [bulletsById, setBulletsById] = useState(null);
  const [prereqStatus, setPrereqStatus] = useState("idle"); // idle | loading | ready | blocked | error
  const [prereqMessage, setPrereqMessage] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState(null);

  const canPropose = useMemo(() => {
    return prereqStatus === "ready" && Boolean(applicationId);
  }, [prereqStatus, applicationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPrereqs() {
      if (!applicationId) {
        setPrereqStatus("idle");
        setPrereqMessage(null);
        setBulletsById(null);
        return;
      }

      try {
        setPrereqStatus("loading");
        setPrereqMessage(null);

        const [appRes, bulletsRes] = await Promise.all([
          fetch(`/api/applications/${applicationId}`),
          fetch("/api/project-bullets"),
        ]);

        if (cancelled) return;

        if (appRes.status === 401 || bulletsRes.status === 401) {
          router.replace("/sign-in");
          return;
        }

        const [appJson, bulletsJson] = await Promise.all([appRes.json(), bulletsRes.json()]);

        if (cancelled) return;

        if (appJson?.error) {
          setPrereqStatus("error");
          setPrereqMessage(appJson.error.code === "NOT_FOUND" ? "Application not found." : "Failed to load application.");
          return;
        }

        if (bulletsJson?.error) {
          setPrereqStatus("error");
          setPrereqMessage("Failed to load bullets.");
          return;
        }

        const extractedRequirements = appJson?.data?.extractedRequirements;
        const hasRequirements =
          extractedRequirements &&
          typeof extractedRequirements === "object" &&
          (Array.isArray(extractedRequirements.responsibilities) ||
            Array.isArray(extractedRequirements.requirements)) &&
          ((extractedRequirements.responsibilities?.length || 0) > 0 ||
            (extractedRequirements.requirements?.length || 0) > 0);

        const bullets = bulletsJson?.data || [];
        const hasBullets = Array.isArray(bullets) && bullets.length > 0;

        if (!hasRequirements || !hasBullets) {
          setPrereqStatus("blocked");
          if (!hasRequirements && !hasBullets) {
            setPrereqMessage("Requirements and bullets are required before proposing a mapping.");
          } else if (!hasRequirements) {
            setPrereqMessage("Extract requirements first before proposing a mapping.");
          } else {
            setPrereqMessage("Create at least one bullet before proposing a mapping.");
          }
          setBulletsById(null);
          return;
        }

        const map = {};
        for (const bullet of bullets) {
          if (bullet?.id) {
            map[bullet.id] = bullet;
          }
        }

        setBulletsById(map);
        setPrereqStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load mapping prerequisites:", err);
        setPrereqStatus("error");
        setPrereqMessage("Failed to load prerequisites.");
      }
    }

    loadPrereqs();
    return () => {
      cancelled = true;
    };
  }, [applicationId, router]);

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
    router.push(`/mapping?applicationId=${encodeURIComponent(applicationId)}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mapping Proposal</h2>
        {!proposal && (
          <Button
            onClick={handleProposeMapping}
            disabled={status === "loading" || !canPropose}
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

      {applicationId && prereqStatus === "loading" && (
        <p className="text-muted-foreground">Checking prerequisites…</p>
      )}

      {applicationId && prereqMessage && (
        <p className={prereqStatus === "error" ? "text-destructive" : "text-muted-foreground"}>
          {prereqMessage}
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
              {proposal.length} item{proposal.length !== 1 ? "s" : ""} mapped
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
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium">
                                {bulletsById?.[bulletId]?.title || "Bullet"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {bulletId}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Score: {item.scoreByBulletId[bulletId]}
                              </span>
                            </div>
                            {bulletsById?.[bulletId]?.text && (
                              <p className="text-muted-foreground mt-1">
                                {bulletsById[bulletId].text}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
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
