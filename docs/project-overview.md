# Project Overview - job-tracker

**Generated:** 2025-12-29
**Project Type:** Web Application (Monolith)
**Framework:** Next.js 16.1.1 App Router

---

## Executive Summary

**job-tracker** is a full-stack web application built with Next.js that helps users manage job applications with AI-powered features for cover letter generation, requirements extraction, and project-to-job matching.

**Key Features:**
- Job application tracking and management
- AI-powered requirements extraction from job descriptions
- Project/experience evidence library
- Smart requirement→bullet mapping with AI assistance
- Streaming cover letter generation (grounded & preview modes)
- Interview preparation materials
- Timeline tracking and reminders

---

## Tech Stack Summary

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19.2.3, Next.js 16.1.1 (App Router) |
| **Styling** | Tailwind CSS 4, shadcn/ui, Radix UI |
| **State Management** | TanStack React Query 5.90.12 |
| **Backend** | Next.js API Routes, Supabase |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Authentication** | Supabase Auth |
| **AI/LLM** | OpenAI API, Anthropic SDK |
| **Testing** | Jest 30.2.0, React Testing Library |
| **Dev Tools** | ESLint, TypeScript support |

---

## Repository Structure

**Type:** Monolith
**Primary Language:** JavaScript (with TypeScript support via jsconfig.json)
**Architecture Pattern:** Next.js App Router + Component-based

```
job-tracker/
├── src/
│   ├── app/              # Next.js App Router (pages & API routes)
│   ├── components/       # React components
│   ├── lib/              # Shared libraries and utilities
│   └── ...
├── supabase/             # Database migrations
├── public/               # Static assets
├── package.json
└── next.config.mjs
```

---

## Core Modules

### 1. Applications Management
**Purpose:** Track job applications from draft to offer
**Key Files:**
- `src/app/api/applications/` - API endpoints
- `src/components/features/applications/` - UI components
- Database: `applications` table

### 2. Projects & Evidence Library
**Purpose:** Store reusable project experiences and achievement bullets
**Key Files:**
- `src/app/api/projects/` - Project management API
- `src/app/api/project-bullets/` - Bullet management API
- `src/components/features/projects/` - UI components
- Database: `projects`, `project_bullets` tables

### 3. AI-Powered Requirements Extraction
**Purpose:** Extract responsibilities and requirements from job descriptions
**Key Files:**
- `src/app/api/requirements/extract/` - Extraction endpoint
- `src/lib/server/ai/requirementsExtract.js` - AI logic
- Database: Stores in `applications.extracted_requirements` (JSONB)

### 4. Smart Mapping
**Purpose:** AI-assisted mapping of job requirements to evidence bullets
**Key Files:**
- `src/app/api/mapping/propose/` - Mapping suggestions API
- `src/components/features/mapping/` - UI components
- Database: Stores in `applications.confirmed_mapping` (JSONB)

### 5. Cover Letter Generation
**Purpose:** Streaming AI-generated cover letters (grounded & preview)
**Key Files:**
- `src/app/api/cover-letter/stream/` - Streaming generation
- `src/app/api/cover-letter/submitted/` - Version management
- Database: `cover_letter_versions` table

### 6. Interview Preparation
**Purpose:** Generate interview prep materials
**Key Files:**
- `src/app/api/interview-prep/generate/` - Generation endpoint
- Database: `applications.interview_prep` (JSONB)

### 7. Reminders & Timeline
**Purpose:** Follow-up reminders and event tracking
**Key Files:**
- `src/app/api/reminders/` - Reminders API
- `src/app/api/cron/reminders/` - Scheduled reminder processor
- Database: `reminders`, `application_status_events` tables

---

## Architecture Classification

**Pattern:** Layered Full-Stack Web Application

**Layers:**
1. **Presentation:** React components (Client Components + Server Components)
2. **Routing:** Next.js App Router (file-based)
3. **API:** Next.js API Routes (RESTful JSON APIs)
4. **Business Logic:** Server-side utilities (`lib/server/`)
5. **Data Access:** Supabase client with RLS
6. **Database:** PostgreSQL (via Supabase)

**AI Integration:**
- OpenAI-compatible API for cover letter generation
- Anthropic Claude SDK (available but not primary)
- Streaming responses via Server-Sent Events (SSE)

---

## Key Design Patterns

### Authentication & Authorization
- **Pattern:** Session-based auth via Supabase
- **Security:** Row-Level Security (RLS) on all tables
- **Scope:** User-scoped data (`auth.uid() = user_id`)

### State Management
- **Server State:** TanStack React Query
- **Client State:** React hooks + Context (providers/)
- **Optimistic Updates:** React Query mutations

### API Design
- **Convention:** RESTful with consistent response format
- **Validation:** Zod schemas for request/response
- **Error Handling:** Structured error codes + HTTP status

### Component Architecture
- **Structure:** Feature-based organization
- **UI Library:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind utility classes
- **Reusability:** Shared UI components in `components/ui/`

---

## Data Flow

```
User Action (Browser)
    ↓
React Component (Client/Server)
    ↓
API Route (/api/*)
    ↓
Business Logic (lib/server/)
    ↓
Supabase Client (with RLS)
    ↓
PostgreSQL Database
```

**AI Workflow:**
```
User Submits JD
    ↓
API: requirements/extract
    ↓
AI Provider (OpenAI/Claude)
    ↓
Parse & Store Results
    ↓
Return to Client
```

---

## Testing Strategy

**Test Coverage:**
- Unit tests for API routes
- Integration tests with test database
- Validation schema tests
- Component tests (React Testing Library)

**Test Files:**
- `__tests__/` directories alongside source files
- `*.test.js` naming convention
- Jest + jsdom environment

---

## Development Workflow

**Prerequisites:**
- Node.js >=20.9.0
- Supabase project
- OpenAI-compatible API key (optional for AI features)

**Setup:**
```bash
npm install
# Copy .env.example to .env.local
npm run dev
```

**Build:**
```bash
npm run build
npm start
```

**Testing:**
```bash
npm test
```

---

## Deployment

**Target Platform:** Vercel (recommended for Next.js)

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JOB_OPENAI_API_KEY` (or `OPENAI_API_KEY`)
- `JOB_OPENAI_BASE_URL` (optional, defaults to OpenAI)
- `JOB_OPENAI_MODEL` (optional, defaults to gpt-4o-mini)

**Database Migrations:**
- Managed via Supabase CLI
- Located in `supabase/migrations/`
- Apply with: `supabase db push`

---

## Links to Detailed Documentation

- [API Contracts](./api-contracts-main.md) - All API endpoints
- [Data Models](./data-models-main.md) - Database schema
- [README.md](../job-tracker/README.md) - Next.js boilerplate docs

---

## Project Status

**Current State:** Active development
**Last Updated:** 2025-12-29

**Recent Features:**
- Projects and project bullets management (Story 5-1)
- Cover letter generation with mapping
- Interview preparation
- Reminder system with cron jobs
