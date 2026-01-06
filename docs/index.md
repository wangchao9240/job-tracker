# job-tracker - Project Documentation Index

**Generated:** 2025-12-29
**Last Updated:** 2025-12-29
**Scan Level:** Deep
**Documentation Version:** 1.0

---

## 📋 Project Quick Reference

- **Type:** Monolith Web Application
- **Primary Framework:** Next.js 16.1.1 (App Router)
- **Primary Language:** JavaScript
- **Database:** Supabase (PostgreSQL)
- **Architecture:** Layered Full-Stack with AI Integration

---

## 🎯 What is job-tracker?

A full-stack AI-powered job application tracking system that helps users:
- Manage job applications from draft to offer
- Extract requirements from job descriptions using AI
- Build an evidence library of projects and achievements
- Generate tailored cover letters with AI (streaming)
- Track application timelines and set reminders
- Prepare for interviews with AI-generated materials

---

## 📚 Generated Documentation

### Core Documentation

- **[Project Overview](./project-overview.md)** - Executive summary, tech stack, architecture
- **[API Contracts](./api-contracts-main.md)** - All REST API endpoints (13 categories, 40+ endpoints)
- **[Data Models](./data-models-main.md)** - Database schema (8 tables, relationships, JSONB structures)

### Additional Documentation

- **[Development Guide](./development-guide.md)** _(To be generated)_
- **[Deployment Guide](./deployment-guide.md)** _(To be generated)_
- **[Component Inventory](./component-inventory.md)** _(To be generated)_
- **[Source Tree Analysis](./source-tree-analysis.md)** _(To be generated)_

---

## 🚀 Getting Started

### For Developers

1. **Read First:**
   - [Project Overview](./project-overview.md) - Understand the system architecture
   - [Data Models](./data-models-main.md) - Learn the database schema
   - [API Contracts](./api-contracts-main.md) - Explore available endpoints

2. **Development Setup:**
   ```bash
   cd job-tracker/
   npm install
   cp .env.example .env.local
   # Configure Supabase and OpenAI credentials
   npm run dev
   ```

3. **Running Tests:**
   ```bash
   npm test
   ```

### For AI-Assisted Development

When creating a **brownfield PRD** for new features:
- **Reference:** This `index.md` as the primary documentation entry point
- **API-only features:** Use [API Contracts](./api-contracts-main.md)
- **Database changes:** Use [Data Models](./data-models-main.md)
- **Full-stack features:** Use [Project Overview](./project-overview.md) + specific docs

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│          Browser (React)                │
│  Components: Auth, Applications,        │
│  Projects, Cover Letter, Mapping        │
└──────────────┬──────────────────────────┘
               │
       ┌───────▼────────┐
       │  Next.js App   │
       │   Router       │
       └───────┬────────┘
               │
    ┌──────────▼───────────┐
    │   API Routes (/api)  │
    │  - Applications      │
    │  - Projects          │
    │  - Cover Letter      │
    │  - Requirements      │
    │  - Mapping           │
    └──────────┬───────────┘
               │
    ┌──────────▼──────────────┐
    │   Business Logic        │
    │  (lib/server/)          │
    │  - DB Repositories      │
    │  - AI Integrations      │
    │  - Validation           │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────┐     ┌─────────────────┐
    │  Supabase Client    │────▶│  AI Providers   │
    │  (with RLS)         │     │  - OpenAI       │
    └──────────┬──────────┘     │  - Anthropic    │
               │                 └─────────────────┘
    ┌──────────▼──────────┐
    │  PostgreSQL         │
    │  8 Tables + RLS     │
    └─────────────────────┘
```

---

## 📊 Project Statistics

**Codebase:**
- API Endpoints: 40+
- Database Tables: 8 core tables
- Database Migrations: 15 files
- Test Coverage: Comprehensive (unit + integration)

**Key Technologies:**
- Next.js 16.1.1
- React 19.2.3
- Supabase (Auth + DB)
- TanStack React Query
- Tailwind CSS 4
- shadcn/ui components
- Zod validation
- Jest testing

---

## 🔑 Key Modules

### 1. Applications Management
**Purpose:** Track job applications with status workflow
**Files:** `src/app/api/applications/`, `src/components/features/applications/`
**Database:** `applications` table
**Features:** Filtering, search, timeline, duplicate detection

### 2. Projects & Evidence Library
**Purpose:** Reusable project experiences and achievement bullets
**Files:** `src/app/api/projects/`, `src/app/api/project-bullets/`
**Database:** `projects`, `project_bullets` tables
**Features:** CRUD operations, tagging, impact tracking

### 3. AI Requirements Extraction
**Purpose:** Extract requirements from job descriptions
**Files:** `src/app/api/requirements/extract/`, `src/lib/server/ai/`
**AI Provider:** OpenAI-compatible API
**Features:** Responsibilities + requirements extraction, quality scoring

### 4. Smart Mapping
**Purpose:** AI-assisted requirement→bullet mapping
**Files:** `src/app/api/mapping/propose/`
**Features:** Confidence scoring, auto-suggestions

### 5. Cover Letter Generation
**Purpose:** Streaming AI-generated cover letters
**Files:** `src/app/api/cover-letter/stream/`
**Database:** `cover_letter_versions` table
**Features:** Grounded mode (with evidence), preview mode, SSE streaming

### 6. Interview Prep
**Purpose:** Generate interview preparation materials
**Files:** `src/app/api/interview-prep/generate/`
**Features:** Question generation, prep tips

### 7. Reminders & Timeline
**Purpose:** Follow-up reminders and event tracking
**Files:** `src/app/api/reminders/`, `src/app/api/cron/`
**Database:** `reminders`, `application_status_events` tables
**Features:** Scheduled reminders, timeline visualization

---

## 🔒 Security Features

- **Row-Level Security (RLS):** All tables user-scoped
- **Authentication:** Supabase Auth (session-based)
- **Authorization:** Enforced at database level
- **Input Validation:** Zod schemas on all endpoints
- **API Security:** User-scoped queries, no SQL injection risk

---

## 🧪 Testing

**Test Coverage:**
- API route tests (`route.test.js`)
- Validation tests (`validation.test.js`)
- Component tests (React Testing Library)
- Integration tests with test database

**Run Tests:**
```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # Coverage report
```

---

## 🚀 Deployment

**Recommended Platform:** Vercel (optimized for Next.js)

**Required Environment Variables:**
```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
JOB_OPENAI_API_KEY=your-openai-key
JOB_OPENAI_BASE_URL=https://api.openai.com/v1  # Optional
JOB_OPENAI_MODEL=gpt-4o-mini                     # Optional
```

**Database Migrations:**
```bash
supabase db push
```

---

## 📖 External Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 📝 Notes for AI-Assisted Development

### When Planning New Features:

**For UI Features:**
1. Reference component structure in `src/components/`
2. Use shadcn/ui patterns (`src/components/ui/`)
3. Follow Next.js App Router conventions
4. Use React Query for data fetching

**For API Features:**
1. Add route in `src/app/api/[feature]/route.js`
2. Use Zod for validation
3. Follow error response format (see API Contracts)
4. Add RLS policies if new tables needed

**For Database Changes:**
1. Create new migration in `supabase/migrations/`
2. Enable RLS on new tables
3. Add user-scoped policies
4. Update Data Models doc

**For AI Features:**
1. Follow OpenAI-compatible API patterns
2. Support streaming where appropriate
3. Add quality/confidence scoring
4. Handle errors gracefully (provider outages)

---

## 🔄 Next Steps

**Incomplete Documentation:**
The following documents are marked for generation:

1. **Development Guide** - Setup, commands, troubleshooting
2. **Deployment Guide** - CI/CD, environment config, monitoring
3. **Component Inventory** - All UI components with props/usage
4. **Source Tree Analysis** - Detailed directory structure

**To generate these:**
Run the document-project workflow again with specific focus on missing areas, or manually create based on the project structure.

---

## 📞 Support

For questions about this documentation or the project:
- Review the generated documentation files
- Check the original README.md in the project root
- Refer to migration files in `supabase/migrations/` for schema details

---

**This documentation was auto-generated by the BMM document-project workflow.**
