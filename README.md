# MealUp

MealUp is a privacy-first school cafeteria feedback and food intelligence platform.
Students open a table-specific link from an NFC tag or QR code, see the active
meal, and share structured feedback. Cafeteria teams use the dashboard to turn
that feedback into better operational decisions.

## Current application

- Marketing page at /
- Kingsway Google student sign-in at /student/login
- Interactive mobile student flow at /site/rate/tag14
- Optional ratings for every individual menu item
- Responsive manager dashboard at /admin
- Trello-style weekly meal planner at /admin/schedule
- Table and public tag management at /admin/tables
- Supabase browser and server clients
- PostgreSQL schema with time-aware menus, multi-tenant RLS, and one verified vote per student per meal
- Vercel-ready Next.js configuration

The application fails visibly when its database configuration is unavailable;
production pages never substitute representative data. Menu persistence, table
tags, time-based menu resolution, and reviews use Supabase.

## Local development

Requirements:

- Node.js 22.13 or newer
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
4. Configure Google OAuth and the Before User Created hook as described below.
5. Do not add a Supabase service-role key to this application. All server requests
   use the signed-in user's session and row-level security.

All tenant-owned rows include school_id. Row-level security checks the signed-in
profile tenant on every protected table. Student reviews require a verified
Kingsway Google account. The server and database validate identity independently.
A pair of unique database indexes on `(menu_id, user_id)` and a private,
salted email digest prevents duplicate votes even during simultaneous requests
or account recreation. Historical anonymous reviews remain in analytics,
but migration 012 disables new anonymous submissions.

### Kingsway Google sign-in

1. In Google Cloud, create a Web application OAuth client owned by Kingsway
   College. Add `https://mealup-kingsway.vercel.app` as an authorized JavaScript
   origin and `https://mfrdmhpaabigxcghmubt.supabase.co/auth/v1/callback` as
   an authorized redirect URI. Add local origins if testing OAuth locally.
2. In Supabase Authentication → Sign In / Providers → Google, enable Google and
   enter the OAuth Client ID and Client Secret. Keep the secret in Supabase,
   never in the repository or Vercel environment variables.
3. In Supabase Authentication → URL Configuration, allow
   `https://mealup-kingsway.vercel.app/auth/callback` (and
   `http://localhost:3000/auth/callback` for local development).
4. In Supabase Authentication → Auth Hooks, enable the Before User Created hook
   using `public.kingsway_before_user_created` from migration 012. This blocks
   creation of new non-Google or non-`@kingsway.college` accounts; it does not
   revoke existing staff accounts.

The Google `hd` OAuth parameter is only an account-selection hint. Server-side
checks, the database function, and the signup hook enforce the domain policy.

## Public table links

Each table has a globally unique lowercase tag code. For example, table 14 can
use tag14 and opens at:

    /site/rate/tag14

The server resolves the school, cafeteria, table, current date, current time,
school timezone, active meal window, and published menu before accepting a review.

## Vercel deployment

Import this repository into Vercel and add the two variables from
.env.example to the project environment settings. Use separate Supabase
projects for development, staging, and production.

## Product language

The initial interface and source content are English-only. User-facing copy is
kept centralized in components for now; translation keys can be introduced when
the first additional language is scheduled.
