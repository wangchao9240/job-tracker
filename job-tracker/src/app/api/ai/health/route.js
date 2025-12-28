import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
const client = new OpenAI();

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function buildModelsUrl(baseUrl) {
  const trimmed = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  if (trimmed.endsWith("/models")) return trimmed;
  return `${trimmed}${trimmed.endsWith("/v1") ? "" : "/v1"}/models`;
}

/**
 * GET /api/ai/health
 * Lightweight check to validate AI gateway connectivity (auth required).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  const baseUrl = process.env.JOB_OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const apiKey = process.env.JOB_OPENAI_API_KEY;
  console.log('baseUrl:', baseUrl);
  console.log('apiKey set:', apiKey)

  if (!apiKey) {
    return NextResponse.json(
      { data: { ok: false }, error: { code: "AI_NOT_CONFIGURED", message: "Missing JOB_OPENAI_API_KEY" } },
      { status: 500 }
    );
  }

  const modelsUrl = buildModelsUrl(baseUrl);
  if (!modelsUrl) {
    return NextResponse.json(
      { data: { ok: false }, error: { code: "AI_NOT_CONFIGURED", message: "Invalid JOB_OPENAI_BASE_URL" } },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(modelsUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "api-key": apiKey,
      },
    });

    const text = await response.text().catch(() => null);
    const json = (() => {
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    })();

    return NextResponse.json(
      {
        data: {
          ok: response.ok,
          status: response.status,
          modelsUrl,
          models: Array.isArray(json?.data) ? json.data.slice(0, 25).map((m) => m.id) : null,
        },
        error: response.ok
          ? null
          : {
              code: "AI_REQUEST_FAILED",
              message: "Failed to fetch models from AI gateway",
              ...(process.env.NODE_ENV !== "production" ? { details: text?.slice(0, 2000) } : {}),
            },
      },
      { status: response.ok ? 200 : 502 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        data: { ok: false, modelsUrl },
        error: {
          code: "AI_REQUEST_FAILED",
          message: "AI gateway request failed",
          ...(process.env.NODE_ENV !== "production" ? { details: err.message } : {}),
        },
      },
      { status: 502 }
    );
  }
}
