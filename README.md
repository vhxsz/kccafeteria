# Nourish

Nourish is a privacy-first school cafeteria feedback and food intelligence platform.
Students open a table-specific link from an NFC tag or QR code, see the active
meal, and share structured feedback. Cafeteria teams use the dashboard to turn
that feedback into better operational decisions.

## Current prototype

- Marketing page at /
- Interactive mobile student flow at /site/rate/tag14
- Responsive manager dashboard at /admin
- Supabase browser and server clients
- Initial PostgreSQL schema with multi-tenant row-level security
- Vercel-ready Next.js configuration

The screens currently use representative demo data. The next implementation
step is to connect table resolution, menus, reviews, and dashboard queries to
Supabase.

## Local development

Requirements:

- Node.js 20 or newer
- pnpm
- A Supabase project

Install and run:

    pnpm install
    cp .env.example .env.local
    pnpm dev

Open http://localhost:3000.

## Supabase setup

1. Create a Supabase project.
2. Copy .env.example to .env.local and fill in the project values.
3. Run supabase/migrations/001_initial_schema.sql with the Supabase CLI or SQL editor.
4. Never expose SUPABASE_SERVICE_ROLE_KEY to browser code.

All tenant-owned rows include school_id. Row-level security checks the signed-in
profile tenant on every protected table. Anonymous reviews intentionally require
a server endpoint so rate limits, duplicate detection, and table/menu validation
can be enforced before writing.

## Vercel deployment

Import this repository into Vercel and add the three variables from
.env.example to the project environment settings. Use separate Supabase
projects for development, staging, and production.

## Product language

The initial interface and source content are English-only. User-facing copy is
kept centralized in components for now; translation keys can be introduced when
the first additional language is scheduled.
