# Nourish

Nourish is a privacy-first school cafeteria feedback and food intelligence platform.
Students open a table-specific link from an NFC tag or QR code, see the active
meal, and share structured feedback. Cafeteria teams use the dashboard to turn
that feedback into better operational decisions.

## Current prototype

- Marketing page at /
- Interactive mobile student flow at /site/rate/tag14
- Optional ratings for every individual menu item
- Responsive manager dashboard at /admin
- Trello-style weekly meal planner at /admin/schedule
- Table and public tag management at /admin/tables
- School administrator onboarding at /signup
- Supabase browser and server clients
- PostgreSQL schema with time-aware menus, multi-tenant RLS, and secure public reviews
- Vercel-ready Next.js configuration

The screens use representative data when Supabase credentials are absent. Once
the environment values are present and both migrations are applied, account
creation, menu persistence, table tags, time-based menu resolution, and reviews
use Supabase.

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
3. Run the SQL files in supabase/migrations in numeric order.
4. Add a long random REVIEW_HASH_SECRET.
5. Never expose SUPABASE_SERVICE_ROLE_KEY to browser code.

All tenant-owned rows include school_id. Row-level security checks the signed-in
profile tenant on every protected table. Anonymous reviews intentionally require
a server endpoint so rate limits, duplicate detection, and table/menu validation
can be enforced before writing.

## Public table links

Each table has a globally unique lowercase tag code. For example, table 14 can
use tag14 and opens at:

    /site/rate/tag14

The server resolves the school, cafeteria, table, current date, current time,
school timezone, active meal window, and published menu before accepting a review.

## Vercel deployment

Import this repository into Vercel and add the three variables from
.env.example to the project environment settings. Use separate Supabase
projects for development, staging, and production.

## Product language

The initial interface and source content are English-only. User-facing copy is
kept centralized in components for now; translation keys can be introduced when
the first additional language is scheduled.
