/**
 * POST /api/cover-letter/stream
 * Streaming cover letter generation endpoint
 *
 * Generates a cover letter draft based on:
 * - JD snapshot
 * - Confirmed mapping (requirements → project bullets)
 * - (optional) Generation preferences
 *
 * Streams output using Server-Sent Events (delta/done/error)
 * Persists final draft as latest version on completion
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getApplicationById } from '@/lib/server/db/applicationsRepo';
import { listProjectBulletsByIds } from '@/lib/server/db/projectBulletsRepo';
import { createDraftVersion, createPreviewVersion } from '@/lib/server/db/coverLetterVersionsRepo';
import { constraintsSchema } from './schemas';

function logJson(level, message, fields = {}) {
  const payload = { level, message, ...fields };
  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }
  if (level === 'warn') {
    console.warn(JSON.stringify(payload));
    return;
  }
  console.log(JSON.stringify(payload));
}

function firstToken(value) {
  return String(value || '')
    .split('#')[0]
    .trim()
    .split(/\s+/)[0]
    .trim();
}

function buildChatCompletionsUrl(baseUrl) {
  const trimmed = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  const withV1 = trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
  return `${withV1}/chat/completions`;
}

function truncateText(value, maxLen) {
  const text = String(value || '');
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

// Request validation schema
const requestSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format'),
  mode: z.enum(['grounded', 'preview']).default('grounded'),
  constraints: constraintsSchema.optional(),
});

/**
 * POST handler for streaming cover letter generation
 */
export async function POST(request) {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logJson('error', 'Unauthorized request to /api/cover-letter/stream', {
      error: authError?.message,
    });

    // Return a non-stream 401 response
    return new Response(
      JSON.stringify({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // 2. Parse and validate request body
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      logJson('warn', 'Invalid request body for /api/cover-letter/stream', {
        userId: user.id,
        errors: validation.error.errors,
      });

      return new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid request data',
            details: validation.error.errors,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { applicationId, mode, constraints } = validation.data;

    // 3. Load application
    const application = await getApplicationById({
      supabase,
      userId: user.id,
      id: applicationId,
    });

    if (!application) {
      logJson('warn', 'Application not found or access denied', {
        applicationId,
        userId: user.id,
      });

      return new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found or access denied',
          },
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Validate prerequisites
    if (!application.jdSnapshot) {
      logJson('warn', 'Missing JD snapshot', {
        applicationId,
        userId: user.id,
      });

      return new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'JD_SNAPSHOT_REQUIRED',
            message: 'Job description snapshot is required. Please paste the JD first.',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Confirmed mapping is only required for grounded mode
    if (mode === 'grounded') {
      if (!application.confirmedMapping || !application.confirmedMapping.items || application.confirmedMapping.items.length === 0) {
        logJson('warn', 'Missing confirmed mapping', {
          applicationId,
          userId: user.id,
        });

        return new Response(
          JSON.stringify({
            data: null,
            error: {
              code: 'CONFIRMED_MAPPING_REQUIRED',
              message: 'Confirmed mapping is required. Please confirm the requirement → bullet mapping first.',
            },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 5. Load selected bullets for mapping (grounded mode only)
    let bulletMap = new Map();

    if (mode === 'grounded') {
      const bulletIds = new Set();
      for (const item of application.confirmedMapping.items) {
        if (item.bulletIds && Array.isArray(item.bulletIds)) {
          for (const bulletId of item.bulletIds) {
            bulletIds.add(bulletId);
          }
        }
      }

      const bullets = await listProjectBulletsByIds({
        supabase,
        userId: user.id,
        ids: Array.from(bulletIds),
      });

      bulletMap = new Map(bullets.map((bullet) => [bullet.id, bullet]));
    }

    // 6. Build AI prompt based on mode
    const prompt = mode === 'preview'
      ? buildPreviewPrompt({
          jdSnapshot: application.jdSnapshot,
          company: application.company,
          role: application.role,
          constraints,
        })
      : buildGroundedPrompt({
          jdSnapshot: application.jdSnapshot,
          company: application.company,
          role: application.role,
          confirmedMapping: application.confirmedMapping,
          bulletMap,
          constraints,
        });

    // 7. Call AI provider and stream response
    const stream = await streamCoverLetterGeneration({
      prompt,
      mode,
      applicationId,
      userId: user.id,
      supabase,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    logJson('error', 'Unexpected error in /api/cover-letter/stream', {
      message: err.message,
      stack: err.stack,
      userId: user?.id,
    });

    return new Response(
      JSON.stringify({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during cover letter generation',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Build the AI prompt for grounded cover letter generation (with confirmed mapping)
 */
function buildGroundedPrompt({ jdSnapshot, company, role, confirmedMapping, bulletMap, constraints }) {
  const lines = [];

  lines.push('You are a professional cover letter writer. Generate a compelling cover letter for the following job application.');
  lines.push('');
  lines.push(`**Company:** ${company}`);
  lines.push(`**Role:** ${role}`);
  lines.push('');
  lines.push('**Job Description:**');
  lines.push(jdSnapshot);
  lines.push('');
  lines.push('**Requirements and Evidence:**');
  lines.push('');

  for (const item of confirmedMapping.items) {
    const kind = item.kind === 'responsibility' ? 'Responsibility' : 'Requirement';
    lines.push(`${kind}: ${item.text}`);

    if (item.uncovered) {
      lines.push('  (No suitable evidence found - do not fabricate evidence for this item)');
    } else if (item.bulletIds && item.bulletIds.length > 0) {
      lines.push('  Evidence:');
      for (const bulletId of item.bulletIds) {
        const bullet = bulletMap.get(bulletId);
        if (bullet) {
          const bulletText = bullet.title ? `${bullet.title}: ${bullet.text}` : bullet.text;
          lines.push(`  - ${bulletText}`);
        }
      }
    }
    lines.push('');
  }

  lines.push('**Instructions:**');
  lines.push('- Write a professional cover letter that demonstrates how my experience matches the requirements');
  lines.push('- Use the provided evidence bullets to ground your claims');
  lines.push('- Do NOT fabricate evidence for requirements marked as uncovered');

  // Apply user constraints if provided
  if (constraints) {
    if (constraints.tone) {
      lines.push(`- Tone: ${constraints.tone}`);
    } else {
      lines.push('- Keep the tone professional and confident');
    }

    if (constraints.emphasis) {
      lines.push(`- Emphasis: ${constraints.emphasis}`);
    }

    if (constraints.keywordsInclude && constraints.keywordsInclude.length > 0) {
      lines.push(`- Keywords to include: ${constraints.keywordsInclude.join(', ')}`);
    }

    if (constraints.keywordsAvoid && constraints.keywordsAvoid.length > 0) {
      lines.push(`- Keywords to avoid: ${constraints.keywordsAvoid.join(', ')}`);
    }
  } else {
    lines.push('- Keep the tone professional and confident');
  }

  lines.push('- Structure: Opening paragraph (interest + fit), body paragraphs (match requirements with evidence), closing paragraph (next steps)');
  lines.push('- Length: 300-400 words');

  return lines.join('\n');
}

/**
 * Build the AI prompt for preview cover letter generation (without confirmed mapping)
 */
function buildPreviewPrompt({ jdSnapshot, company, role, constraints }) {
  const lines = [];

  lines.push('You are a professional cover letter writer. Generate a preview cover letter for the following job application.');
  lines.push('');
  lines.push('⚠️ IMPORTANT: This is a PREVIEW draft without confirmed evidence mapping.');
  lines.push('');
  lines.push(`**Company:** ${company}`);
  lines.push(`**Role:** ${role}`);
  lines.push('');
  lines.push('**Job Description:**');
  lines.push(jdSnapshot);
  lines.push('');
  lines.push('**CRITICAL INSTRUCTIONS:**');
  lines.push('- This is a PREVIEW ONLY - no evidence has been confirmed');
  lines.push('- DO NOT invent specific claims about projects, achievements, or experience');
  lines.push('- Keep content GENERIC where you lack concrete evidence');
  lines.push('- Focus on demonstrating interest in the role and understanding of requirements');
  lines.push('- Avoid making specific claims that would require evidence to back up');
  lines.push('- This draft is meant for tone/structure review, NOT for submission');

  // Apply user constraints if provided
  if (constraints) {
    if (constraints.tone) {
      lines.push(`- Tone: ${constraints.tone}`);
    } else {
      lines.push('- Keep the tone professional and confident');
    }

    if (constraints.emphasis) {
      lines.push(`- Emphasis: ${constraints.emphasis}`);
    }

    if (constraints.keywordsInclude && constraints.keywordsInclude.length > 0) {
      lines.push(`- Keywords to include: ${constraints.keywordsInclude.join(', ')}`);
    }

    if (constraints.keywordsAvoid && constraints.keywordsAvoid.length > 0) {
      lines.push(`- Keywords to avoid: ${constraints.keywordsAvoid.join(', ')}`);
    }
  } else {
    lines.push('- Keep the tone professional and confident');
  }

  lines.push('- Structure: Opening paragraph (interest + fit), body paragraphs (address key requirements generically), closing paragraph (next steps)');
  lines.push('- Length: 300-400 words');

  return lines.join('\n');
}

/**
 * Stream cover letter generation from AI provider
 * Returns a ReadableStream with SSE events
 */
async function streamCoverLetterGeneration({ prompt, mode, applicationId, userId, supabase }) {
  const encoder = new TextEncoder();
  let fullContent = '';
  let parseErrorCount = 0;

  return new ReadableStream({
    async start(controller) {
      try {
        // Call AI provider (using OpenAI-compatible API)
        const apiKey = process.env.JOB_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        const baseUrl = process.env.JOB_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        const model = firstToken(process.env.JOB_OPENAI_MODEL) || 'gpt-4o-mini';

        if (!apiKey) {
          const errorEvent = `event: error\ndata: ${JSON.stringify({
            code: 'AI_PROVIDER_NOT_CONFIGURED',
            message: 'AI provider is not configured (missing JOB_OPENAI_API_KEY)'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          return;
        }

        const chatUrl = buildChatCompletionsUrl(baseUrl);
        if (!chatUrl) {
          const errorEvent = `event: error\ndata: ${JSON.stringify({
            code: 'AI_PROVIDER_NOT_CONFIGURED',
            message: 'AI provider is not configured (invalid JOB_OPENAI_BASE_URL)',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          return;
        }

        const response = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          const statusText = response.statusText || 'Unknown';
          const providerText = await response.text().catch(() => null);
          const providerMessage = (() => {
            try {
              const json = providerText ? JSON.parse(providerText) : null;
              return json?.error?.message || json?.message || null;
            } catch {
              return providerText || null;
            }
          })();

          logJson('error', 'AI provider error', {
            status: response.status,
            statusText,
            applicationId,
          });

          const errorEvent = `event: error\ndata: ${JSON.stringify({
            code: 'AI_PROVIDER_ERROR',
            message: `AI provider request failed (status ${response.status} ${statusText})`,
            ...(process.env.NODE_ENV !== 'production' && providerMessage
              ? { details: truncateText(providerMessage, 1000) }
              : null),
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          return;
        }

        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const newlineIndex = buffer.indexOf('\n');
            if (newlineIndex === -1) break;

            const rawLine = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            const line = rawLine.trim();
            if (!line) continue;
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                fullContent += content;

                // Send delta event to client
                const deltaEvent = `event: delta\ndata: ${JSON.stringify({ content })}\n\n`;
                controller.enqueue(encoder.encode(deltaEvent));
              }
            } catch (parseError) {
              parseErrorCount += 1;
            }
          }
        }

        if (parseErrorCount > 0) {
          logJson('warn', 'AI stream parse errors', {
            applicationId,
            count: parseErrorCount,
          });
        }

        // Persist the final content as latest draft or preview
        const createVersionFn = mode === 'preview' ? createPreviewVersion : createDraftVersion;
        const { data: version, error: persistError } = await createVersionFn({
          supabase,
          userId,
          applicationId,
          content: fullContent,
        });

        if (persistError) {
          logJson('error', 'Failed to persist cover letter version', {
            applicationId,
            mode,
            error: persistError,
          });

          const errorEvent = `event: error\ndata: ${JSON.stringify({
            code: 'PERSIST_FAILED',
            message: `Failed to save ${mode} version. Please try again.`
            ,
            ...(process.env.NODE_ENV !== 'production' ? { details: persistError } : null),
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          return;
        }

        // Send done event with metadata
        const doneEvent = `event: done\ndata: ${JSON.stringify({
          draftId: version.id,
          kind: version.kind,
          applicationId,
        })}\n\n`;
        controller.enqueue(encoder.encode(doneEvent));
        controller.close();

      } catch (error) {
        logJson('error', 'Stream generation error', {
          message: error.message,
          stack: error.stack,
          applicationId,
        });

        const errorEvent = `event: error\ndata: ${JSON.stringify({
          code: 'GENERATION_FAILED',
          message: 'Cover letter generation failed'
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    },
  });
}
