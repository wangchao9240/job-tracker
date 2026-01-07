/**
 * Mapping page - Mapping workbench for reviewing and confirming requirement → bullet mappings
 * This page demonstrates the full mapping workbench functionality (Story 5.5)
 */

"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MappingWorkbench } from "@/components/features/mapping/MappingWorkbench";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function MappingPageContent() {
  const searchParams = useSearchParams();
  const initialApplicationId = searchParams.get("applicationId") || "";

  const [applicationId, setApplicationId] = useState(() => initialApplicationId);
  const [selectedId, setSelectedId] = useState(() => (initialApplicationId ? initialApplicationId : null));

  const effectiveApplicationId = (applicationId || initialApplicationId).trim();

  return (
    <>
      <div className="mb-6 p-4 rounded bg-muted">
        <p className="text-sm text-muted-foreground mb-4">
          💡 <strong>Demo Note:</strong> This page demonstrates the full mapping workbench functionality (Story 5.5).
        </p>
        <div className="space-y-2">
          <Label htmlFor="app-id">Enter Application ID to start mapping:</Label>
          <div className="flex gap-2">
            <Input
              id="app-id"
              type="text"
              placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
              value={applicationId || initialApplicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => setSelectedId(effectiveApplicationId)} disabled={!effectiveApplicationId}>
              Load Workbench
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Requirements:
        </p>
        <ul className="text-xs text-muted-foreground list-disc list-inside">
          <li>Application must have extracted requirements (Epic 4)</li>
          <li>You should have some project bullets created (Story 5.2)</li>
        </ul>
      </div>

      {selectedId && <MappingWorkbench applicationId={selectedId} />}

      {!selectedId && (
        <div className="text-center text-muted-foreground py-12">
          <p>Enter an application ID above to start mapping.</p>
        </div>
      )}
    </>
  );
}

export default function MappingPage() {
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Mapping Workbench</h1>
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <MappingPageContent />
      </Suspense>
    </div>
  );
}
