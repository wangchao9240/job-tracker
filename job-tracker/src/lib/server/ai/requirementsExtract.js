/**
 * Requirements Extraction via AI
 * Server-only module for extracting responsibilities and requirements from JD text.
 * DO NOT import this file in Client Components.
 */

// Maximum input length to prevent excessive token usage (approx 50k chars ~ 12k tokens)
const MAX_INPUT_LENGTH = 50000;

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 60000;

// Default model to use
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function buildChatCompletionsUrl(baseUrl) {
  const trimmed = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  // If user provides a full endpoint, use it as-is.
  if (trimmed.endsWith("/chat/completions")) return trimmed;

  // Accept base URLs with or without a trailing /v1 (or /openai/v1).
  return `${trimmed}${trimmed.endsWith("/v1") ? "" : "/v1"}/chat/completions`;
}

function parseFallbackModels(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * Extract responsibilities and requirements from job description text
 * @param {string} jdText - The job description text
 * @returns {Promise<{ responsibilities: string[], requirements: string[] }>}
 * @throws {Error} With code property for specific error types
 */
export async function extractRequirements(jdText) {
  // Validate input
  if (!jdText || typeof jdText !== "string") {
    const error = new Error("JD text is required");
    error.code = "INVALID_INPUT";
    throw error;
  }

  // Check environment configuration
  const baseUrl = process.env.JOB_OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const apiKey = process.env.JOB_OPENAI_API_KEY;
  const primaryModel = process.env.JOB_OPENAI_MODEL || DEFAULT_MODEL;
  const fallbackModels = parseFallbackModels(process.env.JOB_OPENAI_FALLBACK_MODELS);
  const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]));

  if (!apiKey) {
    console.log(
      JSON.stringify({
        level: "error",
        message: "AI provider not configured",
        hasBaseUrl: !!baseUrl,
        hasApiKey: !!apiKey,
      })
    );
    const error = new Error("AI provider not configured");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  // Truncate input if too long (log without including content)
  let truncatedText = jdText;
  if (jdText.length > MAX_INPUT_LENGTH) {
    truncatedText = jdText.slice(0, MAX_INPUT_LENGTH);
    console.log(
      JSON.stringify({
        level: "warn",
        message: "JD text truncated for AI extraction",
        originalLength: jdText.length,
        truncatedLength: MAX_INPUT_LENGTH,
      })
    );
  }

  // Build the prompt
  const systemPrompt = `You are an expert at analyzing job descriptions. Extract two distinct lists from the provided job description:

1. **Responsibilities**: Key duties, tasks, and what the role involves day-to-day.
2. **Requirements**: Skills, qualifications, experience, and technical abilities needed.

Respond ONLY with valid JSON in this exact format:
{
  "responsibilities": ["responsibility 1", "responsibility 2", ...],
  "requirements": ["requirement 1", "requirement 2", ...]
}

Guidelines:
- Each item should be a concise, standalone phrase (not a full sentence)
- Remove duplicates and combine similar items
- Exclude generic filler content (e.g., "other duties as assigned")
- Focus on substantive, actionable items
- Limit each list to 15 most important items maximum`;

  const userPrompt = truncatedText;

  // Make the API request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const endpoint = buildChatCompletionsUrl(baseUrl);
    if (!endpoint) {
      const error = new Error("AI base URL is invalid");
      error.code = "AI_NOT_CONFIGURED";
      throw error;
    }

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      // Some OpenAI-compatible gateways expect api-key style headers.
      "x-api-key": apiKey,
      "api-key": apiKey,
    };

    const attempts = [
      {
        name: "json_mode",
        body: (model) => ({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      },
      {
        name: "prompted_json",
        body: (model) => ({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
        }),
      },
    ];

    let lastError = null;
    for (const model of modelsToTry) {
      for (const attempt of attempts) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(attempt.body(model)),
          signal: controller.signal,
        });

        const providerBody = await response.text().catch(() => null);

        if (!response.ok) {
          console.log(
            JSON.stringify({
              level: "error",
              message: "AI provider request failed",
              status: response.status,
              model,
              endpoint,
              attempt: attempt.name,
              providerBody: process.env.NODE_ENV !== "production" ? providerBody?.slice(0, 2000) : undefined,
            })
          );
          const error = new Error("AI provider request failed");
          error.code = "AI_REQUEST_FAILED";
          error.status = response.status;
          if (process.env.NODE_ENV !== "production") {
            error.details = providerBody?.slice(0, 2000) || null;
          }
          lastError = error;
          continue;
        }

        let result;
        try {
          result = providerBody ? JSON.parse(providerBody) : null;
        } catch {
          const error = new Error("AI response is not valid JSON");
          error.code = "AI_RESPONSE_PARSE_ERROR";
          lastError = error;
          continue;
        }

        // Extract the content from the response
        const content = result?.choices?.[0]?.message?.content;
        if (!content) {
          console.log(
            JSON.stringify({
              level: "error",
              message: "AI response missing content",
              model,
              attempt: attempt.name,
            })
          );
          const error = new Error("AI response missing content");
          error.code = "AI_RESPONSE_INVALID";
          lastError = error;
          continue;
        }

        // Parse the JSON response (json_mode should already be JSON; prompted_json relies on prompt compliance)
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          const error = new Error("Failed to parse AI response");
          error.code = "AI_RESPONSE_PARSE_ERROR";
          lastError = error;
          continue;
        }

        // Validate the structure
        if (!Array.isArray(parsed.responsibilities) || !Array.isArray(parsed.requirements)) {
          console.log(
            JSON.stringify({
              level: "error",
              message: "AI response missing required arrays",
              hasResponsibilities: Array.isArray(parsed.responsibilities),
              hasRequirements: Array.isArray(parsed.requirements),
              model,
              attempt: attempt.name,
            })
          );
          const error = new Error("AI response has invalid structure");
          error.code = "AI_RESPONSE_INVALID";
          lastError = error;
          continue;
        }

        // Filter to only strings and limit length
        const responsibilities = parsed.responsibilities
          .filter((item) => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim())
          .slice(0, 15);

        const requirements = parsed.requirements
          .filter((item) => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim())
          .slice(0, 15);

        console.log(
          JSON.stringify({
            level: "info",
            message: "Requirements extraction completed",
            responsibilitiesCount: responsibilities.length,
            requirementsCount: requirements.length,
            model,
            endpoint,
            attempt: attempt.name,
          })
        );

        clearTimeout(timeoutId);
        return { responsibilities, requirements };
      }
    }

    clearTimeout(timeoutId);
    throw lastError || Object.assign(new Error("AI provider request failed"), { code: "AI_REQUEST_FAILED" });
  } catch (err) {
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (err.name === "AbortError") {
      console.log(
        JSON.stringify({
          level: "error",
          message: "AI request timed out",
          timeout: REQUEST_TIMEOUT,
        })
      );
      const error = new Error("AI request timed out");
      error.code = "AI_TIMEOUT";
      throw error;
    }

    // Re-throw if already has a code
    if (err.code) {
      throw err;
    }

    // Generic error
    console.log(
      JSON.stringify({
        level: "error",
        message: "AI extraction failed",
        error: err.message,
      })
    );
    const error = new Error("AI extraction failed");
    error.code = "AI_ERROR";
    throw error;
  }
}
