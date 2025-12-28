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
import { getProjectBulletById } from '@/lib/server/db/projectBulletsRepo';
import { createDraftVersion } from '@/lib/server/db/coverLetterVersionsRepo';

// Request validation schema
const requestSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format'),
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
    console.error('Unauthorized request to /api/cover-letter/stream:', JSON.stringify({
      error: authError?.message
    }));

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
      console.error('Invalid request body:', JSON.stringify({
        errors: validation.error.errors,
        userId: user.id
      }));

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

    const { applicationId } = validation.data;

    // 3. Load application
    const { data: application, error: appError } = await getApplicationById({
      supabase,
      userId: user.id,
      id: applicationId,
    });

    if (appError || !application) {
      console.error('Application not found:', JSON.stringify({
        applicationId,
        userId: user.id,
        error: appError
      }));

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
      console.warn('Missing JD snapshot:', JSON.stringify({
        applicationId,
        userId: user.id
      }));

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

    if (!application.confirmedMapping || !application.confirmedMapping.items || application.confirmedMapping.items.length === 0) {
      console.warn('Missing confirmed mapping:', JSON.stringify({
        applicationId,
        userId: user.id
      }));

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

    // 5. Load selected bullets for mapping
    const bulletIds = new Set();
    for (const item of application.confirmedMapping.items) {
      if (item.bulletIds && Array.isArray(item.bulletIds)) {
        for (const bulletId of item.bulletIds) {
          bulletIds.add(bulletId);
        }
      }
    }

    const bullets = [];
    for (const bulletId of bulletIds) {
      const bullet = await getProjectBulletById({
        supabase,
        userId: user.id,
        id: bulletId,
      });
      if (bullet) {
        bullets.push(bullet);
      }
    }

    // Build bullet lookup map
    const bulletMap = new Map();
    for (const bullet of bullets) {
      bulletMap.set(bullet.id, bullet);
    }

    // 6. Build AI prompt
    const prompt = buildCoverLetterPrompt({
      jdSnapshot: application.jdSnapshot,
      company: application.company,
      role: application.role,
      confirmedMapping: application.confirmedMapping,
      bulletMap,
    });

    // 7. Call AI provider and stream response
    const stream = await streamCoverLetterGeneration({
      prompt,
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
    console.error('Unexpected error in /api/cover-letter/stream:', JSON.stringify({
      message: err.message,
      stack: err.stack,
      userId: user?.id
    }));

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
 * Build the AI prompt for cover letter generation
 */
function buildCoverLetterPrompt({ jdSnapshot, company, role, confirmedMapping, bulletMap }) {
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
  lines.push('- Keep the tone professional and confident');
  lines.push('- Structure: Opening paragraph (interest + fit), body paragraphs (match requirements with evidence), closing paragraph (next steps)');
  lines.push('- Length: 300-400 words');

  return lines.join('\n');
}

/**
 * Stream cover letter generation from AI provider
 * Returns a ReadableStream with SSE events
 */
async function streamCoverLetterGeneration({ prompt, applicationId, userId, supabase }) {
  const encoder = new TextEncoder();
  let fullContent = '';

  return new ReadableStream({
    async start(controller) {
      try {
        // Call AI provider (using OpenAI-compatible API)
        const apiKey = process.env.OPENAI_API_KEY;
        const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

        if (!apiKey) {
          const errorEvent = `event: error\ndata: ${JSON.stringify({
            code: 'AI_PROVIDER_NOT_CONFIGURED',
            message: 'AI provider is not configured'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          return;
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
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
          const errorText = await response.text();
          console.error('AI provider error:', JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            applicationId
          }));

          const errorEvent = `event: error\ndata: ${JSON.stringify({
            code: 'AI_PROVIDER_ERROR',
            message: `AI provider returned error: ${response.statusText}`
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          return;
        }

        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
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
                console.warn('Failed to parse SSE chunk:', data);
              }
            }
          }
        }

        // Persist the final content as latest draft
        const { data: draftVersion, error: persistError } = await createDraftVersion({
          supabase,
          userId,
          applicationId,
          content: fullContent,
        });

        if (persistError) {
          console.error('Failed to persist draft:', JSON.stringify({
            error: persistError,
            applicationId
          }));

          const errorEvent = `event: error\ndata: ${JSON.stringify({
            code: 'PERSIST_FAILED',
            message: 'Failed to save draft. Please try again.'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          return;
        }

        // Send done event with metadata
        const doneEvent = `event: done\ndata: ${JSON.stringify({
          draftId: draftVersion.id,
          applicationId,
        })}\n\n`;
        controller.enqueue(encoder.encode(doneEvent));
        controller.close();

      } catch (error) {
        console.error('Stream generation error:', JSON.stringify({
          message: error.message,
          stack: error.stack,
          applicationId
        }));

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
