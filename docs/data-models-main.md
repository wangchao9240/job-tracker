# Data Models - job-tracker

**Generated:** 2025-12-29
**Database:** Supabase (PostgreSQL)
**Total Migrations:** 15

## Overview

The job-tracker application uses Supabase (PostgreSQL) for data persistence with Row-Level Security (RLS) enabled on all tables. All user data is scoped to the authenticated user via `auth.uid()`.

---

## Database Schema

### 1. applications

**Purpose:** Stores user job applications

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `user_id` | uuid | FOREIGN KEY → auth.users, NOT NULL | Owner of application |
| `company` | text | NOT NULL | Company name |
| `role` | text | NOT NULL | Job title/role |
| `link` | text | | Job posting URL (optional) |
| `status` | text | NOT NULL, DEFAULT 'draft' | Application status |
| `applied_date` | date | | Date applied (nullable) |
| `notes` | text | | User notes (optional) |
| `jd_snapshot` | text | | Job description text |
| `extracted_requirements` | jsonb | | AI-extracted requirements |
| `confirmed_mapping` | jsonb | | Confirmed req→bullet mapping |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Additional Fields (from later migrations):**
- `source` (text) - Application source enum
- `location` (text) - Job location
- `normalized_url` (text) - Canonical URL for deduplication
- `normalized_company` (text) - Normalized company name
- `normalized_role` (text) - Normalized role title
- `interview_prep` (jsonb) - Interview preparation data

**Indexes:**
- `idx_applications_user_id` on `user_id`
- `idx_applications_user_id_updated_at` on `(user_id, updated_at DESC)`
- `idx_normalized_url` on `(user_id, normalized_url)` - for duplicate detection

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE their own applications

**Triggers:**
- `update_applications_updated_at` - Auto-updates `updated_at` on modification

---

### 2. projects

**Purpose:** Stores user projects/experiences for evidence library

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `user_id` | uuid | FOREIGN KEY → auth.users, NOT NULL | Owner of project |
| `name` | text | NOT NULL | Project name |
| `description` | text | | Project description (optional) |
| `role` | text | | User's role in project (optional) |
| `tech_stack` | text | | Technologies used (optional) |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_projects_user_id` on `user_id`
- `idx_projects_user_id_updated_at` on `(user_id, updated_at DESC)`

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE their own projects

**Triggers:**
- `update_projects_updated_at` - Auto-updates `updated_at` on modification

---

### 3. project_bullets

**Purpose:** Stores reusable achievement bullets for projects

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `user_id` | uuid | FOREIGN KEY → auth.users, NOT NULL | Owner of bullet |
| `project_id` | uuid | FOREIGN KEY → projects, NOT NULL | Parent project |
| `text` | text | NOT NULL | Bullet text content |
| `title` | text | | Bullet title (optional) |
| `tags` | text[] | | Searchable tags array |
| `impact` | text | | Impact/result description |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_project_bullets_user_id_project_id` on `(user_id, project_id)`
- `idx_project_bullets_user_id_updated_at` on `(user_id, updated_at DESC)`
- `idx_project_bullets_tags` (GIN) on `tags` - for array search

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE their own bullets

**Triggers:**
- `update_project_bullets_updated_at` - Auto-updates `updated_at` on modification

**Cascade Behavior:**
- Bullets are deleted when parent project is deleted (`ON DELETE CASCADE`)

---

### 4. cover_letter_versions

**Purpose:** Stores all versions of cover letters (drafts and submitted)

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `user_id` | uuid | FOREIGN KEY → auth.users, NOT NULL | Owner of version |
| `application_id` | uuid | FOREIGN KEY → applications, NOT NULL | Related application |
| `kind` | text | NOT NULL, CHECK IN ('draft', 'submitted', 'preview') | Version type |
| `content` | text | NOT NULL | Cover letter content |
| `is_latest` | boolean | NOT NULL, DEFAULT true | Latest version flag |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |

**Additional Fields (from later migrations):**
- `submission_notes` (text) - Notes for submitted versions

**Indexes:**
- `idx_cover_letter_versions_latest_unique` (UNIQUE, partial WHERE is_latest=true) on `(application_id, kind)`
- `idx_cover_letter_versions_user_id` on `user_id`
- `idx_cover_letter_versions_application_id` on `(application_id, created_at DESC)`

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE their own versions

**Unique Constraints:**
- Only one latest version per `(application_id, kind)` combination

**Version Types:**
- `draft` - Latest AI-generated draft (grounded mode)
- `preview` - AI-generated preview without confirmed mapping
- `submitted` - User-submitted final versions

---

### 5. application_status_events

**Purpose:** Timeline of status changes and key events for applications

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `user_id` | uuid | FOREIGN KEY → auth.users, NOT NULL | Owner of event |
| `application_id` | uuid | FOREIGN KEY → applications, NOT NULL | Related application |
| `event_type` | text | NOT NULL | Type of event |
| `payload` | jsonb | | Event-specific data |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Event timestamp |

**Indexes:**
- `idx_status_events_application_id` on `(application_id, created_at DESC)`
- `idx_status_events_user_id` on `user_id`

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE their own events

**Event Types:**
- `status_changed` - Application status updated
- `requirements_extracted` - AI extracted requirements
- `mapping_confirmed` - User confirmed req→bullet mapping
- `cover_letter_generated` - Cover letter drafted
- `cover_letter_submitted` - User submitted cover letter
- Custom event types as needed

---

### 6. reminders

**Purpose:** User reminders for follow-ups and deadlines

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `user_id` | uuid | FOREIGN KEY → auth.users, NOT NULL | Owner of reminder |
| `application_id` | uuid | FOREIGN KEY → applications | Related application (optional) |
| `remind_at` | timestamptz | NOT NULL | When to remind |
| `message` | text | NOT NULL | Reminder message |
| `dismissed_at` | timestamptz | | When user dismissed (nullable) |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_reminders_user_id_remind_at` on `(user_id, remind_at)`
- `idx_reminders_application_id` on `application_id`

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE their own reminders

---

### 7. high_fit_preferences (deprecated)

**Purpose:** ~~User preferences for high-fit job matching~~

**Status:** Cleaned up in migration `0004_high_fit_preferences_cleanup.sql`

---

### 8. generation_preferences

**Purpose:** User preferences for AI cover letter generation

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `user_id` | uuid | FOREIGN KEY → auth.users, UNIQUE, NOT NULL | Owner (one per user) |
| `tone` | text | | Preferred tone (professional, friendly, etc.) |
| `emphasis` | text | | What to emphasize |
| `keywords_include` | text[] | | Keywords to include |
| `keywords_avoid` | text[] | | Keywords to avoid |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE their own preferences

---

## Data Relationships

```
auth.users (Supabase Auth)
    ↓
    ├── applications (1:N)
    │   ├── cover_letter_versions (1:N)
    │   ├── application_status_events (1:N)
    │   └── reminders (1:N, optional)
    │
    ├── projects (1:N)
    │   └── project_bullets (1:N)
    │
    ├── generation_preferences (1:1)
    └── reminders (1:N)
```

**Key Relationships:**
- Each `application` can have multiple `cover_letter_versions` (drafts/submitted)
- Each `application` can have multiple `status_events` (timeline)
- Each `project` can have multiple `project_bullets`
- `project_bullets` are used in `applications.confirmed_mapping` (JSONB reference)

---

## JSONB Structures

### applications.extracted_requirements
```json
{
  "responsibilities": [
    {"text": "...", "category": "..."}
  ],
  "requirements": [
    {"text": "...", "category": "...", "priority": "..."}
  ],
  "extractedAt": "ISO8601",
  "updatedAt": "ISO8601",
  "source": "ai",
  "quality": {
    "signal": "high|medium|low",
    "warnings": ["..."]
  },
  "focusResponsibilities": ["id1", "id2"],
  "focusSetUpdatedAt": "ISO8601",
  "focusDismissed": false
}
```

### applications.confirmed_mapping
```json
{
  "items": [
    {
      "id": "uuid",
      "kind": "responsibility|requirement",
      "text": "...",
      "bulletIds": ["uuid1", "uuid2"],
      "uncovered": false
    }
  ],
  "confirmedAt": "ISO8601"
}
```

### applications.interview_prep
```json
{
  "questions": [
    {"text": "...", "category": "..."}
  ],
  "prepTips": ["..."],
  "generatedAt": "ISO8601"
}
```

---

## Security

### Row-Level Security (RLS)

All tables have RLS enabled with policies that enforce:
- Users can only access their own data (`auth.uid() = user_id`)
- Complete CRUD isolation per user
- Foreign key constraints ensure data integrity

### Cascade Deletions

- Deleting a user → deletes all their applications, projects, etc. (`ON DELETE CASCADE`)
- Deleting a project → deletes all its bullets (`ON DELETE CASCADE`)
- Deleting an application → deletes its versions and events (`ON DELETE CASCADE`)

---

## Performance Optimizations

### Indexes

All tables have optimized indexes for:
- User-scoped queries (`user_id`)
- Sort by recency (`updated_at DESC`, `created_at DESC`)
- Foreign key lookups
- Array searches (GIN indexes on `tags`, `keywords_include`, etc.)
- Duplicate detection (`normalized_url`, `normalized_company + normalized_role`)

### Triggers

All tables use `update_updated_at_column()` trigger to automatically maintain `updated_at` timestamps.

---

## Migration History

| Migration | Description |
|-----------|-------------|
| 0002 | high_fit_preferences (deprecated) |
| 0003 | generation_preferences |
| 0004 | applications table |
| 0004 (cleanup) | Remove high_fit_preferences |
| 0005 | Add source field to applications |
| 0006 | application_status_events timeline |
| 0007 | reminders table |
| 0008 | Add ingestion fields (location) |
| 0009 | Add normalized_url index for deduplication |
| 0010 | Add interview_prep field |
| 0011 | projects table |
| 0012 | project_bullets table |
| 0013 | cover_letter_versions table |
| 0014 | Add submission_notes field |
| 0015 | Add preview draft kind |

---

## Future Considerations

1. **Partitioning:** Consider partitioning `application_status_events` by date for large datasets
2. **Archiving:** Implement soft deletes or archiving for old applications
3. **Full-text search:** Add `tsvector` columns for advanced search
4. **Materialized views:** For analytics/dashboards
5. **Audit logs:** Comprehensive change tracking for GDPR compliance
