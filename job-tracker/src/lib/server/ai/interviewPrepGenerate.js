/**
 * Interview Prep Generation via AI
 * Server-only module for generating interview preparation packs.
 * DO NOT import this file in Client Components.
 */

// Maximum input length to prevent excessive token usage
const MAX_INPUT_LENGTH = 30000;

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 90000;

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
 * Generate interview preparation pack from extracted requirements
 * @param {Object} params - Generation parameters
 * @param {string} params.company - Company name
 * @param {string} params.role - Role title
 * @param {string[]} params.responsibilities - List of key responsibilities
 * @param {string[]} params.requirements - List of requirements/skills
 * @param {string[]} [params.focusResponsibilities] - Optional focus set of key responsibilities
 * @param {string} [params.companyContext] - Optional company context notes
 * @returns {Promise<Object>} Interview prep pack
 * @throws {Error} With code property for specific error types
 */
export async function generateInterviewPrep({
  company,
  role,
  responsibilities,
  requirements,
  focusResponsibilities,
  companyContext,
}) {
  // Validate inputs
  if (!company || !role) {
    const error = new Error("Company and role are required");
    error.code = "INVALID_INPUT";
    throw error;
  }

  if (!Array.isArray(responsibilities) || !Array.isArray(requirements)) {
    const error = new Error("Responsibilities and requirements must be arrays");
    error.code = "INVALID_INPUT";
    throw error;
  }

  if (responsibilities.length === 0 && requirements.length === 0) {
    const error = new Error("At least one responsibility or requirement is needed");
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
        message: "AI provider not configured for interview prep",
        hasBaseUrl: !!baseUrl,
        hasApiKey: !!apiKey,
      })
    );
    const error = new Error("AI provider not configured");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  // Use focus responsibilities if available, otherwise use all
  const focusItems =
    Array.isArray(focusResponsibilities) && focusResponsibilities.length > 0
      ? focusResponsibilities
      : responsibilities;

  // Build the prompt
  const systemPrompt = `You are an expert career coach helping candidates prepare for job interviews. Generate a focused interview preparation pack based on the role details provided.

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Interview question",
      "category": "behavioral|technical|situational|company-specific",
      "talkingPoints": ["key point 1", "key point 2", "key point 3"],
      "exampleAnswer": "Brief example answer framework"
    }
  ],
  "keyThemes": ["theme 1", "theme 2", "theme 3"],
  "companyResearchTips": ["tip 1", "tip 2"],
  "questionsToAsk": ["question 1", "question 2", "question 3"]
}

Guidelines:
- Generate 6-10 highly relevant interview questions
- Mix behavioral (STAR method), technical, and situational questions
- If company context is provided, include company-specific questions
- Talking points should be specific and actionable
- Keep example answers as frameworks, not full scripts
- Focus on the key responsibilities and requirements provided`;

  // Build the user prompt with context
  let userPrompt = `Company: ${company}
Role: ${role}

Key Responsibilities to focus on:
${focusItems.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Requirements/Skills needed:
${requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

  if (companyContext?.trim()) {
    userPrompt += `\n\nCompany Context/Notes:\n${companyContext.trim()}`;
  }

  // Truncate if too long
  if (userPrompt.length > MAX_INPUT_LENGTH) {
    userPrompt = userPrompt.slice(0, MAX_INPUT_LENGTH);
    console.log(
      JSON.stringify({
        level: "warn",
        message: "Interview prep input truncated",
        originalLength: userPrompt.length,
        truncatedLength: MAX_INPUT_LENGTH,
      })
    );
  }

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
          temperature: 0.7,
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
          temperature: 0.7,
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
              message: "AI provider request failed for interview prep",
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
              message: "AI response missing content for interview prep",
              model,
              attempt: attempt.name,
            })
          );
          const error = new Error("AI response missing content");
          error.code = "AI_RESPONSE_INVALID";
          lastError = error;
          continue;
        }

        // Parse the JSON response
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          const error = new Error("Failed to parse AI interview prep response");
          error.code = "AI_RESPONSE_PARSE_ERROR";
          lastError = error;
          continue;
        }

        // Validate the structure
        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
          console.log(
            JSON.stringify({
              level: "error",
              message: "AI interview prep response missing questions array",
              model,
              attempt: attempt.name,
            })
          );
          const error = new Error("AI response has invalid structure");
          error.code = "AI_RESPONSE_INVALID";
          lastError = error;
          continue;
        }

        // Build the result with validated structure
        const pack = {
          questions: parsed.questions.slice(0, 10).map((q) => ({
            question: String(q.question || "").trim(),
            category: String(q.category || "behavioral").trim(),
            talkingPoints: Array.isArray(q.talkingPoints)
              ? q.talkingPoints.filter((p) => typeof p === "string").map((p) => p.trim())
              : [],
            exampleAnswer: String(q.exampleAnswer || "").trim(),
          })).filter((q) => q.question.length > 0),
          keyThemes: Array.isArray(parsed.keyThemes)
            ? parsed.keyThemes.filter((t) => typeof t === "string").map((t) => t.trim()).slice(0, 5)
            : [],
          companyResearchTips: Array.isArray(parsed.companyResearchTips)
            ? parsed.companyResearchTips.filter((t) => typeof t === "string").map((t) => t.trim()).slice(0, 5)
            : [],
          questionsToAsk: Array.isArray(parsed.questionsToAsk)
            ? parsed.questionsToAsk.filter((q) => typeof q === "string").map((q) => q.trim()).slice(0, 5)
            : [],
          generatedAt: new Date().toISOString(),
          model,
        };

        console.log(
          JSON.stringify({
            level: "info",
            message: "Interview prep generation completed",
            questionsCount: pack.questions.length,
            model,
            endpoint,
            attempt: attempt.name,
          })
        );

        clearTimeout(timeoutId);
        return pack;
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
          message: "AI interview prep request timed out",
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
        message: "AI interview prep generation failed",
        error: err.message,
      })
    );
    const error = new Error("AI interview prep generation failed");
    error.code = "AI_ERROR";
    throw error;
  }
}
