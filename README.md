# Restore America's Paradise — rap-usvi.org

Public website for Restore America's Paradise, Inc. (RAP), a 501(c)(3) civic organization based
in St. Croix, U.S. Virgin Islands. Next.js (App Router) + TypeScript + Tailwind CSS, with a
Supabase-backed Stakeholder Inquiry form.

The visual design is ported from the Stitch-generated mockup in
`stitch_virgin_islands_heritage_portal/` (kept as a design reference, not shipped).

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in the values described below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.local.example` for the full list. Summary:

| Service | Purpose | Required for |
|---|---|---|
| Supabase | Stores Stakeholder Inquiry submissions and "Join the Movement" newsletter signups | Forms to work at all |
| Resend | Staff notification + submitter auto-reply email | Email notifications |
| Cloudflare Turnstile | Spam/bot protection on the forms | Production (falls back open in dev without a key) |
| PostHog | Site analytics | Optional |
| Sentry | Error monitoring | Optional |

The Supabase `SUPABASE_SERVICE_ROLE_KEY` is not retrievable via any automated tool — copy it from
the Supabase dashboard: Project Settings → API → `service_role` secret.

## Architecture notes

- All inquiry form submissions are validated server-side (zod) and written via the Supabase
  service-role key inside `src/app/api/inquiries/route.ts`. Row Level Security is enabled on
  `inquiries` with **no public policies** — the client never talks to Supabase directly.
- Donate and Inquire About Enrollment both scroll to the Stakeholder Inquiry form with the
  interest-area dropdown pre-selected (`src/lib/scrollToContact.ts`), rather than a dedicated
  payment flow — online giving is deferred to a future phase.
- Hero/portrait/event photography are placeholder gradient panels
  (`src/components/ui/PlaceholderImage.tsx`) pending real photography; swap in `next/image` calls
  against files in `public/images/` when available.

## Deployment

Deployed on Vercel via the GitHub integration (push to `main` to deploy). Custom domain:
**rap-usvi.org**, purchased on Namecheap — DNS must point at Vercel (see Vercel project → Settings
→ Domains for the exact records to add in Namecheap's Advanced DNS).
