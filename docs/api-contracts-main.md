# API Contracts - job-tracker

**Generated:** 2025-12-29
**Project Type:** Web Application
**Framework:** Next.js 16.1.1 App Router

## Overview

This document catalogs all API endpoints in the job-tracker application. All endpoints use Next.js API Routes and follow RESTful conventions with JSON request/response bodies.

## Authentication

All endpoints require authentication via Supabase Auth unless otherwise noted.

**Authentication Method:**
- Session-based via Supabase cookies
- `createClient()` validates session server-side
- Returns `401 UNAUTHORIZED` if session invalid

## Common Response Format

```json
{
  "data": <result> | null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {} // Optional, dev mode only
  } | null
}
```

---

## API Endpoints

### 1. Applications Management

#### GET /api/applications
**Purpose:** List user's job applications with filtering

**Query Parameters:**
- `status` (optional): Filter by application status
- `source` (optional): Filter by application source
- `q` (optional): Search query (company/role)
- `from` (optional): Start date (YYYY-MM-DD)
- `to` (optional): End date (YYYY-MM-DD)

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "company": "string",
      "role": "string",
      "status": "draft|applied|interviewing|...",
      "appliedDate": "ISO8601 | null",
      ...
    }
  ],
  "error": null
}
```

**Error Codes:**
- `UNAUTHORIZED` (401)
- `INVALID_DATE_RANGE` (400)
- `FETCH_FAILED` (500)

---

#### POST /api/applications
**Purpose:** Create new job application

**Request Body:**
```json
{
  "company": "string (required)",
  "role": "string (required)",
  "link": "string (optional)",
  "status": "draft|applied|... (default: draft)",
  "appliedDate": "ISO8601 (optional)",
  "notes": "string (optional)",
  "source": "enum (default: unknown)",
  "location": "string (optional)",
  "jdSnapshot": "string (max 100k chars, optional)",
  "allowDuplicateUrl": "boolean (default: false)"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    ...application fields,
    "duplicates": {
      "companyRoleMatches": [] // Warning for similar entries
    }
  },
  "error": null
}
```

**Error Codes:**
- `UNAUTHORIZED` (401)
- `INVALID_JSON` (400)
- `VALIDATION_FAILED` (400)
- `DUPLICATE_URL` (409) - Blocking duplicate URL detected
- `CREATE_FAILED` (500)

**Features:**
- URL normalization and duplicate detection
- Company+role fuzzy matching (non-blocking warning)
- Applied date validation based on status

---

#### GET /api/applications/[id]
**Purpose:** Get single application details

#### PUT /api/applications/[id]
**Purpose:** Update application

#### DELETE /api/applications/[id]
**Purpose:** Delete application

#### GET /api/applications/[id]/timeline
**Purpose:** Get application timeline events

---

### 2. Projects Management

#### GET /api/projects
**Purpose:** List user's projects/experiences

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string | null",
      "role": "string | null",
      "techStack": "string | null",
      ...
    }
  ],
  "error": null
}
```

---

#### POST /api/projects
**Purpose:** Create new project/experience

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "role": "string (optional)",
  "techStack": "string (optional)"
}
```

**Response:** 201 Created

**Error Codes:**
- `UNAUTHORIZED` (401)
- `INVALID_JSON` (400)
- `VALIDATION_FAILED` (400)
- `CREATE_FAILED` (500)

---

#### GET /api/projects/[id]
**Purpose:** Get single project details

#### PUT /api/projects/[id]
**Purpose:** Update project

#### DELETE /api/projects/[id]
**Purpose:** Delete project

---

### 3. Project Bullets

#### GET /api/project-bullets
**Purpose:** List project achievement bullets

#### POST /api/project-bullets
**Purpose:** Create new project bullet

#### GET /api/project-bullets/[id]
**Purpose:** Get single bullet

#### PUT /api/project-bullets/[id]
**Purpose:** Update bullet

#### DELETE /api/project-bullets/[id]
**Purpose:** Delete bullet

---

### 4. Cover Letter Generation

#### POST /api/cover-letter/stream
**Purpose:** Generate cover letter with AI streaming

**Request Body:**
```json
{
  "applicationId": "uuid (required)",
  "mode": "grounded|preview (default: grounded)",
  "constraints": {
    "tone": "string (optional)",
    "emphasis": "string (optional)",
    "keywordsInclude": ["string"] (optional),
    "keywordsAvoid": ["string"] (optional)
  }
}
```

**Response:** 200 OK (Server-Sent Events stream)

**Event Types:**
- `delta`: Content chunk `{content: "..."}`
- `done`: Generation complete `{draftId, kind, applicationId}`
- `error`: Error occurred `{code, message}`

**Modes:**
- `grounded`: Uses confirmed requirement→bullet mapping
- `preview`: Generic draft without evidence mapping

**Error Codes:**
- `UNAUTHORIZED` (401)
- `VALIDATION_FAILED` (400)
- `NOT_FOUND` (404)
- `JD_SNAPSHOT_REQUIRED` (400)
- `CONFIRMED_MAPPING_REQUIRED` (400) - grounded mode only
- `AI_PROVIDER_NOT_CONFIGURED` (500)
- `AI_PROVIDER_ERROR` (502)
- `PERSIST_FAILED` (500)
- `GENERATION_FAILED` (500)

**Prerequisites:**
- JD snapshot must exist
- Confirmed mapping required (grounded mode)
- OpenAI-compatible API configured

---

#### GET /api/cover-letter/submitted
**Purpose:** List submitted cover letter versions

#### GET /api/cover-letter/latest
**Purpose:** Get latest cover letter draft

#### POST /api/cover-letter/submitted/[id]/notes
**Purpose:** Add notes to submitted version

---

### 5. Requirements Extraction

#### POST /api/requirements/extract
**Purpose:** Extract requirements from JD using AI

**Request Body:**
```json
{
  "applicationId": "uuid (required)"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "applicationId": "uuid",
    "responsibilities": [
      {"text": "...", "category": "..."}
    ],
    "requirements": [
      {"text": "...", "category": "...", "priority": "..."}
    ],
    "extractedAt": "ISO8601",
    "quality": {
      "signal": "high|medium|low",
      "warnings": ["..."]
    }
  },
  "error": null
}
```

**Error Codes:**
- `UNAUTHORIZED` (401)
- `INVALID_JSON` (400)
- `VALIDATION_FAILED` (400)
- `NOT_FOUND` (404)
- `JD_SNAPSHOT_REQUIRED` (400)
- `AI_NOT_CONFIGURED` (500)
- `AI_REQUEST_FAILED` (502)
- `EXTRACTION_FAILED` (500)

**Features:**
- AI-powered extraction from JD text
- Low-signal detection and quality scoring
- Timeline event creation
- Clears previous focus settings

---

### 6. Mapping & Matching

#### POST /api/mapping/propose
**Purpose:** AI-proposes requirement→bullet mappings

**Features:**
- Matches extracted requirements to user's project bullets
- Confidence scoring
- Auto-mapping suggestions

---

### 7. Preferences

#### GET /api/preferences/high-fit
**Purpose:** Get high-fit job preferences

#### POST /api/preferences/generation
**Purpose:** Save generation preferences (tone, emphasis, keywords)

---

### 8. Ingestion

#### POST /api/ingestion/parse
**Purpose:** Parse job posting from URL or text

**Features:**
- URL fetching and scraping
- Text parsing and normalization
- Company/role/location extraction

---

### 9. Interview Preparation

#### POST /api/interview-prep/generate
**Purpose:** Generate interview preparation materials

---

### 10. User & Auth

#### GET /api/me
**Purpose:** Get current user profile

#### POST /api/auth/sign-out
**Purpose:** Sign out current user

---

### 11. Reminders

#### GET /api/reminders
**Purpose:** List user reminders

#### POST /api/reminders
**Purpose:** Create new reminder

#### POST /api/reminders/[id]/dismiss
**Purpose:** Dismiss reminder

---

### 12. Cron Jobs

#### GET /api/cron/reminders
**Purpose:** Process pending reminders (internal cron)

**Authentication:** Requires cron secret or internal auth

---

### 13. Health Checks

#### GET /api/ai/health
**Purpose:** Check AI provider health/configuration

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `VALIDATION_FAILED` | 400 | Request validation failed (Zod) |
| `NOT_FOUND` | 404 | Resource not found or access denied |
| `CREATE_FAILED` | 500 | Database insert failed |
| `UPDATE_FAILED` | 500 | Database update failed |
| `FETCH_FAILED` | 500 | Database query failed |
| `AI_NOT_CONFIGURED` | 500 | AI provider not configured |
| `AI_REQUEST_FAILED` | 502 | AI provider request failed |
| `SERVER_ERROR` | 500 | Unexpected server error |

### Validation

All endpoints use Zod for request validation:
- Type safety
- Custom error messages
- Detailed error responses in dev mode

---

## Rate Limiting

No explicit rate limiting currently implemented. Consider adding:
- Per-user request limits
- AI endpoint throttling
- Cron job protection

---

## Deployment Notes

**Environment Variables Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `JOB_OPENAI_API_KEY` or `OPENAI_API_KEY` - AI provider key
- `JOB_OPENAI_BASE_URL` or `OPENAI_BASE_URL` - AI provider URL (optional)
- `JOB_OPENAI_MODEL` - AI model name (default: gpt-4o-mini)

**API Provider Compatibility:**
- Supports OpenAI-compatible APIs
- Tested with: OpenAI, custom endpoints
- Uses streaming for cover letter generation

---

## Testing

API endpoints include comprehensive test coverage:
- Route tests (`route.test.js`)
- Validation tests (`validation.test.js`)
- Integration tests with test database
- Mock AI responses for deterministic testing

---

## Next Steps

1. Consider adding API versioning (`/api/v1/...`)
2. Implement rate limiting
3. Add request/response logging middleware
4. Document webhook endpoints (if any)
5. Add OpenAPI/Swagger specification
