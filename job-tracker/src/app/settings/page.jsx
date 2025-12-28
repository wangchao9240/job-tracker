"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Role level options
const ROLE_LEVEL_OPTIONS = [
  "Graduate",
  "Junior",
  "Entry-level",
  "Intern",
  "Mid",
];

// Location options
const LOCATION_OPTIONS = [
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Perth",
  "Adelaide",
  "Canberra",
  "Remote",
];

// Visa filter options
const VISA_FILTER_OPTIONS = [
  { value: "no_pr_required", label: "No PR/Citizenship Required" },
  { value: "any", label: "Any (including PR/Citizenship required)" },
];

// Role focus options
const ROLE_FOCUS_OPTIONS = [
  { value: "software", label: "Software Engineering" },
  { value: "frontend", label: "Frontend Development" },
  { value: "backend", label: "Backend Development" },
  { value: "fullstack", label: "Full Stack Development" },
  { value: "data", label: "Data Engineering" },
  { value: "devops", label: "DevOps / SRE" },
];

// Tone options for generation preferences
const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "formal", label: "Formal" },
];

// Emphasis options for generation preferences
const EMPHASIS_OPTIONS = [
  { value: "achievements", label: "Achievements" },
  { value: "technical_depth", label: "Technical Depth" },
  { value: "soft_skills", label: "Soft Skills" },
  { value: "leadership", label: "Leadership" },
  { value: "collaboration", label: "Collaboration" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading | idle | saving | saved | error
  const [error, setError] = useState(null);
  const [generationStatus, setGenerationStatus] = useState("loading"); // loading | idle | unavailable | error
  const [generationError, setGenerationError] = useState(null);

  // High-Fit form state
  const [roleLevels, setRoleLevels] = useState([]);
  const [preferredLocations, setPreferredLocations] = useState([]);
  const [visaFilter, setVisaFilter] = useState("no_pr_required");
  const [roleFocus, setRoleFocus] = useState("software");
  const [keywordsInclude, setKeywordsInclude] = useState("");
  const [keywordsExclude, setKeywordsExclude] = useState("");

  // Generation form state
  const [tone, setTone] = useState("professional");
  const [emphasis, setEmphasis] = useState([]);
  const [genKeywordsInclude, setGenKeywordsInclude] = useState("");
  const [genKeywordsAvoid, setGenKeywordsAvoid] = useState("");

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const highFitResponse = await fetch("/api/preferences/high-fit", {
          cache: "no-store",
        });

        if (highFitResponse.status === 401) {
          router.replace("/sign-in");
          return;
        }

        const highFitResult = await highFitResponse.json();

        if (highFitResult.error) {
          setError("Failed to load high-fit preferences.");
          setStatus("error");
          return;
        }

        const highFitPrefs = highFitResult.data;
        setRoleLevels(highFitPrefs.roleLevels || []);
        setPreferredLocations(highFitPrefs.preferredLocations || []);
        setVisaFilter(highFitPrefs.visaFilter || "no_pr_required");
        setRoleFocus(highFitPrefs.roleFocus || "software");
        setKeywordsInclude((highFitPrefs.keywordsInclude || []).join(", "));
        setKeywordsExclude((highFitPrefs.keywordsExclude || []).join(", "));

        // Generation preferences are optional (handled best-effort so High-Fit can work independently)
        try {
          const generationResponse = await fetch("/api/preferences/generation", {
            cache: "no-store",
          });

          if (generationResponse.status === 401) {
            router.replace("/sign-in");
            return;
          }

          if (!generationResponse.ok) {
            setGenerationStatus("unavailable");
          } else {
            const generationResult = await generationResponse.json();
            if (generationResult.error) {
              setGenerationStatus("error");
              setGenerationError("Failed to load generation preferences.");
            } else {
              const genPrefs = generationResult.data;
              setTone(genPrefs.tone || "professional");
              setEmphasis(genPrefs.emphasis || []);
              setGenKeywordsInclude((genPrefs.keywordsInclude || []).join(", "));
              setGenKeywordsAvoid((genPrefs.keywordsAvoid || []).join(", "));
              setGenerationStatus("idle");
            }
          }
        } catch {
          setGenerationStatus("unavailable");
        }

        setStatus("idle");
      } catch (err) {
        console.error("Failed to fetch preferences:", err);
        setError("Failed to load high-fit preferences.");
        setStatus("error");
      }
    }

    fetchPreferences();
  }, [router]);

  const handleCheckboxChange = (value, currentValues, setter) => {
    if (currentValues.includes(value)) {
      setter(currentValues.filter((v) => v !== value));
    } else {
      setter([...currentValues, value]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    setGenerationError(null);

    try {
      const highFitResponse = await fetch("/api/preferences/high-fit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleLevels,
          preferredLocations,
          visaFilter,
          roleFocus,
          keywordsInclude: keywordsInclude
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          keywordsExclude: keywordsExclude
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });

      if (highFitResponse.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const highFitResult = await highFitResponse.json();

      if (highFitResult.error) {
        setError("Failed to save high-fit preferences. Please try again.");
        setStatus("error");
        return;
      }

      // Generation preferences save is best-effort and must not block high-fit (Story 1.4)
      if (generationStatus === "idle") {
        try {
          const generationResponse = await fetch("/api/preferences/generation", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tone,
              emphasis,
              keywordsInclude: genKeywordsInclude
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
              keywordsAvoid: genKeywordsAvoid
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
            }),
          });

          if (generationResponse.status === 401) {
            router.replace("/sign-in");
            return;
          }

          const generationResult = await generationResponse.json();
          if (!generationResponse.ok || generationResult.error) {
            setGenerationError(
              "High-fit preferences saved, but generation preferences could not be saved."
            );
          }
        } catch {
          setGenerationError(
            "High-fit preferences saved, but generation preferences could not be saved."
          );
        }
      }

      setStatus("saved");
      // Reset to idle after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("Failed to save preferences:", err);
      setError("Failed to save high-fit preferences. Please try again.");
      setStatus("error");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900 my-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Settings
          </h1>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Home
          </Button>
        </div>

        {status === "saved" && (
          <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Preferences saved successfully!
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">
              {error} Click &quot;Save All Preferences&quot; below to retry.
            </p>
          </div>
        )}

        {generationError && (
          <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {generationError} Click &quot;Save All Preferences&quot; below to retry.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* High-Fit Preferences Section */}
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                High-Fit Preferences
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Configure your job search preferences to help identify high-fit opportunities.
              </p>
            </div>

            {/* Role Levels */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Target Role Levels
              </label>
              <div className="flex flex-wrap gap-3">
                {ROLE_LEVEL_OPTIONS.map((level) => (
                  <label key={level} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={roleLevels.includes(level)}
                      onChange={() =>
                        handleCheckboxChange(level, roleLevels, setRoleLevels)
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {level}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preferred Locations */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Preferred Locations
              </label>
              <div className="flex flex-wrap gap-3">
                {LOCATION_OPTIONS.map((location) => (
                  <label key={location} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={preferredLocations.includes(location)}
                      onChange={() =>
                        handleCheckboxChange(
                          location,
                          preferredLocations,
                          setPreferredLocations
                        )
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {location}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Visa Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Visa Requirement Filter
              </label>
              <select
                value={visaFilter}
                onChange={(e) => setVisaFilter(e.target.value)}
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {VISA_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Focus */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Role Focus
              </label>
              <select
                value={roleFocus}
                onChange={(e) => setRoleFocus(e.target.value)}
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {ROLE_FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Keywords Include */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Keywords to Include (comma-separated)
              </label>
              <input
                type="text"
                value={keywordsInclude}
                onChange={(e) => setKeywordsInclude(e.target.value)}
                placeholder="e.g., React, TypeScript, Node.js"
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* Keywords Exclude */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Keywords to Exclude (comma-separated)
              </label>
              <input
                type="text"
                value={keywordsExclude}
                onChange={(e) => setKeywordsExclude(e.target.value)}
                placeholder="e.g., Senior, Lead, Manager"
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </section>

          {/* Divider */}
          <hr className="border-zinc-200 dark:border-zinc-700" />

          {/* Generation Preferences Section */}
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Generation Preferences
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Configure how cover letters and other generated content should be styled.
              </p>
            </div>

            {generationStatus === "unavailable" && (
              <div className="rounded-md bg-zinc-100 p-4 dark:bg-zinc-800">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Generation preferences are not available yet.
                </p>
              </div>
            )}

            {generationStatus === "error" && (
              <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Failed to load generation preferences.
                </p>
              </div>
            )}

            {/* Tone */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={generationStatus !== "idle"}
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {TONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Emphasis */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Emphasis Areas
              </label>
              <div className="flex flex-wrap gap-3">
                {EMPHASIS_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={emphasis.includes(option.value)}
                      onChange={() =>
                        handleCheckboxChange(option.value, emphasis, setEmphasis)
                      }
                      disabled={generationStatus !== "idle"}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Keywords to Include */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Keywords to Include (comma-separated)
              </label>
              <input
                type="text"
                value={genKeywordsInclude}
                onChange={(e) => setGenKeywordsInclude(e.target.value)}
                placeholder="e.g., innovation, problem-solving, teamwork"
                disabled={generationStatus !== "idle"}
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* Keywords to Avoid */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Keywords to Avoid (comma-separated)
              </label>
              <input
                type="text"
                value={genKeywordsAvoid}
                onChange={(e) => setGenKeywordsAvoid(e.target.value)}
                placeholder="e.g., synergy, leverage, passionate"
                disabled={generationStatus !== "idle"}
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </section>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={status === "saving"}
            className="w-full"
          >
            {status === "saving" ? "Saving..." : "Save All Preferences"}
          </Button>
        </form>
      </main>
    </div>
  );
}
